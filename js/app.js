window.App = (() => {
  const $app = () => document.getElementById("app");
  const langButtons = () => document.querySelectorAll(".lang-switch button");
  const searchForm = () => document.getElementById("search-form");
  const searchInput = () => document.getElementById("search-input");

  function setActiveLangButton() {
    const lang = Utils.getLang();
    langButtons().forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  }

  async function renderHome() {
    $app().innerHTML = `
      <section class="card">
        <h2>${Utils.getLang() === "cy" ? "Chwilio" : "Search"}</h2>
        <p>${Utils.getLang() === "cy" ? "Teipiwch ym mlwch chwilio uchod." : "Type in the search box above."}</p>
      </section>
    `;
    searchInput().focus();
  }

  async function renderSearch(_match, queryStr = "") {
  const qp = new URLSearchParams(queryStr);
  const q = (qp.get("q") || "").trim();
  if (!q) return renderHome();

  const results = await API.searchEntities(q);
  const items = results.map(r => `
    <a class="card" href="#/item/${r.id}">
      <strong>${r.label || r.id}</strong><br>
      <small>${r.description || ""}</small>
    </a>
  `);
  document.getElementById("app").innerHTML =
    `<div class="list">${items.join("") || "<p>No results.</p>"}</div>`;
}

  async function renderItem(match) {
  const qid = match[1];
  const lang = Utils.getLang();

  // Fetch main entity
  const entities = await API.getEntities(qid, lang);
  const entity = entities[qid];
  if (!entity) {
    document.getElementById("app").innerHTML = `<p>Not found: ${qid}</p>`;
    return;
  }

  // --- Collect all QIDs referenced in statements ---
  const linked = Utils.collectLinkedQids(entity).filter(id => id !== qid);
  // Limit to 200 to keep JSONP URLs safe
  const limited = linked.slice(0, 200);

  // --- Fetch their labels ---
  const labelMap = await API.getLabels(limited, lang);

  // --- Render page ---
  const html = Templates.renderGeneric(entity, lang, labelMap);
  document.getElementById("app").innerHTML = html;
}

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
// --- Live dropdown search with keyboard navigation ---
function initLiveSearch() {
  const input = document.getElementById("search-input");
  const suggestionsBox = document.getElementById("search-suggestions");

  let timer = null;
  let latestQuery = "";
  let activeIndex = -1; // track highlighted item

  // Debounced input listener
  input.addEventListener("input", () => {
    const q = input.value.trim();
    latestQuery = q;
    activeIndex = -1;
    clearTimeout(timer);
    if (!q) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.style.display = "none";
      return;
    }

    timer = setTimeout(async () => {
      try {
        const results = await API.searchEntities(q);
        if (q !== latestQuery) return; // ignore stale responses

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
    }, 350); // debounce delay
  });

  // Click selection
  suggestionsBox.addEventListener("click", (e) => {
    const item = e.target.closest(".suggestion[data-id]");
    if (!item) return;
    const qid = item.dataset.id;
    input.value = item.querySelector("strong").textContent;
    hideSuggestions();
    Router.go(`#/item/${qid}`);
  });

  // Keyboard navigation
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
          const qid = selected.dataset.id;
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

  // Hide when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Helpers
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

  function initRoutes() {
  Router.add(/^\/$/, renderHome);
  Router.add(/^\/search(?:\?.*)?$/, renderSearch);  // ← accept ?q=...
  Router.add(/^\/item\/(Q\d+)$/, renderItem);
  Router.parse();
}

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
