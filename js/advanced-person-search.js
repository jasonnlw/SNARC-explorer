// advanced-person-search.js
// SNARC Explorer – Advanced Person Search (dropdown query builder)
// and SPARQL for fetching matching people.

/* global document, window */

(function () {
  // ---------------------------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------------------------
const LocalFacets = window.Facets; // use the loaded JSON lists
  
let viewMode = "list"; // "graph" or "list"
let lastBindings = [];  // store last SPARQL results for re-rendering

function getFacetListName(facetKey) {
  switch (facetKey) {
    case "gender":
      return "gender";

    case "occupation":
      return "occupation";

    case "educationPlace":
      return "education_place"; // correct mapping

    case "birthPlace":
    case "deathPlace":
      return "places"; // shared 60k list

    case "relatedContent":
      return "content_type"; // correct mapping

    default:
      return facetKey;
  }
}

  
  // Try to reuse globals if your site already defines them
const SNARC_API = "https://snarc-proxy.onrender.com/w/api.php";
const SNARC_SPARQL_ENDPOINT =
  "https://snarc-proxy.onrender.com/query";

  
  // Where to send users when they click a result
  // Override globally with window.SNARC_ENTITY_BASE_URL if you have a custom Explorer route
  const SNARC_ENTITY_BASE_URL =
    window.SNARC_ENTITY_BASE_URL || "https://jasonnlw.github.io/SNARC-explorer/#/item/";

  // Page size for results
  const pageSize = 24;

  // Pagination + state
  let currentPage = 1;
  let lastPageHasMore = false;
  let lastSearchHasResults = false;
  let lastSearchSelection = null;
  let lastFullResults = [];


  // ---------------------------------------------------------------------------
  // LANGUAGE HELPERS
  // ---------------------------------------------------------------------------

  function getCurrentLang() {
    if (window.currentLang) return window.currentLang;
    const htmlLang = (document.documentElement.lang || "").toLowerCase();
    return htmlLang === "cy" ? "cy" : "en";
  }

  function updateAdvancedSearchLabels() {
    const container = document.getElementById("advanced-person-search");
    if (!container) return;

    const lang = getCurrentLang();

    const textAttr = lang === "cy" ? "data-i18n-cy" : "data-i18n-en";
    const phAttr =
      lang === "cy" ? "data-i18n-placeholder-cy" : "data-i18n-placeholder-en";

    container.querySelectorAll("[data-i18n-en]").forEach((el) => {
      const txt = el.getAttribute(textAttr);
      if (txt) el.textContent = txt;
    });

    container
      .querySelectorAll("[data-i18n-placeholder-en]")
      .forEach((input) => {
        const ph = input.getAttribute(phAttr);
        if (ph) input.setAttribute("placeholder", ph);
      });
  }

  // ---------------------------------------------------------------------------
  // Sparql de-dupe helper
  // ---------------------------------------------------------------------------
  function dedupeByQid(bindings) {
  const seen = new Set();
  return bindings.filter(b => {
    if (!b.item || !b.item.value) return false;
    const qid = b.item.value;
    if (seen.has(qid)) return false;
    seen.add(qid);
    return true;
  });
}


  // ---------------------------------------------------------------------------
  // FACET CONFIG
  // ---------------------------------------------------------------------------

  // Each facet describes:
  // - which property will be used in SPARQL
  const FACETS = {
    gender: {
      id: "gender",
      property: "P13",
      searchHintEn: "gender",
      searchHintCy: "rhyw",
    },
    occupation: {
      id: "occupation",
      property: "P25",
      searchHintEn: "occupation",
      searchHintCy: "galwedigaeth",
    },
    educationPlace: {
      id: "educationPlace",
      property: "P23",
      searchHintEn: "place of education",
      searchHintCy: "lle addysg",
    },
    birthPlace: {
      id: "birthPlace",
      property: "P21",
      searchHintEn: "place of birth",
      searchHintCy: "lle geni",
    },
    deathPlace: {
      id: "deathPlace",
      property: "P22",
      searchHintEn: "place of death",
      searchHintCy: "lle marw",
    },
    relatedContent: {
      id: "relatedContent",
      // Multiple properties in SPARQL, handled separately
      property: null,
      searchHintEn: "collection",
      searchHintCy: "casgliad",
    },
  };

  // ---------------------------------------------------------------------------
  // API HELPERS
  // ---------------------------------------------------------------------------



  // SPARQL fetch (CORS must be enabled on the endpoint)
  async function runSparql(query) {
    const url =
      SNARC_SPARQL_ENDPOINT +
      "?query=" +
      encodeURIComponent(query) +
      "&format=json";
    const res = await fetch(url);
    if (!res.ok) throw new Error("SPARQL request failed");
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // DROPDOWNS
  // ---------------------------------------------------------------------------

  function closeAllOptionLists() {
    document.querySelectorAll(".aps-options").forEach((ul) => {
      ul.classList.add("aps-options-hidden");
    });
  }
function getFacetListName(facetKey) {
  switch (facetKey) {
    case "gender":
      return "gender";

    case "occupation":
      return "occupation";

    case "educationPlace":
      return "education_place";

    case "birthPlace":
    case "deathPlace":
      return "places";

    case "relatedContent":
      return "content_type";

    default:
      return facetKey;
  }
}

  
  function setupFacetDropdown(facetKey) {
    const facet = FACETS[facetKey];
    if (!facet) return;

    const field = document.querySelector(`.aps-field[data-facet="${facetKey}"]`);
    if (!field) return;

    const dropdown = field.querySelector(".aps-dropdown");
    const input = dropdown.querySelector(".aps-input");
    const clearBtn = dropdown.querySelector(".aps-clear");
    const optionsList = dropdown.querySelector(".aps-options");

    field.dataset.valueId = "";
    field.dataset.valueLabel = "";

function renderOptions(items) {
  optionsList.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "aps-option";
    li.textContent =
      getCurrentLang() === "cy" ? "Dim canlyniadau" : "No matches";
    li.style.opacity = "0.7";
    li.style.cursor = "default";
    optionsList.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "aps-option";

    // Places have descriptions
    if (facetKey === "birthPlace" || facetKey === "deathPlace") {
      li.innerHTML = `
        <div class="aps-opt-label">${item.label}</div>
        <div class="aps-opt-desc">${item.desc || ""}</div>
      `;
    } else {
      li.textContent = item.label;
    }

    li.dataset.valueId = item.id;

    li.addEventListener("click", () => {
      input.value = item.label;
      field.dataset.valueId = item.id;
      field.dataset.valueLabel = item.label;
      closeAllOptionLists();
    });

    optionsList.appendChild(li);
  });
}


function searchAndShowOptions() {
  const text = input.value.trim().toLowerCase();
  const lang = getCurrentLang();

  // Determine which facet list to use
const facetListName = getFacetListName(facetKey);
const list = LocalFacets[facetListName] || [];

  // Require minimum characters for large lists
  const minChars = getFacetListName(facetKey) === "places" ? 2 : 1;
  if (text.length < minChars) {
    optionsList.classList.add("aps-options-hidden");
    return;
  }

  // Filter the local list
  const results = list
    .filter((item) => {
      const label = lang === "cy" ? item.label_cy : item.label_en;
      return label && label.toLowerCase().includes(text);
    })
    .slice(0, 40); // limit to avoid huge dropdown

  // Convert results to expected render format
  const items = results.map((item) => ({
    id: item.id,
    label:
      lang === "cy" ? item.label_cy : item.label_en,
    desc: lang === "cy" ? item.desc_cy : item.desc_en

  }));

  renderOptions(items);
  optionsList.classList.remove("aps-options-hidden");
}


    
    input.addEventListener("focus", () => {
      // Only search if there is enough text
      if (input.value.trim().length >= 2) {
        searchAndShowOptions();
      }
    });

    input.addEventListener("click", () => {
      if (input.value.trim().length >= 2) {
        searchAndShowOptions();
      }
    });

    input.addEventListener("input", () => {
      if (input.value.trim().length >= 2) {
        searchAndShowOptions();
      } else {
        optionsList.classList.add("aps-options-hidden");
      }
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      field.dataset.valueId = "";
      field.dataset.valueLabel = "";
      optionsList.classList.add("aps-options-hidden");
    });

    document.addEventListener("click", (evt) => {
      if (!dropdown.contains(evt.target)) {
        optionsList.classList.add("aps-options-hidden");
      }
    });
  }

function getCurrentFacetSelections() {
  const selection = {};

  Object.keys(FACETS).forEach((key) => {

    // --- SPECIAL CASE: RELATED CONTENT (new <select>)
    if (key === "relatedContent") {
      const sel = document.getElementById("aps-relatedContent-select");
      if (!sel) return;

      const value = sel.value;

      if (value === "ALL") {
        // User selected "All"
        selection.relatedContent = "ALL";
      } else if (value) {
        // User selected a single property (P12, P50, etc.)
        selection.relatedContent = value;
      }

      return; // <-- Skip normal processing
    }

    // --- DEFAULT HANDLING FOR ALL OTHER FACETS (unchanged)
    const field = document.querySelector(`.aps-field[data-facet="${key}"]`);
    if (!field) return;

    const id = field.dataset.valueId || "";
    if (id) {
      selection[key] = id;
    }
  });

  return selection;
}


  // ---------------------------------------------------------------------------
  // SPARQL QUERY BUILDER
  // ---------------------------------------------------------------------------

  function buildSearchQuery(selection, page, lang) {
    const offset = (page - 1) * pageSize;
    const langPref = lang === "cy" ? "cy,en" : "en,cy";

    let whereClauses = `
      ?item wdt:P7 wd:Q947 .  # instance of human
    `;

    if (selection.gender) {
      // P13 gender
      whereClauses += `
        ?item wdt:P13 wd:${selection.gender} .
      `;
    }
    if (selection.occupation) {
      // P25 occupation
      whereClauses += `
        ?item wdt:P25 wd:${selection.occupation} .
      `;
    }
    if (selection.educationPlace) {
      // P23 place of education
      whereClauses += `
        ?item wdt:P23 wd:${selection.educationPlace} .
      `;
    }
    if (selection.birthPlace) {
      // P21 place of birth
      whereClauses += `
        ?item wdt:P21 wd:${selection.birthPlace} .
      `;
    }
    if (selection.deathPlace) {
      // P22 place of death
      whereClauses += `
        ?item wdt:P22 wd:${selection.deathPlace} .
      `;
    }
if (selection.relatedContent) {
  const props = ["P12","P50","P102","P108","P5","P6"];

  if (selection.relatedContent === "ALL") {
    // All collections (UNION across all wdt:P…)
    const unions = props.map((p) => `{ ?item wdt:${p} ?anyVal }`).join(" UNION ");
    whereClauses += unions + "\n";
  } else if (Array.isArray(selection.relatedContent)) {
    // Selected subset
    const unions = selection.relatedContent.map((p) => {
      return props.includes(p)
        ? `{ ?item wdt:${p} ?anyVal }`
        : "";
    }).join(" UNION ");
    whereClauses += unions + "\n";
  }
}


    return `
      PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
      PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      PREFIX schema: <http://schema.org/>

      SELECT ?item ?itemLabel ?description
       ?occupation ?occupationLabel
       ?eduPlace ?eduPlaceLabel
       ?birthPlace ?birthPlaceLabel
       ?deathPlace ?deathPlaceLabel WHERE {
        ${whereClauses}
                OPTIONAL { ?item wdt:P25 ?occupation . }
        OPTIONAL { ?item wdt:P23 ?eduPlace . }
        OPTIONAL { ?item wdt:P21 ?birthPlace . }
        OPTIONAL { ?item wdt:P22 ?deathPlace . }
        OPTIONAL {
          ?item schema:description ?description .
          FILTER (LANG(?description) = "${lang}")
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
      }

      ORDER BY LCASE(STR(?itemLabel))
      LIMIT ${pageSize + 1}  # one extra to check if there is a next page
      OFFSET ${offset}
    `;
  }

  // ---------------------------------------------------------------------------
  // RESULTS RENDERING & PAGINATION
  // ---------------------------------------------------------------------------

  function renderResultsList(bindings) {
    const listEl = document.querySelector("#aps-results .aps-results-list");
    if (!listEl) return;

    listEl.innerHTML = "";

    bindings.forEach((b) => {
      const uri = b.item.value;
      const idMatch = uri.match(/(Q[0-9]+)$/);
      const qid = idMatch ? idMatch[1] : uri;
      const label = (b.itemLabel && b.itemLabel.value) || qid;
      const desc = b.description ? b.description.value : "";

      const card = document.createElement("article");
      card.className = "aps-result-card";

      const title = document.createElement("h3");
      title.className = "aps-result-title";

      const link = document.createElement("a");
      link.className = "aps-result-link";
      link.href = SNARC_ENTITY_BASE_URL + qid;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = label;

      title.appendChild(link);
      card.appendChild(title);

      if (desc) {
        const meta = document.createElement("p");
        meta.className = "aps-result-meta";
        meta.textContent = desc;
        card.appendChild(meta);
      }

      listEl.appendChild(card);
    });
  }

function renderGraph(bindings) {
  const container = document.getElementById("aps-results-graph");
  if (!container) return;

  // If D3 is missing, don’t silently fail – fall back to list view
  if (typeof d3 === "undefined") {
    console.warn("APS: d3 not loaded, falling back to list view");
    viewMode = "list";
    renderResultsList(bindings);
    return;
  }

  container.innerHTML = ""; // clear old graph

  const width = container.clientWidth || 800;
  const height = 500;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Build nodes & links
  const nodesById = new Map();
  const links = [];

  function addNode(id, label, type) {
    if (!id) return null;
    if (!nodesById.has(id)) {
      nodesById.set(id, { id, label: label || id, type });
    }
    return nodesById.get(id);
  }

  bindings.forEach((b) => {
    const personUri = b.item.value;
    const personMatch = personUri.match(/(Q[0-9]+)$/);
    const personId = personMatch ? personMatch[1] : personUri;
    const personLabel = b.itemLabel && b.itemLabel.value;
    const personNode = addNode(personId, personLabel, "person");

    const occ = b.occupation && b.occupation.value;
    const occLabel = b.occupationLabel && b.occupationLabel.value;
    const edu = b.eduPlace && b.eduPlace.value;
    const eduLabel = b.eduPlaceLabel && b.eduPlaceLabel.value;
    const birth = b.birthPlace && b.birthPlace.value;
    const birthLabel = b.birthPlaceLabel && b.birthPlaceLabel.value;
    const death = b.deathPlace && b.deathPlace.value;
    const deathLabel = b.deathPlaceLabel && b.deathPlaceLabel.value;

    function addEdge(targetUri, targetLabel, type) {
      if (!personNode || !targetUri) return;
      const m = targetUri.match(/(Q[0-9]+)$/);
      const id = m ? m[1] : targetUri;
      const targetNode = addNode(id, targetLabel, type);
      if (targetNode) {
        links.push({ source: personNode, target: targetNode, type });
      }
    }

    addEdge(occ, occLabel, "occupation");
    addEdge(edu, eduLabel, "education");
    addEdge(birth, birthLabel, "birthPlace");
    addEdge(death, deathLabel, "deathPlace");
  });

  const nodes = Array.from(nodesById.values());

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-120))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g")
    .attr("stroke", "#ccc")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke-width", 1.2);

  const node = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      })
    );

  node.append("circle")
    .attr("r", d => d.type === "person" ? 8 : 5)
    .attr("fill", d => d.type === "person" ? "#0b7e5c" : "#888")
    .on("click", (event, d) => {
      // click through to SNARC Explorer item if it's a Q-id
      if (/^Q[0-9]+$/.test(d.id)) {
        window.open(
          `${SNARC_ENTITY_BASE_URL}${d.id}`,
          "_blank",
          "noopener"
        );
      }
    });

  node.append("text")
    .attr("x", 10)
    .attr("y", 3)
    .attr("font-size", "10px")
    .text(d => d.label);

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });
}

  
  function updateResultsSummary(totalVisible, hasMore, page) {
    const summaryEl = document.querySelector(".aps-results-summary");
    if (!summaryEl) return;

    const lang = getCurrentLang();

    if (!totalVisible) {
      summaryEl.textContent =
        lang === "cy" ? "Dim canlyniadau" : "No results";
      return;
    }

    const start = (page - 1) * pageSize + 1;
    const end = start + totalVisible - 1;

    const base =
      lang === "cy" ? `Yn dangos ${start}–${end}` : `Showing ${start}–${end}`;

    summaryEl.textContent = hasMore ? base + "+" : base;
  }

  function updatePaginationControls(hasMore, page) {
    const pagEl = document.querySelector(".aps-pagination");
    if (!pagEl) return;

    const prevBtn = document.getElementById("aps-prev-page");
    const nextBtn = document.getElementById("aps-next-page");
    const indicator = pagEl.querySelector(".aps-page-indicator");
    const lang = getCurrentLang();

    if (!lastSearchHasResults) {
      pagEl.classList.add("aps-pagination-hidden");
      return;
    }

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = !hasMore;

    if (indicator) {
      indicator.textContent =
        lang === "cy" ? `Tudalen ${page}` : `Page ${page}`;
    }

    pagEl.classList.remove("aps-pagination-hidden");
  }

  async function executeSearch(page) {
// Main wrapper
const resultsWrapper = document.getElementById("aps-results");
if (resultsWrapper) {
  resultsWrapper.classList.remove("aps-results-hidden");
}

// List container (if in list mode)
const listWrapper = document.getElementById("aps-results-list-wrapper");
if (listWrapper) {
  listWrapper.classList.remove("aps-results-hidden");
}

// Graph container (if in graph mode)
const graphWrapper = document.getElementById("aps-results-graph-wrapper");
if (graphWrapper) {
  graphWrapper.classList.remove("aps-results-hidden");
}


    const lang = getCurrentLang();
    const selection = lastSearchSelection || getCurrentFacetSelections();
    const selectedKeys = Object.keys(selection);

    const msgEl = document.querySelector(".aps-results-summary");

    if (!selectedKeys.length) {
      if (msgEl) {
        msgEl.textContent =
          lang === "cy"
            ? "Dewiswch o leiaf un hidlydd i weld canlyniadau."
            : "Choose at least one filter to see results.";
      }
      lastSearchHasResults = false;
      updatePaginationControls(false, page);
      const listEl = document.querySelector("#aps-results .aps-results-list");
      if (listEl) listEl.innerHTML = "";
      return;
    }

    const query = buildSearchQuery(selection, page, lang);

    try {
// Run query
const data = await runSparql(query);
let bindings = (data.results && data.results.bindings) || [];

//---------------------------------------------------------
// Convert SPARQL bindings → APS-friendly result objects
//---------------------------------------------------------
const results = bindings.map(b => {
  const get = (x) => (b[x] ? b[x].value : "");

  return {
    id: get("item").replace("https://snarc-llgc.wikibase.cloud/entity/", ""),
    uri: get("item"),
    label: get("itemLabel"),
    description: get("description"),
    occupation: get("occupationLabel"),
    birthPlace: get("birthPlaceLabel"),
    deathPlace: get("deathPlaceLabel"),
    eduPlace: get("eduPlaceLabel")
  };
});

// Save for global usage (graph or list)
lastSearchResults = results;

// Debug:
console.log("APS SPARQL converted results:", results);


      
// Detect extra row for pagination
bindings = dedupeByQid(bindings);
rawBindings = [...bindings];
lastPageHasMore = bindings.length > pageSize;
if (lastPageHasMore && viewMode === "list") {
  bindings = bindings.slice(0, pageSize);
}

lastSearchHasResults = bindings.length > 0;
lastSearchSelection = selection;

// STORE results for GRAPH MODE
// Store full results BEFORE pagination for graph mode
if (!lastFullResults) lastFullResults = rawBindings;

// This remains the per-page bindings for list view
lastBindings = bindings;


// Render depending on view mode
if (viewMode === "graph") {
  renderGraph(rawBindings);
} else {
  renderResultsList(bindings);
}

updateResultsSummary(bindings.length, lastPageHasMore, page);
updatePaginationControls(lastPageHasMore, page);

    } catch (e) {
      console.error("Error executing people search", e);
      if (msgEl) {
        msgEl.textContent =
          lang === "cy"
            ? "Gwall wrth lwytho canlyniadau."
            : "Error loading results.";
      }
      lastSearchHasResults = false;
      updatePaginationControls(false, page);
    }
  }

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------

// Update the function signature to accept 'langArg'
function initAdvancedPersonSearch(langArg) {
  // Work out which language to use for this initialisation
  const initialLang = (langArg === "cy" || langArg === "en")
    ? langArg
    : getCurrentLang();

  // Sync to the global state that getCurrentLang() reads
  window.currentLang = initialLang;
  document.documentElement.lang = initialLang;

  console.log("APS: init started with lang:", initialLang);

  const container = document.getElementById("advanced-person-search");
  if (!container) return;


  // Prevent double-initialisation if home page is rendered again
  if (container.dataset.apsInit === "1") {
    console.log("APS: AP already initialised?", container.dataset.apsInit);
    return;
  }
  container.dataset.apsInit = "1";


updateAdvancedSearchLabels();
// ---------------------------------------------------------------------------
// STATIC GENDER DROPDOWN
// ---------------------------------------------------------------------------
function initStaticGenderDropdown() {
  const sel = document.getElementById("aps-gender-select");
  if (!sel) return;

  // Clear any dynamic options except the first placeholder
  sel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());

  const list = LocalFacets.gender || [];
  const lang = getCurrentLang();

  list.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = lang === "cy" ? g.label_cy : g.label_en;
    sel.appendChild(opt);
  });
  
  // Store selection like other facets do
  sel.addEventListener("change", () => {
    const field = document.querySelector('.aps-field[data-facet="gender"]');
    if (field) {
      field.dataset.valueId = sel.value;
      field.dataset.valueLabel = sel.options[sel.selectedIndex].textContent;
    }
  });
}

function initStaticRelatedContentDropdown() {
  const sel = document.getElementById("aps-relatedContent-select");
  if (!sel) return;

  const lang = getCurrentLang();
  const list = LocalFacets.content_type || [];


  // Add each content type
  list.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id; // P12, P50...
    opt.textContent = lang === "cy" ? c.label_cy : c.label_en;
    sel.appendChild(opt);
  });
}
  
initStaticGenderDropdown();
initStaticRelatedContentDropdown();

// ---------------------------------------------------------------------------
// VIEW MODE SWITCHING (Graph / List)
// ---------------------------------------------------------------------------
const graphBtn = container.querySelector("#aps-view-graph");
const listBtn  = container.querySelector("#aps-view-list");

const graphEl = container.querySelector("#aps-results-graph");  // <--- FIXED
const listEl  = container.querySelector(".aps-results-list");


// Only activate if all elements exist
if (graphBtn && listBtn && graphEl && listEl) {

  graphBtn.addEventListener("click", () => {
    viewMode = "graph";
    graphBtn.classList.add("aps-view-active");
    listBtn.classList.remove("aps-view-active");
    graphEl.style.display = "";
    listEl.style.display = "none";

    if (lastBindings.length) {
      renderGraph(lastBindings); // defined later
    }
  });

  listBtn.addEventListener("click", () => {
    viewMode = "list";
    listBtn.classList.add("aps-view-active");
    graphBtn.classList.remove("aps-view-active");
    listEl.style.display = "";
    graphEl.style.display = "none";

    if (lastBindings.length) {
      renderResultsList(lastBindings);
    }
  });

  // Default mode = graph
  graphEl.style.display = "";
  listEl.style.display = "none";
}

Object.keys(FACETS)
  .filter((facetKey) => facetKey !== "gender" && facetKey !== "relatedContent")
  .forEach(setupFacetDropdown);



// Form submit
const form = document.getElementById("aps-form");
console.log("APS: form found:", form); // Log AFTER defining
    if (form) {
      form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        currentPage = 1;
        executeSearch(currentPage);
      });
    }

    // Reset
    const resetBtn = document.getElementById("aps-reset");
  console.log("APS: reset button?", resetBtn);
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        container.querySelectorAll(".aps-field").forEach((field) => {
          field.dataset.valueId = "";
          field.dataset.valueLabel = "";
          const input = field.querySelector(".aps-input");
          if (input) input.value = "";
        });

        const resultsEl = document.getElementById("aps-results");
        if (resultsEl) {
          resultsEl.classList.add("aps-results-hidden");
          const listEl = resultsEl.querySelector(".aps-results-list");
          if (listEl) listEl.innerHTML = "";
        }

        lastSearchHasResults = false;
        lastSearchSelection = null;
        const pagEl = document.querySelector(".aps-pagination");
        if (pagEl) pagEl.classList.add("aps-pagination-hidden");
      });
    }

    // Pagination buttons
const prevBtn = document.getElementById("aps-prev-page");
console.log("APS: prev button?", prevBtn);

const nextBtn = document.getElementById("aps-next-page");
console.log("APS: next button?", nextBtn);
console.log("APS: init complete");


    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage -= 1;
          executeSearch(currentPage);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (lastPageHasMore) {
          currentPage += 1;
          executeSearch(currentPage);
        }
      });
    }

  
//-----------------------------------------------------------------------
// Detect real language changes in the site
//-----------------------------------------------------------------------
const htmlEl = document.documentElement;

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.attributeName === "lang") {
      updateAdvancedSearchLabels();
      initStaticGenderDropdown();
      if (lastSearchHasResults && lastSearchSelection) {
        executeSearch(currentPage);
      }
    }
  }
});

// Observe changes to <html lang="en|cy">
observer.observe(htmlEl, { attributes: true });

  }

  // Expose globally so Home.initHomePage can call it
  window.initAdvancedPersonSearch = initAdvancedPersonSearch;

})();

