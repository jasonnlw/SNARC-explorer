window.Templates = (() => {

  // Normalize a QID from any format (URL, lowercase, etc.)
  function normalizeQid(value) {
    if (!value) return null;
    const m = String(value).match(/Q\d+/i);
    return m ? m[0].toUpperCase() : null;
  }

  // Render a single value with best-effort label resolution
  function renderValue(datatype, value, labelMap, lang, pid) {
    if (value == null) return "";

    // 1) If the value looks like a QID, resolve via labelMap (fallback to QID)
    const qid = normalizeQid(value);
    if (qid) {
      const label = labelMap[qid] || qid;
      return `<a href="#/item/${qid}">${label}</a>`;
    }

    // 2) External IDs → hyperlink using url_pattern from PROPERTY_INFO, or fallbacks
    if (datatype === "external-id" || (pid && window.PROPERTY_INFO?.[pid]?.datatype === "external-id")) {
      const propInfo = window.PROPERTY_INFO?.[pid];
      const pattern = propInfo?.url_pattern;
      const v = encodeURIComponent(String(value));
      let url = "";

      if (pattern) {
        url = pattern.replace("$1", v);
      } else {
        // Fallback resolvers (extend as needed)
        if (/^P10$/.test(pid)) url = `https://viaf.org/viaf/${v}`;
        else if (/^P102$/.test(pid)) url = `https://id.library.wales/${v}`;
        else if (/^P107$/.test(pid)) url = `https://id.library.wales/${v}`;
        else if (/^P108$/.test(pid)) url = `https://snarc-llgc.wikibase.cloud/wiki/${v}`;
        else if (/^P11$/.test(pid)) url = `https://id.loc.gov/authorities/${v}`;
        else if (/^P12$/.test(pid)) url = `https://archives.library.wales/index.php/${v}`;
        else if (/^P5$/.test(pid))  url = `https://biography.wales/article/${v}`;
        else if (/^P6$/.test(pid))  url = `https://bywgraffiadur.cymru/article/${v}`;
        else if (/^P68$/.test(pid)) url = `https://cadwpublic-api.azurewebsites.net/reports/listedbuilding/FullReport?id=${v}`;
        else if (/^P69$/.test(pid)) url = `https://coflein.gov.uk/en/site/${v}`;   // choose one variant
        else if (/^P8$/.test(pid))  url = `https://id.loc.gov/vocabulary/iso639-1/${v}`;
        else if (/^P83$/.test(pid)) url = `https://historicplacenames.rcahmw.gov.uk/placenames/recordedname/${v}`;
        else if (/^P9$/.test(pid))  url = `https://isni.oclc.org/xslt/DB=1.2/CMD?ACT=SRCH&IKT=8006&TRM=ISN%3A${v}`;
        else if (/^P91$/.test(pid)) url = `https://www.comisiynyddygymraeg.cymru/rhestr-enwau-lleoedd-safonol-cymru/${v}`;
        else if (/^P97$/.test(pid)) url = `https://discovery.nationalarchives.gov.uk/details/c/${v}`;
      }

      return url
        ? `<a href="${url}" target="_blank" rel="noopener">${String(value)}</a>`
        : `<code>${String(value)}</code>`;
    }

    // 3) URLs
    if (datatype === "url") {
      return `<a href="${value}" target="_blank" rel="noopener">${String(value)}</a>`;
    }

    // 4) Times, quantities, text
    if (datatype === "time") return Utils.formatTime(value);
    if (datatype === "quantity")
      return typeof value === "string" && value.startsWith("+") ? value.slice(1) : String(value);

    return String(value);
  }

  // Render a single property row
  function renderClaimRow(pid, statements, labelMap, lang) {
    const propInfo = window.PROPERTY_INFO ? window.PROPERTY_INFO[pid] : undefined;
    const label = propInfo
      ? (lang === "cy" && propInfo.label_cy ? propInfo.label_cy : propInfo.label_en)
      : pid;
    const datatype = propInfo?.datatype || "string";

    const values = statements
      .map(stmt => Utils.firstValue(stmt))
      .filter(v => v !== undefined)
      .map(v => renderValue(datatype, v, labelMap, lang, pid))
      .join(", ");

    return `<tr><th>${label}</th><td>${values}</td></tr>`;
  }

  // Main generic renderer
  function renderGeneric(entity, lang, labelMap = {}) {
    if (!entity) return `<p>Entity not found.</p>`;

    const title = entity.labels?.[lang]?.value || entity.labels?.[lang === "cy" ? "en" : "cy"]?.value || entity.id;
    const desc  = entity.descriptions?.[lang]?.value || entity.descriptions?.[lang === "cy" ? "en" : "cy"]?.value || "";

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
          <tbody>${rows.join("")}</tbody>
        </table>
      </section>
    `;
  }

  return { renderGeneric };
})();
