// -------------------------------------------------------------
// SNARC Explorer – Map Explorer (Homepage + Facets)
// - Leaflet + Leaflet.markercluster (required)
// - OverlappingMarkerSpiderfier-Leaflet (optional, recommended for same-coordinate spider plots)
// -------------------------------------------------------------

/* global L, API */

window.MapExplorer = (() => {

  // -----------------------------------------------------------
  // Config
  // -----------------------------------------------------------

  const ITEM_URL_PREFIX = "https://jasonnlw.github.io/SNARC-explorer/#/item/";

  // Small helper: treat "cy" as Welsh, everything else as English.
  const normaliseLang = (lang) => (lang === "cy" ? "cy" : "en");

  // Use the same proxy endpoint as Advanced Person Search (GitHub Pages safe)
const SNARC_SPARQL_ENDPOINT =
  window.SNARC_SPARQL_ENDPOINT ||
  "https://snarc-proxy.onrender.com/query";

async function runSPARQL(query) {
  const url =
    `${SNARC_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

  const res = await fetch(url, { method: "GET", credentials: "omit" });

  // Read as text first so we can print useful diagnostics if something goes wrong
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SPARQL proxy HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // If this happens again, you'll see the first chars (often XML/HTML)
    throw new Error(`Proxy returned non-JSON. First 200 chars: ${text.slice(0, 200)}`);
  }

  return json?.results?.bindings || [];
}

// Snapshot directory served by GitHub Pages
const MAP_SNAPSHOT_BASE =
  window.MAP_SNAPSHOT_BASE ||
  "data/map-snapshots";

let snapshotIndex = null;

async function getSnapshotIndex() {
  if (snapshotIndex) return snapshotIndex;
  try {
    const res = await fetch(`${MAP_SNAPSHOT_BASE}/index.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`index.json HTTP ${res.status}`);
    snapshotIndex = await res.json();
    return snapshotIndex;
  } catch (e) {
    // Snapshot index is optional (fallback to live queries)
    snapshotIndex = null;
    return null;
  }
}

async function loadSnapshotBindings(datasetKey, langPref) {
  const idx = await getSnapshotIndex();
  const v = idx?.generatedAt ? encodeURIComponent(idx.generatedAt) : Date.now();

  const url = `${MAP_SNAPSHOT_BASE}/${datasetKey}.${langPref}.json?v=${v}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
  return await res.json(); // this is already an array of bindings
}


  // -----------------------------------------------------------
  // Revised SPARQL queries (language-controlled via ${langPref})
  // -----------------------------------------------------------

  const QUERIES = {
    // Places
    landforms: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item ?itemLabel ?itemDescription ?image ?coords
       (GROUP_CONCAT(DISTINCT ?type_label; separator=", ") AS ?types)
WHERE {
  ?item wdt:P7/wdt:P45* wd:Q8575 .
  ?item wdt:P26 ?coords .
  ?item wdt:P7 ?type .

  ?type rdfs:label ?type_label .
  FILTER (lang(?type_label) = "${langPref}")

  OPTIONAL { ?item wdt:P31 ?image }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
GROUP BY ?item ?itemLabel ?itemDescription ?image ?coords
`.trim(),

    settlements: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item ?itemLabel ?itemDescription ?image ?coords
       (GROUP_CONCAT(DISTINCT ?type_label; separator=", ") AS ?types)
WHERE {
  ?item wdt:P7/wdt:P45* wd:Q1368 .
  ?item wdt:P26 ?coords .
  ?item wdt:P7 ?type .

  ?type rdfs:label ?type_label .
  FILTER (lang(?type_label) = "${langPref}")

  OPTIONAL { ?item wdt:P31 ?image }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
GROUP BY ?item ?itemLabel ?itemDescription ?image ?coords
`.trim(),

    regions: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item ?itemLabel ?itemDescription ?image ?coords
       (GROUP_CONCAT(DISTINCT ?type_label; separator=", ") AS ?types)
WHERE {
  ?item wdt:P7/wdt:P45* wd:Q8574 .
  ?item wdt:P26 ?coords .
  ?item wdt:P7 ?type .

  ?type rdfs:label ?type_label .
  FILTER (lang(?type_label) = "${langPref}")

  OPTIONAL { ?item wdt:P31 ?image }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
GROUP BY ?item ?itemLabel ?itemDescription ?image ?coords
`.trim(),

    buildings: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item ?itemLabel ?itemDescription ?image ?coords
       (GROUP_CONCAT(DISTINCT ?type_label; separator=", ") AS ?types)
WHERE {
  ?item wdt:P7/wdt:P45* wd:Q9783 .
  ?item wdt:P26 ?coords .
  ?item wdt:P7 ?type .

  ?type rdfs:label ?type_label .
  FILTER (lang(?type_label) = "${langPref}")

  OPTIONAL { ?item wdt:P31 ?image }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
GROUP BY ?item ?itemLabel ?itemDescription ?image ?coords
`.trim(),

    // People (3 facets from one query)
    peoplePlaces: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT ?item ?itemLabel ?itemDescription
       ?birthplace ?deathplace ?residence
       ?birthplacecoords ?deathplacecoords ?residencecoords
       ?image
WHERE {
  OPTIONAL {
    ?item wdt:P21 ?birthplace .
    OPTIONAL { ?birthplace wdt:P26 ?birthplacecoords . }
  }
  OPTIONAL {
    ?item wdt:P22 ?deathplace .
    OPTIONAL { ?deathplace wdt:P26 ?deathplacecoords . }
  }
  OPTIONAL {
    ?item wdt:P78 ?residence .
    OPTIONAL { ?residence wdt:P26 ?residencecoords . }
  }

  OPTIONAL { ?item wdt:P31 ?image }

  FILTER(BOUND(?birthplace) || BOUND(?deathplace) || BOUND(?residence))

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
`.trim(),

    // Collections
    images: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT ?item ?itemLabel ?itemDescription ?coords ?nlwmedia
WHERE {
  ?item wdt:P26 ?coords .
  ?item wdt:P50 ?nlwmedia .

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
`.trim(),

    collectionsPlaces: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT ?item ?itemLabel ?itemDescription ?coords
       ?archives ?manuscripts ?clipcymru
       ?image
WHERE {
  { ?item wdt:P12 ?archives }
  UNION { ?item wdt:P90 ?manuscripts }
  UNION { ?item wdt:P108 ?clipcymru }

  ?item wdt:P26 ?coords .
  OPTIONAL { ?item wdt:P31 ?image }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
`.trim(),

    // Events
    events: ({ langPref }) => `
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT ?item ?itemLabel ?itemDescription ?coords ?locationLabel ?location ?image
WHERE {
  ?item wdt:P7/wdt:P45* wd:Q9948 .
  ?item wdt:P73 ?location .
  ?location wdt:P26 ?coords .
  OPTIONAL { ?item wdt:P31 ?image }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
}
`.trim()
  };

  // -----------------------------------------------------------
  // Facet registry
  // -----------------------------------------------------------

  const FACETS = [
    {
      groupKey: "places",
      label: { en: "Places", cy: "Lleoedd" },
      items: [
        { key: "landforms",   label: { en: "Landforms",            cy: "Tirffurfiau" },      dataset: "landforms",   category: "places.landforms" },
        { key: "settlements", label: { en: "Human Settlements",    cy: "Anheddiadau Dynol" },dataset: "settlements", category: "places.settlements" },
        { key: "regions",     label: { en: "Regions",              cy: "Ardaloedd" },        dataset: "regions",     category: "places.regions" },
        { key: "buildings",   label: { en: "Buildings & Structures",cy: "Adeiladau a Strwythurau" }, dataset: "buildings", category: "places.buildings" }
      ]
    },
    {
      groupKey: "people",
      label: { en: "People", cy: "Pobl" },
      items: [
        { key: "birth",     label: { en: "Place of Birth", cy: "Man Geni" },  dataset: "peoplePlaces", category: "people.birth", property: "P21" },
        { key: "death",     label: { en: "Place of Death", cy: "Man Marw" },  dataset: "peoplePlaces", category: "people.death", property: "P22" },
        { key: "residence", label: { en: "Residence",      cy: "Preswylfa" }, dataset: "peoplePlaces", category: "people.residence", property: "P78" }
      ]
    },
    {
      groupKey: "collections",
      label: { en: "Collections", cy: "Casgliadau" },
      items: [
        { key: "images",      label: { en: "Images",      cy: "Delweddau" },  dataset: "images",            category: "collections.images", property: "P50", special: "images" },
        { key: "archives",    label: { en: "Archives",    cy: "Archifau" },   dataset: "collectionsPlaces", category: "collections.archives", property: "P12" },
        { key: "manuscripts", label: { en: "Manuscripts", cy: "Llawysgrifau"},dataset: "collectionsPlaces", category: "collections.manuscripts", property: "P90" },
        { key: "clipcymru",   label: { en: "Clip Cymru",  cy: "Clip Cymru" },dataset: "collectionsPlaces", category: "collections.clipcymru", property: "P108" }
      ]
    },
    {
      groupKey: "events",
      label: { en: "Events", cy: "Digwyddiadau" },
      items: [
        { key: "events", label: { en: "All Events", cy: "Pob Digwyddiad" }, dataset: "events", category: "events.all" }
      ]
    }
  ];

  // -----------------------------------------------------------
  // Marker styles (divIcon)
  // -----------------------------------------------------------

  const MARKER_STYLE = {
    "places.landforms":     { className: "me-pin me-pin-places",     glyph: "⛰" },
    "places.settlements":   { className: "me-pin me-pin-places",     glyph: "🏘" },
    "places.regions":       { className: "me-pin me-pin-places",     glyph: "🗺" },
    "places.buildings":     { className: "me-pin me-pin-places",     glyph: "🏛" },

    "people.birth":         { className: "me-pin me-pin-people",     glyph: "★" },
    "people.death":         { className: "me-pin me-pin-people",     glyph: "✦" },
    "people.residence":     { className: "me-pin me-pin-people",     glyph: "⌂" },

    "collections.images":   { className: "me-pin me-pin-images",     glyph: "▦" },
    "collections.archives": { className: "me-pin me-pin-collections",glyph: "▣" },
    "collections.manuscripts": { className: "me-pin me-pin-collections", glyph: "▤" },
    "collections.clipcymru":{ className: "me-pin me-pin-collections",glyph: "▧" },

    "events.all":           { className: "me-pin me-pin-events",     glyph: "●" }
  };

  // -----------------------------------------------------------
  // State
  // -----------------------------------------------------------

  let map = null;

  // Cluster group containing all markers currently visible
  let clusterGroup = null;

  // Optional: spiderfy for same-coordinate markers
  let oms = null;

  // Cache: cache[langPref][datasetKey] = normalisedRecords[]
  const cache = { en: {}, cy: {} };

  // Selected facets: set of facet item keys
  const selected = new Set();

  // coordKey -> count
  let coordCounts = new Map();

  // DOM refs
  let rootEl = null;
  let filterPanelEl = null;
  let filterToggleBtn = null;

  // Hover refs

  let spiderLayer = null;
  let activeSpiderKey = null;

// Sticky popup management (desktop hover)
let activePopupMarker = null;
let outsidePopupListener = null;

function makePopupSticky(marker) {
  const popupEl = marker.getPopup()?.getElement();
  if (!popupEl) return;

  // Prevent clicks inside popup from bubbling to the map/document
  if (typeof L !== "undefined" && L.DomEvent) {
    L.DomEvent.disableClickPropagation(popupEl);
    L.DomEvent.disableScrollPropagation(popupEl);
  }

  // Replace any previous outside-click listener
  if (outsidePopupListener) {
    document.removeEventListener("mousedown", outsidePopupListener, true);
    outsidePopupListener = null;
  }

  activePopupMarker = marker;

  outsidePopupListener = (ev) => {
    const el = marker.getPopup()?.getElement();
    if (!el) return;

    // Click inside popup => keep it open
    if (el.contains(ev.target)) return;

    // Otherwise close
    try { marker.closePopup(); } catch (e) {}
  };

  // Use capture to ensure we see the click early
  document.addEventListener("mousedown", outsidePopupListener, true);

  // Cleanup when popup closes (X button, etc.)
  marker.once("popupclose", () => {
    if (outsidePopupListener) {
      document.removeEventListener("mousedown", outsidePopupListener, true);
      outsidePopupListener = null;
    }
    if (activePopupMarker === marker) activePopupMarker = null;
  });
}

const isDesktopHover =
  window.matchMedia &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;


  // -----------------------------------------------------------
  // Public init
  // -----------------------------------------------------------

  async function initHomeMap(lang = "en") {
    const langPref = normaliseLang(lang);

    rootEl = document.getElementById("homeMap");
    if (!rootEl) return;
    
  // If the homepage was re-rendered, #homeMap is a NEW DOM node.
  // Leaflet must be destroyed and re-created against the new container.
  if (map && typeof map.getContainer === "function") {
    const currentContainer = map.getContainer();
    if (currentContainer !== rootEl) {
      try { map.remove(); } catch (e) {}
      map = null;
      clusterGroup = null;
      oms = null;
    }
  }

      // ---------------------------------------------------------
  // Map loading overlay (created once per homeMap instance)
  // ---------------------------------------------------------
  let overlay = rootEl.querySelector(".map-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "map-loading-overlay";
    overlay.innerHTML = `
      <div class="map-loading-spinner" aria-label="Loading"></div>
    `;
    rootEl.appendChild(overlay);
  }

  // Expose a local helper for this map instance
  function setLoading(isLoading) {
    overlay.classList.toggle("is-visible", !!isLoading);
  }

  // Make it available to other functions in this module
  window.__mapExplorerSetLoading = setLoading;



    buildShell();
    initLeaflet();
    // Defaults only on first load (so checkboxes + initial pins appear)
    if (selected.size === 0) {
      selectDefaultFacets();
    }
    buildFilterPanel(langPref);



// ---------------------------------------------------------
// Initial dataset load (show overlay immediately)
// ---------------------------------------------------------
if (window.__mapExplorerSetLoading) {
  window.__mapExplorerSetLoading(true);
}

try {
  await applyFacets(langPref);
} finally {
  if (window.__mapExplorerSetLoading) {
    window.__mapExplorerSetLoading(false);
  }
}


    // Responsive panel behaviour
    window.addEventListener("resize", () => syncPanelForViewport());
    syncPanelForViewport();
  }

  function setLanguage(lang = "en") {
    const langPref = normaliseLang(lang);
    buildFilterPanel(langPref, /* rebuildOnly */ true);
    applyFacets(langPref);
  }

  // -----------------------------------------------------------
  // Shell + filter panel
  // -----------------------------------------------------------

    
  function buildShell() {

    // Guard: if already wrapped, just re-bind refs and exit
    const existingShell = rootEl?.parentElement?.classList?.contains("map-explorer-shell");
    if (existingShell) {
      filterToggleBtn = rootEl.parentElement.querySelector(".me-filters-toggle");
      filterPanelEl = rootEl.parentElement.querySelector(".me-filters-panel");
      return;
    }

    // Wrap map element to allow overlay UI
    const wrapper = document.createElement("div");
    wrapper.className = "map-explorer-shell";
    rootEl.parentNode.insertBefore(wrapper, rootEl);
    wrapper.appendChild(rootEl);

    // Toggle button (mobile)
    filterToggleBtn = document.createElement("button");
    filterToggleBtn.type = "button";
    filterToggleBtn.className = "me-filters-toggle aps-btn aps-btn-ghost";
    filterToggleBtn.addEventListener("click", () => {
      filterPanelEl.classList.toggle("open");
    });

    wrapper.appendChild(filterToggleBtn);

    // Filter panel
    filterPanelEl = document.createElement("div");
    filterPanelEl.className = "me-filters-panel";
    wrapper.appendChild(filterPanelEl);
  }

  function buildFilterPanel(langPref, rebuildOnly = false) {
    if (!filterPanelEl) return;

    const t = (en, cy) => (langPref === "cy" ? cy : en);

    if (filterToggleBtn) {
      filterToggleBtn.textContent = t("Filters", "Hidlyddion");
    }

    filterPanelEl.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "me-panel-header";

    const title = document.createElement("div");
    title.className = "me-panel-title";
    title.textContent = t("Map Explorer", "Archwiliwr Map");

    const actions = document.createElement("div");
    actions.className = "me-panel-actions";

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "aps-btn aps-btn-ghost";
    clearBtn.textContent = t("Clear", "Clirio");
    clearBtn.addEventListener("click", () => {
      selected.clear();
      filterPanelEl.querySelectorAll("input[type='checkbox']").forEach(cb => { cb.checked = false; });
      applyFacets(langPref);
    });

    actions.appendChild(clearBtn);

    header.appendChild(title);
    header.appendChild(actions);
    filterPanelEl.appendChild(header);

    // Groups
    FACETS.forEach(group => {
      const groupWrap = document.createElement("div");
      groupWrap.className = "me-group";

      const groupTitle = document.createElement("div");
      groupTitle.className = "me-group-title";
      groupTitle.textContent = group.label[langPref];

      groupWrap.appendChild(groupTitle);

      group.items.forEach(item => {
        const row = document.createElement("label");
        row.className = "me-facet-row";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = selected.has(item.key);

        cb.addEventListener("change", async () => {
          if (cb.checked) selected.add(item.key);
          else selected.delete(item.key);
          await applyFacets(langPref);
        });

        const txt = document.createElement("span");
        txt.textContent = item.label[langPref];

        row.appendChild(cb);
        row.appendChild(txt);
        groupWrap.appendChild(row);
      });

      filterPanelEl.appendChild(groupWrap);
    });

    const hint = document.createElement("div");
    hint.className = "me-panel-hint";
    hint.textContent = t("Select one or more datasets to display.", "Dewiswch un neu fwy o setiau data i’w dangos.");
    filterPanelEl.appendChild(hint);

    syncPanelForViewport();
  }

  function selectDefaultFacets() {
selected.clear();
  selected.add("images"); // Images
  }

  function syncPanelForViewport() {
    if (!filterPanelEl) return;

    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    filterPanelEl.classList.toggle("me-mobile", isMobile);

    if (!isMobile) filterPanelEl.classList.add("open");
    else filterPanelEl.classList.remove("open");
  }

  // -----------------------------------------------------------
  // Leaflet init
  // -----------------------------------------------------------

  function initLeaflet() {
    if (map) return;

    map = L.map(rootEl, { scrollWheelZoom: true });

function getWeightedClusterCount(cluster) {
  let total = 0;
  cluster.getAllChildMarkers().forEach(m => {
    total += (m && typeof m.__meCount === "number") ? m.__meCount : 1;
  });
  return total;
}

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    map.setView([52.3, -3.8], 7);
setTimeout(() => map.invalidateSize(), 0);

clusterGroup = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 55,
  spiderfyOnMaxZoom: true,
  spiderLegPolylineOptions: {
    weight: 1.5,
    opacity: 0.7
  },

iconCreateFunction: function (cluster) {
  const count = getWeightedClusterCount(cluster);

  // Match Leaflet.markercluster default size buckets
  let sizeClass = "marker-cluster-small";
  if (count >= 100) sizeClass = "marker-cluster-large";
  else if (count >= 10) sizeClass = "marker-cluster-medium";

return L.divIcon({
  html: `<div><span>${count}</span></div>`,
  className: `marker-cluster ${sizeClass}`,
  iconSize: L.point(40, 40),
  iconAnchor: L.point(20, 20) // critical: centre anchor so spider legs originate correctly
});
}

});


    map.addLayer(clusterGroup);

    // Optional OMS for true “same coordinate” spider plots
    if (typeof OverlappingMarkerSpiderfier !== "undefined") {
      oms = new OverlappingMarkerSpiderfier(map, {
        keepSpiderfied: true,
        nearbyDistance: 28,
        legWeight: 1.5
      });
    }
 
  // ✅ MOVE THIS HERE (was incorrectly at top-level)
  if (!spiderLayer) {
    spiderLayer = L.layerGroup().addTo(map);
  }
  map.on("zoomstart movestart", clearSpider);
}


  // -----------------------------------------------------------
  // Fetch + normalise
  // -----------------------------------------------------------

  async function fetchDataset(datasetKey, langPref) {
    if (cache[langPref][datasetKey]) return cache[langPref][datasetKey];

    const queryBuilder = QUERIES[datasetKey];
    if (!queryBuilder) {
      cache[langPref][datasetKey] = [];
      return cache[langPref][datasetKey];
    }

    const query = queryBuilder({ langPref });

    let results;

    // 1) Try snapshot first (fast)
    try {
      results = await loadSnapshotBindings(datasetKey, langPref);
    } catch (e) {
      results = null;
    }

    // 2) Fallback to live query if snapshot missing/failed
    if (!results) {
      try {
        results = await runSPARQL(query);
      } catch (err) {
        console.error("MapExplorer: SPARQL error for", datasetKey, err);
        cache[langPref][datasetKey] = [];
        return cache[langPref][datasetKey];
      }
    }


    const records = normaliseResults(datasetKey, results);
    cache[langPref][datasetKey] = records;
    return records;
  }

  function normaliseResults(datasetKey, rows) {
    const out = [];

    const getQid = (uri) => (uri ? uri.split("/").pop() : "");

    const parsePoint = (wkt) => {
      if (!wkt) return null;
      const s = wkt.replace("Point(", "").replace(")", "").trim();
      const parts = s.split(/\s+/);
      if (parts.length !== 2) return null;
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
      return { lat, lon };
    };

    if (datasetKey === "peoplePlaces") {
      rows.forEach(row => {
        const personQid = getQid(row.item?.value);
        const title = row.itemLabel?.value || personQid;
        const desc = row.itemDescription?.value || "";
        const imageVal = row.image?.value || null;

        const pushIf = (placeField, coordField, category) => {
          if (!row[placeField]?.value || !row[coordField]?.value) return;

          const placeQid = getQid(row[placeField].value);
          const placeLabel = row[`${placeField}Label`]?.value || placeQid;
          const coords = parsePoint(row[coordField].value);
          if (!coords) return;

          out.push({
            datasetKey,
            category,
            qid: personQid,
            title,
            description: desc,
            placeQid,
            placeLabel,
            coords,
            image: imageVal
          });
        };

        pushIf("birthplace", "birthplacecoords", "people.birth");
        pushIf("deathplace", "deathplacecoords", "people.death");
        pushIf("residence", "residencecoords", "people.residence");
      });

      return out;
    }

    if (datasetKey === "images") {
      rows.forEach(row => {
        const itemQid = getQid(row.item?.value);
        const coords = parsePoint(row.coords?.value);
        if (!coords) return;

        out.push({
          datasetKey,
          category: "collections.images",
          qid: itemQid,
          title: row.itemLabel?.value || itemQid,
          description: row.itemDescription?.value || "",
          coords,
          nlwmedia: row.nlwmedia?.value || null
        });
      });
      return out;
    }

    if (datasetKey === "collectionsPlaces") {
      rows.forEach(row => {
        const itemQid = getQid(row.item?.value);
        const coords = parsePoint(row.coords?.value);
        if (!coords) return;

        const imageVal = row.image?.value || null;

        if (row.archives?.value) {
          out.push({ datasetKey, category: "collections.archives", qid: itemQid, title: row.itemLabel?.value || itemQid, description: row.itemDescription?.value || "", coords, image: imageVal });
        }
        if (row.manuscripts?.value) {
          out.push({ datasetKey, category: "collections.manuscripts", qid: itemQid, title: row.itemLabel?.value || itemQid, description: row.itemDescription?.value || "", coords, image: imageVal });
        }
        if (row.clipcymru?.value) {
          out.push({ datasetKey, category: "collections.clipcymru", qid: itemQid, title: row.itemLabel?.value || itemQid, description: row.itemDescription?.value || "", coords, image: imageVal });
        }
      });

      return out;
    }

    // Default datasets
    rows.forEach(row => {
      const itemQid = getQid(row.item?.value);
      const coords = parsePoint(row.coords?.value);
      if (!coords) return;

      const imageVal = row.image?.value || null;

      let category = "places.settlements";
      if (datasetKey === "landforms") category = "places.landforms";
      if (datasetKey === "settlements") category = "places.settlements";
      if (datasetKey === "regions") category = "places.regions";
      if (datasetKey === "buildings") category = "places.buildings";
      if (datasetKey === "events") category = "events.all";

      out.push({
        datasetKey,
        category,
        qid: itemQid,
        title: row.itemLabel?.value || itemQid,
        description: row.itemDescription?.value || "",
        coords,
        image: imageVal,
        types: row.types?.value || ""
      });
    });

    return out;
  }

  // -----------------------------------------------------------
  // Render markers according to selected facets
  // -----------------------------------------------------------

async function applyFacets(langPref) {
  if (!map || !clusterGroup) return;
  clearSpider();

  // Show loading overlay (if wired)
  if (window.__mapExplorerSetLoading) {
    window.__mapExplorerSetLoading(true);
  }

  try {
    clusterGroup.clearLayers();
    coordCounts = new Map();

    if (oms) oms.clearMarkers();

    const neededDatasets = new Set();
    FACETS.forEach(g => g.items.forEach(it => { if (selected.has(it.key)) neededDatasets.add(it.dataset); }));

    if (neededDatasets.size === 0) return;

    const datasetRecords = {};
    for (const ds of neededDatasets) {
      datasetRecords[ds] = await fetchDataset(ds, langPref);
    }

    const wantedCategories = new Set();
    FACETS.forEach(g => g.items.forEach(it => {
      if (selected.has(it.key)) wantedCategories.add(it.category);
    }));

// 1. Build visible records
const visible = [];
Object.values(datasetRecords).forEach(records => {
  records.forEach(r => {
    if (wantedCategories.has(r.category)) visible.push(r);
  });
});

// 2. Group visible records by coordinate
const byCoord = new Map();
visible.forEach(r => {
  const k = coordKey(r.coords);
  if (!byCoord.has(k)) byCoord.set(k, []);
  byCoord.get(k).push(r);
});

// 3. Create markers (ONLY from byCoord)
byCoord.forEach((recordsAtCoord, k) => {
  const centerCoords = recordsAtCoord[0].coords;

    // ---------------------------------------------------------
  // Images-only: one marker per coordinate, thumbs in a ring
  // ---------------------------------------------------------
  const isImagesOnlyCoord =
    recordsAtCoord.length > 0 &&
    recordsAtCoord.every(r => r.category === "collections.images");

  if (isImagesOnlyCoord) {
    const count = recordsAtCoord.length;
    const marker = makeMarker(centerCoords, "collections.images", count > 1 ? count : null);

    wireImagesRing(marker, { coords: centerCoords, items: recordsAtCoord }, langPref);

    clusterGroup.addLayer(marker);
    return;
  }


  // Single item → hover works immediately
  // Single item → hover works immediately
if (recordsAtCoord.length === 1) {
  const record = recordsAtCoord[0];
  const marker = makeMarker(centerCoords, record.category, null);

  if (record.category === "collections.images") {
    wireHoverPopup(
      marker,
      () => buildImagesPopup({ coords: centerCoords, items: [record] }, langPref),
      () => renderImagesThumbsIntoPopup({ coords: centerCoords, items: [record] }, marker)
    );
} else {
  wireHoverPopup(
    marker,
    () => buildStandardPopup(record, langPref),
    () => {
      renderStandardThumbIntoPopup(record, marker);
      if (record.category && record.category.startsWith("people.")) {
        hydratePeoplePlaceLabelsInPopup(marker, langPref);
      }
    }
  );
}  // ✅ ADD THIS LINE to close the else block

clusterGroup.addLayer(marker);
return;
}

  // Multiple items → aggregate marker with count, click to expand
  const agg = makeMarker(centerCoords, recordsAtCoord[0].category, recordsAtCoord.length);

  agg.on("click", () => {
    expandSpiderAt(centerCoords, recordsAtCoord, langPref);
  });

  clusterGroup.addLayer(agg);
});

  } finally {
    // Always hide loading overlay (even if SPARQL fails)
    if (window.__mapExplorerSetLoading) {
      window.__mapExplorerSetLoading(false);
    }
  }
}


  function coordKey(coords) {
    return `${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}`;
  }

  function groupImagesByCoord(visibleRecords) {
    const m = new Map();
    visibleRecords.forEach(r => {
      if (r.category !== "collections.images") return;
      const k = coordKey(r.coords);
      if (!m.has(k)) m.set(k, { coords: r.coords, items: [] });
      m.get(k).items.push(r);
    });
    m.forEach(g => { g.items = g.items.slice(0, 10); });
    return m;
  }

  // -----------------------------------------------------------
  // Marker icon factory
  // -----------------------------------------------------------

function makeMarker(coords, category, count = 1) {
  const style = MARKER_STYLE[category] || { className: "me-pin", glyph: "●" };

  const badge = count > 1 ? `<span class="me-pin-badge">${count}</span>` : "";
  const html = `
    <div class="me-pin-inner">
      <span class="me-pin-glyph">${style.glyph}</span>
      ${badge}
    </div>
  `;

  const icon = L.divIcon({
    className: style.className,
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26]
  });

  const marker = L.marker([coords.lat, coords.lon], { icon });

  // ✅ attach weight for cluster summing
  marker.__meCount = Number(count) || 1;

  return marker;
}


  // -----------------------------------------------------------
  // Popup builders
  // -----------------------------------------------------------

  function buildStandardPopup(record, langPref) {
    const t = (en, cy) => (langPref === "cy" ? cy : en);

    const qid = record.qid;
    const link = `${ITEM_URL_PREFIX}${qid}`;

    const typesHTML = record.types ? `<div class="me-popup-meta">${escapeHtml(record.types)}</div>` : "";
    const isPeoplePlace = record.category && record.category.startsWith("people.");
const placeHTML = (isPeoplePlace && record.placeQid)
  ? `<div class="me-popup-meta">
       ${t("Place:", "Lle:")}
       <a class="me-place-link"
          data-place-qid="${escapeHtml(record.placeQid)}"
          href="${ITEM_URL_PREFIX}${escapeHtml(record.placeQid)}">
          ${escapeHtml(record.placeLabel || record.placeQid)}
       </a>
     </div>`
  : (record.placeLabel
      ? `<div class="me-popup-meta">${t("Place:", "Lle:")} ${escapeHtml(record.placeLabel)}</div>`
      : "");


    const thumbWrap = `<div class="me-popup-thumb" data-me-thumb data-qid="${escapeHtml(qid)}"></div>`;

    return `
      <div class="me-popup">
        <div class="me-popup-title">${escapeHtml(record.title || qid)}</div>
        ${record.description ? `<div class="me-popup-desc">${escapeHtml(record.description)}</div>` : ""}
        ${placeHTML}
        ${typesHTML}
        ${thumbWrap}
        <a class="me-popup-link" href="${link}">
          ${t("View details", "Gweld manylion")}
        </a>
      </div>
    `;
  }

  function buildImagesPopup(group, langPref) {
    const t = (en, cy) => (langPref === "cy" ? cy : en);

    return `
      <div class="me-popup">
        <div class="me-popup-title">${t("Images at this location", "Delweddau yn y lleoliad hwn")}</div>
        <div class="me-popup-meta">${t("Showing up to 10 thumbnails.", "Yn dangos hyd at 10 mân-lun.")}</div>
        <div class="me-popup-thumbs" data-me-images-thumbs></div>
      </div>
    `;
  }

  function wireHoverPopup(marker, buildPopupHtml, onAfterOpen) {
    const open = () => {
      marker.bindPopup(buildPopupHtml(), {
  className: "me-fixed-popup",
  maxWidth: 200,
  minWidth: 200,
  autoPan: true
}).openPopup();

      if (onAfterOpen) setTimeout(onAfterOpen, 0);

      // Desktop: keep popup open until closed or outside click
      if (isDesktopHover) {
        setTimeout(() => makePopupSticky(marker), 0);
      }
    };

    // Always support click (mobile + accessibility)
    marker.on("click", open);

    // Desktop hover opens; do NOT close on mouseout
    if (isDesktopHover) {
      marker.on("mouseover", open);
    }
  }

  function clearSpider() {
    if (!spiderLayer) return;
    spiderLayer.clearLayers();
    activeSpiderKey = null;
  }

function expandSpiderAt(coords, records, langPref) {
  if (!map || !spiderLayer) return;

  clearSpider();
  activeSpiderKey = coordKey(coords);

  // Convert center latlng -> pixel point
  const center = L.latLng(coords.lat, coords.lon);
  const centerPt = map.project(center, map.getZoom());

  const n = records.length;
  const radiusPx = 36; // adjust for spacing
  const step = (Math.PI * 2) / n;

  records.forEach((record, i) => {
    const angle = i * step;
    const pt = L.point(
      centerPt.x + radiusPx * Math.cos(angle),
      centerPt.y + radiusPx * Math.sin(angle)
    );
    
const zoom = map.getZoom();
const latlng = map.unproject(pt, zoom);

// Anchor spider line to the *visual centre* of the icons (your icons are 28px high)
const ICON_HALF_HEIGHT = 14;

// Convert both endpoints to pixel space, offset upward, then convert back to latlng
const centerAnchorLatLng = map.unproject(
  L.point(centerPt.x, centerPt.y - ICON_HALF_HEIGHT),
  zoom
);

const childPt = map.project(latlng, zoom);
const childAnchorLatLng = map.unproject(
  L.point(childPt.x, childPt.y - ICON_HALF_HEIGHT),
  zoom
);

// ✅ Add a connecting “spider leg” line (black) from parent centre to child centre
const leg = L.polyline([centerAnchorLatLng, childAnchorLatLng], {
  color: "#000",
  weight: 1.5,
  opacity: 1,
  interactive: false
});
spiderLayer.addLayer(leg);


// Child markers: NO COUNT on expanded nodes
const child = makeMarker({ lat: latlng.lat, lon: latlng.lng }, record.category, null);


    // Popups on hover/click
    if (record.category === "collections.images") {
      wireHoverPopup(
        child,
        () => buildImagesPopup({ coords: record.coords, items: [record] }, langPref),
        () => renderImagesThumbsIntoPopup({ coords: record.coords, items: [record] }, child)
      );
    } else {
wireHoverPopup(
  child,
  () => buildStandardPopup(record, langPref),
  () => {
    renderStandardThumbIntoPopup(record, child);
    if (record.category && record.category.startsWith("people.")) {
      hydratePeoplePlaceLabelsInPopup(child, langPref);
    }
  }
);
}


    spiderLayer.addLayer(child);
  });
}


function ensureImagesRingPanes() {
  if (!map) return;

  // Legs (polylines)
  if (!map.getPane("me-images-legs")) {
    const p = map.createPane("me-images-legs");
    p.style.zIndex = 950; // above markers/cluster icons
    p.style.pointerEvents = "none";
  }

  // Thumbnails (markers)
  if (!map.getPane("me-images-thumbs")) {
    const p = map.createPane("me-images-thumbs");
    p.style.zIndex = 960; // above legs
  }
}
  

// -----------------------------------------------------------
// Images ring (ONLY for collections.images)
// - Up to 10 circular thumbs around the parent marker
// - IIIF fallback preflight (avoid empty frames)
// - Click thumb => open parent entity item page (QID)
// -----------------------------------------------------------

function ensureImagesRingStyles() {
  // Intentionally minimal now; project CSS handles appearance.
  if (document.getElementById("me-images-ring-style")) return;

  const style = document.createElement("style");
  style.id = "me-images-ring-style";
  style.textContent = `
    .me-thumb-icon--clickable { cursor: pointer; }
  `;
  document.head.appendChild(style);
}


function iiifCandidatesFromNlwMedia(nlwmediaValue, sizePx = 140) {
  // Matches your gallery logic: extract numeric base id, apply multi-range rule
  const idMatch = String(nlwmediaValue || "").match(/(\d{6,})/);
  if (!idMatch) return null;

  const baseId = parseInt(idMatch[1], 10);
  const isMulti = baseId >= 1448577 && baseId <= 1588867;
  const imageId = isMulti ? baseId + 1 : baseId;

  const url1 = `https://damsssl.llgc.org.uk/iiif/image/${imageId}/full/${sizePx},/0/default.jpg`;
  const url2 = `https://damsssl.llgc.org.uk/iiif/2.0/image/${imageId}/full/${sizePx},/0/default.jpg`;

  return { baseId, imageId, isMulti, urls: [url1, url2] };
}

function preflightIIIF(urlList) {
  // Try each URL until one loads; resolve the working URL or null
  return new Promise(resolve => {
    const tryNext = (i) => {
      if (i >= urlList.length) return resolve(null);
      const url = urlList[i];

      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => tryNext(i + 1);
      img.src = url;
    };
    tryNext(0);
  });
}

async function buildThumbMarker(latlng, thumbUrl, qid) {
  ensureImagesRingStyles();

const html = `
  <div class="me-thumb-icon me-thumb-icon--clickable" role="button" tabindex="0" aria-label="Open item ${escapeHtml(qid)}">
    <div class="me-thumb-inner">
      <img src="${thumbUrl}" alt="" loading="lazy">
    </div>
  </div>
`;

const icon = L.divIcon({
  className: "me-thumb-leaflet-icon",
  html,
  iconSize: [140, 140],
  iconAnchor: [70, 70]
});


const m = L.marker(latlng, {
  icon,
  keyboard: true,
  pane: "me-images-thumbs"
});
m.setZIndexOffset(10000);


  const href = `${ITEM_URL_PREFIX}${qid}`;
  const open = () => window.open(href, "_self"); // same tab to match “load the item page”
  m.on("click", open);
  m.on("keypress", (e) => {
    if (e?.originalEvent?.key === "Enter") open();
  });

  return m;
}

async function showImagesRingAt(parentMarker, group, langPref) {
  if (!map || !spiderLayer) return;
  ensureImagesRingPanes();

  const itemsRaw = Array.isArray(group?.items) ? group.items : [];
  const items = itemsRaw.slice(0, 10);

  // Toggle: if this ring is already open, close it
  const parentLatLng = parentMarker.getLatLng();
  const key = `images:${parentLatLng.lat.toFixed(5)},${parentLatLng.lng.toFixed(5)}`;
  if (activeSpiderKey === key) {
    clearSpider();
    return;
  }

  clearSpider();
  activeSpiderKey = key;

  // Preflight thumbs first (avoid rendering empty circles)
  const resolved = [];
  for (const r of items) {
    const qid = r?.qid;
    const cand = iiifCandidatesFromNlwMedia(r?.nlwmedia, /* sizePx */ 300);
    if (!qid || !cand) continue;

    const okUrl = await preflightIIIF(cand.urls);
    if (!okUrl) continue;

    resolved.push({ qid, thumbUrl: okUrl });
  }

  if (!resolved.length) return;





  
  // -----------------------------------------------------------
// Geometry: inner-only ring for < 5, staggered ring for >= 5
// -----------------------------------------------------------
  const n = resolved.length;

  const thumbDiameter = 140;
  const gap = 14;
  const minRadius = 90;

  // Base radius derived from circumference (prevents overlap)
  const baseRadius = Math.max(
    minRadius,
    Math.ceil((n * (thumbDiameter + gap)) / (2 * Math.PI))
  );

  // If fewer than 5 images, keep ALL on a single inner ring
  const useStagger = n >= 5;

  const radiusNear = baseRadius;
  const radiusFar  = baseRadius + (thumbDiameter * 0.55) + gap;

  const center = parentLatLng;
  const zoom = map.getZoom();
  const centerPt = map.project(center, zoom);
  const step = (Math.PI * 2) / n;

  // Optional: draw legs (match your existing spider aesthetic)
  const ICON_HALF_HEIGHT = 14; // your pins are 28px high; keep this consistent
  const centerAnchorLatLng = map.unproject(
    L.point(centerPt.x, centerPt.y - ICON_HALF_HEIGHT),
    zoom
  );

  for (let i = 0; i < n; i++) {
    const angle = i * step;

    // Radius rule:
    // - < 5 images: all inner ring
    // - >= 5 images: alternate near/far
    const r = useStagger ? ((i % 2 === 0) ? radiusNear : radiusFar) : radiusNear;

    const pt = L.point(
      centerPt.x + r * Math.cos(angle),
      centerPt.y + r * Math.sin(angle)
    );

    const latlng = map.unproject(pt, zoom);

    // Leg line to thumb centre (visual neatness)
    const childPt = map.project(latlng, zoom);
    const childAnchorLatLng = map.unproject(
      L.point(childPt.x, childPt.y - ICON_HALF_HEIGHT),
      zoom
    );

const leg = L.polyline([centerAnchorLatLng, childAnchorLatLng], {
  pane: "me-images-legs",
  color: "#000",
  weight: 1.5,
  opacity: 1,
  interactive: false
});

    spiderLayer.addLayer(leg);

    const thumb = resolved[i];
    const m = await buildThumbMarker(latlng, thumb.thumbUrl, thumb.qid);
    spiderLayer.addLayer(m);
  }
}

function wireImagesRing(marker, group, langPref) {
  const open = () => showImagesRingAt(marker, group, langPref);

  // Defensive: ensure we don't accumulate handlers across re-inits/navigation
  marker.off("click");
  marker.off("mouseover");

  // Always support click (desktop + mobile)
  marker.on("click", open);

  // Hover: evaluate capability at runtime (important after SPA navigation)
  marker.on("mouseover", () => {
    const canHover =
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (canHover) open();
  });
}




// -----------------------------------------------------------
// Thumbnail logic (IIIF fallback preserved)
// -----------------------------------------------------------

function extractNumericId(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/(\d+)(?:\D*)$/);
  return m ? m[1] : null;
}

  function isMultiRange(baseId) {
    const n = parseInt(baseId, 10);
    return n >= 1448577 && n <= 1588867;
  }

  function createIIIFThumb(baseId, sizePx = 90) {
    const idStr = String(baseId);
    const isMulti = isMultiRange(idStr);
    const imageId = isMulti ? (parseInt(idStr, 10) + 1) : parseInt(idStr, 10);

    const url1 = `https://damsssl.llgc.org.uk/iiif/image/${imageId}/full/${sizePx},/0/default.jpg`;
    const url2 = `https://damsssl.llgc.org.uk/iiif/2.0/image/${imageId}/full/${sizePx},/0/default.jpg`;
    const rootUrl = `https://viewer.library.wales/${idStr}`;

    const a = document.createElement("a");
    a.href = rootUrl;
    a.target = "_blank";
    a.rel = "noopener";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = "";

    img.onerror = () => {
      if (img.dataset.meTried === "1") return;
      img.dataset.meTried = "1";
      img.src = url2;
    };

    img.src = url1;
    a.appendChild(img);

    return a;
  }

function renderImagesThumbsIntoPopup(group, marker) {
  const popupEl = marker.getPopup()?.getElement();
  if (!popupEl) return;

  const thumbsWrap = popupEl.querySelector("[data-me-images-thumbs]");
  if (!thumbsWrap) return;

  thumbsWrap.innerHTML = "";

  const items = Array.isArray(group?.items) ? group.items.slice(0, 10) : [];
  if (!items.length) return;

  items.forEach((r) => {
    const baseId = extractNumericId(r?.nlwmedia) || extractNumericId(r?.qid);
    if (!baseId) return;
    thumbsWrap.appendChild(createIIIFThumb(baseId, 90));
  });
}


function renderStandardThumbIntoPopup(record, marker) {
  const popupEl = marker.getPopup()?.getElement();
  if (!popupEl) return;

  const wrap = popupEl.querySelector("[data-me-thumb]");
  if (!wrap) return;

  // Only render a thumb if P31 is present
  const commonsVal = record.image || null;
  if (!commonsVal) return;

  const thumbUrl = commonsThumbUrlFromValue(commonsVal, 180);
  if (!thumbUrl) return;

  wrap.innerHTML = "";
  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = "";
  img.src = thumbUrl;
  wrap.appendChild(img);
}

async function hydratePeoplePlaceLabelsInPopup(marker, langPref) {
  // Only run if the API module exists
  if (typeof API === "undefined" || !API.getLabels) return;

  const popupEl = marker.getPopup()?.getElement();
  if (!popupEl) return;

  const links = Array.from(popupEl.querySelectorAll("a[data-place-qid]"));
  if (!links.length) return;

  const qids = [...new Set(links.map(a => a.dataset.placeQid).filter(Boolean))];
  if (!qids.length) return;

  try {
    const labels = await API.getLabels(qids, langPref);
    links.forEach(a => {
      const qid = a.dataset.placeQid;
      a.textContent = labels?.[qid] || qid;
    });
  } catch (e) {
    // Fail silently: popup remains usable with QIDs
  }
}

  // -----------------------------------------------------------
  // Utils
  // -----------------------------------------------------------

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function commonsThumbUrlFromValue(value, widthPx = 180) {
  // Value may be a full URL, or a Commons entity URI, or "File:Name.ext"
  const fileName = extractCommonsFileName(value);
  if (!fileName) return null;

  // Special:FilePath serves the original file; width= gives a thumbnail.
  // This avoids hashing logic and works well for most file types.
  const encoded = encodeURIComponent(fileName.replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${widthPx}`;
}

function extractCommonsFileName(value) {
  const s = String(value || "").trim();
  if (!s) return null;

  // Common case: already "File:Something.jpg"
  if (s.startsWith("File:")) return s;

  // If it's a URL, try to pull a "File:..." segment
  // Examples:
  // - https://commons.wikimedia.org/wiki/Special:EntityData/M123.json
  // - https://commons.wikimedia.org/wiki/File:Name.jpg
  // - https://commons.wikimedia.org/entity/M123
  // - https://commons.wikimedia.org/wiki/Special:FilePath/Name.jpg
  try {
    const u = new URL(s);
    const path = decodeURIComponent(u.pathname);

    const fileMatch = path.match(/\/File:(.+)$/);
    if (fileMatch) return `File:${fileMatch[1]}`;

    const fpMatch = path.match(/\/Special:FilePath\/(.+)$/);
    if (fpMatch) return `File:${fpMatch[1]}`;

    // If none of the above, it might be a media entity id (M123) –
    // in that case we cannot derive a filename without an extra lookup,
    // so we return null.
    return null;
  } catch {
    return null;
  }
}

  // -----------------------------------------------------------
  // Exports
  // -----------------------------------------------------------

  return {
    initHomeMap,
    setLanguage
  };

})();
