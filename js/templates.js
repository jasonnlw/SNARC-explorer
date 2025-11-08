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
      siblings: [],
      spouses: []
      
    };

    const birth = claims["P17"]?.[0]?.mainsnak?.datavalue?.value?.time || "";
    const death = claims["P18"]?.[0]?.mainsnak?.datavalue?.value?.time || "";
    if (birth || death)
      node.dates = `(${birth.slice(1, 5) || ""}–${death.slice(1, 5) || ""})`;

    const img = claims["P31"]?.[0]?.mainsnak?.datavalue?.value;
    if (img) {
      const filename = String(img).replace(/^File:/i, "").trim();
      node.thumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=120`;
    }

    const genderClaim = claims["P13"]?.[0];
    const gId = genderClaim?.mainsnak?.datavalue?.value?.id || "";
    if (/Q33|Q6581097/i.test(gId)) node.gender = "male";
    else if (/Q34|Q6581072/i.test(gId)) node.gender = "female";

    // Parents: include both P53 (father/parent) and P55 (mother/parent)
    const parentIds = [
      ...getRelatedIds(claims["P53"]),
      ...getRelatedIds(claims["P55"])
    ];
    for (const q of parentIds) {
      if (!/^Q\d+$/i.test(q)) continue;
      const parent = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
      if (parent) node.parents.push(parent);
    }

    // Children (P54)
    for (const q of getRelatedIds(claims["P54"])) {
      if (!/^Q\d+$/i.test(q)) continue;
      const child = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
      if (child) node.children.push(child);
    }

    // Siblings (P52) – true siblings, tracked separately
   for (const q of getRelatedIds(claims["P52"])) {    
   if (!/^Q\d+$/i.test(q)) continue;
   if (visited.has(q)) continue;
   const sibling = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
   if (sibling) node.siblings.push(sibling);
    }

    // Spouses (P56)
    for (const q of getRelatedIds(claims["P56"])) {
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
          const filename =
            typeof v === "string" ? v.replace(/^File:/i, "").trim() : "";
          if (filename)
            sThumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
              filename
            )}?width=120`;
        }

        node.spouses.push({
          id: q,
          label: sLabel,
          gender: sGender,
          thumb: sThumb,
          parents: [],
          siblings: [],
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
      const genderClass =
        n.gender === "male"
          ? "male"
          : n.gender === "female"
          ? "female"
          : "";
      const card = document.createElement("div");
      card.className = `person-card ${genderClass}`;
      card.dataset.qid = n.id;
      card.style.left = `${n.x}px`;
      card.style.top = `${n.y}px`;

      const thumbHTML = n.thumb
        ? `<img src="${n.thumb}" class="person-thumb" alt="">`
        : "";
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
        const sortedKeys = Object.keys(rows)
          .map(Number)
          .sort((a, b) => a - b);
        sortedKeys.forEach(k => {
          const row = rows[k];
          const tallest = Math.max(...row.map(c => c.offsetHeight));
          row.forEach(c => {
            c.style.top = `${cumulativeY}px`;
          });
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
            img.addEventListener("load", () => {
              if (++loaded === thumbs.length) performAdjustment();
            });
            img.addEventListener("error", () => {
              if (++loaded === thumbs.length) performAdjustment();
            });
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
      cards.forEach(c => {
        cardMap[c.dataset.qid] = c;
      });

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

      const elbowPath = (from, to) => {
        if (!from || !to) return "";
        const midY = (from.y + to.y) / 2;
        return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
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

// ---- Parent–child connectors (grouped by parent pair; father preferred;
//      fallback to mother; supports unmarried co-parents with a shared parent bar)
{
  // 1) Build child groups keyed by their parent set (1 or 2 parents).
  //    We derive groups from each CHILD's parents to avoid relying on
  //    sometimes-incomplete parent.children lists (common in top/ancestor rows).
  const groups = new Map(); // key -> { parentIds: [Q..], children: [Q..] }

  layout.nodes.forEach(child => {
    const pList = (child.parents || [])
      .map(p => p.id)
      .filter(id => cardMap[id]); // only parents that actually have visible cards

    if (!pList.length) return;

    // only consider the first two parents (typical: father+mother)
    const parentIds = pList.slice(0, 2).sort();

    // Build a stable key: 'Qxx' for 1-parent; 'Qaa+Qbb' for 2-parents
    const key = parentIds.join("+");
    if (!groups.has(key)) groups.set(key, { parentIds, children: [] });
    groups.get(key).children.push(child.id);
  });

  // 2) For each group, choose a single origin point.
  //    - If two parents and they are spouses → draw from FATHER's bottom (else mother).
  //    - If two parents and NOT spouses → draw a "parent bar" between them,
  //      then route the children from the bar's midpoint (your bracket example).
  //    - If one parent → draw from that parent's bottom.
  groups.forEach(({ parentIds, children }) => {
    let fromPoint = null;

    if (parentIds.length === 2) {
      const [p1Id, p2Id] = parentIds;
      const p1 = layout.nodes.find(n => n.id === p1Id);
      const p2 = layout.nodes.find(n => n.id === p2Id);
      if (!p1 || !p2) return;

      const p1Card = cardMap[p1.id];
      const p2Card = cardMap[p2.id];
      if (!p1Card || !p2Card) return;

      const p1Male = /male/i.test(p1.gender || "");
      const p2Male = /male/i.test(p2.gender || "");
      const fatherCard = p1Male ? p1Card : (p2Male ? p2Card : null);
      const motherCard = !p1Male ? p1Card : (!p2Male ? p2Card : null);

      const areSpouses =
        (p1.spouses || []).some(s => s.id === p2.id) ||
        (p2.spouses || []).some(s => s.id === p1.id);

      if (areSpouses) {
        // Married/partnered parents: draw from father if available, else mother.
        const base = fatherCard || motherCard || p1Card;
        fromPoint = getAnchor(base, "bottom");
        if (!fromPoint) return;
      } else {
        // Unmarried co-parents: draw a single horizontal "parent bar",
        // then route down from its midpoint to each child.
        const a = getAnchor(p1Card, "bottom");
        const b = getAnchor(p2Card, "bottom");
        if (!a || !b) return;

        // draw the parent bar (single line)
        const y = Math.max(a.y, b.y); // they should be same level; guard anyway
        const dBar = `M ${a.x} ${y} L ${b.x} ${y}`;
        drawPath(mainGroup, dBar, "#777", 1.5);

        // origin for children = midpoint of the bar
        fromPoint = { x: (a.x + b.x) / 2, y };
      }
    } else {
      // Single parent
      const pId = parentIds[0];
      const pNode = layout.nodes.find(n => n.id === pId);
      const pCard = pNode && cardMap[pNode.id];
      if (!pCard) return;
      fromPoint = getAnchor(pCard, "bottom");
      if (!fromPoint) return;
    }

    // 3) Draw connectors to each child in the group from the chosen origin.
    children.forEach(cid => {
      const toCard = cardMap[cid];
      if (!toCard) return;
      const to = getAnchor(toCard, "top");
      if (!to) return;

      const path = elbowPath(fromPoint, to);  // keeps your right-angle style
      drawPath(mainGroup, path, "#777", 1.5);
    });
  });
}

// ---- Spouse connectors (double "=" lines) – draw each unique pair once
      const drawnPairs = new Set();
      layout.nodes.forEach(n => {
        (n.spouses || []).forEach(s => {
          // Build a consistent key regardless of order
          const key = [n.id, s.id].sort().join("-");
          if (drawnPairs.has(key)) return;
          drawnPairs.add(key);
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

      // ---- Sibling connectors (single horizontal line) from explicit data
      // Build adjacency from layout nodes' siblings
      const sibAdj = new Map(); // id -> Set(ids)
      layout.nodes.forEach(n => {
        if (!sibAdj.has(n.id)) sibAdj.set(n.id, new Set());
        (n.siblings || []).forEach(s => {
          if (!sibAdj.has(s.id)) sibAdj.set(s.id, new Set());
          sibAdj.get(n.id).add(s.id);
          sibAdj.get(s.id).add(n.id);
        });
      });

      // Find connected components (sibling groups)
      const visited = new Set();
      const groups = [];
      for (const start of sibAdj.keys()) {
        if (visited.has(start)) continue;
        const queue = [start];
        const group = [];
        visited.add(start);
        while (queue.length) {
          const u = queue.shift();
          group.push(u);
          for (const v of (sibAdj.get(u) || [])) {
            if (!visited.has(v)) {
              visited.add(v);
              queue.push(v);
            }
          }
        }
        if (group.length > 1) groups.push(group);
      }

      // Draw one single horizontal line per sibling group
      groups.forEach(ids => {
        const members = ids
          .map(id => cardMap[id])
          .filter(Boolean)
          .map(card => ({
            x: card.offsetLeft + card.offsetWidth / 2,
            y: card.offsetTop + card.offsetHeight / 2
          }));
        if (members.length < 2) return;
        members.sort((a, b) => a.x - b.x);
        const left = members[0];
        const right = members[members.length - 1];
        const y = members.reduce((acc, m) => acc + m.y, 0) / members.length;
        const d = `M ${left.x} ${y} L ${right.x} ${y}`;
        drawPath(mainGroup, d, "#aaa", 1.2);
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

  // ---------- Exports ----------
  return { renderGeneric, postRender, renderFamilyTree, drawFamilyTree };

})(); // end window.Templates IIFE
