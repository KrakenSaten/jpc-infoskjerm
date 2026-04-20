# Team Workflow

Dette prosjektet er satt opp for raske, trygge endringer i en delt mappe.

## Start lokalt

- Kjoer `start-preview.bat` for infoskjermen.
- Kjoer `start-rotator-preview.bat` for rotatoren.
- Lokal preview bruker `http://localhost:8181` slik at `fetch()` av menyfiler fungerer riktig.

## Hvor du vanligvis endrer ting

- Oppdater ukens lunsj i `menu.csv`.
- Endre fallback-meny i `menu.json` eller `menu.js` bare hvis det trengs.
- Endre datakilder og oppdateringsintervaller i `config.js`.
- Endre innlasting og normalisering av meny i `menu-loader.js`.
- Endre visning og panelinnhold i `app.js`, `index.html` og `styles.css`.

## Enkle teamregler

- Hold raske innholdsoppdateringer i `menu.csv`.
- Unngaa aa endre flere ting samtidig hvis du bare skal oppdatere lunsj.
- Test helst via preview-scriptet, ikke ved aa dobbeltklikke HTML-filer.
- Behold filnavn og enkle relative stier med mindre vi avtaler en stoerre restrukturering.

## Tekniske noter

- Prosjektet har `.editorconfig` for felles tegnsett, innrykk og linjeslutter.
- `.gitattributes` er lagt inn for aa redusere stoy fra CRLF/LF i diff-er.
- Skjermen bruker `localStorage` som fallback hvis eksterne API-er ikke svarer.
