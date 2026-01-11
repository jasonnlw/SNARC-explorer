// js/home-image-carousel.js
(function () {
  const CSV_URL = "data/IMAGES.csv"; // adjust path
  const ITEM_URL = (qid) => `https://jasonnlw.github.io/SNARC-explorer/#/item/${encodeURIComponent(qid)}`;
  const AUTO_MS = 5000;
  const PICK_N = 10;

  const isMultiRange = (baseId) => (baseId >= 1448577 && baseId <= 1588867);

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseCSV(text) {
    const rows = [];
    let i = 0, field = "", row = [], inQuotes = false;

    function pushField(){ row.push(field); field = ""; }
    function pushRow(){ if (row.length) rows.push(row); row = []; }

    while (i < text.length) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = !inQuotes; i++; continue;
      }
      if (!inQuotes && c === ",") { pushField(); i++; continue; }
      if (!inQuotes && (c === "\n" || c === "\r")) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        pushField(); pushRow(); i++; continue;
      }
      field += c; i++;
    }
    if (field.length || row.length) { pushField(); pushRow(); }

    const header = (rows.shift() || []).map(h => h.trim());
    return rows
      .filter(r => r.length >= header.length)
      .map(r => {
        const obj = {};
        header.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
        return obj;
      });
  }

  function sampleUnique(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(n, a.length));
  }

  function extractBaseId(imageField) {
    if (!imageField) return null;
    const m = String(imageField).match(/(\d{6,})/);
    return m ? parseInt(m[1], 10) : null;
  }

  async function resolveIIIFThumb(baseId) {
    const multi = isMultiRange(baseId);
    const imageId = multi ? baseId + 1 : baseId;

    const url1 = `https://damsssl.llgc.org.uk/iiif/image/${imageId}/full/450,/0/default.jpg`;
    const url2 = `https://damsssl.llgc.org.uk/iiif/2.0/image/${imageId}/full/450,/0/default.jpg`;

    return await new Promise((resolve) => {
      const tryLoad = (urls) => {
        if (!urls.length) return resolve(null);
        const url = urls.shift();
        const img = new Image();
        img.onload = () => resolve({ thumbUrl: url });
        img.onerror = () => tryLoad(urls);
        img.src = url;
      };
      tryLoad([url1, url2]);
    });
  }

  async function loadCSV() {
    const res = await fetch(CSV_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  function ensureShell() {
    const slot = document.querySelector(".botd-slot");
    if (!slot) return null;

    // Guard: don’t inject twice on route re-entry
    let host = document.getElementById("home-image-carousel");
    if (host) return host;

    host = document.createElement("section");
    host.id = "home-image-carousel";
    host.className = "hic-card";
    host.innerHTML = `
  <div class="hic-head">
    <div class="hic-title"
         data-i18n-en="Featured Images"
         data-i18n-cy="Delweddau Nodwedd">
      Featured Images
    </div>

    <button type="button"
            class="hic-randomize"
            aria-label="Randomize images"
            data-i18n-en="Randomize"
            data-i18n-cy="Ar Hap">
      Randomize
    </button>
  </div>


      <div class="hic-body">
        <button type="button" class="hic-arrow prev" aria-label="Previous">&#8592;</button>
        <button type="button" class="hic-arrow next" aria-label="Next">&#8594;</button>

        <div class="hic-viewport" aria-live="polite">
          <div class="hic-track"></div>
        </div>
      </div>
    `;

    // Insert after BOTD card if present; otherwise append into slot
    const botdCard = slot.querySelector(".botd-card");
    if (botdCard) botdCard.insertAdjacentElement("afterend", host);
    else slot.appendChild(host);

    return host;
  }

  function computePerView(host) {
    const viewport = host.querySelector(".hic-viewport");
    if (!viewport) return 1;

    const vw = viewport.clientWidth || 1;
    const root = getComputedStyle(document.documentElement);
    const swRaw = root.getPropertyValue("--hic-slide-w").trim();

    // If mobile uses calc(100%...) treat as 1
    if (!swRaw || swRaw.startsWith("calc") || swRaw.includes("%")) return 1;

    const sw = swRaw.endsWith("px") ? parseFloat(swRaw) : 260;
    return Math.max(1, Math.floor(vw / sw));
  }

function wireCarousel(host) {
  const viewport = host.querySelector(".hic-viewport");
  const btnPrev = host.querySelector(".hic-arrow.prev");
  const btnNext = host.querySelector(".hic-arrow.next");

  let timer = null;

  const isDesktop = () => window.matchMedia("(min-width: 900px)").matches;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const start = () => {
    stop();
    timer = setInterval(() => move(1), AUTO_MS);
  };

const move = (dir) => {
  if (!viewport) return;

  const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

  if (isDesktop()) {
    // Desktop: keep your existing behaviour (natural width, multiple visible)
    const step = Math.max(200, Math.floor(viewport.clientWidth * 0.85));
    let next = viewport.scrollLeft + (dir * step);

    if (next > maxScroll - 5) next = 0;
    if (next < 0) next = maxScroll;

    viewport.scrollTo({ left: next, behavior: "smooth" });
    return;
  }

  // Mobile: EXACT one-slide stepping using viewport width
  const step = Math.max(1, viewport.clientWidth);

  // snap current position to nearest slide boundary first
  const current = Math.round(viewport.scrollLeft / step) * step;

  let next = current + (dir * step);

  // wrap around cleanly
  if (next > maxScroll) next = 0;
  if (next < 0) next = Math.round(maxScroll / step) * step;

  viewport.scrollTo({ left: next, behavior: "smooth" });
};


  btnPrev?.addEventListener("click", () => { move(-1); start(); });
  btnNext?.addEventListener("click", () => { move(1); start(); });

  // Pause on hover (desktop only)
  host.addEventListener("mouseenter", () => { if (isDesktop()) stop(); });
  host.addEventListener("mouseleave", () => { if (isDesktop()) start(); });

  // Keep scroll position valid on resize
  window.addEventListener("resize", () => {
  if (!viewport) return;
  if (!isDesktop()) {
    const step = Math.max(1, viewport.clientWidth);
    viewport.scrollLeft = Math.round(viewport.scrollLeft / step) * step;
  } else {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (viewport.scrollLeft > maxScroll) viewport.scrollLeft = maxScroll;
  }
});


  // Keep API compatible with your existing code
  return {
    start,
    stop,
    setIndex: () => {}, // no-op (indexing not used in scroll model)
    snap: () => {}      // no-op (transform snapping not used)
  };
}

  async function buildSlides(host, rows) {
    const track = host.querySelector(".hic-track");
    if (!track) return;

    track.innerHTML = "";

    const enriched = await Promise.all(rows.map(async (r) => {
      const baseId = extractBaseId(r.image);
      if (!baseId) return null;
      const resolved = await resolveIIIFThumb(baseId);
      if (!resolved) return null;
      return { qid: r.qid, label: r.label, thumbUrl: resolved.thumbUrl };
    }));

    const items = enriched.filter(Boolean);

    const frag = document.createDocumentFragment();
    items.forEach((it) => {
      const slide = document.createElement("div");
      slide.className = "hic-slide";
      slide.innerHTML = `
        <a href="${ITEM_URL(it.qid)}" title="${escapeHtml(it.label || it.qid)}">
          <div class="hic-img">
            <img src="${it.thumbUrl}" alt="${escapeHtml(it.label || it.qid)}" loading="lazy">
          </div>
          <div class="hic-caption">${escapeHtml(it.label || it.qid)}</div>
        </a>
      `;
      frag.appendChild(slide);
    });

    track.appendChild(frag);
  }

  // Public API
  window.HomeImageCarousel = {
    _rows: null,
    _controller: null,
    _hostEl: null,

   async render(lang = "en") {
  const host = ensureShell();
  if (!host) {
    console.warn("HomeImageCarousel: .botd-slot not found (home not rendered yet).");
    return;
  }

  // Apply EN/CY labels
  applyCarouselLanguage(host, lang);

  // IMPORTANT: If the home page has been re-rendered, this is a new DOM element.
  // Rebind arrow + randomize handlers to the new buttons.
  if (this._hostEl !== host) {
    // Stop any previous autoplay timer
    this._controller?.stop?.();

    // Track current host instance
    this._hostEl = host;

    // Re-wire arrow navigation (binds to elements inside this host)
    this._controller = wireCarousel(host);

    // Bind Randomize once per host element
    const btnRand = host.querySelector(".hic-randomize");
    if (btnRand && !btnRand.dataset.hicBound) {
      btnRand.dataset.hicBound = "1";
      btnRand.addEventListener("click", () => this.randomize());
    }
  }

  // Load CSV once per session
  if (!this._rows) {
    try {
      this._rows = await loadCSV();
    } catch (err) {
      console.error("HomeImageCarousel: CSV load failed", err);
      const track = host.querySelector(".hic-track");
      if (track) {
        track.innerHTML = `<div style="padding:1rem;color:#fff;font-weight:700;">Images unavailable.</div>`;
      }
      return;
    }
  }

  await this.randomize();
},


    async randomize() {
      const host = document.getElementById("home-image-carousel") || ensureShell();
      if (!host || !this._rows) return;

      this._controller?.stop?.();
      this._controller?.setIndex?.(0);

      const pick = sampleUnique(this._rows, PICK_N);
      await buildSlides(host, pick);

      const viewport = host.querySelector(".hic-viewport");
if (viewport) viewport.scrollLeft = 0;


      // reset
      const track = host.querySelector(".hic-track");
      if (track) track.style.transform = "translateX(0px)";

      this._controller?.snap?.();
      this._controller?.start?.();
    }

    // BFCache: when returning via Back/Forward, restart autoplay if carousel exists
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return; // only BFCache restores
  try {
    window.HomeImageCarousel?._controller?.start?.();
  } catch (err) {
    console.warn("HomeImageCarousel pageshow restart failed", err);
  }
});

  };
})();
