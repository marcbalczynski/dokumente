# CLAUDE.md – Dokumente

Hinweise für Claude Code. Diese Datei liegt im Repo, damit sie auf jedem Mac gilt.

## Dokumente

- **Zweck:** kleine Ablage für **allgemeine** Dokumente (keine privaten), die **nicht** zum Geschäft, zu den Geschäftszweigen oder zu den Finanzen gehören (die liegen im ERP-System). Bewusst minimal wie eine „Paperless lite“ – keine Texterkennung, keine Ordnerstruktur, keine Benutzerverwaltung.
- **Aufbau:** reines HTML/CSS/JS ohne Build – `index.html`, `app.css`, `app.js`, `icon.svg`, Schriften lokal in `fonts/`. Läuft nur über das App-Portal (Kachel „Dokumente“, Ordner `dokumente`).
- **Speicher (Portal):** Angaben in `/api/kv/dokumente/docs/<id>` (Titel, Datum, `contactId` = Absender, `tagIds` = Tags, Notiz, Datei-Infos, `inbox`), Tags in `/api/kv/dokumente/tags/<id>` (Name, Farbe), Kontakte in `/api/kv/dokumente/contacts/<id>` (Name, Ansprechpartner, Anschrift, Telefon, E-Mail, Notiz – eigene Liste, getrennt vom ERP-System), Dateien in `/api/blob/dokumente/<id>` (höchstens 20 MB, Original unverändert). Die Dokument-ID ist die Datei-ID. Auf dem Server: `dokumente/data/db/docs.json` und `dokumente/data/blobs/`; im Container `/data/dokumente` (Datenordner auf dem NAS, mit Hyper Backup sichern). `data/` ist nicht im Git.
- **Kontakte:** Reiter „Kontakte“ (Suche, anlegen, bearbeiten, löschen – Dokumente behalten, Absender wird entfernt). Im Dokument wird der Absender aus den Kontakten gewählt; ein neuer Name legt beim Speichern automatisch einen Kontakt an (Vergleich ohne Groß/klein und doppelte Leerzeichen). Frühere Freitext-Absender (`correspondent`) werden beim Laden einmalig übernommen.
- **Tags** (bis 19.11.2026 „Schlagwörter“): Reiter „Tags“ zum Vordefinieren mit Farbe (Palette `PALETTE` in `app.js`, Schriftfarbe automatisch hell/dunkel nach Kontrast); im Dokument antippen oder neu anlegen; Umbenennen wirkt überall, Löschen entfernt den Tag aus den Dokumenten. Alte Schlagwörter als Text (`tags`) werden beim Laden einmalig in Tags übernommen.
- **Bedienung:** Hochladen per Knopf oder Ziehen ins Fenster → landet im **Eingang**; „Speichern & aus Eingang“ ordnet es ein. Suche über alle Angaben und den Dateinamen (Taste `/`), Filter nach Tag, Absender, Jahr; Vorschau für PDF, Bilder, Text.
- **Gestaltung:** wie das ERP-System (Dunkelgrün, Creme, Kupfer, Archivo/Inter).
- **Testen:** über das lokale Portal (`http://localhost:8080/dokumente/`); Testdokumente danach in der App löschen.

## Gemeinsame Regeln (gelten für alle fünf Repos)

**Projekt:** BALANDURB – seit 23.11.2026 als **GbR** geplant (Marc Balczynski und Bianca Urban GbR, zwei Gesellschafter, Sitz Herne, ohne Eintragung ins Handels- oder Gesellschaftsregister; bis 22.11.2026 Einzelunternehmen), Kleinunternehmer (§ 19 UStG), Gewerbebeginn 01.01.2027, für beide Gesellschafter nebenberuflich, keine GmbH (daher EÜR der GbR mit Gewinnverteilung, keine Bilanz). Geschäftszweige = Business Units (seit 23.11.2026): **BU 1** Balandurb – Art, Design and Model Making (balandurb.de), **BU 2** Modellbau-Balandurb – Modellbau und Modelleisenbahn (modellbau-balandurb.de), **BU 3** Watchdog-IT – IT-Consulting (watchdog-it.de); Inhaberin jeweils die GbR. Bis 17.11.2026 hieß das Unternehmen BiaMar.

Die fünf privaten Repos liegen nebeneinander in `~/repository` (auf jedem Mac derselbe Pfad):
- `erp-system` – **ERP-System** (bis 19.11.2026 „Management-App“, Ordner/Repo `management-app`): Verkauf, Einkauf, Finanzen, EÜR, DATEV …, Browser-App mit SQLite (sql.js); Adresse im Portal `/erp-system/`
- `portal` – App-Portal und Perl-Server, liefert ERP-System, Gründungskonzept und Dokumente aus (die Website ist dort nur ein Weblink); Docker-Image für das NAS
- `gruendung` – Gründungskonzept (eine HTML-Seite)
- `website` – Landingpage www.balandurb.de (HTML/CSS, Hosting bei Strato, Vorschau `python3 -m http.server 8091 --bind 127.0.0.1` im Ordner)
- `dokumente` – kleine Dokumentenablage für allgemeine Dokumente (ähnlich Paperless, minimal); Dateien und Angaben im Portal-Speicher (`/api/blob`, `/api/kv`)

**Offene Erinnerungen** (beim Start einer Sitzung ansprechen, bis erledigt – dann hier löschen)
- **Anderer Mac auf Token umstellen** (eingetragen 19.11.2026): Der zweite Mac meldet sich bei GitHub bisher über die Browser-Anmeldung von `gh` an. Er soll – wie dieser Mac – ein **Fine-grained Personal Access Token** nutzen: nur die fünf Repos (`erp-system`, `portal`, `gruendung`, `website`, `dokumente`), Rechte „Contents: Read and write“, im macOS-Schlüsselbund gespeichert. Den Token erstellt und gibt der Nutzer selbst ein. Danach `gh auth logout` bzw. die alte Anmeldung entfernen und mit `git pull`/`git push` in allen fünf Repos prüfen.

- **Umbenennung ERP-System auf dem anderen Mac** (eingetragen 19.11.2026): Ordner `~/repository/management-app` in `~/repository/erp-system` umbenennen und dort `git remote set-url origin https://github.com/marcbalczynski/erp-system.git` ausführen; danach `git pull`. Den Fine-grained Token prüfen (Repo heißt jetzt `erp-system`).

**Arbeitsweise**
- Immer auf **Deutsch** antworten – auch Rückfragen, Zusammenfassungen und Statusmeldungen. Code-Kommentare und Commit-Nachrichten sind deutsch.
- **Firmendaten nicht in App oder Code** (Name, Anschrift, Steuernummer, Bank …): Noch ist nichts endgültig. In Konzepttexten Platzhalter wie `[Vorname Nachname]` verwenden. Ausnahmen auf Wunsch des Nutzers: Impressum/Datenschutz der Website und der Name der GbR in den Kopfzeilen von ERP-System (Vorgabe, wenn kein Firmenname eingetragen ist) und Portal (Unterbezeichnung, im Portal änderbar) – seit 23.11.2026.
- **Git-Identität:** immer `marcbalczynski <189748251+marcbalczynski@users.noreply.github.com>` – nie eine private E-Mail-Adresse in Commits. In zsh die `-c user.name=… -c user.email=…`-Angaben direkt an jeden git-Aufruf schreiben, nicht über eine Variable.
- **Zwei Macs:** vor der Arbeit `git pull` in allen fünf Repos, danach committen und pushen. Commit und Push nur, wenn der Nutzer darum bittet oder es zum vereinbarten Ablauf gehört.
- **Passwörter und Tokens** gibt der Nutzer selbst ein – nie selbst eintippen oder in Dateien schreiben.
- **Sicherheit:** Das Portal läuft nur im eigenen Netz. Starke Passwörter, weitere Zugangshärtung und verschlüsselte Sicherungen haben deshalb geringe Priorität (Roadmap Phase C) – nicht als dringend darstellen. HTTPS ist seit 24.11.2026 im Portal eingebaut und per `PORTAL_TLS=1` einschaltbar (`portal/docker/README.md` › HTTPS).
- Auf dem NAS keine Konfigurationen anderer Stacks/Container lesen.
- **Keine Geschäftsdaten an Anthropic** (Entscheidung 23.11.2026): Daten aus ERP-System und Portal nicht an Claude/Anthropic übertragen – die MCP-Schnittstelle (`portal/Mcp.pm`) bleibt abgeschaltet, KI-Funktionen nur lokal. Beim Entwickeln und Testen nur Testdaten verwenden.

**Lokal starten:** `cd ~/repository/portal && perl server.pl 8080` → http://localhost:8080 (macOS-Perl reicht, keine Zusatzmodule nötig). Lokal nur mit Testdaten arbeiten; die echten Daten liegen in der MariaDB auf dem NAS.

**NAS (Synology, Portainer):** Portal unter `http://10.10.20.229:8080` (macvlan-Netz `mvl`). Image/Container/Stack `balandurb-portal`, Datenordner `/volume1/docker/balandurb-portal`, MariaDB-Datenbank `balandurb`, Benutzer `balandurb_app@localhost` über den Socket `/run/mysqld/mysqld10.sock`. Die MariaDB ist für das ERP-System führend.
- Update: `~/repository/portal/docker/build-context.sh` → `~/repository/docker-build/balandurb-portal-build.tar`; der Nutzer baut in Portainer das Image `balandurb-portal:latest` neu und erstellt den Container neu („Re-pull image“ aus).
- Prüfen (das Portal hat keine Anmeldung): `curl -H "X-Portal: 1" http://10.10.20.229:8080/api/db/erp-system/status` – ohne den Header `X-Portal: 1` lehnt das Portal API-Aufrufe ab.
