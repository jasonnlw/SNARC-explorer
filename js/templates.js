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
  
// ---------- Generic entity render (UNCHANGED logic; adds SVG holder) ----------
function renderGeneric(entity, lang, labelMap = {}) {
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
    const images = mediaStmts.map(stmt => {
      const v = Utils.firstValue(stmt);
      if (!v || typeof v !== "string") return "";
      const parts = v.split("/");
      const handle = parts.join("/");
      const id = parts[1];
      if (!id) return "";
      const thumbUrl = `https://damsssl.llgc.org.uk/iiif/2.0/image/${id}/full/,300/0/default.jpg`;
      const rootUrl  = `https://hdl.handle.net/${handle}`;
      return `<a href="${rootUrl}" target="_blank" rel="noopener" class="gallery-item" title="View image ${id}">
                <img src="${thumbUrl}" alt="Image ${id}" loading="lazy" onerror="this.style.display='none'">
              </a>`;
    }).filter(Boolean);
    if (images.length) galleryHTML = `<div class="gallery">${images.join("")}</div>`;
  }

  // --- Property table (exclude map/media/family props) ---
  const rows = Object.keys(claims)
    .filter(pid => !["P26","P50","P52","P53","P54","P55","P56"].includes(pid))
    .map(pid => renderClaimRow(pid, claims[pid], labelMap, lang));

  return `
    <section class="card">
      <h2>${title}</h2>
      ${desc ? `<p>${desc}</p>` : ""}
      ${mapHTML}
      ${galleryHTML}

      <!-- Family tree container + SVG overlay -->
      <div id="family-tree" class="family-tree-container">
        <div class="tree-root"></div>
        <svg id="tree-lines" class="tree-lines"></svg>
      </div>

      <table class="wikidata"><tbody>${rows.join("")}</tbody></table>
    </section>`;
}


// ---------- Post-render (maps as you had + family tree build/redraw) ----------
function postRender() {
  // existing Leaflet map code (unchanged)
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

    document.querySelectorAll(".map-thumb").forEach(el => {
      const lat = Number(el.dataset.lat);
      const lon = Number(el.dataset.lon);
      const id = el.dataset.mapid;
      const canvas = document.getElementById(id);
      if (!canvas) return;
      canvas.style.width = "300px";
      canvas.style.height = "200px";
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
    });
  }

  // Build + draw family tree
  const qidMatch = location.hash.match(/Q\d+/);
  if (!qidMatch) return;
  const qid = qidMatch[0];

  renderFamilyTree(qid, Utils.getLang()).then(tree => {
    drawFamilyTree(tree);

    // re-draw connectors after layout settles + on resize
    const redraw = () => drawFamilyTree(tree);
    requestAnimationFrame(redraw);
    window.addEventListener("resize", redraw, { once: true });
  });
}


// ---------- Family tree: fetch data (gender, dates, thumb) ----------
async function renderFamilyTree(rootQid, lang = "en", depth = 0, maxDepth = 5, visited = new Set()) {
  if (!rootQid || !/^Q\d+$/i.test(rootQid)) return null;  // ✅ ensure valid QID
  if (depth > maxDepth || visited.has(rootQid)) return null;
  visited.add(rootQid);

  if (typeof API === "undefined" || !API.getEntities) {
  console.warn("API not ready when renderFamilyTree called", rootQid);
  return null;
}

let fetchedEntities;
try {
  fetchedEntities = await API.getEntities(rootQid, lang);
} catch (e) {
  console.warn("FamilyTree: failed to fetch entity", rootQid, e);
  return null;
}

const entity = fetchedEntities ? fetchedEntities[rootQid] : null;


  if (!entity) return null;

  const label  = entity.labels?.[lang]?.value || entity.labels?.en?.value || rootQid;
  const claims = entity.claims || {};

  // Birth / death year only (P17, P18)
  const birthRaw = Utils.formatTime(Utils.firstValue(claims["P17"]?.[0])) || "";
  const deathRaw = Utils.formatTime(Utils.firstValue(claims["P18"]?.[0])) || "";
  const birth = birthRaw ? birthRaw.slice(0, 4) : "";
  const death = deathRaw ? deathRaw.slice(0, 4) : "";
  const dates = birth || death ? `(${birth}–${death})` : "";

// Gender (P13): Q33 male, Q34 female (plus Wikidata fallbacks)
let gender = "unknown";
const rawGender = Utils.firstValue(claims["P13"]?.[0]);
let genderId = "";

if (typeof rawGender === "string") {
  genderId = rawGender;
} else if (rawGender && typeof rawGender === "object") {
  genderId = rawGender.id || rawGender.value || "";
}

if (/Q33|Q6581097/i.test(genderId)) gender = "male";
else if (/Q34|Q6581072/i.test(genderId)) gender = "female";

  // Thumbnail from P31 (Commons filename)
  let thumb = "";
  const imgClaim = claims["P31"]?.[0];
  if (imgClaim) {
    const v = Utils.firstValue(imgClaim);
    if (typeof v === "string") {
      const filename = String(v).replace(/^File:/i, "").trim();
      if (filename) {
        const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=120`;
        thumb = url; // store just the URL
      }
    }
  }

  // === Build base node object ===
  const node = {
    id: rootQid,
    label,
    dates,
    thumb,
    gender,
    parents: [],
    children: [],
    spouses: [] 
  };

  // === Parents (P53) ===
  const parentStmts = claims["P53"] || [];
  for (const stmt of parentStmts) {
    const q = Utils.firstValue(stmt);
    if (q && /^Q\d+$/.test(q)) {
      const parentNode = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
      if (parentNode) node.parents.push(parentNode);
    }
  }

  // === Children (P54) ===
  const childStmts = claims["P54"] || [];
  for (const stmt of childStmts) {
    const q = Utils.firstValue(stmt);
    if (q && /^Q\d+$/.test(q)) {
      const childNode = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
      if (childNode) node.children.push(childNode);
    }
  }

  // === Spouses (P56) ===
  const spouseStmts = claims["P56"] || [];
  for (const stmt of spouseStmts) {
    const q = Utils.firstValue(stmt);
    if (q && /^Q\d+$/.test(q)) {
      const spouseNode = await renderFamilyTree(q, lang, depth, maxDepth, visited);
      if (spouseNode) node.spouses.push(spouseNode);
    }
  }

  return node;
}
  



// ---------- Family tree: render HTML + draw connectors ----------
function drawFamilyTree(treeData) {
  const container = document.getElementById("family-tree");
  if (!container || !treeData) return;

  window.lastTreeData = treeData;  // 🔍 expose data for debugging

  const layout = FamilyLayout.computeLayout(treeData, {
    nodeWidth: 180,
    nodeHeight: 120,
    hGap: 40,
    vGap: 40
  });
window.lastLayout = layout;

  container.innerHTML = `
    <div class="family-tree-wrapper">
      <div class="family-tree-canvas" style="width:${layout.width}px;height:${layout.height}px;">
        <svg class="tree-lines" width="${layout.width}" height="${layout.height}"></svg>
      </div>
    </div>
  `;

  const wrapper = container.querySelector(".family-tree-wrapper");
  const canvas  = container.querySelector(".family-tree-canvas");
  const svg     = canvas.querySelector("svg");

layout.nodes.forEach(n => {
  const genderClass =
    n.gender === "male" ? "male" :
    n.gender === "female" ? "female" : "";

  const card = document.createElement("div");
  card.className = `person-card ${genderClass}`;
    card.dataset.qid = n.id;
    card.style.left = `${n.x}px`;
    card.style.top  = `${n.y}px`;

    const thumbHTML = n.thumb ? `<img src="${n.thumb}" class="person-thumb" alt="">` : "";
    card.innerHTML = `
      ${thumbHTML}
      <div class="person-label">${n.label || n.id}</div>
      <div class="person-dates">${n.dates || ""}</div>
    `;

    if (n.id === treeData.id) card.classList.add("subject-card");
    canvas.appendChild(card);
  });

  const elById = new Map();
  canvas.querySelectorAll('.person-card[data-qid]').forEach(el => elById.set(el.dataset.qid, el));

  const anchor = (el, edge) => {
    const left = el.offsetLeft;
    const top  = el.offsetTop;
    const w    = el.offsetWidth;
    const h    = el.offsetHeight;
    const cx   = left + w / 2;
    if (edge === "top")    return { x: cx, y: top };
    if (edge === "bottom") return { x: cx, y: top + h };
    return { x: cx, y: top + h / 2 };
  };

  const elbowPath = (from, to, padTop = 8, padBottom = 8) => {
    const start = { x: from.x, y: from.y + padBottom };
    const end   = { x: to.x,   y: to.y - padTop };
    const midY  = (start.y + end.y) / 2;
    return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  };

  const drawPath = (d, stroke = "#777", width = 1.5) => {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    p.setAttribute("stroke", stroke);
    p.setAttribute("stroke-width", width);
    p.setAttribute("fill", "none");
    p.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(p);
  };

const drawConnectors = () => {
  svg.innerHTML = "";

  // --- background group for spouse lines ---
  const spouseGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  spouseGroup.setAttribute("class", "spouse-lines");
  svg.appendChild(spouseGroup);

  // --- main group for parent/child lines ---
  const mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  mainGroup.setAttribute("class", "family-lines");
  svg.appendChild(mainGroup);

  const drawPath = (group, d, stroke = "#777", width = 1.5) => {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    p.setAttribute("stroke", stroke);
    p.setAttribute("stroke-width", width);
    p.setAttribute("fill", "none");
    p.setAttribute("vector-effect", "non-scaling-stroke");
    group.appendChild(p);
  };

  const drawSpouseDoubleCurve = (group, aC, bC, color = "#aaa") => {
    const yMid = (aC.y + bC.y) / 2;
    const dx = Math.abs(aC.x - bC.x);
    const curve = Math.min(70, Math.max(24, dx / 3));
    const offset = 1.6;
    const d1 = `M ${aC.x} ${yMid - offset} C ${aC.x} ${yMid - curve}, ${bC.x} ${yMid - curve}, ${bC.x} ${yMid - offset}`;
    const d2 = `M ${aC.x} ${yMid + offset} C ${aC.x} ${yMid + curve}, ${bC.x} ${yMid + curve}, ${bC.x} ${yMid + offset}`;
    drawPath(group, d1, color, 1.2);
    drawPath(group, d2, color, 1.2);
  };

  // --- iterate all nodes ---
  layout.nodes.forEach(n => {
    const nEl = elById.get(n.id);
    if (!nEl) return;

    // Parents → child
    if (n.parents && n.parents.length) {
      const childTop = anchor(nEl, "top");
      n.parents.forEach(p => {
        const pEl = elById.get(p.id);
        if (!pEl) return;
        const pBottom = anchor(pEl, "bottom");
        const d = elbowPath(pBottom, childTop);
        drawPath(mainGroup, d, "#777", 1.5);
      });
    }

    // This node → children
    if (n.children && n.children.length) {
      const pBottom = anchor(nEl, "bottom");
      n.children.forEach(c => {
        const cEl = elById.get(c.id);
        if (!cEl) return;
        const cTop = anchor(cEl, "top");
        const d = elbowPath(pBottom, cTop);
        drawPath(mainGroup, d, "#777", 1.5);
      });
    }

// === Spouse side connectors (|===| style) ===
if (n.spouses && n.spouses.length) {
  const spouseColor = "#aaa";
  const lineWidth = 3;

  n.spouses.forEach(s => {
    const sEl = elById.get(s.id);
    if (!sEl) return;

    // Get bounding boxes for each card
    const aRect = nEl.getBoundingClientRect();
    const bRect = sEl.getBoundingClientRect();

    // Compute positions relative to the SVG coordinate space
    const svgRect = svg.getBoundingClientRect();
    const aRight = aRect.left + aRect.width - svgRect.left;
    const aMidY  = aRect.top + aRect.height / 2 - svgRect.top;
    const bLeft  = bRect.left - svgRect.left;
    const bMidY  = bRect.top + bRect.height / 2 - svgRect.top;

    // Define spacing of the bridge (gap between cards)
    const gapY = (aMidY + bMidY) / 2;
    const midX1 = aRight + 4; // small offset from card edge
    const midX2 = bLeft - 4;  // small offset from partner edge

    // Draw three segments: left vertical, horizontal bridge, right vertical
    const path = `
      M ${aRight} ${aMidY - 15}
      L ${aRight} ${aMidY + 15}
      M ${bLeft} ${bMidY - 15}
      L ${bLeft} ${bMidY + 15}
      M ${midX1} ${gapY}
      L ${midX2} ${gapY}
    `;

    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    p.setAttribute("stroke", spouseColor);
    p.setAttribute("stroke-width", lineWidth);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("vector-effect", "non-scaling-stroke");
    spouseGroup.appendChild(p);
  });
}
  });
};


  // normalize vertical spacing
  function normalizeRowHeights() {
    const byLevel = {};
    layout.nodes.forEach(n => {
      if (!byLevel[n.level]) byLevel[n.level] = [];
      byLevel[n.level].push(n);
    });

    let currentY = 0;
    Object.keys(byLevel).sort((a,b)=>a-b).forEach(level => {
      const els = byLevel[level].map(n => elById.get(n.id)).filter(Boolean);
      const maxH = Math.max(...els.map(el => el.offsetHeight || 0), 0);
      els.forEach(el => el.style.top = `${currentY}px`);
      byLevel[level].forEach(n => n.y = currentY);
      currentY += maxH + 60;
    });

    svg.setAttribute("height", currentY + 60);
    drawConnectors();
  }

  // observe for resizing and redraw connectors
  const ro = new ResizeObserver(drawConnectors);
  canvas.querySelectorAll(".person-card").forEach(el => ro.observe(el));

  drawConnectors();
  setTimeout(normalizeRowHeights, 400);
}

// ✅ Properly close and export
return { renderGeneric, postRender, renderFamilyTree, drawFamilyTree };

})();


