window.API = (() => {

  // --- Base parameters for API requests ---
  const baseParams = { format: "json" };

  // ============================================================
  // JSONP TRANSPORT (used because SNARC Wikibase is not CORS-enabled)
  // ============================================================
  async function apiGet(params) {
  const u = new URL(CONFIG.ACTION_API);
  const callbackName = "jsonp_cb_" + Math.random().toString(36).slice(2);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timed out"));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      if (window[callbackName]) delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (data) => {
      cleanup();
      if (!data) return reject(new Error("Empty JSONP response"));
      if (data.error) return reject(new Error(data.error.info || "API error"));
      resolve(data);
    };

    // --- Build query string safely ---
    for (const [k, v] of Object.entries({ ...baseParams, ...params })) {
      if (v !== undefined && v !== null && v !== "") {
        u.searchParams.set(k, v);
      }
    }
    u.searchParams.set("callback", callbackName);

    script.src = u.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };
    console.log("Injecting JSONP script:", u.toString());
    document.body.appendChild(script);
  });
}

  // ============================================================
  // CORE API FUNCTIONS
  // ============================================================

  // --- Get full entities by QID(s) ---
  async function getEntities(ids, languages = Utils.getLang()) {
    if (!ids || (Array.isArray(ids) && !ids.length)) return {};
    try {
  const data = await apiGet({
    action: "wbgetentities",
    ids: Array.isArray(ids) ? ids.join("|") : ids,
    props: "labels|descriptions|claims",
    languages
  });
  return data.entities || {};
} catch (err) {
  console.error("getEntities failed:", err);
  return {};
}
    return data.entities || {};
  }

  // --- Search entities and filter by configured rules ---
 async function searchEntities(search, language = Utils.getLang()) {
  if (!search) return [];

  let data;
  try {
    data = await apiGet({
      action: "wbsearchentities",
      search,
      language,
      uselang: language,
      type: "item",
      limit: 20
    });
  } catch (err) {
    console.error("Search API error:", err);
    return [];
  }

  const results = data.search || [];
  if (!results.length) return [];

  // Fetch entities (to inspect claims)
  const qids = results.map(r => r.id);
  let entities = {};
  try {
    entities = await getEntities(qids, language);
  } catch (err) {
    console.error("Entity fetch error:", err);
    return [];
  }

  
// --- Build quick-lookup set (normalize everything) ---
const personSet = new Set(
  (CONFIG.TYPE_SETS?.people || [])
    .map(q => String(q).trim().toUpperCase())
);

// --- Filter ---
const filtered = results.filter(r => {
  const ent = entities[r.id];
  if (!ent || !ent.claims) return false;

  // Get instance-of values and normalize
  const inst = Utils.getClaimQids(ent, CONFIG.PIDS.instanceOf)
    .map(i => String(i).trim().toUpperCase());

  const place = Utils.hasCoordinates(ent);
  const match = place || inst.some(i => personSet.has(i));

  if (!match) {
    console.log(`Filtered out ${r.id}: instance-of =`, inst, 
                "=> Checking against", [...personSet].slice(0,10), "...");
  }

  return match;
});

console.log("Search returned:", results.length, "Filtered in:", filtered.length);
   return filtered;
}

  // --- Get labels for a batch of QIDs ---
  async function getLabels(qids, language = Utils.getLang()) {
    if (!qids || !qids.length) return {};
    const entities = await getEntities(qids, language);
    const out = {};
    for (const q in entities) {
      out[q] = entities[q].labels?.[language]?.value || q;
    }
    return out;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    getEntities,
    searchEntities,
    getLabels
  };

})();
