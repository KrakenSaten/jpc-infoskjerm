(function initConfig() {
  // Hvor henter vi menyen fra?
  // 1. GitHub (alltid oppdatert) — denne er primærkilden
  // 2. Lokal menu.csv — hvis GitHub ikke er tilgjengelig
  // 3. Lokal menu.json — siste fallback
  //
  // Fallback-menyen i koden er bevisst fjernet: hvis ingen kilde har meny
  // for gjeldende uke, skal skjermen vise en tydelig feilmelding i stedet
  // for å lyve om hva som serveres.

  const MENU_GITHUB_URL = "https://raw.githubusercontent.com/KrakenSaten/jpc-infoskjerm/main/menu.csv";

    stopId: "NSR:StopPlace:58227",
    coords: Object.freeze({
      latitude: 59.866685,
      longitude: 10.840032,
    }),
    refreshMs: Object.freeze({
      departures: 30_000,
      clock: 1_000,
      weather: 30 * 60 * 1_000,
      news: 10 * 60 * 1_000,
      menu: 60 * 60 * 1_000, // Sjekk meny fra GitHub hver time
    }),
    jubileeDepartureDate: new Date("2026-04-30T15:00:00+02:00"),
    nrkNewsFeedUrl: "https://www.nrk.no/nyheter/siste.rss",
    menuGithubUrl: MENU_GITHUB_URL,
    cacheKeys: Object.freeze({
      menu: "jpc-menu-cache-v3",
      departures: "jpc-departures-cache-v3",
      weather: "jpc-weather-cache-v3",
      news: "jpc-news-cache-v3",
    }),
  });
}());
