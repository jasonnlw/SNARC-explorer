window.Router = (() => {
  const routes = [];
  function add(pattern, handler) { routes.push({ pattern, handler }); }
  function parse() {
    const hash = location.hash.slice(1) || "/";
    for (const { pattern, handler } of routes) {
      const m = hash.match(pattern);
      if (m) return handler(m);
    }
    App.renderHome();
  }
  function go(path) { location.hash = path; }
  window.addEventListener("hashchange", parse);
  return { add, parse, go };
})();
