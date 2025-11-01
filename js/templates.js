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
  if (depth > maxDepth || visited.has(rootQid)) return null;
  visited.add(rootQid);

  const entities = await API.getEntities(rootQid, lang);
  const entity = entities ? entities[rootQid] : null;
  if (!entity) return null;

  const label  = entity.labels?.[lang]?.value || entity.labels?.en?.value || rootQid;
  const claims = entity.claims || {};

  // Birth / death year only (P17, P18)
  const birthRaw = Utils.formatTime(Utils.firstValue(claims["P17"]?.[0])) || "";
  const deathRaw = Utils.formatTime(Utils.firstValue(claims["P18"]?.[0])) || "";
  const birth = birthRaw ? birthRaw.slice(0, 4) : "";
  const death = deathRaw ? deathRaw.slice(0, 4) : "";
  const dates = birth || death ? `(${birth}–${death})` : "";

  // Gender (P13): Q1050 male, Q1051 female
  let gender = "unknown";
  const genderVal = Utils.firstValue(claims["P13"]?.[0]);
  if (genderVal === "Q1050") gender = "male";
  if (genderVal === "Q1051") gender = "female";

  // Thumbnail from P31 (Commons filename)
  let thumb = "";
  const imgClaim = claims["P31"]?.[0];
  if (imgClaim) {
    const v = Utils.firstValue(imgClaim);
    if (typeof v === "string") {
      const filename = String(v).replace(/^File:/i, "").trim();
      if (filename) {
        const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=120`;
        thumb = `<img src="${url}" alt="${label}" class="person-thumb" loading="lazy">`;
      }
    }
  }

  const node = { id: rootQid, label, dates, thumb, gender, parents: [], children: [] };

  // Parents (P53 father, P55 mother)
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

  // Children (P54)
  const kids = claims["P54"] || [];
  for (const stmt of kids) {
    const q = Utils.firstValue(stmt);
    if (q && /^Q\d+$/.test(q)) {
      const childNode = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
      if (childNode) node.children.push(childNode);
    }
  }

  return node;
}


// ---------- Family tree: render HTML + draw connectors ----------
function drawFamilyTree(treeData) {
  const container = document.getElementById("family-tree");
  if (!container || !treeData) return;

  const rootEl = container.querySelector(".tree-root");
  const svgEl  = container.querySelector("#tree-lines");
  if (!rootEl || !svgEl) {
    // rebuild the shell if missing
    container.innerHTML = `
      <div class="tree-root"></div>
      <svg id="tree-lines" class="tree-lines"></svg>
    `;
  }

  const root = container.querySelector(".tree-root");
  const svg  = container.querySelector("#tree-lines");

  // --- Build HTML and a map from QID -> person-card element ---
  const nodeToCard = new Map(); // QID -> HTMLElement

  const nodeHTML = (node) => {
    const genderClass =
      node.gender === "male" ? "male" :
      node.gender === "female" ? "female" : "";

    const parentsHTML = (node.parents && node.parents.length)
      ? `<div class="tree-level parents">
           ${node.parents.map(nodeHTML).join("")}
         </div>`
      : "";

    const childrenHTML = (node.children && node.children.length)
      ? `<div class="tree-level children">
           ${node.children.map(nodeHTML).join("")}
         </div>`
      : "";

    // note: we will register the card after we set innerHTML
    // so we add data-qid for easy lookup
    return `
      <div class="tree-node">
        ${parentsHTML}
        <div class="person-card ${genderClass}" data-qid="${node.id}">
          ${node.thumb || ""}
          <div class="person-label">${node.label}</div>
          <div class="person-dates">${node.dates}</div>
        </div>
        ${childrenHTML}
      </div>`;
  };

  root.innerHTML = nodeHTML(treeData);

  // Populate the map now that DOM is in place
  root.querySelectorAll(".person-card[data-qid]").forEach(el => {
    const qid = el.getAttribute("data-qid");
    if (qid) nodeToCard.set(qid, el);
  });

  // --- Connector drawing using the data model (no DOM guessing) ---
  const drawConnectors = () => {
    // Size the SVG to content box of the root
    svg.innerHTML = "";
    // Use scrollWidth/scrollHeight to accommodate wrapping content
    const contentW = root.scrollWidth;
    const contentH = root.scrollHeight;
    svg.setAttribute("width",  contentW);
    svg.setAttribute("height", contentH);
    svg.style.width  = contentW + "px";
    svg.style.height = contentH + "px";

    // Coordinates base: container
    const base = container.getBoundingClientRect();
    const offsetX = -base.left + container.scrollLeft;
    const offsetY = -base.top  + container.scrollTop;

    // Helper to get the (x,y) anchor of a card
    const cardAnchor = (el, edge) => {
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2 + offsetX;
      if (edge === "bottom") return { x: centerX, y: r.bottom + offsetY };
      if (edge === "top")    return { x: centerX, y: r.top    + offsetY };
      return { x: centerX, y: r.top + offsetY };
    };

    // Traverse the data tree and draw lines for each parent->child link
    const connect = (node) => {
      const parentEl = nodeToCard.get(node.id);
      if (parentEl && node.children && node.children.length) {
        const p = cardAnchor(parentEl, "bottom");

        node.children.forEach(child => {
          const childEl = nodeToCard.get(child.id);
          if (!childEl) return;
          const c = cardAnchor(childEl, "top");

          // Slight offsets so the elbow sits between generations
          const parentY = p.y - 30; // 30px above bottom
          const childY  = c.y + 30; // 30px below top
          const midY    = (parentY + childY) / 2;

          const d = `M ${p.x} ${parentY} L ${p.x} ${midY} L ${c.x} ${midY} L ${c.x} ${childY}`;
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", d);
          path.setAttribute("vector-effect", "non-scaling-stroke");
          svg.appendChild(path);
        });
      }

      // Recurse
      (node.parents || []).forEach(connect);
      (node.children || []).forEach(connect);
    };

    connect(treeData);
  };

  // Redraw connectors once layout settles
  const redraw = () => {
    // wait a tick for font/line wrapping
    requestAnimationFrame(() => {
      requestAnimationFrame(() => drawConnectors());
    });
  };

  // Redraw on image load (thumbnails can change height)
  root.querySelectorAll("img").forEach(img => {
    if (img.complete) return;
    img.addEventListener("load", redraw, { once: true });
    img.addEventListener("error", redraw, { once: true });
  });

  // Redraw now and on resize
  redraw();
  // Re-run connector alignment after fonts and images stabilize
setTimeout(redraw, 500);

  window.addEventListener("resize", redraw, { once: true });
}


// ✅ Properly close and export
return { renderGeneric, postRender, renderFamilyTree, drawFamilyTree };

})();

