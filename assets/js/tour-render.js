/**
 * tour-render.js
 * ------------------------------------------------------------------
 * Renders destinations/tour-details.html from DESTINATIONS_DATA
 * (assets/js/datasets.js), picking the tour whose `articleId` matches
 * the page's `?article=` query param (destination-tours.html's "Show
 * Details" links already point here with that param).
 *
 * Also responsible for:
 *   - building the day-by-day plan accordion dynamically from the
 *     tour's `days` count (one accordion item per day — no day-by-day
 *     content is hand-authored in the dataset, it's generated here so
 *     adding/removing days to a tour needs no other change)
 *   - the "Enquire about this trip" form (incl. number of pax and an
 *     optional Partner ID), which posts the tour's voyageId plus the
 *     visitor's details to submit-trip-enquiry.php
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  function qs(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function inr(n) { return "\u20B9" + Number(n).toLocaleString("en-IN"); }

  /* ---------------------------------------------------------------
     Google reCAPTCHA (v2 checkbox), loaded once and rendered
     explicitly into the enquiry form. This is Google's published
     *test* site key (https://developers.google.com/recaptcha/docs/faq)
     — it always validates and is only here so the widget renders
     during development. Swap RECAPTCHA_SITE_KEY for the site's real
     key (from the reCAPTCHA admin console) before going live.
     --------------------------------------------------------------- */
  var RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  function loadRecaptchaApi(onReady) {
    if (window.grecaptcha && window.grecaptcha.render) { onReady(); return; }
    if (window.__epRecaptchaCallbacks) { window.__epRecaptchaCallbacks.push(onReady); return; }
    window.__epRecaptchaCallbacks = [onReady];
    window.__epRecaptchaOnLoad = function () {
      window.__epRecaptchaCallbacks.forEach(function (cb) { cb(); });
    };
    var s = document.createElement("script");
    s.src = "https://www.google.com/recaptcha/api.js?onload=__epRecaptchaOnLoad&render=explicit";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  function getArticleId() {
    return (new URLSearchParams(window.location.search).get("article") || "").trim();
  }

  /* find the tour (and its parent destination) across every
     destination, by articleId */
  function findTour(articleId) {
    for (var i = 0; i < DESTINATIONS_DATA.length; i++) {
      var dest = DESTINATIONS_DATA[i];
      for (var j = 0; j < dest.tours.length; j++) {
        if (dest.tours[j].articleId === articleId) {
          return { tour: dest.tours[j], dest: dest };
        }
      }
    }
    return null;
  }

  /* ---------------------------------------------------------------
     Dynamic day-by-day plan.
     One entry per day of `tour.days`. The middle day of the trip is
     the "special" day (colour 1 ball); every other day uses the
     regular colour (colour 4). A couple of days also carry an extra
     note, shown in colour 3 — same green used for the day-notes on
     the roam pages.
     --------------------------------------------------------------- */
  var ACTIVITIES_BY_CATEGORY = {
    "Cultural": ["Guided heritage walk", "Visit to a local temple or monument", "Traditional food tasting"],
    "Adventure": ["Trekking / outdoor activity session", "Local guide-led excursion", "Evening bonfire & recap"],
    "Couple": ["Leisure time at leisure pace", "Sunset viewpoint visit", "Candlelight dinner (optional add-on)"],
    "Group": ["Group sightseeing tour", "Team photo-stop at a scenic landmark", "Shared group dinner"],
    "Spiritual": ["Temple / shrine darshan", "Evening aarti or prayer gathering", "Quiet reflection time"],
    "Village": ["Local village walk", "Meet-and-greet with local artisans", "Home-style regional lunch"]
  };

  function generatePlan(tour, dest) {
    var days = Math.max(1, tour.days || 1);
    var acts = ACTIVITIES_BY_CATEGORY[tour.category] || ACTIVITIES_BY_CATEGORY["Group"];
    var specialDay = Math.max(1, Math.ceil(days / 2)); // the middle day of the trip
    var plan = [];
    for (var d = 1; d <= days; d++) {
      var entry = { day: d, special: d === specialDay, note: null };
      if (d === 1) {
        entry.title = "Arrival in " + dest.name;
        entry.activities = ["Airport / station pickup", "Check-in & welcome briefing", "Free evening to settle in"];
      } else if (d === days) {
        entry.title = "Departure";
        entry.activities = ["Breakfast at leisure", "Check-out", "Transfer for onward journey"];
      } else {
        entry.title = "Day " + d + " \u2013 " + tour.category + " exploration";
        entry.activities = acts;
      }
      if (entry.special) {
        entry.title += " (Highlight Day)";
        entry.activities = entry.activities.concat(["Signature experience of this trip"]);
      }
      if (d === 2 && days > 2) {
        entry.note = "A free slot is kept on this day for shopping or optional add-on activities.";
      }
      plan.push(entry);
    }
    return plan;
  }

  function renderPlan(plan) {
    var wrap = document.createElement("div");
    wrap.className = "ep-plan";
    plan.forEach(function (entry, idx) {
      var details = document.createElement("details");
      details.className = "ep-plan-day" + (entry.special ? " is-special" : "");
      if (idx === 0) details.open = true;

      var summary = document.createElement("summary");
      summary.className = "ep-plan-day__summary";
      summary.innerHTML =
        '<span class="ep-plan-day__ball"><span>Day</span>' + entry.day + '</span>' +
        '<span class="ep-plan-day__title">' + esc(entry.title) + '</span>' +
        '<span class="ep-plan-day__chevron" aria-hidden="true">' +
          '<svg viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' +
        '</span>';
      details.appendChild(summary);

      var body = document.createElement("div");
      body.className = "ep-plan-day__body";
      var ul = document.createElement("ul");
      ul.className = "ep-plan-day__list";
      entry.activities.forEach(function (a) {
        var li = document.createElement("li");
        li.textContent = a;
        ul.appendChild(li);
      });
      body.appendChild(ul);
      if (entry.note) {
        body.appendChild(document.createElement("hr")).className = "ep-plan-day__hr";
        var note = document.createElement("p");
        note.className = "ep-plan-day__note";
        note.textContent = entry.note;
        body.appendChild(note);
      }
      details.appendChild(body);
      wrap.appendChild(details);
    });
    return wrap;
  }

  /* ---------------------------------------------------------------
     Inclusion / Exclusion / Hotel tabs, shown below the day-by-day
     plan. The dataset doesn't carry per-tour inclusion/exclusion/
     hotel detail, so — in the same spirit as generatePlan() above —
     this derives a sensible, tour-specific set from what we do have
     (nights, category, price, destination).
     --------------------------------------------------------------- */
  function hashSeed(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h += str.charCodeAt(i);
    return h;
  }

  var HOTEL_SUFFIXES = ["Residency", "Grand", "Heritage", "Retreat", "Palms", "Regency", "Courtyard", "Vista"];

  function generateHotels(tour, dest) {
    var nights = Math.max(1, tour.nights || 1);
    var cityShort = dest.name.split(",")[0].trim();
    var stars = tour.price >= 60000 ? "4-star" : "3-star";
    var seed = hashSeed(tour.voyageId || tour.articleId || cityShort);
    var nameA = "Hotel " + cityShort + " " + HOTEL_SUFFIXES[seed % HOTEL_SUFFIXES.length];
    if (nights <= 3) {
      return [{ range: "Night 1 \u2013 Night " + nights, name: nameA, stars: stars }];
    }
    var mid = Math.ceil(nights / 2);
    var nameB = "Hotel " + cityShort + " " + HOTEL_SUFFIXES[(seed + 3) % HOTEL_SUFFIXES.length];
    return [
      { range: "Night 1 \u2013 Night " + mid, name: nameA, stars: stars },
      { range: "Night " + (mid + 1) + " \u2013 Night " + nights, name: nameB, stars: stars }
    ];
  }

  function generatePackage(tour, dest) {
    var stars = tour.price >= 60000 ? "4-star" : "3-star";
    return {
      inclusions: [
        "Accommodation for " + tour.nights + " night" + (tour.nights === 1 ? "" : "s") + " in handpicked " + stars + " properties",
        "Daily breakfast at the hotel",
        "All airport / station transfers as per the itinerary",
        "Sightseeing and activities mentioned in the day-by-day plan",
        "On-ground assistance from the vendor's local trip coordinator",
        "All applicable entry tickets and permits for included sightseeing"
      ],
      exclusions: [
        "International and domestic flights",
        "Visa fees and travel insurance",
        "Meals other than breakfast (unless specified in Inclusions)",
        "Personal expenses \u2014 shopping, laundry, tips, etc.",
        "Anything not specifically mentioned under Inclusions"
      ],
      hotels: generateHotels(tour, dest),
      note: "This trip is operated and fulfilled directly by our vendor partner. Embark Pedia's role is limited to mediating your enquiry and booking with the vendor \u2014 service delivery, on-ground changes, and support during the trip are the vendor's responsibility."
    };
  }

  function renderPackageTabs(pkg) {
    var wrap = document.createElement("div");
    wrap.className = "ep-tour-tabs";

    var nav = document.createElement("div");
    nav.className = "ep-tour-tabs__nav";
    nav.setAttribute("role", "tablist");

    var tabs = [
      { key: "inclusion", label: "Inclusions" },
      { key: "exclusion", label: "Exclusions" },
      { key: "hotel", label: "Hotels" }
    ];

    var panels = {};

    tabs.forEach(function (t, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ep-tour-tabs__btn" + (idx === 0 ? " is-active" : "");
      btn.textContent = t.label;
      btn.setAttribute("role", "tab");
      btn.dataset.tab = t.key;
      btn.addEventListener("click", function () {
        nav.querySelectorAll(".ep-tour-tabs__btn").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        Object.keys(panels).forEach(function (k) { panels[k].hidden = (k !== t.key); });
      });
      nav.appendChild(btn);
    });
    wrap.appendChild(nav);

    var inclusionPanel = document.createElement("div");
    inclusionPanel.className = "ep-tour-tabs__panel ep-tour-tabs__panel--inclusion";
    var inUl = document.createElement("ul");
    inUl.className = "ep-tour-tabs__list";
    pkg.inclusions.forEach(function (li) {
      var item = document.createElement("li");
      item.innerHTML = '<i class="fas fa-check"></i><span></span>';
      item.querySelector("span").textContent = li;
      inUl.appendChild(item);
    });
    inclusionPanel.appendChild(inUl);
    panels.inclusion = inclusionPanel;

    var exclusionPanel = document.createElement("div");
    exclusionPanel.className = "ep-tour-tabs__panel ep-tour-tabs__panel--exclusion";
    exclusionPanel.hidden = true;
    var exUl = document.createElement("ul");
    exUl.className = "ep-tour-tabs__list";
    pkg.exclusions.forEach(function (li) {
      var item = document.createElement("li");
      item.innerHTML = '<i class="fas fa-times"></i><span></span>';
      item.querySelector("span").textContent = li;
      exUl.appendChild(item);
    });
    exclusionPanel.appendChild(exUl);
    panels.exclusion = exclusionPanel;

    var hotelPanel = document.createElement("div");
    hotelPanel.className = "ep-tour-tabs__panel ep-tour-tabs__panel--hotel";
    hotelPanel.hidden = true;
    var hotelWrap = document.createElement("div");
    hotelWrap.className = "ep-tour-tabs__hotel";
    pkg.hotels.forEach(function (h) {
      var row = document.createElement("div");
      row.className = "ep-tour-tabs__hotel-row";
      row.innerHTML =
        '<i class="fas fa-hotel"></i>' +
        '<div><span class="ep-tour-tabs__hotel-range"></span>' +
        '<span class="ep-tour-tabs__hotel-name"></span> ' +
        '<span class="ep-tour-tabs__hotel-stars"></span></div>';
      row.querySelector(".ep-tour-tabs__hotel-range").textContent = h.range + " \u2014 Check-in";
      row.querySelector(".ep-tour-tabs__hotel-name").textContent = h.name;
      row.querySelector(".ep-tour-tabs__hotel-stars").textContent = "(" + h.stars + ")";
      hotelWrap.appendChild(row);
    });
    var hotelNote = document.createElement("p");
    hotelNote.className = "ep-plan-day__note";
    hotelNote.style.marginTop = "14px";
    hotelNote.textContent = "Hotel names are indicative and may be swapped for a similar-category property subject to availability.";
    hotelPanel.appendChild(hotelWrap);
    hotelPanel.appendChild(hotelNote);
    panels.hotel = hotelPanel;

    wrap.appendChild(inclusionPanel);
    wrap.appendChild(exclusionPanel);
    wrap.appendChild(hotelPanel);

    if (pkg.note) {
      var note = document.createElement("p");
      note.className = "ep-tour-tabs__vendor-note";
      note.textContent = pkg.note;
      wrap.appendChild(note);
    }

    return wrap;
  }

  /* ---------------------------------------------------------------
     FAQs + "Download Itinerary" button, shown below the package tabs.
     --------------------------------------------------------------- */
  var FAQ_ICON_COLORS = ["var(--color-primary)", "var(--color-secondary-2)", "var(--color-accent)"];

  function generateFaqs(tour, dest) {
    return [
      { icon: "fa-question-circle", q: "What additional expenses should I budget for?",
        a: "Flights, visa fees, travel insurance, meals outside what's listed under Inclusions, and personal spending such as shopping or tips." },
      { icon: "fa-utensils", q: "Will I get vegetarian food easily?",
        a: "Yes \u2014 vegetarian options are available at all included meals and most local restaurants; mention this preference when you enquire so the vendor can plan for it." },
      { icon: "fa-info-circle", q: "Which flights should I consider booking?",
        a: "We'll share recommended routes and timings once you enquire, so your flights line up with the group's arrival and departure." },
      { icon: "fa-users", q: "Can I travel solo? Who will I share a room with?",
        a: "Solo travellers are welcome. Rooms are shared on a twin-sharing basis with another solo traveller of the same gender, or you can opt for a single-occupancy room at an added cost." },
      { icon: "fa-user-check", q: "Am I eligible for this trip?",
        a: "This trip suits most travellers in reasonable fitness; do check the day-by-day plan for pace, and tell us about any medical needs when enquiring." },
      { icon: "fa-globe", q: "How does the visa for " + dest.name.split(",")[0] + " work?",
        a: "Requirements depend on your passport. Once you enquire, we'll send the specific process, documents, and timelines for " + dest.name.split(",")[0] + "." },
      { icon: "fa-times-circle", q: "What if my visa gets rejected?",
        a: "Refer to our cancellation policy for the applicable terms; we'll also help you explore rescheduling where possible." },
      { icon: "fa-plane-departure", q: "What if I want to extend my trip?",
        a: "Let us know your preferred extra days when enquiring and we'll help arrange extended stays or onward travel, subject to availability." }
    ];
  }

  /* ---------------------------------------------------------------
     "Download Itinerary" PDF, built client-side with jsPDF +
     jspdf-autotable (loaded in tour-details.html). Structure:
       1) Name / Destination / Days / Trip Type   (header band)
       2) Cost / Category / Voyage ID             (summary strip)
       3) Day-by-day plan                         (Day | Heading | Activity)
       4) Inclusions | Exclusions | Hotels         (3-column table)
       5) FAQs                                    (Question | Answer)
     --------------------------------------------------------------- */
  function buildItineraryPdf(tour, dest, pkg, faqs) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      window.print(); // library failed to load (e.g. offline) — fall back
      return;
    }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "pt", format: "a4" });
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();
    var margin = 40;
    var y;

    var COLOR_PRIMARY = [233, 30, 99];   // colour 1
    var COLOR_ACCENT = [74, 44, 58];     // colour 4
    var COLOR_GREEN = [156, 204, 101];   // colour 3
    var COLOR_CREAM = [253, 246, 240];   // colour 2

    function ensureSpace(needed) {
      if (y + needed > pageHeight - 40) { doc.addPage(); y = 50; }
    }

    // 1) Name / Destination / Days / Trip Type
    doc.setFillColor.apply(doc, COLOR_ACCENT);
    doc.rect(0, 0, pageWidth, 92, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(tour.title, margin, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Destination: " + dest.name, margin, 56);
    doc.text("Duration: " + tour.days + " Days / " + tour.nights + " Nights      Trip Type: " + tour.category, margin, 74);

    // 2) Cost / Category / Voyage ID
    y = 112;
    doc.setFillColor.apply(doc, COLOR_CREAM);
    doc.rect(margin, y, pageWidth - margin * 2, 44, "F");
    doc.setTextColor.apply(doc, COLOR_ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Cost: " + inr(tour.price) + " / person", margin + 14, y + 18);
    doc.text("Category: " + dest.region, margin + 14, y + 34);
    doc.text("Voyage ID: " + tour.voyageId, pageWidth / 2 + 14, y + 18);
    y += 44 + 24;

    // 3) Day-by-day plan
    var plan = generatePlan(tour, dest);
    var dayRows = plan.map(function (entry) {
      return ["Day " + entry.day, entry.title.replace(" (Highlight Day)", ""), entry.activities.join("\n")];
    });
    doc.autoTable({
      startY: y,
      head: [["Day", "Day Heading", "Activity"]],
      body: dayRows,
      headStyles: { fillColor: COLOR_PRIMARY, textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6, valign: "top" },
      columnStyles: { 0: { cellWidth: 46 }, 1: { cellWidth: 140 } },
      margin: { left: margin, right: margin }
    });
    y = doc.lastAutoTable.finalY + 26;

    // 4) Inclusions | Exclusions | Hotels
    ensureSpace(60);
    var hotelLines = pkg.hotels.map(function (h) { return h.range + ": " + h.name + " (" + h.stars + ")"; });
    var maxRows = Math.max(pkg.inclusions.length, pkg.exclusions.length, hotelLines.length);
    var packRows = [];
    for (var i = 0; i < maxRows; i++) {
      packRows.push([pkg.inclusions[i] || "", pkg.exclusions[i] || "", hotelLines[i] || ""]);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor.apply(doc, COLOR_ACCENT);
    doc.text("Inclusions, Exclusions & Hotels", margin, y);
    y += 10;
    doc.autoTable({
      startY: y,
      head: [["Inclusions", "Exclusions", "Hotels"]],
      body: packRows,
      headStyles: { fillColor: COLOR_ACCENT, textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
      margin: { left: margin, right: margin }
    });
    y = doc.lastAutoTable.finalY + 14;

    ensureSpace(40);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    var noteLines = doc.splitTextToSize(pkg.note, pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 10 + 20;

    // 5) FAQs
    ensureSpace(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor.apply(doc, COLOR_ACCENT);
    doc.text("FAQs", margin, y);
    y += 10;
    var faqRows = faqs.map(function (f) { return [f.q, f.a]; });
    doc.autoTable({
      startY: y,
      head: [["Question", "Answer"]],
      body: faqRows,
      headStyles: { fillColor: COLOR_GREEN, textColor: COLOR_ACCENT, fontStyle: "bold" },
      styles: { fontSize: 8.5, cellPadding: 6, valign: "top" },
      columnStyles: { 0: { cellWidth: 170, fontStyle: "bold" } },
      margin: { left: margin, right: margin }
    });

    doc.save((tour.voyageId || "itinerary") + "-itinerary.pdf");
  }

  function renderFaqSection(tour, dest, pkg, faqs) {
    var section = document.createElement("div");
    section.className = "ep-tour-faq";

    var head = document.createElement("div");
    head.className = "ep-tour-section__head";
    head.innerHTML = "<h2>FAQs</h2><p>Quick answers to what travellers usually ask before booking.</p>";
    section.appendChild(head);

    var grid = document.createElement("div");
    grid.className = "ep-tour-faq__grid";
    faqs.forEach(function (faq, idx) {
      var details = document.createElement("details");
      details.className = "ep-tour-faq-item";
      var summary = document.createElement("summary");
      summary.innerHTML =
        '<span class="ep-tour-faq-item__icon" style="background:' + FAQ_ICON_COLORS[idx % FAQ_ICON_COLORS.length] + '"><i class="fas ' + faq.icon + '"></i></span>' +
        '<span class="ep-tour-faq-item__q"></span>' +
        '<svg class="ep-tour-faq-item__chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
      summary.querySelector(".ep-tour-faq-item__q").textContent = faq.q;
      details.appendChild(summary);
      var body = document.createElement("div");
      body.className = "ep-tour-faq-item__body";
      body.textContent = faq.a;
      details.appendChild(body);
      grid.appendChild(details);
    });
    section.appendChild(grid);

    var dl = document.createElement("div");
    dl.className = "ep-tour-download";
    dl.innerHTML =
      '<button type="button" class="ep-tour-download__btn" id="ep-download-itinerary">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v9m0 0 3-3m-3 3L5 7M2 12v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        'Download Itinerary' +
      '</button>';
    section.appendChild(dl);

    dl.querySelector("#ep-download-itinerary").addEventListener("click", function () {
      buildItineraryPdf(tour, dest, pkg, faqs);
    });

    return section;
  }

  /* ---------------------------------------------------------------
     "Enquire about this trip" + "At a glance" side-by-side cards.
     The enquiry form (Name, Email, Contact, Dates, Pax, Partner ID,
     T&C checkbox) posts the tour's voyageId plus the collected info to
     submit-trip-enquiry.php, which writes an actual trip_enquiries row
     (organizer-enquiries.php's Trip Approvals-adjacent queue reads from
     that table — this used to go to connect.php/contact_messages
     instead, which never reached that queue at all).
     Partner ID is optional and pre-fills from a `?ref=PARTNERID` query
     param on this page's URL — that's what a partner's own "Send Link"
     adds to the trip link they share (see organizer/organizer.js /
     organizer/organizer.js). The glance card is read-only trip metadata.
     --------------------------------------------------------------- */
  function renderEnquiry(tour, dest) {
    var prefillPartnerId = "";
    var hasPartnerRef = false;
    try {
      var queryParams = new URLSearchParams(window.location.search);
      prefillPartnerId = (queryParams.get("ref") || "").trim().toUpperCase();
      hasPartnerRef = Boolean(prefillPartnerId);
    } catch (e) { /* older browsers without URLSearchParams simply get no prefill */ }

    var card = document.createElement("section");
    card.className = "ep-enquire";
    card.innerHTML =
      '<h2 class="ep-enquire__title">Enquire about this trip</h2>' +
      '<p class="ep-enquire__sub">Tell us a little about yourself and preferred dates. We\u2019ll reply with availability and next steps.</p>' +
      '<form id="ep-enquiry-form" novalidate>' +
        '<label class="ep-enquiry-field">Name<input type="text" name="name" id="eq-name" placeholder="Your full name" required maxlength="120"></label>' +
        '<label class="ep-enquiry-field">Email<input type="email" name="email" id="eq-email" placeholder="you@example.com" required></label>' +
        '<label class="ep-enquiry-field">Contact<input type="tel" name="contact" id="eq-contact" placeholder="Phone / WhatsApp" required maxlength="20"></label>' +
        '<label class="ep-enquiry-field">Preferred check-in date<span class="ep-enquiry-field__hint">(DD-MM-YYYY)</span><input type="date" name="dates" id="eq-dates" required></label>' +
        '<label class="ep-enquiry-field">Number of pax<input type="number" name="pax" id="eq-pax" placeholder="e.g. 2" min="1" max="500" required></label>' +
        '<label class="ep-enquiry-field">Partner ID <span class="ep-enquiry-field__hint">' + (hasPartnerRef ? '(applied from your partner link)' : '(optional \u2014 if someone referred you)') + '</span>' +
          '<input type="text" name="partner_id" id="eq-partner-id" placeholder="e.g. 26EP50TQ7M2X9" maxlength="13" value="' + esc(prefillPartnerId) + '" style="text-transform:uppercase"' + (hasPartnerRef ? ' readonly aria-readonly="true" class="ep-enquiry-field__input--locked"' : '') + '></label>' +
        '<label class="ep-enquiry-tc">' +
          '<input type="checkbox" id="eq-tc" required>' +
          '<span>I agree to the <a href="../support/terms-of-service.html" target="_blank" rel="noopener">Terms of Service</a> and ' +
          '<a href="../support/privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span>' +
        '</label>' +
        '<div class="ep-hp-field" aria-hidden="true"><label for="eq-website">Leave this field empty</label><input id="eq-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
        '<div class="ep-enquiry-recaptcha" id="eq-recaptcha"></div>' +
        '<button type="submit" class="ep-enquiry-submit" id="eq-submit" disabled>Send enquiry</button>' +
        '<div class="ep-form-msg" id="eq-msg" role="status" aria-live="polite"></div>' +
      '</form>';

    var form = card.querySelector("#ep-enquiry-form");
    var msgEl = card.querySelector("#eq-msg");
    var submitBtn = card.querySelector("#eq-submit");
    var tcCheckbox = card.querySelector("#eq-tc");
    var recaptchaWidgetId = null; // set once grecaptcha.render() has run

    // The date input gives us yyyy-mm-dd (ISO), which is exactly what
    // submit-trip-enquiry.php expects for preferred_checkin_date —
    // disallow past dates, nothing else to reformat.
    var datesInput = card.querySelector("#eq-dates");
    datesInput.min = new Date().toISOString().slice(0, 10);

    // Autofill Name/Email/Contact for a signed-in visitor (any account
    // type — a vendor/admin/partner browsing the public site shares the
    // same session). Values are editable afterwards, not locked, same
    // treatment as the Partner ID prefill above (only that one is
    // readonly, because it comes from a ?ref= link the visitor didn't
    // type themselves). Silently does nothing if assets/js/me.php can't
    // be reached (static preview / no PHP behind this) or no one is
    // signed in — see that file's header comment for why it's safe to
    // call from any public page.
    fetch("../assets/js/me.php", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.signed_in) return;
        var user = data.user;
        var nameField = card.querySelector("#eq-name");
        var emailField = card.querySelector("#eq-email");
        var contactField = card.querySelector("#eq-contact");
        if (nameField && !nameField.value) nameField.value = user.full_name || "";
        if (emailField && !emailField.value) emailField.value = user.email || "";
        if (contactField && !contactField.value) contactField.value = user.contact || "";
      })
      .catch(function () { /* not signed in / static preview — leave the form blank */ });

    function showMsg(text, state) {
      msgEl.textContent = text;
      msgEl.setAttribute("data-state", state);
    }

    // The submit button only unlocks once the T&C box is ticked AND
    // the reCAPTCHA has a non-empty response.
    function updateSubmitState() {
      var recaptchaOk = recaptchaWidgetId !== null && !!window.grecaptcha &&
        window.grecaptcha.getResponse(recaptchaWidgetId).length > 0;
      submitBtn.disabled = !(tcCheckbox.checked && recaptchaOk);
    }
    tcCheckbox.addEventListener("change", updateSubmitState);

    function initRecaptcha() {
      loadRecaptchaApi(function () {
        recaptchaWidgetId = window.grecaptcha.render(card.querySelector("#eq-recaptcha"), {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: updateSubmitState,
          "expired-callback": updateSubmitState,
          "error-callback": updateSubmitState
        });
        updateSubmitState();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Belt & suspenders: re-check both conditions even though the
      // button is disabled until they're met (e.g. a stray Enter key).
      if (!tcCheckbox.checked) return;
      var token = recaptchaWidgetId !== null && window.grecaptcha ? window.grecaptcha.getResponse(recaptchaWidgetId) : "";
      if (!token) { updateSubmitState(); return; }

      submitBtn.disabled = true;
      showMsg("Sending your enquiry\u2026", "");

      var fd = new FormData();
      fd.append("voyage_id", tour.voyageId);
      fd.append("name", form.querySelector("#eq-name").value.trim());
      fd.append("email", form.querySelector("#eq-email").value.trim());
      fd.append("contact", form.querySelector("#eq-contact").value.trim());
      fd.append("preferred_checkin_date", datesInput.value);
      fd.append("group_size", form.querySelector("#eq-pax").value.trim());
      fd.append("partner_id", form.querySelector("#eq-partner-id").value.trim().toUpperCase());
      fd.append("message", "Destination: " + dest.name);
      fd.append("website", form.querySelector("#eq-website").value); // honeypot, always blank for a real visitor
      fd.append("g-recaptcha-response", token);

      fetch("../assets/js/submit-trip-enquiry.php", {
        method: "POST",
        body: fd,
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "same-origin"
      })
        .then(function (res) {
          return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; });
        })
        .then(function (data) {
          if (data.ok) {
            showMsg(data.message || "Thank you! We will get back to you soon.", "success");
            form.reset();
          } else {
            showMsg(data.error || "Something went wrong. Please try again.", "error");
          }
        })
        .catch(function () {
          showMsg("Network error \u2014 please check your connection and try again.", "error");
        })
        .finally(function () {
          if (recaptchaWidgetId !== null && window.grecaptcha) window.grecaptcha.reset(recaptchaWidgetId);
          updateSubmitState(); // re-locks the button until the T&C + reCAPTCHA are redone
        });
    });

    var glance = document.createElement("div");
    glance.className = "ep-glance";
    glance.innerHTML =
      '<h2 class="ep-glance__title">At a glance</h2>' +
      '<dl class="ep-glance__list">' +
        '<div class="ep-glance__row"><dt>Destination</dt><dd>' + esc(dest.name) + '</dd></div>' +
        '<div class="ep-glance__row"><dt>Duration</dt><dd>' + tour.days + 'D / ' + tour.nights + 'N</dd></div>' +
        '<div class="ep-glance__row"><dt>Category</dt><dd>' + esc(tour.category) + '</dd></div>' +
        '<div class="ep-glance__row"><dt>Voyage ID</dt><dd>' + esc(tour.voyageId) + '</dd></div>' +
      '</dl>' +
      '<div class="ep-glance__price">' + inr(tour.price) + '</div>' +
      '<p class="ep-glance__price-note">per person &middot; starting from</p>';

    return { card: card, glance: glance, initRecaptcha: initRecaptcha };
  }

  function renderHero(tour, dest) {
    var section = document.createElement("section");
    section.className = "hero";
    section.innerHTML =
      '<img class="hero__img" src="' + esc(tour.image || dest.image) + '" alt="' + esc(tour.title) + '">' +
      '<div class="hero__scrim"></div>' +
      '<div class="hero__content">' +
        '<span class="hero__by">' + esc(dest.name) + ' \u00b7 ' + esc(dest.region) + '</span>' +
        '<h1 class="hero__title">' + esc(tour.title) + '</h1>' +
        '<p class="hero__sub">' + esc(dest.blurb) + '</p>' +
        '<div class="hero__meta">' +
          '<span class="hero__chip"><strong>' + tour.days + ' Day &amp; ' + tour.nights + ' Night</strong></span>' +
          '<span class="hero__chip">' + esc(tour.category) + '</span>' +
          '<span class="hero__chip">From ' + inr(tour.price) + ' / person</span>' +
        '</div>' +
      '</div>';
    return section;
  }

  function showNotFound() {
    qs("tour-loading").hidden = true;
    qs("tour-not-found").hidden = false;
  }

  function render(articleId) {
    var found = findTour(articleId);
    if (!found) { showNotFound(); return; }
    var tour = found.tour, dest = found.dest;

    document.title = "EMBARK PEDIA | " + tour.title;
    var titleEl = qs("ep-page-title");
    if (titleEl) titleEl.textContent = document.title;

    var root = qs("tour-root");
    root.innerHTML = ""; // drop loading / not-found placeholders
    root.appendChild(renderHero(tour, dest));

    var section = document.createElement("section");
    section.className = "ep-dest-section ep-tour-section";
    var container = document.createElement("div");
    container.className = "container";
    var row = document.createElement("div");
    row.className = "row g-4 ep-tour-row";

    var main = document.createElement("div");
    main.className = "col-lg-8";
    var head = document.createElement("div");
    head.className = "ep-tour-section__head";
    head.innerHTML = "<h2>Day-by-day plan</h2><p>A quick look at how the " + tour.days + "-day trip unfolds.</p>";
    main.appendChild(head);
    main.appendChild(renderPlan(generatePlan(tour, dest)));

    var pkg = generatePackage(tour, dest);
    var faqs = generateFaqs(tour, dest);

    var dividerA = document.createElement("hr");
    dividerA.className = "ep-tour-divider";
    main.appendChild(dividerA);
    main.appendChild(renderPackageTabs(pkg));

    var dividerB = document.createElement("hr");
    dividerB.className = "ep-tour-divider";
    main.appendChild(dividerB);
    main.appendChild(renderFaqSection(tour, dest, pkg, faqs));

    var aside = document.createElement("aside");
    aside.className = "col-lg-4";
    var side = document.createElement("div");
    side.className = "ep-tour-side";
    var parts = renderEnquiry(tour, dest);
    side.appendChild(parts.card);
    side.appendChild(parts.glance);
    aside.appendChild(side);

    row.appendChild(main);
    row.appendChild(aside);
    container.appendChild(row);
    section.appendChild(container);
    root.appendChild(section);

    // reCAPTCHA needs its target element already in the document.
    parts.initRecaptcha();
  }

  document.addEventListener("DOMContentLoaded", async function () {
    // Merge in published TRIPS from the organizer portal first, so a link
    // to a DB-authored trip resolves, and a since-paused one correctly
    // falls through to showNotFound() below instead of showing stale data.
    if (window.epSyncPublicTrips) await window.epSyncPublicTrips();
    var articleId = getArticleId();
    if (!articleId) { showNotFound(); return; }
    render(articleId);
  });
})();
