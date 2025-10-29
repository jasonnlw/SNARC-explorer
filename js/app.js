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
    const entities = await API.getEntities(qid, lang);
    const entity = entities[qid];
    if (!entity) { $app().innerHTML = `<p>Not found: ${qid}</p>`; return; }

    const linked = Utils.collectLinkedQids(entity).filter(id => id !== qid).slice(0, 200);
    const labelMap = await API.getLabels(linked, lang);

    const html = Templates.renderGeneric(entity, lang, labelMap);
    $app().innerHTML = html;
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
// --- Live dropdown search ---
function initLiveSearch() {
  const input = document.getElementById("search-input");
  const suggestionsBox = document.getElementById("search-suggestions");

  let timer = null;
  let latestQuery = "";

  input.addEventListener("input", () => {
    const q = input.value.trim();
    latestQuery = q;
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

  // When user clicks a suggestion
  suggestionsBox.addEventListener("click", (e) => {
    const item = e.target.closest(".suggestion[data-id]");
    if (!item) return;
    const qid = item.dataset.id;
    input.value = item.querySelector("strong").textContent;
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
    Router.go(`#/item/${qid}`);
  });

  // Hide suggestions when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.style.display = "none";
    }
  });
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
