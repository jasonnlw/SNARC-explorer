window.CONFIG = {
  BASE: "https://snarc-llgc.wikibase.cloud",
  ACTION_API: "https://snarc-llgc.wikibase.cloud/w/api.php",
  SPARQL: "https://snarc-llgc.wikibase.cloud/query/sparql",
  DEFAULT_LANG: "en",

  // Define logical categories and their rules
  TYPES: {
    person: {
      instanceOf: ["Q947"], // human
      subclassOf: ["Q947"]
    },
    place: {
      coordinates: ["P26"] // any entity with coordinates statement
    },
    organisation: {
      instanceOf: ["Q10448", "Q10298", "Q10456"], // event, organisation, group of humans
      subclassOf: ["Q10448", "Q10298", "Q10456"]
    }
  }
};

