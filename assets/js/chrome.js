/* Shared header/footer interactions. Loaded with defer after document parsing. */

/**
 * window.epConfirm(message, title) -> Promise<boolean>
 * ------------------------------------------------------------------
 * A small Accept/Deny confirmation dialog (brand-styled, see the
 * .ep-confirm-* rules in assets/css/header-footer.css) used to turn a
 * passive disclaimer into an explicit choice at submit time — e.g. the
 * footer newsletter form below. Resolves true on Accept, false on
 * Deny or Escape/backdrop-click. One overlay is created lazily and
 * reused for the lifetime of the page.
 */
window.epConfirm = function (message, title) {
  return new Promise(function (resolve) {
    var overlay = document.getElementById("ep-confirm-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "ep-confirm-overlay";
      overlay.id = "ep-confirm-overlay";
      overlay.hidden = true;
      overlay.innerHTML =
        '<div class="ep-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="ep-confirm-title" aria-describedby="ep-confirm-msg">' +
        '<h3 id="ep-confirm-title"></h3>' +
        '<p id="ep-confirm-msg"></p>' +
        '<div class="ep-confirm-box__actions">' +
        '<button type="button" class="ep-confirm-deny">Deny</button>' +
        '<button type="button" class="ep-confirm-accept">Accept</button>' +
        "</div></div>";
      document.body.appendChild(overlay);
    }

    var titleEl = overlay.querySelector("#ep-confirm-title");
    var msgEl = overlay.querySelector("#ep-confirm-msg");
    var acceptBtn = overlay.querySelector(".ep-confirm-accept");
    var denyBtn = overlay.querySelector(".ep-confirm-deny");
    titleEl.textContent = title || "Please confirm";
    msgEl.textContent = message;
    overlay.hidden = false;

    function cleanup(result) {
      overlay.hidden = true;
      acceptBtn.removeEventListener("click", onAccept);
      denyBtn.removeEventListener("click", onDeny);
      overlay.removeEventListener("keydown", onKeydown);
      overlay.removeEventListener("click", onBackdrop);
      resolve(result);
    }
    function onAccept() { cleanup(true); }
    function onDeny() { cleanup(false); }
    function onKeydown(e) { if (e.key === "Escape") cleanup(false); }
    function onBackdrop(e) { if (e.target === overlay) cleanup(false); }

    acceptBtn.addEventListener("click", onAccept);
    denyBtn.addEventListener("click", onDeny);
    overlay.addEventListener("keydown", onKeydown);
    overlay.addEventListener("click", onBackdrop);
    acceptBtn.focus();
  });
};

(function () {
  "use strict";
  var header = document.getElementById("ep-header");
  if (!header || header.getAttribute("data-ep-bound") === "true") return;
  header.setAttribute("data-ep-bound", "true");

  /* ---- solid background once the page scrolls ---- */
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- highlight the current page in the nav ---- */
  var segments = window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  var leaf = (segments[segments.length - 1] || "index.html").toLowerCase();
  var parent = (segments[segments.length - 2] || "").toLowerCase();
  var current = "home";
  if (parent === "about" || leaf === "about.html") current = "about";
  else if (parent === "contact" || leaf === "contact.html") current = "contact";
  else if (parent === "roams" || parent === "roam-list" || leaf === "roams.html") current = "trips";
  else if (parent === "destinations" || leaf === "destination-list.html" || leaf === "destination-tours.html") current = "destination";
  var pageLinks = header.querySelectorAll("[data-page]");
  for (var i = 0; i < pageLinks.length; i++) {
    if (pageLinks[i].getAttribute("data-page") === current) {
      pageLinks[i].classList.add("is-active");
    }
  }

  /* ---- desktop dropdowns: click/keyboard toggle (CSS also opens on hover) ---- */
  var toggles = header.querySelectorAll(".ep-dropdown-toggle");
  function closeAllDropdowns() {
    for (var t = 0; t < toggles.length; t++) {
      toggles[t].setAttribute("aria-expanded", "false");
      toggles[t].closest(".ep-has-dropdown").classList.remove("is-open");
    }
  }
  for (var d = 0; d < toggles.length; d++) {
    (function (toggle) {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        var item = toggle.closest(".ep-has-dropdown");
        var wasOpen = item.classList.contains("is-open");
        closeAllDropdowns();
        if (!wasOpen) {
          item.classList.add("is-open");
          toggle.setAttribute("aria-expanded", "true");
        }
      });
    })(toggles[d]);
  }
  document.addEventListener("click", closeAllDropdowns);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllDropdowns();
  });

  /* ---- mobile hamburger / drawer ---- */
  var hamburger = document.getElementById("ep-hamburger");
  var drawer = document.getElementById("ep-drawer");
  var backdrop = document.getElementById("ep-drawer-backdrop");
  var closeBtn = document.getElementById("ep-drawer-close");
  var lastFocused = null;

  function openDrawer() {
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
    hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }
  if (hamburger) {
    hamburger.addEventListener("click", function () {
      if (drawer.classList.contains("is-open")) closeDrawer();
      else openDrawer();
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (backdrop) backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  });

  /* simple focus trap while the drawer is open */
  drawer.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
    var focusable = drawer.querySelectorAll('a[href], button:not([disabled])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---- mobile accordions (Roams / Destination) ---- */
  var accordionButtons = header.querySelectorAll(".ep-drawer__accordion > button");
  for (var a = 0; a < accordionButtons.length; a++) {
    accordionButtons[a].addEventListener("click", function () {
      var open = this.getAttribute("aria-expanded") === "true";
      this.setAttribute("aria-expanded", String(!open));
      this.parentElement.classList.toggle("is-open", !open);
    });
  }

  /* ---- Roams dropdown: sync with whatever's published right now --------
     The three sample ROAMS above are hand-pasted into every page (no
     templating layer — see README_UI.md). This replaces them, on every
     page, with whatever organizer-roams.php currently has published —
     so pausing/publishing a ROAM in /organizer/ is reflected here without
     editing any page. If public-roams.php can't be reached (e.g. this
     file opened directly from disk, no PHP behind it), the fetch fails
     silently and the pasted items stay exactly as they are now. */
  function epHeaderBasePath() {
    var depth = (window.location.pathname.match(/\//g) || []).length - 1;
    return "../".repeat(depth);
  }
  function epEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var roamDropdowns = header.querySelectorAll(".ep-dropdown, .ep-drawer__accordion > ul");
  if (roamDropdowns.length) {
    var base = epHeaderBasePath();
    fetch(base + "assets/js/public-roams.php", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.roams)) return;
        for (var r = 0; r < roamDropdowns.length; r++) {
          var ul = roamDropdowns[r];
          var allLink = ul.querySelector(".ep-dropdown__all");
          if (!allLink) continue; // not the Roams dropdown — leave it alone
          var allLi = allLink.closest("li");
          var dividerLi = allLi.previousElementSibling;
          var isMobile = ul.parentElement && ul.parentElement.classList.contains("ep-drawer__accordion");
          var dataPageAttr = isMobile ? ' data-page="trips"' : "";
          var itemsHtml = data.roams.map(function (roam) {
            var href = base + "roams/roam-list/roam.html?slug=" + encodeURIComponent(roam.slug);
            return "<li><a" + dataPageAttr + ' href="' + href + '">' + epEsc(roam.title) + "</a></li>";
          }).join("");
          ul.innerHTML = itemsHtml + (dividerLi ? dividerLi.outerHTML : "") + allLi.outerHTML;
        }
      })
      .catch(function () { /* static preview or network error — keep the pasted items */ });
  }

  /* ---- Signed-in header state ------------------------------------------
     The "Login / Sign Up" pill is hand-pasted into every public page
     (same gap as the Roams dropdown above), so — same fix — this swaps
     it in place via assets/js/me.php rather than editing every page.
     Matches both the desktop pill (a[href$="auth/login.html"]) and the
     mobile drawer's copy of the same link; `$=` tolerates the "../"
     prefix varying by page depth. A vendor/admin/partner browsing the
     public site (same PHP session covers /organizer/ too) is sent to
     their own dashboard instead of a customer profile page they can't
     use. If me.php can't be reached (static preview / no PHP behind
     this), the fetch fails silently and the pasted "Login / Sign Up"
     link stays exactly as it is now. */
  var loginLinks = header.querySelectorAll('a[href$="auth/login.html"]');
  if (loginLinks.length) {
    var meBase = epHeaderBasePath();
    fetch(meBase + "assets/js/me.php", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.signed_in) return;
        var user = data.user;
        var dest = meBase + "account/profile.html";
        if (user.account_type === "vendor") dest = meBase + "organizer/authoring.html";
        else if (user.account_type === "admin") dest = meBase + "organizer/approvals.html";
        else if (user.account_type === "partner") dest = meBase + "organizer/partner.html";

        for (var i = 0; i < loginLinks.length; i++) {
          var link = loginLinks[i];
          link.textContent = "My Account";
          link.setAttribute("href", dest);
          link.title = "Signed in as " + epEsc(user.first_name || user.email);

          var logout = document.createElement("a");
          logout.href = "#";
          logout.className = link.className;
          logout.textContent = "Log Out";
          logout.addEventListener("click", function (e) {
            e.preventDefault();
            fetch(meBase + "assets/js/logout.php", { method: "POST", credentials: "same-origin" })
              .catch(function () {})
              .finally(function () { window.location.reload(); });
          });
          var li = link.closest("li");
          if (li && li.parentNode) {
            var logoutLi = document.createElement("li");
            if (li.className) logoutLi.className = li.className;
            logoutLi.appendChild(logout);
            li.parentNode.insertBefore(logoutLi, li.nextSibling);
          }
        }
      })
      .catch(function () { /* static preview or network error — keep "Login / Sign Up" */ });
  }
})();

(function () {
  "use strict";
  var footer = document.getElementById("ep-footer");
  if (!footer || footer.getAttribute("data-ep-bound") === "true") return;
  footer.setAttribute("data-ep-bound", "true");

  var yearEl = document.getElementById("ep-footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var form = document.getElementById("ep-newsletter-form");
  var success = document.getElementById("ep-newsletter-success");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type="email"]');
      var submitBtn = form.querySelector('button[type="submit"]');

      // The passive disclaimer paragraph that used to sit below the form
      // has been removed from the page. Consent is now captured only
      // through this explicit Accept/Deny prompt at submit time — nothing
      // is sent to subscribe.php (and no "Accept" is recorded) unless the
      // visitor actively accepts here.
      var disclaimer = "By subscribing, you agree to receive email updates. See our Privacy Policy; you can unsubscribe at any time.";

      window.epConfirm(disclaimer, "Confirm newsletter subscription").then(function (accepted) {
        if (!accepted) {
          if (success) {
            success.hidden = false;
            success.textContent = "No problem — you were not subscribed.";
            success.setAttribute("role", "status");
          }
          return;
        }
        submitNewsletter();
      });
    });
  }

  function submitNewsletter() {
    var email = form.querySelector('input[type="email"]');
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    // Resolve subscribe.php relative to the current page's depth —
    // the footer (and this form) is pasted into every page, at
    // varying folder depths, so a hardcoded "../assets/..." would
    // break on root-level pages. See README_UI.md for the longer-
    // term fix (a single shared footer include).
    //
    // Fixed: the previous formula (depth > 1 ? "../".repeat(depth-1) : "./")
    // under-counted by one "../" at every depth except root — e.g. it
    // resolved to "./assets/..." (wrong; needs "../") one level down in
    // /contact/, and to only one "../" (needs two) in /roams/roam-list/.
    // Caught while building the organizer-portal public sync, which
    // reuses this same depth math (see public-catalogue-sync.js).
    var depth = (window.location.pathname.match(/\//g) || []).length - 1;
    var base = "../".repeat(depth);
    var endpoint = base + "assets/js/subscribe.php";

    // The visitor's Accept click (above) is the consent event itself, so
    // it's recorded in the backend alongside the email — not just shown
    // as UI text. subscribe.php persists this in the `consent` column.
    var formData = new FormData(form);
    formData.set("consent", "Accept");

    fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "same-origin"
    })
      .then(function (res) { return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; }); })
      .then(function (data) {
        if (success) {
          success.hidden = false;
          success.textContent = data.ok
            ? (data.message || "Thank you for subscribing!")
            : (data.error || "Could not subscribe right now. Please try again later.");
          success.setAttribute("role", "status");
        }
        if (data.ok && email) email.value = "";
        if (email) email.setAttribute("aria-describedby", "ep-newsletter-success");
      })
      .catch(function () {
        if (success) {
          success.hidden = false;
          success.textContent = "Network error — please try again later.";
        }
      })
      .finally(function () { if (submitBtn) submitBtn.disabled = false; });
  }

  var backToTop = document.getElementById("ep-back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.hidden = window.scrollY < 400;
    }, { passive: true });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
