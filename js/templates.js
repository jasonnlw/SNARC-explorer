window.Templates = (() => {

  // Normalize a QID from any format (URL, lowercase, etc.)
  function normalizeQid(value) {
    if (!value) return null;
    const m = String(value).match(/Q\d+/i);
    return m ? m[0].toUpperCase() : null;
  }

  // Normalize datatype values like "ExternalId" → "external-id"
  function normalizeDatatype(dt) {
    return dt ? String(dt).toLowerCase().replace(/_/g, "-") : "";
  }

  // Render a single value with best-effort label resolution
  function renderValue(datatype, value, labelMap, lang, pid) {
    if (value == null) return "";

    const qid = normalizeQid(value);
    if (qid) {
      const label = labelMap[qid] || qid;
      return `<a href="#/item/${qid}">${label}</a>`;
    }

    const propInfo = window.PROPERTY_INFO?.[pid];
    const dtNorm = normalizeDatatype(datatype || propInfo?.datatype);

    // --- 📸 Wikimedia Commons image (P50) ---
    if (pid === "P50") {
      const filename = value.replace(/^File:/i, "").trim();
      const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`;
      const filePage = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;
      return `
        <a href="${filePage}" target="_blank" rel="noopener">
          <img src="${thumbUrl}" alt="${filename}" loading="lazy"
            style="max-width:300px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.15); margin:4px;">
        </a>
      `;
    }

    // --- 🗺️ Coordinates (P26) ---
    if (pid === "P26") {
      const [lat, lon] = value.split(",").map(Number);
      const mapId = `map-${Math.random().toString(36).slice(2)}`;
      const modalId = `modal-${mapId}`;
      // static container for Leaflet map
      setTimeout(() => {
        const map = L.map(mapId, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false
        }).setView([lat, lon], 9);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19
        }).addTo(map);
        L.marker([lat, lon]).addTo(map);
      }, 100); // ensure element exists

      // modal popup for larger map
      const modalHTML = `
        <div id="${modalId}" class="map-modal">
          <div class="map-modal-content">
            <div id="${mapId}-large" class="map-large"></div>
            <button class="map-close">&times;</button>
          </div>
        </div>
      `;

      // attach modal after rendering
      setTimeout(() => {
        if (!document.getElementById(modalId)) {
          document.body.insertAdjacentHTML("beforeend", modalHTML);
          const modalMap = L.map(`${mapId}-large`).setView([lat, lon], 13);
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(modalMap);
          L.marker([lat, lon]).addTo(modalMap);
          document.querySelector(`#${modalId} .map-close`).onclick = () => {
            document.getElementById(modalId).style.display = "none";
          };
        }
      }, 200);

      return `
        <div class="map-thumb" onclick="document.getElementById('${modalId}').style.display='block'">
          <div id="${mapId}" style="width:300px;height:200px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.15);margin:4px;"></div>
        </div>
      `;
    }

    // ---- External IDs ----
    if (dtNorm === "externalid" || dtNorm === "external-id") {
      const v = encodeURIComponent(String(value));
      const pattern = propInfo?.url_pattern;
      const url = pattern ? pattern.replace("$1", v) : null;
      return url
        ? `<a href="${url}" target="_blank" rel="noopener">${String(value)}</a>`
        : `<code>${String(value)}</code>`;
    }

    // ---- URLs ----
    if (dtNorm === "url") {
      return `<a href="${value}" target="_blank" rel="noopener">${String(value)}</a>`;
    }

    // ---- Times, quantities, etc. ----
    if (dtNorm === "time") return Utils.formatTime(value);
    if (dtNorm === "quantity")
      return typeof value === "string" && value.startsWith("+") ? value.slice(1) : String(value);

    return String(value);
  }


    const propInfo = window.PROPERTY_INFO?.[pid];
    const dtNorm = normalizeDatatype(datatype || propInfo?.datatype);

    // --- 📸 Special case: Wikimedia Commons file (P31) ---
    if (pid === "P31") {
      // Handle either plain filename or URL
      const filename = value.replace(/^File:/i, "").trim();
      const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`;
      const filePage = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;
      return `
        <a href="${filePage}" target="_blank" rel="noopener">
          <img src="${thumbUrl}" alt="${filename}" loading="lazy" style="max-width:300px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.15); margin:4px;">
        </a>
      `;
    }

    // ---- External IDs ----
    if (dtNorm === "externalid" || dtNorm === "external-id") {
      const v = encodeURIComponent(String(value));
      let url = "";

      // Check if pattern exists in property info
      const pattern = propInfo?.url_pattern;
      if (pattern) {
        url = pattern.replace("$1", v);
      } else {
        // Fallbacks for common identifiers
        if (/^P10$/.test(pid)) url = `https://viaf.org/viaf/${v}`;
        else if (/^P102$/.test(pid)) url = `https://id.library.wales/${v}`;
        else if (/^P107$/.test(pid)) url = `https://id.library.wales/${v}`;
        else if (/^P108$/.test(pid)) url = `https://snarc-llgc.wikibase.cloud/wiki/${v}`;
        else if (/^P11$/.test(pid)) url = `https://id.loc.gov/authorities/${v}`;
        else if (/^P12$/.test(pid)) url = `https://archives.library.wales/index.php/${v}`;
        else if (/^P5$/.test(pid)) url = `https://biography.wales/article/${v}`;
        else if (/^P6$/.test(pid)) url = `https://bywgraffiadur.cymru/article/${v}`;
        else if (/^P68$/.test(pid)) url = `https://cadwpublic-api.azurewebsites.net/reports/listedbuilding/FullReport?id=${v}`;
        else if (/^P69$/.test(pid)) url = `https://coflein.gov.uk/en/site/${v}`;
        else if (/^P8$/.test(pid)) url = `https://id.loc.gov/vocabulary/iso639-1/${v}`;
        else if (/^P83$/.test(pid)) url = `https://historicplacenames.rcahmw.gov.uk/placenames/recordedname/${v}`;
        else if (/^P9$/.test(pid)) url = `https://isni.oclc.org/xslt/DB=1.2/CMD?ACT=SRCH&IKT=8006&TRM=ISN%3A${v}`;
        else if (/^P91$/.test(pid)) url = `https://www.comisiynyddygymraeg.cymru/rhestr-enwau-lleoedd-safonol-cymru/${v}`;
        else if (/^P97$/.test(pid)) url = `https://discovery.nationalarchives.gov.uk/details/c/${v}`;
      }

      return url
        ? `<a href="${url}" target="_blank" rel="noopener">${String(value)}</a>`
        : `<code>${String(value)}</code>`;
    }

    // ---- URLs ----
    if (dtNorm === "url") {
      return `<a href="${value}" target="_blank" rel="noopener">${String(value)}</a>`;
    }

    // ---- Times, quantities, etc. ----
    if (dtNorm === "time") return Utils.formatTime(value);
    if (dtNorm === "quantity")
      return typeof value === "string" && value.startsWith("+") ? value.slice(1) : String(value);

    return String(value);
  }

  // Render a single property row
  function renderClaimRow(pid, statements, labelMap, lang) {
    const cleanPid = pid.replace(/^.*[\/#]/, ""); // normalize IDs
    const propInfo = window.PROPERTY_INFO?.[cleanPid];
    const label = propInfo
      ? (lang === "cy" && propInfo.label_cy ? propInfo.label_cy : propInfo.label_en)
      : cleanPid;
    const datatype = propInfo?.datatype || "String";

    const values = statements
      .map(stmt => Utils.firstValue(stmt))
      .filter(v => v !== undefined)
      .map(v => renderValue(datatype, v, labelMap, lang, cleanPid))
      .join(", ");

    return `<tr><th>${label}</th><td>${values}</td></tr>`;
  }

  // Main generic renderer
  function renderGeneric(entity, lang, labelMap = {}) {
    if (!entity) return `<p>Entity not found.</p>`;

    const title = entity.labels?.[lang]?.value || entity.labels?.en?.value || entity.id;
    const desc = entity.descriptions?.[lang]?.value || entity.descriptions?.en?.value || "";

    const claims = entity.claims || {};
    const rows = Object.keys(claims).map(pid =>
      renderClaimRow(pid, claims[pid], labelMap, lang)
    );

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
