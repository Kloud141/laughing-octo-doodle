/**
 * public-catalogue-sync.js
 * ------------------------------------------------------------------
 * The public site's listing/detail pages render from hand-authored
 * JS arrays (DESTINATIONS_DATA in datasets.js, ROAMS_DATA in
 * roams-data.js) — see datasets.js's own header comment. Trips/ROAMS
 * created through /organizer/ live in the database instead, and are
 * invisible to those pages unless merged in first.
 *
 * Both functions below do exactly that: fetch whatever's currently
 * published (never paused/draft/pending/rejected/archived — see
 * public-trips.php / public-roams.php) and merge it into the existing
 * global array *in place*, so every page that already reads
 * DESTINATIONS_DATA / ROAMS_DATA picks the DB rows up for free. If
 * the fetch fails (static preview, no PHP backend, network error),
 * both resolve quietly and the page falls back to exactly what it
 * showed before this file existed.
 *
 * Usage (see destinations/destination-tours.html, tour-render.js, and
 * roams/roams.html for the three call sites): await the relevant
 * function before the page's own render/lookup logic runs. Include
 * this script, with datasets.js / roams-data.js already loaded
 * before it, and before the page's own inline/render script:
 *   <script src=".../datasets.js"></script>
 *   <script src=".../public-catalogue-sync.js"></script>
 *   <script> (async function () { await window.epSyncPublicTrips(); ...
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  function basePath() {
    var depth = (window.location.pathname.match(/\//g) || []).length - 1;
    return "../".repeat(depth);
  }

  window.epSyncPublicTrips = function () {
    if (typeof DESTINATIONS_DATA === "undefined") return Promise.resolve();
    return fetch(basePath() + "assets/js/public-trips.php", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.destinations)) return;
        data.destinations.forEach(function (incoming) {
          var dest = null;
          for (var i = 0; i < DESTINATIONS_DATA.length; i++) {
            if (DESTINATIONS_DATA[i].slug === incoming.slug) { dest = DESTINATIONS_DATA[i]; break; }
          }
          if (!dest) {
            dest = { slug: incoming.slug, name: incoming.name, region: incoming.region, image: incoming.image, blurb: incoming.blurb, tours: [] };
            DESTINATIONS_DATA.push(dest);
            if (typeof DESTINATIONS_BY_SLUG !== "undefined") DESTINATIONS_BY_SLUG[dest.slug] = dest;
          }
          incoming.tours.forEach(function (t) {
            // Replace-by-articleId so an edited-then-republished trip
            // doesn't appear twice if this ever runs more than once.
            var idx = -1;
            for (var j = 0; j < dest.tours.length; j++) {
              if (dest.tours[j].articleId === t.articleId) { idx = j; break; }
            }
            if (idx === -1) dest.tours.push(t); else dest.tours[idx] = t;
          });
        });
      })
      .catch(function () { /* no backend behind this page — leave the static data as-is */ });
  };

  window.epSyncPublicRoams = function () {
    if (typeof ROAMS_DATA === "undefined") return Promise.resolve();
    return fetch(basePath() + "assets/js/public-roams.php", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.roams)) return;
        data.roams.forEach(function (r) {
          var entry = {
            slug: r.slug, title: r.title, route: r.route, dates: r.dates,
            image: r.image, description: r.description,
            fullPage: "roam-list/roam.html?slug=" + encodeURIComponent(r.slug)
          };
          var idx = -1;
          for (var i = 0; i < ROAMS_DATA.length; i++) {
            if (ROAMS_DATA[i].slug === r.slug) { idx = i; break; }
          }
          if (idx === -1) ROAMS_DATA.push(entry); else ROAMS_DATA[idx] = entry;
          if (typeof ROAMS_BY_SLUG !== "undefined") ROAMS_BY_SLUG[r.slug] = entry;
        });
      })
      .catch(function () { /* no backend behind this page — leave the static data as-is */ });
  };
})();
