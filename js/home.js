// -------------------------------------------------------------
// SNARC Explorer – Home Page Controller (with Map Explorer)
// -------------------------------------------------------------

window.Home = {};

Home.initHomePage = async function (lang = "en") {
  const home = document.getElementById("homeContainer");
  const app = document.getElementById("app");

  if (!home || !app) {
    console.error("Home.initHomePage: required containers missing.");
    return;
  }

  // Show homepage, hide entity view
  home.style.display = "block";
  app.style.display = "none";

  // ---------------------------------------------------------
  // Render homepage content (map block included)
  // ---------------------------------------------------------
home.innerHTML = `
    <div class="home-wrapper">

      <section class="home-header">
        <h1>${lang === "cy" ? "Croeso i SNARC Explorer" : "Welcome to SNARC Explorer"}</h1>
        <p>${lang === "cy"
          ? "Defnyddiwch y bar chwilio uchod neu archwiliwch y map."
          : "Use the search bar above or explore the map below."}
        </p>
      </section>

      <section class="map-block">
        <h2>${lang === "cy" ? "Archwilio’r Map" : "Explore the Map"}</h2>
        <div id="homeMap"></div>
      </section>

<!-- Advanced Person Search (below map placeholder) -->
<!-- Advanced Person Search (below map placeholder) -->
<section id="advanced-person-search" class="aps-section">
  <div class="aps-inner">
    <header class="aps-header">
      <h2 class="aps-title" data-i18n-en="Explore people by filters" data-i18n-cy="Archwilio pobl drwy hidlwyr">
        Explore people by filters
      </h2>
      <p class="aps-subtitle"
         data-i18n-en="Combine any of the filters below to discover people by gender, occupation, places and related collections."
         data-i18n-cy="Cyfunwch unrhyw un o’r hidlwyr isod i ddarganfod pobl yn ôl rhyw, galwedigaeth, lleoedd a chasgliadau cysylltiedig.">
        Combine any of the filters below to discover people by gender, occupation, places and related collections.
      </p>
    </header>

    <form id="aps-form" class="aps-form" novalidate>
      <div class="aps-fields-grid">

        <!-- All your facet fields here -->

      </div>

      <div class="aps-actions">
        <button type="submit" class="aps-btn aps-btn-primary">
          Search people
        </button>
      </div>
    </form>

    <!-- NEW: Single unified toggle button -->
    <button id="aps-view-toggle" class="aps-view-toggle">
      <span class="icon"></span>
      <span class="label">Graph</span>
    </button>

    <!-- RESULTS WRAPPER -->
    <div id="aps-results" class="aps-results aps-results-hidden">

      <div class="aps-results-header">
        <p class="aps-results-summary"
           data-i18n-en="Loading..."
           data-i18n-cy="Llwytho...">
          No results yet
        </p>
      </div>

      <!-- LIST RESULTS -->
      <div class="aps-results-list"></div>

      <!-- GRAPH RESULTS -->
      <div id="aps-results-graph" class="aps-results-graph aps-hidden"></div>

      <!-- Hint text -->
      <p class="aps-hint"
         data-i18n-en="Choose at least one filter to see results."
         data-i18n-cy="Dewiswch o leiaf un hidlydd i weld canlyniadau.">
        Choose at least one filter to see results.
      </p>

    </div>

    <div class="aps-pagination aps-pagination-hidden">
      <button type="button" class="aps-btn aps-btn-ghost" id="aps-prev-page">&larr;</button>
      <span class="aps-page-indicator"></span>
      <button type="button" class="aps-btn aps-btn-ghost" id="aps-next-page">&rarr;</button>
    </div>

  </div>
</section>


    </div>
  `;
     // ---------------------------------------------------------
  // NEW: Load facet JSON data and initialise Advanced Search
  // ---------------------------------------------------------
  if (window.loadFacetData) {
    try {
      await window.loadFacetData();
    } catch (err) {
      console.error("Failed to load facet JSON lists:", err);
    }
  } else {
    console.warn("loadFacetData() not found – facet lists will be empty.");
  }

  if (window.initAdvancedPersonSearch) {
    try {
      window.initAdvancedPersonSearch();
    } catch (err) {
      console.error("initAdvancedPersonSearch() failed:", err);
    }
  } else {
    console.warn("initAdvancedPersonSearch() not found.");
  }
 // Initialise advanced person search (now that the DOM is in place)
 if (window.initAdvancedPersonSearch) {
    try {
      // CHANGE THIS LINE: Pass 'lang' into the function
      window.initAdvancedPersonSearch(lang); 
    } catch (err) {
      console.error("initAdvancedPersonSearch failed:", err);
    }
  }

  // Category button behaviour
  document.querySelectorAll(".home-card").forEach(card => {
    card.addEventListener("click", () => {
      const type = card.dataset.type;
      window.location.hash = `#/search/${type}`;
    });
  });

  // ---------------------------------------------------------
  // Initialise the homepage map
  // ---------------------------------------------------------
  if (window.MapExplorer && typeof MapExplorer.initHomeMap === "function") {
    MapExplorer.initHomeMap(lang);
  } else {
    console.error("MapExplorer.initHomeMap() not found.");
  }
};
