/* ===============================================================
   SNARC Explorer Templates.js – cleaned + ready for family tree
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
    P62:  "https://www.wikidata.org/wiki/$1",
    P2:  "https://www.wikidata.org/wiki/$1" 
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

   
  // ---------- Value renderer ----------
  function renderValue(datatype, value, labelMap, lang, pid) {
    if (value == null) return "";

     // Force some properties to use ID_URL even if value is a QID
if (ID_URL[pid]) {
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

    // 🔗 Identifier links
    if (ID_URL[pid]) {
      const encoded = encodeURIComponent(String(value).trim());
      const url = ID_URL[pid].replace(/\$1/g, encoded);
      return `<a href="${url}" target="_blank" rel="noopener">${String(value)}</a>`;
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
    "P7","P45","P13","P17","P21","P18",
    "P24","P22","P20","P25","P23",
    "P56","P53","P55","P54","P52",
    "P76","P78","P81","P28","P72","P73",
    "P27","P38","P63","P66","P70","P71",
    "P65","P64","P88","P77","P79",
    "P40","P41","P46","P47","P87","P89","P93","P95","P96",
    "P31" // image
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
      pids: ["P12","P102","P108","P5","P6","P90"],
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
        return `<a href="#/item/${qid}">${label}</a>`;
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

  function renderProfileBox(claims, labelMap, lang) {
    const items = [];

    for (const pid of PROFILE_ORDER) {
      const stmts = claims[pid];
      if (!stmts || !stmts.length) continue;

      const cleanPid = pid.replace(/^.*[\/#]/, "");
      const propInfo = window.PROPERTY_INFO?.[cleanPid];
      const label = propInfo
        ? (lang === "cy" && propInfo.label_cy ? propInfo.label_cy : propInfo.label_en)
        : cleanPid;

      if (!label) continue;

const values = stmts
  .map(stmt => {
    const propInfo = window.PROPERTY_INFO?.[cleanPid];
    const datatype = propInfo?.datatype || "String";

    // precision-aware date handling
    if (datatype === "time" || normalizeDatatype(datatype) === "time") {
      return formatSnarcDateFromSnak(stmt);
    }

    const v = Utils.firstValue(stmt);
    return renderProfileValue(cleanPid, v, labelMap, lang);
  })
  .filter(v => v !== undefined && v !== null && v !== "")
  .join(", ");

      if (!values) continue;

      items.push(`<dt>${label}</dt><dd>${values}</dd>`);
    }

    if (!items.length) return "";

    const heading = lang === "cy" ? "Manylion" : "Details";

    return `
      <div class="entity-tile entity-vals">
        <h3>${heading}</h3>
        <dl>
          ${items.join("\n")}
        </dl>
      </div>`;
  }

  // ---------- Box 2: Collections & identifiers ----------
  function renderCollectionsBox(claims, labelMap, lang) {
    const sections = [];

    for (const group of COLLECTION_GROUPS) {
      const rows = [];

      for (const pid of group.pids) {
        const stmts = claims[pid];
        if (!stmts || !stmts.length) continue;

        const labels = COLLECTION_LABELS[pid] || {};
        const rowLabel = lang === "cy"
          ? (labels.cy || labels.en || pid)
          : (labels.en || labels.cy || pid);

        const propInfo = window.PROPERTY_INFO?.[pid];
        const datatype = propInfo?.datatype || "String";

        const values = stmts
          .map(stmt => Utils.firstValue(stmt))
          .filter(v => v !== undefined && v !== null && v !== "")
          .map(v => renderValue(datatype, v, labelMap, lang, pid))
          .join(", ");

        if (!values) continue;

        rows.push(`<dt>${rowLabel}</dt><dd>${values}</dd>`);
      }

      if (!rows.length) continue;

      const title = lang === "cy" ? group.label_cy : group.label_en;

      sections.push(`
        <div class="collection-section">
          <div class="collection-section-title">${title}</div>
          <dl>
            ${rows.join("\n")}
          </dl>
        </div>
      `);
    }

    if (!sections.length) return "";

    const heading = lang === "cy"
      ? "Casgliadau a dynodwyr"
      : "Collections & identifiers";

    return `
      <div class="entity-tile entity-vals">
        <h3>${heading}</h3>
        ${sections.join("\n")}
      </div>`;
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
    const profileBoxHTML = renderProfileBox(claims, labelMap, lang);
    const collectionsBoxHTML = renderCollectionsBox(claims, labelMap, lang);

    const tilesHTML = (profileBoxHTML || collectionsBoxHTML)
      ? `
        <div class="entity-two-col">
          ${profileBoxHTML || ""}
          ${collectionsBoxHTML || ""}
        </div>`
      : "";

    // --- HTML layout -------------------------------------------------
    return `
      <section class="card entity-layout">
        <h2>${title}</h2>
        ${desc ? `<p>${desc}</p>` : ""}

        ${tilesHTML}

        <!-- 2. Family tree (only for humans; content injected in postRender) -->
        ${isHuman ? `
          <div id="familyChartContainer" class="family-tree-container"></div>
        ` : ""}

        <!-- 4. IIIF image gallery -->
        ${galleryHTML}

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
      document.querySelectorAll(".map-thumb").forEach(thumb => {
        const lat = parseFloat(thumb.dataset.lat);
        const lon = parseFloat(thumb.dataset.lon);
        const mapId = thumb.dataset.mapid;
        if (!isFinite(lat) || !isFinite(lon)) return;

        const mapDiv = document.getElementById(mapId);
        if (!mapDiv || mapDiv.dataset.initialized) return;

        // Small static map
        const map = L.map(mapId, {
          center: [lat, lon],
          zoom: 13,
          scrollWheelZoom: false,
          dragging: false,
          zoomControl: false,
          attributionControl: false
        });

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
            const largeMap = L.map("map-large", { center: [lat, lon], zoom: 15 });
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
