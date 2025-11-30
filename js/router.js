import { initHomePage } from "./home.js";


window.Router = (() => {
  const routes = [];

  function add(pattern, handler) { routes.push({ pattern, handler }); }

  function parse() {
    const raw = location.hash.slice(1) || "/";
    const [path, query = ""] = raw.split("?");
    const hashForMatch = path + (query ? "?" + query : "");

    for (const { pattern, handler } of routes) {
      const m = hashForMatch.match(pattern);
      if (m) return handler(m, query);
    }
    initHomePage(window.currentLang || "en");
  }

  function go(path) { location.hash = path; }

  window.addEventListener("hashchange", parse);

  return { add, parse, go };
})();
