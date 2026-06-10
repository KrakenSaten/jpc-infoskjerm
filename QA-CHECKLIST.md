# QA Checklist

Manuell test etter endringer paa infoskjermen. Oppdatert juni 2026 - matcher
dagens layout (v3: lunsj/vaer venstre, T-bane/beskjed/nyheter hoyre, nedtelling nederst).

## Foer du starter

1. Start lokal preview med `start-preview.bat`.
2. Aapne `http://localhost:8181/index.html`.
3. For rotatoren: `start-rotator-preview.bat` (NB: NOC-siden krever lokal kjoering, se kommentar i rotator.html).

## Rask smoke test

Kjoer denne foerst. Feiler noe her, stopp og rett foer videre test.

1. Siden aapner uten blank skjerm og uten feil i konsollen (F12).
2. Klokke, dato og ukenummer vises i toppen og klokken tikker.
3. Statuslinjen under toppen viser "Sanntid" (groenn prikk) etter kort tid.
4. Alle paneler viser innhold eller en fornuftig fallback-melding.
5. Ingen rare tegn eller oedelagte bokstaver (ae/oe/aa, tankestrek).

## Paneltest

### Toppfelt og statuslinje

1. JPC-logo og "Skullerud live" vises.
2. Dato og ukenummer stemmer.
3. "Oppdatert HH:MM" endres etter at data er hentet.
4. Prikken er groenn (alt ok), gul (noe stale/mangler) eller roed (3+ kilder mangler).

### Lunsj

1. Riktig rett for dagens ukedag fra menu.csv, med beskrivelse i kursiv under
   (tittelformat "Rett - beskrivelse" deles ved tankestreken).
2. Allergener vises som "Allergier: ...".
3. Status foelger klokken: foer 11:00 "Servering 11:00", 11-13 "Servering naa",
   13-14 "Servering ferdig", 14-17 "Ferdig for i dag".
4. Helg viser "Stengt i helg", helligdag viser "Stengt - helligdag".
5. Man-tor: "I morgen" viser neste dags rett. Fre/helg: "Neste arbeidsdag"
   viser "Ny meny kommer" (menyen finnes bare for innevaerende uke).
6. Mangler meny for uken: tydelig feilmelding "Meny mangler for denne uken".

### Vaer

1. Temperatur, beskrivelse og ikon for naa - ikonet skal matche faktisk vaer
   (ikke alltid sky!). Kilde-label sier "Open-Meteo".
2. Grafen viser temperaturkurve, nedboer, natt-baand og ikoner per 3. time.
3. "I morgen"-raden viser temperatur + beskrivelse + ikon.
4. Ved nettverksfeil: lagrede data vises og status blir gul/"lagret HH:MM".

### T-bane

1. Inntil 5 avganger med linjebadge, retning og nedtelling/klokkeslett.
2. Avganger < 3 min markeres, forsinkede vises i varselfarge.
3. Ved avvik fra Entur vises en varsel-rad nederst i tabellen.
4. Ved feil: lagrede avganger eller "Ingen avganger akkurat naa".

### Kontorbeskjed

1. Beskjeden i index.html (id="notice-msg") vises med tag.
2. `hidden`-attributt paa notice-div skjuler den.

### Nyheter

1. 10 saker fra NRK fordelt paa 2 sider a 5, roterer hvert 15. sekund.
2. Sidetall (1/2) og prikker nederst foelger rotasjonen.
3. Sakene er IKKE klikkbare (kioskvisning) - kun tid + tittel.
4. Ved feil: lagrede saker eller "Ingen nyheter akkurat naa".

### Nedtelling

1. Tittelen kommer fra jubileeLabel i config.js.
2. Telleren teller ned hvert sekund.
3. Etter utloep blir den staaende paa 00 00 00 00 (klar for ny dato i config.js).

## Kiosk-modus (?kiosk=1)

1. Mode-toggle-knappen er skjult.
2. Visningen fyller hele skjermen uten graa ramme rundt.
3. Tema bytter automatisk (lys 07-17, moerk ellers). Trykk T: temaet bytter
   midlertidig, men gaar tilbake til auto innen 15 min (lagres ikke).

## Watchdog og reload

1. Skjermen reloader automatisk kl 04:00.
2. Skjermen sjekker siste commit paa main hver time og reloader ved ny commit
   (test: push en commit, vent inntil en time, bekreft reload).

## Fallback-test

1. Koble fra nettverk og last siden paa nytt.
2. Paneler viser lagrede data (gul status) eller tydelige feilmeldinger.
3. Siden blir aldri blank.

## Godkjenningsregel

1. Smoke test bestaatt.
2. Alle paneler beroert av endringen er testet.
3. Ingen rare tegn eller layoutfeil.
4. Konsollen er fri for ukjente feil (console.warn ved nettverksfeil er OK).
