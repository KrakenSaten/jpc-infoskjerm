(function initServices() {
  function getCountdownLabel(departureTime) {
    const now = new Date();
    const diffInMinutes = Math.round((departureTime.getTime() - now.getTime()) / 60000);
    if (diffInMinutes <= 0) return "N\u00e5";
    if (diffInMinutes === 1) return "Om 1 min";
    return "Om " + diffInMinutes + " min";
  }

  function getDelayMinutes(expectedTime, aimedTime) {
    if (Number.isNaN(aimedTime.getTime())) return 0;
    return Math.max(0, Math.round((expectedTime.getTime() - aimedTime.getTime()) / 60000));
  }

  function getDepartureStatus(delayMinutes) {
    if (delayMinutes <= 0) return { label: "I rute", delayed: false };
    return { label: "Forsinket " + delayMinutes + " min", delayed: true };
  }

  function formatPlatform(call) {
    const quay = call.quay;
    const bits = [quay?.publicCode, quay?.description].filter(Boolean);
    if (!bits.length) return "Plattforminformasjon kommer";
    return "Spor " + bits.join(" - ");
  }

  function getDirectionLabel(call) {
    const publicCode = String(call.quay?.publicCode || "").trim();
    const description = call.quay?.description?.toLowerCase() || "";
    const destination = call.destinationDisplay?.frontText?.toLowerCase() || "";
    if (publicCode === "1") return "Mot Mortensrud";
    if (publicCode === "2") return "Mot sentrum";
    if (description.includes("mortensrud") || destination.includes("mortensrud")) return "Mot Mortensrud";
    if (description.includes("sentrum") || destination.includes("stortinget") || destination.includes("kols")) return "Mot sentrum";
    return "Andre avganger";
  }

  function getSituationText(call) {
    const situations = call.situations || [];
    for (const situation of situations) {
      const summaries = situation.summary || [];
      const preferred = summaries.find(s => String(s.language || "").startsWith("no")) || summaries[0];
      const value = preferred?.value?.trim();
      if (value) return value;
    }
    return "";
  }

  function normalizeDeparture(call) {
    const line = call.serviceJourney?.journeyPattern?.line;
    const transportMode = line?.transportMode?.toLowerCase?.();
    const metroLineCodes = ["1", "2", "3", "4", "5"];

    if (!line) return null;
    if (transportMode !== "metro" && !metroLineCodes.includes(String(line.publicCode || ""))) return null;

    const expectedTime = new Date(call.expectedDepartureTime || call.aimedDepartureTime);
    const aimedTime = new Date(call.aimedDepartureTime || call.expectedDepartureTime);
    if (Number.isNaN(expectedTime.getTime())) return null;

    const delayMinutes = getDelayMinutes(expectedTime, aimedTime);
    const status = getDepartureStatus(delayMinutes);

    return {
      line: line.publicCode || line.name || "T",
      directionLabel: getDirectionLabel(call),
      destination: call.destinationDisplay?.frontText || "Ukjent retning",
      platform: formatPlatform(call),
      timeLabel: expectedTime.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }),
      countdownLabel: getCountdownLabel(expectedTime),
      statusLabel: status.label,
      isDelayed: status.delayed,
      situation: getSituationText(call),
      timestamp: expectedTime.getTime(),
    };
  }

  // Retry med eksponentiell backoff — hjelper mot forbigaaende nettverksfeil
  async function fetchWithRetry(fetchFn, { retries = 2, baseDelayMs = 500 } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetchFn();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  }

  async function fetchDeparturesData(stopId) {
    return fetchWithRetry(async () => {
      const response = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ET-Client-Name": "jpc-kontorinfo",
        },
        body: JSON.stringify({
          query: `
            query GetDepartures($stopId: String!) {
              stopPlace(id: $stopId) {
                estimatedCalls(numberOfDepartures: 16) {
                  aimedDepartureTime
                  expectedDepartureTime
                  destinationDisplay { frontText }
                  quay { publicCode description }
                  situations { summary { value language } }
                  serviceJourney {
                    journeyPattern {
                      line { publicCode name transportMode }
                    }
                  }
                }
              }
            }
          `,
          variables: { stopId },
        }),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      const calls = payload?.data?.stopPlace?.estimatedCalls || [];
      return calls
        .map(normalizeDeparture)
        .filter(Boolean)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, 8);
    });
  }

  async function fetchWeatherData(coords, getWeatherSummary) {
    return fetchWithRetry(async () => {
      const query = new URLSearchParams({
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
        hourly: "temperature_2m,precipitation,weather_code",
        current: "temperature_2m,weather_code,wind_speed_10m,precipitation",
        timezone: "Europe/Oslo",
        forecast_days: "3",
        wind_speed_unit: "ms",
      });
      const response = await fetch("https://api.open-meteo.com/v1/forecast?" + query.toString());
      if (!response.ok) throw new Error("HTTP " + response.status);

      const payload = await response.json();
      const daily  = payload?.daily;
      const hourly = payload?.hourly;
      if (!daily?.time?.length) throw new Error("Mangler daglig prognose");

      // Open-Meteos daily.weather_code er dagens MEST ALVORLIGE kode.
      // En eneste time med yr gjoer at hele dagen vises som regn.
      // Bruk derfor den vanligste koden paa dagtid (08-18) i stedet.
      const dominantDaytimeCode = (dateText) => {
        const counts = {};
        (hourly?.time || []).forEach((time, i) => {
          if (!time.startsWith(dateText)) return;
          const hr = parseInt(time.slice(11, 13), 10);
          if (hr < 8 || hr > 18) return;
          const code = hourly.weather_code[i];
          counts[code] = (counts[code] || 0) + 1;
        });
        let best = null, bestCount = 0;
        for (const code in counts) {
          if (counts[code] > bestCount) { best = Number(code); bestCount = counts[code]; }
        }
        return best;
      };

      const days = daily.time.slice(0, 2).map((dateText, index) => ({
        label: index === 0 ? "I dag" : "I morgen",
        weatherCode: dominantDaytimeCode(dateText) ?? daily.weather_code[index],
        summary: getWeatherSummary(dominantDaytimeCode(dateText) ?? daily.weather_code[index]),
        maxTemp: daily.temperature_2m_max[index],
        minTemp: daily.temperature_2m_min[index],
        precipitation: daily.precipitation_sum[index],
        wind: daily.wind_speed_10m_max[index],
        dateText,
      }));

      const current = payload?.current ? {
        temperature: payload.current.temperature_2m,
        weatherCode: payload.current.weather_code,
        wind: payload.current.wind_speed_10m,
        precipitation: payload.current.precipitation,
      } : null;

      // FIKS: velg 24 timer FRA NAA, ikke fra midnatt
      const nowMs = Date.now();
      const hourlyAll = (hourly?.time || []).map((time, index) => ({
        time,
        timeMs: new Date(time).getTime(),
        temperature: hourly.temperature_2m[index],
        precipitation: hourly.precipitation[index],
        weatherCode: hourly.weather_code[index],
      }));

      // Finn indeks for foerste time >= naa
      let startIdx = hourlyAll.findIndex(h => h.timeMs >= nowMs);
      if (startIdx < 0) startIdx = 0;
      const hourlyForecast = hourlyAll.slice(startIdx, startIdx + 24);

      return { days, hourlyForecast, current };
    });
  }

  function htmlToText(html) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function parseRssItems(rssText) {
    const xml = new DOMParser().parseFromString(rssText, "application/xml");
    const nodes = Array.from(xml.querySelectorAll("channel > item"));
    if (nodes.length) console.debug("RSS: foerste item (raadata):", nodes[0].outerHTML.slice(0, 3000));
    const items = nodes.map(item => {
      const encoded = item.getElementsByTagNameNS("http://purl.org/rss/1.0/modules/content/", "encoded")[0];
      return {
        title: item.querySelector("title")?.textContent?.trim() || "Uten tittel",
        link: item.querySelector("link")?.textContent?.trim() || "",
        publishedAt: item.querySelector("pubDate")?.textContent?.trim() || "",
        categories: Array.from(item.querySelectorAll("category")).map(c => c.textContent.trim()).filter(Boolean),
        text: [
          htmlToText(item.querySelector("description")?.textContent || ""),
          htmlToText(encoded?.textContent || ""),
        ].join(" "),
      };
    });
    if (!items.length) throw new Error("Tom eller uleselig feed");
    return items;
  }

  // Direkte RSS-henting fra nettleseren.
  async function fetchRssDirect(feedUrl) {
    const response = await fetch(feedUrl + "?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return parseRssItems(await response.text());
  }

  // Reserver for feeder uten CORS-header. Proevd i rekkefoelge til en lykkes.
  const RSS_PROXIES = [
    {
      name: "allorigins",
      url: feedUrl => "https://api.allorigins.win/raw?url=" + encodeURIComponent(feedUrl + "?t=" + Date.now()),
      parse: async response => parseRssItems(await response.text()),
    },
    {
      name: "codetabs",
      url: feedUrl => "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(feedUrl),
      parse: async response => parseRssItems(await response.text()),
    },
    {
      name: "rss2json",
      url: feedUrl => "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl),
      parse: async response => {
        const data = await response.json();
        if (data.status !== "ok" || !Array.isArray(data.items) || !data.items.length) {
          throw new Error("rss2json: " + (data.message || data.status));
        }
        return data.items.map(item => ({
          title: (item.title || "Uten tittel").trim(),
          link: item.link || "",
          // rss2json gir "YYYY-MM-DD HH:MM:SS" i UTC
          publishedAt: item.pubDate ? item.pubDate.replace(" ", "T") + "Z" : "",
          categories: Array.isArray(item.categories) ? item.categories.map(String) : [],
          text: [htmlToText(item.description), htmlToText(item.content)].join(" "),
        }));
      },
    },
  ];

  async function fetchRssViaProxy(feedUrl) {
    for (const proxy of RSS_PROXIES) {
      try {
        const response = await fetch(proxy.url(feedUrl), { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const items = await proxy.parse(response);
        console.info("RSS hentet via " + proxy.name + ":", feedUrl);
        return items;
      } catch (err) {
        console.warn("RSS-reserve " + proxy.name + " feilet:", err && err.message ? err.message : err);
      }
    }
    throw new Error("Alle RSS-reserver feilet for " + feedUrl);
  }

  // CVE-numre fra tittel, kategorier og tekst. Unike, i rekkefoelge.
  function extractCves(item) {
    const hay = [item.title, ...(item.categories || []), item.text || ""].join(" ");
    const found = hay.match(/CVE-\d{4}-\d{4,}/gi) || [];
    return [...new Set(found.map(c => c.toUpperCase()))].slice(0, 3);
  }

  // Anbefalt handling (fargetaggen paa Zero Wire-kortene).
  const ZERO_WIRE_ACTIONS = [
    { key: "patch", label: "Patch", re: /^patch(\s+now)?$/i, textRe: /recommended action:?\s*patch\b/i },
    { key: "review", label: "Review settings", re: /^review settings$/i, textRe: /review settings/i },
    { key: "assess", label: "Assess exposure", re: /^assess exposure$/i, textRe: /assess exposure/i },
    { key: "mitigate", label: "Mitigate", re: /^mitigate$/i, textRe: /recommended action:?\s*mitigate\b/i },
    { key: "monitor", label: "Monitor", re: /^monitor$/i, textRe: /recommended action:?\s*monitor\b/i },
  ];

  function extractAction(item) {
    for (const a of ZERO_WIRE_ACTIONS) {
      if ((item.categories || []).some(c => a.re.test(c))) return { key: a.key, label: a.label };
    }
    for (const a of ZERO_WIRE_ACTIONS) {
      if (a.textRe.test(item.text || "")) return { key: a.key, label: a.label };
    }
    return null;
  }

  // CVSS-score fra NVD. Returnerer { score, severity } eller null.
  async function fetchCvss(cve) {
    const url = "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=" + encodeURIComponent(cve);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("NVD HTTP " + response.status);
    const data = await response.json();
    const metrics = data?.vulnerabilities?.[0]?.cve?.metrics || {};
    const list = metrics.cvssMetricV40 || metrics.cvssMetricV31 || metrics.cvssMetricV30 || [];
    const primary = list.find(m => m.type === "Primary") || list[0];
    const d = primary?.cvssData;
    if (!d || typeof d.baseScore !== "number") return null;
    return { score: d.baseScore, severity: d.baseSeverity || primary.baseSeverity || "" };
  }

  async function fetchNewsData(feedUrl, formatNewsTimestamp, maxItems = 10, { proxyFallback = false } = {}) {
    return fetchWithRetry(async () => {
      let items;
      try {
        items = await fetchRssDirect(feedUrl);
      } catch (directError) {
        if (!proxyFallback) throw directError;
        console.warn("Direkte RSS-henting feilet (CORS), prøver reserver.", feedUrl);
        items = await fetchRssViaProxy(feedUrl);
      }
      return items
        .sort((a, b) => (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0))
        .slice(0, maxItems)
        .map(item => ({
          title: item.title,
          link: item.link,
          sourceLabel: formatNewsTimestamp(item.publishedAt),
          cves: extractCves(item),
          action: extractAction(item),
        }));
    });
  }

  window.JPCServices = {
    fetchDeparturesData,
    fetchNewsData,
    fetchCvss,
    fetchWeatherData,
  };
}());
