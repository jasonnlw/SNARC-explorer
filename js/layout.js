/**
 * Simplified EntiTree-style family tree layout algorithm.
 * Computes x,y positions for each person node in a hierarchical tree.
 * Works with relationships: parents, spouses, children.
 * 
 * Adapted for SNARC Explorer (no React, no dependencies).
 */

window.FamilyLayout = (() => {

  function computeLayout(root, opts = {}) {
    const nodeWidth  = opts.nodeWidth  || 180;
    const nodeHeight = opts.nodeHeight || 120;
    const hGap = opts.hGap || 60;
    const vGap = opts.vGap || 60;

    const nodesById = new Map();

    /** Traverse recursively to collect all nodes with signed depth */
    function traverse(node, depth = 0) {
      if (!node || nodesById.has(node.id)) return;
      node.depth = depth;
      nodesById.set(node.id, node);

      // spouses share the same generation depth
      (node.spouses || []).forEach(s => traverse(s, depth));

      // ancestors (parents) are above => smaller depth
      (node.parents || []).forEach(p => traverse(p, depth - 1));

      // descendants (children) are below => larger depth
      (node.children || []).forEach(c => traverse(c, depth + 1));
    }

    traverse(root, 0);

    // ---- NORMALISE DEPTHS so 0 = topmost ancestor ----
    const allNodes = Array.from(nodesById.values());
    const minDepth = Math.min(...allNodes.map(n => n.depth));
    const maxDepth = Math.max(...allNodes.map(n => n.depth));

    const totalLevels = maxDepth - minDepth + 1;
    const normalized = allNodes.map(n => ({
      ...n,
      level: n.depth - minDepth // 0..N continuous
    }));

    // ---- GROUP BY LEVEL ----
    const levels = [];
    normalized.forEach(n => {
      if (!levels[n.level]) levels[n.level] = [];
      levels[n.level].push(n);
    });

    // ---- Horizontal layout for each generation ----
    let maxWidth = 0;
    levels.forEach((level, i) => {
      const totalWidth = level.length * (nodeWidth + hGap) - hGap;
      let startX = -totalWidth / 2;
      level.forEach((n, j) => {
        n.x = startX + j * (nodeWidth + hGap);
        n.y = i * (nodeHeight + vGap); // i = level index (top→bottom)
      });
      maxWidth = Math.max(maxWidth, totalWidth);
    });

    // ---- Spouse pairing side-by-side ----
    normalized.forEach(n => {
      if (!n.spouses || !n.spouses.length) return;
      const baseX = n.x;
      n.spouses.forEach((s, i) => {
        s.x = baseX + (i + 1) * (nodeWidth + hGap) / 2;
        s.y = n.y;
      });
    });

    // ---- Normalise X coordinates so tree is positive space ----
    const minX = Math.min(...normalized.map(n => n.x));
    normalized.forEach(n => { n.x -= minX - 50; });

    // ---- Calculate true height from levels ----
    const height = totalLevels * (nodeHeight + vGap);

    return {
      nodes: normalized,
      width: maxWidth + 100,
      height
    };
  }

  return { computeLayout };
})();

