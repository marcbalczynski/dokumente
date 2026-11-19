# Dokumente

Kleine Dokumentenablage für allgemeine Dokumente – getrennt vom ERP-System (Geschäft und Finanzen). Bewusst minimal, ähnlich einer „Paperless lite“.

- Hochladen per Knopf oder Dateien ins Fenster ziehen (PDF, Bilder, sonstige Dateien bis 20 MB); neue Dokumente landen im **Eingang**
- Angaben: Titel, Datum, Absender, Tags, Notiz
- Absender kommen aus der eigenen Kontaktliste (Reiter **Kontakte**); ein neuer Name im Dokument wird beim Speichern als Kontakt angelegt
- **Tags** mit Farbe: unter **Tags** vordefinieren (Name, Farbe aus 12 Markenfarben), im Dokument antippen oder direkt neu anlegen
- Suche über alle Angaben und den Dateinamen (Taste `/`), Filter nach Tag, Absender und Jahr
- Vorschau für PDF und Bilder, Herunterladen, Löschen

## Starten
Über das App-Portal (`~/repository/portal`, `perl server.pl 8080`) und die Kachel **Dokumente** – direkt: http://localhost:8080/dokumente/

## Daten
Liegen im Datenordner dieser App beim Portal-Server: `data/db/docs.json` (Angaben), `data/db/contacts.json` (Kontakte), `data/db/tags.json` (Tags) und `data/blobs/` (Dateien). Im Docker-Container auf dem NAS unter `/data/dokumente` – den Datenordner des Containers mit Hyper Backup sichern. `data/` ist nicht im Git.
