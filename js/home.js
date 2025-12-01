// -------------------------------------------------------------
// SNARC Explorer – Home Page Controller (Non-module version)
// -------------------------------------------------------------

window.Home = {};

/**
 * Initialise the homepage view.
 * This replaces App.renderHome() once router.js calls it.
 */
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
  // Render homepage content
  // ---------------------------------------------------------
  home.innerHTML = `
    <div class="home-wrapper">

      <section class="home-header">
        <h1>${lang === "cy" ? "Croeso i SNARC Explorer" : "Welcome to SNARC Explorer"}</h1>
        <p>${lang === "cy"
          ? "Defnyddiwch y bar chwilio uchod neu ddewch o hyd i gynnwys dan sylw."
          : "Use the search bar above or explore featured content."}
        </p>
      </section>

// Inside home.innerHTML = ` ... `
<section class="map-block">
   <h2>${lang === "cy" ? "Archwilio'r Map" : "Explore the Map"}</h2>
   <div id="homeMap"></div>
</section>
    </div>
  `;

  // ---------------------------------------------------------
  // Add event listeners
  // ---------------------------------------------------------

  // Category buttons → trigger a search route
  document.querySelectorAll(".home-card").forEach(card => {
    card.addEventListener("click", () => {
      const type = card.dataset.type;
      window.location.hash = `#/search/${type}`;
    });
  })

MapExplorer.initHomeMap(lang);
  
  // Random Item → temporary simple random QID
  const randomBtn = document.getElementById("randomBtn");
  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      // You can upgrade this to SPARQL later
      const sampleQ = "Q" + Math.floor(Math.random() * 5000);
      window.location.hash = `#/item/${sampleQ}`;
    });
  }
};
