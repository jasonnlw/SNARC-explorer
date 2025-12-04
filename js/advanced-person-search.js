// advanced-person-search.js
// SNARC Explorer – Advanced Person Search (dropdown query builder)
// Uses wbsearchentities (JSONP) for facet autocompletion
// and SPARQL for fetching matching people.

/* global document, window */

(function () {
  // ---------------------------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------------------------

  // Try to reuse globals if your site already defines them
const SNARC_API = "https://snarc-proxy.onrender.com/w/api.php";
const SNARC_SPARQL_ENDPOINT =
  "https://snarc-proxy.onrender.com/query";

  let activeLang = "en";
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
    function getCurrentLang() {
  // Return the variable we set during init
  return activeLang;
}
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
  // FACET CONFIG
  // ---------------------------------------------------------------------------

  // Each facet describes:
  // - which property will be used in SPARQL
  // - how to bias wbsearchentities results (searchHintEn / searchHintCy)
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

  // wbsearchentities via JSONP
  function wbSearchEntitiesJsonp(searchText, lang) {
    return new Promise((resolve, reject) => {
      const callbackName = "wbsearch_cb_" + Math.random().toString(36).slice(2);
      const limit = 50;

      const params = new URLSearchParams({
        action: "wbsearchentities",
        format: "json",
        language: lang,
        uselang: lang,
        type: "item",
        search: searchText,
        limit: String(limit),
        origin: "*", // CORS helper
        callback: callbackName,
      });

      const url = `${SNARC_API}?${params.toString()}`;

      window[callbackName] = (data) => {
        try {
          resolve((data && data.search) || []);
        } finally {
          delete window[callbackName];
          script.remove();
        }
      };

      const script = document.createElement("script");
      script.src = url;
      script.onerror = (err) => {
        delete window[callbackName];
        script.remove();
        reject(err);
      };

      document.body.appendChild(script);
    });
  }

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
        li.textContent = getCurrentLang() === "cy" ? "Dim canlyniadau" : "No matches";
        li.style.opacity = "0.7";
        li.style.cursor = "default";
        optionsList.appendChild(li);
        return;
      }

      items.forEach((item) => {
        const li = document.createElement("li");
        li.className = "aps-option";
        li.textContent = item.label;
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

    async function searchAndShowOptions() {
      const text = input.value.trim();
      if (text.length < 2) {
        optionsList.classList.add("aps-options-hidden");
        return;
      }

      const lang = getCurrentLang();
      const hint =
        lang === "cy" ? facet.searchHintCy || "" : facet.searchHintEn || "";
      const searchText = (hint + " " + text).trim();

      try {
        const apiResults = await wbSearchEntitiesJsonp(searchText, lang);
        const items = apiResults.map((r) => ({
          id: r.id,
          label: r.label || r.id,
        }));
        // Sort alphabetically by label
        items.sort((a, b) => a.label.localeCompare(b.label));
        renderOptions(items);
        optionsList.classList.remove("aps-options-hidden");
      } catch (e) {
        console.error("wbsearchentities failed for facet", facetKey, e);
        renderOptions([]);
        optionsList.classList.remove("aps-options-hidden");
      }
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
      ?item snarcp:P7 wd:Q947 .  # instance of human
    `;

    if (selection.gender) {
      // P13 gender
      whereClauses += `
        ?item snarcp:P13 wd:${selection.gender} .
      `;
    }
    if (selection.occupation) {
      // P25 occupation
      whereClauses += `
        ?item snarcp:P25 wd:${selection.occupation} .
      `;
    }
    if (selection.educationPlace) {
      // P23 place of education
      whereClauses += `
        ?item snarcp:P23 wd:${selection.educationPlace} .
      `;
    }
    if (selection.birthPlace) {
      // P21 place of birth
      whereClauses += `
        ?item snarcp:P21 wd:${selection.birthPlace} .
      `;
    }
    if (selection.deathPlace) {
      // P22 place of death
      whereClauses += `
        ?item snarcp:P22 wd:${selection.deathPlace} .
      `;
    }
    if (selection.relatedContent) {
      // Related content across multiple properties:
      whereClauses += `
        VALUES ?relatedProp { snarcp:P12 snarcp:P50 snarcp:P102 snarcp:P108 snarcp:P5 snarcp:P6 }
        ?item ?relatedProp wd:${selection.relatedContent} .
      `;
    }

    return `
      PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
      PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      PREFIX schema: <http://schema.org/>

      SELECT ?item ?itemLabel ?description WHERE {
        ${whereClauses}
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
    const resultsContainer = document.getElementById("aps-results");
    if (resultsContainer) {
      resultsContainer.classList.remove("aps-results-hidden");
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
      const data = await runSparql(query);
      let bindings = (data.results && data.results.bindings) || [];

      lastPageHasMore = bindings.length > pageSize;
      if (lastPageHasMore) {
        bindings = bindings.slice(0, pageSize);
      }

      lastSearchHasResults = bindings.length > 0;
      lastSearchSelection = selection;

      renderResultsList(bindings);
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
  console.log("APS: init started with lang:", langArg);

  // Set the active language immediately
  activeLang = langArg || "en";

  const container = document.getElementById("advanced-person-search");
  console.log("APS: container found?", !!container);
  
  if (!container) return;

  // Prevent double-initialisation if home page is rendered again
  if (container.dataset.apsInit === "1") {
    console.log("APS: AP already initialised?", container.dataset.apsInit);
    return;
  }
  container.dataset.apsInit = "1";
console.log("APS: Init flagged");

 console.log("APS: updating labels");
updateAdvancedSearchLabels();
console.log("APS: labels updated");

console.log("APS: setting up dropdowns");
Object.keys(FACETS).forEach(setupFacetDropdown);
console.log("APS: dropdowns setup done");

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

    // Respond to your site-wide language switch if it fires a "langchange" event
    document.addEventListener("langchange", () => {
      updateAdvancedSearchLabels();
      if (lastSearchHasResults && lastSearchSelection) {
        executeSearch(currentPage);
      }
    });
  }

  // Expose globally so Home.initHomePage can call it
  window.initAdvancedPersonSearch = initAdvancedPersonSearch;

})();


