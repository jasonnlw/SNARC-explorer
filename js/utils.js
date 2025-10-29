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
  // --- Type matching helper ---
  function matchEntityType(entity) {
    const claims = entity.claims || {};
    const p7 = claims["P7"] || [];   // instance of
    const p45 = claims["P45"] || []; // subclass of
    const p26 = claims["P26"] || []; // coordinates

    // gather IDs
    const inst = p7.map(c => firstValue(c));
    const subc = p45.map(c => firstValue(c));
    const coords = p26.length > 0;

    // PEOPLE: instance/subclass of Q947
    if (inst.includes("Q947") || subc.includes("Q947")) return "person";

    // PLACES: has coordinates
    if (coords) return "place";

    // ORGANISATIONS / GROUPS / EVENTS
    const orgTargets = ["Q10448", "Q10298", "Q10456"];
    if (inst.some(v => orgTargets.includes(v)) || subc.some(v => orgTargets.includes(v)))
      return "organisation";

    return null; // not recognised
  }

  return { getLang, setLang, isQid, uniq, firstValue, formatTime, collectLinkedQids };
})();
