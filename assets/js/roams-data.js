/**
 * roams-data.js
 * ------------------------------------------------------------------
 * Single source of truth for the site's three real roam packages —
 * see root README.md / Proceeding.txt Step 4. Previously this same
 * data (title, route, dates, image, description) was hand-copied in
 * two places: the "Featured Roams" cards on roams.html, and the
 * (removed) event-detail page. Everything now reads from this one file.
 *
 * Loaded as a plain global (no build step / bundler in this project),
 * so just include this script before any script that uses ROAMS_DATA:
 *   <script src="/assets/js/roams-data.js"></script>
 *
 * Each entry's `slug` matches its filename under roams/roam-list/.
 * ------------------------------------------------------------------
 */
var ROAMS_DATA = [
  {
    slug: "arabisya-indino",
    title: "Arabisya Indino",
    route: "Mumbai → Gujarat → Jaipur → Delhi",
    dates: "14–22 October 2026 · 9 days",
    image: "https://images.unsplash.com/photo-1524229321985-1e1989075d9b?fm=jpg&q=80&w=1600&auto=format&fit=crop",
    description: "Land across the Arabian Sea — nine days through Western and Northern India's cultural spectrum, timed to land inside Navratri.",
    fullPage: "roam-list/roam.html?slug=arabisya-indino"
  },
  {
    slug: "coromandel-crest",
    title: "Coromandel Crest",
    route: "Chennai → Thanjavur → Pondicherry",
    dates: "11–19 January 2027 · 9 days",
    image: "https://images.unsplash.com/photo-1603766806347-54cdf3745953?fm=jpg&q=80&w=1600&auto=format&fit=crop",
    description: "Melodies of harvest, echoes of the Cholas — heritage and slow discovery along the Coromandel Coast, timed to Pongal.",
    fullPage: "roam-list/roam.html?slug=coromandel-crest"
  },
  {
    slug: "goanique-ganeshika",
    title: "Goanique Ganeshika",
    route: "Mumbai → Goa → Pune",
    dates: "19–27 September 2026 · 9 days",
    image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?fm=jpg&q=80&w=1600&auto=format&fit=crop",
    description: "Work, wander, and celebrate the Indian spirit — Mumbai's energy, Goa's coastline, and Pune in full festival flow.",
    fullPage: "roam-list/roam.html?slug=goanique-ganeshika"
  }
];

// Convenience lookup by slug.
var ROAMS_BY_SLUG = {};
for (var i = 0; i < ROAMS_DATA.length; i++) {
  ROAMS_BY_SLUG[ROAMS_DATA[i].slug] = ROAMS_DATA[i];
}
