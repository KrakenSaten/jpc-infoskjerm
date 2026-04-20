# Team Workflow

Infoskjermen hostes via GitHub Pages på https://krakensaten.github.io/jpc-infoskjerm/ og vises på kontorskjermen.

## Oppdater lunsjmenyen

1. Gå til `menu.csv` på GitHub.
2. Rediger filen direkte i nettleseren (blyant-ikon).
3. Commit endringen på `main`.
4. Innen en time henter infoskjermen den nye menyen. Vil du ha den umiddelbart, trykk `R` på tastaturet tilkoblet skjermen.

CSV-formatet:

```
week;day;title;allergens
17;Mandag;Tikka masala med raita, ris og koriander;Melk, hvete
```

Menyen må matche gjeldende ISO-ukenummer. Hvis ikke, viser skjermen en feilmelding. Dette er bevisst – bedre enn å vise utdaterte retter.

## Endre koden

- Datakilder og intervaller: `config.js`
- Lasting og normalisering av meny: `menu-loader.js`
- Henting av T-bane/vær/nyheter: `services.js`
- Visning (klokke, lunsj, vær, nyheter, anledninger): `renderers.js`
- Oppstart og orkestrering: `app.js`
- Visuell utforming: `styles.css`
- Struktur: `index.html`

## Lokal testing

Selv om siden er live på GitHub Pages, kan du teste endringer lokalt før commit:

- `start-preview.bat` starter lokal server og åpner infoskjermen.
- `start-rotator-preview.bat` gjør det samme for rotatoren.
- Lokal preview bruker `http://localhost:8181` slik at `fetch()` av menyfiler fungerer.

Unngå å åpne HTML-filene direkte med dobbeltklikk – `file://`-protokoll blokkerer nødvendige fetch-kall.

## Rotatoren

`rotator.html` veksler mellom infoskjermen og NOC-siden (`inm.jpc.no:8080`) via iframe. Den må kjøres lokalt på kontorskjermen fordi:

- NOC-siden er kun tilgjengelig på kontorets nettverk.
- iframe-innbygging av GitHub Pages-sider kan blokkeres av sikkerhetshoder utenfor samme domene.

Start rotatoren med `start-rotator.bat` på skjerm-PC-en.

## Enkle teamregler

- Raske innholdsoppdateringer skjer i `menu.csv` – ikke rør koden.
- Unngå å endre flere ting samtidig hvis du bare skal oppdatere lunsj.
- Test via preview-scriptet før du committer større endringer.
- Behold filnavn og enkle relative stier.

## Hurtigtaster

- `R` – oppdater alle paneler umiddelbart
- `F` – veksle fullskjerm

## Tekniske noter

- `.editorconfig` sørger for felles tegnsett, innrykk og linjeslutter.
- `.gitattributes` reduserer støy fra CRLF/LF i diff-er.
- Skjermen bruker `localStorage` som fallback ved nettverksfeil, og viser "Lagret data"-indikator på berørte paneler.
- Tema (dag/natt) veksler automatisk basert på klokkeslett.
