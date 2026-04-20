# JPC Infoskjerm

En enkel infoskjerm for JPC-kontoret på Skullerud. Hostes via GitHub Pages og vises på kontorskjerm.

**Live URL:** https://krakensaten.github.io/jpc-infoskjerm/

## Paneler

- Sanntidsavganger fra Skullerud T-bane (Entur API)
- Værprognose for Skullerud (Open-Meteo, time-for-time-graf starter fra nå)
- Siste nyheter fra NRK RSS
- Ukens lunsjmeny fra `menu.csv` (hentes automatisk fra GitHub)
- Nedtelling til jubileumstur til Brussel
- Anledning-banner (kakefredag, merkedager)
- Fullskjerm-knapp og hurtigtaster

## Filer

### Kjørende kode
- `index.html` – hovedsiden
- `config.js` – konfigurasjon og endepunkter
- `app.js` – oppstart, tilstand og orkestrering
- `menu-loader.js` – henter meny fra GitHub / lokal CSV / JSON
- `renderers.js` – visningslogikk for paneler, anledninger og tema
- `services.js` – henter data fra eksterne API-er med retry
- `styles.css` – visuell utforming

### Data
- `menu.csv` – ukens lunsjmeny (primærkilde, hentes fra GitHub)
- `menu.json` – siste reserveløsning hvis CSV ikke kan leses

### Rotator og lokal testing
- `rotator.html` – bytter mellom infoskjerm og NOC-visning (iframe-basert, bruk lokalt)
- `start-preview.bat` – lokal preview av infoskjermen
- `start-rotator-preview.bat` – lokal preview av rotatoren
- `start-rotator.bat` – åpner rotatoren i nettleser
- `preview-server.ps1` – enkel lokal filserver

### Dokumentasjon
- `TEAM-WORKFLOW.md` – hvordan teamet jobber med prosjektet
- `QA-CHECKLIST.md` – manuell testliste etter endringer

## Oppdater lunsjmenyen

Endre `menu.csv` direkte på GitHub. Infoskjermen henter ny meny innen en time (eller med en gang hvis du trykker `R`).

Hvis menyen ikke har data for gjeldende ISO-uke, viser skjermen en tydelig feilmelding i stedet for utdatert data.

## Hurtigtaster

- `R` – oppdater alle paneler umiddelbart
- `F` – veksle fullskjerm

## Drift

- Siden lagrer sist vellykkede data i `localStorage` som fallback ved nettverksfeil.
- Paneler som viser lagret data får en "Lagret data"-indikator.
- Grafisk tema (dag/natt) veksler automatisk basert på klokkeslett.
- Rotatoren kjøres lokalt på kontorskjermen, ikke via GitHub Pages.
