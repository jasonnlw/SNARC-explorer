/* ===============================================================
   SNARC Explorer Templates.js — fully corrected version (2025)
   =============================================================== */

window.Templates = (() => {

  // ---------- Generic rendering ----------
  async function renderGeneric(entity, lang) {
    // (your generic render code remains here)
  }

  // ---------- Post-render entry point ----------
  async function postRender() {
    // (post-render logic remains unchanged, including map/search handling)
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
        ${thumbHTML}
        <div class="person-label">${n.label || n.id}</div>
        <div class="person-dates">${n.dates || ""}</div>
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
