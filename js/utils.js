window.Utils = (() => {
  const getLang = () => localStorage.getItem("lang") || CONFIG.DEFAULT_LANG;
  const setLang = (lang) => localStorage.setItem("lang", lang);
  const isQid = (s) => /^Q\d+$/.test(s);
  const uniq = (arr) => [...new Set(arr)];

  function firstValue(claim) {
    if (!claim || !claim.mainsnak) return undefined;
    const snak = claim.mainsnak;
    if (snak.datavalue == null) return undefined;
    const { type, value } = snak.datavalue;
    if (type === "wikibase-entityid") return "Q" + value["numeric-id"];
    if (type === "time") return value.time;
    if (type === "monolingualtext") return value.text;
    if (["string", "url", "external-id"].includes(type)) return value;
    if (type === "quantity") return value.amount;
    if (type === "globecoordinate") return `${value.lat},${value.lon}`;
    return undefined;
  }

  const formatTime = (t) => (typeof t === "string" && t.startsWith("+")) ? t.slice(1, 11) : t;

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

  return { getLang, setLang, isQid, uniq, firstValue, formatTime, collectLinkedQids };
})();
