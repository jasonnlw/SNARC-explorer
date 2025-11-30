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

      <section class="home-random">
        <button id="randomBtn" class="home-random-btn">
          ${lang === "cy" ? "Eitem ar Hap" : "Random Item"}
        </button>
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
  });

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
