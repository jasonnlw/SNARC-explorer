window.Templates = (() => {

  // ---------------------------------------------------------------------------
  // Helper: Render value according to its datatype
  // ---------------------------------------------------------------------------
  function renderValue(datatype, value, labelMap, lang) {
    if (!value) return "";

    switch (datatype) {
  case "wikibase-item":
  return labelMap[value]
    ? `<a href="#/item/${value}">${labelMap[value]}</a>`
    : `<a href="#/item/${value}">${value}</a>`;


      case "external-id":
        // Try to detect known identifier types and link to resolvers
        if (/^Q\d+$/.test(value)) return `<a href="#/item/${value}">${value}</a>`;
        if (/^\d+$/.test(value)) return value;
        return `<code>${value}</code>`;

      case "url":
        return `<a href="${value}" target="_blank" rel="noopener">${value}</a>`;

      case "time":
        return Utils.formatTime(value);

      case "quantity":
        return value.startsWith("+") ? value.slice(1) : value;

      case "monolingualtext":
      case "string":
      default:
        return value;
    }
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

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  return { renderGeneric };

})();
