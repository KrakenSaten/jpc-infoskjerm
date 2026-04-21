(function initRenderers() {
  const WEEKDAYS_SHORT = ["MA", "TI", "ON", "TO", "FR", "L\u00d8", "S\u00d8"];
  const WEEKDAYS_LONG = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "L\u00f8rdag", "S\u00f8ndag"];
  const MONTHS = ["januar", "februar", "mars", "april", "mai", "juni",
                  "juli", "august", "september", "oktober", "november", "desember"];

  function pad2(n) { return String(n).padStart(2, "0"); }

  function getIsoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }


  /* ---------- WEATHER ICONS ---------- */

  function weatherCodeToCondition(code) {
    if (code === 0 || code === 1) return "clear";
    if (code === 2) return "pcloudy";
    if (code === 3 || code === 45 || code === 48) return "cloudy";
    if (code >= 51 && code <= 67) return "rain";
    if (code >= 80 && code <= 82) return "rain";
    if (code >= 95) return "rain";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 85 && code <= 86) return "snow";
    return "cloudy";
  }

  function wxIconSvg(cond, hour) {
    var night = (hour != null) && (hour >= 20 || hour < 6);
    var sun = night
      ? '<circle cx="9" cy="9" r="5" fill="#e8d98a" stroke="#c9b770" stroke-width=".6"/><circle cx="11" cy="7" r="4" fill="var(--paper)"/>'
      : '<g><circle cx="9" cy="9" r="3.6" fill="#f5b733"/>' +
        [0,45,90,135,180,225,270,315].map(function(a){
          var rad = a * Math.PI / 180;
          var x1 = 9 + Math.cos(rad) * 5, y1 = 9 + Math.sin(rad) * 5;
          var x2 = 9 + Math.cos(rad) * 7, y2 = 9 + Math.sin(rad) * 7;
          return '<line x1="'+x1.toFixed(2)+'" y1="'+y1.toFixed(2)+'" x2="'+x2.toFixed(2)+'" y2="'+y2.toFixed(2)+'" stroke="#f5b733" stroke-width="1.4" stroke-linecap="round"/>';
        }).join('') + '</g>';
    var cloud = '<path d="M5 12 Q3 12 3 10 Q3 8 5 8 Q5 6 8 6 Q11 6 12 8 Q14 8 14 10 Q14 12 12 12 Z" fill="#cfd3d9" stroke="#8c939e" stroke-width=".6"/>';
    var rain = '<g stroke="#4aa3d9" stroke-width="1.1" stroke-linecap="round"><line x1="6" y1="13" x2="5" y2="16"/><line x1="9" y1="13" x2="8" y2="16"/><line x1="12" y1="13" x2="11" y2="16"/></g>';
    var snow = cloud + '<g fill="#fff" stroke="#8c939e" stroke-width=".4"><circle cx="6" cy="14.5" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="12" cy="14.5" r="1"/></g>';
    if (cond === "clear") return sun;
    if (cond === "pcloudy") return '<g transform="translate(-2,-1) scale(.9)">' + sun + '</g><g transform="translate(3,4)">' + cloud + '</g>';
    if (cond === "cloudy") return cloud;
    if (cond === "rain") return cloud + rain;
    if (cond === "snow") return snow;
    return cloud;
  }

  /* ---------- CLOCK ---------- */

  function formatClock(elements) {
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7; // 0=Mon
    elements.clock.textContent = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
    elements.date.textContent = `${WEEKDAYS_LONG[dayIdx]} ${now.getDate()}. ${MONTHS[now.getMonth()]} \u00b7 uke ${getIsoWeek(now)}`;
  }

  /* ---------- COUNTDOWN ---------- */

  function renderCountdown(elements, targetDate) {
    let diff = Math.max(0, targetDate.getTime() - Date.now());
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
    const m = Math.floor(diff / 60000);    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    elements.cdDays.textContent = pad2(d);
    elements.cdHours.textContent = pad2(h);
    elements.cdMins.textContent = pad2(m);
    elements.cdSecs.textContent = pad2(s);
  }

  /* ---------- LUNSJ ---------- */

  function getMenuForDay(menu, dayIndex) {
    return menu.days.find(item => item.dayIndex === dayIndex) || null;
  }

  function getLunchForDate(menu, date) {
    const jsDay = date.getDay();
    if (jsDay === 0 || jsDay === 6) return null; // ingen lunsj i helg
    return getMenuForDay(menu, jsDay);
  }

  function getLunchStatus(now) {
    const h = now.getHours();
    const m = now.getMinutes();
    const dow = now.getDay();
    if (dow === 0 || dow === 6) return "Stengt i helg";
    if (h < 10 || (h === 10 && m < 30)) return "Servering 11:30";
    if ((h === 10 && m >= 30) || h === 11 || h === 12) return "Servering n\u00e5";
    if (h === 13) return "Servering ferdig";
    if (h >= 14 && h < 17) return "Ferdig for i dag";
    return "";
  }

  function splitDish(title) {
    // Prototype viser dish som hovedtittel + beskrivelse i italic.
    // Hvis tittel inneholder "med" eller "m/", del der.
    const str = String(title || "").trim();
    if (!str) return { main: "", sub: "" };

    // Se etter " med " eller " m/ "
    const matchers = [" med ", " m/ ", " m\u00b2 "];
    for (const sep of matchers) {
      const idx = str.toLowerCase().indexOf(sep);
      if (idx > 0 && idx < str.length - 4) {
        return {
          main: str.substring(0, idx).trim(),
          sub: str.substring(idx + 1).trim(),
        };
      }
    }
    return { main: str, sub: "" };
  }

  function renderLunch(elements, menu, isCurrentWeek) {
    elements.lunsjCard.classList.remove("error");

    if (!isCurrentWeek) {
      renderLunchError(elements);
      return;
    }

    const today = new Date();
    const todayEntry = getLunchForDate(menu, today);
    elements.lunsjStatus.textContent = getLunchStatus(today);

    if (!todayEntry) {
      elements.lunsjHeading.textContent = "Lunsj";
      elements.lunsjDish.textContent = "Ingen servering i dag";
      elements.lunsjSub.textContent = "";
      elements.lunsjAller.textContent = "";
    } else {
      elements.lunsjHeading.textContent = "Lunsj i dag";
      const { main, sub } = splitDish(todayEntry.title);
      elements.lunsjDish.textContent = main || todayEntry.title;
      elements.lunsjSub.textContent = sub;
      elements.lunsjAller.textContent = todayEntry.allergens || "";
    }

    // Neste dag: i morgen for man-tor, mandag for fredag, ellers mandag
    const tomorrow = new Date(today);
    const dow = today.getDay();
    if (dow >= 1 && dow <= 4) {
      tomorrow.setDate(today.getDate() + 1);
    } else if (dow === 5) {
      tomorrow.setDate(today.getDate() + 3);
    } else if (dow === 6) {
      tomorrow.setDate(today.getDate() + 2);
    } else {
      tomorrow.setDate(today.getDate() + 1);
    }

    const nextEntry = getLunchForDate(menu, tomorrow);
    const tomorrowDayIdx = (tomorrow.getDay() + 6) % 7;
    const lblText = (dow >= 1 && dow <= 4) ? "I morgen" : "Neste arbeidsdag";
    elements.nextdayLbl.textContent = `${lblText} \u00b7 ${WEEKDAYS_LONG[tomorrowDayIdx].toLowerCase()}`;
    elements.nextdayDish.textContent = nextEntry ? nextEntry.title : "Ikke satt";
  }

  function renderLunchError(elements) {
    elements.lunsjCard.classList.add("error");
    elements.lunsjHeading.textContent = "Lunsj";
    elements.lunsjStatus.textContent = "";
    elements.lunsjDish.textContent = "Meny mangler for denne uken";
    elements.lunsjSub.textContent = "Kontakt ansvarlig for infoskjerm.";
    elements.lunsjAller.textContent = "";
    elements.nextdayLbl.textContent = "";
    elements.nextdayDish.textContent = "";
  }

  /* ---------- T-BANE ---------- */

  function renderDepartures(elements, departures) {
    elements.tbaneBody.innerHTML = "";

    if (!departures.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="3" class="tbane-empty">Ingen avganger akkurat n\u00e5</td>';
      elements.tbaneBody.appendChild(tr);
      return;
    }

    // Vis de neste 5
    const now = Date.now();
    departures.slice(0, 5).forEach(dep => {
      const tr = document.createElement("tr");
      const minsUntil = Math.max(0, Math.round((dep.timestamp - now) / 60000));

      if (minsUntil <= 2) tr.classList.add("soon");
      if (dep.isDelayed) tr.classList.add("delayed");

      const tdBadge = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "line-badge";
      badge.textContent = dep.line;
      tdBadge.appendChild(badge);

      const tdDir = document.createElement("td");
      const dir = document.createElement("span");
      dir.className = "dir";
      dir.textContent = dep.directionLabel.replace(/^Mot\s+/i, "") || dep.destination;
      tdDir.appendChild(dir);

      const tdMin = document.createElement("td");
      tdMin.className = "min";
      if (minsUntil === 0) {
        tdMin.textContent = "N\u00e5";
      } else if (minsUntil === 1) {
        tdMin.textContent = "1 min";
      } else if (minsUntil < 20) {
        tdMin.textContent = minsUntil + " min";
      } else {
        tdMin.textContent = dep.timeLabel;
      }

      tr.appendChild(tdBadge);
      tr.appendChild(tdDir);
      tr.appendChild(tdMin);
      elements.tbaneBody.appendChild(tr);
    });
  }

  /* ---------- VÃR (siden + graf) ---------- */

  function weatherCodeText(code) {
    const s = {
      0: "Klart", 1: "For det meste klart", 2: "Delvis skyet", 3: "Overskyet",
      45: "T\u00e5ke", 48: "T\u00e5ke med rim",
      51: "Lett yr", 53: "Yr", 55: "Kraftig yr",
      61: "Lett regn", 63: "Regn", 65: "Kraftig regn",
      66: "Lett underkj\u00f8lt regn", 67: "Underkj\u00f8lt regn",
      71: "Lett sn\u00f8", 73: "Sn\u00f8", 75: "Kraftig sn\u00f8", 77: "Sn\u00f8korn",
      80: "Byger", 81: "Kraftige byger", 82: "S\u00e6rt kraftige byger",
      85: "Sn\u00f8byger", 86: "Kraftige sn\u00f8byger",
      95: "Torden", 96: "Torden med hagl", 99: "Kraftig torden med hagl",
    };
    return s[code] || "Ukjent v\u00e6r";
  }

  function weatherDescription(day) {
    const base = weatherCodeText(day.weatherCode ?? 3);
    const wind = Math.round(day.wind || 0);
    if (wind < 2) return base + ".";
    if (wind < 5) return base + ", lett bris.";
    if (wind < 10) return base + ", frisk bris.";
    return base + ", kraftig vind.";
  }

  function renderWeather(elements, days) {
    if (!days || !days.length) return;
    const today = days[0];
    elements.weatherTemp.textContent = Math.round(today.maxTemp) + "\u00b0";
    elements.weatherDesc.firstChild && (elements.weatherDesc.firstChild.textContent = weatherDescription(today));
    elements.weatherMeta.textContent = `Vind ${Math.round(today.wind)} m/s \u00b7 ${today.precipitation.toFixed(1)} mm nedb\u00f8r`;

    if (days[1]) {
      const tomorrow = days[1];
      elements.weatherTomorrow.textContent = `${Math.round(tomorrow.maxTemp)}\u00b0 \u00b7 ${weatherCodeText(tomorrow.weatherCode ?? 3).toLowerCase()}`;

    // Render weather icons
    var nowIcon = document.getElementById("now-icon");
    if (nowIcon) {
      var cond = weatherCodeToCondition(today.weatherCode);
      var hour = new Date().getHours();
      nowIcon.innerHTML = '<svg viewBox="0 0 18 18">' + wxIconSvg(cond, hour) + '</svg>';
    }
    var tmrwIcon = document.getElementById("tmrw-icon");
    if (tmrwIcon && days[1]) {
      var tmrwCond = weatherCodeToCondition(days[1].weatherCode);
      tmrwIcon.innerHTML = '<svg viewBox="0 0 18 18">' + wxIconSvg(tmrwCond, 12) + '</svg>';
    }
    }
  }

  function renderWeatherGraph(elements, hourlyForecast) {
    if (!hourlyForecast || !hourlyForecast.length) return;

    const W = 320, H = 180;
    const padL = 22, padR = 20, padT = 18, padB = 28;
    const iw = W - padL - padR;
    const tempH = (H - padT - padB) * 0.65;
    const rainH = (H - padT - padB) * 0.25;
    const rainY0 = padT + tempH + (H - padT - padB) * 0.05;
    const rainY1 = rainY0 + rainH;

    const points = hourlyForecast.slice(0, 25).map(h => {
      const d = new Date(h.time);
      return {
        hour: d.getHours(),
        date: d,
        t: h.temperature,
        r: h.precipitation || 0,
        wc: h.weatherCode,
      };
    });

    if (points.length < 2) return;

    const tvals = points.map(p => p.t);
    const rawMin = Math.min(...tvals);
    const rawMax = Math.max(...tvals);
    const tmin = Math.floor(Math.min(rawMin, 0) / 3) * 3;
    const tmax = Math.ceil(rawMax / 3) * 3;
    const tspan = Math.max(1, tmax - tmin);
    const tempY0 = padT;
    const tempY1 = padT + tempH;
    const tY = (t) => tempY1 - ((t - tmin) / tspan) * tempH;

    const rmaxRaw = Math.max(...points.map(p => p.r));
    const rmax = Math.max(2, Math.ceil(rmaxRaw));
    const rY = (r) => rainY1 - (r / rmax) * rainH;

    const xs = points.map((_, i) => padL + (i / (points.length - 1)) * iw);

    const NS = "http://www.w3.org/2000/svg";
    const setChildren = (id, nodes) => {
      const g = document.getElementById(id);
      if (!g) return;
      g.innerHTML = "";
      nodes.forEach(n => g.appendChild(n));
    };
    const svgEl = (name, attrs, text) => {
      const n = document.createElementNS(NS, name);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (text != null) n.textContent = text;
      return n;
    };

    // Natt-bÃ¥nd (20:00â06:00)
    const nightNodes = [];
    let start = null;
    for (let i = 0; i < points.length; i++) {
      const isNight = points[i].hour >= 20 || points[i].hour < 6;
      if (isNight && start === null) start = i;
      if ((!isNight || i === points.length - 1) && start !== null) {
        const endI = isNight ? i : i - 1;
        const x0 = xs[start];
        const x1 = xs[endI];
        nightNodes.push(svgEl("rect", {
          x: x0, y: padT,
          width: Math.max(1, x1 - x0),
          height: tempH + rainH + (rainY0 - (padT + tempH)),
          fill: "currentColor", "fill-opacity": "0.05",
        }));
        start = null;
      }
    }
    setChildren("wx-night", nightNodes);

    // Dag-separator ved midnatt + dag-etiketter
    const dayNodes = [];
    const dayLabelNodes = [];
    const firstMidnight = points.findIndex((p, i) => i > 0 && p.hour === 0);
    const todayStart = xs[0];
    const formatDayLabel = (date) => {
      const idx = (date.getDay() + 6) % 7;
      return `${WEEKDAYS_SHORT[idx]} ${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
    };

    if (firstMidnight > 0) {
      const sepX = xs[firstMidnight];
      dayNodes.push(svgEl("line", {
        x1: sepX, x2: sepX,
        y1: padT, y2: rainY1,
        stroke: "currentColor", "stroke-opacity": "0.35",
        "stroke-dasharray": "3 3", "stroke-width": "1",
      }));
      dayLabelNodes.push(svgEl("text", {
        x: (todayStart + sepX) / 2, y: padT - 6,
        "text-anchor": "middle",
      }, formatDayLabel(points[0].date)));
      dayLabelNodes.push(svgEl("text", {
        x: (sepX + xs[xs.length - 1]) / 2, y: padT - 6,
        "text-anchor": "middle",
      }, formatDayLabel(points[firstMidnight].date)));
    } else {
      dayLabelNodes.push(svgEl("text", {
        x: (todayStart + xs[xs.length - 1]) / 2, y: padT - 6,
        "text-anchor": "middle",
      }, formatDayLabel(points[0].date)));
    }
    setChildren("wx-daysep", dayNodes);
    setChildren("wx-days", dayLabelNodes);

    // Horisontalt rutenett for temp (hver 3Â°)
    const gridNodes = [];
    const yLeftNodes = [];
    for (let t = tmin; t <= tmax; t += 3) {
      const y = tY(t);
      gridNodes.push(svgEl("line", {
        x1: padL, x2: W - padR, y1: y, y2: y,
        stroke: "currentColor", "stroke-opacity": t === 0 ? "0" : "0.08",
        "stroke-width": "1",
      }));
      yLeftNodes.push(svgEl("text", {
        x: padL - 4, y: y + 3,
        "text-anchor": "end",
      }, t + "\u00b0"));
    }
    setChildren("wx-tgrid", gridNodes);
    setChildren("wx-yleft", yLeftNodes);

    // Nullpunkt
    const zero = document.getElementById("wx-zero");
    if (zero) {
      if (tmin <= 0 && tmax >= 0) {
        zero.setAttribute("x1", padL);
        zero.setAttribute("x2", W - padR);
        zero.setAttribute("y1", tY(0));
        zero.setAttribute("y2", tY(0));
      } else {
        zero.setAttribute("x1", -10);
        zero.setAttribute("x2", -10);
      }
    }

    // Y-akse hÃ¸yre (nedbÃ¸r)
    const yRightNodes = [];
    const rStep = Math.max(1, Math.round(rmax / 2));
    for (let r = 0; r <= rmax; r += rStep) {
      const y = rY(r);
      yRightNodes.push(svgEl("text", {
        x: W - padR + 4, y: y + 3,
        "text-anchor": "start",
      }, r + ""));
    }
    yRightNodes.push(svgEl("text", {
      x: W - padR + 4, y: rainY0 - 4,
      "text-anchor": "start", "font-weight": "500",
    }, "mm"));
    setChildren("wx-yright", yRightNodes);

    // Jevn temperaturkurve (catmull-rom â kubisk bezier)
    const pts = xs.map((x, i) => [x, tY(points[i].t)]);
    let tpath = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      tpath += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
    }
    const lineEl = document.getElementById("wx-temp-line");
    if (lineEl) lineEl.setAttribute("d", tpath);

    const areaPath = `${tpath} L ${pts[pts.length - 1][0]} ${tempY1} L ${pts[0][0]} ${tempY1} Z`;
    const areaEl = document.getElementById("wx-temp-area");
    if (areaEl) areaEl.setAttribute("d", areaPath);

    // Regnareal
    const rpts = xs.map((x, i) => [x, rY(points[i].r)]);
    let rpath = `M ${rpts[0][0]} ${rainY1}`;
    rpts.forEach(p => { rpath += ` L ${p[0]} ${p[1]}`; });
    rpath += ` L ${rpts[rpts.length - 1][0]} ${rainY1} Z`;
    const rainEl = document.getElementById("wx-rain");
    if (rainEl) rainEl.setAttribute("d", rpath);

    // Min/max-etiketter + "NÃ¥"-markÃ¸r
    const labelNodes = [];
    const maxIdx = tvals.indexOf(rawMax);
    const minIdx = tvals.indexOf(rawMin);
    [maxIdx, minIdx].forEach(i => {
      if (i < 0) return;
      labelNodes.push(svgEl("text", {
        x: xs[i], y: tY(points[i].t) - 7,
        "text-anchor": "middle", fill: "var(--accent)",
      }, Math.round(points[i].t) + "\u00b0"));
    });
    labelNodes.push(svgEl("circle", {
      cx: xs[0], cy: tY(points[0].t), r: 3.5,
      fill: "var(--accent)",
    }));
    labelNodes.push(svgEl("text", {
      x: xs[0] + 6, y: tY(points[0].t) - 7,
      "text-anchor": "start", fill: "var(--accent)",
      "font-size": "9", "letter-spacing": ".12em",
    }, "N\u00c5"));
    setChildren("wx-labels", labelNodes);

    // Tidsetiketter (hver 3. time)
    const xNodes = [];
    points.forEach((p, i) => {
      if (p.hour % 3 !== 0 && i !== 0 && i !== points.length - 1) return;
      xNodes.push(svgEl("text", {
        x: xs[i], y: H - 10,
        "text-anchor": i === 0 ? "start" : (i === points.length - 1 ? "end" : "middle"),
      }, pad2(p.hour)));
    });
    setChildren("wx-xlabels", xNodes);

    // Condition icons every 3h over the chart
    var iconNodes = [];
    var iconY = padT - 2;
    points.forEach(function(p, i) {
      if (p.hour % 3 !== 0) return;
      if (xs[i] < padL + 10 || xs[i] > W - padR - 10) return;
      var cond = weatherCodeToCondition(p.wc);
      var g = svgEl("g", { transform: "translate(" + (xs[i] - 9) + ", " + (iconY - 10) + ")" });
      g.innerHTML = wxIconSvg(cond, p.hour);
      iconNodes.push(g);
    });
    var iconsG = document.getElementById("wx-icons");
    if (iconsG) {
      iconsG.innerHTML = "";
      iconNodes.forEach(function(n) { iconsG.appendChild(n); });
    }


    // Oppdater range-etikett
    const rangeEl = document.getElementById("chart-range");
    if (rangeEl) rangeEl.textContent = `${Math.round(rawMax)}\u00b0 \u2014 ${Math.round(rawMin)}\u00b0`;
  }

  /* ---------- NEWS (med rotasjon) ---------- */

  const newsState = {
    items: [],
    pageSize: 5,
    currentPage: 0,
  };

  function formatNewsTime(dateText) {
    if (!dateText) return "";
    const d = new Date(dateText);
    if (Number.isNaN(d.getTime())) return "";
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function formatNewsTimestamp(dateText) {
    // Kompatibilitet med services.js - returnerer bare tid
    return formatNewsTime(dateText);
  }

  function renderNews(elements, items) {
    // items kommer fra services.js med { title, link, sourceLabel } der sourceLabel er tid fra formatNewsTimestamp
    newsState.items = items.map(item => ({
      time: item.sourceLabel || formatNewsTime(item.publishedAt),
      head: item.title,
      link: item.link,
    }));
    newsState.currentPage = 0;
    renderNewsPage(elements);
  }

  function renderNewsPage(elements) {
    const list = elements.newsList;
    const items = newsState.items;
    const pages = Math.max(1, Math.ceil(items.length / newsState.pageSize));
    if (newsState.currentPage >= pages) newsState.currentPage = 0;

    const start = newsState.currentPage * newsState.pageSize;
    const slice = items.slice(start, start + newsState.pageSize);

    list.innerHTML = "";
    if (!slice.length) {
      const li = document.createElement("li");
      li.innerHTML = '<span class="time"></span><span class="head"><em>Ingen nyheter akkurat n\u00e5</em></span>';
      list.appendChild(li);
    } else {
      slice.forEach(n => {
        const li = document.createElement("li");
        const time = document.createElement("span");
        time.className = "time";
        time.textContent = n.time || "";
        const head = document.createElement("span");
        head.className = "head";
        head.textContent = n.head;
        li.appendChild(time);
        li.appendChild(head);
        list.appendChild(li);
      });
    }

    // Retrigger animasjon
    list.style.animation = "none";
    void list.offsetHeight;
    list.style.animation = "";

    elements.newsPage.textContent = `${newsState.currentPage + 1}/${pages}`;
    const dots = elements.newsDots;
    dots.innerHTML = "";
    for (let i = 0; i < pages; i++) {
      const d = document.createElement("span");
      d.className = "dot" + (i === newsState.currentPage ? " on" : "");
      dots.appendChild(d);
    }
  }

  function rotateNewsPage(elements) {
    const items = newsState.items;
    const pages = Math.max(1, Math.ceil(items.length / newsState.pageSize));
    if (pages <= 1) return;
    newsState.currentPage = (newsState.currentPage + 1) % pages;
    renderNewsPage(elements);
  }

  /* ---------- NOTICE ---------- */

  function renderNotice(elements, notice) {
    if (!notice) {
      elements.notice.hidden = true;
      return;
    }
    elements.notice.hidden = false;
    elements.noticeTag.textContent = notice.tag;
    elements.noticeMsg.textContent = notice.msg;
  }

  /* ---------- LIVE-STATUS ---------- */

  function setLiveStatus(elements, level) {
    // level: 'ok' | 'warn' | 'err'
    const dot = elements.liveDot;
    const label = elements.liveLabel;
    if (!dot || !label) return;
    dot.classList.remove("warn", "err");
    if (level === "warn") {
      dot.classList.add("warn");
      label.textContent = "Delvis";
    } else if (level === "err") {
      dot.classList.add("err");
      label.textContent = "Offline";
    } else {
      label.textContent = "Sanntid";
    }
  }

  function setPanelStaleFlag(panelEl, isStale) {
    if (!panelEl) return;
    panelEl.classList.toggle("stale", Boolean(isStale));
  }

  function updateUpdatedLabel(elements, date) {
    if (!date) {
      elements.updated.textContent = "--:--";
      return;
    }
    elements.updated.textContent = pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  }

  function updateWeatherStatus(elements, date, stale) {
    if (!elements.weatherStatusText) return;
    const prefix = stale ? "lagret" : "oppd.";
    if (!date) {
      elements.weatherStatusText.textContent = "yr.no";
      return;
    }
    elements.weatherStatusText.textContent =
      "yr.no \u00b7 " + prefix + " " + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  }

  /* ---------- THEME ---------- */

  function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme !== "dark");
    const btn = document.getElementById("mode-toggle");
    if (btn) btn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }

  function autoTheme() {
    const hour = new Date().getHours();
    // Dag 07:00-17:00, natt ellers. Enkel tilnÃ¦rming.
    const theme = (hour >= 7 && hour < 17) ? "light" : "dark";
    applyTheme(theme);
    return theme;
  }

  /* ---------- EXPORT ---------- */

  window.JPCRenderers = {
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
    getIsoWeek,
    getWeatherSummary: weatherCodeText,
    wxIconSvg,
    weatherCodeToCondition,
  };
}());
