/* Dokumente – kleine Ablage für allgemeine Dokumente (ähnlich Paperless, bewusst minimal)
 * Speicher: App-Portal, Datenordner dieser App auf dem eigenen Server
 *   Dokumente: /api/kv/dokumente/docs/<id>      (Titel, Datum, contactId = Absender, tagIds = Tags, Notiz, Datei-Infos, Eingang)
 *   Tags:      /api/kv/dokumente/tags/<id>      (Name, Farbe) – vordefinierbar
 *   Kontakte:  /api/kv/dokumente/contacts/<id>  (Name, Ansprechpartner, Anschrift, Telefon, E-Mail, Notiz) – eigene Liste, getrennt vom ERP-System
 *   Dateien:   /api/blob/dokumente/<id>         (Original, höchstens 20 MB)
 * Die Dokument-ID ist die ID der Datei. Der Absender wird als Kontakt-ID gespeichert; frühere Freitext-Absender
 * (Feld „correspondent“) und Schlagwörter als Text (Feld „tags“) werden beim Laden einmalig in Kontakte bzw. Tags übernommen. */
(function () {
  const APP = 'dokumente';
  const MAX = 20 * 1048576;
  const st = { view: 'docs', docs: [], contacts: [], tags: [], q: '', tag: '', contact: '', year: '', inbox: false };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dateDE = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : '');
  const size = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const ext = (name) => ((name || '').match(/\.([a-z0-9]{1,5})$/i) || [, ''])[1].toLowerCase();
  const fileUrl = (id) => `/api/blob/${APP}/${encodeURIComponent(id)}`;
  const coll = (a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' });
  const newId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');

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
  const stripId = ({ id, ...rest }) => rest;
  const put = (coll_, o) => api(`/api/kv/${APP}/${coll_}/${encodeURIComponent(o.id)}`, { method: 'PUT', body: JSON.stringify(stripId(o)) });
  const del = (coll_, id) => api(`/api/kv/${APP}/${coll_}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const saveDoc = (d) => put('docs', d);
  const saveContact = (c) => put('contacts', c);

  /* ---------- Kontakte ---------- */
  const contactById = (id) => st.contacts.find((c) => c.id === id) || null;
  const contactName = (d) => (d.contactId && contactById(d.contactId) ? contactById(d.contactId).name : '');
  const findContact = (name) => { const k = norm(name).toLowerCase(); return k ? st.contacts.find((c) => norm(c.name).toLowerCase() === k) || null : null; };
  const docsOf = (cid) => st.docs.filter((d) => d.contactId === cid);
  async function ensureContact(name) {
    name = norm(name); if (!name) return null;
    const c = findContact(name); if (c) return c;
    const nc = { id: newId(), name, person: '', street: '', zip: '', city: '', phone: '', email: '', notes: '', created: new Date().toISOString() };
    await saveContact(nc); st.contacts.push(nc);
    return nc;
  }

  /* ---------- Tags (Name + Farbe) ---------- */
  const PALETTE = [['#1E3B33', 'Dunkelgrün'], ['#2F6B5B', 'Grün'], ['#7E9C62', 'Moos'], ['#B04A24', 'Kupfer'], ['#E07A52', 'Hellkupfer'], ['#C9A227', 'Gold'],
    ['#2F5D8A', 'Blau'], ['#5C9CBF', 'Hellblau'], ['#6B4C8A', 'Violett'], ['#C62F3B', 'Rot'], ['#8A8A80', 'Grau'], ['#3B3A36', 'Anthrazit']];
  const tagById = (id) => st.tags.find((t) => t.id === id) || null;
  const findTag = (name) => { const k = norm(name).toLowerCase(); return k ? st.tags.find((t) => norm(t.name).toLowerCase() === k) || null : null; };
  const docTags = (d) => (d.tagIds || []).map(tagById).filter(Boolean).sort((a, b) => coll(a.name, b.name));
  const sortedTags = () => [...st.tags].sort((a, b) => coll(a.name, b.name));
  const docsWithTag = (id) => st.docs.filter((d) => (d.tagIds || []).includes(id));
  /* Schriftfarbe passend zur Hintergrundfarbe (hell oder dunkel) */
  function onColor(hex) {
    const h = (hex || '#8A8A80').replace('#', ''); const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.35 ? '#1E2B27' : '#FFFFFF';
  }
  const tagStyle = (t) => `background:${esc(t.color)};border-color:${esc(t.color)};color:${onColor(t.color)}`;
  const tagChip = (t) => `<span class="tag" style="${tagStyle(t)}">${esc(t.name)}</span>`;
  async function ensureTag(name) {
    name = norm(name); if (!name) return null;
    const t = findTag(name); if (t) return t;
    const nt = { id: 't' + newId().slice(1), name, color: PALETTE[st.tags.length % PALETTE.length][0], created: new Date().toISOString() };
    await put('tags', nt); st.tags.push(nt);
    return nt;
  }

  /* ---------- Laden (inkl. einmaliger Übernahme alter Freitext-Absender und Schlagwörter) ---------- */
  async function load() {
    try {
      const [docs, contacts, tags] = await Promise.all([api(`/api/kv/${APP}/docs`), api(`/api/kv/${APP}/contacts`), api(`/api/kv/${APP}/tags`)]);
      st.docs = docs.map((r) => ({ id: r.id, ...r.data }));
      st.contacts = contacts.map((r) => ({ id: r.id, ...r.data }));
      st.tags = tags.map((r) => ({ id: r.id, ...r.data }));
    } catch (e) {
      $('#list').innerHTML = `<div class="card empty">Die Ablage ist nicht erreichbar: ${esc(e.message)}<br><span class="small">Die App muss über das App-Portal geöffnet werden.</span></div>`;
      return;
    }
    const legacy = st.docs.filter((d) => d.correspondent != null || Array.isArray(d.tags));
    if (legacy.length) {
      try {
        for (const d of legacy) {
          const c = norm(d.correspondent) ? await ensureContact(d.correspondent) : null;
          if (c && !d.contactId) d.contactId = c.id;
          delete d.correspondent;
          if (Array.isArray(d.tags)) {
            const ids = new Set(d.tagIds || []);
            for (const name of d.tags) { const t = await ensureTag(name); if (t) ids.add(t.id); }
            d.tagIds = [...ids]; delete d.tags;
          }
          await saveDoc(d);
        }
      } catch (e) { toast('Alte Absender/Schlagwörter konnten nicht übernommen werden: ' + e.message, 'err'); }
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
          contactId: null, tagIds: [], notes: '', inbox: true,
          file: { name: f.name, type: r.contentType || f.type, size: r.sizeBytes || f.size }, added: new Date().toISOString(),
        };
        await saveDoc(doc);
        st.docs.push(doc); ok++;
      } catch (e) { toast(`„${f.name}“: ${e.message}`, 'err'); }
    }
    if (ok) { toast(ok === 1 ? '1 Dokument im Eingang' : `${ok} Dokumente im Eingang`, 'ok'); Object.assign(st, { view: 'docs', inbox: true, tag: '', contact: '', year: '' }); }
    render();
  }

  /* ---------- Darstellung ---------- */
  function render() {
    $('#views').innerHTML = `<button class="view${st.view === 'docs' ? ' active' : ''}" data-view="docs">Dokumente <span class="n">${st.docs.length}</span></button>
      <button class="view${st.view === 'contacts' ? ' active' : ''}" data-view="contacts">Kontakte <span class="n">${st.contacts.length}</span></button>
      <button class="view${st.view === 'tags' ? ' active' : ''}" data-view="tags">Tags <span class="n">${st.tags.length}</span></button>`;
    document.querySelectorAll('#views [data-view]').forEach((b) => b.onclick = () => { st.view = b.dataset.view; render(); });
    $('#q').placeholder = { docs: 'Dokumente suchen … (Taste /)', contacts: 'Kontakte suchen … (Taste /)', tags: 'Tags suchen … (Taste /)' }[st.view];
    $('.upload').hidden = st.view !== 'docs';
    if (st.view === 'contacts') renderContacts(); else if (st.view === 'tags') renderTags(); else renderDocs();
  }

  function filteredDocs() {
    const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    return st.docs.filter((d) => {
      if (st.inbox && !d.inbox) return false;
      if (st.tag && !(d.tagIds || []).includes(st.tag)) return false;
      if (st.contact && d.contactId !== st.contact) return false;
      if (st.year && (d.date || '').slice(0, 4) !== st.year) return false;
      if (!words.length) return true;
      const hay = [d.title, contactName(d), docTags(d).map((t) => t.name).join(' '), d.notes, d.file && d.file.name, dateDE(d.date)].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.added || '').localeCompare(a.added || ''));
  }
  /* Tags mit Dokumenten (für die Filterleiste) */
  const usedTags = () => sortedTags().map((t) => [t, docsWithTag(t.id).length]).filter(([, n]) => n);
  function renderDocs() {
    const tags = usedTags();
    const used = st.contacts.filter((c) => docsOf(c.id).length).sort((a, b) => coll(a.name, b.name));
    const years = [...new Set(st.docs.map((d) => (d.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    const inboxN = st.docs.filter((d) => d.inbox).length;
    $('#filters').hidden = false;
    $('#filters').innerHTML = `
      <button class="chip${!st.inbox && !st.tag && !st.contact ? ' active' : ''}" data-all>Alle <span class="n">${st.docs.length}</span></button>
      <button class="chip${st.inbox ? ' active' : ''}" data-inbox>Eingang <span class="n">${inboxN}</span></button>
      ${tags.length ? '<span class="sep"></span>' : ''}
      ${tags.map(([t, n]) => `<button class="chip tag-chip${st.tag === t.id ? ' active' : ''}" data-tag="${esc(t.id)}" style="--tag:${esc(t.color)};--tag-text:${onColor(t.color)}"><i aria-hidden="true"></i>${esc(t.name)} <span class="n">${n}</span></button>`).join('')}
      ${used.length || years.length > 1 ? '<span class="sep"></span>' : ''}
      ${used.length ? `<select data-contact aria-label="Absender"><option value="">Alle Absender</option>${used.map((c) => `<option value="${esc(c.id)}"${st.contact === c.id ? ' selected' : ''}>${esc(c.name)} (${docsOf(c.id).length})</option>`).join('')}</select>` : ''}
      ${years.length > 1 ? `<select data-year aria-label="Jahr"><option value="">Alle Jahre</option>${years.map((y) => `<option${st.year === y ? ' selected' : ''}>${y}</option>`).join('')}</select>` : ''}`;
    const list = filteredDocs();
    $('#list').innerHTML = !st.docs.length
      ? '<div class="card empty"><strong>Noch keine Dokumente.</strong><br>Über „+ Hochladen“ oder einfach Dateien ins Fenster ziehen.</div>'
      : !list.length ? '<div class="card empty">Keine Dokumente gefunden.</div>'
      : `<div class="card"><table class="docs"><thead><tr><th>Datum</th><th>Titel</th><th class="col-corr">Absender</th><th class="col-tags">Tags</th><th class="r col-size">Größe</th></tr></thead><tbody>
        ${list.map((d) => `<tr data-id="${esc(d.id)}"><td class="nowrap">${dateDE(d.date)}</td>
          <td class="doc-title"><span class="ext">${esc(ext(d.file && d.file.name) || 'datei')}</span>${esc(d.title)}${d.inbox ? '<span class="badge-new">Eingang</span>' : ''}</td>
          <td class="col-corr">${esc(contactName(d))}</td><td class="col-tags">${docTags(d).map(tagChip).join('')}</td>
          <td class="r nowrap muted col-size">${d.file ? size(d.file.size) : ''}</td></tr>`).join('')}
        </tbody></table></div>`;
    $('#filters [data-all]').onclick = () => { Object.assign(st, { inbox: false, tag: '', contact: '', year: '' }); render(); };
    $('#filters [data-inbox]').onclick = () => { st.inbox = !st.inbox; render(); };
    document.querySelectorAll('#filters [data-tag]').forEach((b) => b.onclick = () => { st.tag = st.tag === b.dataset.tag ? '' : b.dataset.tag; render(); });
    const c = $('#filters [data-contact]'); if (c) c.onchange = () => { st.contact = c.value; render(); };
    const y = $('#filters [data-year]'); if (y) y.onchange = () => { st.year = y.value; render(); };
    document.querySelectorAll('#list tr[data-id]').forEach((tr) => tr.onclick = () => openDoc(tr.dataset.id));
  }

  function renderContacts() {
    const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = st.contacts.filter((c) => !words.length || words.every((w) => [c.name, c.person, c.street, c.zip, c.city, c.phone, c.email, c.notes].join(' ').toLowerCase().includes(w)))
      .sort((a, b) => coll(a.name, b.name));
    $('#filters').hidden = false;
    $('#filters').innerHTML = '<button class="btn btn-primary btn-sm" data-new-contact>+ Kontakt</button><span class="muted small">Absender für die Dokumente – unabhängig von den Kontakten des ERP-Systems.</span>';
    $('#list').innerHTML = !st.contacts.length
      ? '<div class="card empty"><strong>Noch keine Kontakte.</strong><br>Lege einen Kontakt an oder trage im Dokument einen Absender ein – er wird dann automatisch als Kontakt gespeichert.</div>'
      : !list.length ? '<div class="card empty">Keine Kontakte gefunden.</div>'
      : `<div class="card"><table class="docs"><thead><tr><th>Name</th><th class="col-corr">Ansprechpartner</th><th>Ort</th><th class="col-tags">Telefon / E-Mail</th><th class="r">Dokumente</th></tr></thead><tbody>
        ${list.map((c) => `<tr data-cid="${esc(c.id)}"><td class="doc-title">${esc(c.name)}</td><td class="col-corr">${esc(c.person || '')}</td>
          <td>${esc([c.zip, c.city].filter(Boolean).join(' '))}</td><td class="col-tags">${esc([c.phone, c.email].filter(Boolean).join(' · '))}</td>
          <td class="r">${docsOf(c.id).length || '<span class="muted">–</span>'}</td></tr>`).join('')}
        </tbody></table></div>`;
    $('#filters [data-new-contact]').onclick = () => openContact(null);
    document.querySelectorAll('#list tr[data-cid]').forEach((tr) => tr.onclick = () => openContact(tr.dataset.cid));
  }

  function renderTags() {
    const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = sortedTags().filter((t) => !words.length || words.every((w) => t.name.toLowerCase().includes(w)));
    $('#filters').hidden = false;
    $('#filters').innerHTML = '<button class="btn btn-primary btn-sm" data-new-tag>+ Tag</button><span class="muted small">Tags vordefinieren und farblich unterscheiden – im Dokument werden sie angetippt.</span>';
    $('#list').innerHTML = !st.tags.length
      ? '<div class="card empty"><strong>Noch keine Tags.</strong><br>Lege Tags hier vor oder direkt im Dokument an.</div>'
      : !list.length ? '<div class="card empty">Keine Tags gefunden.</div>'
      : `<div class="card"><table class="docs"><thead><tr><th>Tag</th><th>Farbe</th><th class="r">Dokumente</th></tr></thead><tbody>
        ${list.map((t) => `<tr data-tid="${esc(t.id)}"><td>${tagChip(t)}</td><td class="muted small">${esc((PALETTE.find(([c]) => c.toLowerCase() === String(t.color).toLowerCase()) || [, t.color])[1])}</td>
          <td class="r">${docsWithTag(t.id).length || '<span class="muted">–</span>'}</td></tr>`).join('')}
        </tbody></table></div>`;
    $('#filters [data-new-tag]').onclick = () => openTag(null);
    document.querySelectorAll('#list tr[data-tid]').forEach((tr) => tr.onclick = () => openTag(tr.dataset.tid));
  }

  /* gemeinsamer Rahmen für Ansichten und Dialoge */
  function overlay(html, cls) {
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = html;
    if (cls) bd.classList.add(cls);
    document.body.appendChild(bd);
    const close = () => { bd.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bd.addEventListener('mousedown', (e) => { if (e.target === bd) close(); });
    bd.querySelectorAll('[data-close]').forEach((b) => b.onclick = close);
    return { bd, close };
  }

  /* ---------- Dokument ansehen und bearbeiten ---------- */
  function openDoc(id) {
    const d = st.docs.find((x) => x.id === id); if (!d) return;
    const type = (d.file && d.file.type) || '';
    const url = fileUrl(d.id);
    const preview = type === 'application/pdf' || ext(d.file && d.file.name) === 'pdf' ? `<iframe src="${url}" title="Vorschau"></iframe>`
      : type.startsWith('image/') ? `<img src="${url}" alt="">`
      : type.startsWith('text/') ? `<iframe src="${url}" title="Vorschau"></iframe>`
      : `<div class="nopreview">Keine Vorschau für diesen Dateityp.<br><a class="btn" style="margin-top:12px" href="${url}" download="${esc(d.file ? d.file.name : '')}">Herunterladen</a></div>`;
    const sel = new Set((d.tagIds || []).filter(tagById));
    const names = [...st.contacts].sort((a, b) => coll(a.name, b.name));
    const { bd, close } = overlay(`<div class="viewer" role="dialog" aria-modal="true" aria-label="${esc(d.title)}">
      <div class="preview">${preview}</div>
      <form class="meta">
        <div class="meta-head"><h2>Dokument</h2><button type="button" class="icon-close" data-close aria-label="Schließen">×</button></div>
        <div class="meta-body">
          <div class="field"><label for="f-title">Titel</label><input id="f-title" name="title" value="${esc(d.title)}" required></div>
          <div class="field"><label for="f-date">Datum</label><input id="f-date" name="date" type="date" value="${esc(d.date || '')}"></div>
          <div class="field"><label for="f-contact">Absender</label>
            <div class="with-btn"><input id="f-contact" name="contact" value="${esc(contactName(d))}" list="contact-list" placeholder="Kontakt wählen oder neuen Namen eingeben" autocomplete="off">
              <button type="button" class="btn btn-sm" data-show-contact title="Kontakt öffnen"${d.contactId ? '' : ' hidden'}>Öffnen</button>
              <button type="button" class="btn btn-sm" data-new-contact-doc title="Neuen Kontakt anlegen">+ Kontakt</button></div>
            <datalist id="contact-list">${names.map((c) => `<option value="${esc(c.name)}">${esc([c.person, c.city].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>
            <div class="hint" data-contact-hint>${d.contactId ? '' : 'Ein neuer Name wird beim Speichern als Kontakt angelegt.'}</div></div>
          <div class="field"><label>Tags</label><div class="tag-pick" data-tag-pick></div>
            <div class="with-btn" style="margin-top:6px"><input name="newtag" placeholder="Neuer Tag …" aria-label="Neuer Tag" autocomplete="off"><button type="button" class="btn btn-sm" data-add-tag>+ Tag</button></div>
            <div class="hint">Antippen zum Zuordnen; vordefinieren und Farben ändern unter „Tags“</div></div>
          <div class="field"><label for="f-notes">Notiz</label><textarea id="f-notes" name="notes">${esc(d.notes || '')}</textarea></div>
          <div class="file-info">${esc(d.file ? d.file.name : '')}${d.file ? ' · ' + size(d.file.size) : ''}<br>hochgeladen ${d.added ? new Date(d.added).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
        </div>
        <div class="meta-foot">
          <button type="button" class="btn btn-danger btn-sm" data-delete>Löschen</button>
          <a class="btn btn-sm" href="${url}" download="${esc(d.file ? d.file.name : '')}">Herunterladen</a>
          <div class="right"><button type="submit" class="btn btn-primary">${d.inbox ? 'Speichern & aus Eingang' : 'Speichern'}</button></div>
        </div>
      </form></div>`);
    const inp = $('#f-contact', bd);
    const hint = $('[data-contact-hint]', bd);
    const showBtn = $('[data-show-contact]', bd);
    inp.addEventListener('input', () => {
      const c = findContact(inp.value);
      showBtn.hidden = !c;
      hint.textContent = !norm(inp.value) ? '' : c ? [c.person, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ') : `„${norm(inp.value)}“ wird beim Speichern als neuer Kontakt angelegt.`;
    });
    $('[data-new-contact-doc]', bd).onclick = () => {
      const typed = norm(inp.value);
      openContact(null, (nc) => { inp.value = nc.name; inp.dispatchEvent(new Event('input')); }, findContact(typed) ? '' : typed);
    };
    showBtn.onclick = () => { const c = findContact(inp.value); if (c) openContact(c.id, () => { const n = contactById(c.id); if (n) inp.value = n.name; inp.dispatchEvent(new Event('input')); }); };
    const pick = $('[data-tag-pick]', bd);
    const drawPick = () => {
      pick.innerHTML = sortedTags().map((t) => `<button type="button" class="tag tag-toggle${sel.has(t.id) ? ' on' : ''}" data-t="${esc(t.id)}" aria-pressed="${sel.has(t.id)}" style="${sel.has(t.id) ? tagStyle(t) : `--tag:${esc(t.color)}`}">${esc(t.name)}</button>`).join('')
        || '<span class="muted small">Noch keine Tags – unten einen anlegen.</span>';
      pick.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { const id = b.dataset.t; if (sel.has(id)) sel.delete(id); else sel.add(id); drawPick(); });
    };
    drawPick();
    const addTag = async () => {
      const inpT = $('[name=newtag]', bd); if (!norm(inpT.value)) return;
      try { const t = await ensureTag(inpT.value); sel.add(t.id); inpT.value = ''; drawPick(); } catch (err) { toast(err.message, 'err'); }
    };
    $('[data-add-tag]', bd).onclick = addTag;
    $('[name=newtag]', bd).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
    $('form', bd).onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const known = findContact(f.contact.value);
        const c = norm(f.contact.value) ? known || await ensureContact(f.contact.value) : null;
        const next = { ...d, title: norm(f.title.value) || d.title, date: f.date.value || '', contactId: c ? c.id : null,
          tagIds: [...sel].filter(tagById), notes: f.notes.value.trim(), inbox: false };
        await saveDoc(next); Object.assign(d, next);
        toast(c && !known ? `Gespeichert – Kontakt „${c.name}“ angelegt` : 'Gespeichert', 'ok'); close(); render();
      } catch (err) { toast(err.message, 'err'); }
    };
    $('[data-delete]', bd).onclick = async () => {
      if (!window.confirm(`„${d.title}“ endgültig löschen? Die Datei wird vom Server entfernt.`)) return;
      try {
        await del('docs', d.id);
        await api(fileUrl(d.id), { method: 'DELETE' }).catch(() => {});
        st.docs = st.docs.filter((x) => x.id !== d.id); toast('Gelöscht'); close(); render();
      } catch (err) { toast(err.message, 'err'); }
    };
    setTimeout(() => $('#f-title', bd).focus(), 50);
  }

  /* ---------- Tag anlegen und bearbeiten ---------- */
  function openTag(id) {
    const t = id ? tagById(id) : { name: '', color: PALETTE[st.tags.length % PALETTE.length][0] };
    if (!t) return;
    const n = id ? docsWithTag(id).length : 0;
    let color = t.color;
    const { bd, close } = overlay(`<form class="modal" role="dialog" aria-modal="true" aria-label="Tag">
      <div class="meta-head"><h2>${id ? 'Tag' : 'Neuer Tag'}</h2><button type="button" class="icon-close" data-close aria-label="Schließen">×</button></div>
      <div class="meta-body">
        <div class="field"><label for="t-name">Name *</label><input id="t-name" name="name" value="${esc(t.name)}" required placeholder="z. B. Versicherung, Garantie, Auto"></div>
        <div class="field"><label>Farbe</label><div class="swatches" role="radiogroup" aria-label="Farbe">${PALETTE.map(([c, l]) => `<button type="button" class="swatch" role="radio" data-c="${c}" title="${l}" aria-label="${l}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="field"><label>Vorschau</label><div data-preview></div></div>
        ${id ? `<div class="file-info">${n ? `${n} Dokument${n === 1 ? '' : 'e'} mit diesem Tag` : 'Noch keinem Dokument zugeordnet'}</div>` : ''}
      </div>
      <div class="meta-foot">
        ${id ? '<button type="button" class="btn btn-danger btn-sm" data-delete>Löschen</button>' : ''}
        ${n ? '<button type="button" class="btn btn-sm" data-docs>Dokumente anzeigen</button>' : ''}
        <div class="right"><button type="submit" class="btn btn-primary">Speichern</button></div>
      </div></form>`, 'center');
    const nameInp = $('#t-name', bd);
    const draw = () => {
      bd.querySelectorAll('.swatch').forEach((b) => { const on = b.dataset.c.toLowerCase() === String(color).toLowerCase(); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      $('[data-preview]', bd).innerHTML = tagChip({ name: norm(nameInp.value) || 'Tag', color });
    };
    bd.querySelectorAll('.swatch').forEach((b) => b.onclick = () => { color = b.dataset.c; draw(); });
    nameInp.addEventListener('input', draw);
    draw();
    $('form', bd).onsubmit = async (e) => {
      e.preventDefault();
      const name = norm(nameInp.value);
      if (!name) { toast('Bitte einen Namen angeben.', 'err'); return; }
      const dup = findTag(name);
      if (dup && dup.id !== id) { toast(`Es gibt bereits den Tag „${dup.name}“.`, 'err'); return; }
      const next = id ? { ...t, name, color, updated: new Date().toISOString() } : { id: 't' + newId().slice(1), name, color, created: new Date().toISOString() };
      try { await put('tags', next); if (id) Object.assign(t, next); else st.tags.push(next); toast('Tag gespeichert', 'ok'); close(); render(); }
      catch (err) { toast(err.message, 'err'); }
    };
    const delBtn = $('[data-delete]', bd);
    if (delBtn) delBtn.onclick = async () => {
      if (!window.confirm(n ? `Tag „${t.name}“ löschen? Er wird bei ${n} Dokument${n === 1 ? '' : 'en'} entfernt; die Dokumente bleiben erhalten.` : `Tag „${t.name}“ löschen?`)) return;
      try {
        for (const d of docsWithTag(id)) { d.tagIds = d.tagIds.filter((x) => x !== id); await saveDoc(d); }
        await del('tags', id);
        st.tags = st.tags.filter((x) => x.id !== id);
        if (st.tag === id) st.tag = '';
        toast('Tag gelöscht'); close(); render();
      } catch (err) { toast(err.message, 'err'); }
    };
    const docsBtn = $('[data-docs]', bd);
    if (docsBtn) docsBtn.onclick = () => { Object.assign(st, { view: 'docs', tag: id, contact: '', inbox: false, year: '', q: '' }); $('#q').value = ''; close(); render(); };
    setTimeout(() => nameInp.focus(), 50);
  }

  /* ---------- Kontakt anlegen und bearbeiten ---------- */
  function openContact(id, onSaved, prefill = '') {
    const c = id ? contactById(id) : { name: prefill, person: '', street: '', zip: '', city: '', phone: '', email: '', notes: '' };
    if (!c) return;
    const n = id ? docsOf(id).length : 0;
    const f = (name, label, attrs = '') => `<div class="field"><label for="c-${name}">${label}</label><input id="c-${name}" name="${name}" value="${esc(c[name] || '')}" ${attrs}></div>`;
    const { bd, close } = overlay(`<form class="modal" role="dialog" aria-modal="true" aria-label="Kontakt">
      <div class="meta-head"><h2>${id ? 'Kontakt' : 'Neuer Kontakt'}</h2><button type="button" class="icon-close" data-close aria-label="Schließen">×</button></div>
      <div class="meta-body">
        ${f('name', 'Name *', 'required placeholder="z. B. Krankenkasse, Vermieter, Stadtwerke"')}
        ${f('person', 'Ansprechpartner')}
        ${f('street', 'Straße und Hausnummer')}
        <div class="grid-2">${f('zip', 'PLZ', 'inputmode="numeric"')}${f('city', 'Ort')}</div>
        <div class="grid-2">${f('phone', 'Telefon', 'type="tel"')}${f('email', 'E-Mail', 'type="email"')}</div>
        <div class="field"><label for="c-notes">Notiz</label><textarea id="c-notes" name="notes">${esc(c.notes || '')}</textarea></div>
        ${id ? `<div class="file-info">${n ? `${n} Dokument${n === 1 ? '' : 'e'} mit diesem Absender` : 'Noch keine Dokumente mit diesem Absender'}</div>` : ''}
      </div>
      <div class="meta-foot">
        ${id ? '<button type="button" class="btn btn-danger btn-sm" data-delete>Löschen</button>' : ''}
        ${n ? '<button type="button" class="btn btn-sm" data-docs>Dokumente anzeigen</button>' : ''}
        <div class="right"><button type="submit" class="btn btn-primary">Speichern</button></div>
      </div></form>`, 'center');
    $('form', bd).onsubmit = async (e) => {
      e.preventDefault();
      const fm = e.target;
      const vals = Object.fromEntries(['name', 'person', 'street', 'zip', 'city', 'phone', 'email', 'notes'].map((k) => [k, k === 'notes' ? fm[k].value.trim() : norm(fm[k].value)]));
      if (!vals.name) { toast('Bitte einen Namen angeben.', 'err'); return; }
      const dup = findContact(vals.name);
      if (dup && dup.id !== id) { toast(`Es gibt bereits einen Kontakt „${dup.name}“.`, 'err'); return; }
      const next = id ? { ...c, ...vals, updated: new Date().toISOString() } : { id: newId(), ...vals, created: new Date().toISOString() };
      try {
        await saveContact(next);
        if (id) Object.assign(c, next); else st.contacts.push(next);
        toast('Kontakt gespeichert', 'ok'); close(); render(); if (onSaved) onSaved(next);
      } catch (err) { toast(err.message, 'err'); }
    };
    const delBtn = $('[data-delete]', bd);
    if (delBtn) delBtn.onclick = async () => {
      if (!window.confirm(n ? `Kontakt „${c.name}“ löschen? Bei ${n} Dokument${n === 1 ? '' : 'en'} wird der Absender entfernt; die Dokumente bleiben erhalten.` : `Kontakt „${c.name}“ löschen?`)) return;
      try {
        for (const d of docsOf(id)) { d.contactId = null; await saveDoc(d); }
        await del('contacts', id);
        st.contacts = st.contacts.filter((x) => x.id !== id);
        if (st.contact === id) st.contact = '';
        toast('Kontakt gelöscht'); close(); render();
      } catch (err) { toast(err.message, 'err'); }
    };
    const docsBtn = $('[data-docs]', bd);
    if (docsBtn) docsBtn.onclick = () => { Object.assign(st, { view: 'docs', contact: id, inbox: false, tag: '', year: '', q: '' }); $('#q').value = ''; close(); document.querySelectorAll('.backdrop').forEach((x) => x.remove()); render(); };
    setTimeout(() => $('#c-name', bd).focus(), 50);
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
