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

    </div>
  `;

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
