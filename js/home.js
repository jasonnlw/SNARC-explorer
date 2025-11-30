// home.js
// ---------------------------------------------
// Dedicated logic for the SNARC Explorer home page
// ---------------------------------------------

window.Home = {};

console.log("Home page JS loaded.");

// Run when homepage is shown
Home.initHomePage = async function(lang = "en") {
  const container = document.getElementById("homeContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="home-search-wrapper">
      <input id="homeSearchInput" placeholder="${lang === "cy" ? "Chwilio…" : "Search…"}" />
      <button id="homeSearchBtn">${lang === "cy" ? "Ewch" : "Go"}</button>
    </div>

    <div class="home-sections">

      <section id="featuredEntities">
        <h2>${lang === "cy" ? "Categorïau dan sylw" : "Featured Categories"}</h2>
        <div class="home-cards">
          <div class="home-card" data-type="person">${lang === "cy" ? "Pobl" : "People"}</div>
          <div class="home-card" data-type="place">${lang === "cy" ? "Llefydd" : "Places"}</div>
          <div class="home-card" data-type="org">${lang === "cy" ? "Sefydliadau" : "Organisations"}</div>
        </div>
      </section>

      <section id="recentEntities">
        <h2>${lang === "cy" ? "Cofnodion Diweddar" : "Recent Entities"}</h2>
        <div id="recentList">Loading…</div>
      </section>

      <section id="randomEntity">
        <button id="randomBtn">${lang === "cy" ? "Eitem ar Hap" : "Random Item"}</button>
      </section>

    </div>
  `;

  // Attach search handlers
document.getElementById("homeContainer").style.display = "block";
document.getElementById("app").style.display = "none";

  document.getElementById("homeSearchBtn").addEventListener("click", runHomeSearch);
  document.getElementById("homeSearchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") runHomeSearch();
  });

  // Category navigation
  document.querySelectorAll(".home-card").forEach(card => {
    card.addEventListener("click", () => {
      const type = card.dataset.type;
      window.location.hash = `#/search/${type}`;
    });
  });

  // Random entity button
  document.getElementById("randomBtn").addEventListener("click", loadRandomEntity);

  loadRecentEntities();
}


// ----------------------------------------------------
// Home search behaviour
// ----------------------------------------------------
function runHomeSearch() {
  const val = document.getElementById("homeSearchInput").value.trim();
  if (!val) return;

  window.location.hash = `#/search?q=${encodeURIComponent(val)}`;
}


// ----------------------------------------------------
// Load recent entities (example SPARQL query)
// ----------------------------------------------------
async function loadRecentEntities() {
  const target = document.getElementById("recentList");
  const query = `
    SELECT ?item ?label WHERE {
      ?item schema:dateModified ?d .
      OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label)="en") }
    }
    ORDER BY DESC(?d)
    LIMIT 10
  `;

  try {
    const results = await sparqlQuery(query);
    target.innerHTML = results.map(row => `
      <div class="recent-line" data-id="${row.item.value}">
        ${row.label?.value || row.item.value.split("/").pop()}
      </div>
    `).join("");

    document.querySelectorAll(".recent-line").forEach(line => {
      line.addEventListener("click", () => {
        const qid = line.dataset.id.split("/").pop();
        window.location.hash = `#/item/${qid}`;
      });
    });

  } catch (err) {
    console.error("Recent entities failed", err);
    target.innerHTML = "Error loading recent items.";
  }
}


// ----------------------------------------------------
// Load a random entity
// ----------------------------------------------------
async function loadRandomEntity() {
  try {
    const query = `
      SELECT ?item WHERE {
        ?item a wikibase:Item .
      }
      SAMPLE(?item) AS ?random
      LIMIT 1
    `;
    const result = await sparqlQuery(query);

    const id = result[0].random.value.split("/").pop();
    window.location.hash = `#/item/${id}`;
  } catch (err) {
    console.error("Random entity error", err);
  }
}
