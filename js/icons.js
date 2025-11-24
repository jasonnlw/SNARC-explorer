// ===========================================
// icons.js — Centralised SVG icon definitions
// All icons are monochrome (#FF9F00), scalable,
// and returned as inline SVG strings.
// ===========================================

const ICON_COLOR = "#FF9F00";

const ICONS = {
"P0": `
<svg width="16" height="16" viewBox="0 0 24 24" fill="#FF9F00" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="12" r="3"/>
  <circle cx="18" cy="6" r="3"/>
  <circle cx="18" cy="18" r="3"/>
  <line x1="8.5" y1="10.5" x2="15.5" y2="7.5" stroke="#FF9F00" stroke-width="2"/>
  <line x1="8.5" y1="13.5" x2="15.5" y2="16.5" stroke="#FF9F00" stroke-width="2"/>
</svg>`,

  // ---- NEW ICONS ----
  book: `
      <svg viewBox="0 0 24 24" class="id-icon">
    <path d="
      M3 5
      C3 4.4 3.4 4 4 4
      H10
      C11.5 4 13 5 13 7
      V18
      C13 16 11.5 15 10 15
      H4
      C3.4 15 3 14.6 3 14
      V5
      Z

      M21 5
      C21 4.4 20.6 4 20 4
      H14
      C12.5 4 11 5 11 7
      V18
      C11 16 12.5 15 14 15
      H20
      C20.6 15 21 14.6 21 14
      V5
      Z
    " />
  </svg>
  `,

  film: `
      <svg viewBox="0 0 24 24" class="id-icon">
    <!-- Bottom slate -->
    <rect x="3" y="9" width="18" height="11" rx="2"/>

    <!-- Top clapper -->
    <path d="
      M4 4
      L20 4
      C20.6 4 21 4.4 21 5
      L21 7
      L4 11
      L3 9
      L3 5
      C3 4.4 3.4 4 4 4
      Z
    "/>

    <!-- Stripes -->
    <rect x="6" y="4.5" width="4" height="2" transform="rotate(-15 8 5.5)"/>
    <rect x="12" y="3.5" width="4" height="2" transform="rotate(-15 14 4.5)"/>
  </svg>
  `,

  barcode: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <rect x="3" y="4" width="2" height="16"/>
      <rect x="6" y="4" width="1" height="16"/>
      <rect x="8" y="4" width="2" height="16"/>
      <rect x="11" y="4" width="1" height="16"/>
      <rect x="13" y="4" width="3" height="16"/>
      <rect x="17" y="4" width="1" height="16"/>
      <rect x="19" y="4" width="2" height="16"/>
    </svg>
  `,
  
  nlw: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <rect x="3" y="4" width="18" height="4" rx="1"/>
      <rect x="3" y="9" width="18" height="11" rx="1"/>
    </svg>
  `,

  cadwCastle: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <path d="M3 3v5h3V3h3v5h3V3h3v5h3V3h3v18H3V3z"/>
    </svg>
  `,

  map: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/>
    </svg>
  `,

  pin: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
    </svg>
  `,

  monument: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <path d="M6 20h12l-3-12H9l-3 12zM9 4h6v2H9z"/>
    </svg>
  `,

  marker: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <circle cx="12" cy="8" r="4"/>
      <path d="M12 12l5 8H7z"/>
    </svg>
  `,

  link: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1"/>
      <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1"/>
    </svg>
  `,

  globe: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <circle cx="12" cy="12" r="9"/>
      <path d="M3 12h18M12 3v18M7 3.5c1.5 2 1.5 15 0 17M17 3.5c-1.5 2-1.5 15 0 17"/>
    </svg>
  `,

  building: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <path d="M3 20h18v-2H3v2zM4 9h16v8H4V9zM6 4h12l1 3H5z"/>
    </svg>
  `,

  cabinet: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <rect x="4" y="3" width="16" height="8" rx="1"/>
      <rect x="4" y="13" width="16" height="8" rx="1"/>
      <rect x="8" y="6" width="8" height="2"/>
      <rect x="8" y="16" width="8" height="2"/>
    </svg>
  `,

  cube: `
    <svg viewBox="0 0 24 24" class="id-icon">
      <path d="M3 7l9-5 9 5v10l-9 5-9-5z"/>
      <path d="M12 2v20"/>
    </svg>
  `
};

// Map PID to icon
function getIdentifierIcon(pid) {
  switch (pid) {
    case "P12": case "P5": case "P6": case "P90":
      return ICONS.nlw;
    case "P102":
  return ICONS.book;

case "P108":
  return ICONS.film;

case "P62":
  return ICONS.barcode;
  
    case "P68":
      return ICONS.cadwCastle;
      
    case "P69":
      return ICONS.map;
    case "P83":
      return ICONS.pin;
    case "P84":
      return ICONS.monument;
    case "P91":
      return ICONS.marker;
    case "P9":
      return ICONS.link;
    case "P10":
      return ICONS.globe;
    case "P11":
      return ICONS.building;
    case "P97":
      return ICONS.cabinet;
    default:
      return "";
  }
}

// Make available globally
window.ID_ICONS = { ICONS, getIdentifierIcon };
