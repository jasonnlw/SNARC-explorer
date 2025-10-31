window.App = (() => {
  const $app = () => document.getElementById("app");
  const langButtons = () => document.querySelectorAll(".lang-switch button");
  const searchForm = () => document.getElementById("search-form");
  const searchInput = () => document.getElementById("search-input");

  // ----------------------------------------------------------
  // Language control
  // ----------------------------------------------------------
  function setActiveLangButton() {
    const lang = Utils.getLang();
    langButtons().forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  }

  // ----------------------------------------------------------
  // Home screen
  // ----------------------------------------------------------
  async function renderHome() {
    $app().innerHTML = `
      <section class="card">
        <h2>${Utils.getLang() === "cy" ? "Chwilio" : "Search"}</h2>
        <p>${Utils.getLang() === "cy"
          ? "Teipiwch ym mlwch chwilio uchod."
          : "Type in the search box above."}</p>
      </section>
    `;
    searchInput().focus();
  }

  // ----------------------------------------------------------
  // Search results
  // ----------------------------------------------------------
  async function renderSearch(_match, queryStr = "") {
    const qp = new URLSearchParams(queryStr);
    const q = (qp.get("q") || "").trim();
    if (!q) return renderHome();

    try {
      const results = await API.searchEntities(q);
      const items = results.map(r => `
        <a class="card" href="#/item/${r.id}">
          <strong>${r.label || r.id}</strong><br>
          <small>${r.description || ""}</small>
        </a>
      `);

      $app().innerHTML = `<div class="list">${items.join("") || "<p>No results.</p>"}</div>`;
    } catch (err) {
      console.error("Search render error:", err);
      $app().innerHTML = `<p class="error">Search failed. Please try again.</p>`;
    }
  }

  // ----------------------------------------------------------
  // Collect all linked QIDs
  // ----------------------------------------------------------
  function collectQidsStrict(entity) {
    const claims = entity?.claims || {};
    const qids = [];

    for (const pid in claims) {
      for (const stmt of claims[pid]) {
        const snak = stmt?.mainsnak;
        if (!snak || !snak.datavalue) continue;
        const dv = snak.datavalue;

        if (dv.type === "wikibase-entityid") {
          const v = dv.value;
          const q = (v && (v.id || (v["entity-type"] === "item" && "Q" + v["numeric-id"]))) || null;
          if (q) qids.push(q);
        } else {
          const v2 = Utils.firstValue(stmt);
          if (typeof v2 === "string" && /^Q\d+$/i.test(v2)) qids.push(v2.toUpperCase());
        }
      }
    }

    return [...new Set(qids.map(x => String(x).trim().toUpperCase()))];
  }

  // ----------------------------------------------------------
  // Fetch label maps in batches (for linked QIDs)
  // ----------------------------------------------------------
  async function fetchLabelMapBatched(qids, lang) {
    const out = {};
    const batchSize = 50;
    for (let i = 0; i < qids.length; i += batchSize) {
      const batch = qids.slice(i, i + batchSize);
      try {
        const ents = await API.getEntities(batch, lang);
        for (const q in ents) {
          const e = ents[q];
          const lbl = e?.labels?.[lang]?.value || e?.labels?.en?.value || q;
          out[q.toUpperCase()] = lbl;
        }
      } catch (err) {
        console.warn("Label batch failed:", batch, err);
      }
    }
    return out;
  }

  // ----------------------------------------------------------
  // Render single entity page
  // ----------------------------------------------------------
  async function renderItem(match) {
    const qid = match[1].toUpperCase();
    const lang = Utils.getLang();

    try {
      const entities = await API.getEntities(qid, lang);
      const entity = entities[qid];
      if (!entity) {
        $app().innerHTML = `<p>Not found: ${qid}</p>`;
        return;
      }

      const linkedAll = collectQidsStrict(entity).filter(id => id !== qid);
      const linked = linkedAll.slice(0, 200);

      const labelMap = await fetchLabelMapBatched(linked, lang);

      console.log("Linked QIDs (capped):", linked.length, linked.slice(0, 25));
      console.log("Label map keys:", Object.keys(labelMap).length);

      const html = Templates.renderGeneric(entity, lang, labelMap);
      $app().innerHTML = html;

      // ✅ initialize images/maps after rendering
      if (Templates.postRender) Templates.postRender();

    } catch (err) {
      console.error("Render item error:", err);
      $app().innerHTML = `<p class="error">Failed to render entity ${qid}</p>`;

    }
  }

  // ----------------------------------------------------------
  // UI Events
  // ----------------------------------------------------------
  function initEvents() {
    document.querySelector(".lang-switch").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lang]");
      if (!btn) return;
      Utils.setLang(btn.dataset.lang);
      setActiveLangButton();
      Router.parse();
    });

    searchForm().addEventListener("submit", (e) => {
      e.preventDefault();
      const q = searchInput().value.trim();
      if (!q) return;
      Router.go(`#/search?q=${encodeURIComponent(q)}`);
    });
  }

  // ----------------------------------------------------------
  // Live dropdown search (with keyboard navigation)
  // ----------------------------------------------------------
  function initLiveSearch() {
    const input = document.getElementById("search-input");
    const suggestionsBox = document.getElementById("search-suggestions");

    let timer = null;
    let latestQuery = "";
    let activeIndex = -1;

    input.addEventListener("input", () => {
      const q = input.value.trim();
      latestQuery = q;
      activeIndex = -1;
      clearTimeout(timer);
      if (!q) {
        hideSuggestions();
        return;
      }

      timer = setTimeout(async () => {
        try {
          const results = await API.searchEntities(q);
          if (q !== latestQuery) return;

          if (!results.length) {
            suggestionsBox.innerHTML = "<div class='suggestion'><em>No results</em></div>";
            suggestionsBox.style.display = "block";
            return;
          }

          suggestionsBox.innerHTML = results
            .map(r => `<div class="suggestion" data-id="${r.id}">
                         <strong>${r.label || r.id}</strong><br>
                         <small>${r.description || ""}</small>
                       </div>`)
            .join("");
          suggestionsBox.style.display = "block";
        } catch (err) {
          console.error("Live search error:", err);
        }
      }, 350);
    });

    suggestionsBox.addEventListener("click", (e) => {
      const item = e.target.closest(".suggestion[data-id]");
      if (!item) return;
      const qid = item.dataset.id.toUpperCase();
      input.value = item.querySelector("strong").textContent;
      hideSuggestions();
      Router.go(`#/item/${qid}`);
    });

    input.addEventListener("keydown", (e) => {
      const items = Array.from(suggestionsBox.querySelectorAll(".suggestion[data-id]"));
      if (!items.length || suggestionsBox.style.display === "none") return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          activeIndex = (activeIndex + 1) % items.length;
          updateHighlight(items);
          break;
        case "ArrowUp":
          e.preventDefault();
          activeIndex = (activeIndex - 1 + items.length) % items.length;
          updateHighlight(items);
          break;
        case "Enter":
          if (activeIndex >= 0 && activeIndex < items.length) {
            e.preventDefault();
            const selected = items[activeIndex];
            const qid = selected.dataset.id.toUpperCase();
            input.value = selected.querySelector("strong").textContent;
            hideSuggestions();
            Router.go(`#/item/${qid}`);
          }
          break;
        case "Escape":
          hideSuggestions();
          break;
      }
    });

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
        hideSuggestions();
      }
    });

    function updateHighlight(items) {
      items.forEach((el, i) => el.classList.toggle("active", i === activeIndex));
      const active = items[activeIndex];
      if (active) active.scrollIntoView({ block: "nearest" });
    }

    function hideSuggestions() {
      suggestionsBox.innerHTML = "";
      suggestionsBox.style.display = "none";
      activeIndex = -1;
    }
  }

  // ----------------------------------------------------------
  // Routing
  // ----------------------------------------------------------
  function initRoutes() {
    Router.add(/^\/$/, renderHome);
    Router.add(/^\/search(?:\?.*)?$/, renderSearch);
    Router.add(/^\/item\/(Q\d+)$/, renderItem);
    Router.parse();
  }

  // ----------------------------------------------------------
  // Startup
  // ----------------------------------------------------------
  function start() {
    if (!localStorage.getItem("lang")) Utils.setLang(CONFIG.DEFAULT_LANG);
    setActiveLangButton();
    initEvents();
    initLiveSearch();
    initRoutes();
  }

  document.addEventListener("DOMContentLoaded", start);
  return { renderHome };
})();
