console.log("FACETS.JS LOADED");

window.Facets = {
  gender: [],
  occupation: [],
  education_place: [],
  places: [],
  content_type: []
};

window.loadFacetData = async function () {
  const files = {
    gender: "js/gender.js",
    occupation: "js/occupation.js",
    education_place: "js/education_place.js",
    places: "js/places.js",
    content_type: "js/content_type.js"
  };

  let allOk = true;

  for (const [key, path] of Object.entries(files)) {
    try {
      console.log(`Loading facet "${key}" from ${path}`);
      const res = await fetch(path);
      const text = await res.text();

      try {
        const data = JSON.parse(text);
        window.Facets[key] = data;
        console.log(`Facet "${key}" loaded:`, data.length, "items");
      } catch (parseErr) {
        allOk = false;
        console.error(
          `❌ JSON parse error for facet "${key}" from ${path}`,
          parseErr
        );
        window.Facets[key] = [];
      }
    } catch (err) {
      allOk = false;
      console.error(`❌ Failed to load facet "${key}" from ${path}`, err);
      window.Facets[key] = [];
    }
  }

  console.log("Facet lists after load:", window.Facets);
  return allOk;
};
