(function initConfig() {
  const defaultMenu = window.JPC_MENU || {
    weekNumber: 13,
    days: [
      {
        dayIndex: 1,
        dayLabel: "Mandag",
        title: "Indisk kylling curry med ris, raita og koriander",
        allergens: "Allergier: Melk, hvete",
      },
      {
        dayIndex: 2,
        dayLabel: "Tirsdag",
        title: "Svine sm\u00f8rbr\u00f8d med hjertesalat, peppermajones, syltet r\u00f8dl\u00f8k og karse",
        allergens: "Allergier: Egg, hvete, sulfitt",
      },
      {
        dayIndex: 3,
        dayLabel: "Onsdag",
        title: "Spicy kylling og tomat pasta",
        allergens: "Allergier: Hvete, melk",
      },
      {
        dayIndex: 4,
        dayLabel: "Torsdag",
        title: "Laks med urtemajones, fennikel og k\u00e5lsalat",
        allergens: "Allergier: Fisk, egg",
      },
      {
        dayIndex: 5,
        dayLabel: "Fredag",
        title: "Taco med tilbeh\u00f8r",
        allergens: "Allergier: Hvete, melk",
      },
    ],
  };

  window.JPC_CONFIG = Object.freeze({
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
    }),
    jubileeDepartureDate: new Date("2026-04-30T15:00:00+02:00"),
    nrkNewsFeedUrl: "https://www.nrk.no/nyheter/siste.rss",
    cacheKeys: Object.freeze({
      menu: "jpc-menu-cache-v2",
      departures: "jpc-departures-cache-v2",
      weather: "jpc-weather-cache-v2",
      news: "jpc-news-cache-v2",
    }),
    defaultMenu,
  });
}());
