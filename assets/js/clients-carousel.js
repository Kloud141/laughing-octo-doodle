/* Embark Pedia :: "Our Clients" rotating logo strip (vanilla JS, no dependencies).
   Reads the logo pool from the hidden <ul data-src/data-alt> list, renders
   VISIBLE slots, then every INTERVAL ms fades one slot out and swaps in
   the next logo in the pool, cycling through all of them forever. */
(function () {
  "use strict";
  var root = document.querySelector("[data-clients-carousel]");
  if (!root) return;

  var dataItems = Array.prototype.slice.call(root.querySelectorAll(".clients-carousel__data li"));
  var track = root.querySelector("[data-clients-track]");
  if (!dataItems.length || !track) return;

  var VISIBLE = 4;
  var INTERVAL = 3000;
  var FADE = 500;

  var logos = dataItems.map(function (li) {
    return {
      src: li.getAttribute("data-src"),
      alt: li.getAttribute("data-alt") || ""
    };
  });

  var visibleCount = Math.min(VISIBLE, logos.length);
  var slots = [];

  for (var i = 0; i < visibleCount; i++) {
    var slot = document.createElement("div");
    slot.className = "clients-carousel__slot";

    var img = document.createElement("img");
    img.loading = "lazy";
    img.src = logos[i].src;
    img.alt = logos[i].alt;
    img.onerror = function () { this.style.visibility = "hidden"; };

    slot.appendChild(img);
    track.appendChild(slot);
    slots.push(slot);
  }

  // Nothing left in the pool to rotate in.
  if (logos.length <= visibleCount) return;

  var slotPointer = 0;
  var nextLogo = visibleCount % logos.length;

  function tick() {
    var slot = slots[slotPointer % slots.length];
    var img = slot.querySelector("img");
    if (!img) return;

    slot.classList.add("is-fading");
    setTimeout(function () {
      var data = logos[nextLogo % logos.length];
      img.src = data.src;
      img.alt = data.alt;
      img.style.visibility = "";
      slot.classList.remove("is-fading");
    }, FADE);

    slotPointer++;
    nextLogo++;
  }

  setInterval(tick, INTERVAL);
})();
