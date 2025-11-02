window.Templates = (() => {

  // === RENDER FAMILY TREE FUNCTION ===
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

    // --- Dates ---
    const birth = claims["P17"]?.[0]?.mainsnak?.datavalue?.value?.time || "";
    const death = claims["P18"]?.[0]?.mainsnak?.datavalue?.value?.time || "";
    if (birth || death) node.dates = `(${birth.slice(1, 5) || ""}–${death.slice(1, 5) || ""})`;

    // --- Image ---
    const img = claims["P31"]?.[0]?.mainsnak?.datavalue?.value;
    if (img) {
      const filename = String(img).replace(/^File:/i, "").trim();
      node.thumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=120`;
    }

    // --- Gender ---
    const genderClaim = claims["P13"]?.[0];
    const gId = genderClaim?.mainsnak?.datavalue?.value?.id || "";
    if (/Q33|Q6581097/i.test(gId)) node.gender = "male";
    else if (/Q34|Q6581072/i.test(gId)) node.gender = "female";

    // --- Parents (P53) ---
    for (const stmt of claims["P53"] || []) {
      const q = Utils.firstValue(stmt);
      if (q && /^Q\d+$/.test(q)) {
        const parent = await renderFamilyTree(q, lang, depth - 1, maxDepth, visited);
        if (parent) node.parents.push(parent);
      }
    }

    // --- Children (P54) ---
    for (const stmt of claims["P54"] || []) {
      const q = Utils.firstValue(stmt);
      if (q && /^Q\d+$/.test(q)) {
        const child = await renderFamilyTree(q, lang, depth + 1, maxDepth, visited);
        if (child) node.children.push(child);
      }
    }

    // --- Spouses (P56): non-recursive ---
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

  // === DRAW FAMILY TREE FUNCTION ===
  function drawFamilyTree(treeData) {
    const container = document.getElementById("family-tree");
    if (!container || !treeData) return;

    // ✅ Guard: make sure FamilyLayout exists
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

    const mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const spouseGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mainGroup.classList.add("main-lines");
    spouseGroup.classList.add("spouse-lines");
    svg.appendChild(mainGroup);
    svg.appendChild(spouseGroup);

    // === Create and position cards ===
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

    // === Helper functions for connectors ===
    const anchor = (n, edge) => {
      const x = n.x + 90; // half width
      const y = n.y + (edge === "top" ? 0 : 120);
      return { x, y };
    };

    const elbowPath = (from, to) => {
      const midY = (from.y + to.y) / 2;
      return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
    };

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

    // === Draw connectors ===
    layout.nodes.forEach(n => {
      // Parent lines
      n.parents?.forEach(p => {
        drawPath(mainGroup, elbowPath(anchor(p, "bottom"), anchor(n, "top")));
      });

      // Child lines
      n.children?.forEach(c => {
        drawPath(mainGroup, elbowPath(anchor(n, "bottom"), anchor(c, "top")));
      });

      // Spouse connectors (|===|)
      n.spouses?.forEach(s => {
        const spouseNode = layout.nodes.find(x => x.id === s.id);
        if (!spouseNode) return;

        const aRight = n.x + 180;
        const aMidY  = n.y + 60;
        const bLeft  = spouseNode.x;
        const bMidY  = spouseNode.y + 60;
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
        drawPath(spouseGroup, path, "#aaa", 3);
      });
    });

    // === Center the subject in view ===
    const wrapper = container.querySelector(".family-tree-wrapper");
    const subject = canvas.querySelector(".subject-card");
    if (wrapper && subject) {
      const subjectCenterX = subject.offsetLeft + subject.offsetWidth / 2;
      const wrapperWidth = wrapper.clientWidth;
      wrapper.scrollLeft = Math.max(subjectCenterX - wrapperWidth / 2, 0);
    }
  }

  return { renderFamilyTree, drawFamilyTree };
})();
