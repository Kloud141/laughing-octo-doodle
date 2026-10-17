/**
 * roam-render.js
 * ------------------------------------------------------------------
 * Renders roams/roam-list/roam.html (the single template that replaced
 * the old arabisya-indino.html / coromandel-crest.html /
 * goanique-ganeshika.html trio) from:
 *   - ROAMS_DATA / ROAMS_BY_SLUG   (assets/js/roams-data.js)      — card
 *     summary + the list of valid slugs
 *   - ROAM_DETAILS                 (assets/js/roam-details-data.js) —
 *     full page content for that slug
 *
 * Both are plain globals loaded as <script> tags before this file, in
 * place of a real API call. Swapping them for a fetch() to a backend
 * (see database/roam-details-fields.txt) is the only change needed to
 * make this a fully server-backed page — none of the rendering code
 * below needs to know the difference.
 *
 * Any string here that may contain inline HTML (an <a>, <strong>, etc.,
 * already present in the source data) is written with innerHTML; this
 * data comes only from our own JS files, never from the visitor or the
 * URL, so that's safe. Everything else uses textContent.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  function qs(id) { return document.getElementById(id); }

  function getSlug() {
    var params = new URLSearchParams(window.location.search);
    return (params.get("slug") || "").trim();
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function renderHero(data) {
    var section = el("section", "hero");
    var img = el("img", "hero__img");
    img.src = data.image;
    img.alt = data.imageAlt || "";
    section.appendChild(img);
    section.appendChild(el("div", "hero__scrim"));
    var content = el("div", "hero__content");
    content.appendChild(el("span", "hero__by", data.by));
    content.appendChild(el("h1", "hero__title", data.title));
    content.appendChild(el("p", "hero__sub", data.subtitle));
    var meta = el("div", "hero__meta");
    (data.meta || []).forEach(function (chip) {
      meta.appendChild(el("span", "hero__chip", chip));
    });
    content.appendChild(meta);
    section.appendChild(content);
    return section;
  }

  function renderAbout(data) {
    var section = el("section", "section");
    var wrap = el("div", "wrap about");
    var left = el("div");
    var head = el("div", "section-head");
    head.style.marginBottom = "1.25rem";
    head.appendChild(el("h2", null, data.heading));
    left.appendChild(head);
    (data.paragraphs || []).forEach(function (p) {
      left.appendChild(el("p", null, p));
    });
    if (data.quote) left.appendChild(el("blockquote", null, data.quote));
    if (data.objectives && data.objectives.length) {
      var ul = el("ul", "objectives");
      data.objectives.forEach(function (li) { ul.appendChild(el("li", null, li)); });
      left.appendChild(ul);
    }
    wrap.appendChild(left);
    var imgWrap = el("div", "about__img-wrap");
    var img = el("img", "about__img");
    img.src = data.image;
    img.alt = data.imageAlt || "";
    imgWrap.appendChild(img);
    if (data.badge) imgWrap.appendChild(el("div", "about__badge", data.badge));
    wrap.appendChild(imgWrap);
    section.appendChild(wrap);
    return section;
  }

  function renderGallery(data) {
    var section = el("section", "section section--tight");
    var wrap = el("div", "wrap");
    var head = el("div", "section-head");
    head.appendChild(el("h2", null, data.heading));
    if (data.subtitle) head.appendChild(el("p", null, data.subtitle));
    wrap.appendChild(head);
    var gallery = el("div", "gallery");
    gallery.style.setProperty("--cols", String((data.cards || []).length || 3));
    (data.cards || []).forEach(function (c) {
      var card = el("div", "card");
      var img = el("img", "card__img");
      img.src = c.image;
      img.alt = c.imageAlt || "";
      img.loading = "lazy";
      card.appendChild(img);
      card.appendChild(el("div", "card__scrim"));
      var text = el("div", "card__text");
      text.appendChild(el("h3", null, c.title));
      text.appendChild(el("p", null, c.text));
      card.appendChild(text);
      gallery.appendChild(card);
    });
    wrap.appendChild(gallery);
    section.appendChild(wrap);
    return section;
  }

  function renderItinerary(data) {
    var section = el("section", "section");
    var wrap = el("div", "wrap");
    var head = el("div", "section-head");
    head.appendChild(el("h2", null, data.heading));
    if (data.subtitle) head.appendChild(el("p", null, data.subtitle));
    wrap.appendChild(head);
    var timeline = el("div", "timeline");
    (data.items || []).forEach(function (item) {
      if (item.type === "note") {
        timeline.appendChild(el("div", "day-note", item.text));
        return;
      }
      var day = el("div", "day" + (item.festive ? " day--fest" : ""));
      var num = el("div", "day__num");
      num.appendChild(el("span", null, "Day"));
      num.appendChild(document.createTextNode(item.dayNumber));
      day.appendChild(num);
      var body = el("div", "day__body");
      body.appendChild(el("h3", "day__title", item.title));
      var ul = el("ul", "day__list");
      (item.activities || []).forEach(function (a) { ul.appendChild(el("li", null, a)); });
      body.appendChild(ul);
      day.appendChild(body);
      timeline.appendChild(day);
    });
    wrap.appendChild(timeline);
    section.appendChild(wrap);
    return section;
  }

  function renderInclusions(data) {
    var section = el("section", "section section--tight");
    var wrap = el("div", "wrap");
    var head = el("div", "section-head");
    head.appendChild(el("h2", null, data.heading));
    wrap.appendChild(head);
    var inex = el("div", "inex");

    var inCol = el("div", "inex__col inex__col--in");
    inCol.appendChild(el("h3", null, data.includedTitle));
    var inUl = el("ul");
    (data.included || []).forEach(function (li) { inUl.appendChild(el("li", null, li)); });
    inCol.appendChild(inUl);
    if (data.includedNote) inCol.appendChild(el("p", "inex__note", data.includedNote));
    inex.appendChild(inCol);

    var outCol = el("div", "inex__col inex__col--out");
    outCol.appendChild(el("h3", null, data.excludedTitle));
    var outUl = el("ul");
    (data.excluded || []).forEach(function (li) { outUl.appendChild(el("li", null, li)); });
    outCol.appendChild(outUl);
    if (data.excludedNote) outCol.appendChild(el("p", "inex__note", data.excludedNote));
    inex.appendChild(outCol);

    wrap.appendChild(inex);
    section.appendChild(wrap);
    return section;
  }

  function renderPacking(data) {
    var section = el("section", "section");
    var wrap = el("div", "wrap");
    var head = el("div", "section-head");
    head.appendChild(el("h2", null, data.heading));
    if (data.subtitle) head.appendChild(el("p", null, data.subtitle));
    wrap.appendChild(head);
    var packing = el("div", "packing");
    (data.categories || []).forEach(function (cat) {
      var card = el("div", "pack-card");
      card.appendChild(el("h4", null, cat.title));
      var ul = el("ul");
      (cat.items || []).forEach(function (li) { ul.appendChild(el("li", null, li)); });
      card.appendChild(ul);
      packing.appendChild(card);
    });
    wrap.appendChild(packing);
    section.appendChild(wrap);
    return section;
  }

  function renderEligibility(data) {
    var section = el("section", "section section--tight");
    var wrap = el("div", "wrap");
    var elig = el("div", "elig");
    var left = el("div");
    left.appendChild(el("h3", null, data.heading));
    var ul = el("ul");
    (data.criteria || []).forEach(function (li) { ul.appendChild(el("li", null, li)); });
    left.appendChild(ul);
    if (data.note) left.appendChild(el("p", "elig__small", data.note));
    elig.appendChild(left);
    var priceTag = el("div", "price-tag");
    priceTag.appendChild(el("div", "price-tag__label", data.priceLabel));
    priceTag.appendChild(el("div", "price-tag__num", data.price));
    priceTag.appendChild(el("div", "price-tag__note", data.priceNote));
    elig.appendChild(priceTag);
    wrap.appendChild(elig);
    section.appendChild(wrap);
    return section;
  }

  function renderFaq(data) {
    var section = el("section", "section");
    var wrap = el("div", "wrap");
    var head = el("div", "section-head");
    head.appendChild(el("h2", null, data.heading));
    wrap.appendChild(head);
    var list = el("div", "faq-list");
    (data.items || []).forEach(function (item) {
      var details = el("details", "faq-item");
      details.appendChild(el("summary", null, item.question));
      details.appendChild(el("p", null, item.answer));
      list.appendChild(details);
    });
    wrap.appendChild(list);
    section.appendChild(wrap);
    return section;
  }

  function renderFooter(data) {
    var img = qs("roam-footer-img");
    img.src = data.image;
    img.alt = data.imageAlt || "";
    qs("roam-footer-thanks").textContent = data.thanksText;
    qs("roam-footer-dates").textContent = data.dates;
    var logo = qs("roam-footer-logo");
    logo.src = data.logo;
    logo.alt = data.logoAlt || "";
    qs("roam-footer-presented").textContent = data.presentedBy;
    qs("roam-footer").hidden = false;
  }

  function showNotFound() {
    qs("roam-loading").hidden = true;
    qs("roam-not-found").hidden = false;
  }

  function render(slug) {
    var details = (typeof ROAM_DETAILS !== "undefined") ? ROAM_DETAILS[slug] : null;
    if (!details) { showNotFound(); return; }

    document.title = "EMBARK PEDIA | " + (details.pageTitle || details.hero.title);
    var titleEl = qs("ep-page-title");
    if (titleEl) titleEl.textContent = document.title;

    var root = qs("roam-root");
    root.innerHTML = ""; // drop the loading/not-found placeholders
    root.appendChild(renderHero(details.hero));
    root.appendChild(renderAbout(details.about));
    root.appendChild(renderGallery(details.gallery));
    root.appendChild(renderItinerary(details.itinerary));
    root.appendChild(renderInclusions(details.inclusions));
    root.appendChild(renderPacking(details.packing));
    root.appendChild(renderEligibility(details.eligibility));
    root.appendChild(renderFaq(details.faq));
    renderFooter(details.footer);
  }

  var slug = getSlug();
  if (!slug) { showNotFound(); return; }
  render(slug);
})();
