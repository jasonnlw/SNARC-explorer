window.API = (() => {
  // Base parameters for API requests
  const baseParams = { format: "json" };

  // --- JSONP fallback ---
  async function apiGet(params) {
    const u = new URL(CONFIG.ACTION_API);

    // Always use JSONP because your Wikibase isn't CORS-enabled
    const callbackName = "jsonp_cb_" + Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        if (data.error) reject(data.error.info);
        else resolve(data);
      };

      Object.entries({ ...baseParams, ...params, callback: callbackName })
        .forEach(([k, v]) => u.searchParams.set(k, v));

      const script = document.createElement("script");
      script.src = u.toString();
      script.onerror = () => reject(new Error("JSONP request failed"));
      document.body.appendChild(script);
    });
  }

  // --- API functions using the same JSONP transport ---
  async function getEntities(ids, languages = Utils.getLang()) {
    const data = await apiGet({
      action: "wbgetentities",
      ids: Array.isArray(ids) ? ids.join("|") : ids,
      props: "labels|descriptions|claims",
      languages
    });
    return data.entities || {};
  }

async function searchEntities(search, language = Utils.getLang()) {
  const data = await apiGet({
    action: "wbsearchentities",
    search,
    language,
    uselang: language,
    type: "item",
    limit: 20
  });
  const results = data.search || [];

  // fetch full entities for filtering
  const qids = results.map(r => r.id);
  const entities = await getEntities(qids, language);

  // filter to people, places, or organisations
const personSet = new Set(CONFIG.TYPE_SETS.people);

const filtered = results.filter(r => {
  const ent = entities[r.id];
  if (!ent) return false;
  const inst = Utils.getClaimQids(ent, CONFIG.PIDS.instanceOf);
  const place = Utils.hasCoordinates(ent);
  return place || inst.some(i => personSet.has(i));
});


  return filtered;
}

  async function getLabels(qids, language = Utils.getLang()) {
    if (!qids.length) return {};
    const ent = await getEntities(qids, language);
    const out = {};
    for (const q in ent) {
      out[q] = ent[q].labels?.[language]?.value || q;
    }
    return out;
  }

  return { getEntities, searchEntities, getLabels };
})();

