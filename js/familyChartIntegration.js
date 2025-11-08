window.renderFamilyTree = async function (subjectQid, lang = "en") {
  const f3 = window.f3;
  if (!f3) {
    console.error("Family-Chart library not loaded yet");
    return;
  }
  
  const url = `https://snarc-llgc.wikibase.cloud/query/sparql?query=${encodeURIComponent(`
    SELECT ?person ?personLabel ?image ?dob ?dod ?gender ?spouse ?child WHERE {
      VALUES ?person { wd:${subjectQid} }
      OPTIONAL { ?person wdt:P18 ?image. }
      OPTIONAL { ?person wdt:P569 ?dob. }
      OPTIONAL { ?person wdt:P570 ?dod. }
      OPTIONAL { ?person wdt:P21 ?gender. }
      OPTIONAL { ?person wdt:P26 ?spouse. }
      OPTIONAL { ?person wdt:P40 ?child. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
    }
  `)}`;
  const response = await fetch(url);
  const json = await response.json();

  // 2. Map Wikidata-style results to Family-Chart format
  const nodes = [];
  const byId = {};

  json.results.bindings.forEach(row => {
    const qid = row.person.value.split("/").pop();
    if (!byId[qid]) {
      byId[qid] = {
        id: qid,
        data: {
          name: row.personLabel?.value || qid,
          image: row.image?.value || null,
          dob: row.dob?.value?.slice(0, 10) || null,
          dod: row.dod?.value?.slice(0, 10) || null,
          gender:
            /female/i.test(row.gender?.value || "") ? "F" :
            /male/i.test(row.gender?.value || "") ? "M" : null
        },
        rels: { spouses: [], children: [] }
      };
    }

    if (row.spouse?.value) {
      const sQ = row.spouse.value.split("/").pop();
      if (!byId[qid].rels.spouses.includes(sQ)) byId[qid].rels.spouses.push(sQ);
    }
    if (row.child?.value) {
      const cQ = row.child.value.split("/").pop();
      if (!byId[qid].rels.children.includes(cQ)) byId[qid].rels.children.push(cQ);
    }
  });

  // flatten to array
  for (const k in byId) nodes.push(byId[k]);

  // 3. Render using Family-Chart
  document.getElementById("familyChartContainer").innerHTML = "";
  const chart = f3.createChart("#familyChartContainer", nodes);
  chart.setCardHtml("data.name");
  chart.setCardDisplay([
    ["data.name"],
    ["data.dob", "data.dod"]
  ]);
  chart.updateTree({ initial: true });
}

