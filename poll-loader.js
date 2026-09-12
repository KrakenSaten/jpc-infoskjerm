(function initPollLoader() {
  // Deler CSV-parsing og fetch-timeout med menu-loader.js (lastes foer denne).
  const { splitCsvLine, stripBom, fetchWithTimeout } = window.JPCMenuLoader;

  const DEFAULT_VOTERS = 7;
  const RESULT_MODES = ["hidden", "always", "done"];

  // poll.csv er semikolon-separert, som menu.csv, men radbasert i stedet for
  // kolonnebasert: hver rad er type;key;value. Da kan spoersmaal, alternativer
  // og stemmer ligge i samme fil, og en stemme legges til som en enkelt ny rad.
  //
  //   question;;Hvor skal vi ha julebordet i aar?
  //   option;a;Bowling og pizza
  //   voters;;7
  //   results;;always        (always | done | hidden)
  //   vote;v3;a              (v1-v7 er anonyme plasser, ikke navn)
  //
  // Returnerer null naar fila er gyldig, men ingen avstemning er aktiv
  // (tom eller manglende question-rad). Kaster ved reelle formatfeil.
  function parsePollCsv(csvText) {
    const rows = stripBom(csvText)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"));
    if (!rows.length) throw new Error("poll.csv er tom");

    const [headerLine, ...dataLines] = rows;
    const headers = splitCsvLine(headerLine).map(h => h.toLowerCase());
    const idxType  = headers.indexOf("type");
    const idxKey   = headers.indexOf("key");
    const idxValue = headers.indexOf("value");
    if ([idxType, idxKey, idxValue].some(i => i === -1)) {
      throw new Error("poll.csv mangler kolonnene type;key;value");
    }

    let question = "";
    let voters = DEFAULT_VOTERS;
    let resultMode = "always";
    const options = [];
    // Map gir dedupe pr. velger: legger noen inn to stemmer, teller den siste.
    const votes = new Map();

    for (const line of dataLines) {
      const cells = splitCsvLine(line);
      const type  = String(cells[idxType]  || "").toLowerCase();
      const key   = String(cells[idxKey]   || "").toLowerCase();
      const value = String(cells[idxValue] || "").trim();

      if (type === "question") {
        question = value;
      } else if (type === "option" && key) {
        options.push({ id: key, text: value || key.toUpperCase() });
      } else if (type === "voters") {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) voters = Math.round(parsed);
      } else if (type === "results" && RESULT_MODES.includes(value.toLowerCase())) {
        resultMode = value.toLowerCase();
      } else if (type === "vote" && key) {
        votes.set(key, value.toLowerCase());
      }
    }

    if (!question) return null;
    if (options.length < 2) {
      throw new Error("poll.csv trenger minst to option-rader");
    }

    // Stemmer paa ukjente alternativ-ID-er telles ikke - da er fila
    // feilredigert, og vi vil heller vise for lavt tall enn et oppdiktet.
    const tally = new Map(options.map(option => [option.id, 0]));
    let answered = 0;
    for (const optionId of votes.values()) {
      if (!tally.has(optionId)) continue;
      tally.set(optionId, tally.get(optionId) + 1);
      answered += 1;
    }

    return {
      question,
      voters,
      resultMode,
      answered,
      options: options.map(option => ({ ...option, votes: tally.get(option.id) })),
    };
  }

  async function fetchFromGithub() {
    const url = window.JPC_CONFIG.pollGithubUrl + "?t=" + Date.now();
    const response = await fetchWithTimeout(url, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return parsePollCsv(await response.text());
  }

  async function fetchLocalCsv() {
    const response = await fetch("poll.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return parsePollCsv(await response.text());
  }

  // Samme kilderekkefolge som menyen: GitHub raw foerst, saa lokal fil.
  async function loadPollFromSources() {
    if (window.location.protocol === "file:") {
      throw new Error("file://-protokoll er ikke stottet. Start preview-server.");
    }

    let lastError = null;
    for (const attempt of [
      { name: "github", fn: fetchFromGithub },
      { name: "csv",    fn: fetchLocalCsv },
    ]) {
      try {
        return { poll: await attempt.fn(), source: attempt.name };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Ingen avstemningskilde tilgjengelig");
  }

  window.JPCPollLoader = {
    loadPollFromSources,
    parsePollCsv,
  };
}());
