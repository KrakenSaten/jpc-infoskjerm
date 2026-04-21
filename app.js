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
  renderCountdown,
  renderLunch,
  renderLunchError,
  renderDepartures,
  renderWeather,
  renderWeatherGraph,
  renderNews,
  rotateNewsPage,
  renderNotice,
  setLiveStatus,
  setPanelStaleFlag,
  updateUpdatedLabel,
  updateWeatherStatus,
  applyTheme,
  autoTheme,
  getWeatherSummary,
} = window.JPCRenderers;
const { fetchDeparturesData, fetchNewsData, fetchWeatherData } = window.JPCServices;

const NEWS_ROTATION_MS = 15_000;

const state = {
  menu: null,
  menuSource: null,
  lastSuccess: { departures: null, weather: null, news: null, menu: null },
  stale: { departures: false, weather: false, news: false, menu: false },
};

// Samle alle DOM-referanser ett sted
const elements = {
  clock: document.getElementById("clock"),
  date: document.getElementById("date"),
  updated: document.getElementById("updated"),
  liveDot: document.getElementById("live-dot"),
  liveLabel: document.getElementById("live-label"),

  lunsjCard: document.getElementById("lunsj-card"),
  lunsjHeading: document.getElementById("lunsj-heading"),
  lunsjStatus: document.getElementById("lunsj-status"),
  lunsjDish: document.getElementById("lunsj-dish"),
  lunsjSub: document.getElementById("lunsj-sub"),
  lunsjAller: document.getElementById("lunsj-aller"),
  nextdayLbl: document.getElementById("nextday-lbl"),
  nextdayDish: document.getElementById("nextday-dish"),

  weatherCard: document.getElementById("weather-card"),
  weatherTemp: document.getElementById("weather-temp"),
  weatherDesc: document.getElementById("weather-desc"),
  weatherMeta: document.getElementById("weather-meta"),
  weatherStatusText: document.getElementById("weather-status-text"),
  weatherTomorrow: document.getElementById("weather-tomorrow"),

  tbaneCard: document.getElementById("tbane-card"),
  tbaneBody: document.getElementById("tbane-body"),

  notice: document.getElementById("notice"),
  noticeTag: document.getElementById("notice-tag"),
  noticeMsg: document.getElementById("notice-msg"),

  newsCard: document.getElementById("news-card"),
  newsList: document.getElementById("news-list"),
  newsPage: document.getElementById("news-page"),
  newsUpdated: document.getElementById("news-updated"),
  newsDots: document.getElementById("news-dots"),

  cdDays: document.getElementById("cd-d"),
  cdHours: document.getElementById("cd-h"),
  cdMins: document.getElementById("cd-m"),
  cdSecs: document.getElementById("cd-s"),

  modeToggle: document.getElementById("mode-toggle"),
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

/* ---------- Live-status (global helsesjekk) ---------- */

function updateLiveStatus() {
  const sources = ["departures", "weather", "news", "menu"];
  const staleCount = sources.filter(s => state.stale[s]).length;
  const missingCount = sources.filter(s => !state.lastSuccess[s]).length;

  if (missingCount >= 3) {
    setLiveStatus(elements, "err");
  } else if (staleCount >= 1 || missingCount >= 1) {
    setLiveStatus(elements, "warn");
  } else {
    setLiveStatus(elements, "ok");
  }
}

function setSourceUpdate(source, date, stale = false) {
  state.lastSuccess[source] = date;
  state.stale[source] = stale;

  const cardMap = {
    departures: elements.tbaneCard,
    weather: elements.weatherCard,
    news: elements.newsCard,
    menu: elements.lunsjCard,
  };
  setPanelStaleFlag(cardMap[source], stale);

  // Oppdater global "Oppdatert HH:MM" med nyeste suksess
  const latest = ["departures", "weather", "news", "menu"]
    .map(s => state.lastSuccess[s])
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  updateUpdatedLabel(elements, latest);

  updateLiveStatus();
}

/* ---------- Lasting / henting ---------- */

async function loadMenu() {
  try {
    const { menu, isCurrentWeek } = await loadMenuFromSources();
    state.menu = menu;
    renderLunch(elements, menu, isCurrentWeek);
    const updatedAt = new Date();
    writeCache(CACHE_KEYS.menu, { menu, fetchedAt: updatedAt.toISOString() });
    setSourceUpdate("menu", updatedAt, !isCurrentWeek);
  } catch {
    const cached = readCache(CACHE_KEYS.menu);
    const cachedMenu = cached?.menu;
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    const currentWeek = getIsoWeek(new Date());
    if (cachedMenu && cachedMenu.weekNumber === currentWeek) {
      state.menu = cachedMenu;
      renderLunch(elements, cachedMenu, true);
      setSourceUpdate("menu", cachedDate, true);
    } else {
      renderLunchError(elements);
      setSourceUpdate("menu", cachedDate, true);
    }
  }
}

async function fetchDepartures() {
  try {
    const departures = await fetchDeparturesData(SKULLERUD_STOP_ID);
    const updatedAt = new Date();
    renderDepartures(elements, departures);
    writeCache(CACHE_KEYS.departures, { items: departures, fetchedAt: updatedAt.toISOString() });
    setSourceUpdate("departures", updatedAt, false);
  } catch {
    const cached = readCache(CACHE_KEYS.departures);
    const items = cached?.items || [];
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    renderDepartures(elements, items);
    setSourceUpdate("departures", cachedDate, items.length > 0);
  }
}

async function fetchWeather() {
  try {
    const weather = await fetchWeatherData(SKULLERUD_COORDS, getWeatherSummary);
    const updatedAt = new Date();
    renderWeather(elements, weather.days);
    renderWeatherGraph(elements, weather.hourlyForecast);
    updateWeatherStatus(elements, updatedAt, false);
    writeCache(CACHE_KEYS.weather, {
      days: weather.days,
      hourlyForecast: weather.hourlyForecast,
      fetchedAt: updatedAt.toISOString(),
    });
    setSourceUpdate("weather", updatedAt, false);
  } catch {
    const cached = readCache(CACHE_KEYS.weather);
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    if (cached) {
      renderWeather(elements, cached.days || []);
      renderWeatherGraph(elements, cached.hourlyForecast || []);
      updateWeatherStatus(elements, cachedDate, true);
      setSourceUpdate("weather", cachedDate, true);
    } else {
      setSourceUpdate("weather", null, false);
    }
  }
}

async function fetchNews() {
  try {
    const items = await fetchNewsData(NRK_NEWS_FEED_URL, formatNewsTimestamp);
    const updatedAt = new Date();
    renderNews(elements, items);
    elements.newsUpdated.textContent =
      String(updatedAt.getHours()).padStart(2, "0") + ":" +
      String(updatedAt.getMinutes()).padStart(2, "0");
    writeCache(CACHE_KEYS.news, { items, fetchedAt: updatedAt.toISOString() });
    setSourceUpdate("news", updatedAt, false);
  } catch {
    const cached = readCache(CACHE_KEYS.news);
    const items = cached?.items || [];
    const cachedDate = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    renderNews(elements, items);
    if (cachedDate) {
      elements.newsUpdated.textContent =
        String(cachedDate.getHours()).padStart(2, "0") + ":" +
        String(cachedDate.getMinutes()).padStart(2, "0");
    }
    setSourceUpdate("news", cachedDate, items.length > 0);
  }
}

function refreshAll() {
  fetchDepartures();
  fetchWeather();
  fetchNews();
  loadMenu();
}

/* ---------- Tema-hÃ¥ndtering ---------- */

function setupThemeHandling() {
  // Les lagret preferanse eller auto-velg
  const saved = localStorage.getItem("jpc-theme");
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
  } else {
    autoTheme();
  }

  // Manuell toggle
  elements.modeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("jpc-theme", next);
  });

  // Auto-veksle hvis ikke manuell preferanse er satt
  window.setInterval(() => {
    if (!localStorage.getItem("jpc-theme")) {
      autoTheme();
    }
  }, 15 * 60 * 1000);

  // Kiosk-modus via ?kiosk=1
  const params = new URLSearchParams(window.location.search);
  if (params.get("kiosk") === "1") {
    document.body.classList.add("kiosk");
  }
}

/* ---------- Hurtigtaster + lyttere ---------- */

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const target = e.target;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    const key = e.key.toLowerCase();
    if (key === "r") {
      e.preventDefault();
      refreshAll();
    } else if (key === "f") {
      e.preventDefault();
      toggleFullscreen();
    } else if (key === "t") {
      e.preventDefault();
      const isDark = document.documentElement.classList.contains("dark");
      const next = isDark ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("jpc-theme", next);
    }
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

function setupVisibilityHandler() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshAll();
    }
  });
}

/* ---------- Auto-reload kl 04:00 ---------- */

function scheduleNightlyReload() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(4, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  const msUntil = next.getTime() - now.getTime();
  window.setTimeout(() => {
    window.location.reload();
  }, msUntil);
}

/* ---------- Oppstart ---------- */

async function init() {
  setupThemeHandling();
  setupKeyboardShortcuts();
  setupVisibilityHandler();
  scheduleNightlyReload();

  formatClock(elements);
  renderCountdown(elements, JUBILEE_DEPARTURE_DATE);

  // Initiell data-henting
  await loadMenu();
  fetchDepartures();
  fetchWeather();
  fetchNews();

  // Intervaller
  window.setInterval(() => formatClock(elements), REFRESH_MS.clock);
  window.setInterval(() => renderCountdown(elements, JUBILEE_DEPARTURE_DATE), REFRESH_MS.clock);
  window.setInterval(fetchDepartures, REFRESH_MS.departures);
  window.setInterval(fetchWeather, REFRESH_MS.weather);
  window.setInterval(fetchNews, REFRESH_MS.news);
  window.setInterval(loadMenu, REFRESH_MS.menu);
  window.setInterval(() => rotateNewsPage(elements), NEWS_ROTATION_MS);
}

init();
