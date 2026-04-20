(function initMenuLoader() {
  const WEEKDAYS = [
    { index: 1, label: "Mandag",  aliases: ["1", "man", "mandag",  "monday"] },
    { index: 2, label: "Tirsdag", aliases: ["2", "tir", "tirsdag", "tuesday"] },
    { index: 3, label: "Onsdag",  aliases: ["3", "ons", "onsdag",  "wednesday"] },
    { index: 4, label: "Torsdag", aliases: ["4", "tor", "torsdag", "thursday"] },
    { index: 5, label: "Fredag",  aliases: ["5", "fre", "fredag",  "friday"] },
  ];

  function getIsoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getWeekdayMeta(value, fallbackIndex) {
    if (typeof value === "number" && value >= 1 && value <= 5) {
      return WEEKDAYS[value - 1];
    }
    const normalized = String(value || "").trim().toLowerCase();
    const byAlias = WEEKDAYS.find(w => w.aliases.includes(normalized));
    if (byAlias) return byAlias;
    const safe = Math.min(Math.max(Number(fallbackIndex) || 1, 1), 5);
    return WEEKDAYS[safe - 1];
  }

  function normalizeAllergens(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^allergier:/i.test(text)) return text;
    return "Allergier: " + text;
  }

  function normalizeMenuDay(day, fallbackIndex) {
    const weekday = getWeekdayMeta(
      day.dayIndex ?? day.dayLabel ?? day.day ?? day.weekday,
      fallbackIndex
    );
    return {
      dayIndex: weekday.index,
      dayLabel: weekday.label,
      title: String(day.title || day.dish || "").trim() || "Ikke satt",
      allergens: normalizeAllergens(day.allergens),
    };
  }

  function normalizeMenuData(rawMenu) {
    if (!rawMenu || !Array.isArray(rawMenu.days) || !rawMenu.days.length) {
      throw new Error("Menu data er tom eller mangler days");
    }
    const weekNumber = Number(rawMenu.weekNumber) || 0;
    if (!weekNumber) {
      throw new Error("Menu mangler weekNumber");
    }
    return {
      weekNumber,
      days: rawMenu.days
        .map((day, idx) => normalizeMenuDay(day, idx + 1))
        .sort((a, b) => a.dayIndex - b.dayIndex),
    };
  }

  // Strip BOM + trim whitespace foran CSV
  function stripBom(text) {
    if (!text) return text;
    return text.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  }

  function splitCsvLine(line) {
    const values = [];
    let current = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      const n = line[i + 1];
      if (c === '"') {
        if (insideQuotes && n === '"') { current += '"'; i += 1; continue; }
        insideQuotes = !insideQuotes;
        continue;
      }
      if (c === ";" && !insideQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }
      current += c;
    }
    values.push(current.trim());
    return values;
  }

  function parseMenuCsv(csvText) {
    const cleaned = stripBom(csvText);
    const rows = cleaned
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"));
    if (!rows.length) throw new Error("CSV er tom");

    const [headerLine, ...dataLines] = rows;
    const headers = splitCsvLine(headerLine).map(h => h.toLowerCase());
    const idxWeek      = headers.indexOf("week");
    const idxDay       = headers.indexOf("day");
    const idxTitle     = headers.indexOf("title");
    const idxAllergens = headers.indexOf("allergens");

    if ([idxWeek, idxDay, idxTitle, idxAllergens].some(i => i === -1)) {
      throw new Error("CSV mangler noedvendige kolonner");
    }
    if (!dataLines.length) throw new Error("CSV har ingen data");

    const entries = dataLines.map(line => {
      const v = splitCsvLine(line);
      return {
        weekNumber: v[idxWeek],
        day: v[idxDay],
        title: v[idxTitle],
        allergens: v[idxAllergens],
      };
    });

    return normalizeMenuData({
      weekNumber: entries[0].weekNumber,
      days: entries,
    });
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchFromGithub() {
    const url = window.JPC_CONFIG.menuGithubUrl + "?t=" + Date.now();
    const response = await fetchWithTimeout(url, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return parseMenuCsv(await response.text());
  }

  async function fetchLocalCsv() {
    const response = await fetch("menu.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return parseMenuCsv(await response.text());
  }

  async function fetchLocalJson() {
    const response = await fetch("menu.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return normalizeMenuData(await response.json());
  }

  // Last meny i prioritert rekkefolge. Kaster feil om ingen kilde har meny
  // for gjeldende uke (brukes for aa vise tydelig feilmelding paa skjermen).
  async function loadMenuFromSources() {
    const currentWeek = getIsoWeek(new Date());
    const attempts = [];

    // Online: forsoek GitHub foerst, saa lokal server
    if (window.location.protocol !== "file:") {
      attempts.push(
        { name: "github", fn: fetchFromGithub },
        { name: "csv",    fn: fetchLocalCsv },
        { name: "json",   fn: fetchLocalJson },
      );
    } else {
      // Kjorer fra fil:// - fetch til andre filer er blokkert av nettleser
      throw new Error("file://-protokoll er ikke stottet. Start preview-server.");
    }

    let lastError = null;
    for (const attempt of attempts) {
      try {
        const menu = await attempt.fn();
        return {
          menu,
          source: attempt.name,
          isCurrentWeek: menu.weekNumber === currentWeek,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Ingen menykilde tilgjengelig");
  }

  window.JPCMenuLoader = {
    loadMenuFromSources,
    normalizeMenuData,
    getIsoWeek,
  };
}());
