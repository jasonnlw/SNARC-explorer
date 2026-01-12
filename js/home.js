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

// Force home page to start at top (immediately)
window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

<section class="botd-block" aria-label="Born on this day">
  <div id="botd-card-slot" class="botd-slot">
    <div class="botd-skeleton" aria-hidden="true"></div>
  </div>
</section>



<section class="map-block">

  <header class="aps-header map-header-red">
    <div class="aps-header-text">
      <h2 class="aps-title"
          data-i18n-en="Explore the map"
          data-i18n-cy="Archwilio’r map">
        Explore the map
      </h2>

      <p class="aps-subtitle"
         data-i18n-en="Browse people, places and related collections spatially."
         data-i18n-cy="Pori pobl, lleoedd a chasgliadau cysylltiedig yn ofodol.">
        Browse people, places and related collections spatially.
      </p>
    </div>
  </header>

  <div id="homeMap"></div>
</section>


<!-- Advanced Person Search (below map placeholder) -->
<section id="advanced-person-search" class="aps-section">
  <div class="aps-inner">
<header class="aps-header">
  <div class="aps-header-text">
    <h2 class="aps-title" data-i18n-en="Explore people by filters" data-i18n-cy="Archwilio pobl drwy hidlwyr">
      Explore people by filters
    </h2>

    <p class="aps-subtitle"
       data-i18n-en="Combine any of the filters below to discover people by gender, occupation, places and related collections."
       data-i18n-cy="Cyfunwch unrhyw un o’r hidlwyr isod i ddarganfod pobl yn ôl rhyw, galwedigaeth, lleoedd a chasgliadau cysylltiedig.">
      Combine any of the filters below to discover people by gender, occupation, places and related collections.
    </p>
  </div>

  <!-- Filters toggle moved INTO header (NEW position) -->
<button type="button"
        class="aps-filters-toggle"
        aria-expanded="false"
        aria-controls="aps-filters-panel"
        data-show-en="Show filters"
        data-show-cy="Dangos hidlwyr"
        data-hide-en="Hide filters"
        data-hide-cy="Cuddio hidlwyr">
  Show filters
</button>
</header>


    <!-- APS collapsible filters panel (NEW) -->
    <div id="aps-filters-panel" class="aps-filters-panel aps-filters-collapsed">

      <form id="aps-form" class="aps-form" novalidate>

      <div class="aps-fields-grid">

<!-- Gender -->
<div class="aps-field" data-facet="gender">
  <label class="aps-label"
         data-i18n-en="Gender"
         data-i18n-cy="Rhyw">
    Gender
  </label>

  <div class="aps-dropdown aps-dropdown-select"> 
    <select id="aps-gender-select" class="aps-input aps-select">
          <option value="" data-i18n-en="Any gender" data-i18n-cy="Unrhyw ryw">
      Any gender
    </option>
    </select>
  </div>
</div>


        <!-- Occupation -->
        <div class="aps-field" data-facet="occupation">
          <label class="aps-label" for="aps-occupation-input"
                 data-i18n-en="Occupation" data-i18n-cy="Galwedigaeth">
            Occupation
          </label>
          <div class="aps-dropdown">
            <input id="aps-occupation-input" type="text" class="aps-input"
                   autocomplete="off"
                   data-i18n-placeholder-en="Any occupation"
                   data-i18n-placeholder-cy="Unrhyw alwedigaeth"
                   placeholder="Any occupation"/>
            <button type="button" class="aps-clear" aria-label="Clear">×</button>
            <ul class="aps-options aps-options-hidden"></ul>
          </div>
        </div>

        <!-- Place of Education -->
        <div class="aps-field" data-facet="educationPlace">
          <label class="aps-label" for="aps-educationPlace-input"
                 data-i18n-en="Place of education" data-i18n-cy="Lle addysg">
            Place of education
          </label>
          <div class="aps-dropdown">
            <input id="aps-educationPlace-input" type="text" class="aps-input"
                   autocomplete="off"
                   data-i18n-placeholder-en="Any place"
                   data-i18n-placeholder-cy="Unrhyw le"
                   placeholder="Any place"/>
            <button type="button" class="aps-clear" aria-label="Clear">×</button>
            <ul class="aps-options aps-options-hidden"></ul>
          </div>
        </div>

        <!-- Place of Birth -->
        <div class="aps-field" data-facet="birthPlace">
          <label class="aps-label" for="aps-birthPlace-input"
                 data-i18n-en="Place of birth" data-i18n-cy="Lle geni">
            Place of birth
          </label>
          <div class="aps-dropdown">
            <input id="aps-birthPlace-input" type="text" class="aps-input"
                   autocomplete="off"
                   data-i18n-placeholder-en="Any place"
                   data-i18n-placeholder-cy="Unrhyw le"
                   placeholder="Any place"/>
            <button type="button" class="aps-clear" aria-label="Clear">×</button>
            <ul class="aps-options aps-options-hidden"></ul>
          </div>
        </div>

        <!-- Place of Death -->
        <div class="aps-field" data-facet="deathPlace">
          <label class="aps-label" for="aps-deathPlace-input"
                 data-i18n-en="Place of death" data-i18n-cy="Lle marw">
            Place of death
          </label>
          <div class="aps-dropdown">
            <input id="aps-deathPlace-input" type="text" class="aps-input"
                   autocomplete="off"
                   data-i18n-placeholder-en="Any place"
                   data-i18n-placeholder-cy="Unrhyw le"
                   placeholder="Any place"/>
            <button type="button" class="aps-clear" aria-label="Clear">×</button>
            <ul class="aps-options aps-options-hidden"></ul>
          </div>
        </div>

<!-- Related Content -->
<div class="aps-field" data-facet="relatedContent">
  <label class="aps-label"
         data-i18n-en="Has Related Collections"
         data-i18n-cy="Efo Casgliadau Perthnasol">
    Related content / collections
  </label>

  <div class="aps-dropdown aps-dropdown-select"> 
    <select id="aps-relatedContent-select" class="aps-input aps-select">

      <!-- Default "Any collection" -->
      <option value="" 
              data-i18n-en="Select Collection" 
              data-i18n-cy="Dewis Casgliad">
        Any collection
      </option>

      <!-- ONE single ALL option -->
<option value="ALL" data-i18n-en="All" data-i18n-cy="Popeth">
    All
</option>


      <!-- JS will append the real content-type options here -->
    </select>
  </div>
</div>



      </div>

<div class="aps-actions">
  <button type="submit"
          class="aps-btn aps-btn-primary"
          data-i18n-en="Search people"
          data-i18n-cy="Chwilio pobl">
    Search people
  </button>
</div>

      </form>
    </div> <!-- closes #aps-filters-panel -->

    <!-- RESULTS WRAPPER (must NOT be inside filters panel) -->
    <div id="aps-results" class="aps-results aps-results-hidden">


    
 <!-- NEW: Single unified toggle button -->
    <button id="aps-view-toggle" class="aps-view-toggle">
      <span class="icon"></span>
      <span class="label">Graph</span>
    </button>


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

// Force again after DOM injection (prevents restored scroll/BFCache oddities)
requestAnimationFrame(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
});



  // ---------------------------------------------------------
// Update homepage bilingual labels (Map header etc.)
// ---------------------------------------------------------
{
  const attr = (lang === "cy") ? "data-i18n-cy" : "data-i18n-en";

  document.querySelectorAll("[data-i18n-en]").forEach(el => {
    const txt = el.getAttribute(attr);
    if (txt) el.textContent = txt;
  });
}


  // Born on This Day card
if (window.BornOnThisDay && typeof window.BornOnThisDay.render === "function") {
  try {
    await window.BornOnThisDay.render(lang);
  } catch (err) {
    console.error("BornOnThisDay.render failed:", err);
  }
}

if (window.HomeImageCarousel && typeof window.HomeImageCarousel.render === "function") {
  try {
    await window.HomeImageCarousel.render(lang);
  } catch (err) {
    console.error("HomeImageCarousel.render failed:", err);
  }
}

  // Final clamp after top-of-page features load
requestAnimationFrame(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
});


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
  // Initialise + language-refresh the homepage map
  // ---------------------------------------------------------
  if (window.MapExplorer && typeof MapExplorer.initHomeMap === "function") {
    // IMPORTANT: await ensures the map initialises after #homeMap exists
    await MapExplorer.initHomeMap(lang);

    // IMPORTANT: setLanguage ensures queries/popup strings refresh on EN/CY toggle
    if (typeof MapExplorer.setLanguage === "function") {
      MapExplorer.setLanguage(lang);
    }
  } else {
    console.error("MapExplorer.initHomeMap() not found.");
  }

};
// BFCache: when returning via Back/Forward to home, force top
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;

  // Only force top if home is the active view
  const home = document.getElementById("homeContainer");
  const app = document.getElementById("app");

  const homeVisible = home && home.style.display !== "none";
  const appHidden = app && app.style.display === "none";

  if (homeVisible && appHidden) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }
});
