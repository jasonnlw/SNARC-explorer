window.Templates = (() => {

  // --- Helpers ---------------------------------------------------------------
  function normalizeQid(value) {
    if (!value) return null;
    const m = String(value).match(/Q\d+/i);
    return m ? m[0].toUpperCase() : null;
  }

  function normalizeDatatype(dt) {
    return dt ? String(dt).toLowerCase().replace(/_/g, "-") : "";
  }

  // --- Value renderer --------------------------------------------------------
  function renderValue(datatype, value, labelMap, lang, pid) {
    if (value == null) return "";

    // QID values → linked with label
    const qid = normalizeQid(value);
    if (qid) {
      const label = labelMap[qid] || qid;
      return `<a href="#/item/${qid}">${label}</a>`;
    }

    const propInfo = window.PROPERTY_INFO?.[pid];
    const dtNorm = normalizeDatatype(datatype || propInfo?.datatype);

    // 📸 Commons image thumbnails (P50)
    if (pid === "P50") {
      const filename = String(value).replace(/^File:/i, "").trim();
      const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`;
      const filePage = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;
      return `
        <a href="${filePage}" target="_blank" rel="noopener">
          <img src="${thumbUrl}" alt="${filename}" loading="lazy"
               style="max-width:300px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.15);margin:4px;">
        </a>
      `;
    }

    // 🗺️ Coordinates placeholders (P26) → actual Leaflet map is created in postRender()
    if (pid === "P26") {
      // value format from Utils.firstValue is "lat,lon"
      const [latStr, lonStr] = String(value).split(",");
      const lat = Number(latStr), lon = Number(lonStr);
      if (!isFinite(lat) || !isFinite(lon)) return String(value);

      const id = `map-${Math.random().toString(36).slice(2)}`;
      // data attributes are used by postRender to initialize Leaflet
      return `
        <div class="map-thumb" data-lat="${lat}" data-lon="${lon}" data-mapid="${id}">
          <div id="${id}" class="map-thumb-canvas"></div>
        </div>
      `;
    }

    // External identifiers → hyperlink using pattern
    if (dtNorm === "externalid" || dtNorm === "external-id") {
      const pattern = propInfo?.url_pattern;
      if (pattern) {
        const url = pattern.replace("$1", encodeURIComponent(String(value)));
        return `<a href="${url}" target="_blank" rel="noopener">${String(value)}</a>`;
      }
      return `<code>${String(value)}</code>`;
    }

    // URLs
    if (dtNorm === "url") {
      return `<a href="${value}" target="_blank" rel="noopener">${String(value)}</a>`;
    }

    // Times / quantities / default
    if (dtNorm === "time") return Utils.formatTime(value);
    if (dtNorm === "quantity")
      return typeof value === "string" && value.startsWith("+") ? value.slice(1) : String(value);

    return String(value);
  }

  // --- Property rows ---------------------------------------------------------
  function renderClaimRow(pid, statements, labelMap, lang) {
    const cleanPid = pid.replace(/^.*[\/#]/, ""); // ensure "P123"
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

  // --- Main render -----------------------------------------------------------
  function renderGeneric(entity, lang, labelMap = {}) {
    if (!entity) return `<p>Entity not found.</p>`;

    const title = entity.labels?.[lang]?.value || entity.labels?.en?.value || entity.id;
    const desc  = entity.descriptions?.[lang]?.value || entity.descriptions?.en?.value || "";

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

  // --- After-render hook: initialize Leaflet maps & modal --------------------
  function postRender() {
    // Bail out if Leaflet didn't load (keeps site working without maps)
    if (typeof L === "undefined") return;

    // Create a single modal container if not present
    let modal = document.getElementById("map-modal");
    if (!modal) {
      document.body.insertAdjacentHTML("beforeend", `
        <div id="map-modal" class="map-modal" style="display:none">
          <div class="map-modal-content">
            <div id="map-large" class="map-large"></div>
            <button id="map-close" class="map-close" aria-label="Close">&times;</button>
          </div>
        </div>
      `);
      document.getElementById("map-close").onclick = () => {
        document.getElementById("map-modal").style.display = "none";
      };
    }

    // Initialize all thumbnails
    document.querySelectorAll(".map-thumb").forEach(el => {
      const lat = Number(el.dataset.lat);
      const lon = Number(el.dataset.lon);
      const id  = el.dataset.mapid;
      const canvas = document.getElementById(id);
      if (!canvas) return;

      // Style (same footprint as image thumb)
      canvas.style.width = "300px";
      canvas.style.height = "200px";
      canvas.style.borderRadius = "8px";
      canvas.style.boxShadow = "0 2px 5px rgba(0,0,0,0.15)";
      canvas.style.margin = "4px";

      // Create non-interactive thumb
      const map = L.map(id, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
      }).setView([lat, lon], 9);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      L.marker([lat, lon]).addTo(map);

      // Clicking the thumb opens a big, interactive map
      el.addEventListener("click", () => {
        const modalEl = document.getElementById("map-modal");
        modalEl.style.display = "block";
        // Create or re-create large map fresh each time to avoid sizing bugs
        const largeContainer = document.getElementById("map-large");
        largeContainer.innerHTML = "";
        largeContainer.style.width = "100%";
        largeContainer.style.height = "500px";
        const bigMap = L.map("map-large").setView([lat, lon], 13);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(bigMap);
        L.marker([lat, lon]).addTo(bigMap);
        setTimeout(() => bigMap.invalidateSize(), 50);
      });
    });
  }

  return { renderGeneric, postRender };
})();
