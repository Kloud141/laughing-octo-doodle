/**
 * mock-backend.js
 * ------------------------------------------------------------------
 * A browser-only stand-in for every assets/js/*.php endpoint this
 * project talks to — both the organizer-*.php ones (/organizer/) AND
 * the public/customer ones (/auth/, /account/, the tour-details.html
 * enquiry form, and the signed-in header state in chrome.js) — so you
 * can click through the whole site with NO PHP server and NO database.
 * It works by patching window.fetch: any request whose URL contains
 * one of the known *.php filenames is answered from an in-memory store
 * (persisted to localStorage) instead of hitting the network. Every
 * other request (css/js/images/fonts) passes through to the real
 * fetch untouched.
 *
 * HOW TO USE
 * ------------------------------------------------------------------
 * Add ONE script tag, loaded BEFORE the page's own organizer.js /
 * auth.js / profile.js / chrome.js / tour-render.js, on any page you
 * want to click through without a backend — most usefully:
 *   organizer/login.html, organizer/authoring.html,
 *   organizer/approvals.html, organizer/partner.html,
 *   auth/login.html, auth/change-password.html,
 *   account/profile.html, destinations/tour-details.html
 * and really any other page, purely so chrome.js's header "My Account"
 * swap has something to talk to.
 *
 *   <script src="../assets/js/mock-backend.js"></script>
 *   <script src="auth.js"></script>   (or organizer.js / profile.js / etc.)
 *
 * No other file in the project needs to change. Nothing here ever
 * calls a real server, so it is safe to leave in a local/demo checkout.
 *
 * TRIAL LOGINS (seeded the first time this runs in a browser)
 * ------------------------------------------------------------------
 *   Admin    : admin.trial@embarkpedia.com    / TrialAdmin#2026
 *   Vendor   : vendor.trial@embarkpedia.com   / TrialVendor#2026   (pre-approved,
 *              already has one trip sitting in "pending_review" so you can
 *              test the review queue immediately)
 *   Partner  : partner.trial@embarkpedia.com  / TrialPartner#2026
 *   Customer : customer.trial@embarkpedia.com / TrialCustomer#2026 (sign in at
 *              /auth/login.html, then open /account/profile.html — its
 *              name is seeded un-split on purpose, so you'll immediately
 *              see the one-time "confirm your first and last name" step)
 *
 * Passwords are stored in plain text in this mock store on purpose —
 * there is no real backend here to hash against. This file must never
 * be deployed anywhere real; it is a local click-through aid only.
 *
 * RESETTING
 * ------------------------------------------------------------------
 * Data lives in localStorage under "ep_mock_db_v1" and the current
 * login under "ep_mock_session_v1". From the browser console:
 *   EP_MOCK.reset()   -> wipes both back to the seed data above
 *   EP_MOCK.db        -> inspect/edit the live store directly
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var DB_KEY = "ep_mock_db_v1";
  var SESSION_KEY = "ep_mock_session_v1";

  // ---- small helpers ------------------------------------------------
  function rid(len) {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var s = "";
    for (var i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function genArticleId() {
    var firstLen = [5, 6, 7][Math.floor(Math.random() * 3)];
    return rid(firstLen) + "-" + rid(12 - firstLen);
  }
  function genVoyageId() { return rid(6); }
  function nowStamp() { return new Date().toISOString().slice(0, 19).replace("T", " "); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---- seed data ------------------------------------------------------
  function seedData() {
    return {
      nextUserId: 5,
      nextTourId: 2,
      nextRoamId: 1,
      nextSaleId: 1,
      nextEnquiryId: 1,
      users: [
        { id: 1, first_name: "Trial", last_name: "Admin", email: "admin.trial@embarkpedia.com",
          password: "TrialAdmin#2026", contact: "+91 90000 00001", account_type: "admin", account_status: "active",
          name_is_split: 1, must_change_password: 0 },
        { id: 2, first_name: "Trial", last_name: "Vendor", email: "vendor.trial@embarkpedia.com",
          password: "TrialVendor#2026", contact: "+91 90000 00002", account_type: "vendor", account_status: "active",
          name_is_split: 1, must_change_password: 0 },
        { id: 3, first_name: "Trial", last_name: "Partner", email: "partner.trial@embarkpedia.com",
          password: "TrialPartner#2026", contact: "+91 90000 00003", account_type: "partner", account_status: "active",
          name_is_split: 1, must_change_password: 0 },
        // Customer trial account — see /account/profile.html + me.php /
        // customer-profile.php. name_is_split starts at 0 ON PURPOSE
        // (unlike the three accounts above) so logging in with it and
        // opening My Account immediately shows the one-time "split your
        // name" prompt described in database/README.md, instead of
        // requiring a second (real, non-mock) account to see it at all.
        { id: 4, first_name: "Trial", last_name: "Customer", email: "customer.trial@embarkpedia.com",
          password: "TrialCustomer#2026", contact: "+91 90000 00004", account_type: "customer", account_status: "active",
          name_is_split: 0, must_change_password: 0 }
      ],
      vendor_profiles: {
        2: { user_id: 2, organization_name: "Trial Travels Pvt. Ltd.", business_email: "vendor.trial@embarkpedia.com",
             business_phone: "+91 90000 00002", website_url: "", business_description: "",
             review_status: "approved", reviewed_at: nowStamp() }
      },
      partner_profiles: {
        2: { user_id: 2, partner_id: "EP-TRIAL-VENDOR", display_name: "Trial Travels Pvt. Ltd.",
             is_company: 1, profit_share_percent: 30, tier_label: "Standard" },
        3: { user_id: 3, partner_id: "EP-TRIAL-PARTNER", display_name: "Trial Partner",
             is_company: 0, profit_share_percent: 35, tier_label: "Trial" }
      },
      destinations: [
        { id: 1, slug: "kerala", name: "Kerala", region: "Indian" },
        { id: 2, slug: "rajasthan", name: "Rajasthan", region: "Indian" }
      ],
      tours: [
        {
          id: 1, destination_id: 1, destination_name: "Kerala",
          title: "Munnar Hills & Alleppey Houseboat Escape",
          article_id: "nvied0-tzdwh0", voyage_id: "v2235h",
          days: 6, nights: 5, category: "Couple", price_inr: 20200,
          price_with_breakfast_inr: null, price_with_breakfast_dinner_inr: null,
          hotel_type: null, image_url: null,
          status: "pending_review", submitted_by_user_id: 2,
          vendor_first_name: "Trial", vendor_last_name: "Vendor",
          reviewed_by_user_id: null, reviewed_at: null,
          inclusions: [
            { item_text: "Private AC transfers between Cochin, Munnar and Alleppey" },
            { item_text: "Daily breakfast at all stays" },
            { item_text: "One night deluxe houseboat stay with all meals included" }
          ],
          exclusions: [
            { item_text: "Airfare or train fare to/from Cochin" },
            { item_text: "Entry tickets to optional sightseeing spots" },
            { item_text: "Personal expenses and tips" }
          ],
          itinerary: [
            { day_number: 1, title: "Arrival in Cochin", plan_text: "Arrive in Cochin, transfer to Munnar by road through spice plantations. Evening at leisure in the hills.", is_highlight: 0, note_text: null },
            { day_number: 2, title: "Munnar Tea Hills", plan_text: "Visit tea museum, Eravikulam National Park and Mattupetty Dam. Overnight in Munnar.", is_highlight: 1, note_text: "Carry warm clothing — hill evenings are cold." },
            { day_number: 3, title: "Munnar to Thekkady", plan_text: "Drive to Thekkady via spice gardens. Evening boat ride on Periyar Lake.", is_highlight: 0, note_text: null },
            { day_number: 4, title: "Thekkady to Alleppey", plan_text: "Transfer to Alleppey and board a private deluxe houseboat for an overnight backwater cruise.", is_highlight: 1, note_text: null },
            { day_number: 5, title: "Alleppey to Cochin", plan_text: "Disembark after breakfast, transfer to Cochin for departure.", is_highlight: 0, note_text: null }
          ],
          stays: [
            { checkin_number: 1, hotel_name: "Misty Meadows Resort, Munnar", checkin_day: 1, checkout_day: 3, notes: null },
            { checkin_number: 2, hotel_name: "Spice Grove Resort, Thekkady", checkin_day: 3, checkout_day: 4, notes: null },
            { checkin_number: 3, hotel_name: "Deluxe Premium Houseboat, Alleppey", checkin_day: 4, checkout_day: 5, notes: "One-night stay, all meals on board" }
          ]
        }
      ],
      roams: [],
      trip_enquiries: [],
      contact_messages: [],
      sales: [],
      partner_earnings: [
        { id: 1, partner_user_id: 3, voyage_id: "v2235h",
          tour_title: "Munnar Hills & Alleppey Houseboat Escape", pax: 2,
          base_amount: 40400, profit_share_percent_applied: 35,
          commission_amount: 14140, credited_at: nowStamp(), payout_id: null }
      ],
      partner_payouts: []
    };
  }

  function loadDB() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to reseed */ }
    var d = seedData();
    saveDB(d);
    return d;
  }
  function saveDB(d) { localStorage.setItem(DB_KEY, JSON.stringify(d)); }
  var DB = loadDB();
  // Upgrade stores created by the earlier vendor/admin-only mock so the
  // Partner login and dashboard work without asking users to clear storage.
  (function ensurePartnerDemoData() {
    var changed = false;
    DB.users = DB.users || [];
    DB.partner_profiles = DB.partner_profiles || {};
    DB.partner_earnings = DB.partner_earnings || [];
    DB.partner_payouts = DB.partner_payouts || [];
    var vendor = DB.users.filter(function (u) { return u.email === "vendor.trial@embarkpedia.com"; })[0];
    if (vendor && !DB.partner_profiles[vendor.id]) {
      DB.partner_profiles[vendor.id] = { user_id: vendor.id, partner_id: "EP-TRIAL-VENDOR",
        display_name: "Trial Travels Pvt. Ltd.", is_company: 1, profit_share_percent: 30, tier_label: "Standard" };
      changed = true;
    }
    var partner = DB.users.filter(function (u) { return u.email === "partner.trial@embarkpedia.com"; })[0];
    if (!partner) {
      var newId = Math.max(Number(DB.nextUserId) || 1, DB.users.reduce(function (max, u) {
        return Math.max(max, Number(u.id) || 0);
      }, 0) + 1);
      partner = { id: newId, first_name: "Trial", last_name: "Partner",
        email: "partner.trial@embarkpedia.com", password: "TrialPartner#2026",
        contact: "+91 90000 00003", account_type: "partner", account_status: "active" };
      DB.users.push(partner);
      DB.nextUserId = newId + 1;
      changed = true;
    }
    if (!DB.partner_profiles[partner.id]) {
      DB.partner_profiles[partner.id] = { user_id: partner.id, partner_id: "EP-TRIAL-PARTNER",
        display_name: "Trial Partner", is_company: 0, profit_share_percent: 35, tier_label: "Trial" };
      changed = true;
    }
    if (!DB.partner_earnings.some(function (e) { return e.partner_user_id === partner.id; })) {
      DB.partner_earnings.push({ id: DB.partner_earnings.length + 1, partner_user_id: partner.id,
        voyage_id: "v2235h", tour_title: "Munnar Hills & Alleppey Houseboat Escape", pax: 2,
        base_amount: 40400, profit_share_percent_applied: 35, commission_amount: 14140,
        credited_at: nowStamp(), payout_id: null });
      changed = true;
    }
    if (changed) saveDB(DB);
  })();

  // Same self-healing upgrade, for the customer trial account added
  // alongside /account/profile.html — so anyone with an older
  // localStorage store (saved before that feature existed) gets it too,
  // without needing to know to run EP_MOCK.reset() (which would also
  // discard anything else they'd already clicked through in the mock).
  (function ensureCustomerDemoData() {
    var customer = DB.users.filter(function (u) { return u.email === "customer.trial@embarkpedia.com"; })[0];
    if (customer) {
      // Already present (seeded fresh, or added by a previous run of
      // this block) — still backfill the two columns this account's
      // whole point is to demo, in case it predates them.
      var changed2 = false;
      if (typeof customer.name_is_split === "undefined") { customer.name_is_split = 0; changed2 = true; }
      if (typeof customer.must_change_password === "undefined") { customer.must_change_password = 0; changed2 = true; }
      if (changed2) saveDB(DB);
      return;
    }
    var newId = Math.max(Number(DB.nextUserId) || 1, DB.users.reduce(function (max, u) {
      return Math.max(max, Number(u.id) || 0);
    }, 0) + 1);
    DB.users.push({
      id: newId, first_name: "Trial", last_name: "Customer",
      email: "customer.trial@embarkpedia.com", password: "TrialCustomer#2026",
      contact: "+91 90000 00004", account_type: "customer", account_status: "active",
      name_is_split: 0, must_change_password: 0
    });
    DB.nextUserId = newId + 1;
    saveDB(DB);
  })();

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }
  function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function currentUser() {
    var s = getSession();
    if (!s) return null;
    var u = DB.users.filter(function (u) { return u.id === s.id; })[0];
    return (u && u.account_status === "active") ? u : null;
  }
  function vendorProfile(userId) { return DB.vendor_profiles[userId] || null; }

  // ---- fake fetch Response helpers ----------------------------------
  function respond(status, obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), {
      status: status,
      headers: { "Content-Type": "application/json" }
    }));
  }
  function ok(data) { return respond(200, Object.assign({ ok: true }, data || {})); }
  function fail(status, error) { return respond(status, { ok: false, error: error }); }

  function parseBody(init) {
    if (!init || !init.body) return Promise.resolve({});
    if (typeof FormData !== "undefined" && init.body instanceof FormData) {
      var obj = {};
      init.body.forEach(function (v, k) { obj[k] = v; });
      return Promise.resolve(obj);
    }
    if (typeof init.body === "string") {
      try { return Promise.resolve(JSON.parse(init.body)); }
      catch (e) { return Promise.resolve({}); }
    }
    return Promise.resolve({});
  }

  function requireRole(roles) {
    var u = currentUser();
    if (!u || roles.indexOf(u.account_type) === -1) return null;
    return u;
  }

  // ==================================================================
  // organizer-login.php
  // ==================================================================
  function handleLogin(b) {
    var email = String(b.email || "").trim();
    var password = String(b.password || "");
    var as = String(b.as || "");
    if (["vendor", "partner", "admin"].indexOf(as) === -1) return fail(400, "Select Vendor, Partner or Admin before signing in.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return fail(401, "Incorrect email or password.");

    var user = DB.users.filter(function (u) { return u.email === email; })[0];
    var valid = user && user.password === password && user.account_type === as;
    if (!valid) return fail(401, "Incorrect email or password.");
    if (user.account_status !== "active") return fail(403, "This account has been suspended. Contact Embark Pedia support.");

    var vendorStatus = null;
    if (as === "vendor") {
      var profile = vendorProfile(user.id);
      vendorStatus = (profile && profile.review_status) || "pending";
      if (vendorStatus === "rejected") return fail(403, "Your vendor application was not approved. Contact support@embarkpedia.com for details.");
      if (vendorStatus === "suspended") return fail(403, "Your vendor account is currently suspended. Contact support@embarkpedia.com.");
    }

    setSession({ id: user.id });
    var redirect = as === "partner" ? "/organizer/partner.html" :
      (as === "admin" ? "/organizer/approvals.html" : "/organizer/authoring.html");
    return ok({ message: "Signed in successfully.", redirect: redirect, role: as, vendor_status: vendorStatus });
  }

  // ==================================================================
  // vendor-signup.php (minimal — public signup tab on login.html)
  // ==================================================================
  function handleVendorSignup(b) {
    var email = String(b.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(422, "Enter a valid email address.");
    if (DB.users.some(function (u) { return u.email === email; })) return fail(409, "An account with that email already exists.");
    if (!b.org_name || !b.password || b.password !== b.confirm || String(b.password).length < 8) {
      return fail(422, "Please fill every required field correctly.");
    }
    var id = DB.nextUserId++;
    DB.users.push({
      id: id, first_name: b.contact_fname || "", last_name: b.contact_lname || "",
      email: email, password: b.password, contact: b.contact || "",
      account_type: "vendor", account_status: "active"
    });
    DB.vendor_profiles[id] = {
      user_id: id, organization_name: b.org_name, business_email: email,
      business_phone: b.contact || "", website_url: b.business_website || "",
      business_description: b.about || "", review_status: "pending", reviewed_at: null
    };
    saveDB(DB);
    setSession({ id: id });
    return ok({ message: "Account created. Your vendor application is pending admin approval.", redirect: "/organizer/authoring.html" });
  }

  // ==================================================================
  // organizer-me.php
  // ==================================================================
  function handleMe() {
    var u = requireRole(["vendor", "admin", "partner"]);
    if (!u) return fail(401, "Please sign in to the organizer portal to continue.");
    var out = {
      id: u.id, first_name: u.first_name, last_name: u.last_name,
      email: u.email, contact: u.contact, account_type: u.account_type
    };
    if (u.account_type === "vendor") out.vendor_profile = vendorProfile(u.id);
    if (DB.partner_profiles && DB.partner_profiles[u.id]) out.partner_profile = DB.partner_profiles[u.id];
    return ok({ user: out });
  }

  // ==================================================================
  // partner-dashboard.php (local-only partner dashboard data)
  // ==================================================================
  function handlePartnerDashboard(b) {
    var user = requireRole(["vendor", "partner"]);
    if (!user) return fail(401, "Please sign in to the organizer portal to continue.");
    var profile = DB.partner_profiles && DB.partner_profiles[user.id];
    if (!profile) return fail(404, "No partner profile on this account yet.");
    if (String(b.action || "") !== "sales") return fail(400, "Unknown action.");

    var earnings = (DB.partner_earnings || []).filter(function (e) { return e.partner_user_id === user.id; });
    var payouts = (DB.partner_payouts || []).filter(function (p) { return p.partner_user_id === user.id; });
    var totals = earnings.reduce(function (out, e) {
      var amount = Number(e.commission_amount || 0);
      out.total_earnings += amount;
      if (e.payout_id) out.total_payout += amount;
      else out.pending_payout += amount;
      return out;
    }, { total_earnings: 0, monthly_earnings: 0, total_payout: 0, pending_payout: 0 });
    totals.monthly_earnings = totals.total_earnings;
    return ok({
      partner_id: profile.partner_id, display_name: profile.display_name,
      profit_share_percent: profile.profit_share_percent, tier_label: profile.tier_label,
      earnings: clone(earnings), payouts: clone(payouts), totals: totals
    });
  }

  // ==================================================================
  // logout.php
  // ==================================================================
  function handleLogout() {
    clearSession();
    return ok({ message: "Signed out." });
  }

  // ==================================================================
  // Customer-facing endpoints: assets/js/login.php, signup.php, me.php,
  // forgot-password.php, change-password.php, customer-profile.php.
  // These are the plain customer equivalents of the organizer-* handlers
  // above — same mock DB, same localStorage-backed session, just
  // unauthenticated-by-default (no "as" role field) and customer-only
  // where the real PHP restricts to account_type === 'customer'.
  // ==================================================================
  function genTempPassword() {
    var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var out = "";
    for (var i = 0; i < 12; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }
  function destinationFor(accountType) {
    if (accountType === "vendor") return "/organizer/authoring.html";
    if (accountType === "admin") return "/organizer/approvals.html";
    if (accountType === "partner") return "/organizer/partner.html";
    return "/index.html";
  }

  // assets/js/login.php
  function handleCustomerLogin(b) {
    var email = String(b.email || "").trim();
    var password = String(b.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return fail(401, "Incorrect email or password.");

    var user = DB.users.filter(function (u) { return u.email === email; })[0];
    if (!user || user.password !== password) return fail(401, "Incorrect email or password.");
    if (user.account_status !== "active") return fail(403, "This account has been suspended. Contact Embark Pedia support.");

    setSession({ id: user.id });
    if (user.must_change_password) {
      return ok({ message: "Signed in. Please set a new password to continue.", must_change_password: true, redirect: "/auth/change-password.html" });
    }
    return ok({ message: "Signed in successfully.", redirect: "/index.html" });
  }

  // assets/js/signup.php
  function handleCustomerSignup(b) {
    var email = String(b.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(422, "Enter a valid email address.");
    if (DB.users.some(function (u) { return u.email === email; })) return fail(409, "An account with that email already exists.");
    if (!b.fname || !b.lname || !b.password || b.password !== b.confirm || String(b.password).length < 8) {
      return fail(422, "Please fill every required field correctly.");
    }
    var id = DB.nextUserId++;
    DB.users.push({
      id: id, first_name: b.fname, last_name: b.lname, email: email,
      password: b.password, contact: b.contact || "",
      account_type: "customer", account_status: "active",
      name_is_split: 1, must_change_password: 0 // signup already collects first/last separately
    });
    saveDB(DB);
    setSession({ id: id });
    return ok({ message: "Account created successfully.", redirect: "/index.html" });
  }

  // assets/js/me.php — any signed-in account_type, not role-restricted
  // the way organizer-me.php (handleMe, above) is.
  function handleCustomerMe() {
    var u = currentUser();
    if (!u) return ok({ signed_in: false });
    return ok({
      signed_in: true,
      user: {
        id: u.id, first_name: u.first_name, last_name: u.last_name,
        full_name: (u.first_name + " " + u.last_name).trim(),
        email: u.email, contact: u.contact, account_type: u.account_type,
        name_is_split: !!u.name_is_split, must_change_password: !!u.must_change_password
      }
    });
  }

  // assets/js/forgot-password.php — customer/vendor/partner only, same
  // enumeration-safe generic response either way as the real endpoint.
  function handleForgotPassword(b) {
    var generic = "If an account exists for that email, a new temporary password has been sent.";
    var email = String(b.email || "").trim();
    var user = DB.users.filter(function (u) { return u.email === email; })[0];
    if (user && user.account_status === "active" && ["customer", "vendor", "partner"].indexOf(user.account_type) !== -1) {
      var temp = genTempPassword();
      user.password = temp;
      user.must_change_password = 1;
      saveDB(DB);
      console.log(
        "%c[mock-backend] Temporary password for " + email + ": " + temp +
        "\n(A real deployment emails this — see ep_send_mail() in db.php. Here it's just logged.)",
        "color:#4A2C3A;font-weight:bold;"
      );
    }
    return ok({ message: generic });
  }

  // assets/js/change-password.php — forced step after a forgot-password reset.
  function handleChangePassword(b) {
    var u = currentUser();
    if (!u) return fail(401, "Your session has expired. Please sign in again.");
    var newPw = String(b.new_password || "");
    var confirm = String(b.confirm || "");
    if (newPw.length < 8 || newPw.length > 72) return fail(422, "New password must be 8–72 characters.");
    if (newPw !== confirm) return fail(422, "New passwords do not match.");
    u.password = newPw;
    u.must_change_password = 0;
    saveDB(DB);
    return ok({ message: "Password updated. You're all set.", redirect: destinationFor(u.account_type) });
  }

  // assets/js/customer-profile.php
  function handleCustomerProfile(b) {
    var u = requireRole(["customer"]);
    if (!u) return fail(401, "Please sign in to manage your profile.");
    var action = String(b.action || "");

    if (action === "update_name") {
      var fname, lname;
      if (b.full_name && !b.first_name) {
        var full = String(b.full_name || "").trim();
        if (!full) return fail(422, "Enter your name.");
        var parts = full.split(/\s+/);
        fname = parts[0];
        lname = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
      } else {
        fname = String(b.first_name || "").trim();
        lname = String(b.last_name || "").trim();
      }
      if (!fname) return fail(422, "Enter a first name.");
      if (!lname) return fail(422, "Enter a last name.");
      u.first_name = fname;
      u.last_name = lname;
      u.name_is_split = 1;
      saveDB(DB);
      return ok({ message: "Name updated.", first_name: fname, last_name: lname });
    }

    if (action === "update_contact") {
      var contact = String(b.contact || "").trim();
      var email = String(b.email || "").trim();
      if (!/^[0-9+\-\s]{7,15}$/.test(contact)) return fail(422, "Enter a valid contact number.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(422, "Enter a valid email address.");
      if (email.toLowerCase() !== u.email.toLowerCase() && DB.users.some(function (o) { return o.id !== u.id && o.email === email; })) {
        return fail(409, "That email is already in use by another account.");
      }
      u.contact = contact;
      u.email = email;
      saveDB(DB);
      return ok({ message: "Contact details updated." });
    }

    if (action === "change_password") {
      var current = String(b.current_password || "");
      var newPw = String(b.new_password || "");
      var confirm = String(b.confirm || "");
      if (u.password !== current) return fail(401, "Current password is incorrect.");
      if (newPw.length < 8 || newPw.length > 72) return fail(422, "New password must be 8–72 characters.");
      if (newPw !== confirm) return fail(422, "New passwords do not match.");
      u.password = newPw;
      saveDB(DB);
      return ok({ message: "Password changed." });
    }

    if (action === "deactivate_account") {
      u.account_status = "suspended";
      saveDB(DB);
      clearSession();
      return ok({ message: "Your account has been deactivated. Contact support@embarkpedia.com to reactivate it." });
    }

    if (action === "delete_account") {
      var current = String(b.current_password || "");
      if (u.password !== current) return fail(401, "Enter your current password to confirm account deletion.");
      DB.users = DB.users.filter(function (o) { return o.id !== u.id; });
      saveDB(DB);
      clearSession();
      return ok({ message: "Your account has been deleted." });
    }

    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // organizer-trips.php
  // ==================================================================
  function tripPublicRow(t) {
    return {
      id: t.id, title: t.title, article_id: t.article_id, voyage_id: t.voyage_id,
      destination_name: t.destination_name, days: t.days, nights: t.nights,
      category: t.category, price_inr: t.price_inr, status: t.status,
      vendor_first_name: t.vendor_first_name, vendor_last_name: t.vendor_last_name
    };
  }
  function validateTripPayload(b) {
    var errors = [];
    var title = String(b.title || "").trim();
    var destinationId = parseInt(b.destination_id, 10) || 0;
    var days = parseInt(b.days, 10) || 0;
    var nights = parseInt(b.nights, 10) || 0;
    var category = String(b.category || "").trim();
    var price = b.price_inr === "" || b.price_inr == null ? -1 : parseFloat(b.price_inr);
    var itinerary = Array.isArray(b.itinerary) ? b.itinerary : [];

    if (!title || title.length > 200) errors.push("Enter a trip title.");
    if (destinationId <= 0) errors.push("Select a destination.");
    if (days < 2 || days > 9) errors.push("Trip duration should be between 2 and 9 days (TRIPS are the 3–9 day product line).");
    if (nights < 1) errors.push("Enter the number of nights.");
    if (!category) errors.push("Enter a category (e.g. Honeymoon, Family, Adventure).");
    if (isNaN(price) || price < 0) errors.push("Enter a base price.");
    if (itinerary.length < 3) errors.push("Add at least 3 day-by-day itinerary entries.");
    itinerary.forEach(function (day, i) {
      if (!String(day.title || "").trim()) errors.push("Itinerary day " + (i + 1) + " needs a title.");
      if (!String(day.plan_text || "").trim()) errors.push("Itinerary day " + (i + 1) + " needs a plan description.");
    });
    return errors;
  }
  function buildChildren(b) {
    var inclusions = (b.inclusions || []).map(function (s) { return String(s).trim(); }).filter(Boolean)
      .map(function (s) { return { item_text: s }; });
    var exclusions = (b.exclusions || []).map(function (s) { return String(s).trim(); }).filter(Boolean)
      .map(function (s) { return { item_text: s }; });
    var itinerary = (b.itinerary || []).filter(function (d) {
      return String(d.title || "").trim() && String(d.plan_text || "").trim();
    }).map(function (d, i) {
      return {
        day_number: i + 1, title: String(d.title).trim(), plan_text: String(d.plan_text).trim(),
        is_highlight: d.is_highlight ? 1 : 0,
        note_text: String(d.note_text || "").trim() || null
      };
    });
    var stays = (b.stays || []).filter(function (s) { return String(s.hotel_name || "").trim(); })
      .map(function (s, i) {
        return {
          checkin_number: i + 1, hotel_name: String(s.hotel_name).trim(),
          checkin_day: s.checkin_day !== "" && s.checkin_day != null ? parseInt(s.checkin_day, 10) : null,
          checkout_day: s.checkout_day !== "" && s.checkout_day != null ? parseInt(s.checkout_day, 10) : null,
          notes: String(s.notes || "").trim() || null
        };
      });
    return { inclusions: inclusions, exclusions: exclusions, itinerary: itinerary, stays: stays };
  }
  function findTrip(id) { return DB.tours.filter(function (t) { return t.id === parseInt(id, 10); })[0]; }
  function tripOwnedEditable(id, user, isAdmin) {
    var t = findTrip(id);
    if (!t) return { error: fail(404, "Trip not found.") };
    if (!isAdmin) {
      if (t.submitted_by_user_id !== user.id) return { error: fail(403, "You can only manage your own trips.") };
      if (t.status === "published") return { error: fail(403, "Published trips can only be edited by an admin.") };
    }
    return { trip: t };
  }

  function handleTrips(b) {
    var user = requireRole(["vendor", "admin"]);
    if (!user) return fail(401, "Please sign in to the organizer portal to continue.");
    var isAdmin = user.account_type === "admin";
    var action = String(b.action || "");

    if (action === "destinations") {
      return ok({ destinations: DB.destinations.map(function (d) { return { id: d.id, slug: d.slug, name: d.name, region: d.region }; }) });
    }

    if (action === "list") {
      var rows = DB.tours.slice();
      if (!isAdmin) rows = rows.filter(function (t) { return t.submitted_by_user_id === user.id; });
      if (b.status) rows = rows.filter(function (t) { return t.status === b.status; });
      rows.sort(function (a2, c) { return c.id - a2.id; });
      return ok({ trips: rows.map(tripPublicRow) });
    }

    if (action === "get") {
      var id = parseInt(b.id, 10) || 0;
      var res = tripOwnedEditable(id, user, true); // read always allowed if owned-or-admin
      if (res.error) return res.error;
      var t = res.trip;
      if (!isAdmin && t.submitted_by_user_id !== user.id) return fail(403, "You can only view your own trips.");
      return ok({ trip: clone(t) });
    }

    if (action === "create") {
      var errors = validateTripPayload(b);
      if (errors.length) return fail(422, errors.join(" "));
      var destId = parseInt(b.destination_id, 10);
      var dest = DB.destinations.filter(function (d) { return d.id === destId; })[0];
      if (!dest) return fail(422, "Selected destination does not exist.");
      var children = buildChildren(b);
      var newTour = {
        id: DB.nextTourId++, destination_id: dest.id, destination_name: dest.name,
        title: String(b.title).trim(), article_id: genArticleId(), voyage_id: genVoyageId(),
        days: parseInt(b.days, 10), nights: parseInt(b.nights, 10), category: String(b.category).trim(),
        price_inr: parseFloat(b.price_inr),
        price_with_breakfast_inr: b.price_with_breakfast_inr ? parseFloat(b.price_with_breakfast_inr) : null,
        price_with_breakfast_dinner_inr: b.price_with_breakfast_dinner_inr ? parseFloat(b.price_with_breakfast_dinner_inr) : null,
        hotel_type: b.hotel_type || null, image_url: b.image_url || null,
        status: isAdmin ? "published" : "pending_review",
        submitted_by_user_id: user.id, vendor_first_name: user.first_name, vendor_last_name: user.last_name,
        reviewed_by_user_id: isAdmin ? user.id : null, reviewed_at: isAdmin ? nowStamp() : null,
        inclusions: children.inclusions, exclusions: children.exclusions,
        itinerary: children.itinerary, stays: children.stays
      };
      DB.tours.push(newTour);
      saveDB(DB);
      return ok({ message: isAdmin ? "Trip published." : "Trip submitted for review.", id: newTour.id });
    }

    if (action === "update") {
      var uid2 = parseInt(b.id, 10) || 0;
      var res2 = tripOwnedEditable(uid2, user, isAdmin);
      if (res2.error) return res2.error;
      var errors2 = validateTripPayload(b);
      if (errors2.length) return fail(422, errors2.join(" "));
      var destId2 = parseInt(b.destination_id, 10);
      var dest2 = DB.destinations.filter(function (d) { return d.id === destId2; })[0];
      if (!dest2) return fail(422, "Selected destination does not exist.");
      var t2 = res2.trip;
      var children2 = buildChildren(b);
      t2.destination_id = dest2.id; t2.destination_name = dest2.name;
      t2.title = String(b.title).trim();
      t2.days = parseInt(b.days, 10); t2.nights = parseInt(b.nights, 10);
      t2.category = String(b.category).trim();
      t2.price_inr = parseFloat(b.price_inr);
      t2.price_with_breakfast_inr = b.price_with_breakfast_inr ? parseFloat(b.price_with_breakfast_inr) : null;
      t2.price_with_breakfast_dinner_inr = b.price_with_breakfast_dinner_inr ? parseFloat(b.price_with_breakfast_dinner_inr) : null;
      t2.hotel_type = b.hotel_type || null; t2.image_url = b.image_url || null;
      t2.inclusions = children2.inclusions; t2.exclusions = children2.exclusions;
      t2.itinerary = children2.itinerary; t2.stays = children2.stays;
      saveDB(DB);
      return ok({ message: "Trip updated." });
    }

    if (action === "archive" || action === "pause" || action === "resume") {
      var id3 = parseInt(b.id, 10) || 0;
      var res3 = tripOwnedEditable(id3, user, isAdmin);
      if (res3.error) return res3.error;
      var t3 = res3.trip;
      if (action === "archive") t3.status = "archived";
      if (action === "pause") { if (t3.status !== "published") return fail(422, "Only a published trip can be paused."); t3.status = "paused"; }
      if (action === "resume") { if (t3.status !== "paused") return fail(422, "Only a paused trip can be resumed."); t3.status = "published"; }
      saveDB(DB);
      return ok({ message: "Trip " + action + "d." });
    }

    if (action === "approve" || action === "reject") {
      if (!isAdmin) return fail(403, "Admin only.");
      var t4 = findTrip(parseInt(b.id, 10) || 0);
      if (!t4) return fail(404, "Trip not found.");
      t4.status = action === "approve" ? "published" : "rejected";
      t4.reviewed_by_user_id = user.id; t4.reviewed_at = nowStamp();
      saveDB(DB);
      return ok({ message: "Trip " + (action === "approve" ? "approved and published." : "rejected.") });
    }

    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // organizer-roams.php (admin only)
  // ==================================================================
  function handleRoams(b) {
    var user = requireRole(["admin"]);
    if (!user) return fail(401, "Admin only.");
    var action = String(b.action || "");
    if (action === "list") return ok({ roams: DB.roams.slice().sort(function (a, c) { return c.id - a.id; }) });
    if (action === "create") {
      if (!b.title || !b.route) return fail(422, "Title and route are required.");
      var r = {
        id: DB.nextRoamId++, title: b.title, route: b.route, date_range: b.date_range || "",
        days: b.days ? parseInt(b.days, 10) : null,
        price_with_breakfast: b.price_with_breakfast ? parseFloat(b.price_with_breakfast) : null,
        price_with_breakfast_dinner: b.price_with_breakfast_dinner ? parseFloat(b.price_with_breakfast_dinner) : null,
        price_currency: b.price_currency || "INR", hotel_type: b.hotel_type || null,
        image_url: b.image_url || "", description: b.description || "", status: "draft",
        created_by_user_id: user.id
      };
      DB.roams.push(r); saveDB(DB);
      return ok({ message: "ROAM saved as draft.", id: r.id });
    }
    if (["publish", "pause", "resume", "archive"].indexOf(action) !== -1) {
      var rm = DB.roams.filter(function (x) { return x.id === parseInt(b.id, 10); })[0];
      if (!rm) return fail(404, "ROAM not found.");
      if (action === "publish") rm.status = "published";
      if (action === "pause") rm.status = "paused";
      if (action === "resume") rm.status = "published";
      if (action === "archive") rm.status = "archived";
      saveDB(DB);
      return ok({ message: "ROAM " + action + "ed." });
    }
    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // organizer-enquiries.php
  // ==================================================================
  function handleEnquiries(b) {
    var user = requireRole(["vendor", "admin"]);
    if (!user) return fail(401, "Please sign in to continue.");
    var isAdmin = user.account_type === "admin";
    var action = String(b.action || "");
    if (action === "list_trip") {
      var rows = isAdmin ? DB.trip_enquiries.slice()
        : DB.trip_enquiries.filter(function (q) { return q.shared_with_vendor && q.vendor_user_id === user.id; });
      return ok({ enquiries: rows });
    }
    if (action === "list_contact") {
      if (!isAdmin) return fail(403, "Admin only.");
      return ok({ messages: DB.contact_messages.slice() });
    }
    if (action === "forward") {
      if (!isAdmin) return fail(403, "Admin only.");
      var q = DB.trip_enquiries.filter(function (x) { return x.id === parseInt(b.id, 10); })[0];
      if (!q) return fail(404, "Enquiry not found.");
      q.shared_with_vendor = 1; q.shared_at = nowStamp();
      saveDB(DB);
      return ok({ message: "Enquiry forwarded to the vendor." });
    }
    if (action === "update_status") {
      var kind = b.kind === "contact" ? DB.contact_messages : DB.trip_enquiries;
      var item = kind.filter(function (x) { return x.id === parseInt(b.id, 10); })[0];
      if (!item) return fail(404, "Not found.");
      item.status = b.status;
      saveDB(DB);
      return ok({ message: "Status updated." });
    }
    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // organizer-sales.php
  // ==================================================================
  function handleSales(b) {
    var user = requireRole(["vendor", "admin"]);
    if (!user) return fail(401, "Please sign in to continue.");
    var isAdmin = user.account_type === "admin";
    var action = String(b.action || "");
    var mine = function (s) { return isAdmin ? true : s.vendor_user_id === user.id; };

    if (action === "summary") {
      var rows = DB.sales.filter(mine).filter(function (s) { return s.status === "confirmed"; });
      var total = rows.reduce(function (sum, s) { return sum + Number(s.amount); }, 0);
      var byVendor = {};
      if (isAdmin) {
        rows.forEach(function (s) {
          var key = s.vendor_name || "Direct/ROAM";
          byVendor[key] = byVendor[key] || { vendor_name: key, cnt: 0, total: 0 };
          byVendor[key].cnt++; byVendor[key].total += Number(s.amount);
        });
      }
      return ok({ summary: { total_amount: total, total_count: rows.length, by_vendor: Object.keys(byVendor).map(function (k) { return byVendor[k]; }) } });
    }
    if (action === "list") return ok({ sales: DB.sales.filter(mine) });
    if (action === "create") {
      if (!b.tour_id && !b.roam_id) return fail(422, "Select a trip or ROAM.");
      if (!b.buyer_name || !b.amount || !b.sale_date) return fail(422, "Buyer name, amount and sale date are required.");
      var tourTitle = null, vendorUserId = null, vendorName = null;
      if (b.tour_id) {
        var t = findTrip(parseInt(b.tour_id, 10));
        if (t) { tourTitle = t.title; vendorUserId = t.submitted_by_user_id; vendorName = t.vendor_first_name + " " + t.vendor_last_name; }
      }
      var s = {
        id: DB.nextSaleId++, tour_id: b.tour_id ? parseInt(b.tour_id, 10) : null, roam_id: b.roam_id ? parseInt(b.roam_id, 10) : null,
        tour_title: tourTitle, roam_title: null, vendor_user_id: vendorUserId, vendor_name: vendorName,
        recorded_by_user_id: user.id, buyer_name: b.buyer_name, buyer_email: b.buyer_email || null,
        buyer_contact: b.buyer_contact || null, group_size: b.group_size ? parseInt(b.group_size, 10) : null,
        amount: parseFloat(b.amount), currency: b.currency || "INR", sale_date: b.sale_date,
        status: "confirmed", notes: b.notes || null
      };
      DB.sales.push(s); saveDB(DB);
      return ok({ message: "Sale logged." });
    }
    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // organizer-profile.php
  // ==================================================================
  function handleProfile(b) {
    var user = requireRole(["vendor", "admin", "partner"]);
    if (!user) return fail(401, "Please sign in to continue.");
    var action = String(b.action || "");
    if (action === "update_profile") {
      if (b.first_name) user.first_name = b.first_name;
      if (b.last_name) user.last_name = b.last_name;
      if (b.contact) user.contact = b.contact;
      if (user.account_type === "vendor") {
        var p = vendorProfile(user.id);
        if (p) {
          if (b.organization_name !== undefined) p.organization_name = b.organization_name;
          if (b.business_phone !== undefined) p.business_phone = b.business_phone;
          if (b.website_url !== undefined) p.website_url = b.website_url;
          if (b.business_description !== undefined) p.business_description = b.business_description;
        }
      }
      var partnerProfile = DB.partner_profiles && DB.partner_profiles[user.id];
      if (partnerProfile && b.display_name !== undefined) {
        partnerProfile.display_name = String(b.display_name || "");
        partnerProfile.is_company = b.is_company ? 1 : 0;
      }
      saveDB(DB);
      return ok({ message: "Profile updated." });
    }
    if (action === "change_password") {
      if (user.password !== b.current_password) return fail(401, "Current password is incorrect.");
      if (!b.new_password || b.new_password !== b.confirm) return fail(422, "New passwords do not match.");
      user.password = b.new_password;
      saveDB(DB);
      return ok({ message: "Password changed." });
    }
    if (action === "deactivate_account") {
      if (user.account_type === "admin") return fail(403, "Admin accounts cannot self-deactivate from here.");
      user.account_status = "suspended";
      saveDB(DB);
      clearSession();
      return ok({ message: "Your account has been deactivated." });
    }
    if (action === "delete_account") {
      if (user.account_type === "admin") return fail(403, "Admin accounts cannot self-delete from here.");
      if (user.password !== b.current_password) return fail(401, "Enter your current password to confirm account deletion.");
      DB.users = DB.users.filter(function (u) { return u.id !== user.id; });
      if (DB.vendor_profiles) delete DB.vendor_profiles[user.id];
      if (DB.partner_profiles) delete DB.partner_profiles[user.id];
      saveDB(DB);
      clearSession();
      return ok({ message: "Your account has been deleted." });
    }
    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // organizer-vendors.php (admin only)
  // ==================================================================
  function handleVendors(b) {
    var admin = requireRole(["admin"]);
    if (!admin) return fail(401, "Admin only.");
    var action = String(b.action || "");
    if (action === "list") {
      var rows = DB.users.filter(function (u) { return u.account_type === "vendor"; }).map(function (u) {
        var p = vendorProfile(u.id) || {};
        var tripCount = DB.tours.filter(function (t) { return t.submitted_by_user_id === u.id; }).length;
        var totalSales = DB.sales.filter(function (s) { return s.vendor_user_id === u.id && s.status === "confirmed"; })
          .reduce(function (sum, s) { return sum + Number(s.amount); }, 0);
        return {
          user_id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email,
          contact: u.contact, account_status: u.account_status,
          organization_name: p.organization_name, business_email: p.business_email,
          business_phone: p.business_phone, website_url: p.website_url,
          business_description: p.business_description, review_status: p.review_status,
          reviewed_at: p.reviewed_at, trip_count: tripCount, total_sales: totalSales
        };
      }).sort(function (a, c) { return (c.review_status === "pending") - (a.review_status === "pending"); });
      return ok({ vendors: rows });
    }
    var targetId = parseInt(b.user_id, 10) || 0;
    var profile = vendorProfile(targetId);
    if (["approve", "reject", "suspend", "reinstate"].indexOf(action) !== -1) {
      if (!profile) return fail(404, "Vendor not found.");
      if (action === "approve") {
        profile.review_status = "approved";
        if (!DB.partner_profiles[targetId]) {
          var vendor = DB.users.filter(function (u) { return u.id === targetId; })[0] || {};
          DB.partner_profiles[targetId] = { user_id: targetId,
            partner_id: "EP-" + rid(8).toUpperCase(),
            display_name: profile.organization_name || (vendor.first_name + " " + vendor.last_name),
            is_company: 1, profit_share_percent: 30, tier_label: "Standard" };
        }
      }
      if (action === "reject") profile.review_status = "rejected";
      if (action === "suspend") profile.review_status = "suspended";
      if (action === "reinstate") profile.review_status = "approved";
      profile.reviewed_by_user_id = admin.id; profile.reviewed_at = nowStamp();
      saveDB(DB);
      return ok({ message: "Vendor " + action + "d." });
    }
    if (action === "delete") {
      DB.tours.forEach(function (t) { if (t.submitted_by_user_id === targetId) t.status = "archived"; });
      delete DB.vendor_profiles[targetId];
      delete DB.partner_profiles[targetId];
      DB.users = DB.users.filter(function (u) { return u.id !== targetId; });
      saveDB(DB);
      return ok({ message: "Vendor deleted; their trips were archived." });
    }
    if (action === "onboard") {
      if (!b.email || DB.users.some(function (u) { return u.email === b.email; })) return fail(422, "Enter a unique, valid email.");
      var id = DB.nextUserId++;
      DB.users.push({
        id: id, first_name: b.contact_fname || "", last_name: b.contact_lname || "",
        email: b.email, password: b.temp_password || "Password#123", contact: b.contact || "",
        account_type: "vendor", account_status: "active"
      });
      DB.vendor_profiles[id] = {
        user_id: id, organization_name: b.org_name || "", business_email: b.email,
        business_phone: b.contact || "", website_url: "", business_description: "",
        review_status: "approved", reviewed_by_user_id: admin.id, reviewed_at: nowStamp()
      };
      DB.partner_profiles[id] = { user_id: id, partner_id: "EP-" + rid(8).toUpperCase(),
        display_name: b.org_name || (b.contact_fname + " " + b.contact_lname),
        is_company: 1, profit_share_percent: 30, tier_label: "Standard" };
      saveDB(DB);
      return ok({ message: "Vendor onboarded and approved." });
    }
    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // organizer-partners.php (local admin partner management)
  // ==================================================================
  function handlePartners(b) {
    var admin = requireRole(["admin"]);
    if (!admin) return fail(401, "Admin only.");
    var action = String(b.action || "");
    if (action === "list") {
      var partners = Object.keys(DB.partner_profiles || {}).map(function (key) {
        var id = Number(key), p = DB.partner_profiles[key];
        var u = DB.users.filter(function (row) { return row.id === id; })[0];
        if (!u) return null;
        var earnings = (DB.partner_earnings || []).filter(function (e) { return e.partner_user_id === id; });
        var totals = earnings.reduce(function (out, e) {
          var amount = Number(e.commission_amount || 0);
          out.referral_count++;
          if (e.payout_id) out.total_payout += amount;
          else out.pending_payout += amount;
          return out;
        }, { referral_count: 0, pending_payout: 0, total_payout: 0 });
        return Object.assign({
          user_id: id, first_name: u.first_name, last_name: u.last_name, email: u.email,
          contact: u.contact, account_type: u.account_type, account_status: u.account_status
        }, p, totals);
      }).filter(Boolean);
      return ok({ partners: partners });
    }
    var id = parseInt(b.user_id, 10) || 0;
    var profile = DB.partner_profiles[id];
    if (action === "update_tier") {
      var percent = Number(b.profit_share_percent);
      if (!profile) return fail(404, "Partner not found.");
      if (percent < 30 || percent > 50) return fail(422, "Profit share must be between 30% and 50%.");
      profile.profit_share_percent = percent;
      profile.tier_label = String(b.tier_label || "");
      saveDB(DB);
      return ok({ message: "Tier updated. This rate applies to future referrals only." });
    }
    if (action === "suspend" || action === "reinstate") {
      var target = DB.users.filter(function (u) { return u.id === id; })[0];
      if (!target || !profile) return fail(404, "Partner not found.");
      target.account_status = action === "suspend" ? "suspended" : "active";
      saveDB(DB);
      return ok({ message: "Partner " + (action === "suspend" ? "suspended." : "reinstated.") });
    }
    if (action === "delete") {
      if (!profile) return fail(404, "Partner not found.");
      delete DB.partner_profiles[id];
      DB.users = DB.users.filter(function (u) { return u.id !== id; });
      saveDB(DB);
      return ok({ message: "Partner deleted." });
    }
    if (action === "run_payout") {
      if (!profile) return fail(404, "Partner not found.");
      var pending = (DB.partner_earnings || []).filter(function (e) { return e.partner_user_id === id && !e.payout_id; });
      var total = pending.reduce(function (sum, e) { return sum + Number(e.commission_amount || 0); }, 0);
      if (!total) return fail(422, "There is no pending payout.");
      var payoutId = (DB.partner_payouts || []).reduce(function (max, p) { return Math.max(max, Number(p.id) || 0); }, 0) + 1;
      var payout = { id: payoutId, partner_user_id: id, period_start: b.period_start,
        period_end: b.period_end, total_amount: total, paid_at: nowStamp() };
      pending.forEach(function (e) { e.payout_id = payoutId; });
      DB.partner_payouts.push(payout);
      saveDB(DB);
      return ok({ message: "Payout recorded." });
    }
    if (action === "onboard") {
      var email = String(b.email || "").trim();
      if (!email || DB.users.some(function (u) { return u.email === email; })) return fail(409, "That email is already registered.");
      if (!b.display_name || !b.contact_fname || !b.contact_lname || String(b.temp_password || "").length < 8) {
        return fail(422, "Please fill all required fields and use a password of at least 8 characters.");
      }
      var newId = DB.nextUserId++;
      DB.users.push({ id: newId, first_name: b.contact_fname, last_name: b.contact_lname,
        contact: b.contact || "", email: email, password: b.temp_password,
        account_type: "partner", account_status: "active" });
      DB.partner_profiles[newId] = { user_id: newId, partner_id: "EP-" + rid(8).toUpperCase(),
        display_name: b.display_name, is_company: b.is_company ? 1 : 0,
        profit_share_percent: Number(b.profit_share_percent || 30), tier_label: b.tier_label || "" };
      saveDB(DB);
      return ok({ message: "Partner onboarded." });
    }
    return fail(400, "Unknown action.");
  }

  // ==================================================================
  // fetch() patch — route by filename found anywhere in the URL
  // ==================================================================
  var realFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";

    function routed(handlerPromise) { return handlerPromise; }

    if (url.indexOf("organizer-login.php") !== -1) return parseBody(init).then(handleLogin);
    if (url.indexOf("vendor-signup.php") !== -1) return parseBody(init).then(handleVendorSignup);
    if (url.indexOf("organizer-me.php") !== -1) return routed(handleMe());
    if (url.indexOf("logout.php") !== -1) return routed(handleLogout());
    // Customer-facing endpoints. The "/" prefix on login.php / signup.php
    // / me.php matters: it's what tells these apart from
    // organizer-login.php / vendor-signup.php / organizer-me.php above
    // (those end in "-login.php" / "-signup.php" / "-me.php", never
    // "/login.php" / "/signup.php" / "/me.php"), so these four checks
    // are order-independent with the organizer ones above.
    if (url.indexOf("/login.php") !== -1) return parseBody(init).then(handleCustomerLogin);
    if (url.indexOf("/signup.php") !== -1) return parseBody(init).then(handleCustomerSignup);
    if (url.indexOf("/me.php") !== -1) return routed(handleCustomerMe());
    if (url.indexOf("forgot-password.php") !== -1) return parseBody(init).then(handleForgotPassword);
    if (url.indexOf("change-password.php") !== -1) return parseBody(init).then(handleChangePassword);
    if (url.indexOf("customer-profile.php") !== -1) return parseBody(init).then(handleCustomerProfile);
    if (url.indexOf("organizer-trips.php") !== -1) return parseBody(init).then(handleTrips);
    if (url.indexOf("organizer-roams.php") !== -1) return parseBody(init).then(handleRoams);
    if (url.indexOf("organizer-enquiries.php") !== -1) return parseBody(init).then(handleEnquiries);
    if (url.indexOf("organizer-sales.php") !== -1) return parseBody(init).then(handleSales);
    if (url.indexOf("organizer-profile.php") !== -1) return parseBody(init).then(handleProfile);
    if (url.indexOf("organizer-vendors.php") !== -1) return parseBody(init).then(handleVendors);
    if (url.indexOf("organizer-partners.php") !== -1) return parseBody(init).then(handlePartners);
    if (url.indexOf("partner-dashboard.php") !== -1) return parseBody(init).then(handlePartnerDashboard);

    // anything else (css/js/images/fonts, or other endpoints) goes to the real network
    if (realFetch) return realFetch(input, init);
    return Promise.reject(new Error("No network fetch available and URL not mocked: " + url));
  };

  // ---- console helper for resetting/inspecting the mock store --------
  window.EP_MOCK = {
    get db() { return DB; },
    reset: function () {
      DB = seedData();
      saveDB(DB);
      clearSession();
      console.log("[mock-backend] store reset to seed data. Reload the page.");
    }
  };

  console.log(
    "%c[mock-backend] *.php calls are being answered locally — no PHP/DB involved.\n" +
    "Trial logins: admin.trial@embarkpedia.com / TrialAdmin#2026  ·  " +
    "vendor.trial@embarkpedia.com / TrialVendor#2026  ·  " +
    "partner.trial@embarkpedia.com / TrialPartner#2026  ·  " +
    "customer.trial@embarkpedia.com / TrialCustomer#2026\n" +
    "Run EP_MOCK.reset() in this console to restore the original seed data.",
    "color:#4A2C3A;font-weight:bold;"
  );
})();
