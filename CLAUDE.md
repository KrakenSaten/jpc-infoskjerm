# CLAUDE.md - JPC Skullerud Infoskjerm

Prosjektkontekst for Claude-assistenter som jobber med dette prosjektet.

## Hva er dette?

En kiosk-infoskjerm for JPCs kontor pa Skullerud, Oslo. Viser sanntid fra T-bane, vaer, lunsj, nyheter og kontorbeskjeder. Portrett-orientert (9:16), editorial design med Source Serif 4 + IBM Plex.

## Repo og deploy

- GitHub: github.com/KrakenSaten/jpc-infoskjerm (public)
- Live: krakensaten.github.io/jpc-infoskjerm/
- Hosting: GitHub Pages fra main-branch
- Bruker: KrakenSaten

## Arbeidsflyt

Bruker skriver i chat hva som skal endres. Claude editerer filer direkte pa github.com via Claude in Chrome. For store filer brukes base64 via CodeMirror API.

## Teknisk stack

Vanilla JS, ingen build-steg, ingen npm. Alt deployes direkte via GitHub Pages.

### Filstruktur

- index.html - Hovedside (portrett 9:16 layout)
- styles.css - CSS med variabler for light/dark mode
- renderers.js - Rendering: SVG-vaergraf, vaerikoner, nyhetsrotasjon, lunsj, T-bane
- app.js - Hovedlogikk, intervaller, tema, hurtigtaster (R/F/T)
- config.js - Innstillinger (API-endepunkter, koordinater, intervaller)
- services.js - API-kall til Entur GraphQL, Open-Meteo, NRK RSS
- menu-loader.js - Laster og parser menu.csv (semikolon-separert)
- menu.csv - Ukens meny (semikolon-separert, IKKE komma). Eneste menykilde: GitHub raw -> lokal csv (menu.json er fjernet)
- rotator.html - Iframe-rotator for kiosk

### Datakilder

- T-bane: Entur GraphQL (inkl. avviksmeldinger/situations), NSR:StopPlace:58227, 30 sek
- Vaer: Open-Meteo, 59.866685/10.840032, 30 min
- Nyheter: NRK RSS (direkte fetch), 10 min
- Lunsj: menu.csv pa GitHub, 60 min
- Nedtelling: config.js (jubileeDepartureDate + jubileeLabel), 1 sek
- Watchdog: GitHub API, siste commit-sha pa main, 60 min -> auto-reload ved ny commit

### Design tokens

Light: --paper #f4f2ed, --ink #15181c, --accent #7a1f1f (oxblood)
Dark: --paper #0f1216, --ink #f1ece0, --accent #e07a6b (korall)
Fonter: Source Serif 4 (titler), IBM Plex Sans (brodtekst), IBM Plex Mono (klokke/labels)

## Vanlige oppgaver

### Oppdatere ukens meny
Rediger menu.csv. Format: week;day;title;allergens (semikolon-separert!)

### Endre kontorbeskjed
I index.html, finn id="notice-msg" og endre teksten. hidden-attributt skjuler.

### Endre nedtellingsdato
I config.js, endre jubileeDepartureDate og jubileeLabel (label vises som tittel pa nedtellingen).
Etter utlop blir nedtellingen staaende paa 00 00 00 00 - klar for ny dato/label i config.js.

### Lunsjlogikk
- Servering 11:00-13:00 (status i lunsjkortet folger dette)
- Menyen gjelder en uke av gangen. Pa fredag/helg viser "Neste arbeidsdag" teksten "Ny meny kommer"
- Norske helligdager beregnes i renderers.js (isPublicHoliday) -> "Stengt - helligdag"
- splitDish deler tittel pa " - " (tankestrek) forst, deretter " med "/" m/ ". Hold formatet "Rett - beskrivelse"

## Viktige gotchas

1. menu.csv bruker semikolon (;), ikke komma
2. GitHub Pages cacher 2-10 min etter commit
3. Rotator lokalt bruker automatisk GitHub Pages URL (CORS)
4. Base64-overforing: del i 2 chunks a 14500 tegn
5. Encoding: UTF-8 tegn kan dobbelt-kodes ved base64. Fiks med .replace()
6. Rate-limits pa Chrome-tools: 5-timers vindu
7. Watchdog reloader skjermen automatisk innen en time etter ny commit pa main

## Kiosk-modus

- ?kiosk=1 skjuler mode-toggle, gir full-bleed uten preview-ramme, og temaet folger alltid auto dag/natt (manuelt T-trykk lagres ikke)
- Auto dark mode 17:00-07:00
- Auto-reload kl 04:00
- Hurtigtaster: R (refresh), F (fullscreen), T (tema)
