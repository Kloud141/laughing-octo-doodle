/* Embark Pedia :: dual testimonial carousel (vanilla JS, no dependencies).
   Reads traveller stories from window.TESTIMONIALS (assets/js/testimony.js,
   shared with the flip carousel on about.html), groups them two at a time, and renders dot pagination with
   a gentle auto-rotate that pauses on hover/focus. */
(function () {
  "use strict";
  var root = document.querySelector("[data-ep-td]");
  if (!root) return;

  var items = window.TESTIMONIALS || [];
  var track = root.querySelector("[data-ep-td-track]");
  var dotsWrap = root.querySelector("[data-ep-td-dots]");
  if (!items.length || !track || !dotsWrap) return;

  var PER_PAGE = 2;
  var AUTO_MS = 6000;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  var data = items;

  var pageCount = Math.ceil(data.length / PER_PAGE);
  var pages = [];
  var dots = [];
  var current = 0;
  var timer = null;

  function buildCard(d) {
    var card = document.createElement("div");
    card.className = "ep-td__card";

    var avatar = document.createElement("div");
    avatar.className = "ep-td__avatar";
    if (d.photo) {
      var img = new Image();
      img.alt = "Photo from " + (d.name || "a traveller") + "'s trip";
      img.loading = "lazy";
      img.onerror = function () { img.remove(); avatar.classList.add("no-img"); };
      img.src = d.photo;
      avatar.appendChild(img);
    } else {
      avatar.classList.add("no-img");
    }

    var quote = document.createElement("p");
    quote.className = "ep-td__quote";
    quote.textContent = "\u201C" + (d.quote || "") + "\u201D";

    var name = document.createElement("h5");
    name.className = "ep-td__name";
    name.textContent = d.name;

    var meta = document.createElement("span");
    meta.className = "ep-td__meta";
    meta.textContent = d.place + (d.date ? " \u00B7 " + d.date : "");

    card.appendChild(avatar);
    card.appendChild(quote);
    card.appendChild(name);
    card.appendChild(meta);
    return card;
  }

  for (var p = 0; p < pageCount; p++) {
    var pageEl = document.createElement("div");
    pageEl.className = "ep-td__page" + (p === 0 ? " is-active" : "");
    data.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE).forEach(function (d) {
      pageEl.appendChild(buildCard(d));
    });
    track.appendChild(pageEl);
    pages.push(pageEl);

    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "ep-td__dot" + (p === 0 ? " is-on" : "");
    dot.setAttribute("aria-label", "Show testimonials, page " + (p + 1) + " of " + pageCount);
    (function (idx) {
      dot.addEventListener("click", function () { goTo(idx, true); });
    })(p);
    dotsWrap.appendChild(dot);
    dots.push(dot);
  }

  function goTo(idx, isManual) {
    current = (idx + pageCount) % pageCount;
    pages.forEach(function (pg, i) { pg.classList.toggle("is-active", i === current); });
    dots.forEach(function (d, i) { d.classList.toggle("is-on", i === current); });
    if (isManual) restart();
  }

  function advance() { goTo(current + 1, false); }

  function restart() {
    if (timer) clearInterval(timer);
    if (pageCount > 1) timer = setInterval(advance, AUTO_MS);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  if (pageCount > 1) {
    restart();
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", restart);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", restart);
  }
})();
