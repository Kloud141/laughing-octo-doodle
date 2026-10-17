(function () {
  "use strict";

  var revealItems = document.querySelectorAll(".wow");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function reveal(item) {
    var delay = item.getAttribute("data-wow-delay");
    if (delay && !prefersReducedMotion) item.style.animationDelay = delay;
    item.classList.add("animated");
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(reveal);
  } else {
    var observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        currentObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  }

  var preloader = document.getElementById("preloader");
  if (preloader) {
    var hidePreloader = function () {
      preloader.classList.add("is-hidden");
      window.setTimeout(function () {
        preloader.remove();
      }, 300);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hidePreloader, { once: true });
    } else {
      hidePreloader();
    }
  }
})();