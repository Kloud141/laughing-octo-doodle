/* ============================================================
   Embark Pedia :: My Account (customer profile) page behaviour
   Scoped to /account/ only. Talks to assets/js/me.php (read the
   signed-in user) and assets/js/customer-profile.php (the three
   update_name / update_contact / change_password actions) — see
   that file's header comment for the request shape.
   ============================================================ */
(function () {
  "use strict";

  var API = "../assets/js/";

  function setError(fieldEl, message) {
    if (!fieldEl) return;
    fieldEl.classList.toggle("has-error", !!message);
    var errEl = fieldEl.querySelector(".ep-field__error");
    if (errEl) errEl.textContent = message || "";
  }
  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = "ep-form-msg is-visible " + (type === "success" ? "is-success" : "is-error");
  }
  function postJSON(file, body) {
    return fetch(API + file, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {})
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; });
    });
  }

  var pageMsg = document.getElementById("ep-acct-msg");
  var splitBanner = document.getElementById("ep-acct-split-banner");
  var fullNameWrap = document.getElementById("ep-acct-fullname-wrap");
  var splitWrap = document.getElementById("ep-acct-split-wrap");
  var fullNameInput = document.getElementById("acct-fullname");
  var fnameInput = document.getElementById("acct-fname");
  var lnameInput = document.getElementById("acct-lname");

  // ---- Load the signed-in user; bounce anyone who isn't a customer ----
  fetch(API + "me.php", { credentials: "same-origin" })
    .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
    .then(function (data) {
      if (!data || !data.ok || !data.signed_in) {
        window.location.href = "../auth/login.html";
        return;
      }
      var user = data.user;
      if (user.account_type !== "customer") {
        // Vendor/admin/partner sessions land here if they follow a stale
        // bookmark — send them to the portal that's actually theirs.
        var dest = "../organizer/authoring.html";
        if (user.account_type === "admin") dest = "../organizer/approvals.html";
        else if (user.account_type === "partner") dest = "../organizer/partner.html";
        window.location.href = dest;
        return;
      }
      if (user.must_change_password) {
        window.location.href = "../auth/change-password.html";
        return;
      }

      document.getElementById("acct-contact").value = user.contact || "";
      document.getElementById("acct-email").value = user.email || "";

      if (user.name_is_split) {
        // Normal state: one combined, freely-editable Full Name field.
        fullNameInput.value = user.full_name || "";
      } else {
        // First-login prompt: force the two-field split once. The
        // combined field is hidden entirely rather than shown alongside
        // it, so there's exactly one place to type the name — matching
        // "give them a prompt to edit it to First Name and Last Name".
        splitBanner.hidden = false;
        fullNameWrap.hidden = true;
        fullNameInput.required = false;
        splitWrap.hidden = false;
        fnameInput.required = true;
        lnameInput.required = true;
        fnameInput.value = user.first_name || "";
        lnameInput.value = user.last_name || "";
      }
    })
    .catch(function () {
      showMsg(pageMsg, "Could not load your account. Please refresh the page.", "error");
    });

  // ---- Name form (either the combined field, or the one-time split) ----
  var nameForm = document.getElementById("ep-acct-name-form");
  nameForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var body;
    if (!splitWrap.hidden) {
      var fname = fnameInput.value.trim();
      var lname = lnameInput.value.trim();
      var ok = true;
      if (!fname) { setError(fnameInput.closest(".ep-field"), "First name is required."); ok = false; }
      else setError(fnameInput.closest(".ep-field"), "");
      if (!lname) { setError(lnameInput.closest(".ep-field"), "Last name is required."); ok = false; }
      else setError(lnameInput.closest(".ep-field"), "");
      if (!ok) return;
      body = { action: "update_name", first_name: fname, last_name: lname };
    } else {
      var full = fullNameInput.value.trim();
      if (!full) { setError(fullNameWrap, "Enter your name."); return; }
      setError(fullNameWrap, "");
      body = { action: "update_name", full_name: full };
    }

    var btn = nameForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    postJSON("customer-profile.php", body).then(function (data) {
      if (data.ok) {
        showMsg(pageMsg, data.message || "Name updated.", "success");
        // Once saved, switch permanently to the combined-field view —
        // the one-time split is done.
        if (!splitWrap.hidden) {
          splitBanner.hidden = true;
          splitWrap.hidden = true;
          fullNameWrap.hidden = false;
          fullNameInput.required = true;
          fullNameInput.value = (data.first_name || "") + " " + (data.last_name || "");
        }
      } else {
        showMsg(pageMsg, data.error || "Could not update your name.", "error");
      }
    }).catch(function () {
      showMsg(pageMsg, "Network error — please try again.", "error");
    }).finally(function () { btn.disabled = false; });
  });

  // ---- Contact + email form ----
  var contactForm = document.getElementById("ep-acct-contact-form");
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var contactInput = document.getElementById("acct-contact");
    var emailInput = document.getElementById("acct-email");
    var contact = contactInput.value.trim();
    var email = emailInput.value.trim();
    var ok = true;

    if (!/^[0-9+\-\s]{7,15}$/.test(contact)) {
      setError(contactInput.closest(".ep-field"), "Enter a valid contact number.");
      ok = false;
    } else setError(contactInput.closest(".ep-field"), "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(emailInput.closest(".ep-field"), "Enter a valid email address.");
      ok = false;
    } else setError(emailInput.closest(".ep-field"), "");

    if (!ok) return;

    var btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    postJSON("customer-profile.php", { action: "update_contact", contact: contact, email: email })
      .then(function (data) {
        showMsg(pageMsg, data.ok ? (data.message || "Contact details updated.") : (data.error || "Could not save your details."), data.ok ? "success" : "error");
      })
      .catch(function () { showMsg(pageMsg, "Network error — please try again.", "error"); })
      .finally(function () { btn.disabled = false; });
  });

  // ---- Change password form ----
  var passwordForm = document.getElementById("ep-acct-password-form");
  passwordForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var currentInput = document.getElementById("acct-current-password");
    var newInput = document.getElementById("acct-new-password");
    var confirmInput = document.getElementById("acct-confirm-password");
    var ok = true;

    if (!currentInput.value) { setError(currentInput.closest(".ep-field"), "Enter your current password."); ok = false; }
    else setError(currentInput.closest(".ep-field"), "");

    if (newInput.value.length < 8) { setError(newInput.closest(".ep-field"), "Use at least 8 characters."); ok = false; }
    else setError(newInput.closest(".ep-field"), "");

    if (confirmInput.value !== newInput.value || !confirmInput.value) {
      setError(confirmInput.closest(".ep-field"), "Passwords do not match.");
      ok = false;
    } else setError(confirmInput.closest(".ep-field"), "");

    if (!ok) return;

    var btn = passwordForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    postJSON("customer-profile.php", {
      action: "change_password",
      current_password: currentInput.value,
      new_password: newInput.value,
      confirm: confirmInput.value
    }).then(function (data) {
      showMsg(pageMsg, data.ok ? (data.message || "Password changed.") : (data.error || "Could not change your password."), data.ok ? "success" : "error");
      if (data.ok) passwordForm.reset();
    }).catch(function () { showMsg(pageMsg, "Network error — please try again.", "error"); })
      .finally(function () { btn.disabled = false; });
  });

  // ---- Danger Zone: deactivate / delete ----
  var dangerMsg = document.getElementById("ep-acct-danger-msg");
  var deactivateBtn = document.getElementById("ep-acct-deactivate-btn");
  var deleteBtn = document.getElementById("ep-acct-delete-btn");
  var deleteConfirmPanel = document.getElementById("ep-acct-delete-confirm");
  var deletePasswordInput = document.getElementById("acct-delete-password");
  var deleteConfirmBtn = document.getElementById("ep-acct-delete-confirm-btn");
  var deleteCancelBtn = document.getElementById("ep-acct-delete-cancel-btn");

  deactivateBtn.addEventListener("click", function () {
    if (!window.confirm("Deactivate your account? You'll be signed out and will need support to reactivate it.")) return;
    deactivateBtn.disabled = true;
    postJSON("customer-profile.php", { action: "deactivate_account" }).then(function (data) {
      if (data.ok) {
        window.location.href = "../index.html";
      } else {
        showMsg(dangerMsg, data.error || "Could not deactivate your account.", "error");
        deactivateBtn.disabled = false;
      }
    }).catch(function () {
      showMsg(dangerMsg, "Network error — please try again.", "error");
      deactivateBtn.disabled = false;
    });
  });

  // "Delete" opens an inline password-confirmation panel rather than
  // acting immediately — this is the one action here with no undo.
  deleteBtn.addEventListener("click", function () {
    deleteConfirmPanel.hidden = false;
    deletePasswordInput.value = "";
    setError(deletePasswordInput.closest(".ep-field"), "");
    deletePasswordInput.focus();
  });
  deleteCancelBtn.addEventListener("click", function () {
    deleteConfirmPanel.hidden = true;
  });
  deleteConfirmBtn.addEventListener("click", function () {
    if (!deletePasswordInput.value) {
      setError(deletePasswordInput.closest(".ep-field"), "Enter your password to confirm.");
      return;
    }
    setError(deletePasswordInput.closest(".ep-field"), "");
    deleteConfirmBtn.disabled = true;
    postJSON("customer-profile.php", { action: "delete_account", current_password: deletePasswordInput.value })
      .then(function (data) {
        if (data.ok) {
          window.location.href = "../index.html";
        } else {
          setError(deletePasswordInput.closest(".ep-field"), data.error || "Could not delete your account.");
          deleteConfirmBtn.disabled = false;
        }
      })
      .catch(function () {
        showMsg(dangerMsg, "Network error — please try again.", "error");
        deleteConfirmBtn.disabled = false;
      });
  });
})();
