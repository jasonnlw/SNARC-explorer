// -------------------------------------------------------------
// SNARC Explorer – Map Explorer (Homepage Version)
// -------------------------------------------------------------

window.MapExplorer = (() => {

  let map, markers;

  // -----------------------------------------------------------
  // Initialise the homepage map
  // -----------------------------------------------------------
  async function initHomeMap(lang = "en") {
    console.log("MapExplorer: Initialising homepage map");

    const mapEl = document.getElementById("homeMap");
    if (!mapEl) {
      console.error("homeMap container missing");
      return;
    }

    // Set map height dynamically if needed
    mapEl.style.height = "420px";

    // Create Leaflet map
    map = L.map("homeMap", {
      scrollWheelZoom: true
    }).setView([52.4, -3.8], 7); // Wales centre point

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    markers = L.markerClusterGroup();
    map.addLayer(markers);

    // Load places
    loadPlaces(lang);
  }

  // -----------------------------------------------------------
  // Load place markers from SPARQL
  // -----------------------------------------------------------
  async function loadPlaces(lang) {
    const query = `
      SELECT ?place ?placeLabel ?coord WHERE {
        ?place wdt:P625 ?coord.
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en,cy". }
      }
    `;

    let results = [];
    try {
      results = await API.runSPARQL(query);
    } catch (err) {
      console.error("SPARQL error:", err);
      return;
    }

    results.forEach(row => {
      const coord = row.coord.value.replace("Point(", "").replace(")", "");
      const [lon, lat] = coord.split(" ");

      const qid = row.place.value.split("/").pop();
      const label = row.placeLabel?.value || qid;

      const marker = L.marker([parseFloat(lat), parseFloat(lon)]);
      marker.bindPopup(`
        <strong>${label}</strong><br>
        <a href="#/item/${qid}">
          ${lang === "cy" ? "Gweld manylion" : "View details"}
        </a>
      `);

      markers.addLayer(marker);
    });
  }

  return {
    initHomeMap
  };

})();

