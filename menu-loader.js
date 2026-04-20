(function initMenuLoader() {
  const WEEKDAYS = [
    { index: 1, label: "Mandag", aliases: ["1", "man", "mandag", "monday"] },
    { index: 2, label: "Tirsdag", aliases: ["2", "tir", "tirsdag", "tuesday"] },
    { index: 3, label: "Onsdag", aliases: ["3", "ons", "onsdag", "wednesday"] },
    { index: 4, label: "Torsdag", aliases: ["4", "tor", "torsdag", "thursday"] },
    { index: 5, label: "Fredag", aliases: ["5", "fre", "fredag", "friday"] },
  ];

  function getWeekdayMeta(value, fallbackIndex) {
    if (typeof value === "number" && value >= 1 && value <= 5) {
      return WEEKDAYS[value - 1];
    }

    const normalizedValue = String(value || "").trim().toLowerCase();
    const byAlias = WEEKDAYS.find((weekday) => weekday.aliases.includes(normalizedValue));

    if (byAlias) {
      return byAlias;
    }

    const safeFallback = Math.min(Math.max(Number(fallbackIndex) || 1, 1), 5);
    return WEEKDAYS[safeFallback - 1];
  }

  function normalizeAllergens(value) {
    const text = String(value || "").trim();

    if (!text) {
      return "";
    }

    if (/^allergier:/i.test(text)) {
      return text;
    }

    return `Allergier: ${text}`;
  }

  function normalizeMenuDay(day, fallbackIndex) {
    const weekday = getWeekdayMeta(day.dayIndex ?? day.dayLabel ?? day.day ?? day.weekday, fallbackIndex);

    return {
      dayIndex: weekday.index,
      dayLabel: weekday.label,
      title: String(day.title || day.dish || "").trim() || "Ikke satt",
      allergens: normalizeAllergens(day.allergens),
    };
  }

  function normalizeMenuData(rawMenu) {
    const fallbackMenu = window.JPC_CONFIG.defaultMenu;
    const days = Array.isArray(rawMenu?.days)
      ? rawMenu.days.map((day, index) => normalizeMenuDay(day, index + 1))
      : fallbackMenu.days;

    return {
      weekNumber: Number(rawMenu?.weekNumber) || fallbackMenu.weekNumber,
      days: [...days].sort((left, right) => left.dayIndex - right.dayIndex),
    };
  }

  function splitCsvLine(line) {
    const values = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const nextCharacter = line[index + 1];

      if (character === "\"") {
        if (insideQuotes && nextCharacter === "\"") {
          currentValue += "\"";
          index += 1;
          continue;
        }

        insideQuotes = !insideQuotes;
        continue;
      }

      if (character === ";" && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
        continue;
      }

      currentValue += character;
    }

    values.push(currentValue.trim());
    return values;
  }

  function parseMenuCsv(csvText) {
    const rows = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    if (!rows.length) {
      throw new Error("CSV is empty");
    }

    const [headerLine, ...dataLines] = rows;
    const headers = splitCsvLine(headerLine).map((header) => header.toLowerCase());
    const weekNumberIndex = headers.indexOf("week");
    const dayIndex = headers.indexOf("day");
    const titleIndex = headers.indexOf("title");
    const allergensIndex = headers.indexOf("allergens");

    if ([weekNumberIndex, dayIndex, titleIndex, allergensIndex].some((index) => index === -1)) {
      throw new Error("CSV is missing required headers");
    }

    const entries = dataLines.map((line) => {
      const values = splitCsvLine(line);
      return {
        weekNumber: values[weekNumberIndex],
        day: values[dayIndex],
        title: values[titleIndex],
        allergens: values[allergensIndex],
      };
    });

    if (!entries.length) {
      throw new Error("CSV has no data rows");
    }

    return normalizeMenuData({
      weekNumber: entries[0].weekNumber,
      days: entries,
    });
  }

  async function fetchMenuCsv() {
    const response = await fetch("menu.csv", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return parseMenuCsv(await response.text());
  }

  async function fetchMenuJson() {
    const response = await fetch("menu.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return normalizeMenuData(await response.json());
  }

  function loadEmbeddedMenu() {
    return normalizeMenuData(window.JPC_MENU || window.JPC_CONFIG.defaultMenu);
  }

  async function loadMenuFromSources() {
    if (window.location.protocol === "file:") {
      return {
        menu: loadEmbeddedMenu(),
        source: "embedded",
      };
    }

    try {
      return {
        menu: await fetchMenuCsv(),
        source: "csv",
      };
    } catch {
      try {
        return {
          menu: await fetchMenuJson(),
          source: "json",
        };
      } catch {
        return {
          menu: loadEmbeddedMenu(),
          source: "embedded",
        };
      }
    }
  }

  window.JPCMenuLoader = {
    loadMenuFromSources,
    loadEmbeddedMenu,
    normalizeMenuData,
  };
}());
