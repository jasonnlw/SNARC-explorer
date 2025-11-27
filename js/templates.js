/* ===============================================================
   SNARC Explorer Templates.js – cleaned + ready for family tre
   =============================================================== */

window.Templates = (() => {

  // ---------- Identifier URL patterns ----------
  const ID_URL = {
    P10:  "https://viaf.org/viaf/$1",
    P102: "https://id.library.wales/$1",
    P107: "https://id.library.wales/$1",
    P108: "https://snarc-llgc.wikibase.cloud/wiki/$1",
    P11:  "https://id.loc.gov/authorities/$1",
    P12:  "https://archives.library.wales/index.php/$1",
    P5:   "https://biography.wales/article/$1",
    P6:   "https://bywgraffiadur.cymru/article/$1",
    P68:  "https://cadwpublic-api.azurewebsites.net/reports/listedbuilding/FullReport?id=$1",
    P69:  "https://coflein.gov.uk/en/site/$1",
    P8:   "https://id.loc.gov/vocabulary/iso639-1/$1",
    P83:  "https://historicplacenames.rcahmw.gov.uk/placenames/recordedname/$1",
    P9:   "https://isni.oclc.org/xslt/DB=1.2/CMD?ACT=SRCH&IKT=8006&TRM=ISN%3A$1",
    P91:  "https://www.comisiynyddygymraeg.cymru/rhestr-enwau-lleoedd-safonol-cymru/$1",
    P97:  "https://discovery.nationalarchives.gov.uk/details/c/$1",
    P62:  "https://www.wikidata.org/wiki/$1" 
  };

  // ---------- Helpers ----------
  const normalizeQid = value =>
    (value && /Q\d+/i.test(value)) ? value.match(/Q\d+/i)[0].toUpperCase() : null;

  const normalizeDatatype = dt =>
    dt ? String(dt).toLowerCase().replace(/_/g, "-").replace(/\s+/g, "") : "";

  function extractQidFromSnak(stmt) {
    if (typeof Utils?.firstValue === "function") {
      const v = Utils.firstValue(stmt);
      if (typeof v === "string" && /^Q\d+$/i.test(v)) return v;
      if (v && typeof v === "object" && typeof v.id === "string" && /^Q\d+$/i.test(v.id)) {
        return v.id;
      }
    }
    const id = stmt?.mainsnak?.datavalue?.value?.id;
    if (typeof id === "string" && /^Q\d+$/i.test(id)) return id;
    const num = stmt?.mainsnak?.datavalue?.value?.["numeric-id"];
    if (Number.isFinite(num)) return `Q${num}`;
    return null;
  }

  function getRelatedIds(claimArray) {
    if (!Array.isArray(claimArray)) return [];
    const ids = [];
    for (const stmt of claimArray) {
      const q = extractQidFromSnak(stmt);
      if (q) ids.push(q);
    }
    return ids;
  }

function formatSnarcDateFromSnak(stmt) {
  if (!stmt?.mainsnak?.datavalue?.value) return "";

  const dv = stmt.mainsnak.datavalue.value;
  const time = dv.time || dv.value || "";
  const precision = dv.precision || 11;

  const match = String(time).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(time);
  const [, y, m, d] = match;

  if (precision >= 11) return `${d}-${m}-${y}`;  // day precision
  if (precision === 10) return `${m}-${y}`;      // month precision
  return y;                                      // year precision
}


function renderHeroHeader(entity, lang, labelMap = {}) {
  const claims = entity.claims || {};

  // === 1. Base label ===
  const baseLabel =
    entity.labels?.[lang]?.value ||
    entity.labels?.en?.value ||
    entity.id;

  let displayLabel = baseLabel;

  // === 2. Description ===
  const desc =
    entity.descriptions?.[lang]?.value ||
    entity.descriptions?.en?.value ||
    "";

  // === 3. Hero Image (P31 file) ===
  let heroImgHTML = "";
  if (claims["P31"] && claims["P31"].length) {
    const imgVal = Utils.firstValue(claims["P31"][0]);
    if (typeof imgVal === "string") {
      const filename = imgVal.replace(/^File:/i, "").trim();
      const thumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`;
      heroImgHTML = `
        <div class="hero-image">
          <img src="${thumb}" alt="${filename}" loading="lazy">
        </div>`;
    }
  }

  // === 4. Instance-of tagging (Option C) ===
  let tagsHTML = "";
  let instanceQids = [];

  if (claims["P7"] && claims["P7"].length) {
    instanceQids = claims["P7"]
      .map(stmt => Utils.firstValue(stmt))
      .filter(q => typeof q === "string" && /^Q\d+$/i.test(q));

    if (instanceQids.length) {
      const primary = instanceQids[0];
      const tagLabel = labelMap[primary] || primary;
      tagsHTML += `<span class="hero-tag">${tagLabel}</span>`;
    }
  }

  // === Detect humans ===
  const isHuman = instanceQids.includes("Q947");

  // === 5. Pseudonym (P24) for humans ===
if (isHuman && claims["P24"] && claims["P24"].length) {
  const pseudoStmt = claims["P24"][0];
  const v = Utils.firstValue(pseudoStmt);

  // If literal string pseudonym → use it directly
  if (typeof v === "string" && !/^Q\d+$/i.test(v)) {
    displayLabel = `${baseLabel} (${v})`;
  }

  // If the pseudonym is a QID → look up labelMap as before
  else if (/^Q\d+$/i.test(v) && labelMap[v]) {
    displayLabel = `${baseLabel} (${labelMap[v]})`;
  }
}

  // === 7. Render hero block ===
  return `
    <div class="hero-header">
      ${heroImgHTML}
      <div class="hero-text">
        <h1>${displayLabel}</h1>
        ${desc ? `<p class="hero-desc">${desc}</p>` : ""}
        <div class="hero-tags">
          ${tagsHTML}
        </div>
      </div>
    </div>
  `;
}
   
   
  // ---------- Value renderer ----------
  function renderValue(datatype, value, labelMap, lang, pid) {
    if (value == null) return "";

// --- URL-overrides must run before QID logic ---
if (ID_URL[pid]) {

  // Special case: P62 returns a full Wikidata URL
  if (pid === "P62") {
    const q = String(value).match(/Q\\d+/i);
    if (q) {
      const qid = q[0];
      const url = ID_URL["P62"].replace(/\$1/g, qid);
      return `<a href="${url}" target="_blank" rel="noopener">${qid}</a>`;
    }
  }

  // Default case for P108 and others
  const encoded = encodeURIComponent(String(value).trim());
  const url = ID_URL[pid].replace(/\$1/g, encoded);
  return `<a href="${url}" target="_blank" rel="noopener">${String(value)}</a>`;
}


    const propInfo = window.PROPERTY_INFO?.[pid];
    const dtNorm = normalizeDatatype(datatype || propInfo?.datatype);

    // 📸 Wikimedia Commons image thumbnails (P31)
    if (pid === "P31") {
      const filename = String(value).replace(/^File:/i, "").trim();
      if (!filename) return "";
      const thumbUrl =
        `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`;
      const filePage =
        `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;
      return `<a href="${filePage}" target="_blank" rel="noopener">
                <img src="${thumbUrl}" alt="${filename}" loading="lazy"
                     style="max-width:300px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.15);margin:4px;">
              </a>`;
    }

    // 🗺️ Coordinates (P26)
    if (dtNorm === "globe-coordinate" || pid === "P26") {
      let lat, lon;
      if (typeof value === "string" && value.includes(",")) {
        [lat, lon] = value.split(",").map(Number);
      } else if (typeof value === "object" && "latitude" in value) {
        ({ latitude: lat, longitude: lon } = value);
      }
      if (!isFinite(lat) || !isFinite(lon)) return String(value);

      const id = `map-${Math.random().toString(36).slice(2)}`;
      return `<div class="map-thumb" data-lat="${lat}" data-lon="${lon}" data-mapid="${id}">
                <div id="${id}" class="map-thumb-canvas"></div>
              </div>`;
    }

    if (dtNorm === "url") {
      const v = String(value).trim();
      return `<a href="${v}" target="_blank" rel="noopener">${v}</a>`;
    }

    if (dtNorm === "time") return Utils.formatTime(value);
    if (dtNorm === "quantity") return String(value).replace(/^\+/, "");
    return String(value);
  }

  // ---------- Property rows (legacy, kept for compatibility) ----------
  function renderClaimRow(pid, statements, labelMap, lang) {
    const cleanPid = pid.replace(/^.*[\/#]/, "");
    const propInfo = window.PROPERTY_INFO?.[cleanPid];
    const label = propInfo
      ? (lang === "cy" && propInfo.label_cy ? propInfo.label_cy : propInfo.label_en)
      : cleanPid;
    const datatype = propInfo?.datatype || "String";

const values = statements
  .map(stmt => {
    // precision-aware date formatting
    if (datatype === "time" || normalizeDatatype(datatype) === "time") {
      return formatSnarcDateFromSnak(stmt);
    }

    const v = Utils.firstValue(stmt);
    return renderValue(datatype, v, labelMap, lang, cleanPid);
  })
  .filter(v => v !== undefined && v !== null && v !== "")
  .join(", ");


    return `<tr><th>${label}</th><td>${values}</td></tr>`;
  }

  // ---------- Profile & collections configuration ----------
  const PROFILE_ORDER = [
    "P45",
    "P13",
    "P24",
    "P20",
    "P25",
    "P23",
    "P56",
    "P53",
    "P55",
    "P54",
    "P52",
    "P76",
    "P78",
    "P81",
    "P28",
    "P72",
    "P73",
    "P27",
    "P38",
    "P63",
    "P66",
    "P70",
    "P71",
    "P65",
    "P64",
    "P88",
    "P77",
    "P79",
    "P40",
    "P41",
    "P46",
    "P47",
    "P87",
    "P89",
    "P93",
    "P95",
    "P96"
];


  // Only these Box 1 properties get hyperlinks for non-image/non-map values
  const PROFILE_LINKABLE = new Set(["P96","P89","P79","P77","P88","P64","P65","P71","P70","P66","P63","P38","P27","P73","P78","P76","P52","P54","P55","P53","P56","P23","P21","P22"]);

  const COLLECTION_LABELS = {
    P12: { en: "Archives and Manuscripts Authority", cy: "Awdurdod Archifau a Llawysgrifau" },
    P102:{ en: "Published Works",                    cy: "Gweithiau Cyhoeddedig" },
    P108:{ en: "Clip Cymru Content",                 cy: "Cynnwys Clip Cymru" },
    P5:  { en: "Welsh Biography Article (English)",  cy: "Erthygl yn y Bywgraffiadur (Saesneg)" },
    P6:  { en: "Welsh Biography Article (Welsh)",    cy: "Erthygl yn y Bywgraffiadur (Cymraeg)" },
    P90: { en: "Repertory of Welsh Manuscripts: Place",
           cy: "Repertory of Welsh Manuscripts: Lleoliad" },
     "P0": { en: "SNARC Wikibase",   cy: "Wikibase SNARC" },

    P68: { en: "CADW Listed Buildings",              cy: "Adeiladau Rhestredig CADW" },
    P69: { en: "Coflein",                             cy: "Coflein" },
    P83: { en: "Historic Place Names of Wales",      cy: "Enwau Lleoedd Hanesyddol Cymru" },
    P84: { en: "CADW Monuments",                     cy: "Henebion CADW" },
    P91: { en: "Standard Welsh Place-names",         cy: "Enwau Lleoedd Safonol Cymru" },

    P9:  { en: "ISNI",                               cy: "ISNI" },
    P10: { en: "VIAF",                               cy: "VIAF" },
    P11: { en: "Library of Congress Authority",      cy: "Awdurdod Llyfrgell y Gyngres" },
    P97: { en: "National Archives Authority",        cy: "Awdurdod Archifau Cenedlaethol" },
    P62: { en: "Wikidata",                           cy: "Wikidata" }
  };

  const COLLECTION_GROUPS = [
    {
      id: "nlw",
      pids: ["P12","P102","P108","P5","P6","P90","P0"],
      label_en: "National Library of Wales",
      label_cy: "Llyfrgell Genedlaethol Cymru"
    },
    {
      id: "welsh",
      pids: ["P68","P69","P83","P84","P91"],
      label_en: "Other Welsh Sources",
      label_cy: "Ffynonellau Cymraeg Eraill"
    },
    {
      id: "ids",
      pids: ["P9","P10","P11","P97","P62"],
      label_en: "Other Identifiers",
      label_cy: "Dynodwyr Eraill"
    }
  ];

  // ---------- Box 1: Profile renderer ----------
  function renderProfileValue(pid, value, labelMap, lang) {
    const cleanPid = pid.replace(/^.*[\/#]/, "");
    if (value == null) return "";

    // Images (P31) and coordinates (P26) use the generic renderer so
    // we keep the existing thumbnail + map behaviour.
    if (cleanPid === "P31" || cleanPid === "P26") {
      const propInfo = window.PROPERTY_INFO?.[cleanPid];
      const datatype = propInfo?.datatype || "String";
      return renderValue(datatype, value, labelMap, lang, cleanPid);
    }

    const qid = normalizeQid(value);
    if (qid) {
      const label = labelMap[qid] || qid;
      if (PROFILE_LINKABLE.has(cleanPid)) {
        const categoryClass = getBox1CategoryClass(pid);
return `<a href="#/item/${qid}" class="box1-link-pill ${categoryClass}">${label}</a>`;

      }
      return label;
    }

    const propInfo = window.PROPERTY_INFO?.[cleanPid];
    const datatype = propInfo?.datatype || "String";
    const dtNorm = normalizeDatatype(datatype);
    const strVal = String(value);

    // Only selected properties are hyperlinkable; for them we reuse
    // the generic renderer so identifier/URL logic is preserved.
    if (PROFILE_LINKABLE.has(cleanPid)) {
      return renderValue(datatype, value, labelMap, lang, cleanPid);
    }

    if (dtNorm === "time") return formatSnarcDate(value);
    if (dtNorm === "quantity") return strVal.replace(/^\+/, "");
    return strVal;
  }

function getBox1CategoryClass(pid) {

  // FAMILY CONNECTIONS
  if (["P56", "P53", "P55", "P54", "P52"].includes(pid)) {
    return "box1-pill-family";
  }

  // PLACES
  if (["P21", "P22", "P20", "P27", "P91", "P38"].includes(pid)) {
    return "box1-pill-place";
  }

  // EDUCATION
  if (pid === "P23") {
    return "box1-pill-education";
  }

  // DEFAULT
  return "box1-pill-default";
}

// =======================================
// === BOX 1 — PROFILE INFORMATION =======
// =======================================

function renderProfileBox(entity, lang, labelMap) {
  const claims = entity.claims || {};
  const rows = [];

  // ----------------------------------------
  // Helper: smart value rendering for Box 1
  // ----------------------------------------
  function formatValue(pid, stmt) {
  const propInfo = window.PROPERTY_INFO?.[pid];
  const datatype = propInfo?.datatype || "String";
  const dtNorm = normalizeDatatype(datatype);

  // Extract raw value
  const raw = Utils.firstValue(stmt);

  // 1. LINKABLE INTERNAL ENTITIES (Q-IDs)
  if (PROFILE_LINKABLE.has(pid)) {
    const qid = normalizeQid(raw);

    if (qid) {
      // Internal entity → pill-button
      const label = labelMap[qid] || qid;
      const categoryClass = getBox1CategoryClass(pid);
      return `<a href="#/item/${qid}" class="box1-link-pill ${categoryClass}">${label}</a>`;
    }

    // External ID fallback → normal identifier logic
    return renderValue(datatype, raw, labelMap, lang, pid);
  }

  // 2. DATE / TIME VALUES
  if (dtNorm === "time") {
    return formatSnarcDateFromSnak(stmt);
  }

  // 3. QIDs (non-linkable)
  if (typeof raw === "string" && /^Q\d+$/i.test(raw)) {
    return labelMap[raw] || raw;
  }

  // 4. Fallback
  return raw;
}

  // ----------------------------------------
  // MERGED BIRTH / DEATH LINES (only for humans)
  // ----------------------------------------
  const isHuman = claims["P7"]?.some(stmt => Utils.firstValue(stmt) === "Q947");

  if (isHuman) {
    // Birth
    const dob = claims["P17"]?.[0] ? formatValue("P17", claims["P17"][0]) : null;
    const pob = claims["P21"]?.[0] ? formatValue("P21", claims["P21"][0]) : null;

    if (dob || pob) {
      const combined = dob && pob ? `${dob}, ${pob}` : (dob || pob);
      rows.push(`<dt>${lang === "cy" ? "Ganed" : "Born"}</dt><dd>${combined}</dd>`);
    }

    // Death
    const dod = claims["P18"]?.[0] ? formatValue("P18", claims["P18"][0]) : null;
    const pod = claims["P22"]?.[0] ? formatValue("P22", claims["P22"][0]) : null;

    if (dod || pod) {
      const combined = dod && pod ? `${dod}, ${pod}` : (dod || pod);
      rows.push(`<dt>${lang === "cy" ? "Bu farw" : "Died"}</dt><dd>${combined}</dd>`);
    }
  }

  // ----------------------------------------
  // STANDARD PROFILE PROPERTIES (trimmed list)
  // ----------------------------------------
  for (const pid of PROFILE_ORDER) {
    if (!claims[pid] || !claims[pid].length) continue;

    const propInfo = window.PROPERTY_INFO?.[pid];
    const label = lang === "cy" ? propInfo?.label_cy : propInfo?.label_en;

    const renderedValues = claims[pid]
  .map(stmt => formatValue(pid, stmt))
  .filter(Boolean);

// Detect if ANY value is a pill (linkable)
const containsPill = renderedValues.some(v =>
  v.includes("box1-link-pill")
);

// Smart-join logic
const values = containsPill
  ? renderedValues.join("")       // pills: no comma
  : renderedValues.join(", ");    // plain text: comma-separated


    if (values) {
      rows.push(`<dt>${label}</dt><dd>${values}</dd>`);
    }
  }

  // ----------------------------------------
  // MINI-MAP (BOTTOM OF BOX 1)
  // ----------------------------------------
  let mapHTML = "";
  if (claims["P26"] && claims["P26"].length) {
    const raw = Utils.firstValue(claims["P26"][0]);
    const [lat, lon] = raw.split(",").map(Number);

    if (!isNaN(lat) && !isNaN(lon)) {
      const mapId = "map-" + Math.random().toString(36).slice(2);

      mapHTML = `
        <div class="profile-map-container">
          <div class="map-thumb"
               data-lat="${lat}"
               data-lon="${lon}"
               data-mapid="${mapId}">
            <div id="${mapId}" class="map-thumb-canvas"></div>
          </div>
        </div>`;
    }
     console.log("Box1 map raw:", raw);

  }


   
  // ----------------------------------------
  // FINAL RENDER
  // ----------------------------------------
  const heading = lang === "cy" ? "Gwybodaeth" : "Information";

  return `
    <div class="profile-box">
      <h3 class="profile-header">${heading}</h3>

      <div class="profile-inner">
        <dl>${rows.join("")}</dl>
      </div>

      ${mapHTML}
    </div>`;
}


function getSnarcIdFromUrl() {
  const hash = window.location.hash || "";
  const match = hash.match(/item\/(Q\d+)/i);
  return match ? match[1] : null;
}


// =======================================
// === BOX 2 — COLLECTIONS & IDENTIFIERS
// =======================================

function renderCollectionsBox(entity, lang, labelMap) {
  const claims = entity.claims || {};
  const groupsHTML = [];

  for (const group of COLLECTION_GROUPS) {
    const sectionRows = [];

    for (const pid of group.pids) {

  // --- SPECIAL CASE: P0 = SNARC WIKIBASE SELF-LINK ---
  if (pid === "P0") {
  const snarcId = getSnarcIdFromUrl();
  if (snarcId) {

    const rowLabel = lang === "cy"
      ? COLLECTION_LABELS["P0"].cy
      : COLLECTION_LABELS["P0"].en;

    const icon = getIdentifierIcon("P0");
    const url  = `https://snarc-llgc.wikibase.cloud/wiki/Item:${snarcId}`;

    sectionRows.push(`
      <dt>${icon} ${rowLabel}</dt>
      <dd>
        <a href="${url}" target="_blank" rel="noopener">
          ${snarcId}
        </a>
      </dd>
    `);
  }
  continue;
}

       
      if (!claims[pid] || !claims[pid].length) continue;

      const info = COLLECTION_LABELS[pid];
      const rowLabel = info ? (lang === "cy" ? info.cy : info.en) : pid;


       
const links = claims[pid]
  .map(stmt => {
    const raw = Utils.firstValue(stmt);

    // ---------- SPECIAL CASE: P102 (Published Works) ----------
    if (pid === "P102") {
      // Try to get the title from qualifier P103
      const qualifierTitle =
        stmt.qualifiers?.P103?.[0]?.datavalue?.value;

      // Build the normal URL using raw value
      if (ID_URL["P102"]) {
        const encoded = encodeURIComponent(String(raw));
        const url = ID_URL["P102"].replace(/\$1/g, encoded);

        // If qualifier exists, use it as the visible label
        if (qualifierTitle && typeof qualifierTitle === "string") {
          return `<a href="${url}" target="_blank" rel="noopener">${qualifierTitle}</a>`;
        }

        // Fallback → original behaviour
        return `<a href="${url}" target="_blank" rel="noopener">${raw}</a>`;
      }

      // Fallback if ID_URL missing
      return qualifierTitle || raw;
    }

    // ---------- DEFAULT HANDLING FOR ALL OTHER PROPERTIES ----------
    if (ID_URL[pid]) {
      const encoded = encodeURIComponent(String(raw));
      const url = ID_URL[pid].replace(/\$1/g, encoded);
      return `<a href="${url}" target="_blank" rel="noopener">${raw}</a>`;
    }

    // Plain value
    return raw;
  })
  .join("<br>");

   
      const icon = window.ID_ICONS.getIdentifierIcon(pid);
sectionRows.push(`<dt>${icon}${rowLabel}</dt><dd>${links}</dd>`);
    }

    if (sectionRows.length) {
      const sectionTitle = lang === "cy" ? group.label_cy : group.label_en;

      groupsHTML.push(`
        <section class="collection-group">
          <h3>${sectionTitle}</h3>
          <dl>${sectionRows.join("")}</dl>
        </section>
      `);
    }
  }

  return `<div class="collections-box">${groupsHTML.join("")}</div>`;
}





// =================================================
// === MASTER RENDERER FOR BOX 1 + BOX 2 LAYOUT ====
// =================================================

function renderBoxes(entity, lang, labelMap) {
  const profile = renderProfileBox(entity, lang, labelMap);
  const collections = renderCollectionsBox(entity, lang, labelMap);

return `
  <div class="box-wrapper-outer">
    <div class="box-wrapper">
      <div class="box-col box-left">${profile}</div>
      <div class="box-col box-right">${collections}</div>
    </div>
  </div>
`;
}


  // ---------- Generic entity render ----------
  async function renderGeneric(entity, lang, labelMap = {}) {
    if (!entity) return `<p>Entity not found.</p>`;

    const title = entity.labels?.[lang]?.value || entity.labels?.en?.value || entity.id;
    const desc  = entity.descriptions?.[lang]?.value || entity.descriptions?.en?.value || "";
    const claims = entity.claims || {};

    // --- Human / family detection ------------------------------------
    // Determine if entity is human (P7 = Q947 in your SNARC)
    const isHuman = (claims["P7"] || []).some(stmt => {
      const v = Utils.firstValue(stmt);
      if (typeof v === "string") return v === "Q947";
      if (v && typeof v === "object" && v.id) return v.id === "Q947";
      return false;
    });
    window.currentIsHuman = isHuman;

    // Determine if entity has any family relationships (SNARC properties)
    const hasFamily =
      (claims["P53"] && claims["P53"].length) ||   // father
      (claims["P55"] && claims["P55"].length) ||   // mother
      (claims["P52"] && claims["P52"].length) ||   // sibling
      (claims["P56"] && claims["P56"].length) ||   // spouse
      (claims["P54"] && claims["P54"].length);     // child

    window.currentHasFamily = hasFamily;

    // --- Extract Wikidata ID from P62 (URI or QID) -------------------
    let wikidataId = null;

    if (claims["P62"] && claims["P62"].length) {
      const raw = Utils.firstValue(claims["P62"][0]); // string or object
      let v = raw;

      // If value is an object: use .id
      if (typeof raw === "object" && raw?.id) {
        v = raw.id;
      }

      // If it's a Wikidata URL or string: extract QID
      if (typeof v === "string") {
        const match = v.match(/Q\d+/i);
        if (match) {
          wikidataId = match[0]; // e.g. "Q13127787"
        }
      }
    }

    window.currentWikidataId = wikidataId;

    // --- IIIF image gallery (P50) ------------------------------------
    let galleryHTML = "";
    const mediaStmts = claims["P50"];

    if (mediaStmts && mediaStmts.length) {
      const buildThumbHTML = (thumbUrl, rootUrl, id, isMulti = false) => {
        const iconHTML = isMulti
          ? `<span class="multi-icon" title="Multiple images">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#444">
                <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke="#444" stroke-width="1.5" fill="none"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="#444" stroke-width="1.5"/>
                <line x1="3" y1="13" x2="21" y2="13" stroke="#444" stroke-width="1.5"/>
              </svg>
            </span>`
          : "";
        return `
          <a href="${rootUrl}" target="_blank" rel="noopener" class="gallery-item" title="View image ${id}">
            <div class="thumb-wrapper">
              <img src="${thumbUrl}" alt="Image ${id}" loading="lazy">
              ${iconHTML}
            </div>
          </a>`;
      };

      const imagePromises = mediaStmts.map(async stmt => {
        const v = Utils.firstValue(stmt);
        if (!v || typeof v !== "string") return "";

        const idMatch = v.match(/(\d{6,})/);
        if (!idMatch) return "";
        const baseId = parseInt(idMatch[1], 10);
        const isMulti = baseId >= 1448577 && baseId <= 1588867;
        const imageId = isMulti ? baseId + 1 : baseId;

        // Two IIIF patterns – fallback logic
        return new Promise(resolve => {
          const baseUrl1 = `https://damsssl.llgc.org.uk/iiif/image/${imageId}/full/300,/0/default.jpg`;
          const baseUrl2 = `https://damsssl.llgc.org.uk/iiif/2.0/image/${imageId}/full/300,/0/default.jpg`;
          const rootUrl = `https://viewer.library.wales/${baseId}`;

          const tryLoad = (urlList) => {
            if (!urlList.length) return resolve(""); // all attempts failed
            const url = urlList.shift();
            const img = new Image();
            img.onload  = () => resolve(buildThumbHTML(url, rootUrl, imageId, isMulti));
            img.onerror = () => tryLoad(urlList); // try next pattern
            img.src = url;
          };

          tryLoad([baseUrl1, baseUrl2]);
        });
      });

      const images = await Promise.all(imagePromises);
      const validImages = images.filter(Boolean);
      if (validImages.length) {
        galleryHTML = `<div class="gallery">${validImages.join("")}</div>`;
      }
    } // end mediaStmts check

    // --- Profile + collections tiles ---------------------------------
const tilesHTML = renderBoxes(entity, lang, labelMap);


    // --- HTML layout -------------------------------------------------
    return `
      <section class="card entity-layout">
        ${renderHeroHeader(entity, lang, labelMap)}

  <!-- DESKTOP VERSION (unchanged) -->
<div class="desktop-layout">
  ${tilesHTML}
  ${isHuman ? `<div id="familyChartContainer" class="family-tree-container"></div>` : ""}
  ${galleryHTML}
</div>

<!-- MOBILE VERSION — RIBBON SECTIONS -->
<div class="mobile-layout">

  <!-- BOX 1 — INFORMATION -->
  <div class="mobile-section" 
       data-section-type="info"
       data-title-en="Information"
       data-title-cy="Gwybodaeth">
  </div>

  <!-- BOX 2 — COLLECTIONS -->
  <div class="mobile-section" 
       data-section-type="collections"
       data-title-en="Collections"
       data-title-cy="Casgliadau">
  </div>

  <!-- FAMILY TREE -->
  ${isHuman ? `
    <div class="mobile-section" 
         data-section-type="family"
         data-title-en="Family Tree"
         data-title-cy="Coeden deulu">
      <div id="mobileFamilyTreeProxy"></div>
    </div>
  ` : ""}

  <!-- IMAGES -->
  <div class="mobile-section" 
       data-section-type="images"
       data-title-en="Images"
       data-title-cy="Delweddau">
  </div>

</div>
    

  

      </section>`;
  }

  // ---------- Family tree iframe injection ----------
  function injectFamilyTree(wikidataId, lang) {
    console.log("DEBUG injectFamilyTree CALLED:", { wikidataId, lang });
    const container = document.getElementById("familyChartContainer");
    if (!container || !wikidataId) return;

    container.innerHTML = "";

    const treeUrl = `https://jasonnlw.github.io/entitree/embed.html?item=${wikidataId}&lang=${lang}`;

    container.innerHTML = `
      <div class="family-tree-wrapper">
        <iframe
          src="${treeUrl}"
          class="family-tree-iframe"
          loading="lazy"
          frameborder="0"
          style="width:100vw; max-width:100%; display:block; border:0;"
        ></iframe>
      </div>`;
  }

  // ---------- Post-render ----------
  function postRender() {
    // --- Family tree injection (runs AFTER DOM is rendered) ----------
    const treeContainer = document.getElementById("familyChartContainer");
    if (treeContainer) {
      const isHuman   = window.currentIsHuman;
      const hasFamily = window.currentHasFamily;
      const wikidataId = window.currentWikidataId;
      const lang = Utils.getLang();

      if (isHuman && hasFamily && wikidataId) {
        injectFamilyTree(wikidataId, lang);
      } else {
        treeContainer.innerHTML = "";
      }
    }

   // =====================================================================
// MOBILE COLLAPSIBLE SECTIONS (Unified Ribbon System)
// =====================================================================
(function setupMobileRibbonSystem() {
  // Desktop unaffected
  if (window.innerWidth > 768) return;

  const desktopRoot = document.querySelector(".desktop-layout");
  if (!desktopRoot) return;

  // DESKTOP CONTENT SOURCES
  const boxLeft       = desktopRoot.querySelector(".box-left");
  const boxRight      = desktopRoot.querySelector(".box-right");
  const treeDesktop   = desktopRoot.querySelector("#familyChartContainer");
  const galleryDesktop = desktopRoot.querySelector(".gallery");

  // MOBILE TARGETS
  const sections = document.querySelectorAll(".mobile-section");
  const lang = Utils.getLang();

  sections.forEach(sec => {
    if (sec.dataset.mobileInit === "1") return;
    sec.dataset.mobileInit = "1";

    const type = sec.dataset.sectionType;

    // Inject the correct content depending on type
    if (type === "info" && boxLeft) {
      sec.appendChild(boxLeft.cloneNode(true));
    }

    if (type === "collections" && boxRight) {
      sec.appendChild(boxRight.cloneNode(true));
    }

    if (type === "family" && treeDesktop) {
      const proxy = sec.querySelector("#mobileFamilyTreeProxy");
      if (proxy) {
        proxy.replaceWith(treeDesktop.cloneNode(true));
      }
    }

    if (type === "images" && galleryDesktop) {
      sec.appendChild(galleryDesktop.cloneNode(true));
    }

    // LABEL
    const label = (lang === "cy"
      ? sec.dataset.titleCy
      : sec.dataset.titleEn);

    // Ribbon button
    const btn = document.createElement("button");
    btn.className = `mobile-section-toggle mobile-toggle-${type}`;
    btn.textContent = label;

    // Insert ribbon before section
    sec.parentNode.insertBefore(btn, sec);

    // Default collapsed
    sec.style.display = "none";

btn.addEventListener("click", () => {
  const wasOpen = sec.style.display !== "none";
  const nowOpen = !wasOpen;

  // Toggle visibility
  sec.style.display = nowOpen ? "block" : "none";
  btn.classList.toggle("open", nowOpen);

  // 🔹 If the section has just been opened, refresh any Leaflet maps inside it
  if (nowOpen && typeof L !== "undefined") {
    // Let the browser apply the new layout first
    setTimeout(() => {
      const mapContainers = sec.querySelectorAll(".leaflet-container");
      mapContainers.forEach(container => {
        const map = container._leafletMap;
        if (map && typeof map.invalidateSize === "function") {
          map.invalidateSize();
        }
      });
    }, 50);
  }
});

  });
})();
  


    // --- Map logic (only if Leaflet is loaded) -----------------------
    if (typeof L !== "undefined") {

      // Create modal if it doesn't already exist
      let modal = document.getElementById("map-modal");
      if (!modal) {
        document.body.insertAdjacentHTML("beforeend", `
          <div id="map-modal" class="map-modal" style="display:none">
            <div class="map-modal-content">
              <div id="map-large" class="map-large"></div>
              <button id="map-close" class="map-close" aria-label="Close">&times;</button>
            </div>
          </div>`);
        document.getElementById("map-close").onclick = () =>
          (document.getElementById("map-modal").style.display = "none");
        document.getElementById("map-modal").addEventListener("click", e => {
          if (e.target.id === "map-modal") e.currentTarget.style.display = "none";
        });
      }

// Initialize all mini-maps on the page
const root =
  (window.innerWidth <= 768
    ? document.querySelector(".mobile-layout")
    : document.querySelector(".desktop-layout")) || document;

root.querySelectorAll(".map-thumb").forEach(thumb => {
  const lat = parseFloat(thumb.dataset.lat);
  const lon = parseFloat(thumb.dataset.lon);
  const mapId = thumb.dataset.mapid;
  if (!isFinite(lat) || !isFinite(lon)) return;

  // Look for the map only inside the active layout
  const mapDiv = root.querySelector(`#${mapId}`);
  if (!mapDiv || mapDiv.dataset.initialized) return;

  // Small static map
    // Small static map
  const map = L.map(mapId, {
    center: [lat, lon],
    zoom: 13,
    scrollWheelZoom: false,
    dragging: false,
    zoomControl: false,
    attributionControl: false
  });

  // 🔹 Store the map instance on its container
  mapDiv._leafletMap = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  L.marker([lat, lon]).addTo(map);
  mapDiv.dataset.initialized = "true";


  // Click → open modal with large map
  thumb.style.cursor = "pointer";
  thumb.addEventListener("click", () => {
    const modal = document.getElementById("map-modal");
    modal.style.display = "flex";
    setTimeout(() => {
      const largeMap = L.map("map-large", {
        center: [lat, lon],
        zoom: 15
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
        .addTo(largeMap);
      L.marker([lat, lon]).addTo(largeMap);
    }, 100);
  });
}); // end forEach
    } // end Leaflet guard
  }

  // ---------- Exports ----------
  return { renderGeneric, postRender };

})(); // end window.Templates IIFE
