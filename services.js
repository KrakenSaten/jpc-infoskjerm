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

      const days = daily.time.slice(0, 2).map((dateText, index) => ({
        label: index === 0 ? "I dag" : "I morgen",
        summary: getWeatherSummary(daily.weather_code[index]),
        maxTemp: daily.temperature_2m_max[index],
        minTemp: daily.temperature_2m_min[index],
        precipitation: daily.precipitation_sum[index],
        wind: daily.wind_speed_10m_max[index],
        dateText,
      }));

      // FIKS: velg 24 timer FRA NAA, ikke fra midnatt
      const nowMs = Date.now();
      const hourlyAll = (hourly?.time || []).map((time, index) => ({
        time,
        timeMs: new Date(time).getTime(),
        label: new Date(time).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }).slice(0, 5),
        temperature: hourly.temperature_2m[index],
        precipitation: hourly.precipitation[index],
        weatherCode: hourly.weather_code[index],
      }));

      // Finn indeks for foerste time >= naa
      let startIdx = hourlyAll.findIndex(h => h.timeMs >= nowMs);
      if (startIdx < 0) startIdx = 0;
      const hourlyForecast = hourlyAll.slice(startIdx, startIdx + 24);

      return { days, hourlyForecast };
    });
  }

  async function fetchNewsData(feedUrl, formatNewsTimestamp) {
    return fetchWithRetry(async () => {
      const response = await fetch(feedUrl + "?t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const rssText = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(rssText, "application/xml");
      return Array.from(xml.querySelectorAll("channel > item"))
        .map(item => ({
          title: item.querySelector("title")?.textContent?.trim() || "Uten tittel",
          link: item.querySelector("link")?.textContent?.trim() || "https://www.nrk.no/",
          publishedAt: item.querySelector("pubDate")?.textContent?.trim() || "",
        }))
        .sort((a, b) => (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0))
        .slice(0, 6)
        .map(item => ({
          title: item.title,
          link: item.link,
          sourceLabel: formatNewsTimestamp(item.publishedAt),
        }));
    });
  }

  window.JPCServices = {
    fetchDeparturesData,
    fetchNewsData,
    fetchWeatherData,
  };
}());
