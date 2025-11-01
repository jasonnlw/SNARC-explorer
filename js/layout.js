/**
 * Simplified EntiTree-style family tree layout algorithm.
 * Computes x,y positions for each person node in a hierarchical tree.
 * Works with relationships: parents, spouses, children.
 * 
 * Adapted for SNARC Explorer (no React, no dependencies).
 */

window.FamilyLayout = (() => {

  /**
   * Build a tree layout starting from a root person.
   * @param {Object} root - main person node with { id, label, parents, spouses, children }
   * @param {Object} opts - layout options
   */
  function computeLayout(root, opts = {}) {
    const nodeWidth  = opts.nodeWidth  || 180;
    const nodeHeight = opts.nodeHeight || 120;
    const hGap = opts.hGap || 60;
    const vGap = opts.vGap || 60;

    // Flatten nodes and map by id
    const nodesById = new Map();
    function traverse(n, depth = 0) {
      if (!n || nodesById.has(n.id)) return;
      n.depth = depth;
      nodesById.set(n.id, n);
      (n.spouses || []).forEach(s => traverse(s, depth));
      (n.children || []).forEach(c => traverse(c, depth + 1));
      (n.parents || []).forEach(p => traverse(p, depth - 1));
    }
    traverse(root);

    // Group by depth (generations)
    const levels = {};
    nodesById.forEach(n => {
      if (!levels[n.depth]) levels[n.depth] = [];
      levels[n.depth].push(n);
    });

    // Sort each level: couples grouped together, siblings adjacent
    Object.values(levels).forEach(arr => {
      arr.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
    });

    // Compute horizontal positions
    const levelKeys = Object.keys(levels)
      .map(Number)
      .sort((a, b) => a - b);

    let maxWidth = 0;
    const positioned = [];

    levelKeys.forEach((depth, i) => {
      const level = levels[depth];
      const totalWidth = level.length * (nodeWidth + hGap) - hGap;
      let startX = -totalWidth / 2;
      level.forEach((n, j) => {
        n.x = startX + j * (nodeWidth + hGap);
        n.y = (depth - root.depth) * (nodeHeight + vGap);
        positioned.push(n);
      });
      maxWidth = Math.max(maxWidth, totalWidth);
    });

    // Compute spouse pairing alignment (side-by-side)
    positioned.forEach(n => {
      if (n.spouses && n.spouses.length) {
        const baseX = n.x;
        n.spouses.forEach((s, i) => {
          const offset = (i + 1) * (nodeWidth + hGap) / 2;
          s.x = baseX + offset;
          s.y = n.y;
        });
      }
    });

    // Normalize coordinates to positive space
    const minX = Math.min(...positioned.map(n => n.x));
    positioned.forEach(n => { n.x -= minX - 50; });
    
    // Normalize depth levels so all start from 0 (ancestors above)
const minDepth = Math.min(...Array.from(nodesById.values()).map(n => n.depth));
if (minDepth < 0) {
  nodesById.forEach(n => { n.depth = n.depth - minDepth; });
}

// Compute actual height based on deepest and highest node positions
const minY = Math.min(...positioned.map(n => n.y));
const maxY = Math.max(...positioned.map(n => n.y + (n.height || nodeHeight)));
const totalHeight = (maxY - minY) + nodeHeight / 2 + 60;

return {
  nodes: positioned,
  width: maxWidth + 100,
  height: totalHeight
};

  }

  return { computeLayout };
})();
