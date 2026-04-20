# Infoskjerm

En enkel infoskjerm for kontoret med disse panelene:

- sanntidsavganger fra Skullerud T-bane via Entur
- vaerprognose via Open-Meteo
- siste nyheter fra NRK RSS
- lokal lunsjmeny fra `menu.csv` eller `menu.json`
- skjermrotator i `rotator.html`

## Filer

- `index.html`: hovedsiden for infoskjermen
- `config.js`: felles konfigurasjon og standardverdier
- `app.js`: oppstart, state og orkestrering
- `menu-loader.js`: laster og normaliserer lunsj fra CSV eller JSON
- `renderers.js`: visningslogikk for klokke, lunsj, vaer og nyheter
- `services.js`: henting og normalisering av eksterne data
- `styles.css`: visuell utforming
- `menu.csv`: enkleste fil aa oppdatere for ukens lunsj
- `menu.json`: ukens lunsjmeny som er lettest aa oppdatere
- `menu.js`: lokal fallback hvis `menu.json` ikke kan lastes
- `rotator.html`: roterer mellom infoskjermen og NOC-visning
- `start-rotator.bat`: aapner rotatoren i nettleser
- `start-preview.bat`: starter lokal preview paa `http://localhost:8181/index.html`
- `start-rotator-preview.bat`: starter lokal preview av rotatoren
- `preview-server.ps1`: enkel lokal filserver for prosjektet
- `TEAM-WORKFLOW.md`: kort guide for hvordan teamet jobber trygt i denne mappa
- `QA-CHECKLIST.md`: manuell testliste som kan kjoeres etter endringer

## Vanlige endringer

- Oppdater lunsj ved aa redigere `menu.csv`. Det er na den foretrukne fila for raske endringer.
- `menu.json` fungerer fortsatt som fallback hvis `menu.csv` ikke finnes eller er ugyldig.
- Hvis baade `menu.csv` og `menu.json` feiler ved lasting, brukes fallback-dataene i `menu.js`.
- Endringer i API-visningene styres hovedsakelig fra `app.js`.

## Drift

- Siden lagrer sist vellykkede data i `localStorage` som fallback ved nettverksfeil.
- Rotatoren viser `http://inm.jpc.no:8080/noc.view.xsi?index=2` og lokal infoskjerm annenhver gang.
- For lokal testing kan teamet bruke `start-preview.bat` eller `start-rotator-preview.bat` i stedet for aa aapne HTML-filene direkte.
- Se `TEAM-WORKFLOW.md` for anbefalt arbeidsflyt i delt mappe.
- Bruk `QA-CHECKLIST.md` etter endringer foer skjermen tas i bruk.
