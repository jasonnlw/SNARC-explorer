window.Templates = (() => {
  function renderGeneric(entity, lang, labelMap) {
    const label = entity.labels?.[lang]?.value || Object.values(entity.labels||{})[0]?.value || entity.id;
    const desc  = entity.descriptions?.[lang]?.value || "";
    const rows = [];

    for (const pid of Object.keys(entity.claims || {}).sort()) {
      const stmts = entity.claims[pid];
      const values = stmts.map(s => {
        const v = Utils.firstValue(s);
        if (Utils.isQid(v)) {
          const text = labelMap[v] || v;
          return `<a href="#/item/${v}">${text}</a>`;
        }
        if (typeof v === "string" && v.startsWith("+")) return Utils.formatTime(v);
        return (v ?? "").toString();
      });
      rows.push(`<tr><th>${pid}</th><td>${values.join("<br>")}</td></tr>`);
    }

    return `
      <article class="card">
        <h1>${label}</h1>
        ${desc ? `<p>${desc}</p>` : ""}
        <table><tbody>${rows.join("")}</tbody></table>
      </article>
    `;
  }

  const renderPerson = renderGeneric;
  const renderPlace = renderGeneric;
  const renderOrg = renderGeneric;

  return { renderPerson, renderPlace, renderOrg, renderGeneric };
})();
