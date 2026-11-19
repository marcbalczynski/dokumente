/* Dokumente – kleine Dokumentenablage (ähnlich Paperless, bewusst minimal)
 * Speicher: App-Portal, Datenordner dieser App auf dem eigenen Server
 *   Angaben:  /api/kv/dokumente/docs/<id>   (Titel, Datum, Absender, Schlagwörter, Notiz, Datei-Infos, Eingang)
 *   Dateien:  /api/blob/dokumente/<id>      (Original, höchstens 20 MB)
 * Die Dokument-ID ist die ID der Datei. */
(function () {
  const APP = 'dokumente';
  const MAX = 20 * 1048576;
  const st = { docs: [], q: '', tag: '', corr: '', year: '', inbox: false };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dateDE = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : '');
  const size = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const ext = (name) => ((name || '').match(/\.([a-z0-9]{1,5})$/i) || [, ''])[1].toLowerCase();
  const fileUrl = (id) => `/api/blob/${APP}/${encodeURIComponent(id)}`;
  const coll = (a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' });

  function toast(msg, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), kind === 'err' ? 6000 : 2800);
  }
  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { 'X-Portal': '1', ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
    return data;
  }
  const saveDoc = (d) => api(`/api/kv/${APP}/docs/${encodeURIComponent(d.id)}`, { method: 'PUT', body: JSON.stringify(stripId(d)) });
  function stripId(d) { const { id, ...rest } = d; return rest; }

  /* ---------- Laden ---------- */
  async function load() {
    try {
      const rows = await api(`/api/kv/${APP}/docs`);
      st.docs = rows.map((r) => ({ id: r.id, ...r.data }));
    } catch (e) {
      $('#list').innerHTML = `<div class="card empty">Die Ablage ist nicht erreichbar: ${esc(e.message)}<br><span class="small">Die App muss über das App-Portal geöffnet werden.</span></div>`;
      return;
    }
    render();
  }

  /* ---------- Hochladen ---------- */
  async function upload(files) {
    files = [...files];
    if (!files.length) return;
    let ok = 0;
    for (const f of files) {
      if (f.size > MAX) { toast(`„${f.name}“ ist größer als 20 MB.`, 'err'); continue; }
      try {
        const r = await api(`/api/blob/${APP}`, { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(f.name) }, body: f });
        const lm = f.lastModified ? new Date(f.lastModified) : null;
        const doc = {
          id: r.id, title: f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || f.name,
          date: lm ? `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-${String(lm.getDate()).padStart(2, '0')}` : today(),
          correspondent: '', tags: [], notes: '', inbox: true,
          file: { name: f.name, type: r.contentType || f.type, size: r.sizeBytes || f.size }, added: new Date().toISOString(),
        };
        await saveDoc(doc);
        st.docs.push(doc); ok++;
      } catch (e) { toast(`„${f.name}“: ${e.message}`, 'err'); }
    }
    if (ok) { toast(ok === 1 ? '1 Dokument im Eingang' : `${ok} Dokumente im Eingang`, 'ok'); st.inbox = true; st.tag = st.corr = st.year = ''; }
    render();
  }

  /* ---------- Liste ---------- */
  function filtered() {
    const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    return st.docs.filter((d) => {
      if (st.inbox && !d.inbox) return false;
      if (st.tag && !(d.tags || []).includes(st.tag)) return false;
      if (st.corr && (d.correspondent || '') !== st.corr) return false;
      if (st.year && (d.date || '').slice(0, 4) !== st.year) return false;
      if (!words.length) return true;
      const hay = [d.title, d.correspondent, (d.tags || []).join(' '), d.notes, d.file && d.file.name, dateDE(d.date)].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.added || '').localeCompare(a.added || ''));
  }
  function counts(key) {
    const m = new Map();
    st.docs.forEach((d) => (key === 'tags' ? d.tags || [] : [d[key]]).filter(Boolean).forEach((v) => m.set(v, (m.get(v) || 0) + 1)));
    return [...m.entries()].sort((a, b) => coll(a[0], b[0]));
  }
  function render() {
    const tags = counts('tags'), corrs = counts('correspondent');
    const years = [...new Set(st.docs.map((d) => (d.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    const inboxN = st.docs.filter((d) => d.inbox).length;
    $('#filters').innerHTML = `
      <button class="chip${!st.inbox && !st.tag ? ' active' : ''}" data-all>Alle <span class="n">${st.docs.length}</span></button>
      <button class="chip${st.inbox ? ' active' : ''}" data-inbox>Eingang <span class="n">${inboxN}</span></button>
      ${tags.length ? '<span class="sep"></span>' : ''}
      ${tags.map(([t, n]) => `<button class="chip${st.tag === t ? ' active' : ''}" data-tag="${esc(t)}">${esc(t)} <span class="n">${n}</span></button>`).join('')}
      ${corrs.length || years.length ? '<span class="sep"></span>' : ''}
      ${corrs.length ? `<select data-corr aria-label="Absender"><option value="">Alle Absender</option>${corrs.map(([c, n]) => `<option value="${esc(c)}"${st.corr === c ? ' selected' : ''}>${esc(c)} (${n})</option>`).join('')}</select>` : ''}
      ${years.length > 1 ? `<select data-year aria-label="Jahr"><option value="">Alle Jahre</option>${years.map((y) => `<option${st.year === y ? ' selected' : ''}>${y}</option>`).join('')}</select>` : ''}`;
    const list = filtered();
    $('#list').innerHTML = !st.docs.length
      ? '<div class="card empty"><strong>Noch keine Dokumente.</strong><br>Über „+ Hochladen“ oder einfach Dateien ins Fenster ziehen.</div>'
      : !list.length ? '<div class="card empty">Keine Dokumente gefunden.</div>'
      : `<div class="card"><table class="docs"><thead><tr><th>Datum</th><th>Titel</th><th class="col-corr">Absender</th><th class="col-tags">Schlagwörter</th><th class="r col-size">Größe</th></tr></thead><tbody>
        ${list.map((d) => `<tr data-id="${esc(d.id)}"><td class="nowrap">${dateDE(d.date)}</td>
          <td class="doc-title"><span class="ext">${esc(ext(d.file && d.file.name) || 'datei')}</span>${esc(d.title)}${d.inbox ? '<span class="badge-new">Eingang</span>' : ''}</td>
          <td class="col-corr">${esc(d.correspondent || '')}</td><td class="col-tags">${(d.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</td>
          <td class="r nowrap muted col-size">${d.file ? size(d.file.size) : ''}</td></tr>`).join('')}
        </tbody></table></div>`;
    $('#filters [data-all]').onclick = () => { st.inbox = false; st.tag = ''; st.corr = ''; st.year = ''; render(); };
    $('#filters [data-inbox]').onclick = () => { st.inbox = !st.inbox; render(); };
    document.querySelectorAll('#filters [data-tag]').forEach((b) => b.onclick = () => { st.tag = st.tag === b.dataset.tag ? '' : b.dataset.tag; render(); });
    const c = $('#filters [data-corr]'); if (c) c.onchange = () => { st.corr = c.value; render(); };
    const y = $('#filters [data-year]'); if (y) y.onchange = () => { st.year = y.value; render(); };
    document.querySelectorAll('#list tr[data-id]').forEach((tr) => tr.onclick = () => open(tr.dataset.id));
  }

  /* Schlagwörter: Komma-getrennt, ohne Doppelte (Groß/klein egal); vorhandene Schreibweise wird übernommen */
  function normTags(text, known) {
    const out = [];
    text.split(',').map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean).forEach((t) => {
      const k = t.toLowerCase();
      if (out.some((x) => x.toLowerCase() === k)) return;
      out.push(known.find((x) => x.toLowerCase() === k) || t);
    });
    return out;
  }

  /* ---------- Ansehen und bearbeiten ---------- */
  function open(id) {
    const d = st.docs.find((x) => x.id === id); if (!d) return;
    const type = (d.file && d.file.type) || '';
    const url = fileUrl(d.id);
    const preview = type === 'application/pdf' || ext(d.file && d.file.name) === 'pdf' ? `<iframe src="${url}" title="Vorschau"></iframe>`
      : type.startsWith('image/') ? `<img src="${url}" alt="">`
      : type.startsWith('text/') ? `<iframe src="${url}" title="Vorschau"></iframe>`
      : `<div class="nopreview">Keine Vorschau für diesen Dateityp.<br><a class="btn" style="margin-top:12px" href="${url}" download="${esc(d.file ? d.file.name : '')}">Herunterladen</a></div>`;
    const tagList = counts('tags').map(([t]) => t), corrList = counts('correspondent').map(([c]) => c);
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = `<div class="viewer" role="dialog" aria-modal="true" aria-label="${esc(d.title)}">
      <div class="preview">${preview}</div>
      <form class="meta">
        <div class="meta-head"><h2>Dokument</h2><button type="button" class="icon-close" data-close aria-label="Schließen">×</button></div>
        <div class="meta-body">
          <div class="field"><label for="f-title">Titel</label><input id="f-title" name="title" value="${esc(d.title)}" required></div>
          <div class="field"><label for="f-date">Datum</label><input id="f-date" name="date" type="date" value="${esc(d.date || '')}"></div>
          <div class="field"><label for="f-corr">Absender</label><input id="f-corr" name="correspondent" value="${esc(d.correspondent || '')}" list="corr-list" placeholder="z. B. Krankenkasse, Vermieter, Finanzamt"><datalist id="corr-list">${corrList.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
          <div class="field"><label for="f-tags">Schlagwörter</label><input id="f-tags" name="tags" value="${esc((d.tags || []).join(', '))}" list="tag-list" placeholder="z. B. Versicherung, Auto, Garantie"><datalist id="tag-list">${tagList.map((t) => `<option value="${esc(t)}">`).join('')}</datalist><div class="hint">mehrere mit Komma trennen</div></div>
          <div class="field"><label for="f-notes">Notiz</label><textarea id="f-notes" name="notes">${esc(d.notes || '')}</textarea></div>
          <div class="file-info">${esc(d.file ? d.file.name : '')}${d.file ? ' · ' + size(d.file.size) : ''}<br>hochgeladen ${d.added ? new Date(d.added).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
        </div>
        <div class="meta-foot">
          <button type="button" class="btn btn-danger btn-sm" data-delete>Löschen</button>
          <a class="btn btn-sm" href="${url}" download="${esc(d.file ? d.file.name : '')}">Herunterladen</a>
          <div class="right"><button type="submit" class="btn btn-primary">${d.inbox ? 'Speichern & aus Eingang' : 'Speichern'}</button></div>
        </div>
      </form></div>`;
    document.body.appendChild(bd);
    const close = () => { bd.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bd.addEventListener('mousedown', (e) => { if (e.target === bd) close(); });
    $('[data-close]', bd).onclick = close;
    $('form', bd).onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const next = { ...d, title: f.title.value.trim() || d.title, date: f.date.value || '', correspondent: f.correspondent.value.trim(),
        tags: normTags(f.tags.value, tagList), notes: f.notes.value.trim(), inbox: false };
      try { await saveDoc(next); Object.assign(d, next); toast('Gespeichert', 'ok'); close(); render(); }
      catch (err) { toast(err.message, 'err'); }
    };
    $('[data-delete]', bd).onclick = async () => {
      if (!window.confirm(`„${d.title}“ endgültig löschen? Die Datei wird vom Server entfernt.`)) return;
      try {
        await api(`/api/kv/${APP}/docs/${encodeURIComponent(d.id)}`, { method: 'DELETE' });
        await api(fileUrl(d.id), { method: 'DELETE' }).catch(() => {});
        st.docs = st.docs.filter((x) => x.id !== d.id); toast('Gelöscht'); close(); render();
      } catch (err) { toast(err.message, 'err'); }
    };
    setTimeout(() => $('#f-title', bd).focus(), 50);
  }

  /* ---------- Bedienung ---------- */
  $('#q').addEventListener('input', (e) => { st.q = e.target.value; render(); });
  $('#file').addEventListener('change', (e) => { upload(e.target.files); e.target.value = ''; });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !$('.backdrop')) { e.preventDefault(); $('#q').focus(); }
  });
  let dragDepth = 0;
  const hasFiles = (e) => [...(e.dataTransfer && e.dataTransfer.types || [])].includes('Files');
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; dragDepth++; $('#drop').hidden = false; });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#drop').hidden = true; });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; $('#drop').hidden = true; upload(e.dataTransfer.files); });

  load();
})();
