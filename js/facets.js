export const Facets = {
  gender: [],
  occupation: [],
  education_place: [],
  places: [],
  content_type: []
};

export async function loadFacetData() {
  try {
    const files = {
      gender: "js/gender.json",
      occupation: "js/occupation.json",
      education_place: "js/education_place.json",
      places: "js/places.json",
      content_type: "js/content_type.json"
    };

    for (const [key, path] of Object.entries(files)) {
      const res = await fetch(path);
      const data = await res.json();
      Facets[key] = data;
    }

    console.log("Facet lists loaded:", Facets);
    return true;

  } catch (err) {
    console.error("Failed to load facet data:", err);
    return false;
  }
}
