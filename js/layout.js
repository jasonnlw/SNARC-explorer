window.FamilyLayout = (() => {

  function computeLayout(root, opts = {}) {
    const nodeWidth  = opts.nodeWidth  || 180;
    const nodeHeight = opts.nodeHeight || 120;
    const hGap = opts.hGap || 60;
    const vGap = opts.vGap || 60;

    const nodesById = new Map();

    // --- Traverse & collect (with signed depth) ---
    function traverse(node, depth = 0) {
      if (!node || nodesById.has(node.id)) return;
      node.depth = typeof depth === "number" ? depth : 0;
      nodesById.set(node.id, node);

      (node.spouses || []).forEach(s => traverse(s, depth));      // same level
      (node.parents || []).forEach(p => traverse(p, depth - 1));  // level up
      (node.children || []).forEach(c => traverse(c, depth + 1)); // level down
    }
    traverse(root, 0);

    const allNodes = Array.from(nodesById.values());
    const depthVals = allNodes.map(n => (typeof n.depth === "number" ? n.depth : 0));
    const minDepth = depthVals.length ? Math.min(...depthVals) : 0;

    // --- normalize to levels 0..N
    const normalized = allNodes.map(n => ({ ...n, level: (n.depth ?? 0) - minDepth }));

    // --- group by level
    const levels = new Map();
    normalized.forEach(n => {
      if (!levels.has(n.level)) levels.set(n.level, []);
      levels.get(n.level).push(n);
    });

    // --- place horizontally within each level
    let maxWidth = 0;
    for (const level of levels.values()) {
      const totalWidth = level.length * (nodeWidth + hGap) - hGap;
      let startX = -totalWidth / 2;
      level.forEach((n, j) => {
        n.x = startX + j * (nodeWidth + hGap);
      });
      maxWidth = Math.max(maxWidth, totalWidth);
    }

    // --- spouse next to base node (doesn't change row width calc)
    normalized.forEach(n => {
      if (!n.spouses || !n.spouses.length) return;
      const baseX = n.x;
      n.spouses.forEach((s, i) => {
        s.x = baseX + (i + 1) * (nodeWidth + hGap) / 2;
        s.level = n.level;
      });
    });

    // --- shift X so all positive
    const minX = Math.min(...normalized.map(n => n.x));
    normalized.forEach(n => { n.x -= (minX - 50); });

    // --- ADAPTIVE VERTICAL SPACING (key fix)
    // compute row heights (image rows are taller), then accumulate Y
    const sortedLevels = Array.from(levels.keys()).sort((a,b) => a - b);
    let currentY = 0;
    const levelHeights = new Map();

    for (const lvl of sortedLevels) {
      const nodes = levels.get(lvl);
      // if any node OR any spouse at this level has a thumb, make row taller
      const rowHeights = nodes.map(n => {
        const hasImage = !!n.thumb || (n.spouses || []).some(s => !!s.thumb);
        return hasImage ? nodeHeight * 1.5 : nodeHeight; // adjust factor if you prefer
      });
      const rowHeight = Math.max(...rowHeights, nodeHeight);
      levelHeights.set(lvl, rowHeight);

      // assign Y for this level
      nodes.forEach(n => { n.y = currentY; });
      nodes.forEach(n => (n.spouses || []).forEach(s => { s.y = currentY; }));

      currentY += rowHeight + vGap;
    }

    // --- compute canvas width/height properly
    const rightMost = Math.max(...normalized.map(n => n.x + nodeWidth));
    const width = Math.max(rightMost + 50, maxWidth + 100);
    const height = currentY > 0 ? currentY - vGap + 20 : nodeHeight + 20;

    return {
      nodes: normalized,
      width,
      height,
      nodeWidth,
      nodeHeight
    };
  }

  return { computeLayout };
})();
