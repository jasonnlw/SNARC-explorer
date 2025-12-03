// advanced-person-search.js

(function () {
  // --- CONFIG -------------------------------------------------------------

  const SNARC_SPARQL_ENDPOINT = "https://snarc-llgc.wikibase.cloud/query/sparql";
  const SNARC_ENTITY_BASE_URL = "hhttps://jasonnlw.github.io/SNARC-explorer/#/item/"; 
  // If your Explorer uses its own item URLs, adjust SNARC_ENTITY_BASE_URL.

  // Helper: current language; adapt if you already have a global
  function getCurrentLang() {
    // If you already track this globally (e.g. window.currentLang), use that
    if (window.currentLang) return window.currentLang;
    const htmlLang = document.documentElement.lang;
    return htmlLang === "cy" ? "cy" : "en";
  }

  // Generic SPARQL fetch
  async function runSparql(query) {
    const url = `${SNARC_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("SPARQL request failed");
    return res.json();
  }

  // Facet configuration
  const FACETS = {
    gender: {
      id: "gender",
      property: "P13",
      labelEn: "Gender",
      labelCy: "Rhyw",
      // P13 - Gender (P7:Q13)
      optionsQuery: `
        PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
        PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        SELECT DISTINCT ?value ?valueLabel WHERE {
          ?value snarcp:P7 wd:Q13 .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "cy,en". }
        }
        ORDER BY LCASE(STR(?valueLabel))
      `
    },
    occupation: {
      id: "occupation",
      property: "P25",
      labelEn: "Occupation",
      labelCy: "Galwedigaeth",
      // P25 - Occupation (P7:Q63)
      optionsQuery: `
        PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
        PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        SELECT DISTINCT ?value ?valueLabel WHERE {
          ?value snarcp:P7 wd:Q63 .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "cy,en". }
        }
        ORDER BY LCASE(STR(?valueLabel))
      `
    },
    educationPlace: {
      id: "educationPlace",
      property: "P23",
      labelEn: "Place of education",
      labelCy: "Lle addysg",
      // P23 - Place of Education (P7/P45*:Q38)
      // Here we treat Q38 as "place"-type items.
      optionsQuery: `
        PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
        PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        SELECT DISTINCT ?value ?valueLabel WHERE {
          ?value snarcp:P7 wd:Q38 .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "cy,en". }
        }
        ORDER BY LCASE(STR(?valueLabel))
      `
    },
    birthPlace: {
      id: "birthPlace",
      property: "P21",
      labelEn: "Place of birth",
      labelCy: "Lle geni",
      // P21 - Place of Birth (all items with P26)
      optionsQuery: `
        PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
        SELECT DISTINCT ?value ?valueLabel WHERE {
          ?value snarcp:P26 ?something .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "cy,en". }
        }
        ORDER BY LCASE(STR(?valueLabel))
      `
    },
    deathPlace: {
      id: "deathPlace",
      property: "P22",
      labelEn: "Place of death",
      labelCy: "Lle marw",
      // P22 - Place of Death (all items with P26)
      optionsQuery: `
        PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
        SELECT DISTINCT ?value ?valueLabel WHERE {
          ?value snarcp:P26 ?something .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "cy,en". }
        }
        ORDER BY LCASE(STR(?valueLabel))
      `
    },
    relatedContent: {
      id: "relatedContent",
      labelEn: "Related content / collections",
      labelCy: "Cynnwys / casgliadau cysylltiedig",
      // P12,P50,P102,P108,P5,P6 - Has related content
      // list all objects of these properties
      optionsQuery: `
        PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        SELECT DISTINCT ?value ?valueLabel WHERE {
          VALUES ?prop { snarcp:P12 snarcp:P50 snarcp:P102 snarcp:P108 snarcp:P5 snarcp:P6 }
          ?subject ?prop ?value .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "cy,en". }
        }
        ORDER BY LCASE(STR(?valueLabel))
      `
    }
  };

  // cache options per facet so we only hit SPARQL once per facet
  const facetOptionsCache = new Map();

  // pagination state
  let currentPage = 1;
  const pageSize = 24;
  let lastPageHasMore = false;
  let lastSearchHasResults = false;
  let lastSearchSelection = null; // remember selection to rebuild SPARQL for paging

  // --- UI helpers ---------------------------------------------------------

  function setI18nTextForElements(lang) {
    const attr = lang === "cy" ? "data-i18n-cy" : "data-i18n-en";
    document.querySelectorAll("[data-i18n-en]").forEach(el => {
      const txt = el.getAttribute(attr);
      if (txt) el.textContent = txt;
    });

    document.querySelectorAll("[data-i18n-placeholder-en]").forEach(input => {
      const phAttr = lang === "cy" ? "data-i18n-placeholder-cy" : "data-i18n-placeholder-en";
      const ph = input.getAttribute(phAttr);
      if (ph) input.setAttribute("placeholder", ph);
    });
  }

  function closeAllOptionLists() {
    document.querySelectorAll(".aps-options").forEach(ul => {
      ul.classList.add("aps-options-hidden");
    });
  }

  // Build UI dropdown for a facet
  function setupFacetDropdown(facetKey) {
    const facet = FACETS[facetKey];
    const field = document.querySelector(`.aps-field[data-facet="${facetKey}"]`);
    if (!field) return;

    const dropdown = field.querySelector(".aps-dropdown");
    const input = dropdown.querySelector(".aps-input");
    const clearBtn = dropdown.querySelector(".aps-clear");
    const optionsList = dropdown.querySelector(".aps-options");

    // store selected value id on the field element
    field.dataset.valueId = "";

    async function ensureOptionsLoaded() {
      if (facetOptionsCache.has(facetKey)) return facetOptionsCache.get(facetKey);

      try {
        const data = await runSparql(facet.optionsQuery);
        const bindings = data.results.bindings || [];
        const options = bindings.map(b => ({
          id: b.value.value.replace(/^.*\/(Q[0-9]+)$/, "$1"), // extract Q-id
          label: b.valueLabel ? b.valueLabel.value : b.value.value
        }));
        facetOptionsCache.set(facetKey, options);
        return options;
      } catch (e) {
        console.error("Error loading options for facet", facetKey, e);
        return [];
      }
    }

    function renderOptions(options, filterText) {
      const needle = (filterText || "").toLowerCase();
      optionsList.innerHTML = "";

      options
        .filter(o => !needle || o.label.toLowerCase().includes(needle))
        .forEach(opt => {
          const li = document.createElement("li");
          li.className = "aps-option";
          li.textContent = opt.label;
          li.dataset.valueId = opt.id;
          li.addEventListener("click", () => {
            input.value = opt.label;
            field.dataset.valueId = opt.id;
            closeAllOptionLists();
          });
          optionsList.appendChild(li);
        });

      if (!optionsList.children.length) {
        const li = document.createElement("li");
        li.className = "aps-option";
        li.textContent = getCurrentLang() === "cy" ? "Dim canlyniadau" : "No matches";
        li.style.opacity = "0.7";
        li.style.cursor = "default";
        optionsList.appendChild(li);
      }
    }

    async function openDropdown() {
      closeAllOptionLists();
      const opts = await ensureOptionsLoaded();
      renderOptions(opts, input.value);
      optionsList.classList.remove("aps-options-hidden");
    }

    input.addEventListener("focus", openDropdown);
    input.addEventListener("click", openDropdown);
    input.addEventListener("input", async () => {
      const opts = await ensureOptionsLoaded();
      renderOptions(opts, input.value);
      optionsList.classList.remove("aps-options-hidden");
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      field.dataset.valueId = "";
    });

    // close dropdown when clicking outside
    document.addEventListener("click", evt => {
      if (!dropdown.contains(evt.target)) {
        optionsList.classList.add("aps-options-hidden");
      }
    });
  }

  // Collect facet selections from DOM
  function getCurrentFacetSelections() {
    const selection = {};
    Object.keys(FACETS).forEach(key => {
      const field = document.querySelector(`.aps-field[data-facet="${key}"]`);
      if (!field) return;
      const val = field.dataset.valueId || "";
      if (val) selection[key] = val;
    });
    return selection;
  }

  // Build SPARQL for people based on selection + paging
  function buildSearchQuery(selection, page, lang) {
    const conditions = [];

    // P7 = Q947 -> instance of human
    let where = `
      ?item snarcp:P7 wd:Q947 .
    `;

    if (selection.gender) {
      where += `
        ?item snarcp:P13 wd:${selection.gender} .
      `;
    }
    if (selection.occupation) {
      where += `
        ?item snarcp:P25 wd:${selection.occupation} .
      `;
    }
    if (selection.educationPlace) {
      where += `
        ?item snarcp:P23 wd:${selection.educationPlace} .
      `;
    }
    if (selection.birthPlace) {
      where += `
        ?item snarcp:P21 wd:${selection.birthPlace} .
      `;
    }
    if (selection.deathPlace) {
      where += `
        ?item snarcp:P22 wd:${selection.deathPlace} .
      `;
    }
    if (selection.relatedContent) {
      where += `
        VALUES ?relatedProp { snarcp:P12 snarcp:P50 snarcp:P102 snarcp:P108 snarcp:P5 snarcp:P6 }
        ?item ?relatedProp wd:${selection.relatedContent} .
      `;
    }

    const offset = (page - 1) * pageSize;
    const langPref = lang === "cy" ? "cy,en" : "en,cy";

    return `
      PREFIX wd: <https://snarc-llgc.wikibase.cloud/entity/>
      PREFIX snarcp: <https://snarc-llgc.wikibase.cloud/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>

      SELECT ?item ?itemLabel ?description WHERE {
        ${where}
        OPTIONAL { ?item schema:description ?description .
                   FILTER (LANG(?description) = "${lang}") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${langPref}". }
      }
      ORDER BY LCASE(STR(?itemLabel))
      LIMIT ${pageSize + 1}  # fetch one extra to see if there is another page
      OFFSET ${offset}
    `;
  }

  function renderResultsList(bindings) {
    const listEl = document.querySelector("#aps-results .aps-results-list");
    listEl.innerHTML = "";

    bindings.forEach(b => {
      const uri = b.item.value;
      const idMatch = uri.match(/(Q[0-9]+)$/);
      const qid = idMatch ? idMatch[1] : uri;
      const label = b.itemLabel ? b.itemLabel.value : qid;
      const desc = b.description ? b.description.value : "";

      const card = document.createElement("article");
      card.className = "aps-result-card";

      const title = document.createElement("h3");
      title.className = "aps-result-title";

      const link = document.createElement("a");
      link.className = "aps-result-link";
      link.href = SNARC_ENTITY_BASE_URL + qid;
      link.textContent = label;
      link.target = "_blank";
      link.rel = "noopener";

      title.appendChild(link);
      card.appendChild(title);

      if (desc) {
        const meta = document.createElement("p");
        meta.className = "aps-result-meta";
        meta.textContent = desc;
        card.appendChild(meta);
      }

      // simple tags could show which facets were used, but for now keep it clean
      listEl.appendChild(card);
    });
  }

  function updateResultsSummary(totalVisible, hasMore, page, lang) {
    const summaryEl = document.querySelector(".aps-results-summary");
    if (!summaryEl) return;

    if (!totalVisible) {
      const txt = lang === "cy" ? "Dim canlyniadau" : "No results";
      summaryEl.textContent = txt;
      return;
    }

    const start = (page - 1) * pageSize + 1;
    const end = start + totalVisible - 1;
    let text;
    if (lang === "cy") {
      text = hasMore
        ? `Yn dangos ${start}–${end}+`
        : `Yn dangos ${start}–${end}`;
    } else {
      text = hasMore
        ? `Showing ${start}–${end}+`
        : `Showing ${start}–${end}`;
    }
    summaryEl.textContent = text;
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

    prevBtn.disabled = page <= 1;
    nextBtn.disabled = !hasMore;

    if (indicator) {
      indicator.textContent =
        lang === "cy" ? `Tudalen ${page}` : `Page ${page}`;
    }

    pagEl.classList.remove("aps-pagination-hidden");
  }

  async function executeSearch(page) {
    const lang = getCurrentLang();
    const selection = lastSearchSelection || getCurrentFacetSelections();

    // must have at least one facet used
    const keys = Object.keys(selection);
    if (!keys.length) {
      const msgEl = document.querySelector(".aps-results-summary");
      if (msgEl) {
        msgEl.textContent =
          lang === "cy"
            ? "Dewiswch o leiaf un hidlydd i weld canlyniadau."
            : "Choose at least one filter to see results.";
      }
      document.getElementById("aps-results")?.classList.remove("aps-results-hidden");
      lastSearchHasResults = false;
      updatePaginationControls(false, page);
      return;
    }

    const query = buildSearchQuery(selection, page, lang);

    const resultsEl = document.getElementById("aps-results");
    if (resultsEl) resultsEl.classList.remove("aps-results-hidden");

    try {
      const data = await runSparql(query);
      let bindings = data.results.bindings || [];

      // detect if there is another page by checking if we got pageSize+1
      lastPageHasMore = bindings.length > pageSize;
      if (lastPageHasMore) {
        bindings = bindings.slice(0, pageSize);
      }

      lastSearchHasResults = bindings.length > 0;
      lastSearchSelection = selection;
      renderResultsList(bindings);
      updateResultsSummary(bindings.length, lastPageHasMore, page, lang);
      updatePaginationControls(lastPageHasMore, page);
    } catch (e) {
      console.error("Error executing people search", e);
      const msgEl = document.querySelector(".aps-results-summary");
      if (msgEl) {
        msgEl.textContent =
          lang === "cy"
            ? "Gwall wrth lwytho canlyniadau."
            : "Error loading results.";
      }
    }
  }

  // --- Init ---------------------------------------------------------------

  function initAdvancedPersonSearch() {
    const container = document.getElementById("advanced-person-search");
    if (!container) return;

    const lang = getCurrentLang();
    setI18nTextForElements(lang);

    // Setup dropdowns
    Object.keys(FACETS).forEach(setupFacetDropdown);

    // Form submit
    const form = document.getElementById("aps-form");
    if (form) {
      form.addEventListener("submit", evt => {
        evt.preventDefault();
        currentPage = 1;
        executeSearch(currentPage);
      });
    }

    // Reset
    const resetBtn = document.getElementById("aps-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        document
          .querySelectorAll(".aps-field")
          .forEach(field => {
            field.dataset.valueId = "";
            const input = field.querySelector(".aps-input");
            if (input) input.value = "";
          });
        const resultsEl = document.getElementById("aps-results");
        if (resultsEl) resultsEl.classList.add("aps-results-hidden");
        lastSearchHasResults = false;
        lastSearchSelection = null;
      });
    }

    // Pagination
    const prevBtn = document.getElementById("aps-prev-page");
    const nextBtn = document.getElementById("aps-next-page");

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

    // Hook into your existing language switch if you expose an event
    // For example, if you dispatch a custom event "langchange":
    document.addEventListener("langchange", () => {
      const langNow = getCurrentLang();
      setI18nTextForElements(langNow);
      // You might also want to re-run search in the new language
      if (lastSearchHasResults) {
        executeSearch(currentPage);
      }
    });
  }

  // expose init to be called from your main script once DOM is ready
  window.initAdvancedPersonSearch = initAdvancedPersonSearch;
})();


// In your main homepage JS, after DOMContentLoaded, call:
document.addEventListener("DOMContentLoaded", () => {
  if (window.initAdvancedPersonSearch) {
    window.initAdvancedPersonSearch();
  }
});
