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
  home.innerHTML = 
    
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
`
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

      <section class="home-featured">
        <h2>${lang === "cy" ? "Categorïau" : "Categories"}</h2>
        <div class="home-cards">
          <button class="home-card" data-type="person">
            ${lang === "cy" ? "Pobl" : "People"}
          </button>
          <button class="home-card" data-type="place">
            ${lang === "cy" ? "Llefydd" : "Places"}
          </button>
          <button class="home-card" data-type="org">
            ${lang === "cy" ? "Sefydliadau" : "Organisations"}
          </button>
        </div>
      </section>

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

        <!-- Gender -->
        <div class="aps-field" data-facet="gender">
          <label class="aps-label" for="aps-gender-input"
                 data-i18n-en="Gender" data-i18n-cy="Rhyw">
            Gender
          </label>
          <div class="aps-dropdown">
            <input id="aps-gender-input" type="text" class="aps-input"
                   autocomplete="off"
                   data-i18n-placeholder-en="Any gender"
                   data-i18n-placeholder-cy="Unrhyw ryw"
                   placeholder="Any gender"/>
            <button type="button" class="aps-clear" aria-label="Clear">×</button>
            <ul class="aps-options aps-options-hidden"></ul>
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
          <label class="aps-label" for="aps-relatedContent-input"
                 data-i18n-en="Related content / collections"
                 data-i18n-cy="Cynnwys / casgliadau cysylltiedig">
            Related content / collections
          </label>
          <div class="aps-dropdown">
            <input id="aps-relatedContent-input" type="text" class="aps-input"
                   autocomplete="off"
                   data-i18n-placeholder-en="Any collection"
                   data-i18n-placeholder-cy="Unrhyw gasgliad"
                   placeholder="Any collection"/>
            <button type="button" class="aps-clear" aria-label="Clear">×</button>
            <ul class="aps-options aps-options-hidden"></ul>
          </div>
        </div>

      </div>

      <div class="aps-actions">
        <button type="submit" class="aps-btn aps-btn-primary"
                data-i18n-en="Search people"
                data-i18n-cy="Chwilio pobl">
          Search people
        </button>

        <button type="button" class="aps-btn aps-btn-secondary" id="aps-reset"
                data-i18n-en="Reset filters"
                data-i18n-cy="Ailosod hidlwyr">
          Reset filters
        </button>

        <p class="aps-hint"
           data-i18n-en="Choose at least one filter to see results."
           data-i18n-cy="Dewiswch o leiaf un hidlydd i weld canlyniadau.">
          Choose at least one filter to see results.
        </p>
      </div>
    </form>

    <div id="aps-results" class="aps-results aps-results-hidden">
      <div class="aps-results-header">
        <p class="aps-results-summary"
           data-i18n-en="No results yet"
           data-i18n-cy="Dim canlyniadau eto">
          No results yet
        </p>
      </div>
      <div class="aps-results-list"></div>

      <div class="aps-pagination aps-pagination-hidden">
        <button type="button" class="aps-btn aps-btn-ghost" id="aps-prev-page">&larr;</button>
        <span class="aps-page-indicator"></span>
        <button type="button" class="aps-btn aps-btn-ghost" id="aps-next-page">&rarr;</button>
      </div>
    </div>

  </div>
</section>



    </div>
  `;

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
