/* ============================================================
   Embark Pedia :: Login / Sign Up page behaviour
   Scoped to /auth/ only. Client-side validation runs first (fast
   feedback, no round trip for empty/malformed fields); once that
   passes, the real submit goes to assets/js/login.php /
   assets/js/signup.php via fetch() — see database/README.md for the
   endpoint contract and database/schema.sql for the `users` table.
   SSO (Google/Outlook) below is still a stub: wiring Google
   Identity Services / MSAL.js is tracked as future scope.
   ============================================================ */
(function () {
  "use strict";

  var tabs = document.querySelectorAll(".ep-auth-tab");
  var tabsWrap = document.querySelector(".ep-auth-tabs");
  var panels = {
    login: document.getElementById("ep-panel-login"),
    signup: document.getElementById("ep-panel-signup")
  };

  function activate(name) {
    tabs.forEach(function (t) {
      var isActive = t.getAttribute("data-tab") === name;
      t.setAttribute("aria-selected", String(isActive));
      t.tabIndex = isActive ? 0 : -1;
    });
    tabsWrap.setAttribute("data-active", name);
    Object.keys(panels).forEach(function (key) {
      panels[key].hidden = key !== name;
    });
    var toFocus = panels[name].querySelector("input, select, button");
    if (toFocus) toFocus.focus({ preventScroll: true });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { activate(tab.getAttribute("data-tab")); });
  });
  document.querySelectorAll("[data-switch-to]").forEach(function (btn) {
    btn.addEventListener("click", function () { activate(btn.getAttribute("data-switch-to")); });
  });

  /* ---- password show/hide ---- */
  document.querySelectorAll(".ep-password-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = document.getElementById(btn.getAttribute("data-target"));
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.classList.toggle("is-visible", show);
    });
  });

  /* ---- password strength meter (signup only) ---- */
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

  /* ---- canvas captcha ---- */
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
      // noise lines
      for (var n = 0; n < 5; n++) {
        ctx.strokeStyle = "rgba(74,44,58," + (0.15 + Math.random() * 0.15) + ")";
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
      }
      // characters
      var spacing = w / (value.length + 1);
      for (var i2 = 0; i2 < value.length; i2++) {
        ctx.save();
        var x = spacing * (i2 + 1);
        var y = h / 2 + (Math.random() * 8 - 4);
        ctx.translate(x, y);
        ctx.rotate((Math.random() * 0.5 - 0.25));
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

  var loginCaptcha = null; // login has no captcha per spec (kept simple/frictionless)
  var signupCaptcha = makeCaptcha("su-captcha-canvas");
  var refreshBtn = document.getElementById("su-captcha-refresh");
  if (refreshBtn && signupCaptcha) {
    refreshBtn.addEventListener("click", function () {
      signupCaptcha.refresh();
      document.getElementById("su-captcha-input").value = "";
    });
  }

  /* ---- validation helpers ---- */
  function setError(fieldEl, message) {
    fieldEl.classList.toggle("has-error", !!message);
    var errEl = fieldEl.querySelector(".ep-field__error");
    if (errEl) errEl.textContent = message || "";
  }
  function showMsg(el, text, type) {
    el.textContent = "";
    var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 16 16");
    icon.innerHTML = type === "success"
      ? '<path d="M2 8l4 4 8-8" fill="none" stroke="currentColor" stroke-width="2"/>'
      : '<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4v5M8 11h.01" stroke="currentColor" stroke-width="1.5"/>';
    el.appendChild(icon);
    el.appendChild(document.createTextNode(text));
    el.className = "ep-form-msg is-visible " + (type === "success" ? "is-success" : "is-error");
  }
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---- Login submit ---- */
  var loginForm = document.getElementById("ep-login-form");
  var loginMsg = document.getElementById("ep-login-msg");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailField = document.getElementById("li-email").closest(".ep-field");
      var pwField = document.getElementById("li-password").closest(".ep-field");
      var email = document.getElementById("li-email").value.trim();
      var pw = document.getElementById("li-password").value;
      var ok = true;

      if (!emailRe.test(email)) { setError(emailField, "Enter a valid email address."); ok = false; }
      else setError(emailField, "");

      if (!pw) { setError(pwField, "Password is required."); ok = false; }
      else setError(pwField, "");

      if (!ok) { showMsg(loginMsg, "Please fix the errors below.", "error"); return; }

      var submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      showMsg(loginMsg, "Signing in…", "success");

      fetch("../assets/js/login.php", {
        method: "POST",
        body: new FormData(loginForm),
        credentials: "same-origin"
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; }); })
        .then(function (data) {
          if (data.ok) {
            showMsg(loginMsg, data.message || "Signed in successfully.", "success");
            window.location.href = data.redirect || "../index.html";
          } else {
            showMsg(loginMsg, data.error || "Incorrect email or password.", "error");
          }
        })
        .catch(function () { showMsg(loginMsg, "Network error — please try again.", "error"); })
        .finally(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  }

  /* ---- Sign up submit ---- */
  var signupForm = document.getElementById("ep-signup-form");
  var signupMsg = document.getElementById("ep-signup-msg");
  if (signupForm) {
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      function req(id, message, extraTest) {
        var input = document.getElementById(id);
        var field = input.closest(".ep-field");
        var v = input.value.trim();
        if (!v || (extraTest && !extraTest(v))) { setError(field, message); ok = false; }
        else setError(field, "");
        return v;
      }

      req("su-fname", "First name is required.");
      req("su-lname", "Last name is required.");
      var age = req("su-age", "Enter a valid age (13–120).", function (v) {
        var n = Number(v); return n >= 13 && n <= 120;
      });
      req("su-contact", "Enter a valid contact number (7–15 digits).", function (v) {
        return /^[0-9+\-\s]{7,15}$/.test(v);
      });
      var genderInput = document.getElementById("su-gender");
      if (!genderInput.value) { setError(genderInput.closest(".ep-field"), "Please select a gender."); ok = false; }
      else setError(genderInput.closest(".ep-field"), "");

      req("su-email", "Enter a valid email address.", function (v) { return emailRe.test(v); });

      var pw = document.getElementById("su-password").value;
      var pwField = document.getElementById("su-password").closest(".ep-field");
      if (pw.length < 8) { setError(pwField, "Use at least 8 characters."); ok = false; }
      else setError(pwField, "");

      var confirm = document.getElementById("su-confirm").value;
      var confirmField = document.getElementById("su-confirm").closest(".ep-field");
      if (confirm !== pw || !confirm) { setError(confirmField, "Passwords do not match."); ok = false; }
      else setError(confirmField, "");

      var captchaInput = document.getElementById("su-captcha-input");
      var captchaField = captchaInput.closest(".ep-field");
      if (!signupCaptcha || captchaInput.value.trim().toUpperCase() !== signupCaptcha.getValue()) {
        setError(captchaField, "Captcha does not match.");
        ok = false;
      } else {
        setError(captchaField, "");
      }

      var terms = document.getElementById("su-terms");
      if (!terms.checked) { ok = false; showMsg(signupMsg, "Please accept the Terms & Conditions.", "error"); }

      if (!ok) {
        if (signupCaptcha) { signupCaptcha.refresh(); captchaInput.value = ""; }
        if (!terms.checked) return;
        showMsg(signupMsg, "Please fix the errors below.", "error");
        return;
      }

      var signupBtn = signupForm.querySelector('button[type="submit"]');
      if (signupBtn) signupBtn.disabled = true;
      showMsg(signupMsg, "Creating your account…", "success");

      fetch("../assets/js/signup.php", {
        method: "POST",
        body: new FormData(signupForm),
        credentials: "same-origin"
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; }); })
        .then(function (data) {
          if (data.ok) {
            showMsg(signupMsg, data.message || "Account created.", "success");
            window.location.href = data.redirect || "../index.html";
          } else {
            showMsg(signupMsg, data.error || "Could not create the account. Please check your details and try again.", "error");
            if (signupCaptcha) { signupCaptcha.refresh(); captchaInput.value = ""; }
          }
        })
        .catch(function () { showMsg(signupMsg, "Network error — please try again.", "error"); })
        .finally(function () { if (signupBtn) signupBtn.disabled = false; });
    });
  }

  /* ---- Forgot password panel (shown over the login tab, not part of
     the login/signup tab system above — reached via the "Forgot
     password?" link, not a tab button) ---- */
  var forgotOpen = document.getElementById("ep-forgot-open");
  var forgotClose = document.getElementById("ep-forgot-close");
  var forgotPanel = document.getElementById("ep-panel-forgot");
  var loginPanelEl = document.getElementById("ep-panel-login");
  var forgotForm = document.getElementById("ep-forgot-form");
  var forgotMsg = document.getElementById("ep-forgot-msg");
  if (forgotOpen && forgotPanel && loginPanelEl) {
    forgotOpen.addEventListener("click", function (e) {
      e.preventDefault();
      if (tabsWrap) tabsWrap.hidden = true;
      loginPanelEl.hidden = true;
      forgotPanel.hidden = false;
      var toFocus = forgotPanel.querySelector("input");
      if (toFocus) toFocus.focus({ preventScroll: true });
    });
  }
  if (forgotClose && forgotPanel && loginPanelEl) {
    forgotClose.addEventListener("click", function () {
      forgotPanel.hidden = true;
      if (tabsWrap) tabsWrap.hidden = false;
      loginPanelEl.hidden = false;
    });
  }
  if (forgotForm) {
    forgotForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailField = document.getElementById("fp-email").closest(".ep-field");
      var email = document.getElementById("fp-email").value.trim();
      if (!emailRe.test(email)) {
        setError(emailField, "Enter a valid email address.");
        return;
      }
      setError(emailField, "");

      var submitBtn = forgotForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      showMsg(forgotMsg, "Sending…", "success");

      // "../assets/js/" matches the relative path every other fetch() on
      // this page uses (login.php / signup.php above) — this file is
      // only ever loaded from /auth/, same depth as those.
      fetch("../assets/js/forgot-password.php", {
        method: "POST",
        body: new FormData(forgotForm),
        credentials: "same-origin"
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; }); })
        .then(function (data) {
          showMsg(forgotMsg, data.ok ? (data.message || "If an account exists for that email, a new temporary password has been sent.") : (data.error || "Something went wrong. Please try again."), data.ok ? "success" : "error");
          if (data.ok) forgotForm.reset();
        })
        .catch(function () { showMsg(forgotMsg, "Network error — please try again.", "error"); })
        .finally(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  }

  /* ---- Change password (forced step after a forgot-password reset,
     /auth/change-password.html — feature-detected since auth.js loads
     on every /auth/ page but this form only exists on that one) ---- */
  var cpForm = document.getElementById("ep-change-password-form");
  if (cpForm) {
    var cpMsg = document.getElementById("ep-cp-msg");
    var cpPwInput = document.getElementById("cp-password");
    var cpStrengthEl = document.getElementById("cp-strength");
    var cpStrengthLabel = document.getElementById("cp-strength-label");
    if (cpPwInput && cpStrengthEl) {
      cpPwInput.addEventListener("input", function () {
        var level = scorePassword(cpPwInput.value);
        cpStrengthEl.setAttribute("data-level", String(level));
        var labels = ["", "Weak", "Fair", "Good", "Strong"];
        cpStrengthLabel.textContent = cpPwInput.value ? labels[level] : "";
      });
    }
    cpForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var pwField = document.getElementById("cp-password").closest(".ep-field");
      var confirmField = document.getElementById("cp-confirm").closest(".ep-field");
      var pw = document.getElementById("cp-password").value;
      var confirm = document.getElementById("cp-confirm").value;
      var ok = true;

      if (pw.length < 8) { setError(pwField, "Use at least 8 characters."); ok = false; }
      else setError(pwField, "");
      if (confirm !== pw || !confirm) { setError(confirmField, "Passwords do not match."); ok = false; }
      else setError(confirmField, "");

      if (!ok) { showMsg(cpMsg, "Please fix the errors below.", "error"); return; }

      var submitBtn = cpForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      showMsg(cpMsg, "Saving…", "success");

      fetch("../assets/js/change-password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ new_password: pw, confirm: confirm })
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; }); })
        .then(function (data) {
          if (data.ok) {
            showMsg(cpMsg, data.message || "Password updated.", "success");
            window.location.href = data.redirect || "../index.html";
          } else {
            showMsg(cpMsg, data.error || "Could not update your password.", "error");
          }
        })
        .catch(function () { showMsg(cpMsg, "Network error — please try again.", "error"); })
        .finally(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  }

  /* ---- SSO buttons (no backend wired up in this template) ---- */
  document.querySelectorAll(".ep-sso-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      // TODO: Google -> Google Identity Services (accounts.google.com/gsi/client)
      // TODO: Outlook -> Microsoft identity platform (MSAL.js)
      var provider = btn.getAttribute("data-provider");
      var msgEl = btn.closest(".ep-auth-panel").querySelector(".ep-form-msg");
      showMsg(msgEl, provider + " sign-in isn't connected in this demo yet.", "error");
    });
  });
})();
