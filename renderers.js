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

    if (countdownHeading) {
      countdownHeading.textContent = "30 \u00e5rs jubileum";
    }

    if (countdownKicker) {
      countdownKicker.textContent = "JPC AS \u00b7 Tur til Brussel";
    }
  }

  function normalizeWeatherGraphCopy(elements) {
    const svg = elements.weatherGraph?.querySelector("svg");
    const legends = elements.weatherGraph?.querySelectorAll(".weather-legend");

    if (svg) {
      svg.setAttribute("aria-label", "V\u00e6rgraf for de neste 24 timene");
    }

    if (legends?.[0]) {
      legends[0].textContent = "Temperatur";
    }

    if (legends?.[1]) {
      legends[1].textContent = "Nedb\u00f8r";
    }
  }

  function formatClock(elements) {
    const now = new Date();
    elements.currentDate.textContent = now.toLocaleDateString("no-NO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    elements.currentTime.textContent = now.toLocaleTimeString("no-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });
    elements.weekLabel.textContent = `Uke ${getIsoWeekNumber(now)}`;
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

    elements.countdownDisplay.textContent = `${days} dager ${String(hours).padStart(2, "0")} timer ${String(minutes).padStart(2, "0")} min`;
    elements.countdownSubtitle.textContent = "Avreise 30. april 2026 kl. 15:00";
  }

  function getMenuForDay(menu, dayIndex) {
    return menu.days.find((item) => item.dayIndex === dayIndex) || null;
  }

  function getLunchForDate(menu, date) {
    return getMenuForDay(menu, date.getDay());
  }

  function renderLunchCard(dayLabelElement, titleElement, allergenElement, menuEntry, fallbackLabel) {
    if (!menuEntry) {
      dayLabelElement.textContent = fallbackLabel;
      titleElement.textContent = "Ingen lunsj registrert";
      allergenElement.textContent = "Ingen rett funnet for denne dagen i menyen.";
      return;
    }

    dayLabelElement.textContent = menuEntry.dayLabel;
    titleElement.textContent = menuEntry.title;
    allergenElement.textContent = menuEntry.allergens;
  }

  function renderLunch(elements, menu) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    renderLunchCard(elements.todayDayLabel, elements.todayLunchTitle, elements.todayLunchAllergens, getLunchForDate(menu, today), "I dag");
    renderLunchCard(elements.tomorrowDayLabel, elements.tomorrowLunchTitle, elements.tomorrowLunchAllergens, getLunchForDate(menu, tomorrow), "I morgen");
  }

  function renderWeeklyMenu(elements, menu) {
    elements.weeklyMenu.innerHTML = "";
    elements.menuWeekBadge.textContent = `Uke ${menu.weekNumber}`;

    const currentWeek = getIsoWeekNumber(new Date());
    elements.menuNote.textContent = currentWeek === menu.weekNumber
      ? "Viser menyen som er lastet inn for denne uken. Rediger menu.csv for raske endringer."
      : `Lastet meny gjelder uke ${menu.weekNumber}. Oppdater menu.csv ved ny uke.`;

    menu.days.forEach((item) => {
      const fragment = elements.menuItemTemplate.content.cloneNode(true);
      fragment.querySelector(".menu-day").textContent = item.dayLabel;
      fragment.querySelector(".menu-dish").textContent = item.title;
      fragment.querySelector(".menu-allergens").textContent = item.allergens;
      elements.weeklyMenu.appendChild(fragment);
    });
  }

  function getWeatherSummary(weatherCode) {
    const summaries = { 0: "Klart", 1: "For det meste klart", 2: "Delvis skyet", 3: "Overskyet", 45: "T\u00e5ke", 48: "T\u00e5ke med rim", 51: "Lett yr", 53: "Yr", 55: "Kraftig yr", 61: "Lett regn", 63: "Regn", 65: "Kraftig regn", 66: "Lett underkj\u00f8lt regn", 67: "Underkj\u00f8lt regn", 71: "Lett sn\u00f8", 73: "Sn\u00f8", 75: "Kraftig sn\u00f8", 77: "Sn\u00f8korn", 80: "Byger", 81: "Kraftige byger", 82: "S\u00e6rt kraftige byger", 85: "Sn\u00f8byger", 86: "Kraftige sn\u00f8byger", 95: "Torden", 96: "Torden med hagl", 99: "Kraftig torden med hagl" };
    return summaries[weatherCode] || "Ukjent v\u00e6r";
  }

  function renderWeather(elements, days) {
    elements.weatherCards.innerHTML = "";

    if (!days.length) {
      elements.weatherStatus.textContent = "Fant ingen v\u00e6rdata akkurat n\u00e5.";
      return;
    }

    elements.weatherStatus.textContent = "";
    days.forEach((day) => {
      const fragment = elements.weatherCardTemplate.content.cloneNode(true);
      fragment.querySelector(".weather-day").textContent = day.label;
      fragment.querySelector(".weather-summary").textContent = day.summary;
      fragment.querySelector(".weather-temp").textContent = `${Math.round(day.maxTemp)}\u00b0 / ${Math.round(day.minTemp)}\u00b0`;
      fragment.querySelector(".weather-meta").textContent = `${day.precipitation.toFixed(1)} mm nedb\u00f8r \u2022 Vind ${Math.round(day.wind)} m/s`;
      elements.weatherCards.appendChild(fragment);
    });
  }

  function getWeatherIconSvg(weatherCode, x, y) {
    if (weatherCode === 0 || weatherCode === 1) {
      return `
        <g transform="translate(${x - 12} ${y - 12})">
          <circle cx="12" cy="12" r="7" fill="#ffb703" />
          <g stroke="#ffd166" stroke-width="1.6" stroke-linecap="round">
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
            <line x1="4" y1="4" x2="6.8" y2="6.8" />
            <line x1="17.2" y1="17.2" x2="20" y2="20" />
            <line x1="17.2" y1="6.8" x2="20" y2="4" />
            <line x1="4" y1="20" x2="6.8" y2="17.2" />
          </g>
        </g>
      `;
    }

    if (weatherCode === 2 || weatherCode === 3 || weatherCode === 45 || weatherCode === 48) {
      return `
        <g transform="translate(${x - 14} ${y - 10})">
          <circle cx="10" cy="11" r="5.5" fill="#cfd5dd" />
          <circle cx="15" cy="9" r="7" fill="#d8dde4" />
          <circle cx="21" cy="11.5" r="5.5" fill="#cfd5dd" />
          <rect x="8" y="11" width="16" height="7" rx="3.5" fill="#d8dde4" />
        </g>
      `;
    }

    if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
      return `
        <g transform="translate(${x - 14} ${y - 12})">
          <circle cx="10" cy="11" r="5.5" fill="#cfd5dd" />
          <circle cx="15" cy="9" r="7" fill="#d8dde4" />
          <circle cx="21" cy="11.5" r="5.5" fill="#cfd5dd" />
          <rect x="8" y="11" width="16" height="7" rx="3.5" fill="#d8dde4" />
          <g stroke="#79c7ff" stroke-width="1.8" stroke-linecap="round">
            <line x1="10" y1="21" x2="8" y2="25" />
            <line x1="16" y1="21" x2="14" y2="25" />
            <line x1="22" y1="21" x2="20" y2="25" />
          </g>
        </g>
      `;
    }

    return `
      <g transform="translate(${x - 14} ${y - 10})">
        <circle cx="10" cy="11" r="5.5" fill="#cfd5dd" />
        <circle cx="15" cy="9" r="7" fill="#d8dde4" />
        <circle cx="21" cy="11.5" r="5.5" fill="#cfd5dd" />
        <rect x="8" y="11" width="16" height="7" rx="3.5" fill="#d8dde4" />
      </g>
    `;
  }

  function renderWeatherGraph(elements, hours) {
    elements.weatherGraph.innerHTML = "";
    if (!hours.length) {
      return;
    }

    const width = 760;
    const height = 216;
    const padding = { top: 34, right: 18, bottom: 34, left: 28 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const temperatures = hours.map((hour) => hour.temperature);
    const precipitation = hours.map((hour) => hour.precipitation);
    const maxTemp = Math.max(...temperatures);
    const minTemp = Math.min(...temperatures);
    const maxPrecipitation = Math.max(...precipitation, 0.2);
    const xScale = (index) => padding.left + (chartWidth * index) / Math.max(hours.length - 1, 1);
    const yScale = (value) => {
      const normalized = (value - minTemp) / Math.max(maxTemp - minTemp, 1);
      return padding.top + chartHeight - (normalized * chartHeight * 0.82 + chartHeight * 0.08);
    };
    const createLinePath = (values) => values.map((value, index) => `${index === 0 ? "M" : "L"} ${xScale(index).toFixed(2)} ${yScale(value).toFixed(2)}`).join(" ");
    const precipitationScale = (value) => (value / maxPrecipitation) * (chartHeight * 0.36);
    const guideLines = Array.from({ length: 4 }, (_, index) => {
      const y = padding.top + (chartHeight * index) / 3;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 4" />`;
    }).join("");
    const hourLabels = hours.filter((_, index) => index % 4 === 0).map((hour, index) => `<text class="weather-hour-label" x="${xScale(index * 4)}" y="${height - 10}" text-anchor="middle">${hour.label}</text>`).join("");
    const weatherIcons = hours.filter((_, index) => index % 4 === 0).map((hour, index) => getWeatherIconSvg(hour.weatherCode, xScale(index * 4), 14)).join("");
    const tempLabels = [Math.round(maxTemp), Math.round((maxTemp + minTemp) / 2), Math.round(minTemp)].map((label, index) => {
      const y = padding.top + (chartHeight * index) / 2;
      return `<text class="weather-axis-label" x="4" y="${y + 4}">${label}\u00b0</text>`;
    }).join("");
    const precipitationBars = hours.map((hour, index) => {
      const x = xScale(index) - 5;
      const barHeight = precipitationScale(hour.precipitation);
      const y = padding.top + chartHeight - barHeight;
      return `<rect x="${x}" y="${y}" width="10" height="${Math.max(barHeight, 2)}" rx="4" fill="rgba(121, 199, 255, 0.5)" />`;
    }).join("");

    elements.weatherGraph.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="V\u00e6rgraf for de neste 24 timene">
        <defs>
          <linearGradient id="tempLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ffb703" />
            <stop offset="100%" stop-color="#ff6b6b" />
          </linearGradient>
        </defs>
        ${guideLines}
        ${weatherIcons}
        ${precipitationBars}
        <path d="${createLinePath(temperatures)}" fill="none" stroke="url(#tempLine)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${hourLabels}
        ${tempLabels}
        <text class="weather-legend" x="${padding.left}" y="${height - 2}">Temperatur</text>
        <text class="weather-legend" x="${padding.left + 96}" y="${height - 2}">Nedb\u00f8r</text>
      </svg>
    `;
  }

  function renderNews(elements, items) {
    elements.newsList.innerHTML = "";
    if (!items.length) {
      elements.newsStatus.textContent = "Fant ingen NRK-saker akkurat n\u00e5.";
      return;
    }

    elements.newsStatus.textContent = "";
    items.forEach((item) => {
      const fragment = elements.newsItemTemplate.content.cloneNode(true);
      const link = fragment.querySelector(".news-item");
      link.href = item.link;
      fragment.querySelector(".news-source").textContent = item.sourceLabel;
      fragment.querySelector(".news-title").textContent = item.title;
      elements.newsList.appendChild(fragment);
    });
  }

  function formatNewsTimestamp(dateText) {
    if (!dateText) {
      return "NRK Nyheter";
    }

    const publishedAt = new Date(dateText);
    if (Number.isNaN(publishedAt.getTime())) {
      return "NRK Nyheter";
    }

    return `NRK Nyheter \u00b7 ${publishedAt.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function formatUpdatedLabel(date, stale = false) {
    if (!date) {
      return "Oppdaterer...";
    }

    const prefix = stale ? "Sist lagret" : "Oppdatert";
    return `${prefix} ${date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })}`;
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
    renderNews,
    renderWeather,
    renderWeatherGraph,
    renderWeeklyMenu,
  };
}());
