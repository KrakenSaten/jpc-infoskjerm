const {
  stopId: SKULLERUD_STOP_ID,
  coords: SKULLERUD_COORDS,
  refreshMs: REFRESH_MS,
  jubileeDepartureDate: JUBILEE_DEPARTURE_DATE,
  nrkNewsFeedUrl: NRK_NEWS_FEED_URL,
  cacheKeys: CACHE_KEYS,
} = window.JPC_CONFIG;

const { loadMenuFromSources, getIsoWeek } = window.JPCMenuLoader;
const {
  formatClock,
  formatNewsTimestamp,
  formatUpdatedLabel,
  getWeatherSummary,
  normalizeStaticCopy,
  normalizeWeatherGraphCopy,
  renderCountdown,
  renderLunch,
  renderLunchError,
  renderNews,
  renderOccasionBanner,
  renderWeather,
  renderWeatherGraph,
  renderWeeklyMenu,
  renderWeeklyMenuError,
  setPanelStaleFlag,
  updateTheme,
} = window.JPCRenderers;
const { fetchDeparturesData, fetchNewsData, fetchWeatherData } = window.JPCServices;

const state = {
  menu: null,
  menuSource: null,
  lastSuccess: { departures: null, weather: null, news: null, menu: null },
  stale: { departures: false, weather: false, news: false, menu: false },
};

const elements = {
  currentDate: document.querySelector("#current-date"),
  currentTime: document.querySelector("#current-time"),
  weekLabel: document.querySelector("#week-label"),
  systemStatus: document.querySelector("#system-status"),
  departuresPanel: document.querySelector(".departures-panel"),
  departuresUpdated: document.querySelector("#departures-updated"),
  departuresStatus: document.querySelector("#departures-status"),
  departuresList: document.querySelector("#departures-list"),
  newsSection: document.querySelector(".news-section"),
  newsUpdated: document.querySelector("#news-updated"),
  newsStatus: document.querySelector("#news-status"),
  newsList: document.querySelector("#news-list"),
  countdownDisplay: document.querySelector("#countdown-display"),
  countdownSubtitle: document.querySelector("#countdown-subtitle"),
  weatherPanel: document.querySelector(".weather-panel"),
  weatherUpdated: document.querySelector("#weather-updated"),
  weatherStatus: document.querySelector("#weather-status"),
  weatherCards: document.querySelector("#weather-cards"),
  weatherGraph: document.querySelector("#weather-graph"),
  todayLunchPanel: document.querySelector("#today-lunch-panel"),
  tomorrowLunchPanel: document.querySelector("#tomorrow-lunch-panel"),
  todayDayLabel: document.querySelector("#today-day-label"),
  todayLunchTitle: document.querySelector("#today-lunch-title"),
  todayLunchAllergens: document.querySelector("#today-lunch-allergens"),
  tomorrowDayLabel: document.querySelector("#tomorrow-day-label"),
  tomorrowLunchTitle: document.querySelector("#tomorrow-lunch-title"),
  tomorrowLunchAllergens: document.querySelector("#tomorrow-lunch-allergens"),
  menuPanel: document.querySelector(".menu-panel"),
  menuWeekBadge: document.querySelector("#menu-week-badge"),
  menuNote: document.querySelector("#menu-note"),
  weeklyMenu: document.querySelector("#weekly-menu"),
  occasionBanner: document.querySelector("#occasion-banner"),
  fullscreenBtn: document.querySelector("#fullscreen-btn"),
  refreshHint: document.querySelector("#refresh-hint"),
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
  } catch { return null; }
}

function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function renderSystemStatus() {
  const sources = ["departures", "weather", "news", "menu"];
  const known = sources
    .map(s => state.lastSuccess[s])
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());
  const staleSources = sources.filter(s => state.stale[s]);

  if (!known.length) {
    elements.systemStatus.textContent = "Laster data fra kilder...";
    return;
  }

  const latest = known[0].toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  elements.systemStatus.textContent = staleSources.length
    ? "Viser delvis lagrede data. Siste vellykkede oppdatering " + latest + "."
    : "Alle paneler oppdatert " + latest + ".";
}

function setSourceUpdate(source, date, stale = false) {
  state.lastSuccess[source] = date;
  state.stale[source] = stale;
  const panelMap = {
    departures: elements.departuresPanel,
    weather: elements.weatherPanel,
    news: elements.newsSection,
    menu: elements.menuPanel,
  };
  setPanelStaleFlag(panelMap[source], stale);
  renderSystemStatus();
}

function renderDepartures(departures) {
  elements.departuresList.innerHTML = "";
  if (!departures.length) {
    elements.departuresStatus.textContent = "Fant ingen T-baneavganger akkurat n\u00e5.";
    return;
  }
  elements.departuresStatus.textContent = "";
  const groups = departures.reduce((acc, dep) => {
    if (!acc[dep.directionLabel]) acc[dep.directionLabel] = [];
    acc[dep.directionLabel].push(dep);
    return acc;
  }, {});

  Object.entries(groups)
    .sort((l, r) => l[1][0].timestamp - r[1][0].timestamp)
    .slice(0, 2)
    .forEach(([dirLabel, groupDeps]) => {
      const groupFrag = elements.departureGroupTemplate.content.cloneNode(true);
      const visible = groupDeps.slice(0, 2);
      groupFrag.querySelector(".departure-group-title").textContent = dirLabel;
      groupFrag.querySelector(".departure-group-subtitle").textContent = visible.length + " neste avganger";
      const list = groupFrag.querySelector(".departure-group-list");
      visible.forEach(dep => {
        const frag = elements.departureTemplate.content.cloneNode(true);
        const badge = frag.querySelector(".departure-status-badge");
        frag.querySelector(".line-badge").textContent = dep.line;
        frag.querySelector(".departure-destination").textContent = dep.destination;
        frag.querySelector(".departure-platform").textContent = dep.platform.replace("Spor ", "");
        frag.querySelector(".departure-time").textContent = dep.timeLabel;
        frag.querySelector(".departure-countdown").textContent = dep.countdownLabel;
        badge.textContent = dep.statusLabel;
        badge.classList.toggle("delayed", dep.isDelayed);
        list.appendChild(frag);
      });
      elements.departuresList.appendChild(groupFrag);
    });
}

async function loadMenu() {
  try {
    const { menu, source, isCurrentWeek } = await loadMenuFromSources();
    state.menu = menu;
    state.menuSource = source;
    renderLunch(elements, menu, isCurrentWeek);
    renderWeeklyMenu(elements, menu, isCurrentWeek);
    const updatedAt = new Date();
    writeCache(CACHE_KEYS.menu, { menu, fetchedAt: updatedAt.toISOString() });
    setSourceUpdate("menu", updatedAt, !isCurrentWeek);
  } catch (error) {
    const cached = readCache(CACHE_KEYS.menu);
    const cachedMenu = cached?.menu;
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    const currentWeek = getIsoWeek(new Date());
    if (cachedMenu && cachedMenu.weekNumber === currentWeek) {
      state.menu = cachedMenu;
      state.menuSource = "cache";
      renderLunch(elements, cachedMenu, true);
      renderWeeklyMenu(elements, cachedMenu, true);
      setSourceUpdate("menu", cachedDate, true);
    } else {
      renderLunchError(elements);
      renderWeeklyMenuError(elements, currentWeek);
      setSourceUpdate("menu", cachedDate, true);
    }
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
    const cachedDeps = Array.isArray(cached) ? cached : (cached?.items || []);
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    renderDepartures(cachedDeps);
    elements.departuresStatus.textContent = cachedDeps.length
      ? "Viser sist lagrede T-baneavganger."
      : "Kunne ikke hente sanntid akkurat n\u00e5. Sjekk nettverk eller API-tilgang.";
    elements.departuresUpdated.textContent = formatUpdatedLabel(cachedDate, true);
    setSourceUpdate("departures", cachedDate, cachedDeps.length > 0);
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

function refreshAll() {
  fetchDepartures();
  fetchWeather();
  fetchNews();
  loadMenu();
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const key = e.key.toLowerCase();
    if (key === "r") {
      e.preventDefault();
      refreshAll();
      flashRefreshHint();
    } else if (key === "f") {
      e.preventDefault();
      toggleFullscreen();
    }
  });
}

function flashRefreshHint() {
  if (!elements.refreshHint) return;
  elements.refreshHint.classList.add("visible");
  setTimeout(() => elements.refreshHint.classList.remove("visible"), 1500);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

function setupFullscreenButton() {
  if (!elements.fullscreenBtn) return;
  elements.fullscreenBtn.addEventListener("click", toggleFullscreen);
}

function setupVisibilityHandler() {
  // Naar fanen blir synlig igjen etter pause, refresh raskt
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshAll();
    }
  });
}

async function init() {
  normalizeStaticCopy();
  formatClock(elements);
  renderCountdown(elements, JUBILEE_DEPARTURE_DATE);
  renderOccasionBanner(elements);
  updateTheme();
  renderSystemStatus();

  setupKeyboardShortcuts();
  setupFullscreenButton();
  setupVisibilityHandler();

  await loadMenu();
  fetchDepartures();
  fetchWeather();
  fetchNews();

  window.setInterval(() => formatClock(elements), REFRESH_MS.clock);
  window.setInterval(() => renderCountdown(elements, JUBILEE_DEPARTURE_DATE), REFRESH_MS.clock);
  window.setInterval(() => renderOccasionBanner(elements), 60 * 60 * 1000);
  window.setInterval(updateTheme, 15 * 60 * 1000);
  window.setInterval(fetchDepartures, REFRESH_MS.departures);
  window.setInterval(fetchWeather, REFRESH_MS.weather);
  window.setInterval(fetchNews, REFRESH_MS.news);
  window.setInterval(loadMenu, REFRESH_MS.menu);
}

init();
