console.log("FACETS.JS LOADED");

window.Facets = {
  gender: [],
  occupation: [],
  education_place: [],
  places: [],
  content_type: []
};

window.loadFacetData = async function () {
  try {
const files = {
  gender: "js/gender.js",
  occupation: "js/occupation.js",
  education_place: "js/education_place.js",
  places: "js/places.js",
  content_type: "js/content_type.js"
};

    for (const [key, path] of Object.entries(files)) {
      const res = await fetch(path);
      const data = await res.json();
      window.Facets[key] = data;
    }

    console.log("Facet lists loaded:", window.Facets);
    return true;

  } catch (err) {
    console.error("Failed to load facet data:", err);
    return false;
  }
};
