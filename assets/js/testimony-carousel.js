/* Embark Pedia :: testimonial flip-carousel (vanilla JS, no dependencies). */
(function () {
  "use strict";
  var root = document.querySelector("[data-ept]");
  if (!root) return;

  var items = window.TESTIMONIALS || [];
  var n = items.length, active = 0, busy = false, timer = null, DUR = 1000;
  if (!n) return;

  var left = document.createElement("div"), right = document.createElement("div");
  left.className = "ept__half ept__half--left"; right.className = "ept__half ept__half--right";
  var sl = document.createElement("div"), sr = document.createElement("div");
  sl.className = sr.className = "ept__spinner";
  left.appendChild(sl); right.appendChild(sr);

  function pad(i) { return (i < 10 ? "0" : "") + i; }
  function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

  items.forEach(function (d, i) {
    var tone = "t" + (i % 4);
    var fl = document.createElement("div");
    fl.className = "ept__face ept__photo " + tone; fl.setAttribute("data-i", i);
    if (d.img) {
      var img = new Image(); img.alt = "Testimonial from " + (d.name || "a traveller"); img.loading = "lazy";
      img.onerror = function () { img.remove(); fl.classList.add("no-img"); };
      img.src = d.img; fl.appendChild(img);
    } else { fl.classList.add("no-img"); }

    var fr = document.createElement("div");
    fr.className = "ept__face ept__info " + tone; fr.setAttribute("data-i", i);
    fr.innerHTML =
      '<p class="ept__eyebrow">Traveller story \u00B7 ' + pad(i + 1) + ' / ' + pad(n) + '</p>' +
      '<h3 class="ept__place">' + esc(d.place) + '</h3><div class="ept__rule"></div>' +
      (d.quote ? '<p class="ept__quote">\u201C' + esc(d.quote) + '\u201D</p>' : '') +
      '<p class="ept__name">' + esc(d.name) + '</p><p class="ept__date">' + esc(d.date) + '</p>' +
      '<div class="ept__heart"><i class="far fa-heart" aria-hidden="true"></i></div>' +
      '<div class="ept__index" aria-hidden="true">' + pad(i + 1) + '</div>';
    sl.appendChild(fl); sr.appendChild(fr);
  });

  var ctrl = document.createElement("div");
  ctrl.className = "ept__control";
  var chev = '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 %s l5 -5 5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  ctrl.innerHTML = '<button type="button" class="ept__arrow" data-dir="-1" aria-label="Previous testimonial">' + chev.replace("%s", "7") + '</button>';
  items.forEach(function (_, i) {
    ctrl.insertAdjacentHTML("beforeend", '<button type="button" class="ept__dot" data-to="' + i + '" aria-label="Show testimonial ' + (i + 1) + '"></button>');
  });
  ctrl.insertAdjacentHTML("beforeend", '<button type="button" class="ept__arrow" data-dir="1" aria-label="Next testimonial"><svg style="transform:rotate(180deg)" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 7 l5 -5 5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>');

  root.appendChild(left); root.appendChild(right); root.appendChild(ctrl);
  var dots = ctrl.querySelectorAll(".ept__dot");
  var faces = root.querySelectorAll(".ept__face");
  function faceSet(i) { return root.querySelectorAll('.ept__face[data-i="' + i + '"]'); }
  function mark(i) { Array.prototype.forEach.call(dots, function (d, k) { d.classList.toggle("is-on", k === i); }); }
  faceSet(0).forEach(function (f) { f.classList.add("is-active"); }); mark(0);

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function go(to) {
    to = ((to % n) + n) % n;
    if (busy || to === active) return;
    var dir = to > active ? 1 : -1, from = active;
    busy = true; mark(to);
    faceSet(to).forEach(function (f) { f.classList.add("is-next"); });
    root.classList.add(dir > 0 ? "is-fwd" : "is-bwd");
    setTimeout(function () {
      faceSet(from).forEach(function (f) { f.classList.remove("is-active"); });
      faceSet(to).forEach(function (f) { f.classList.remove("is-next"); f.classList.add("is-active"); });
      root.classList.add("is-static");
      root.classList.remove("is-fwd", "is-bwd");
      void root.offsetWidth;
      root.classList.remove("is-static");
      active = to; busy = false;
    }, reduce ? 0 : DUR);
  }
  // wrap-around: next from last goes forward visually
  function step(d) {
    var to = active + d;
    if (to >= n) to = 0; else if (to < 0) to = n - 1;
    if (Math.abs(to - active) > 1) { // wrapped: force direction
      var dir = d;
      busy || (function () {
        busy = true; mark(to);
        faceSet(to).forEach(function (f) { f.classList.add("is-next"); });
        root.classList.add(dir > 0 ? "is-fwd" : "is-bwd");
        var from = active;
        setTimeout(function () {
          faceSet(from).forEach(function (f) { f.classList.remove("is-active"); });
          faceSet(to).forEach(function (f) { f.classList.remove("is-next"); f.classList.add("is-active"); });
          root.classList.add("is-static"); root.classList.remove("is-fwd", "is-bwd");
          void root.offsetWidth; root.classList.remove("is-static");
          active = to; busy = false;
        }, reduce ? 0 : DUR);
      })();
    } else go(to);
  }

  ctrl.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dir) step(parseInt(b.dataset.dir, 10)); else go(parseInt(b.dataset.to, 10));
    restart();
  });
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); step(-1); restart(); }
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); step(1); restart(); }
  });
  var y0 = null;
  root.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; }, { passive: true });
  root.addEventListener("touchend", function (e) {
    if (y0 === null) return; var dy = e.changedTouches[0].clientY - y0; y0 = null;
    if (Math.abs(dy) > 40) { step(dy < 0 ? 1 : -1); restart(); }
  });

  function stop() { clearInterval(timer); timer = null; }
  function start() { if (!reduce && !timer) timer = setInterval(function () { step(1); }, 7000); }
  function restart() { stop(); start(); }
  root.addEventListener("mouseenter", stop); root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop); root.addEventListener("focusout", start);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  start();
})();
