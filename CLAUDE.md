# CLAUDE.md — JPC Skullerud Infoskjerm

Prosjektkontekst for Claude-assistenter som jobber med dette prosjektet.

## Hva er dette?

En kiosk-infoskjerm for JPCs kontor på Skullerud, Oslo. Viser sanntid fra T-bane,
vær, lunsj, nyheter og kontorbeskjeder. Portrett-orientert (9:16), editorial design
med Source Serif 4 + IBM Plex.

## Repo og deploy

- **GitHub:** `github.com/KrakenSaten/jpc-infoskjerm` (public)
- **Live URL:** `https://krakensaten.github.io/jpc-infoskjerm/`
- **Hosting:** GitHub Pages fra `main`-branch. Ingen build-steg.

> Repoet er **offentlig** og skjermen står i et fellesareal.
> Ingen kundedata, personopplysninger eller interne systemdetaljer skal committes
> eller vises. Kun aggregerte tall og generell kontorinfo.

---

## Arbeidsflyt for Claude — les denne før du gjør noe

**Standardmetoden er GitHub Contents API via `bash`.** Den fungerer i alle
Claude-flater (web, app, Cowork, Code) og krever ingenting installert hos brukeren.

Claude skal **ikke**:
- be brukeren installere eller aktivere Claude in Chrome / nettleser-extension
- bruke nettleserautomatisering eller CodeMirror-triks for å redigere filer
- svare "jeg har ikke tilgang til å endre dette" uten å gå videre til fallback under

### Fallback-stige — følg i rekkefølge

| # | Situasjon | Hva Claude gjør |
|---|---|---|
| 1 | Token tilgjengelig i samtalen | Kjør API-arbeidsflyten under. Verifiser. Ferdig. |
| 2 | Ingen token | Be om et fine-grained token (se «Token» under). Én setning, ikke en forelesning. |
| 3 | Brukeren vil ikke / kan ikke bruke token | Lever **ferdig, komplett filinnhold** i en kodeblokk + direktelenke til redigering på GitHub. Brukeren limer inn og trykker Commit. |
| 4 | API-kall feiler | Les feilmeldingen i tabellen «Feilsøking» og prøv på nytt. Ikke gi opp etter første 4xx. |

Direktelenker til fallback-redigering (steg 3):

- Meny: `https://github.com/KrakenSaten/jpc-infoskjerm/edit/main/menu.csv`
- Kontorbeskjed: `https://github.com/KrakenSaten/jpc-infoskjerm/edit/main/index.html`
- Nedtelling: `https://github.com/KrakenSaten/jpc-infoskjerm/edit/main/config.js`

### API-arbeidsflyten (steg for steg)

Sett token i miljøvariabel først — aldri skriv den inn i filer eller commit-meldinger.

```bash
export GH="<token>"
export REPO="KrakenSaten/jpc-infoskjerm"
export FILE="menu.csv"
```

**1. Hent fil + sha**

```bash
curl -s -H "Authorization: Bearer $GH" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/contents/$FILE" > /tmp/meta.json

python3 -c "
import json, base64
d = json.load(open('/tmp/meta.json'))
open('/tmp/sha.txt','w').write(d['sha'])
open('/tmp/$FILE','wb').write(base64.b64decode(d['content']))
print('sha:', d['sha'])
"
```

**2. Rediger `/tmp/$FILE` lokalt.**
For `.js`-filer: valider med `node --check /tmp/config.js` før push.

**3. Hent fersk sha og push**

Sha **må** hentes på nytt rett før PUT. Gammel sha gir `409 Conflict`.

```bash
export SHA=$(curl -s -H "Authorization: Bearer $GH" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/contents/$FILE" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['sha'])")

export MSG="Oppdater ukens meny"

python3 -c "
import json, os, base64
data = open('/tmp/' + os.environ['FILE'], 'rb').read()
json.dump({
    'message': os.environ['MSG'],
    'content': base64.b64encode(data).decode('ascii'),
    'sha': os.environ['SHA'],
}, open('/tmp/payload.json', 'w'))
"

curl -s -X PUT -H "Authorization: Bearer $GH" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/contents/$FILE" -d @/tmp/payload.json | head -c 300
```

Base64 må være uten linjeskift. Python-varianten over gir det automatisk;
bruker du shell direkte, må det være `base64 -w0`.

**4. Verifiser alltid**

```bash
curl -s -H "Authorization: Bearer $GH" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/contents/$FILE" \
  | python3 -c "import sys,json,base64;print(base64.b64decode(json.load(sys.stdin)['content']).decode('utf-8'))"
```

Sjekk at æ/ø/å og tankestrek (–) er intakte. Ser du `Ã¦`, `Ã¸`, `Ã¥` eller `Â·`
er innholdet dobbeltkodet — fiks kilden og push på nytt.

**5. Si fra til brukeren:** endringen er live om 2–10 minutter, eller umiddelbart
ved å trykke **R** på skjermen.

### Feilsøking

| Feil | Årsak | Fiks |
|---|---|---|
| `401 Bad credentials` | Token utløpt, feilskrevet eller feil type | Be om nytt fine-grained token |
| `403 Resource not accessible` | Token mangler `Contents: write` på dette repoet | Nytt token med riktig scope |
| `403 rate limit exceeded` | Uautentisert kall | Send alltid `Authorization`-header |
| `409 Conflict` | Gammel sha | Hent sha på nytt rett før PUT |
| `422 Unprocessable` | Linjeskift i base64, eller manglende sha | Bruk `base64 -w0`, sjekk payload |
| Mojibake (`Ã¸`) | Dobbeltkoding | Skriv fila som UTF-8, koder én gang |

### Token

- Bruk et **fine-grained** personal access token, ikke et klassisk `ghp_`-token.
- Scope: kun `Contents: Read and write` på `KrakenSaten/jpc-infoskjerm`. Ingenting annet.
- Sett utløpsdato (maks 90 dager).
- Token skal **aldri** committes, skrives i denne fila, eller legges i noen fil i repoet.
- Er et token først limt inn i en chat, regnes det som eksponert → trekk det tilbake
  på `github.com/settings/tokens` og lag et nytt.

---

## Teknisk stack

Vanilla JS, ingen build, ingen npm.

### Filstruktur

```
index.html        Hovedside (portrett 9:16 layout)
styles.css        CSS med variabler for light/dark mode
renderers.js      Rendering: SVG-værgraf, værikoner, nyhetsrotasjon, lunsj, T-bane
app.js            Hovedlogikk, intervaller, tema, hurtigtaster (R/F/T)
config.js         Innstillinger (API-endepunkter, koordinater, intervaller, nedtelling)
services.js       API-kall til Entur GraphQL, Open-Meteo, NRK RSS
menu-loader.js    Laster og parser menu.csv
menu.csv          Ukens meny (semikolon-separert, IKKE komma)
rotator.html      Iframe-rotator for kiosk
```

### Datakilder

| Panel | API | StopId/Coords | Intervall |
|---|---|---|---|
| T-bane | Entur GraphQL | NSR:StopPlace:58227 | 30 sek |
| Vær | Open-Meteo | 59.866685, 10.840032 | 10 min |
| Nyheter | NRK RSS via rss2json | — | 5 min |
| Lunsj | menu.csv på GitHub | — | 60 min |
| Nedtelling | config.js | `jubileeDepartureDate` | 1 sek |

### Design tokens

```css
:root {
  --paper: #f4f2ed;   /* lys bakgrunn */
  --ink: #15181c;     /* mørk tekst */
  --accent: #7a1f1f;  /* oxblood (light) */
  --bar-bg: #15181c;
}
:root.dark {
  --paper: #0f1216;
  --ink: #f1ece0;
  --accent: #e07a6b;  /* korall (dark) */
}
```

Fonter: Source Serif 4 (titler), IBM Plex Sans (brødtekst), IBM Plex Mono (klokke, labels).

---

## Vanlige oppgaver

### Oppdatere ukens meny

Rediger `menu.csv`. Semikolon-separert:

```
week;day;title;allergens
18;Mandag;Kylling curry – med ris, koriander og tempura;Hvete
```

- Bruk formatet `Rett – beskrivelse` (tankestrek med mellomrom rundt) for stor
  tittel + kursiv undertekst.
- Komma i rettnavn er OK.
- Rett opp åpenbare skrivefeil i rettnavn (f.eks. «Ratatoulie» → Ratatouille).
- Kun én uke om gangen — ingen støtte for flere uker i fila.

### Endre kontorbeskjed

I `index.html`: finn `id="notice-msg"` og endre teksten mellom `>` og `</div>`.
Legg til `hidden` på notice-div for å skjule den.

### Endre nedtelling

I `config.js`: `jubileeDepartureDate` og `jubileeLabel` (ca. linje 24–27).
Etter utløp står nedtellingen på `00 00 00 00` til ny dato settes manuelt.

---

## Gotchas

1. **menu.csv bruker semikolon** (`;`), ikke komma.
2. **GitHub Pages cacher** — 2–10 min etter commit. Skjermen har en commit-watcher
   som reloader automatisk; **R** på tastaturet tvinger reload umiddelbart.
3. **Mixed content**: Pages kjører HTTPS og blokkerer `http://`-iframes og
   `fetch`. Interne HTTP-ressurser (f.eks. `inm.jpc.no:8080`) krever intern
   hosting eller proxy.
4. **iframe-blokkering**: Mange sider setter `X-Frame-Options` og kan ikke
   embeddes i rotatoren. Verifiser før du legger til en URL.
5. **UTF-8**: Verifiser alltid etter push at æ/ø/å er intakte.
6. **Lokal preview**: Kjør `start-preview.bat` (localhost:8181). `file://` feiler
   pga. CORS.

## Kiosk-modus

- `?kiosk=1` skjuler mode-toggle
- Auto dark mode 17:00–07:00, auto-reload kl 04:00
- Hurtigtaster: **R** (refresh), **F** (fullscreen), **T** (tema)

## Elementer i HTML (viktigste ID-er)

```
clock, date, updated, live-dot, live-label
lunsj-card, lunsj-heading, lunsj-status, lunsj-dish, lunsj-sub, lunsj-aller
nextday-lbl, nextday-dish
weather-card, weather-temp, weather-desc, weather-meta, weather-status-text
weather-tomorrow, now-icon, tmrw-icon, chart-range
wx-svg (+ wx-night, wx-daysep, wx-tgrid, wx-zero, wx-rain, wx-temp-area,
        wx-temp-line, wx-icons, wx-labels, wx-yleft, wx-yright, wx-xlabels, wx-days)
tbane-card, tbane-body
notice, notice-tag, notice-msg
news-card, news-list, news-page, news-updated, news-dots
cd-d, cd-h, cd-m, cd-s
mode-toggle
```
