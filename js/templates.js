/* ===============================================================
   SNARC Explorer Templates.js – fully corrected version (2025)
   =============================================================== */

window.Templates = (() => {

// ---------- Identifier URL patterns ----------
  const ID_URL = {
    P10: "https://viaf.org/viaf/$1",
    P102: "https://id.library.wales/$1",
    P107: "https://id.library.wales/$1",
    P108: "https://snarc-llgc.wikibase.cloud/wiki/$1",
    P11: "https://id.loc.gov/authorities/$1",
    P12: "https://archives.library.wales/index.php/$1",
    P5: "https://biography.wales/article/$1",
    P6: "https://bywgraffiadur.cymru/article/$1",
    P68: "https://cadwpublic-api.azurewebsites.net/reports/listedbuilding/FullReport?id=$1",
    P69: "https://coflein.gov.uk/en/site/$1",
    P8: "https://id.loc.gov/vocabulary/iso639-1/$1",
    P83: "https://historicplacenames.rcahmw.gov.uk/placenames/recordedname/$1",
    P9: "https://isni.oclc.org/xslt/DB=1.2/CMD?ACT=SRCH&IKT=8006&TRM=ISN%3A$1",
    P91: "https://www.comisiynyddygymraeg.cymru/rhestr-enwau-lleoedd-safonol-cymru/$1",
    P97: "https://discovery.nationalarchives.gov.uk/details/c/$1"
  };

  // ---------- Helpers ----------
  const normalizeQid = value =>
    (value && /Q\d+/i.test(value)) ? value.match(/Q\d+/i)[0].toUpperCase() : null;
  const normalizeDatatype = dt =>
    dt ? String(dt).toLowerCase().replace(/_/g, "-").replace(/\s+/g, "") : "";

  function extractQidFromSnak(stmt) {
    // Try Utils.firstValue if available
    if (typeof Utils?.firstValue === "function") {
      const v = Utils.firstValue(stmt);
      if (typeof v === "string" && /^Q\d+$/i.test(v)) return v;
    }
    // Common Wikibase shapes
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

  // ---------- Value renderer ----------
  function renderValue(datatype, value, labelMap, lang, pid) {
    if (value == null) return "";

    const qid = normalizeQid(value);
    if (qid) {
      const label = labelMap[qid] || qid;
      return `<a href="#/item/${qid}">${label}</a>`;
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

  // ---------- Property rows ----------
  function renderClaimRow(pid, statements, labelMap, lang) {
    const cleanPid = pid.replace(/^.*[\/#]/, "");
    const propInfo = window.PROPERTY_INFO?.[cleanPid];
    const label = propInfo
      ? (lang === "cy" && propInfo.label_cy ? propInfo.label_cy : propInfo.label_en)
      : cleanPid;
    const datatype = propInfo?.datatype || "String";

    const values = statements
      .map(stmt => Utils.firstValue(stmt))
      .filter(v => v !== undefined)
      .map(v => renderValue(datatype, v, labelMap, lang, cleanPid))
      .join(", ");

    return `<tr><th>${label}</th><td>${values}</td></tr>`;
  }

  // ---------- Generic entity render ----------
  async function renderGeneric(entity, lang, labelMap = {}) {
    if (!entity) return `<p>Entity not found.</p>`;

    const title = entity.labels?.[lang]?.value || entity.labels?.en?.value || entity.id;
    const desc = entity.descriptions?.[lang]?.value || entity.descriptions?.en?.value || "";
    const claims = entity.claims || {};

    // --- Coordinates (P26) ---
    let mapHTML = "";
    const coordStmts = claims["P26"];
    if (coordStmts && coordStmts.length) {
      const dv = coordStmts[0]?.mainsnak?.datavalue;
      if (dv?.type === "globecoordinate" && dv.value) {
        const { latitude: lat, longitude: lon } = dv.value;
        if (isFinite(lat) && isFinite(lon)) {
          const id = `map-${Math.random().toString(36).slice(2)}`;
          mapHTML = `
            <div class="map-thumb" data-lat="${lat}" data-lon="${lon}" data-mapid="${id}">
              <div id="${id}" class="map-thumb-canvas"></div>
            </div>`;
        }
      }
    }

    // --- IIIF image gallery (P50) ---
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

        // Extract numeric ID (6+ digits)
        const idMatch = v.match(/(\d{6,})/);
        if (!idMatch) return "";
        const baseId = parseInt(idMatch[1], 10);

        // --- 1️⃣ Identify multi-image collections by numeric range ---
        const isMulti = baseId >= 1448577 && baseId <= 1588867;

        // --- 2️⃣ For multi-image, use +1 child image; otherwise base ID ---
        const imageId = isMulti ? baseId + 1 : baseId;

        // Build IIIF URL (always /iiif/image/)
        const thumbUrl = `https://damsssl.llgc.org.uk/iiif/image/${imageId}/full/300,/0/default.jpg`;
        const rootUrl = `https://viewer.library.wales/${baseId}`;

        // --- 3️⃣ Check image availability ---
        return new Promise(resolve => {
          const testImg = new Image();
          testImg.onload = () => resolve(buildThumbHTML(thumbUrl, rootUrl, imageId, isMulti));
          testImg.onerror = () => resolve(""); // remove failed images entirely
          testImg.src = thumbUrl;
        });
      });

      const images = await Promise.all(imagePromises);
      const validImages = images.filter(Boolean);
      if (validImages.length) {
        galleryHTML = `<div class="gallery">${validImages.join("")}</div>`;
      }
    }

    // --- Property table (exclude family/map/media props) ---
    const rows = Object.keys(claims)
      .filter(pid => !["P26","P50","P52","P53","P54","P55","P56"].includes(pid))
      .map(pid => renderClaimRow(pid, claims[pid], labelMap, lang));

    return `
      <section class="card">
        <h2>${title}</h2>
        ${desc ? `<p>${desc}</p>` : ""}
        ${mapHTML}
        ${galleryHTML}

        <div id="family-tree" class="family-tree-container">
          <div class="tree-root"></div>
          <svg id="tree-lines" class="tree-lines"></svg>
        </div>

        <table class="wikidata"><tbody>${rows.join("")}</tbody></table>
      </section>`;
  }

 

  // ---------- Post-render ----------
  function postRender() {
    // Leaflet mini-map handling
    if (typeof L !== "undefined") {
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

      // Initialize mini-maps
      document.querySelectorAll(".map-thumb").forEach(thumb => {
        const lat = parseFloat(thumb.dataset.lat);
        const lon = parseFloat(thumb.dataset.lon);
        const mapId = thumb.dataset.mapid;
        if (!isFinite(lat) || !isFinite(lon)) return;

        const mapDiv = document.getElementById(mapId);
        if (!mapDiv || mapDiv.dataset.initialized) return;

        const map = L.map(mapId, {
          center: [lat, lon],
          zoom: 13,
          scrollWheelZoom: false,
          dragging: false,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        L.marker([lat, lon]).addTo(map);
        mapDiv.dataset.initialized = "true";

        thumb.style.cursor = "pointer";
        thumb.addEventListener("click", () => {
          const modal = document.getElementById("map-modal");
          modal.style.display = "flex";
          setTimeout(() => {
            const largeMap = L.map("map-large", { center: [lat, lon], zoom: 15 });
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(largeMap);
            L.marker([lat, lon]).addTo(largeMap);
          }, 100);
        });
      });
    }

        });
      }
    }
  }

  // ---------- Exports ----------
  return { renderGeneric, postRender, renderFamilyTree, drawFamilyTree };

})(); // end window.Templates IIFE
