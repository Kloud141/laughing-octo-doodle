/* ============================================================
   Embark Pedia :: Organizer Portal behaviour
   Scoped to /organizer/ only. Three pages share this one file,
   each section below feature-detects its own page by element id
   so there's one script to maintain instead of three near-copies.
   All data calls go through the organizer-*.php endpoints in
   assets/js/ via fetch(); see database/README.md for the contract.
   ============================================================ */
(function () {
  "use strict";

  var API = "../assets/js/";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n, cur) {
    cur = cur || "INR";
    var v = Number(n || 0);
    return (cur === "INR" ? "₹" : cur + " ") + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  function badge(status) {
    return '<span class="ep-org-badge ep-org-badge--' + esc(status) + '">' + esc(String(status).replace(/_/g, " ")) + "</span>";
  }
  function postJSON(file, body) {
    return fetch(API + file, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {})
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; })
        .then(function (data) { return { status: res.status, data: data }; });
    });
  }
  function postForm(file, formEl) {
    return fetch(API + file, { method: "POST", body: new FormData(formEl), credentials: "same-origin" })
      .then(function (res) { return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; }); });
  }
  function showMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = "ep-form-msg is-visible " + (type === "success" ? "is-success" : "is-error");
  }
  function showOrgMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = "ep-org-form-msg is-visible " + (type === "success" ? "is-success" : "is-error");
  }

  /* ============================================================
     PAGE: organizer/login.html
     ============================================================ */
  var loginForm = document.getElementById("ep-org-login-form");
  if (loginForm) {
    var tabs = document.querySelectorAll(".ep-auth-tab");
    var tabsWrap = document.querySelector(".ep-auth-tabs");
    var panels = { login: document.getElementById("ep-panel-login"), signup: document.getElementById("ep-panel-signup") };
    function activate(name) {
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === name;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      tabsWrap.setAttribute("data-active", name);
      Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { activate(t.getAttribute("data-tab")); }); });
    document.querySelectorAll("[data-switch-to]").forEach(function (b) {
      b.addEventListener("click", function () { activate(b.getAttribute("data-switch-to")); });
    });

    document.querySelectorAll(".ep-password-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.getAttribute("data-target"));
        if (!input) return;
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
    });

    // Role toggle
    var roleToggle = document.getElementById("ep-role-toggle");
    var asField = document.getElementById("li-as");
    if (roleToggle) {
      roleToggle.querySelectorAll(".ep-role-option").forEach(function (btn) {
        btn.addEventListener("click", function () {
          roleToggle.querySelectorAll(".ep-role-option").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          btn.setAttribute("aria-pressed", "true");
          roleToggle.setAttribute("data-role", btn.getAttribute("data-role"));
          asField.value = btn.getAttribute("data-role");
        });
      });
    }

    // Password strength (signup)
    var pwInput = document.getElementById("su-password");
    var strengthEl = document.getElementById("su-strength");
    var strengthLabel = document.getElementById("su-strength-label");
    function scorePassword(v) {
      var score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      if (/\d/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      return v.length ? Math.max(score, 1) : 0;
    }
    if (pwInput) {
      pwInput.addEventListener("input", function () {
        var level = scorePassword(pwInput.value);
        strengthEl.setAttribute("data-level", String(level));
        var labels = ["", "Weak", "Fair", "Good", "Strong"];
        strengthLabel.textContent = pwInput.value ? labels[level] : "";
      });
    }

    // Canvas captcha (signup)
    function makeCaptcha(canvasId) {
      var canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      var ctx = canvas.getContext("2d");
      var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      var value = "";
      function draw() {
        value = "";
        for (var i = 0; i < 5; i++) value += chars[Math.floor(Math.random() * chars.length)];
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#FDF6F0";
        ctx.fillRect(0, 0, w, h);
        for (var n = 0; n < 5; n++) {
          ctx.strokeStyle = "rgba(74,44,58," + (0.15 + Math.random() * 0.15) + ")";
          ctx.beginPath();
          ctx.moveTo(Math.random() * w, Math.random() * h);
          ctx.lineTo(Math.random() * w, Math.random() * h);
          ctx.stroke();
        }
        var spacing = w / (value.length + 1);
        for (var i2 = 0; i2 < value.length; i2++) {
          ctx.save();
          ctx.translate(spacing * (i2 + 1), h / 2 + (Math.random() * 8 - 4));
          ctx.rotate(Math.random() * 0.5 - 0.25);
          ctx.font = "bold 22px Podkova, serif";
          ctx.fillStyle = i2 % 2 === 0 ? "#4A2C3A" : "#7a5566";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(value[i2], 0, 0);
          ctx.restore();
        }
      }
      draw();
      return { refresh: draw, getValue: function () { return value; } };
    }
    var signupCaptcha = makeCaptcha("su-captcha-canvas");
    var refreshBtn = document.getElementById("su-captcha-refresh");
    if (refreshBtn && signupCaptcha) {
      refreshBtn.addEventListener("click", function () {
        signupCaptcha.refresh();
        document.getElementById("su-captcha-input").value = "";
      });
    }

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Forgot password panel — shown over the login tab via the "Forgot
    // password?" link, not part of the login/signup tab switcher above.
    // Shares assets/js/forgot-password.php with /auth/login.html (see
    // that endpoint's header comment); admin is excluded there.
    (function () {
      var forgotOpen = document.getElementById("ep-forgot-open");
      var forgotClose = document.getElementById("ep-forgot-close");
      var forgotPanel = document.getElementById("ep-panel-forgot");
      var loginPanelEl = panels.login;
      var forgotForm = document.getElementById("ep-forgot-form");
      var forgotMsg = document.getElementById("ep-forgot-msg");
      if (forgotOpen && forgotPanel && loginPanelEl) {
        forgotOpen.addEventListener("click", function (e) {
          e.preventDefault();
          tabsWrap.hidden = true;
          loginPanelEl.hidden = true;
          forgotPanel.hidden = false;
          var toFocus = forgotPanel.querySelector("input");
          if (toFocus) toFocus.focus({ preventScroll: true });
        });
      }
      if (forgotClose && forgotPanel && loginPanelEl) {
        forgotClose.addEventListener("click", function () {
          forgotPanel.hidden = true;
          tabsWrap.hidden = false;
          loginPanelEl.hidden = false;
        });
      }
      if (forgotForm) {
        forgotForm.addEventListener("submit", function (e) {
          e.preventDefault();
          var emailInput = document.getElementById("fp-email");
          var emailField = emailInput.closest(".ep-field");
          if (!emailRe.test(emailInput.value.trim())) {
            emailField.classList.add("has-error");
            emailField.querySelector(".ep-field__error").textContent = "Enter a valid email address.";
            return;
          }
          emailField.classList.remove("has-error");

          var submitBtn = forgotForm.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.disabled = true;
          forgotMsg.textContent = "Sending…";
          forgotMsg.className = "ep-form-msg is-visible is-success";

          fetch("../assets/js/forgot-password.php", {
            method: "POST",
            body: new FormData(forgotForm),
            credentials: "same-origin"
          })
            .then(function (res) { return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; }); })
            .then(function (data) {
              forgotMsg.textContent = data.ok
                ? (data.message || "If an account exists for that email, a new temporary password has been sent.")
                : (data.error || "Something went wrong. Please try again.");
              forgotMsg.className = "ep-form-msg is-visible " + (data.ok ? "is-success" : "is-error");
              if (data.ok) forgotForm.reset();
            })
            .catch(function () {
              forgotMsg.textContent = "Network error — please try again.";
              forgotMsg.className = "ep-form-msg is-visible is-error";
            })
            .finally(function () { if (submitBtn) submitBtn.disabled = false; });
        });
      }
    })();

    var loginMsg = document.getElementById("ep-login-msg");
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("li-email").value.trim();
      var pw = document.getElementById("li-password").value;
      if (!emailRe.test(email) || !pw) { showMsg(loginMsg, "Enter a valid email and password.", "error"); return; }
      var btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      showMsg(loginMsg, "Signing in…", "success");
      postForm("organizer-login.php", loginForm).then(function (data) {
        if (data.ok) {
          showMsg(loginMsg, data.message, "success");
          window.location.href = data.redirect || "authoring.html";
        } else {
          showMsg(loginMsg, data.error || "Incorrect email or password.", "error");
        }
      }).catch(function () { showMsg(loginMsg, "Network error — please try again.", "error"); })
        .finally(function () { btn.disabled = false; });
    });

    var signupForm = document.getElementById("ep-vendor-signup-form");
    var signupMsg = document.getElementById("ep-signup-msg");
    if (signupForm) {
      signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var pw = document.getElementById("su-password").value;
        var confirm = document.getElementById("su-confirm").value;
        var captchaInput = document.getElementById("su-captcha-input");
        var terms = document.getElementById("su-terms");
        var ok = true;
        if (!document.getElementById("su-org").value.trim()) ok = false;
        if (!emailRe.test(document.getElementById("su-email").value.trim())) ok = false;
        if (pw.length < 8 || pw !== confirm) ok = false;
        if (!signupCaptcha || captchaInput.value.trim().toUpperCase() !== signupCaptcha.getValue()) ok = false;
        if (!terms.checked) ok = false;
        if (!ok) {
          showMsg(signupMsg, "Please fill every required field correctly and solve the captcha.", "error");
          if (signupCaptcha) { signupCaptcha.refresh(); captchaInput.value = ""; }
          return;
        }
        var btn = signupForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        showMsg(signupMsg, "Creating your vendor account…", "success");
        postForm("vendor-signup.php", signupForm).then(function (data) {
          if (data.ok) {
            showMsg(signupMsg, data.message, "success");
            window.location.href = data.redirect || "authoring.html";
          } else {
            showMsg(signupMsg, data.error || "Could not create the account.", "error");
            if (signupCaptcha) { signupCaptcha.refresh(); captchaInput.value = ""; }
          }
        }).catch(function () { showMsg(signupMsg, "Network error — please try again.", "error"); })
          .finally(function () { btn.disabled = false; });
      });
    }
  }

  /* ============================================================
     PAGE: organizer/partner.html (stand-alone partner account)
     ============================================================ */
  function initPartnerPortal() {
    var ME = null;
    function loadSales() {
      postJSON("partner-dashboard.php", { action: "sales" }).then(function (r) {
        if (!r.data.ok) return;
        var totals = r.data.totals;
        var dashboardStats = document.getElementById("dashboard-stats");
        var salesSummary = document.getElementById("sales-summary");
        var cards = statCard(money(totals.total_earnings), "Total earnings") +
          statCard(money(totals.monthly_earnings), "This month") +
          statCard(money(totals.pending_payout), "Pending payout") +
          statCard(money(totals.total_payout), "Already paid out");
        if (dashboardStats) dashboardStats.innerHTML = cards;
        if (salesSummary) {
          salesSummary.innerHTML = statCard(money(totals.total_earnings), "Total earnings") +
            statCard(money(totals.monthly_earnings), "This month") +
            statCard(money(totals.pending_payout), "Pending payout");
        }
        var salesBody = document.getElementById("sales-table-body");
        if (salesBody) {
          salesBody.innerHTML = r.data.earnings.length ? r.data.earnings.map(function (e) {
            return "<tr><td>" + esc(e.voyage_id) + "</td><td>" + esc(e.tour_title) + "</td><td>" + esc(e.pax) + "</td>" +
              "<td>" + money(e.commission_amount) + "</td><td>" + esc(e.credited_at) + "</td>" +
              "<td>" + (e.payout_id ? badge("paid") : badge("pending")) + "</td></tr>";
          }).join("") : '<tr class="ep-org-empty-row"><td colspan="6">No referrals credited yet.</td></tr>';
        }
        var payoutsBody = document.getElementById("payouts-table-body");
        if (payoutsBody) {
          payoutsBody.innerHTML = r.data.payouts.length ? r.data.payouts.map(function (p) {
            return "<tr><td>" + esc(p.period_start) + " – " + esc(p.period_end) + "</td><td>" +
              money(p.total_amount) + "</td><td>" + esc(p.paid_at) + "</td></tr>";
          }).join("") : '<tr class="ep-org-empty-row"><td colspan="3">No payouts recorded yet — paid out at the end of every 3rd month.</td></tr>';
        }
      });
    }
    function loadLink() {
      var input = document.getElementById("send-link-input");
      var output = document.getElementById("send-link-output");
      if (!input || !output || !ME || !ME.partner_profile) return;
      function rebuild() {
        var base = input.value.trim() || (window.location.origin + "/destinations/destination-list.html");
        try {
          var url = new URL(base, window.location.href);
          url.searchParams.set("ref", ME.partner_profile.partner_id);
          output.value = url.toString();
        } catch (e) {
          output.value = base + (base.indexOf("?") === -1 ? "?" : "&") + "ref=" + ME.partner_profile.partner_id;
        }
      }
      rebuild();
      input.oninput = rebuild;
      var copyBtn = document.getElementById("send-link-copy");
      if (copyBtn) copyBtn.onclick = function () {
        output.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(output.value)
            .then(function () { showOrgMsg(document.getElementById("send-link-msg"), "Link copied to clipboard.", "success"); })
            .catch(function () { showOrgMsg(document.getElementById("send-link-msg"), "Could not copy automatically — select and copy the link above.", "error"); });
        } else {
          showOrgMsg(document.getElementById("send-link-msg"), "Select and copy the link above.", "error");
        }
      };
    }
    function loadProfile() {
      if (!ME) return;
      document.getElementById("profile-fname").value = ME.first_name || "";
      document.getElementById("profile-lname").value = ME.last_name || "";
      document.getElementById("profile-contact").value = ME.contact || "";
      document.getElementById("profile-email").value = ME.email || "";
      if (ME.partner_profile) {
        document.getElementById("profile-display-name").value = ME.partner_profile.display_name || "";
        document.getElementById("profile-is-company").checked = !!Number(ME.partner_profile.is_company);
      }
    }
    function activateSection(name) {
      document.querySelectorAll(".ep-org-section").forEach(function (s) {
        s.classList.toggle("is-active", s.id === "sec-" + name);
      });
      document.querySelectorAll(".ep-org-nav-btn[data-section]").forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-section") === name);
      });
      if (name === "dashboard" || name === "sales") loadSales();
      if (name === "send-link") loadLink();
      if (name === "profile") loadProfile();
    }

    document.querySelectorAll(".ep-org-nav-btn[data-section]").forEach(function (b) {
      b.addEventListener("click", function () { activateSection(b.getAttribute("data-section")); });
    });
    // Log Out buttons (desktop header + mobile drawer) are wired once,
    // for every page, near the top of this file — see .ep-org-logout-btn.
    var profileForm = document.getElementById("profile-form");
    if (profileForm) profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      postJSON("organizer-profile.php", {
        action: "update_profile",
        first_name: document.getElementById("profile-fname").value,
        last_name: document.getElementById("profile-lname").value,
        contact: document.getElementById("profile-contact").value,
        display_name: document.getElementById("profile-display-name").value,
        is_company: document.getElementById("profile-is-company").checked
      }).then(function (r) {
        showOrgMsg(document.getElementById("profile-form-msg"),
          r.data.ok ? r.data.message : (r.data.error || "Could not update profile."),
          r.data.ok ? "success" : "error");
      });
    });
    var passwordForm = document.getElementById("password-form");
    if (passwordForm) passwordForm.addEventListener("submit", function (e) {
      e.preventDefault();
      postJSON("organizer-profile.php", {
        action: "change_password",
        current_password: document.getElementById("pw-current").value,
        new_password: document.getElementById("pw-new").value,
        confirm: document.getElementById("pw-confirm").value
      }).then(function (r) {
        showOrgMsg(document.getElementById("password-form-msg"),
          r.data.ok ? r.data.message : (r.data.error || "Could not change password."),
          r.data.ok ? "success" : "error");
        if (r.data.ok) passwordForm.reset();
      });
    });
    var deactivate = document.getElementById("deactivate-account-btn");
    if (deactivate) deactivate.addEventListener("click", function () {
      if (!confirm("Deactivate your account? You'll be signed out and will need support to reactivate it.")) return;
      postJSON("organizer-profile.php", { action: "deactivate_account" }).then(function (r) {
        if (r.data.ok) window.location.href = "login.html";
        else showOrgMsg(document.getElementById("danger-form-msg"), r.data.error || "Could not deactivate.", "error");
      });
    });
    var deleteAccount = document.getElementById("delete-account-btn");
    if (deleteAccount) deleteAccount.addEventListener("click", function () {
      var password = prompt("This permanently deletes your account. Enter your current password to confirm:");
      if (!password) return;
      postJSON("organizer-profile.php", { action: "delete_account", current_password: password }).then(function (r) {
        if (r.data.ok) window.location.href = "login.html";
        else showOrgMsg(document.getElementById("danger-form-msg"), r.data.error || "Could not delete account.", "error");
      });
    });

    fetch(API + "organizer-me.php", { credentials: "same-origin" })
      .then(function (res) { if (res.status === 401) throw new Error("unauth"); return res.json(); })
      .then(function (data) {
        ME = data.user;
        if (!ME || ME.account_type !== "partner" || !ME.partner_profile) {
          window.location.href = ME && ME.account_type === "vendor" ? "authoring.html" : "login.html";
          return;
        }
        var name = document.getElementById("ep-org-name");
        if (name) name.textContent = ME.partner_profile.display_name || (ME.first_name + " " + ME.last_name);
        var role = document.getElementById("ep-org-role");
        if (role) role.textContent = "Partner";
        var idBadge = document.getElementById("ep-partner-id-badge");
        if (idBadge) { idBadge.textContent = ME.partner_profile.partner_id; idBadge.hidden = false; }
        var first = document.querySelector(".ep-org-nav-btn[data-section]");
        if (first) activateSection(first.getAttribute("data-section"));
      })
      .catch(function () { window.location.href = "login.html"; });
  }

  /* ---- Site-header "Log Out" ------------------------------------------
     One real button lives in the desktop header (#ep-org-logout); a
     second, identical one (.ep-org-logout-btn, no id needed) lives in
     the mobile drawer markup, since header-footer.css hides the whole
     .ep-nav--right list — badge AND Log Out button — at <=991px and
     the drawer never had its own copy of either. Binding every element
     with this class, instead of just the one id, means both buttons
     work, on every organizer page. This replaced two near-identical
     getElementById("ep-org-logout") handlers that used to live one in
     initPartnerPortal() and one further down this file — each only
     ever wired the desktop button anyway, so centralising them here
     costs nothing and actually fixes the drawer button too. ---- */
  document.querySelectorAll(".ep-org-logout-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      fetch(API + "logout.php", { method: "POST", credentials: "same-origin" }).finally(function () {
        window.location.href = "login.html";
      });
    });
  });

  /* ---- Phone-width in-page menu ---------------------------------------
     Shared by all three dashboard pages (authoring/approvals/partner) —
     each already binds its own section-switching click handlers on
     ".ep-org-nav-btn[data-section]" (activateSection() / section()),
     so this only adds the toggle + auto-close on top, registered before
     those run further down. See the CSS comment above
     .ep-org-menu-toggle in organizer.css for why this exists (a
     horizontally-scrolling nav row isn't practical at phone widths) —
     this is the "in-page hamburger menu" that CSS comment refers to.
     No-op on login.html, which has no .ep-org-sidebar.

     This used to sit at the very end of the file, after the
     `if (ep-partner-shell) { initPartnerPortal(); return; }` branch
     below — which meant it silently never ran on partner.html at all
     (that branch returns before reaching it), even though the comment
     claimed all three pages shared it. It's placed here, above that
     branch, so every page reaches it regardless of which one returns
     early afterwards. ---- */
  var mobileSidebar = document.querySelector(".ep-org-sidebar");
  var mobileShell = document.querySelector(".ep-org-shell");
  if (mobileSidebar && mobileShell) {
    mobileSidebar.setAttribute("data-js-menu", "true");

    // Wrap the toggle + sidebar together (instead of dropping the
    // toggle loose into .ep-org-shell) so the dropdown's
    // `position:absolute; top:100%` is scoped to just this wrapper's
    // height, not the whole shell (toggle + <main> stacked). Previously
    // the dropdown's containing block was the shell itself, so an open
    // menu landed at top:100% of (toggle height + all of <main>) —
    // i.e. below every table/card on the page instead of right under
    // the toggle. See the matching comment on .ep-org-mobile-nav in
    // organizer.css.
    var mobileNavWrap = document.createElement("div");
    mobileNavWrap.className = "ep-org-mobile-nav";
    mobileShell.insertBefore(mobileNavWrap, mobileSidebar);
    mobileNavWrap.appendChild(mobileSidebar);

    var menuToggle = document.createElement("button");
    menuToggle.type = "button";
    menuToggle.className = "ep-org-menu-toggle";
    menuToggle.setAttribute("aria-haspopup", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.innerHTML =
      '<span class="ep-org-menu-toggle__current">Menu</span>' +
      '<svg class="ep-org-menu-toggle__icon" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    mobileNavWrap.insertBefore(menuToggle, mobileSidebar);
    var menuToggleLabel = menuToggle.querySelector(".ep-org-menu-toggle__current");

    var closeMobileMenu = function () {
      mobileSidebar.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    };
    var openMobileMenu = function () {
      var active = mobileSidebar.querySelector(".ep-org-nav-btn.is-active");
      menuToggleLabel.textContent = active ? active.textContent : "Menu";
      mobileSidebar.classList.add("is-open");
      menuToggle.setAttribute("aria-expanded", "true");
    };
    menuToggle.addEventListener("click", function () {
      if (mobileSidebar.classList.contains("is-open")) closeMobileMenu(); else openMobileMenu();
    });
    // Registered here, before each page's own activateSection()/section()
    // click handlers further down bind to these same elements, so this
    // fires first on a click — that's fine, it only toggles a class
    // this dropdown's own CSS reads, not something those handlers
    // depend on seeing already applied.
    mobileSidebar.querySelectorAll(".ep-org-nav-btn, .ep-org-switch-btn").forEach(function (btn) {
      btn.addEventListener("click", closeMobileMenu);
    });
    document.addEventListener("click", function (e) {
      if (!mobileSidebar.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
        closeMobileMenu();
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMobileMenu(); });
  }

  /* ============================================================
     PAGES: organizer/authoring.html and organizer/approvals.html
     ============================================================ */
  if (document.getElementById("ep-partner-shell")) {
    initPartnerPortal();
    return;
  }
  var shell = document.getElementById("ep-org-shell");
  if (!shell) return; // this is login.html; nothing more to do

  var PAGE = shell.getAttribute("data-page"); // "authoring" | "approvals"
  var ME = null; // populated by boot()

  function section(name) {
    document.querySelectorAll(".ep-org-section").forEach(function (s) { s.classList.toggle("is-active", s.id === "sec-" + name); });
    document.querySelectorAll(".ep-org-nav-btn[data-section]").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-section") === name); });
    if (name === "dashboard") loadDashboard();
    if (name === "trips" || name === "trip-approvals") loadTrips();
    if (name === "roams") loadRoams();
    if (name === "enquiries") loadEnquiries();
    if (name === "sales" || name === "sales-overview") loadSales();
    if (name === "profile") loadProfile();
    if (name === "vendors") loadVendors();
    if (name === "partner") loadPartnerTab();
    if (name === "partners") loadPartners();
  }

  function statCard(value, label) {
    return '<div class="ep-org-stat"><div class="ep-org-stat__value">' + value + '</div><div class="ep-org-stat__label">' + label + '</div></div>';
  }
  function loadDashboard() {
    var statsEl = document.getElementById("dashboard-stats");
    if (!statsEl || !ME) return;
    if (ME.account_type === "vendor") {
      postJSON("organizer-trips.php", { action: "list" }).then(function (result) {
        var trips = result.data.ok ? result.data.trips : [];
        var published = trips.filter(function (t) { return t.status === "published"; }).length;
        var pending = trips.filter(function (t) { return t.status === "pending_review"; }).length;
        statsEl.innerHTML = statCard(trips.length, "Total trips") + statCard(published, "Published") +
          statCard(pending, "Pending review");
      });
    } else {
      Promise.all([
        postJSON("organizer-trips.php", { action: "list", status: "pending_review" }),
        postJSON("organizer-roams.php", { action: "list" }),
        postJSON("organizer-sales.php", { action: "summary" })
      ]).then(function (results) {
        var pendingTrips = results[0].data.ok ? results[0].data.trips.length : 0;
        var roams = results[1].data.ok ? results[1].data.roams : [];
        var summary = results[2].data.ok ? results[2].data.summary : { total_amount: 0 };
        statsEl.innerHTML = statCard(pendingTrips, "Trips awaiting approval") + statCard(roams.length, "ROAMS authored") +
          statCard(money(summary.total_amount), "Total platform revenue");
      });
    }
  }
  document.querySelectorAll(".ep-org-nav-btn[data-section]").forEach(function (b) {
    b.addEventListener("click", function () { section(b.getAttribute("data-section")); });
  });

  // Log Out buttons (desktop header + mobile drawer) are wired once,
  // for every page, near the top of this file — see .ep-org-logout-btn.

  function boot() {
    fetch(API + "organizer-me.php", { credentials: "same-origin" })
      .then(function (res) { if (res.status === 401) throw new Error("unauth"); return res.json(); })
      .then(function (data) {
        ME = data.user;
        // Keep the role-specific workspaces separate while sharing the
        // organizer directory, scripts, styles, and login.
        if (ME.account_type === "partner") {
          window.location.href = "partner.html";
          return;
        }
        if (PAGE === "approvals" && ME.account_type !== "admin") {
          window.location.href = "authoring.html";
          return;
        }
        renderIdentity();
        var first = document.querySelector(".ep-org-nav-btn[data-section]");
        if (first) section(first.getAttribute("data-section"));
      })
      .catch(function () { window.location.href = "login.html"; });
  }

  function renderIdentity() {
    var nameEl = document.getElementById("ep-org-name");
    var roleEl = document.getElementById("ep-org-role");
    if (nameEl) nameEl.textContent = ME.first_name + " " + ME.last_name;
    if (roleEl) roleEl.textContent = ME.account_type === "admin" ? "Administrator" : "Vendor";

    document.querySelectorAll("[data-role-only]").forEach(function (el) {
      el.hidden = el.getAttribute("data-role-only") !== ME.account_type;
    });

    var statusEl = document.getElementById("ep-org-vendor-status");
    var bannerEl = document.getElementById("ep-org-pending-banner");
    if (ME.account_type === "vendor" && ME.vendor_profile) {
      var st = ME.vendor_profile.review_status;
      if (statusEl) { statusEl.textContent = st; statusEl.className = "ep-org-identity__status ep-org-badge ep-org-badge--" + st; statusEl.hidden = false; }
      if (bannerEl) {
        bannerEl.hidden = st === "approved";
        if (st === "pending") bannerEl.innerHTML = "Your vendor profile is <strong>pending admin approval</strong>. You can draft Trips now — they'll stay in review until your account is approved.";
        if (st === "rejected") bannerEl.innerHTML = "Your vendor application was <strong>not approved</strong>. Contact support@embarkpedia.com.";
        if (st === "suspended") bannerEl.innerHTML = "Your vendor account is <strong>suspended</strong>. Contact support@embarkpedia.com.";
        bannerEl.className = "ep-org-banner" + (st === "pending" ? "" : " is-warning");
      }
    } else if (statusEl) {
      statusEl.hidden = true;
      if (bannerEl) bannerEl.hidden = true;
    }
  }

  function destStatusOptions(current, options) {
    return options.map(function (o) { return '<option value="' + o + '"' + (o === current ? " selected" : "") + ">" + o.replace(/_/g, " ") + "</option>"; }).join("");
  }

  /* ---------------- Trips (Add Tour / List Trips / Trip Approvals) ------- */
  var tripsBody = document.getElementById("trips-table-body");
  var tripApprovalsBody = document.getElementById("trip-approvals-table-body");

  function tripRow(t, forApprovalQueue) {
    var actions = "";
    if (forApprovalQueue) {
      actions = '<div class="ep-org-row-actions">' +
        '<button class="ep-org-btn ep-org-btn--accent" data-approve-trip="' + t.id + '">Approve</button>' +
        '<button class="ep-org-btn ep-org-btn--danger" data-reject-trip="' + t.id + '">Reject</button>' +
        "</div>";
    } else {
      var canEdit = t.status !== "published" || ME.account_type === "admin";
      actions = '<div class="ep-org-row-actions">' +
        (canEdit ? '<button class="ep-org-btn" data-edit-trip="' + t.id + '">Edit</button>' : "") +
        (t.status === "published" ? '<button class="ep-org-btn ep-org-btn--accent" data-pause-trip="' + t.id + '">Pause</button>' : "") +
        (t.status === "paused" ? '<button class="ep-org-btn ep-org-btn--accent" data-resume-trip="' + t.id + '">Resume</button>' : "") +
        '<button class="ep-org-btn ep-org-btn--ghost" data-archive-trip="' + t.id + '">Archive</button>' +
        "</div>";
    }
    var vendorCol = ME.account_type === "admin" ? "<td>" + esc(t.vendor_first_name ? t.vendor_first_name + " " + t.vendor_last_name : "—") + "</td>" : "";
    return "<tr>" +
      "<td>" + esc(t.title) + "<br><small>" + esc(t.article_id) + "</small></td>" +
      "<td>" + esc(t.destination_name) + "</td>" +
      "<td>" + t.days + "D/" + t.nights + "N</td>" +
      "<td>" + money(t.price_inr) + "</td>" +
      vendorCol +
      "<td>" + badge(t.status) + "</td>" +
      "<td>" + actions + "</td>" +
      "</tr>";
  }

  function loadTrips() {
    postJSON("organizer-trips.php", { action: "list" }).then(function (r) {
      if (!r.data.ok) return;
      var rows = r.data.trips;
      if (tripsBody) {
        tripsBody.innerHTML = rows.length ? rows.map(function (t) { return tripRow(t, false); }).join("") :
          '<tr class="ep-org-empty-row"><td colspan="6">No trips yet — add your first one.</td></tr>';
      }
    });
    if (tripApprovalsBody) {
      postJSON("organizer-trips.php", { action: "list", status: "pending_review" }).then(function (r) {
        if (!r.data.ok) return;
        var rows = r.data.trips;
        tripApprovalsBody.innerHTML = rows.length ? rows.map(function (t) { return tripRow(t, true); }).join("") :
          '<tr class="ep-org-empty-row"><td colspan="6">Nothing awaiting review.</td></tr>';
      });
    }
  }

  document.addEventListener("click", function (e) {
    var id;
    if ((id = e.target.getAttribute && e.target.getAttribute("data-approve-trip"))) {
      postJSON("organizer-trips.php", { action: "approve", id: id }).then(function () { loadTrips(); });
    } else if ((id = e.target.getAttribute && e.target.getAttribute("data-reject-trip"))) {
      if (confirm("Reject this trip and send it back to the vendor?")) {
        postJSON("organizer-trips.php", { action: "reject", id: id }).then(function () { loadTrips(); });
      }
    } else if ((id = e.target.getAttribute && e.target.getAttribute("data-archive-trip"))) {
      if (confirm("Archive this trip? It will be removed from public listings.")) {
        postJSON("organizer-trips.php", { action: "archive", id: id }).then(function () { loadTrips(); });
      }
    } else if ((id = e.target.getAttribute && e.target.getAttribute("data-pause-trip"))) {
      postJSON("organizer-trips.php", { action: "pause", id: id }).then(function () { loadTrips(); });
    } else if ((id = e.target.getAttribute && e.target.getAttribute("data-resume-trip"))) {
      postJSON("organizer-trips.php", { action: "resume", id: id }).then(function () { loadTrips(); });
    } else if ((id = e.target.getAttribute && e.target.getAttribute("data-edit-trip"))) {
      loadTripIntoForm(id);
    }
  });

  /* ---- Add/Edit Tour form with repeatable inclusions/exclusions/itinerary/stays ---- */
  var tripForm = document.getElementById("trip-form");
  if (tripForm) {
    postJSON("organizer-trips.php", { action: "destinations" }).then(function (r) {
      if (!r.data.ok) return;
      var sel = document.getElementById("trip-destination");
      sel.innerHTML = '<option value="">Select…</option>' + r.data.destinations.map(function (d) {
        return '<option value="' + d.id + '">' + esc(d.name) + " (" + esc(d.region) + ")</option>";
      }).join("");
    });

    function addRepeatRow(containerId, html) {
      var container = document.getElementById(containerId);
      var div = document.createElement("div");
      div.className = "ep-org-repeat-row";
      div.innerHTML = html;
      container.appendChild(div);
      div.querySelector("[data-remove]").addEventListener("click", function () { div.remove(); });
    }
    document.getElementById("trip-add-inclusion").addEventListener("click", function () {
      addRepeatRow("trip-inclusions", '<div><input type="text" class="inc-input" placeholder="e.g. Airport transfers"/></div><button type="button" class="ep-org-btn ep-org-repeat-remove" data-remove>✕</button>');
    });
    document.getElementById("trip-add-exclusion").addEventListener("click", function () {
      addRepeatRow("trip-exclusions", '<div><input type="text" class="exc-input" placeholder="e.g. Airfare"/></div><button type="button" class="ep-org-btn ep-org-repeat-remove" data-remove>✕</button>');
    });
    document.getElementById("trip-add-stay").addEventListener("click", function () {
      addRepeatRow("trip-stays",
        '<div class="ep-org-form-grid"><input type="text" class="stay-hotel" placeholder="Hotel name"/>' +
        '<input type="number" class="stay-checkin-day" placeholder="Check-in day #" min="1"/>' +
        '<input type="number" class="stay-checkout-day" placeholder="Check-out day #" min="1"/>' +
        '<input type="text" class="stay-notes" placeholder="Notes (optional)"/></div>' +
        '<button type="button" class="ep-org-btn ep-org-repeat-remove" data-remove>✕</button>');
    });

    var dayCount = 0;
    function addItineraryDay(prefill) {
      dayCount++;
      var n = dayCount;
      var container = document.getElementById("trip-itinerary");
      var div = document.createElement("div");
      div.className = "ep-org-itinerary-day";
      div.setAttribute("data-day", n);
      div.innerHTML =
        '<div class="ep-org-itinerary-day__head"><strong>Day ' + n + '</strong><button type="button" class="ep-org-btn ep-org-btn--ghost" data-remove>Remove day</button></div>' +
        '<input type="text" class="day-title" placeholder="Day title, e.g. Arrival in Goa" value="' + esc(prefill && prefill.title || "") + '"/>' +
        '<textarea class="day-plan" rows="2" placeholder="3–4 line plan for the day" style="margin-top:8px;">' + esc(prefill && prefill.plan_text || "") + '</textarea>' +
        '<div class="ep-org-itinerary-options">' +
          '<label class="ep-org-check-inline"><input type="checkbox" class="day-highlight"' + (prefill && prefill.is_highlight ? " checked" : "") + '/><span class="ep-org-check-inline__copy"><strong>Highlight day</strong><small>Feature this day in the itinerary.</small></span></label>' +
          '<label class="ep-org-check-inline"><input type="checkbox" class="day-note-toggle"' + (prefill && prefill.note_text ? " checked" : "") + '/><span class="ep-org-check-inline__copy"><strong>Add a note</strong><small>Include an extra note for travellers.</small></span></label>' +
        '</div>' +
        '<textarea class="day-note" rows="2" placeholder="Note for travellers" style="display:' + (prefill && prefill.note_text ? "block" : "none") + ';margin-top:8px;">' + esc(prefill && prefill.note_text || "") + '</textarea>';
      container.appendChild(div);
      div.querySelector(".day-note-toggle").addEventListener("change", function (e) {
        div.querySelector(".day-note").style.display = e.target.checked ? "block" : "none";
      });
      div.querySelector("[data-remove]").addEventListener("click", function () {
        div.remove();
        container.querySelectorAll(".ep-org-itinerary-day").forEach(function (d, i) {
          d.querySelector("strong").textContent = "Day " + (i + 1);
        });
      });
    }
    document.getElementById("trip-add-day").addEventListener("click", function () { addItineraryDay(); });
    for (var i = 0; i < 3; i++) addItineraryDay(); // start with the minimum 3

    function collectTripPayload() {
      var itinerary = [];
      document.querySelectorAll("#trip-itinerary .ep-org-itinerary-day").forEach(function (d) {
        itinerary.push({
          title: d.querySelector(".day-title").value,
          plan_text: d.querySelector(".day-plan").value,
          is_highlight: d.querySelector(".day-highlight").checked,
          note_text: d.querySelector(".day-note-toggle").checked ? d.querySelector(".day-note").value : ""
        });
      });
      var stays = [];
      document.querySelectorAll("#trip-stays .ep-org-repeat-row").forEach(function (row) {
        var hotel = row.querySelector(".stay-hotel").value;
        if (!hotel.trim()) return;
        stays.push({
          hotel_name: hotel,
          checkin_day: row.querySelector(".stay-checkin-day").value,
          checkout_day: row.querySelector(".stay-checkout-day").value,
          notes: row.querySelector(".stay-notes").value
        });
      });
      return {
        id: tripForm.getAttribute("data-edit-id") || undefined,
        destination_id: document.getElementById("trip-destination").value,
        title: document.getElementById("trip-title").value,
        days: document.getElementById("trip-days").value,
        nights: document.getElementById("trip-nights").value,
        category: document.getElementById("trip-category").value,
        price_inr: document.getElementById("trip-price").value,
        price_with_breakfast_inr: document.getElementById("trip-price-b").value,
        price_with_breakfast_dinner_inr: document.getElementById("trip-price-bd").value,
        hotel_type: document.getElementById("trip-hotel-type").value,
        image_url: document.getElementById("trip-image").value,
        inclusions: Array.prototype.map.call(document.querySelectorAll("#trip-inclusions .inc-input"), function (i) { return i.value; }),
        exclusions: Array.prototype.map.call(document.querySelectorAll("#trip-exclusions .exc-input"), function (i) { return i.value; }),
        itinerary: itinerary,
        stays: stays
      };
    }

    var tripMsg = document.getElementById("trip-form-msg");
    tripForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var payload = collectTripPayload();
      var isEdit = !!tripForm.getAttribute("data-edit-id");
      payload.action = isEdit ? "update" : "create";
      postJSON("organizer-trips.php", payload).then(function (r) {
        if (r.data.ok) {
          showOrgMsg(tripMsg, r.data.message, "success");
          tripForm.reset();
          tripForm.removeAttribute("data-edit-id");
          document.getElementById("trip-itinerary").innerHTML = "";
          dayCount = 0;
          for (var i = 0; i < 3; i++) addItineraryDay();
          document.getElementById("trip-inclusions").innerHTML = "";
          document.getElementById("trip-exclusions").innerHTML = "";
          document.getElementById("trip-stays").innerHTML = "";
          loadTrips();
        } else {
          showOrgMsg(tripMsg, r.data.error || "Could not save the trip.", "error");
        }
      });
    });

    window.loadTripIntoForm = function (id) {
      postJSON("organizer-trips.php", { action: "get", id: id }).then(function (r) {
        if (!r.data.ok) return;
        var t = r.data.trip;
        section("add-trip");
        tripForm.setAttribute("data-edit-id", t.id);
        document.getElementById("trip-destination").value = t.destination_id;
        document.getElementById("trip-title").value = t.title;
        document.getElementById("trip-days").value = t.days;
        document.getElementById("trip-nights").value = t.nights;
        document.getElementById("trip-category").value = t.category;
        document.getElementById("trip-price").value = t.price_inr;
        document.getElementById("trip-price-b").value = t.price_with_breakfast_inr || "";
        document.getElementById("trip-price-bd").value = t.price_with_breakfast_dinner_inr || "";
        document.getElementById("trip-hotel-type").value = t.hotel_type || "";
        document.getElementById("trip-image").value = t.image_url || "";

        document.getElementById("trip-inclusions").innerHTML = "";
        t.inclusions.forEach(function (i) { addRepeatRow("trip-inclusions", '<div><input type="text" class="inc-input" value="' + esc(i.item_text) + '"/></div><button type="button" class="ep-org-btn ep-org-repeat-remove" data-remove>✕</button>'); });
        document.getElementById("trip-exclusions").innerHTML = "";
        t.exclusions.forEach(function (i) { addRepeatRow("trip-exclusions", '<div><input type="text" class="exc-input" value="' + esc(i.item_text) + '"/></div><button type="button" class="ep-org-btn ep-org-repeat-remove" data-remove>✕</button>'); });
        document.getElementById("trip-itinerary").innerHTML = "";
        dayCount = 0;
        t.itinerary.forEach(function (d) { addItineraryDay(d); });
        document.getElementById("trip-stays").innerHTML = "";
        t.stays.forEach(function (s) {
          addRepeatRow("trip-stays",
            '<div class="ep-org-form-grid"><input type="text" class="stay-hotel" value="' + esc(s.hotel_name) + '"/>' +
            '<input type="number" class="stay-checkin-day" value="' + esc(s.checkin_day || "") + '"/>' +
            '<input type="number" class="stay-checkout-day" value="' + esc(s.checkout_day || "") + '"/>' +
            '<input type="text" class="stay-notes" value="' + esc(s.notes || "") + '"/></div>' +
            '<button type="button" class="ep-org-btn ep-org-repeat-remove" data-remove>✕</button>');
        });
      });
    };
  }

  /* ---------------- ROAMS (admin only) ------------------------------------
   * No creation/editing here by design — admins may only toggle an existing
   * ROAM's visibility:
   *   Start  -> publishes a draft, or resumes a paused ROAM (status: published)
   *   Pause  -> reversible; pulls it from the navbar + roams listing, link
   *             becomes inaccessible, but it can be Started again later
   *   Stop   -> one-way (archive); pulls it from the navbar + roams listing
   *             and its link stays inaccessible for good
   * -------------------------------------------------------------------- */
  var roamsBody = document.getElementById("roams-table-body");
  function loadRoams() {
    if (!roamsBody) return;
    postJSON("organizer-roams.php", { action: "list" }).then(function (r) {
      if (!r.data.ok) return;
      var rows = r.data.roams;
      roamsBody.innerHTML = rows.length ? rows.map(function (rm) {
        var canStart = rm.status === "draft" || rm.status === "paused";
        var canPause = rm.status === "published";
        var canStop = rm.status === "published" || rm.status === "paused" || rm.status === "draft";
        return "<tr><td>" + esc(rm.title) + "<br><small>" + esc(rm.route) + "</small></td><td>" + esc(rm.date_range) + "</td>" +
          "<td>" + badge(rm.status) + "</td><td><div class=\"ep-org-row-actions\">" +
          (canStart ? '<button class="ep-org-btn ep-org-btn--accent" data-start-roam="' + rm.id + '">Start</button>' : "") +
          (canPause ? '<button class="ep-org-btn ep-org-btn--accent" data-pause-roam="' + rm.id + '">Pause</button>' : "") +
          (canStop ? '<button class="ep-org-btn ep-org-btn--ghost" data-stop-roam="' + rm.id + '">Stop</button>' : "") +
          "</div></td></tr>";
      }).join("") : '<tr class="ep-org-empty-row"><td colspan="4">No ROAMS yet. (Creation is disabled from this dashboard — add rows directly via the database.)</td></tr>';
    });
  }
  document.addEventListener("click", function (e) {
    var id;
    if ((id = e.target.getAttribute && e.target.getAttribute("data-start-roam"))) {
      // publish handles draft -> published; resume handles paused -> published.
      // Try publish first, and fall back to resume if the ROAM was paused.
      postJSON("organizer-roams.php", { action: "publish", id: id }).then(function (r) {
        if (r.data.ok) { loadRoams(); return; }
        postJSON("organizer-roams.php", { action: "resume", id: id }).then(function () { loadRoams(); });
      });
    } else if ((id = e.target.getAttribute && e.target.getAttribute("data-pause-roam"))) {
      postJSON("organizer-roams.php", { action: "pause", id: id }).then(function () { loadRoams(); });
    } else if ((id = e.target.getAttribute && e.target.getAttribute("data-stop-roam"))) {
      if (confirm("Stop this ROAM? This removes it from the navbar and roams listing for good — it cannot be re-started.")) {
        postJSON("organizer-roams.php", { action: "archive", id: id }).then(function () { loadRoams(); });
      }
    }
  });

  /* ---------------- Enquiries --------------------------------------------- */
  function partnerCell(q) {
    if (!q.partner_id_entered && !q.partner_user_id) return "—";
    var matched = !!q.partner_user_id;
    var label = matched ? esc(q.partner_display_name) + "<br><small>" + esc(q.partner_id_matched) + "</small>" :
      "<small>Typed \u201c" + esc(q.partner_id_entered || "") + "\u201d \u2014 no match</small>";
    return label + (matched ? "<br>" + badge(q.partner_credit_status) : "");
  }
  function loadEnquiries() {
    var tripBody = document.getElementById("trip-enquiries-body");
    var contactBody = document.getElementById("contact-enquiries-body");
    if (tripBody) {
      postJSON("organizer-enquiries.php", { action: "list_trip" }).then(function (r) {
        if (!r.data.ok) return;
        var rows = r.data.enquiries;
        if (ME.account_type === "admin") {
          tripBody.innerHTML = rows.length ? rows.map(function (q) {
            return "<tr><td>" + esc(q.name) + "<br><small>" + esc(q.email) + " · " + esc(q.contact) + "</small></td>" +
              "<td>" + esc(q.tour_title || q.roam_title || "—") + "<br><small>" + esc(q.vendor_name || "—") + "</small></td>" +
              "<td>" + esc(q.preferred_checkin_date || "—") + "</td><td>" + esc(q.group_size || "—") + "</td>" +
              "<td>" + partnerCell(q) + "</td>" +
              "<td>" + badge(q.status) + (q.shared_with_vendor ? ' <span class="ep-org-badge ep-org-badge--approved">shared</span>' : "") + "</td>" +
              '<td><div class="ep-org-row-actions">' +
              (!q.shared_with_vendor && q.tour_id ? '<button class="ep-org-btn ep-org-btn--accent" data-forward-enquiry="' + q.id + '">Forward</button>' : "") +
              '<select class="ep-org-btn" data-status-enquiry="' + q.id + '" data-kind="trip">' + destStatusOptions(q.status, ["on_hold", "closed", "resolved"]) + "</select>" +
              "</div></td></tr>";
          }).join("") : '<tr class="ep-org-empty-row"><td colspan="7">No trip enquiries yet.</td></tr>';
        } else {
          // Vendors can view what's been forwarded to them, but status is
          // admin-only now (see organizer-enquiries.php) — read-only badge.
          // No Partner column here at all: commission/referral info is
          // strictly admin-partner business (matches the stripped-down
          // columns organizer-enquiries.php's list_trip already returns
          // for a vendor — see the SELECT there, no partner_* fields).
          tripBody.innerHTML = rows.length ? rows.map(function (q) {
            return "<tr><td>" + esc(q.tour_title) + "</td>" +
              "<td>" + esc(q.preferred_checkin_date || "—") + "</td><td>" + esc(q.group_size || "—") + "</td>" +
              "<td>" + esc(q.contact_note) + "</td><td>" + esc(q.message || "") + "</td><td>" + badge(q.status) + "</td></tr>";
          }).join("") : '<tr class="ep-org-empty-row"><td colspan="6">No enquiries have been shared with you yet.</td></tr>';
        }
      });
    }
    if (contactBody && ME.account_type === "admin") {
      postJSON("organizer-enquiries.php", { action: "list_contact" }).then(function (r) {
        if (!r.data.ok) return;
        var rows = r.data.messages;
        contactBody.innerHTML = rows.length ? rows.map(function (m) {
          return "<tr><td>" + esc(m.name) + "<br><small>" + esc(m.email) + "</small></td><td>" + esc(m.enquiry_type) + "</td>" +
            "<td>" + esc(m.sub) + "</td><td>" + esc((m.msg || "").slice(0, 120)) + "</td>" +
            "<td>" + badge(m.status) + '<br><select class="ep-org-btn" data-status-enquiry="' + m.id + '" data-kind="contact">' + destStatusOptions(m.status, ["new", "in_progress", "responded", "closed", "spam"]) + "</select></td></tr>";
        }).join("") : '<tr class="ep-org-empty-row"><td colspan="5">No contact-us messages yet.</td></tr>';
      });
    }
  }
  document.addEventListener("click", function (e) {
    var id = e.target.getAttribute && e.target.getAttribute("data-forward-enquiry");
    if (id) postJSON("organizer-enquiries.php", { action: "forward", id: id }).then(function () { loadEnquiries(); });
    if (e.target.id === "recheck-partner-credits-btn") {
      postJSON("organizer-enquiries.php", { action: "recheck_partner_credits" }).then(function () { loadEnquiries(); });
    }
  });
  document.addEventListener("change", function (e) {
    var id = e.target.getAttribute && e.target.getAttribute("data-status-enquiry");
    if (id) {
      var payload = { action: "update_status", id: id, kind: e.target.getAttribute("data-kind"), status: e.target.value };
      // Resolving is the "customer paid, invoice generated" state — offer
      // to note the invoice/payment reference right there (optional).
      if (e.target.getAttribute("data-kind") === "trip" && e.target.value === "resolved") {
        var ref = prompt("Optional: invoice / payment reference for this booking");
        if (ref) payload.invoice_reference = ref;
      }
      postJSON("organizer-enquiries.php", payload).then(function () { loadEnquiries(); });
    }
  });

  /* ---------------- Sales ------------------------------------------------- */
  function loadSales() {
    var summaryEl = document.getElementById("sales-summary");
    var body = document.getElementById("sales-table-body");
    var byVendorBody = document.getElementById("sales-by-vendor-body");
    postJSON("organizer-sales.php", { action: "summary" }).then(function (r) {
      if (!r.data.ok || !summaryEl) return;
      var s = r.data.summary;
      summaryEl.innerHTML =
        '<div class="ep-org-stat"><div class="ep-org-stat__value">' + money(s.total_amount) + '</div><div class="ep-org-stat__label">Total revenue</div></div>' +
        '<div class="ep-org-stat"><div class="ep-org-stat__value">' + s.total_count + '</div><div class="ep-org-stat__label">Confirmed sales</div></div>';
      if (byVendorBody && s.by_vendor) {
        byVendorBody.innerHTML = s.by_vendor.length ? s.by_vendor.map(function (v) {
          return "<tr><td>" + esc(v.vendor_name || "Direct/ROAM") + "</td><td>" + v.cnt + "</td><td>" + money(v.total) + "</td></tr>";
        }).join("") : '<tr class="ep-org-empty-row"><td colspan="3">No sales logged yet.</td></tr>';
      }
    });
    if (body) {
      postJSON("organizer-sales.php", { action: "list" }).then(function (r) {
        if (!r.data.ok) return;
        var rows = r.data.sales;
        body.innerHTML = rows.length ? rows.map(function (s) {
          return "<tr><td>" + esc(s.tour_title || s.roam_title || "—") + (s.vendor_name ? "<br><small>" + esc(s.vendor_name) + "</small>" : "") + "</td>" +
            "<td>" + esc(s.buyer_name) + "</td><td>" + esc(s.sale_date) + "</td><td>" + money(s.amount, s.currency) + "</td><td>" + badge(s.status) + "</td></tr>";
        }).join("") : '<tr class="ep-org-empty-row"><td colspan="5">No sales logged yet.</td></tr>';
      });
    }
  }
  var saleForm = document.getElementById("sale-form");
  if (saleForm) {
    postJSON("organizer-trips.php", { action: "list" }).then(function (r) {
      if (!r.data.ok) return;
      var sel = document.getElementById("sale-tour");
      sel.innerHTML = '<option value="">Select a trip…</option>' + r.data.trips.filter(function (t) { return t.status === "published"; }).map(function (t) {
        return '<option value="' + t.id + '">' + esc(t.title) + "</option>";
      }).join("");
    });
    var saleMsg = document.getElementById("sale-form-msg");
    saleForm.addEventListener("submit", function (e) {
      e.preventDefault();
      postJSON("organizer-sales.php", {
        action: "create",
        tour_id: document.getElementById("sale-tour").value,
        buyer_name: document.getElementById("sale-buyer").value,
        buyer_email: document.getElementById("sale-email").value,
        buyer_contact: document.getElementById("sale-contact").value,
        group_size: document.getElementById("sale-group-size").value,
        amount: document.getElementById("sale-amount").value,
        currency: document.getElementById("sale-currency").value || "INR",
        sale_date: document.getElementById("sale-date").value,
        notes: document.getElementById("sale-notes").value
      }).then(function (r) {
        if (r.data.ok) { showOrgMsg(saleMsg, r.data.message, "success"); saleForm.reset(); loadSales(); }
        else showOrgMsg(saleMsg, r.data.error || "Could not log the sale.", "error");
      });
    });
  }

  /* ---------------- Profile ------------------------------------------------ */
  function loadProfile() {
    if (!ME) return;
    var f = document.getElementById("profile-form");
    if (!f) return;
    document.getElementById("profile-fname").value = ME.first_name;
    document.getElementById("profile-lname").value = ME.last_name;
    document.getElementById("profile-contact").value = ME.contact;
    document.getElementById("profile-email").value = ME.email;
    var vendorFields = document.getElementById("profile-vendor-fields");
    if (ME.account_type === "vendor" && ME.vendor_profile) {
      vendorFields.hidden = false;
      document.getElementById("profile-org").value = ME.vendor_profile.organization_name || "";
      document.getElementById("profile-biz-phone").value = ME.vendor_profile.business_phone || "";
      document.getElementById("profile-website").value = ME.vendor_profile.website_url || "";
      document.getElementById("profile-about").value = ME.vendor_profile.business_description || "";
    } else if (vendorFields) {
      vendorFields.hidden = true;
    }
  }
  var profileForm = document.getElementById("profile-form");
  if (profileForm) {
    var profileMsg = document.getElementById("profile-form-msg");
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      postJSON("organizer-profile.php", {
        action: "update_profile",
        first_name: document.getElementById("profile-fname").value,
        last_name: document.getElementById("profile-lname").value,
        contact: document.getElementById("profile-contact").value,
        organization_name: document.getElementById("profile-org") ? document.getElementById("profile-org").value : undefined,
        business_phone: document.getElementById("profile-biz-phone") ? document.getElementById("profile-biz-phone").value : undefined,
        website_url: document.getElementById("profile-website") ? document.getElementById("profile-website").value : undefined,
        business_description: document.getElementById("profile-about") ? document.getElementById("profile-about").value : undefined
      }).then(function (r) {
        showOrgMsg(profileMsg, r.data.ok ? "Profile updated." : (r.data.error || "Could not update profile."), r.data.ok ? "success" : "error");
      });
    });
  }
  var pwForm = document.getElementById("password-form");
  if (pwForm) {
    var pwMsg = document.getElementById("password-form-msg");
    pwForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var np = document.getElementById("pw-new").value, cf = document.getElementById("pw-confirm").value;
      if (np !== cf) { showOrgMsg(pwMsg, "New passwords do not match.", "error"); return; }
      postJSON("organizer-profile.php", {
        action: "change_password",
        current_password: document.getElementById("pw-current").value,
        new_password: np, confirm: cf
      }).then(function (r) {
        showOrgMsg(pwMsg, r.data.ok ? "Password changed." : (r.data.error || "Could not change password."), r.data.ok ? "success" : "error");
        if (r.data.ok) pwForm.reset();
      });
    });
  }

  var deactivateBtn = document.getElementById("deactivate-account-btn");
  if (deactivateBtn) {
    deactivateBtn.addEventListener("click", function () {
      if (!confirm("Deactivate your account? You'll be signed out and will need support to reactivate it.")) return;
      postJSON("organizer-profile.php", { action: "deactivate_account" }).then(function (r) {
        if (r.data.ok) window.location.href = "login.html";
        else showOrgMsg(document.getElementById("danger-form-msg"), r.data.error || "Could not deactivate.", "error");
      });
    });
  }
  var deleteBtn = document.getElementById("delete-account-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", function () {
      var pw = prompt("This permanently deletes your account. Enter your current password to confirm:");
      if (!pw) return;
      postJSON("organizer-profile.php", { action: "delete_account", current_password: pw }).then(function (r) {
        if (r.data.ok) window.location.href = "login.html";
        else showOrgMsg(document.getElementById("danger-form-msg"), r.data.error || "Could not delete account.", "error");
      });
    });
  }

  /* ---------------- Partner (vendor's own referral dashboard) --------------
   * Every vendor also has a partner_profiles row (see organizer-vendors.php),
   * surfaced here via the same assets/js/partner-dashboard.php a stand-alone
   * stand-alone partner account uses on /organizer/partner.html.
   * -------------------------------------------------------------------- */
  function loadPartnerTab() {
    if (!ME || !ME.partner_profile) return;
    var idBadge = document.getElementById("partner-id-badge");
    if (idBadge) idBadge.textContent = ME.partner_profile.partner_id;

    postJSON("partner-dashboard.php", { action: "sales" }).then(function (r) {
      if (!r.data.ok) return;
      var t = r.data.totals;
      var statsEl = document.getElementById("partner-dashboard-stats");
      if (statsEl) {
        statsEl.innerHTML = statCard(money(t.total_earnings), "Total earnings") +
          statCard(money(t.monthly_earnings), "This month") +
          statCard(money(t.pending_payout), "Pending payout") +
          statCard(money(t.total_payout), "Already paid out");
      }
      var body = document.getElementById("partner-sales-table-body");
      if (body) {
        var rows = r.data.earnings;
        body.innerHTML = rows.length ? rows.map(function (e) {
          return "<tr><td>" + esc(e.voyage_id) + "</td><td>" + esc(e.tour_title) + "</td><td>" + esc(e.pax) + "</td>" +
            "<td>" + money(e.commission_amount) + "</td><td>" + esc(e.credited_at) + "</td>" +
            "<td>" + (e.payout_id ? badge("paid") : badge("pending")) + "</td></tr>";
        }).join("") : '<tr class="ep-org-empty-row"><td colspan="6">No referrals credited yet.</td></tr>';
      }
    });

    var input = document.getElementById("partner-send-link-input");
    var output = document.getElementById("partner-send-link-output");
    if (input && output) {
      var rebuild = function () {
        var base = input.value.trim() || (window.location.origin + "/destinations/destinations.html");
        try {
          var url = new URL(base, window.location.href);
          url.searchParams.set("ref", ME.partner_profile.partner_id);
          output.value = url.toString();
        } catch (e) {
          output.value = base + (base.indexOf("?") === -1 ? "?" : "&") + "ref=" + ME.partner_profile.partner_id;
        }
      };
      rebuild();
      input.oninput = rebuild;
      var copyBtn = document.getElementById("partner-send-link-copy");
      if (copyBtn) {
        copyBtn.onclick = function () {
          output.select();
          navigator.clipboard && navigator.clipboard.writeText(output.value)
            .then(function () { showOrgMsg(document.getElementById("partner-send-link-msg"), "Link copied to clipboard.", "success"); })
            .catch(function () { showOrgMsg(document.getElementById("partner-send-link-msg"), "Could not copy automatically — select and copy the link above.", "error"); });
        };
      }
    }
  }

  /* ---------------- Vendors (admin only, approvals.html) -------------------- */
  function loadVendors() {
    var body = document.getElementById("vendors-table-body");
    if (!body) return;
    postJSON("organizer-vendors.php", { action: "list" }).then(function (r) {
      if (!r.data.ok) return;
      var rows = r.data.vendors;
      body.innerHTML = rows.length ? rows.map(function (v) {
        var canApprove = v.review_status === "pending";
        var canSuspend = v.review_status === "approved";
        var canReinstate = v.review_status === "suspended";
        return "<tr><td>" + esc(v.organization_name) + "<br><small>" + esc(v.first_name + " " + v.last_name) + " · " + esc(v.email) + "</small></td>" +
          "<td>" + v.trip_count + "</td><td>" + money(v.total_sales) + "</td>" +
          "<td>" + badge(v.review_status) + "</td>" +
          '<td><div class="ep-org-row-actions">' +
          (canApprove ? '<button class="ep-org-btn ep-org-btn--accent" data-vendor-action="approve" data-vendor-id="' + v.user_id + '">Approve</button><button class="ep-org-btn ep-org-btn--danger" data-vendor-action="reject" data-vendor-id="' + v.user_id + '">Reject</button>' : "") +
          (canSuspend ? '<button class="ep-org-btn ep-org-btn--ghost" data-vendor-action="suspend" data-vendor-id="' + v.user_id + '">Suspend</button>' : "") +
          (canReinstate ? '<button class="ep-org-btn ep-org-btn--accent" data-vendor-action="reinstate" data-vendor-id="' + v.user_id + '">Reinstate</button>' : "") +
          '<button class="ep-org-btn ep-org-btn--danger" data-vendor-action="delete" data-vendor-id="' + v.user_id + '">Delete</button>' +
          "</div></td></tr>";
      }).join("") : '<tr class="ep-org-empty-row"><td colspan="5">No vendors yet.</td></tr>';
    });
  }
  document.addEventListener("click", function (e) {
    var act = e.target.getAttribute && e.target.getAttribute("data-vendor-action");
    if (!act) return;
    var id = e.target.getAttribute("data-vendor-id");
    if (act === "delete" && !confirm("Permanently delete this vendor account? Their trips will be archived.")) return;
    if (act === "reject" && !confirm("Reject this vendor application?")) return;
    postJSON("organizer-vendors.php", { action: act, user_id: id }).then(function () { loadVendors(); });
  });
  var onboardForm = document.getElementById("onboard-vendor-form");
  if (onboardForm) {
    var onboardMsg = document.getElementById("onboard-form-msg");
    onboardForm.addEventListener("submit", function (e) {
      e.preventDefault();
      postJSON("organizer-vendors.php", {
        action: "onboard",
        org_name: document.getElementById("ob-org").value,
        contact_fname: document.getElementById("ob-fname").value,
        contact_lname: document.getElementById("ob-lname").value,
        contact: document.getElementById("ob-contact").value,
        email: document.getElementById("ob-email").value,
        temp_password: document.getElementById("ob-password").value
      }).then(function (r) {
        showOrgMsg(onboardMsg, r.data.ok ? r.data.message : (r.data.error || "Could not onboard vendor."), r.data.ok ? "success" : "error");
        if (r.data.ok) { onboardForm.reset(); loadVendors(); }
      });
    });
  }

  /* ---------------- Partners (admin only, approvals.html) --------------------
   * A vendor's own partner_profiles row (auto-created on approval) also
   * shows up in this list — its Delete button is intentionally absent
   * (organizer-partners.php refuses it); manage that account from Vendor
   * Approvals instead, which handles both the vendor and partner side in
   * one step.
   * -------------------------------------------------------------------- */
  function loadPartners() {
    var body = document.getElementById("partners-table-body");
    if (!body) return;
    postJSON("organizer-partners.php", { action: "list" }).then(function (r) {
      if (!r.data.ok) return;
      var rows = r.data.partners;
      body.innerHTML = rows.length ? rows.map(function (p) {
        var canSuspend = p.account_status === "active";
        var canReinstate = p.account_status === "suspended";
        var isPurePartner = p.account_type === "partner";
        return "<tr><td>" + esc(p.display_name) + (p.is_company ? " <small>(company)</small>" : "") +
          "<br><small>" + esc(p.first_name + " " + p.last_name) + " · " + esc(p.email) + "</small>" +
          "<br><small>" + esc(p.partner_id) + "</small></td>" +
          "<td>" + esc(p.account_type) + "</td>" +
          '<td>' + esc(Number(p.profit_share_percent).toFixed(2)) + '%' + (p.tier_label ? ' <small>(' + esc(p.tier_label) + ')</small>' : '') + '</td>' +
          "<td>" + p.referral_count + "</td>" +
          "<td>" + money(p.pending_payout) + "</td><td>" + money(p.total_payout) + "</td>" +
          "<td>" + badge(p.account_status) + "</td>" +
          '<td><div class="ep-org-row-actions">' +
          '<button class="ep-org-btn ep-org-btn--accent" data-partner-action="edit_tier" data-partner-id="' + p.user_id + '" data-current-percent="' + p.profit_share_percent + '" data-current-label="' + esc(p.tier_label || "") + '">Edit Tier</button>' +
          (Number(p.pending_payout) > 0 ? '<button class="ep-org-btn ep-org-btn--accent" data-partner-action="run_payout" data-partner-id="' + p.user_id + '">Run Payout</button>' : "") +
          (canSuspend ? '<button class="ep-org-btn ep-org-btn--ghost" data-partner-action="suspend" data-partner-id="' + p.user_id + '">Suspend</button>' : "") +
          (canReinstate ? '<button class="ep-org-btn ep-org-btn--accent" data-partner-action="reinstate" data-partner-id="' + p.user_id + '">Reinstate</button>' : "") +
          (isPurePartner ? '<button class="ep-org-btn ep-org-btn--danger" data-partner-action="delete" data-partner-id="' + p.user_id + '">Delete</button>' : "") +
          "</div></td></tr>";
      }).join("") : '<tr class="ep-org-empty-row"><td colspan="8">No partners yet — vendors get one automatically when approved, or onboard a stand-alone partner below.</td></tr>';
    });
  }
  document.addEventListener("click", function (e) {
    var act = e.target.getAttribute && e.target.getAttribute("data-partner-action");
    if (!act) return;
    var id = e.target.getAttribute("data-partner-id");

    if (act === "edit_tier") {
      var currentPercent = e.target.getAttribute("data-current-percent");
      var currentLabel = e.target.getAttribute("data-current-label") || "";
      var newPercent = prompt("New profit-share percent (30–50). This only applies to future referrals — nothing already credited changes:", currentPercent);
      if (newPercent === null) return;
      var newLabel = prompt("Tier label (optional, e.g. \"Gold\"):", currentLabel) || "";
      postJSON("organizer-partners.php", { action: "update_tier", user_id: id, profit_share_percent: newPercent, tier_label: newLabel })
        .then(function (r) {
          if (!r.data.ok) alert(r.data.error || "Could not update tier.");
          loadPartners();
        });
      return;
    }

    if (act === "run_payout") {
      var periodStart = prompt("Payout period start (YYYY-MM-DD):", "");
      if (!periodStart) return;
      var periodEnd = prompt("Payout period end (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
      if (!periodEnd) return;
      postJSON("organizer-partners.php", { action: "run_payout", user_id: id, period_start: periodStart, period_end: periodEnd })
        .then(function (r) {
          alert(r.data.ok ? r.data.message : (r.data.error || "Could not run payout."));
          loadPartners();
        });
      return;
    }

    if (act === "delete" && !confirm("Permanently delete this partner account?")) return;
    if (act === "suspend" || act === "reinstate" || act === "delete") {
      postJSON("organizer-partners.php", { action: act, user_id: id }).then(function (r) {
        if (!r.data.ok) alert(r.data.error || "Could not complete that action.");
        loadPartners();
      });
    }
  });
  var onboardPartnerForm = document.getElementById("onboard-partner-form");
  if (onboardPartnerForm) {
    var onboardPartnerMsg = document.getElementById("onboard-partner-form-msg");
    onboardPartnerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      postJSON("organizer-partners.php", {
        action: "onboard",
        display_name: document.getElementById("op-display-name").value,
        is_company: document.getElementById("op-is-company").checked,
        contact_fname: document.getElementById("op-fname").value,
        contact_lname: document.getElementById("op-lname").value,
        contact: document.getElementById("op-contact").value,
        email: document.getElementById("op-email").value,
        temp_password: document.getElementById("op-password").value,
        profit_share_percent: document.getElementById("op-percent").value,
        tier_label: document.getElementById("op-tier-label").value
      }).then(function (r) {
        showOrgMsg(onboardPartnerMsg, r.data.ok ? r.data.message : (r.data.error || "Could not onboard partner."), r.data.ok ? "success" : "error");
        if (r.data.ok) { onboardPartnerForm.reset(); loadPartners(); }
      });
    });
  }

  boot();
})();
