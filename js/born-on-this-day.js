// -------------------------------------------------------------
// Born on This Day (SNARC Wikibase)
// Renders one random person born on today's date.
// -------------------------------------------------------------
window.BornOnThisDay = window.BornOnThisDay || {};

window.BornOnThisDay.render = async function (lang = "en") {
  const slot = document.getElementById("botd-card-slot");

  if (!slot) {
    console.warn("BOTD: #botd-card-slot not found");
    return;
  }

  console.log("BOTD: render start");
try {

  // Use Europe/London (your site context) for the "today" date key
  const now = new Date();
  const tz = "Europe/London";

  // Build a YYYY-MM-DD key in Europe/London for caching
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const cacheKey = `snarc_botd_${key}_${lang}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      slot.innerHTML = buildCardHTML(data, lang);
      return;
    } catch (_) {
      // ignore cache parse errors
    }
  }

  // Month/day to inject into SPARQL
  const month = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "numeric" }).format(now));
  const day = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric" }).format(now));

  // IMPORTANT: update this if your query endpoint differs
  const endpoint = "https://snarc-llgc.wikibase.cloud/query/sparql";

  // If your data truly uses YEAR precision only (9), remove the precision filter
  // and decide how you want to display the date (year-only vs full date).
  const sparql = `
PREFIX wd:  <https://snarc-llgc.wikibase.cloud/entity/>
PREFIX wdt: <https://snarc-llgc.wikibase.cloud/prop/direct/>
PREFIX p:   <https://snarc-llgc.wikibase.cloud/prop/>
PREFIX psv: <https://snarc-llgc.wikibase.cloud/prop/statement/value/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd:  <http://www.bigdata.com/rdf#>

SELECT ?person ?personLabel ?personDescription ?birthDate ?prec ?image WHERE {
  ?person wdt:P7 wd:Q947 .
  ?person wdt:P31 ?image .
  ?person p:P17 ?birthStmt .
  ?birthStmt psv:P17 ?birthValue .
  ?birthValue wikibase:timeValue ?birthDate ;
              wikibase:timePrecision ?prec .

  # "Born on this day" filter
  VALUES (?m ?d) { (${month} ${day}) }
  FILTER(MONTH(?birthDate) = ?m && DAY(?birthDate) = ?d)

  # Prefer full dates (day precision = 11). Remove this line if needed.
  FILTER(?prec = 11)

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "${lang},en,cy" .
  }
}
ORDER BY RAND()
LIMIT 1
`.trim();

  const url = endpoint + "?format=json&query=" + encodeURIComponent(sparql);

  // Render loading placeholder while fetching
  slot.innerHTML = `<div class="botd-skeleton" aria-hidden="true"></div>`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json"
    }
  });

  if (!res.ok) {
    throw new Error(`BornOnThisDay: SPARQL request failed (${res.status})`);
  }

  const json = await res.json();
  const row = json?.results?.bindings?.[0];

  if (!row) {
    slot.innerHTML = `
      <div class="botd-empty">
        ${lang === "cy" ? "Dim canlyniad ar gyfer heddiw." : "No result found for today."}
      </div>`;
    return;
  }

  const personUri = row.person.value;
  const qid = personUri.split("/").pop();
  const entityHash = `#/item/${qid}`;

  const data = {
    qid,
    entityHash,
    label: row.personLabel?.value || qid,
    description: row.personDescription?.value || "",
    birthDate: row.birthDate?.value || "",
    prec: row.prec?.value ? Number(row.prec.value) : null,
    image: row.image?.value || ""
  };

  sessionStorage.setItem(cacheKey, JSON.stringify(data));
  slot.innerHTML = buildCardHTML(data, lang);
  console.log("BOTD: card injected");

} catch (err) {
  console.error("BOTD: render failed", err);
  slot.innerHTML = `
    <div class="botd-empty">
      ${lang === "cy"
        ? "Methwyd llwytho'r cerdyn."
        : "Failed to load the card."}
    </div>`;
}
};


function buildCardHTML(data, lang) {
  const tz = "Europe/London";
  const locale = (lang === "cy") ? "cy-GB" : "en-GB";
  const href = `#/item/${data.qid}`;
  let birthText = "";
  if (data.birthDate) {
    // Wikibase timeValue is ISO; Date can parse it
    const d = new Date(data.birthDate);

    // If you allow year-only precision later, you can branch here:
    // if (data.prec === 9) { birthText = String(d.getUTCFullYear()); } else ...
    birthText = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(d);
  }

  const title = (lang === "cy") ? "Ganwyd ar y dydd hwn" : "Born on this day";

  // Basic HTML escaping for text fields
  const esc = (s) => String(s || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  const img = data.image ? `<img src="${esc(data.image)}" alt="${esc(data.label)}">` : "";

return `
  <a class="botd-card" href="${esc(href)}" aria-label="${esc(title)}: ${esc(data.label)}">
    <div class="botd-card-head">${esc(title)}</div>

    <div class="botd-card-body">
      <div class="botd-info">
<div class="botd-title-line">
  <span class="botd-label">${esc(data.label)}</span>
  <span class="botd-sep"> – </span>
  <span class="botd-date">${esc(birthText)}</span>
</div>
        ${data.description ? `<div class="botd-desc">${esc(data.description)}</div>` : ""}
      </div>

      <div class="botd-image">
        ${img}
      </div>
    </div>
  </a>
`;
}
