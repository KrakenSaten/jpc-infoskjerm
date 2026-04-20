(function initRenderers() {
  function getIsoWeekNumber(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  }

  function normalizeStaticCopy() {
    const countdownHeading = document.querySelector("#countdown-heading");
    const countdownKicker = document.querySelector(".countdown-kicker");
    if (countdownHeading) countdownHeading.textContent = "30 \u00e5rs jubileum";
    if (countdownKicker)  countdownKicker.textContent = "JPC AS \u00b7 Tur til Brussel";
  }

  function normalizeWeatherGraphCopy(elements) {
    const svg = elements.weatherGraph?.querySelector("svg");
    if (svg) svg.setAttribute("aria-label", "V\u00e6rgraf for de neste 24 timene");
  }

  function formatClock(elements) {
    const now = new Date();
    elements.currentDate.textContent = now.toLocaleDateString("no-NO", {
      weekday: "long", day: "numeric", month: "long",
    });
    elements.currentTime.textContent = now.toLocaleTimeString("no-NO", {
      hour: "2-digit", minute: "2-digit",
    });
    elements.weekLabel.textContent = "Uke " + getIsoWeekNumber(now);
  }

  function renderCountdown(elements, departureDate) {
    const now = new Date();
    const diff = departureDate.getTime() - now.getTime();
    if (diff <= 0) {
      elements.countdownDisplay.textContent = "Avreise i dag";
      elements.countdownSubtitle.textContent = "Avreise 30. april 2026 kl. 15:00";
      return;
    }
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    elements.countdownDisplay.textContent =
      days + " dager " + String(hours).padStart(2, "0") + " timer " + String(minutes).padStart(2, "0") + " min";
    elements.countdownSubtitle.textContent = "Avreise 30. april 2026 kl. 15:00";
  }

  function getMenuForDay(menu, dayIndex) {
    return menu.days.find(item => item.dayIndex === dayIndex) || null;
  }

  function getLunchForDate(menu, date) {
    const jsDay = date.getDay(); // 0=sondag, 1=mandag ... 6=lordag
    if (jsDay === 0 || jsDay === 6) return null; // ingen lunsj i helg
    return getMenuForDay(menu, jsDay);
  }

  function renderLunchCard(dayLabelEl, titleEl, allergenEl, menuEntry, fallbackLabel) {
    if (!menuEntry) {
      dayLabelEl.textContent = fallbackLabel;
      titleEl.textContent = "Ingen lunsj registrert";
      allergenEl.textContent = "Ingen rett funnet for denne dagen i menyen.";
      return;
    }
    dayLabelEl.textContent = menuEntry.dayLabel;
    titleEl.textContent = menuEntry.title;
    allergenEl.textContent = menuEntry.allergens;
  }

  function renderLunch(elements, menu, isCurrentWeek) {
    if (!isCurrentWeek) {
      renderLunchError(elements);
      return;
    }
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    // Om i dag er fredag, hopp over helgen til mandag
    if (today.getDay() === 5) {
      tomorrow.setDate(today.getDate() + 3);
    } else if (today.getDay() === 6) {
      tomorrow.setDate(today.getDate() + 2);
    }
    renderLunchCard(
      elements.todayDayLabel,
      elements.todayLunchTitle,
      elements.todayLunchAllergens,
      getLunchForDate(menu, today),
      "I dag"
    );
    renderLunchCard(
      elements.tomorrowDayLabel,
      elements.tomorrowLunchTitle,
      elements.tomorrowLunchAllergens,
      getLunchForDate(menu, tomorrow),
      "Neste dag"
    );
  }

  function renderLunchError(elements) {
    elements.todayDayLabel.textContent = "Mangler";
    elements.todayLunchTitle.textContent = "Ingen meny for denne uken";
    elements.todayLunchAllergens.textContent = "Menyen er ikke oppdatert. Kontakt ansvarlig for infoskjerm.";
    elements.tomorrowDayLabel.textContent = "Mangler";
    elements.tomorrowLunchTitle.textContent = "Ingen meny for denne uken";
    elements.tomorrowLunchAllergens.textContent = "Menyen er ikke oppdatert.";
  }

  function renderWeeklyMenu(elements, menu, isCurrentWeek) {
    elements.weeklyMenu.innerHTML = "";
    elements.menuWeekBadge.textContent = "Uke " + menu.weekNumber;
    if (!isCurrentWeek) {
      renderWeeklyMenuError(elements, getIsoWeekNumber(new Date()));
      return;
    }
    elements.menuNote.textContent = "Viser menyen for denne uken.";
    menu.days.forEach(item => {
      const frag = elements.menuItemTemplate.content.cloneNode(true);
      frag.querySelector(".menu-day").textContent = item.dayLabel;
      frag.querySelector(".menu-dish").textContent = item.title;
      frag.querySelector(".menu-allergens").textContent = item.allergens;
      elements.weeklyMenu.appendChild(frag);
    });
  }

  function renderWeeklyMenuError(elements, currentWeek) {
    elements.weeklyMenu.innerHTML = "";
    elements.menuWeekBadge.textContent = "Uke " + currentWeek + " mangler";
    elements.menuNote.textContent = "Fant ingen meny for uke " + currentWeek + ". Kontakt ansvarlig for infoskjerm.";
  }

  function getWeatherSummary(code) {
    const s = { 0: "Klart", 1: "For det meste klart", 2: "Delvis skyet", 3: "Overskyet", 45: "T\u00e5ke", 48: "T\u00e5ke med rim", 51: "Lett yr", 53: "Yr", 55: "Kraftig yr", 61: "Lett regn", 63: "Regn", 65: "Kraftig regn", 66: "Lett underkj\u00f8lt regn", 67: "Underkj\u00f8lt regn", 71: "Lett sn\u00f8", 73: "Sn\u00f8", 75: "Kraftig sn\u00f8", 77: "Sn\u00f8korn", 80: "Byger", 81: "Kraftige byger", 82: "S\u00e6rt kraftige byger", 85: "Sn\u00f8byger", 86: "Kraftige sn\u00f8byger", 95: "Torden", 96: "Torden med hagl", 99: "Kraftig torden med hagl" };
    return s[code] || "Ukjent v\u00e6r";
  }

  function renderWeather(elements, days) {
    elements.weatherCards.innerHTML = "";
    if (!days.length) {
      elements.weatherStatus.textContent = "Fant ingen v\u00e6rdata akkurat n\u00e5.";
      return;
    }
    elements.weatherStatus.textContent = "";
    days.forEach(day => {
      const frag = elements.weatherCardTemplate.content.cloneNode(true);
      frag.querySelector(".weather-day").textContent = day.label;
      frag.querySelector(".weather-summary").textContent = day.summary;
      frag.querySelector(".weather-temp").textContent = Math.round(day.maxTemp) + "\u00b0 / " + Math.round(day.minTemp) + "\u00b0";
      frag.querySelector(".weather-meta").textContent = day.precipitation.toFixed(1) + " mm nedb\u00f8r \u2022 Vind " + Math.round(day.wind) + " m/s";
      elements.weatherCards.appendChild(frag);
    });
  }

  function getWeatherIconSvg(code, x, y) {
    if (code === 0 || code === 1) {
      return '<g transform="translate(' + (x - 12) + ' ' + (y - 12) + ')">' +
        '<circle cx="12" cy="12" r="7" fill="#ffb703" />' +
        '<g stroke="#ffd166" stroke-width="1.6" stroke-linecap="round">' +
        '<line x1="12" y1="1" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="23" />' +
        '<line x1="1" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="23" y2="12" />' +
        '<line x1="4" y1="4" x2="6.8" y2="6.8" /><line x1="17.2" y1="17.2" x2="20" y2="20" />' +
        '<line x1="17.2" y1="6.8" x2="20" y2="4" /><line x1="4" y1="20" x2="6.8" y2="17.2" />' +
        '</g></g>';
    }
    if (code === 2 || code === 3 || code === 45 || code === 48) {
      return '<g transform="translate(' + (x - 14) + ' ' + (y - 10) + ')">' +
        '<circle cx="10" cy="11" r="5.5" fill="#cfd5dd" />' +
        '<circle cx="15" cy="9" r="7" fill="#d8dde4" />' +
        '<circle cx="21" cy="11.5" r="5.5" fill="#cfd5dd" />' +
        '<rect x="8" y="11" width="16" height="7" rx="3.5" fill="#d8dde4" />' +
        '</g>';
    }
    if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return '<g transform="translate(' + (x - 14) + ' ' + (y - 12) + ')">' +
        '<circle cx="10" cy="11" r="5.5" fill="#cfd5dd" />' +
        '<circle cx="15" cy="9" r="7" fill="#d8dde4" />' +
        '<circle cx="21" cy="11.5" r="5.5" fill="#cfd5dd" />' +
        '<rect x="8" y="11" width="16" height="7" rx="3.5" fill="#d8dde4" />' +
        '<g stroke="#79c7ff" stroke-width="1.8" stroke-linecap="round">' +
        '<line x1="10" y1="21" x2="8" y2="25" />' +
        '<line x1="16" y1="21" x2="14" y2="25" />' +
        '<line x1="22" y1="21" x2="20" y2="25" /></g></g>';
    }
    return '<g transform="translate(' + (x - 14) + ' ' + (y - 10) + ')">' +
      '<circle cx="10" cy="11" r="5.5" fill="#cfd5dd" />' +
      '<circle cx="15" cy="9" r="7" fill="#d8dde4" />' +
      '<circle cx="21" cy="11.5" r="5.5" fill="#cfd5dd" />' +
      '<rect x="8" y="11" width="16" height="7" rx="3.5" fill="#d8dde4" /></g>';
  }

  function renderWeatherGraph(elements, hours) {
    elements.weatherGraph.innerHTML = "";
    if (!hours.length) return;

    const width = 760;
    const height = 216;
    const padding = { top: 34, right: 18, bottom: 34, left: 28 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const temps = hours.map(h => h.temperature);
    const precip = hours.map(h => h.precipitation);
    const maxT = Math.max(...temps);
    const minT = Math.min(...temps);
    const maxP = Math.max(...precip, 0.2);

    const xScale = i => padding.left + (chartW * i) / Math.max(hours.length - 1, 1);
    const yScale = v => {
      const n = (v - minT) / Math.max(maxT - minT, 1);
      return padding.top + chartH - (n * chartH * 0.82 + chartH * 0.08);
    };
    const linePath = vals =>
      vals.map((v, i) => (i === 0 ? "M" : "L") + " " + xScale(i).toFixed(2) + " " + yScale(v).toFixed(2)).join(" ");
    const precipScale = v => (v / maxP) * (chartH * 0.36);

    const guideLines = Array.from({ length: 4 }, (_, i) => {
      const y = padding.top + (chartH * i) / 3;
      return '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 4" />';
    }).join("");

    const hourLabels = hours
      .filter((_, i) => i % 4 === 0)
      .map((h, i) => '<text class="weather-hour-label" x="' + xScale(i * 4) + '" y="' + (height - 10) + '" text-anchor="middle">' + h.label + '</text>')
      .join("");

    const weatherIcons = hours
      .filter((_, i) => i % 4 === 0)
      .map((h, i) => getWeatherIconSvg(h.weatherCode, xScale(i * 4), 14))
      .join("");

    const tempLabels = [Math.round(maxT), Math.round((maxT + minT) / 2), Math.round(minT)]
      .map((label, i) => {
        const y = padding.top + (chartH * i) / 2;
        return '<text class="weather-axis-label" x="4" y="' + (y + 4) + '">' + label + '\u00b0</text>';
      })
      .join("");

    const precipBars = hours.map((h, i) => {
      const x = xScale(i) - 5;
      const bh = precipScale(h.precipitation);
      const y = padding.top + chartH - bh;
      return '<rect x="' + x + '" y="' + y + '" width="10" height="' + Math.max(bh, 2) + '" rx="4" fill="rgba(121, 199, 255, 0.5)" />';
    }).join("");

    elements.weatherGraph.innerHTML =
      '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="V\u00e6rgraf for de neste 24 timene">' +
      '<defs>' +
      '<linearGradient id="tempLine" x1="0%" y1="0%" x2="100%" y2="0%">' +
      '<stop offset="0%" stop-color="#ffb703" />' +
      '<stop offset="100%" stop-color="#ff6b6b" />' +
      '</linearGradient></defs>' +
      guideLines + weatherIcons + precipBars +
      '<path d="' + linePath(temps) + '" fill="none" stroke="url(#tempLine)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />' +
      hourLabels + tempLabels +
      '</svg>';
  }

  function renderNews(elements, items) {
    elements.newsList.innerHTML = "";
    if (!items.length) {
      elements.newsStatus.textContent = "Fant ingen NRK-saker akkurat n\u00e5.";
      return;
    }
    elements.newsStatus.textContent = "";
    items.forEach(item => {
      const frag = elements.newsItemTemplate.content.cloneNode(true);
      const link = frag.querySelector(".news-item");
      link.href = item.link;
      frag.querySelector(".news-source").textContent = item.sourceLabel;
      frag.querySelector(".news-title").textContent = item.title;
      elements.newsList.appendChild(frag);
    });
  }

  function formatNewsTimestamp(dateText) {
    if (!dateText) return "NRK Nyheter";
    const publishedAt = new Date(dateText);
    if (Number.isNaN(publishedAt.getTime())) return "NRK Nyheter";
    return "NRK Nyheter \u00b7 " + publishedAt.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  }

  function formatUpdatedLabel(date, stale = false) {
    if (!date) return "Oppdaterer...";
    const prefix = stale ? "Sist lagret" : "Oppdatert";
    return prefix + " " + date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  }

  function setPanelStaleFlag(panelEl, isStale) {
    if (!panelEl) return;
    panelEl.classList.toggle("panel-stale", Boolean(isStale));
  }

  // Enkle, morsomme anledninger. Legg til flere fritt.
  const OCCASIONS = [
    { month: 1, day: 13, text: "\ud83c\udf69 Nasjonal kakefredag" }, // 13. januar
    { month: 2, day: 14, text: "\u2764\ufe0f Valentinsdagen" },
    { month: 3, day: 8,  text: "\u2640\ufe0f Internasjonal kvinnedag" },
    { month: 3, day: 14, text: "\ud83e\udd67 Pi-dagen" },
    { month: 5, day: 1,  text: "\ud83d\udee0 Arbeidernes dag" },
    { month: 5, day: 17, text: "\ud83c\uddf3\ud83c\uddf4 Gratulerer med dagen!" },
    { month: 6, day: 21, text: "\u2600\ufe0f Sommersolverv" },
    { month: 8, day: 8,  text: "\ud83d\udc31 Internasjonal kattedag" },
    { month: 10, day: 4, text: "\ud83e\uddd1\u200d\ud83d\ude80 World Space Week" },
    { month: 10, day: 31, text: "\ud83c\udf83 Halloween" },
    { month: 11, day: 11, text: "\ud83c\udf77 Mortensaften" },
    { month: 12, day: 13, text: "\ud83d\udd6f\ufe0f Lucia" },
    { month: 12, day: 24, text: "\ud83c\udf84 Julaften" },
  ];

  function getOccasionForToday() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const dow = now.getDay();
    // Fredag = kakefredag (hver fredag)
    if (dow === 5) {
      return { text: "\ud83c\udf70 Kakefredag p\u00e5 kontoret!" };
    }
    return OCCASIONS.find(o => o.month === m && o.day === d) || null;
  }

  function renderOccasionBanner(elements) {
    if (!elements.occasionBanner) return;
    const occasion = getOccasionForToday();
    if (!occasion) {
      elements.occasionBanner.hidden = true;
      elements.occasionBanner.textContent = "";
      return;
    }
    elements.occasionBanner.hidden = false;
    elements.occasionBanner.textContent = occasion.text;
  }

  // Lys/morkt tema basert paa tid paa dognet
  function updateTheme() {
    const hour = new Date().getHours();
    const isDaytime = hour >= 8 && hour < 17;
    document.documentElement.classList.toggle("theme-day", isDaytime);
    document.documentElement.classList.toggle("theme-night", !isDaytime);
  }

  window.JPCRenderers = {
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
  };
}());
