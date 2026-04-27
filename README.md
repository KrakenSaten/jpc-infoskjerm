# JPC Skullerud Infoskjerm

Intern infoskjerm for JPCs kontor pa Skullerud. Viser sanntid fra T-bane, vaer, lunsj, nyheter og kontorbeskjeder pa en portrett-orientert kiosk-display.

**Live:** [krakensaten.github.io/jpc-infoskjerm](https://krakensaten.github.io/jpc-infoskjerm/)

## Oversikt

Skjermen er bygget som en enkel vanilla JS-app som kjorer direkte fra GitHub Pages. Ingen build-steg, ingen avhengigheter, ingen npm. Alle endringer committes direkte til `main` og deployes automatisk.

### Design

Editorial avis-stil i portrett 9:16 med Source Serif 4 + IBM Plex Sans/Mono. Lys papirfarge (#f4f2ed) med oxblood-aksent (#7a1f1f). Automatisk dark mode etter kl. 17:00 med korall-aksent (#e07a6b).

### Datakilder

| Panel | Kilde | Oppdatering |
|---|---|---|
| T-bane | Entur GraphQL (Skullerud, NSR:StopPlace:58227) | Hvert 30. sek |
| Vaer | Open-Meteo (59.87, 10.84) | Hvert 10. min |
| Nyheter | NRK RSS via rss2json | Hvert 5. min |
| Lunsj | menu.csv pa GitHub | Hvert 60. min |
| Nedtelling | Hardkodet dato i config.js | Hvert sekund |

## Filstruktur

```
index.html        Hovedsiden (portrett 9:16 layout)
styles.css        All styling med CSS-variabler for light/dark
renderers.js      Rendering av alle paneler (SVG-vaergraf, ikoner, nyhetsrotasjon)
app.js            Hovedlogikk, intervaller, tema, hurtigtaster
config.js         Alle innstillinger (API-endepunkter, intervaller, koordinater)
services.js       API-kall til Entur, Open-Meteo, NRK RSS
menu-loader.js    Laster og parser menu.csv fra GitHub
menu.csv          Ukens meny (semikolon-separert)
rotator.html      Iframe-rotator for kiosk-modus
```

## Oppdatere ukens meny

Rediger `menu.csv` direkte pa GitHub. Formatet er semikolon-separert:

```
week;day;title;allergens
18;Mandag;Kylling curry med ris, koriander og tempura;Hvete
18;Tirsdag;Chili con Carne;Melk
```

Viktig: bruk **semikolon** som separator (ikke komma), da kan titler inneholde komma.

## Endre kontorbeskjed

Rediger `index.html` og finn:
```html
<div class="tag" id="notice-tag">Melding . kontor</div>
<div class="msg" id="notice-msg">Din melding her</div>
```

For a skjule meldingen, legg til `hidden` pa notice-elementet:
```html
<div class="notice" id="notice" hidden>
```

## Hurtigtaster

| Tast | Funksjon |
|---|---|
| R | Refresh alle data |
| F | Fullskjerm |
| T | Bytt light/dark mode |

## Kiosk-modus

Legg til `?kiosk=1` i URL-en for a skjule mode-toggle-knappen. Rotatoren (`rotator.html`) bytter mellom infoskjermen og andre sider. Nar rotatoren apnes lokalt som fil, peker den automatisk mot GitHub Pages-versjonen.

## Tekniske detaljer

- **Tema:** Auto dark mode 17:00-07:00, manuell toggle lagres i localStorage
- **Cache:** Alle API-data caches i localStorage som fallback ved nettverksfeil
- **Live-indikator:** Gronn = alt friskt, gul = noe er stale, rod = offline
- **Auto-reload:** Kl. 04:00 for a unnga memory leaks ved 24/7 drift
- **Vaergraf:** SVG med Catmull-Rom cubic bezier, natt-band, dag-separator, vaerikoner
- **Nyheter:** 10 saker, 2 sider a 5, roterer hvert 15. sek

## Deploy

Alt deployes via GitHub Pages fra `main`-branch. Commit til main = live pa 2-5 minutter.
