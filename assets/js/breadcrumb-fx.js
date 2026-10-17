/* ============================================================
   Embark Pedia :: breadcrumb banner scroll effect
   ------------------------------------------------------------
   Drives the blur-out on `.breadcrumb-style-one` (the photo banner
   at the top of About, Contact, Destinations and Roams).

   It does one thing: writes a 0 -> 1 progress value to the CSS
   custom property `--bc-p` on the banner as the page scrolls.
   All of the visuals (photo blur + parallax, title / breadcrumb
   blur + lift + fade, corner brackets fading) live in
   assets/css/style.css and read that variable.

     0 = page at the very top, banner fully sharp
     1 = banner fully blurred out (after scrolling ~95% of its height)

   Without JS, or with "reduce motion" turned on, --bc-p stays 0
   and the banner is simply static.
   ============================================================ */
(function () {
  "use strict";

  var banner = document.querySelector(".breadcrumb-style-one");
  if (!banner) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var FADE_DISTANCE = 0.95;  // fraction of the banner height scrolled before it is fully blurred
  var ticking = false;
  var last = -1;
  var active = false;

  function update() {
    ticking = false;
    // Scroll distance from the top of the page, so the effect starts the
    // moment the visitor scrolls (the top bar above the banner is ignored).
    var scrolled = window.pageYOffset || document.documentElement.scrollTop || 0;
    var p = scrolled / (banner.offsetHeight * FADE_DISTANCE);
    p = Math.min(1, Math.max(0, p));
    p = Math.round(p * 1000) / 1000;
    if (p !== last) {
      last = p;
      banner.style.setProperty("--bc-p", p);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  function start() {
    if (active) return;
    active = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pageshow", onScroll);   // back/forward cache restores
    update();
  }

  function stop() {
    if (!active) return;
    active = false;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    window.removeEventListener("pageshow", onScroll);
    last = -1;
    banner.style.removeProperty("--bc-p");
  }

  function sync() { reduce.matches ? stop() : start(); }

  if (reduce.addEventListener) reduce.addEventListener("change", sync);
  else if (reduce.addListener) reduce.addListener(sync);   // older Safari
  sync();
})();
