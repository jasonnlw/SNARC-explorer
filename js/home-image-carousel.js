/* =========================================================
   Home Image Carousel (inject + run)
   Requires: IMAGES.csv in repo (qid,image,label)
   ========================================================= */

(function () {
  const CSV_URL = "data/IMAGES.csv"; // <-- adjust to your repo path
  const ITEM_URL = (qid) => `https://jasonnlw.github.io/SNARC-explorer/#/item/${encodeURIComponent(qid)}`;

  const AUTO_MS = 5000;
  const PICK_N = 10;

  // Multi-image range logic preserved from your gallery loader
  const isMultiRange = (baseId) => (baseId >= 1448577 && baseId <= 1588867);

  function ensureCarouselShell() {
    const slot = document.querySelector(".botd-slot");
    if (!slot) return null;

    let host = document.getElementById("home-image-carousel");
    if (host) return host;

    host = document.createElement("section");
    host.id = "home-image-carousel";
    host.className = "hic-card";
    host.innerHTML = `
      <div class="hic-head">
        <button type="button" class="hic-randomize" aria-label="Randomize images">Randomize</button>
        <div class="hic-title">Featured Images</div>
        <div style="width: 84px;"></div>
      </div>

      <div class="hic-body">
        <button type="button" class="hic-arrow prev" aria-label="Previous">&#8592;</button>
        <button type="button" class="hic-arrow next" aria-label="Next">&#8594;</button>

        <div class="hic-viewport" aria-live="polite">
          <div class="hic-track"></div>
        </div>
      </div>
    `;

    // Insert AFTER BOTD card if present; otherwise append
    const botdCard = slot.querySelector(".botd-card");
    if (botdCard && botdCard.parentElement === slot) {
      botdCard.insertAdjacentElement("afterend", host);
    } else {
      slot.appendChild(host);
    }

    return host;
  }

  // Robust-enough CSV parser (handles quoted fields with commas)
  function parseCSV(text) {
    const rows = [];
    let i = 0, field = "", row = [], inQuotes = false;

    function pushField() {
      row.push(field);
      field = "";
    }
    function pushRow() {
      if (row.length) rows.push(row);
      row = [];
    }

    while (i < text.length) {
      const c = text[i];

      if (c === '"' ) {
        // double-quote escape inside quoted field
        if (inQuotes && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i += 1;
        continue;
      }

      if (!inQuotes && (c === ",")) {
        pushField();
        i += 1;
        continue;
      }

      if (!inQuotes && (c === "\n" || c === "\r")) {
        // handle CRLF
        if (c === "\r" && text[i + 1] === "\n") i += 1;
        pushField();
        pushRow();
        i += 1;
        continue;
      }

      field += c;
      i += 1;
    }

    // trailing field/row
    if (field.length || row.length) {
      pushField();
      pushRow();
    }

    // Convert to objects using header
    const header = rows.shift()?.map(h => h.trim()) || [];
    return rows
      .filter(r => r.length >= 3)
      .map(r => {
        const obj = {};
        header.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
        return obj;
      });
  }

  function sampleUnique(arr, n) {
    const a = arr.slice();
    // Fisher–Yates shuffle then slice
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(n, a.length));
  }

  function extractBaseId(imageField) {
    if (!imageField) return null;
    const s = String(imageField);
    const m = s.match(/(\d{6,})/); // your pattern: first 6+ digit run
    return m ? parseInt(m[1], 10) : null;
  }

  async function resolveIIIFThumb(baseId) {
    const multi = isMultiRange(baseId);
    const imageId = multi ? baseId + 1 : baseId;

    const url1 = `https://damsssl.llgc.org.uk/iiif/image/${imageId}/full/600,/0/default.jpg`;
    const url2 = `https://damsssl.llgc.org.uk/iiif/2.0/image/${imageId}/full/600,/0/default.jpg`;

    return await new Promise((resolve) => {
      const tryLoad = (urls) => {
        if (!urls.length) return resolve(null);
        const url = urls.shift();
        const img = new Image();
        img.onload = () => resolve({ thumbUrl: url, baseId, imageId, multi });
        img.onerror = () => tryLoad(urls);
        img.src = url;
      };
      tryLoad([url1, url2]);
    });
  }

  function getSlideWidthPx(host) {
    // Read --hic-slide-w from computed style. Fallback.
    const w = getComputedStyle(document.documentElement).getPropertyValue("--hic-slide-w").trim();
    if (!w) return 260;
    if (w.endsWith("px")) return parseFloat(w);
    // If it is calc(100%...) on mobile, treat as viewport width => 1 slide
    return null;
  }

  function computePerView(host) {
    const viewport = host.querySelector(".hic-viewport");
    const sw = getSlideWidthPx(host);
    if (!viewport) return 1;

    if (sw == null) return 1; // mobile calc -> 1
    const vw = viewport.clientWidth || 1;
    return Math.max(1, Math.floor(vw / sw));
  }

  function wireCarousel(host) {
    const track = host.querySelector(".hic-track");
    const btnPrev = host.querySelector(".hic-arrow.prev");
    const btnNext = host.querySelector(".hic-arrow.next");
    const btnRand = host.querySelector(".hic-randomize");

    let index = 0;
    let timer = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      timer = setInterval(() => move(1), AUTO_MS);
    };

    const move = (dir) => {
      const slides = Array.from(track.children);
      if (!slides.length) return;

      const perView = computePerView(host);
      const maxIndex = Math.max(0, slides.length - perView);

      index = index + (dir * perView);
      if (index > maxIndex) index = 0;
      if (index < 0) index = maxIndex;

      // slide width: use first slide actual width
      const first = slides[0];
      const stepPx = first ? first.getBoundingClientRect().width : 0;
      track.style.transform = `translateX(${-index * stepPx}px)`;
    };

    btnPrev?.addEventListener("click", () => { move(-1); start(); });
    btnNext?.addEventListener("click", () => { move(1); start(); });

    // Pause on hover (desktop)
    host.addEventListener("mouseenter", stop);
    host.addEventListener("mouseleave", start);

    // Recompute layout on resize
    window.addEventListener("resize", () => {
      // Snap transform to current index based on updated slide width
      const slides = Array.from(track.children);
      if (!slides.length) return;
      const first = slides[0];
      const stepPx = first ? first.getBoundingClientRect().width : 0;
      track.style.transform = `translateX(${-index * stepPx}px)`;
    });

    return { start, stop, move, setIndex: (i) => (index = i), getIndex: () => index };
  }

  async function buildSlides(host, rows) {
    const track = host.querySelector(".hic-track");
    if (!track) return;

    track.innerHTML = ""; // clear

    // Resolve thumbs in parallel with fallback logic
    const enriched = await Promise.all(rows.map(async (r) => {
      const baseId = extractBaseId(r.image);
      if (!baseId) return null;
      const resolved = await resolveIIIFThumb(baseId);
      if (!resolved) return null;

      return {
        qid: r.qid,
        label: r.label,
        thumbUrl: resolved.thumbUrl
      };
    }));

    const items = enriched.filter(Boolean);

    // Build DOM
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

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadCSV() {
    const res = await fetch(CSV_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  async function run() {
    const host = ensureCarouselShell();
    if (!host) return;

    const btnRand = host.querySelector(".hic-randomize");
    const track = host.querySelector(".hic-track");

    const controller = wireCarousel(host);

    let allRows = [];
    try {
      allRows = await loadCSV();
    } catch (err) {
      console.error("Home carousel: CSV load failed", err);
      if (track) track.innerHTML = `<div style="padding:1rem;color:#fff;font-weight:700;">Images unavailable.</div>`;
      return;
    }

    async function randomizeAndRender() {
      controller?.stop?.();
      controller?.setIndex?.(0);

      const pick = sampleUnique(allRows, PICK_N);
      await buildSlides(host, pick);

      // reset transform
      const slides = Array.from(host.querySelectorAll(".hic-slide"));
      if (slides.length) {
        host.querySelector(".hic-track").style.transform = "translateX(0px)";
        controller?.start?.();
      }
    }

    btnRand?.addEventListener("click", () => {
      randomizeAndRender();
    });

    await randomizeAndRender();
  }

  // Run after DOM is ready (supports injection timing)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
