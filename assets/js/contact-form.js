/**
 * contact-form.js
 * ------------------------------------------------------------------
 * Submits /contact/contact.html's #contact_form to connect.php via
 * fetch() instead of a full-page POST, so the visitor sees an inline
 * status message rather than a raw JSON response. Falls back to a
 * normal form submit if JavaScript fails to load (the form's own
 * action="../assets/js/connect.php" method="post" still works).
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";
  var form = document.getElementById("contact_form");
  var msgEl = document.getElementById("ep-contact-msg");
  if (!form) return;

  // ---- Consent checkbox gates the submit button -------------------
  // The checkbox already carries `required`, so a non-JS visitor is
  // still blocked by native form validation; this just mirrors that
  // as a visibly disabled button for everyone else.
  var consent = document.getElementById("contact-consent");
  var submitBtn = document.getElementById("submit-a");
  if (consent && submitBtn) {
    var syncSubmitState = function () { submitBtn.disabled = !consent.checked; };
    consent.addEventListener("change", syncSubmitState);
    syncSubmitState();
  }

  function showMsg(text, state) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.setAttribute("data-state", state);
  }

  // ---- Autofill Name/Email/Contact for a signed-in visitor ----------
  // Same treatment as the trip enquiry form on destinations/tour-details.html
  // (assets/js/tour-render.js) — editable afterwards, not locked; silently
  // does nothing if assets/js/me.php can't be reached or no one is signed in.
  fetch("../assets/js/me.php", { credentials: "same-origin" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data || !data.ok || !data.signed_in) return;
      var user = data.user;
      var nameField = document.getElementById("name");
      var emailField = document.getElementById("email");
      var contactField = document.getElementById("contact");
      if (nameField && !nameField.value) nameField.value = user.full_name || "";
      if (emailField && !emailField.value) emailField.value = user.email || "";
      if (contactField && !contactField.value) contactField.value = user.contact || "";
    })
    .catch(function () { /* not signed in / static preview — leave the form blank */ });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (consent && !consent.checked) return; // native `required` already blocks this; belt & suspenders
    if (submitBtn) submitBtn.disabled = true;
    showMsg("Sending your message…", "");

    fetch(form.getAttribute("action"), {
      method: "POST",
      body: new FormData(form),
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin"
    })
      .then(function (res) {
        return res.json().catch(function () { return { ok: false, error: "Unexpected server response." }; });
      })
      .then(function (data) {
        if (data.ok) {
          showMsg(data.message || "Thank you! We will get back to you soon.", "success");
          form.reset(); // also unchecks the consent box — syncSubmitState() below re-disables the button to match
        } else {
          showMsg(data.error || "Something went wrong. Please try again.", "error");
        }
      })
      .catch(function () {
        showMsg("Network error — please check your connection and try again.", "error");
      })
      .finally(function () {
        if (consent && submitBtn) { syncSubmitState(); } else if (submitBtn) { submitBtn.disabled = false; }
      });
  });
})();
