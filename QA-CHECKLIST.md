# QA Checklist

Bruk denne manuelle testen etter oppdateringer i infoskjermen.

## Foer du starter

1. Start lokal preview med `start-preview.bat`.
2. Aapne `http://localhost:8181/index.html`.
3. Hvis du tester rotatoren, start ogsaa `start-rotator-preview.bat`.

## Rask smoke test

Kjoer denne foerst. Hvis noe feiler her, stopp og rett feilen foer videre test.

1. Siden aapner uten blank skjerm eller feilside.
2. Layouten ser ryddig ut baade paa stor skjerm og i et smalere vindu.
3. Klokke, dato og uke vises i toppen.
4. Systemstatus viser ikke fast "Laster data..." i mer enn kort tid.
5. T-bane, vaer, nyheter og lunsj viser innhold eller en fornuftig fallback-melding.
6. Ingen tekst viser rare tegn eller oedelagte bokstaver.

## Paneltest

### Toppfelt

1. JPC-logoen og tittelen `Skullerud live` vises riktig.
2. Dato stemmer med dagens dato.
3. Klokkeslett oppdaterer seg av seg selv.
4. Ukenummer ser riktig ut.
5. Statuslinjen viser enten at alt er oppdatert eller at lagrede data brukes.

### T-bane

1. Panelet `Skullerud T-bane` vises.
2. Det finnes opptil to retninger med avganger.
3. Hver avgang viser linjenummer, destinasjon, klokkeslett og nedtelling.
4. Forsinkede avganger vises som forsinket, hvis API-et returnerer det.
5. `Oppdatert`-teksten endres etter at data er hentet.
6. Hvis sanntid ikke kan hentes, vises en tydelig fallback-melding.

### Nyheter

1. `Siste fra NRK` viser flere saker.
2. Hver sak har kilde/tid og tittel.
3. Det gaar an aa klikke paa en sak og aapne lenken.
4. Ved nettverksfeil vises enten lagrede saker eller en tydelig feilmelding.

### Jubileum

1. `30 aars jubileum` vises riktig.
2. Teksten `JPC AS · Tur til Brussel` vises uten rare tegn.
3. Nedtellingen viser dager, timer og minutter.
4. Underteksten med avreisetidspunkt vises.

### Vaer

1. Panelet `Skullerud` viser kort for i dag og i morgen.
2. Hvert kort viser sammendrag, temperatur og vind/nedboer.
3. Grafen vises under vaerkortene.
4. Grafen inneholder temperaturkurve, nedboersoyler og vaerikoner.
5. `Oppdatert`-teksten endres etter henting.
6. Ved feil vises lagrede data eller en tydelig feilmelding.

### Lunsj i dag

1. Panelet `I dag` viser riktig dag.
2. Rett og allergier stemmer med `menu.csv`.
3. Teksten ser riktig ut uten rare tegn.

### Lunsj i morgen

1. Panelet `I morgen` viser riktig neste arbeidsdag i menyen.
2. Rett og allergier stemmer med `menu.csv`.
3. Hvis det ikke finnes meny for dagen, vises en fornuftig fallback-tekst.

### Ukemeny

1. `Ukemeny` viser riktig ukenummer.
2. Alle fem arbeidsdager vises i riktig rekkefolge.
3. Hver dag viser rett og allergier.
4. Infoteksten under ukeoverskriften nevner `menu.csv`.

## Datatest for meny

Bruk denne etter endring i lunsj.

1. Endre en rett i `menu.csv`.
2. Last siden paanytt.
3. Bekreft at `I dag`, `I morgen` og `Ukemeny` viser den nye teksten.
4. Bekreft at det ikke er nodvendig aa endre `menu.json` for at oppdateringen skal slaa inn.

## Rotatortest

1. Start `start-rotator-preview.bat`.
2. Bekreft at rotatoren aapner.
3. Bekreft at overlay viser sidetittel og nedtelling.
4. Bekreft at infoskjermen kan lastes i rotatoren.
5. Hvis ekstern side ikke kan iframe-vises, bekreft at fallback-meldingen er forstaaelig.

## Fallback-test

Kjoer denne ved stoerre endringer eller foer produksjonsbruk.

1. Start siden med lokal preview.
2. Koble fra nettverk midlertidig, eller blokker eksterne kall hvis mulig.
3. Last siden paanytt.
4. Bekreft at skjermen fortsatt viser fornuftige meldinger eller lagrede data.
5. Bekreft at siden ikke blir blank selv om API-kall feiler.

## Godkjenningsregel

Endringen er klar til bruk naar:

1. Smoke test er bestaatt.
2. Alle relevante paneler for endringen er testet.
3. Ingen rare tegn eller tydelige layoutfeil er synlige.
4. Preview fungerer lokalt uten blank skjerm.
