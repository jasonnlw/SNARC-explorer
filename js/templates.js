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
  const normalizeQid = value => (value && /Q\d+/i.test(value)) ? value.match(/Q\d+/i)[0].toUpperCase() : null;
  const normalizeDatatype = dt => dt ? String(dt).toLowerCase().replace(/_/g, "-").replace(/\s+/g, "") : "";

  // ---------- Value renderer ----------
  function renderValue(datatype, value, labelMap, lang, pid) {
    if (value == null) return "";

    // QID links
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
      const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`;
      const filePage = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;
      return `<a href="${filePage}" target="_blank" rel="noopener">
                <img src="${thumbUrl}" alt="${filename}" loading="lazy"
                     style="max-width:300px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.15);margin:4px;">
              </a>`;
    }

    // 🗺️ Coordinates (globe-coordinate or P26)
    if (dtNorm === "globe-coordinate" || pid === "P26") {
      let lat, lon;
      if (typeof value === "string" && value.includes(",")) {
        const [latStr, lonStr] = value.split(",");
        lat = Number(latStr);
        lon = Number(lonStr);
      } else if (typeof value === "object" && "latitude" in value && "longitude" in value) {
        lat = value.latitude;
        lon = value.longitude;
      } else if (typeof value === "string" && value.includes("/")) {
        const parts = value.split(/[\/,]/);
        lat = Number(parts[0].replace(/[^\d.-]/g, ""));
        lon = Number(parts[1].replace(/[^\d.-]/g, ""));
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

    // 🔗 URLs
    if (dtNorm === "url") {
      const v = String(value).trim();
      return `<a href="${v}" target="_blank" rel="noopener">${v}</a>`;
    }

    // ⏱ Times / quantities
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
function renderGeneric(entity, lang, labelMap = {}) {
  if (!entity) return `<p>Entity not found.</p>`;

  const title = entity.labels?.[lang]?.value || entity.labels?.en?.value || entity.id;
  const desc  = entity.descriptions?.[lang]?.value || entity.descriptions?.en?.value || "";
  const claims = entity.claims || {};

  // --- 📍 Extract coordinates (P26) ---
  let mapHTML = "";
  const coordStmts = claims["P26"];
  if (coordStmts && coordStmts.length) {
    const first = coordStmts[0];
    const snak = first.mainsnak;
    const dv = snak?.datavalue;
    let lat = null, lon = null;

    if (dv?.type === "globecoordinate" && dv.value) {
      lat = dv.value.latitude;
      lon = dv.value.longitude;
    }

    if (isFinite(lat) && isFinite(lon)) {
      const id = `map-${Math.random().toString(36).slice(2)}`;
      mapHTML = `
        <div class="map-thumb" data-lat="${lat}" data-lon="${lon}" data-mapid="${id}">
          <div id="${id}" class="map-thumb-canvas"></div>
        </div>`;
    }
  }

  // --- 🖼️ Extract IIIF images (P50) ---
  // --- 🖼️ NLW IIIF image gallery (P50) ---
let galleryHTML = "";
const mediaStmts = claims["P50"];
if (mediaStmts && mediaStmts.length) {
  const images = mediaStmts.map(stmt => {
    const v = Utils.firstValue(stmt);
    if (!v || typeof v !== "string") return "";

    // Expect values like "10107/1127631"
    const parts = v.split("/");
    const handle = parts.join("/");
    const id = parts[1];
    if (!id) return "";

    const manifestUrl = `https://damsssl.llgc.org.uk/iiif/2.0/${id}/manifest.json`;
    const thumbUrl = `https://damsssl.llgc.org.uk/iiif/2.0/image/${id}/full/,300/0/default.jpg`;
    const rootUrl = `https://hdl.handle.net/${handle}`;

    return `
      <a href="${rootUrl}" target="_blank" rel="noopener" class="gallery-item" title="View image ${id}">
        <img src="${thumbUrl}" alt="Image ${id}" loading="lazy" onerror="this.style.display='none'">
      </a>`;
  }).filter(Boolean);

  if (images.length) {
    galleryHTML = `
      <div class="gallery">
        ${images.join("")}
      </div>`;
  }
}

  // --- Build property rows (exclude P26 & P50) ---
  const rows = Object.keys(claims)
    .filter(pid => !["P26", "P50", "P52", "P53", "P54", "P55", "P56"].includes(pid))

    .map(pid => renderClaimRow(pid, claims[pid], labelMap, lang));

  return `
  <section class="card">
    <h2>${title}</h2>
    ${desc ? `<p>${desc}</p>` : ""}
    ${mapHTML}
    ${galleryHTML}

    <!-- 🧬 Family Tree Container -->
    <div id="family-tree" class="family-tree-container"></div>

    <table class="wikidata"><tbody>${rows.join("")}</tbody></table>
  </section>
`;

}

  // ---------- Leaflet map initializer ----------
  function postRender() {
    console.log("✅ postRender triggered");
    if (typeof L === "undefined") return;

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

    document.querySelectorAll(".map-thumb").forEach(el => {
      const lat = Number(el.dataset.lat);
      const lon = Number(el.dataset.lon);
      const id  = el.dataset.mapid;
      const canvas = document.getElementById(id);
      if (!canvas) return;

      canvas.style.width = "300px";
      canvas.style.height = "200px";
      canvas.style.borderRadius = "8px";
      canvas.style.boxShadow = "0 2px 5px rgba(0,0,0,0.15)";
      canvas.style.margin = "4px";

      const map = L.map(id, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
      }).setView([lat, lon], 9);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      L.marker([lat, lon]).addTo(map);
      setTimeout(() => map.invalidateSize(), 100);

      el.addEventListener("click", () => {
        const modalEl = document.getElementById("map-modal");
        modalEl.style.display = "block";
        const largeContainer = document.getElementById("map-large");
        largeContainer.innerHTML = "";
        const bigMap = L.map("map-large").setView([lat, lon], 13);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(bigMap);
        L.marker([lat, lon]).addTo(bigMap);
        setTimeout(() => bigMap.invalidateSize(), 100);
});
      // 🧬 Always render the family tree after maps are drawn
const qidMatch = location.hash.match(/Q\d+/);
if (qidMatch) {
  const qid = qidMatch[0];
  console.log("FamilyTree: building for", qid);
  renderFamilyTree(qid, Utils.getLang()).then(tree => {
    console.log("FamilyTree result:", tree);
    drawFamilyTree(tree);
  });

}

      });
    });
  }
// ---------- 🧬 Family tree generator (fixed) ----------
async function renderFamilyTree(rootQid, lang = "en", depth = 0, maxDepth = 5, visited = new Set()) {
  if (depth > maxDepth || visited.has(rootQid)) return null;
  visited.add(rootQid);

  // ✅ FIX: API.getEntities already returns { [qid]: entity }, so no extra nesting
  const entities = await API.getEntities(rootQid, lang);
  const entity = entities ? entities[rootQid] : null;
  if (!entity) {
    console.warn("FamilyTree: entity not found for", rootQid);
    return null;
  }

  const label = entity.labels?.[lang]?.value || entity.labels?.en?.value || rootQid;
  const claims = entity.claims || {};

  // Extract birth & death years
  const birth = Utils.formatTime(Utils.firstValue(claims["P17"]?.[0])) || "";
  const death = Utils.formatTime(Utils.firstValue(claims["P18"]?.[0])) || "";
  const dates = birth || death ? `(${birth}–${death})` : "";

  // Thumbnail (P31 or P50)
  let thumb = "";
  const imgClaim = claims["P31"]?.[0] || claims["P50"]?.[0];
  if (imgClaim) {
    const v = Utils.firstValue(imgClaim);
    if (typeof v === "string" && v.includes("/")) {
      const id = v.split("/")[1];
      thumb = `<img src="https://damsssl.llgc.org.uk/iiif/2.0/image/${id}/full/,150/0/default.jpg" alt="${label}">`;
    }
  }

  const node = {
    id: rootQid,
    label,
    dates,
    thumb,
    parents: [],
    children: []
  };

  // 🔼 Parents (P53 father, P55 mother)
  for (const pid of ["P53", "P55"]) {
    const rels = claims[pid] || [];
    for (const stmt of rels) {
      const q = Utils.firstValue(stmt);
      if (q && /^Q\d+$/.test(q)) {
        const parentNode = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
        if (parentNode) node.parents.push(parentNode);
      }
    }
  }

  // 🔽 Children (P54)
  const children = claims["P54"] || [];
  for (const stmt of children) {
    const q = Utils.firstValue(stmt);
    if (q && /^Q\d+$/.test(q)) {
      const childNode = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
      if (childNode) node.children.push(childNode);
    }
  }

  return node;
}

// ---------- Draw family tree ----------
function drawFamilyTree(treeData) {
  const container = document.getElementById("family-tree");
  if (!container || !treeData) return;

  // Basic recursive layout (simplified)
  const createNodeHTML = (node) => {
    const children = node.children.map(createNodeHTML).join("");
    const parents = node.parents.map(createNodeHTML).join("");
    return `
      <div class="tree-node">
        <div class="person-card">
          ${node.thumb || ""}
          <div class="person-label">${node.label}</div>
          <div class="person-dates">${node.dates}</div>
        </div>
        <div class="tree-parents">${parents}</div>
        <div class="tree-children">${children}</div>
      </div>
    `;
  };

  container.innerHTML = `<div class="tree-root">${createNodeHTML(treeData)}</div>`;
}

// ✅ Export all tree-related functions too
return { renderGeneric, postRender, renderFamilyTree, drawFamilyTree };
})();

