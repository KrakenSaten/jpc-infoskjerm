const {
  stopId: SKULLERUD_STOP_ID,
  coords: SKULLERUD_COORDS,
  refreshMs: REFRESH_MS,
  jubileeDepartureDate: JUBILEE_DEPARTURE_DATE,
  nrkNewsFeedUrl: NRK_NEWS_FEED_URL,
  cacheKeys: CACHE_KEYS,
  defaultMenu,
} = window.JPC_CONFIG;

const { loadMenuFromSources } = window.JPCMenuLoader;
const {
  formatClock,
  formatNewsTimestamp,
  formatUpdatedLabel,
  getWeatherSummary,
  normalizeStaticCopy,
  normalizeWeatherGraphCopy,
  renderCountdown,
  renderLunch,
  renderNews,
  renderWeather,
  renderWeatherGraph,
  renderWeeklyMenu,
} = window.JPCRenderers;
const { fetchDeparturesData, fetchNewsData, fetchWeatherData } = window.JPCServices;

const state = {
  menu: defaultMenu,
  menuSource: "fallback",
  lastSuccess: {
    departures: null,
    weather: null,
    news: null,
    menu: null,
  },
  stale: {
    departures: false,
    weather: false,
    news: false,
    menu: false,
  },
};

const elements = {
  currentDate: document.querySelector("#current-date"),
  currentTime: document.querySelector("#current-time"),
  weekLabel: document.querySelector("#week-label"),
  systemStatus: document.querySelector("#system-status"),
  departuresUpdated: document.querySelector("#departures-updated"),
  departuresStatus: document.querySelector("#departures-status"),
  departuresList: document.querySelector("#departures-list"),
  newsUpdated: document.querySelector("#news-updated"),
  newsStatus: document.querySelector("#news-status"),
  newsList: document.querySelector("#news-list"),
  countdownDisplay: document.querySelector("#countdown-display"),
  countdownSubtitle: document.querySelector("#countdown-subtitle"),
  weatherUpdated: document.querySelector("#weather-updated"),
  weatherStatus: document.querySelector("#weather-status"),
  weatherCards: document.querySelector("#weather-cards"),
  weatherGraph: document.querySelector("#weather-graph"),
  todayDayLabel: document.querySelector("#today-day-label"),
  todayLunchTitle: document.querySelector("#today-lunch-title"),
  todayLunchAllergens: document.querySelector("#today-lunch-allergens"),
  tomorrowDayLabel: document.querySelector("#tomorrow-day-label"),
  tomorrowLunchTitle: document.querySelector("#tomorrow-lunch-title"),
  tomorrowLunchAllergens: document.querySelector("#tomorrow-lunch-allergens"),
  menuWeekBadge: document.querySelector("#menu-week-badge"),
  menuNote: document.querySelector("#menu-note"),
  weeklyMenu: document.querySelector("#weekly-menu"),
  departureTemplate: document.querySelector("#departure-template"),
  departureGroupTemplate: document.querySelector("#departure-group-template"),
  menuItemTemplate: document.querySelector("#menu-item-template"),
  weatherCardTemplate: document.querySelector("#weather-card-template"),
  newsItemTemplate: document.querySelector("#news-item-template"),
};

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache write failures.
  }
}

function renderSystemStatus() {
  const sources = ["departures", "weather", "news", "menu"];
  const knownDates = sources
    .map((source) => state.lastSuccess[source])
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime());
  const staleSources = sources.filter((source) => state.stale[source]);

  if (!knownDates.length) {
    elements.systemStatus.textContent = "Laster data fra kilder...";
    return;
  }

  const latestLabel = knownDates[0].toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  elements.systemStatus.textContent = staleSources.length
    ? `Viser delvis lagrede data. Siste vellykkede oppdatering ${latestLabel}.`
    : `Alle paneler oppdatert ${latestLabel}.`;
}

function setSourceUpdate(source, date, stale = false) {
  state.lastSuccess[source] = date;
  state.stale[source] = stale;
  renderSystemStatus();
}

function sortDepartureGroups(left, right) {
  return left[1][0].timestamp - right[1][0].timestamp;
}

function renderDepartures(departures) {
  elements.departuresList.innerHTML = "";

  if (!departures.length) {
    elements.departuresStatus.textContent = "Fant ingen T-baneavganger akkurat n\u00e5.";
    return;
  }

  elements.departuresStatus.textContent = "";
  const groups = departures.reduce((accumulator, departure) => {
    const groupKey = departure.directionLabel;
    if (!accumulator[groupKey]) {
      accumulator[groupKey] = [];
    }
    accumulator[groupKey].push(departure);
    return accumulator;
  }, {});

  Object.entries(groups)
    .sort(sortDepartureGroups)
    .slice(0, 2)
    .forEach(([directionLabel, groupDepartures]) => {
      const groupFragment = elements.departureGroupTemplate.content.cloneNode(true);
      const visibleDepartures = groupDepartures.slice(0, 2);
      groupFragment.querySelector(".departure-group-title").textContent = directionLabel;
      groupFragment.querySelector(".departure-group-subtitle").textContent = `${visibleDepartures.length} neste avganger`;
      const list = groupFragment.querySelector(".departure-group-list");

      visibleDepartures.forEach((departure) => {
        const fragment = elements.departureTemplate.content.cloneNode(true);
        const statusBadge = fragment.querySelector(".departure-status-badge");
        fragment.querySelector(".line-badge").textContent = departure.line;
        fragment.querySelector(".departure-destination").textContent = departure.destination;
        fragment.querySelector(".departure-platform").textContent = departure.platform.replace("Spor ", "");
        fragment.querySelector(".departure-time").textContent = departure.timeLabel;
        fragment.querySelector(".departure-countdown").textContent = departure.countdownLabel;
        statusBadge.textContent = departure.statusLabel;
        statusBadge.classList.toggle("delayed", departure.isDelayed);
        list.appendChild(fragment);
      });

      elements.departuresList.appendChild(groupFragment);
    });
}

async function loadMenu() {
  try {
    const { menu, source } = await loadMenuFromSources();
    state.menu = menu;
    state.menuSource = source;
    renderLunch(elements, state.menu);
    renderWeeklyMenu(elements, state.menu);
    const updatedAt = new Date();
    writeCache(CACHE_KEYS.menu, { menu, fetchedAt: updatedAt.toISOString() });
    setSourceUpdate("menu", updatedAt, false);
  } catch {
    const cached = readCache(CACHE_KEYS.menu);
    const cachedMenu = Array.isArray(cached?.days) ? cached : cached?.menu;
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    state.menu = cachedMenu || defaultMenu;
    state.menuSource = cachedMenu ? "cache" : "fallback";
    renderLunch(elements, state.menu);
    renderWeeklyMenu(elements, state.menu);
    setSourceUpdate("menu", cachedDate, Boolean(cachedMenu));
  }
}

async function fetchDepartures() {
  elements.departuresStatus.textContent = "Henter sanntidsdata...";

  try {
    const departures = await fetchDeparturesData(SKULLERUD_STOP_ID);
    const updatedAt = new Date();
    renderDepartures(departures);
    writeCache(CACHE_KEYS.departures, { items: departures, fetchedAt: updatedAt.toISOString() });
    elements.departuresUpdated.textContent = formatUpdatedLabel(updatedAt, false);
    setSourceUpdate("departures", updatedAt, false);
  } catch {
    const cached = readCache(CACHE_KEYS.departures);
    const cachedDepartures = Array.isArray(cached) ? cached : (cached?.items || []);
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    renderDepartures(cachedDepartures);
    elements.departuresStatus.textContent = cachedDepartures.length
      ? "Viser sist lagrede T-baneavganger."
      : "Kunne ikke hente sanntid akkurat n\u00e5. Sjekk nettverk eller API-tilgang.";
    elements.departuresUpdated.textContent = formatUpdatedLabel(cachedDate, true);
    setSourceUpdate("departures", cachedDate, cachedDepartures.length > 0);
  }
}

async function fetchWeather() {
  elements.weatherStatus.textContent = "Henter v\u00e6rmelding...";

  try {
    const weather = await fetchWeatherData(SKULLERUD_COORDS, getWeatherSummary);
    const updatedAt = new Date();
    renderWeather(elements, weather.days);
    renderWeatherGraph(elements, weather.hourlyForecast);
    normalizeWeatherGraphCopy(elements);
    writeCache(CACHE_KEYS.weather, {
      days: weather.days,
      hourlyForecast: weather.hourlyForecast,
      fetchedAt: updatedAt.toISOString(),
    });
    elements.weatherUpdated.textContent = formatUpdatedLabel(updatedAt, false);
    setSourceUpdate("weather", updatedAt, false);
  } catch {
    const cached = readCache(CACHE_KEYS.weather);
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;

    if (cached) {
      renderWeather(elements, cached.days || []);
      renderWeatherGraph(elements, cached.hourlyForecast || []);
      normalizeWeatherGraphCopy(elements);
      elements.weatherStatus.textContent = "Viser sist lagrede v\u00e6rdata.";
      elements.weatherUpdated.textContent = formatUpdatedLabel(cachedDate, true);
      setSourceUpdate("weather", cachedDate, true);
      return;
    }

    elements.weatherCards.innerHTML = "";
    elements.weatherGraph.innerHTML = "";
    elements.weatherStatus.textContent = "Kunne ikke hente v\u00e6rmelding akkurat n\u00e5.";
    elements.weatherUpdated.textContent = "Venter p\u00e5 ny oppdatering";
    setSourceUpdate("weather", null, false);
  }
}

async function fetchNews() {
  elements.newsStatus.textContent = "Henter siste nytt...";

  try {
    const items = await fetchNewsData(NRK_NEWS_FEED_URL, formatNewsTimestamp);
    const updatedAt = new Date();
    renderNews(elements, items);
    writeCache(CACHE_KEYS.news, { items, fetchedAt: updatedAt.toISOString() });
    elements.newsUpdated.textContent = formatUpdatedLabel(updatedAt, false);
    setSourceUpdate("news", updatedAt, false);
  } catch {
    const cached = readCache(CACHE_KEYS.news);
    const cachedItems = Array.isArray(cached) ? cached : (cached?.items || []);
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    renderNews(elements, cachedItems);
    elements.newsStatus.textContent = cachedItems.length
      ? "Viser sist lagrede NRK-saker."
      : "Kunne ikke hente NRK-nyheter akkurat n\u00e5.";
    elements.newsUpdated.textContent = formatUpdatedLabel(cachedDate, cachedItems.length > 0);
    setSourceUpdate("news", cachedDate, cachedItems.length > 0);
  }
}

async function init() {
  normalizeStaticCopy();
  formatClock(elements);
  renderCountdown(elements, JUBILEE_DEPARTURE_DATE);
  renderLunch(elements, state.menu);
  renderWeeklyMenu(elements, state.menu);
  renderSystemStatus();

  await loadMenu();
  fetchDepartures();
  fetchWeather();
  fetchNews();

  window.setInterval(() => formatClock(elements), REFRESH_MS.clock);
  window.setInterval(() => renderCountdown(elements, JUBILEE_DEPARTURE_DATE), REFRESH_MS.clock);
  window.setInterval(fetchDepartures, REFRESH_MS.departures);
  window.setInterval(fetchWeather, REFRESH_MS.weather);
  window.setInterval(fetchNews, REFRESH_MS.news);
}

init();
