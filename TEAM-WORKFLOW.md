# Team Workflow

Denne guiden forklarer hvordan du gjor vanlige endringer pa infoskjermen.

## Oppdatere ukens meny

1. Ga til [menu.csv pa GitHub](https://github.com/KrakenSaten/jpc-infoskjerm/edit/main/menu.csv)
2. Endre innholdet til ny uke. Formatet er semikolon-separert:

```
week;day;title;allergens
18;Mandag;Kylling curry med ris, koriander og tempura;Hvete
18;Tirsdag;Chili con Carne;Melk
```

3. Klikk "Commit changes"
4. Vent 2-5 minutter, sa oppdateres skjermen automatisk

Tips: Komma i rettnavn er OK (vi bruker semikolon som separator).

## Endre kontorbeskjed

1. Ga til [index.html pa GitHub](https://github.com/KrakenSaten/jpc-infoskjerm/edit/main/index.html)
2. Sok etter `notice-msg` (Ctrl+F)
3. Endre teksten mellom `>` og `</div>`
4. For a skjule meldingen helt, legg til `hidden` pa notice-div

## Bruke Claude til endringer

Du kan be Claude i chatten om a gjore endringer direkte. Eksempler:

- "Oppdater menyen til uke 19" (med bilde av menyen)
- "Endre kontorbeskjeden til: Husk fredagspils!"
- "Skjul kontorbeskjeden"
- "Endre nedtellingen til ny dato"

Claude redigerer filene direkte pa GitHub via nettleseren.

## Filer du vanligvis endrer

| Fil | Nar |
|---|---|
| `menu.csv` | Ny ukemeny |
| `index.html` | Kontorbeskjed, layout-endringer |
| `config.js` | API-endepunkter, nedtellingsdato, intervaller |

## Filer du sjelden endrer

| Fil | Innhold |
|---|---|
| `styles.css` | All styling (light/dark mode, layout) |
| `renderers.js` | Rendering av paneler (vaergraf, nyheter, T-bane) |
| `app.js` | Hovedlogikk, intervaller, hurtigtaster |
| `services.js` | API-kall (Entur, Open-Meteo, NRK) |
| `menu-loader.js` | Parsing av menu.csv |

## Lokal testing

Kjor `start-preview.bat` for lokal preview pa `localhost:8181`. For rotatoren, kjor `start-rotator-preview.bat`.

Hvis du apner filene direkte som `file://`, vil API-kall feile pga. CORS. Bruk alltid preview-serveren.

## Deploy

Alt deployes automatisk via GitHub Pages. Commit til `main` = live pa 2-5 minutter. Ingen build-steg.
