window.API = (() => {
  const baseParams = { format: "json", origin: "*" };

  async function apiGet(params) {
    const u = new URL(CONFIG.ACTION_API);
    Object.entries({ ...baseParams, ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
    const res = await fetch(u.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.info || "API error");
    return data;
  }

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
      limit: 10
    });
    return data.search || [];
  }

  async function getLabels(qids, language = Utils.getLang()) {
    if (!qids.length) return {};
    const ent = await getEntities(qids, language);
    const out = {};
    for (const q in ent) out[q] = ent[q].labels?.[language]?.value || q;
    return out;
  }

  return { getEntities, searchEntities, getLabels };
})();
