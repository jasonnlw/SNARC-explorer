window.Utils = (() => {
  // --- Basic helpers ---
  const getLang = () => localStorage.getItem("lang") || CONFIG.DEFAULT_LANG;
  const setLang = (lang) => localStorage.setItem("lang", lang);
  const isQid = (s) => /^Q\d+$/.test(s);
  const uniq = (arr) => [...new Set(arr)];

  // --- Extract first usable value from a claim ---
  function firstValue(claim) {
    if (!claim || !claim.mainsnak) return undefined;
    const snak = claim.mainsnak;
    if (!snak.datavalue) return undefined;
    const { type, value } = snak.datavalue;
    switch (type) {
      case "wikibase-entityid": return "Q" + value["numeric-id"];
      case "time": return value.time;
      case "monolingualtext": return value.text;
      case "string":
      case "url":
      case "external-id": return value;
      case "quantity": return value.amount;
      case "globecoordinate": return `${value.lat},${value.lon}`;
      default: return undefined;
    }
  }

  // --- Format time string (e.g., +1953-05-12T00:00:00Z → 1953-05-12) ---
  const formatTime = (t) =>
    typeof t === "string" && t.startsWith("+") ? t.slice(1, 11) : t;

  // --- Collect all QIDs referenced anywhere in claims ---
  function collectLinkedQids(entity) {
    const qids = [];
    for (const pid in (entity.claims || {})) {
      for (const stmt of entity.claims[pid]) {
        const v = firstValue(stmt);
        if (isQid(v)) qids.push(v);
      }
    }
    return uniq(qids);
  }

  // --- Return array of QIDs from a specific property ---
  function getClaimQids(entity, pid) {
    if (!entity || !entity.claims || !entity.claims[pid]) return [];
    return entity.claims[pid]
      .map(firstValue)
      .filter(isQid);
  }

  // --- Check if entity has coordinates (P26) ---
  function hasCoordinates(entity) {
    return !!(entity?.claims?.[CONFIG.PIDS.coordinates]?.length);
  }

  // --- Export ---
  return {
    getLang,
    setLang,
    isQid,
    uniq,
    firstValue,
    formatTime,
    collectLinkedQids,
    getClaimQids,
    hasCoordinates
  };
})();
