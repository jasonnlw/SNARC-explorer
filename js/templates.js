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

// === Spouses (P56) — direct spouses only ===
const spouseStmts = claims["P56"] || [];
for (const stmt of spouseStmts) {
  const q = Utils.firstValue(stmt);
  if (!(q && /^Q\d+$/i.test(q))) continue;

  try {
    const sData  = await API.getEntities(q, lang);
    const sItem  = sData?.[q];
    if (!sItem) continue;

    const sClaims = sItem.claims || {};
    const sLabel = sItem.labels?.[lang]?.value || sItem.labels?.en?.value || q;

    const sGenderClaim = sClaims["P13"]?.[0];
    const gId = sGenderClaim?.mainsnak?.datavalue?.value?.id || "";
    const sGender = /Q33|Q6581097/i.test(gId)
      ? "male"
      : /Q34|Q6581072/i.test(gId)
      ? "female"
      : "unknown";

    const sImgClaim = sClaims["P31"]?.[0];
    let sThumb = "";
    if (sImgClaim) {
      const v = Utils.firstValue(sImgClaim);
      const filename = typeof v === "string" ? v.replace(/^File:/i, "").trim() : "";
      if (filename)
        sThumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=120`;
    }

    node.spouses.push({
      id: q,
      label: sLabel,
      gender: sGender,
      thumb: sThumb,
      parents: [],
      children: [],
      spouses: []
    });
  } catch (err) {
    console.warn("Failed to fetch spouse", q, err);
  }
}




  return node;
}
  
// ---------- Family tree: render HTML + draw connectors ----------
function drawFamilyTree(treeData) {
  const container = document.getElementById("family-tree");
  if (!container || !treeData) return;

  window.lastTreeData = treeData;

  // Compute layout
  const layout = window.FamilyLayout.computeLayout(treeData, {
    nodeWidth: 180,
    nodeHeight: 120,
    hGap: 30,
    vGap: 30
  });
  window.lastLayout = layout;

  // Padding settings
  const treePadding = 70;

  // --- Rebuild wrapper + SVG shell ---
  container.innerHTML = `
    <div class="family-tree-wrapper">
      <div class="family-tree-canvas" style="position:relative;">
        <svg class="tree-lines"></svg>
      </div>
    </div>
  `;

  const canvas = container.querySelector(".family-tree-canvas");
  const svg = canvas.querySelector("svg");

  // Create SVG groups for layers
  const mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const spouseGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  mainGroup.classList.add("main-lines");
  spouseGroup.classList.add("spouse-lines");
  svg.appendChild(mainGroup);
  svg.appendChild(spouseGroup);

  // --- Create and position cards ---
  layout.nodes.forEach(n => {
    const genderClass =
      n.gender === "male" ? "male" :
      n.gender === "female" ? "female" : "";

    const card = document.createElement("div");
    card.className = `person-card ${genderClass}`;
    card.dataset.qid = n.id;
    card.style.left = `${n.x}px`;
    card.style.top = `${n.y}px`;

    const thumbHTML = n.thumb ? `<img src="${n.thumb}" class="person-thumb" alt="">` : "";
    card.innerHTML = `
      ${thumbHTML}
      <div class="person-label">${n.label || n.id}</div>
      <div class="person-dates">${n.dates || ""}</div>
    `;

    if (n.id === treeData.id) card.classList.add("subject-card");
    canvas.appendChild(card);
  });

  // --- Build a map of elements ---
  const elById = new Map();
  canvas.querySelectorAll('.person-card[data-qid]').forEach(el => elById.set(el.dataset.qid, el));

  // --- Path helper ---
  const drawPath = (group, d, color = "#777", width = 1.5) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", width);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    group.appendChild(path);
  };

  // --- Anchors ---
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

  // --- Connector paths ---
  const elbowPath = (from, to) => {
    const midY = (from.y + to.y) / 2;
    return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
  };

  // --- Draw all connectors ---
  layout.nodes.forEach(n => {
    const nEl = elById.get(n.id);
    if (!nEl) return;

    // Parent connectors
    (n.parents || []).forEach(p => {
      const pEl = elById.get(p.id);
      if (!pEl) return;
      drawPath(mainGroup, elbowPath(anchor(pEl, "bottom"), anchor(nEl, "top")));
    });

    // Child connectors
    (n.children || []).forEach(c => {
      const cEl = elById.get(c.id);
      if (!cEl) return;
      drawPath(mainGroup, elbowPath(anchor(nEl, "bottom"), anchor(cEl, "top")));
    });

   // --- Spouse connectors (|===| style) using layout coords ---
if (n.spouses && n.spouses.length) {
  const spouseColor = "#aaa";
  const lineWidth = 3;
  n.spouses.forEach(s => {
    const sNode = layout.nodes.find(x => x.id === s.id);
    if (!sNode) return;

    const aRight = n.x + 180; // nodeWidth
    const aMidY  = n.y + 60;  // half of nodeHeight
    const bLeft  = sNode.x;
    const bMidY  = sNode.y + 60;
    const gapY   = (aMidY + bMidY) / 2;
    const midX1  = aRight + 4;
    const midX2  = bLeft - 4;

    const path = `
      M ${aRight} ${aMidY - 15}
      L ${aRight} ${aMidY + 15}
      M ${bLeft} ${bMidY - 15}
      L ${bLeft} ${bMidY + 15}
      M ${midX1} ${gapY - 3}
      L ${midX2} ${gapY - 3}
      M ${midX1} ${gapY + 3}
      L ${midX2} ${gapY + 3}
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
  // --- Adjust canvas height to the lowest visible card ---
const cards = Array.from(canvas.querySelectorAll(".person-card"));
if (cards.length) {
  const minY = Math.min(...cards.map(el => el.offsetTop));
  const maxY = Math.max(...cards.map(el => el.offsetTop + el.offsetHeight));
  const balancedPadding = 60;
  const totalHeight = (maxY - minY) + balancedPadding * 2;

  svg.setAttribute("height", totalHeight);
  canvas.style.height = `${totalHeight}px`;
  canvas.style.paddingTop = `${balancedPadding}px`;
  canvas.style.paddingBottom = `${balancedPadding}px`;
}
// --- Center subject in view ---
const subject = canvas.querySelector(".person-card.subject-card");
if (subject) {
  // Compute subject’s center within the canvas
  const subjectCenterX = subject.offsetLeft + subject.offsetWidth / 2;
  const canvasWidth = canvas.scrollWidth;
  const containerWidth = container.clientWidth;

  // Scroll so subject is centered horizontally
  const scrollX = Math.max(subjectCenterX - containerWidth / 2, 0);
  container.scrollLeft = scrollX;
}

}


// ✅ Properly close and export
return { renderGeneric, postRender, renderFamilyTree, drawFamilyTree };

})();


