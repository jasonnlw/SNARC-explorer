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

    // Normalize QID-like values
    const qid = normalizeQid(value);
    if (qid) {
      const label = labelMap[qid] || qid;
      return `<a href="#/item/${qid}">${label}</a>`;
    }

    // ---- External IDs ----
    if (datatype === "external-id" || (pid && PROPERTY_INFO[pid]?.datatype === "external-id")) {
      const propInfo = PROPERTY_INFO[pid];
      const pattern = propInfo?.url_pattern;
      let url = "";

      if (pattern) {
        // Use the pattern from properties.js (replace $1)
        url = pattern.replace("$1", encodeURIComponent(value));
      } else {
        // Fallbacks for common identifiers (if pattern missing)
        const v = encodeURIComponent(value);
        if (/^P10$/.test(pid)) url = `https://viaf.org/viaf/${v}`;/
else if (/^P102$/.test(pid)) url = `https://id.library.wales/${v}`;
else if (/^P107$/.test(pid)) url = `https://id.library.wales/${v}`;
else if (/^P108$/.test(pid)) url = `https://snarc-llgc.wikibase.cloud/wiki/${v}`;
else if (/^P11$/.test(pid)) url = `https://id.loc.gov/authorities/${v}`;
else if (/^P12$/.test(pid)) url = `https://archives.library.wales/index.php/${v}`;
else if (/^P5$/.test(pid)) url = `https://biography.wales/article/${v}`;
else if (/^P6$/.test(pid)) url = `https://bywgraffiadur.cymru/article/${v}`;
else if (/^P68$/.test(pid)) url = `https://cadwpublic-api.azurewebsites.net/reports/listedbuilding/FullReport?id=${v}`;
else if (/^P69$/.test(pid)) url = `https://coflein.gov.uk/en/site/${v}`;
else if (/^P69$/.test(pid)) url = `https://coflein.gov.uk/cy/safle/${v}`;
else if (/^P8$/.test(pid)) url = `https://id.loc.gov/vocabulary/iso639-1/${v}`;
else if (/^P83$/.test(pid)) url = `https://historicplacenames.rcahmw.gov.uk/placenames/recordedname/${v}`;
else if (/^P9$/.test(pid)) url = `https://isni.oclc.org/xslt/DB=1.2/CMD?ACT=SRCH&IKT=8006&TRM=ISN%3A${v}`;
else if (/^P91$/.test(pid)) url = `https://www.comisiynyddygymraeg.cymru/rhestr-enwau-lleoedd-safonol-cymru/${v}`;
else if (/^P97$/.test(pid)) url = `https://discovery.nationalarchives.gov.uk/details/c/${v}`;
      }

      return url
        ? `<a href="${url}" target="_blank" rel="noopener">${value}</a>`
        : `<code>${value}</code>`;
    }

    // ---- URLs ----
    if (datatype === "url") {
      return `<a href="${value}" target="_blank" rel="noopener">${value}</a>`;
    }

    // ---- Times, quantities, text ----
    if (datatype === "time") return Utils.formatTime(value);
    if (datatype === "quantity")
      return typeof value === "string" && value.startsWith("+") ? value.slice(1) : String(value);

    return String(value);
  }


    // 2) Otherwise, handle by datatype
    switch (datatype) {
      case "url":
        return `<a href="${value}" target="_blank" rel="noopener">${value}</a>`;
      case "time":
        return Utils.formatTime(value);
      case "quantity":
        return typeof value === "string" && value.startsWith("+") ? value.slice(1) : String(value);
      case "external-id":
        return `<code>${value}</code>`;
      case "monolingualtext":
      case "string":
      default:
        return String(value);
    }
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
      .map(v => renderValue(datatype, v, labelMap, lang))
      .join(", ");

    return `<tr><th>${label}</th><td>${values}</td></tr>`;
  }

  // Main generic renderer
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
          <tbody>${rows.join("")}</tbody>
        </table>
      </section>
    `;
  }

  return { renderGeneric };
})();
