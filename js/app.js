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
    initRoutes();
  }

  document.addEventListener("DOMContentLoaded", start);

  return { renderHome };
})();
