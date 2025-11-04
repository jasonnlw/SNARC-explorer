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

    // --- Traverse recursively to collect all nodes with signed depth ---
    function traverse(node, depth = 0) {
      if (!node || nodesById.has(node.id)) return;
      node.depth = depth;
      nodesById.set(node.id, node);

      (node.spouses || []).forEach(s => traverse(s, depth));
      (node.parents || []).forEach(p => traverse(p, depth - 1));
      (node.children || []).forEach(c => traverse(c, depth + 1));
    }

    traverse(root, 0);

// --- Safely compute min/max depth (avoid NaN if depths undefined or empty) ---
const allNodes = Array.from(nodesById.values());
const depthValues = allNodes.map(n => (typeof n.depth === "number" ? n.depth : 0));
const minDepth = depthValues.length ? Math.min(...depthValues) : 0;
const maxDepth = depthValues.length ? Math.max(...depthValues) : 0;
const totalLevels = maxDepth - minDepth + 1;


    const normalized = allNodes.map(n => ({
      ...n,
      level: n.depth - minDepth
    }));

    // --- Group by level ---
    const levels = [];
    normalized.forEach(n => {
      if (!levels[n.level]) levels[n.level] = [];
      levels[n.level].push(n);
    });

    // --- Horizontal layout for each generation ---
    let maxWidth = 0;
    levels.forEach(level => {
      const totalWidth = level.length * (nodeWidth + hGap) - hGap;
      let startX = -totalWidth / 2;
      level.forEach((n, j) => {
        n.x = startX + j * (nodeWidth + hGap);
        n.y = n.level * (nodeHeight + vGap);
      });
      maxWidth = Math.max(maxWidth, totalWidth);
    });

    // --- Spouse pairing: place spouses side-by-side ---
    normalized.forEach(n => {
      if (!n.spouses || !n.spouses.length) return;
      const baseX = n.x;
      n.spouses.forEach((s, i) => {
        s.x = baseX + (i + 1) * (nodeWidth + hGap) / 2;
        s.y = n.y;
      });
    });

    // --- Normalise X coordinates so tree is positive space ---
    const minX = Math.min(...normalized.map(n => n.x));
    normalized.forEach(n => { n.x -= minX - 50; });

    // --- Adjust Y positions based on row spacing ---
    const adjusted = normalizeRowSpacing(normalized, nodeHeight, vGap);

    return {
      nodes: adjusted,
      width: maxWidth + 100,
      height: totalLevels * (nodeHeight + vGap)
    };
  }

  // --- Helper: normalize vertical spacing by tallest card per row + spouse alignment ---
  function normalizeRowSpacing(nodes, nodeHeight, vGap) {
    const levels = {};
    nodes.forEach(n => {
      if (!levels[n.level]) levels[n.level] = [];
      levels[n.level].push(n);
    });

    let currentY = 0;
    Object.keys(levels).sort((a, b) => a - b).forEach(lvl => {
      const levelNodes = levels[lvl];

      // Estimate row height based on card type
      const estimatedHeights = levelNodes.map(n => (n.thumb ? nodeHeight : nodeHeight * 0.7));
      const maxHeight = Math.max(...estimatedHeights);

      // Assign base Y for this level
      levelNodes.forEach(n => (n.y = currentY));

      // Align spouse pairs on same vertical baseline
      levelNodes.forEach(n => {
        if (!n.spouses || !n.spouses.length) return;
        n.spouses.forEach(s => {
          s.y = n.y; // force identical Y
        });
      });

      currentY += maxHeight + vGap;
    });

    return nodes;
  }

  return { computeLayout };
})();
