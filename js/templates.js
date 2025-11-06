/* ===============================================================
   SNARC Explorer Templates.js — fully corrected version (2025)
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
   // ---------- Family tree rendering ----------
const treeContainer = document.getElementById("family-tree");
if (treeContainer) {
  const qidMatch = location.hash.match(/Q\d+/);
  if (qidMatch) {
    const qid = qidMatch[0];

    // Fetch entity data first to check conditions
    API.getEntities(qid, Utils.getLang()).then(data => {
      const item = data?.[qid];
      if (!item) return;

      const claims = item.claims || {};
      const instanceOf = claims["P7"]?.map(c => Utils.firstValue(c)) || [];
      const isHuman = instanceOf.includes("Q947");

      // list of family-connection properties
      const familyProps = ["P52", "P53", "P54", "P55", "P56"];
      const hasFamilyLink = familyProps.some(p => (claims[p] || []).length > 0);

      // Only render the tree if both conditions are true
      if (isHuman && hasFamilyLink) {
        renderFamilyTree(qid, Utils.getLang()).then(tree => {
          if (!tree) return;
          drawFamilyTree(tree);
          const redraw = () => drawFamilyTree(tree);
          requestAnimationFrame(redraw);
          window.addEventListener("resize", redraw, { once: true });
        });
      }
    });
  }
}

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


  // ---------- Family tree data ----------
  async function renderFamilyTree(rootQid, lang = "en", depth = 0, maxDepth = 5, visited = new Set()) {
    if (!rootQid || !/^Q\d+$/i.test(rootQid)) return null;
    if (depth > maxDepth || visited.has(rootQid)) return null;
    visited.add(rootQid);

    const data = await API.getEntities(rootQid, lang);
    const item = data?.[rootQid];
    if (!item) return null;

    const claims = item.claims || {};
    const node = {
      id: rootQid,
      label: item.labels?.[lang]?.value || item.labels?.en?.value || rootQid,
      dates: "",
      thumb: "",
      gender: "unknown",
      parents: [],
      children: [],
      spouses: []
    };

    const birth = claims["P17"]?.[0]?.mainsnak?.datavalue?.value?.time || "";
    const death = claims["P18"]?.[0]?.mainsnak?.datavalue?.value?.time || "";
    if (birth || death) node.dates = `(${birth.slice(1, 5) || ""}–${death.slice(1, 5) || ""})`;

    const img = claims["P31"]?.[0]?.mainsnak?.datavalue?.value;
    if (img) {
      const filename = String(img).replace(/^File:/i, "").trim();
      node.thumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=120`;
    }

    const genderClaim = claims["P13"]?.[0];
    const gId = genderClaim?.mainsnak?.datavalue?.value?.id || "";
    if (/Q33|Q6581097/i.test(gId)) node.gender = "male";
    else if (/Q34|Q6581072/i.test(gId)) node.gender = "female";

    // Parents
    for (const stmt of claims["P53"] || []) {
      const q = Utils.firstValue(stmt);
      if (q && /^Q\d+$/.test(q)) {
        const parent = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
        if (parent) node.parents.push(parent);
      }
    }

    // Children
    for (const stmt of claims["P54"] || []) {
      const q = Utils.firstValue(stmt);
      if (q && /^Q\d+$/.test(q)) {
        const child = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
        if (child) node.children.push(child);
      }
    }

    // Spouses
    for (const stmt of claims["P56"] || []) {
      const q = Utils.firstValue(stmt);
      if (!(q && /^Q\d+$/i.test(q))) continue;
      try {
        const sData = await API.getEntities(q, lang);
        const sItem = sData?.[q];
        if (!sItem) continue;
        const sClaims = sItem.claims || {};
        const sLabel = sItem.labels?.[lang]?.value || sItem.labels?.en?.value || q;
        let sGender = "unknown";
        const sGenderId = sClaims["P13"]?.[0]?.mainsnak?.datavalue?.value?.id || "";
        if (/Q33|Q6581097/i.test(sGenderId)) sGender = "male";
        else if (/Q34|Q6581072/i.test(sGenderId)) sGender = "female";

        let sThumb = "";
        const sImgClaim = sClaims["P31"]?.[0];
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

  // ---------- Family tree rendering ----------
  function drawFamilyTree(treeData) {
    const container = document.getElementById("family-tree");
    if (!container || !treeData) return;
    if (!window.FamilyLayout || !window.FamilyLayout.computeLayout) {
      console.error("FamilyLayout not available");
      return;
    }

    const layout = window.FamilyLayout.computeLayout(treeData, {
      nodeWidth: 180,
      nodeHeight: 120,
      hGap: 40,
      vGap: 40
    });

    container.innerHTML = `
      <div class="family-tree-wrapper">
        <div class="family-tree-canvas" style="position:relative;">
          <svg class="tree-lines"></svg>
        </div>
      </div>
    `;

    const canvas = container.querySelector(".family-tree-canvas");
    const svg = canvas.querySelector("svg");

    svg.setAttribute("width", layout.width);
    svg.setAttribute("height", layout.height);
    canvas.style.width = layout.width + "px";
    canvas.style.height = layout.height + "px";
    container.style.height = layout.height + 40 + "px";

    const mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const spouseGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mainGroup.classList.add("main-lines");
    spouseGroup.classList.add("spouse-lines");
    svg.appendChild(mainGroup);
    svg.appendChild(spouseGroup);

    // Render cards
    layout.nodes.forEach(n => {
      const genderClass = n.gender === "male" ? "male" :
                          n.gender === "female" ? "female" : "";
      const card = document.createElement("div");
      card.className = `person-card ${genderClass}`;
      card.dataset.qid = n.id;
      card.style.left = `${n.x}px`;
      card.style.top = `${n.y}px`;

     const thumbHTML = n.thumb ? `<img src="${n.thumb}" class="person-thumb" alt="">` : "";
card.innerHTML = `
  <a href="#/item/${n.id}" class="person-link" style="text-decoration:none;color:inherit;display:block;">
    ${thumbHTML}
    <div class="person-label">${n.label || n.id}</div>
    <div class="person-dates">${n.dates || ""}</div>
  </a>
`;
      if (n.id === treeData.id) card.classList.add("subject-card");
      canvas.appendChild(card);
    });

    // === Wait for images, then adjust row spacing ===
    function adjustRowSpacingOnceImagesReady() {
      const thumbs = Array.from(canvas.querySelectorAll("img.person-thumb"));
      let loaded = 0;

      const performAdjustment = () => {
        const cards = Array.from(canvas.querySelectorAll(".person-card"));
        if (!cards.length) return;

        const rows = {};
        cards.forEach(card => {
          const y = parseFloat(card.style.top);
          const key = Math.round(y / 10) * 10;
          (rows[key] ||= []).push(card);
        });

        let cumulativeY = 0;
        const spacing = 40;
        const sortedKeys = Object.keys(rows).map(Number).sort((a,b)=>a-b);
        sortedKeys.forEach(k => {
          const row = rows[k];
          const tallest = Math.max(...row.map(c => c.offsetHeight));
          row.forEach(c => { c.style.top = `${cumulativeY}px`; });
          cumulativeY += tallest + spacing;
        });

        const newHeight = cumulativeY + spacing;
        svg.setAttribute("height", newHeight);
        canvas.style.height = `${newHeight}px`;
        container.style.height = `${newHeight}px`;

        redrawConnectors();
        centerSubject();
      };

      if (!thumbs.length) {
        requestAnimationFrame(performAdjustment);
      } else {
        thumbs.forEach(img => {
          if (img.complete) {
            if (++loaded === thumbs.length) performAdjustment();
          } else {
            img.addEventListener("load",  () => { if (++loaded === thumbs.length) performAdjustment(); });
            img.addEventListener("error", () => { if (++loaded === thumbs.length) performAdjustment(); });
          }
        });
      }
    }

    // === Redraw connectors ===
    function redrawConnectors() {
      mainGroup.innerHTML = "";
      spouseGroup.innerHTML = "";

      const cards = Array.from(canvas.querySelectorAll(".person-card"));
      const cardMap = {};
      cards.forEach(c => { cardMap[c.dataset.qid] = c; });

      const getAnchor = (card, edge = "bottom") => {
        if (!card) return null;
        const rect = card.getBoundingClientRect();
        const x = card.offsetLeft + rect.width / 2;
        let y = card.offsetTop;
        if (edge === "top") y += 0;
        else if (edge === "middle") y += rect.height / 2;
        else y += rect.height;
        return { x, y };
      };

      const drawPath = (group, d, color = "#777", width = 1.5) => {
        if (!d || d.includes("NaN")) return;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", width);
        path.setAttribute("fill", "none");
        group.appendChild(path);
      };

      // Parent–child (elbow)
      layout.nodes.forEach(p => {
        (p.children || []).forEach(c => {
          const from = getAnchor(cardMap[p.id], "bottom");
          const to   = getAnchor(cardMap[c.id], "top");
          if (!from || !to) return;
          const midY = (from.y + to.y) / 2;
          const d = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
          drawPath(mainGroup, d, "#777", 1.5);
        });
      });

      // Spouse (double "=" line)
      layout.nodes.forEach(n => {
        (n.spouses || []).forEach(s => {
          const a = getAnchor(cardMap[n.id], "middle");
          const b = getAnchor(cardMap[s.id], "middle");
          if (!a || !b) return;
          const yMid = (a.y + b.y) / 2;
          const gap = 3;
          const d1 = `M ${a.x} ${yMid - gap} L ${b.x} ${yMid - gap}`;
          const d2 = `M ${a.x} ${yMid + gap} L ${b.x} ${yMid + gap}`;
          drawPath(spouseGroup, d1, "#aaa", 3);
          drawPath(spouseGroup, d2, "#aaa", 3);
        });
      });
    }

    // === Center subject ===
    function centerSubject() {
      const wrapper = container.querySelector(".family-tree-wrapper");
      const subject = canvas.querySelector(".subject-card");
      if (wrapper && subject) {
        const subjectCenterX = subject.offsetLeft + subject.offsetWidth / 2;
        const wrapperWidth = wrapper.clientWidth;
        wrapper.scrollLeft = Math.max(subjectCenterX - wrapperWidth / 2, 0);
      }
    }

    adjustRowSpacingOnceImagesReady();
  }

  // ---------- Exports ----------
  return { renderGeneric, postRender, renderFamilyTree, drawFamilyTree };

})(); // end window.Templates IIFE
