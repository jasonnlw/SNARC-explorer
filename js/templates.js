window.Templates = (() => {

  // ---------------------------------------------------------------------------
  // Helper: Normalize a QID from any format
  // ---------------------------------------------------------------------------
  function normalizeQid(value) {
    if (!value) return null;
    const match = String(value).match(/Q\d+/i);
    return match ? match[0].toUpperCase() : null;
  }

  // ---------------------------------------------------------------------------
  // Helper: Render value according to its datatype
  // ---------------------------------------------------------------------------
  function renderValue(datatype, value, labelMap, lang) {
    if (!value) return "";

    if (datatype === "wikibase-item") {
      const qid = normalizeQid(value);
      if (!qid) return value;

      const label = labelMap[qid] || qid;
      return `<a href="#/item/${qid}">${label}</a>`;
    }

    if (datatype === "external-id") {
      return `<code>${value}</code>`;
    }

    if (datatype === "url") {
      return `<a href="${value}" target="_blank" rel="noopener">${value}</a>`;
    }

    if (datatype === "time") {
      return Utils.formatTime(value);
    }

    return value;
  }

  // ---------------------------------------------------------------------------
  // Helper: Render a table row for each property
  // ---------------------------------------------------------------------------
  function renderClaimRow(pid, statements, labelMap, lang) {
    const propInfo = PROPERTY_INFO[pid];
    const label = propInfo
      ? (lang === "cy" && propInfo.label_cy ? propInfo.label_cy : propInfo.label_en)
      : pid;
    const datatype = propInfo?.datatype || "string";

    const values = statements
      .map(stmt => Utils.firstValue(stmt))
      .filter(v => v !== undefined)
      .map(v => renderValue(datatype, v, labelMap, lang))
      .join(", ");

    return `<tr><th>${label}</th><td>${values}</td></tr>`;
  }

  // ---------------------------------------------------------------------------
  // Main renderer: generic entity page
  // ---------------------------------------------------------------------------
  function renderGeneric(entity, lang, labelMap = {}) {
    if (!entity) return `<p>Entity not found.</p>`;

    const title = entity.labels?.[lang]?.value || entity.labels?.en?.value || entity.id;
    const desc = entity.descriptions?.[lang]?.value || entity.descriptions?.en?.value || "";

    const claims = entity.claims || {};
    const rows = [];

    for (const pid in claims) {
      rows.push(renderClaimRow(pid, claims[pid], labelMap, lang));
    }

    return `
      <section class="card">
        <h2>${title}</h2>
        ${desc ? `<p>${desc}</p>` : ""}
        <table class="wikidata">
          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  return { renderGeneric };

})();
