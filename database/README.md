# Database & backend analysis

> **This file is the historical audit/changelog** — requirements-to-schema
> traceability and implementation status over time. For the current
> architecture (ERD, domain-grouped table reference, status lifecycles,
> and forward-looking notes), see [`README_DB.md`](README_DB.md). For a
> plain-language, table-by-table walkthrough of why each table exists and
> how data moves through it, see [`DB_Research.txt`](DB_Research.txt).
> Two corrections carried into both of those (and now into `schema.sql`'s
> comments too):
> 1. The note below about the tour-details enquiry form still going
>    through `connect.php` is **out of date** — `submit-trip-enquiry.php`
>    now writes directly into `trip_enquiries`.
> 2. The note below describing ROAMS as having "listing-level CRUD
>    implemented in `organizer-roams.php`" is also **out of date** —
>    that endpoint's `create`/`update` actions were since deliberately
>    disabled (HTTP 410); only `publish`/`pause`/`resume`/`archive`
>    remain. A new ROAM is now always inserted directly against the
>    database by hand.
>
> See `README_DB.md`'s opening note and §2.5/§3.2/§4 item 7 for the full,
> code-verified detail on both.

This document records the database review for Embark Pedia. The schema in
[`schema.sql`](schema.sql) is the fresh-install target; it does not by itself
create the organizer portals, API endpoints, role checks, or database records.

## Findings at a glance

The supplied requirements call for customer, vendor, and admin accounts;
newsletter, trip, contact, customer-signup, and vendor-signup submissions;
admin-managed ROAMS; admin/vendor-managed TRIPS; and an organizer workflow for
destination, pricing, lodging, inclusions, exclusions, and day-by-day plans.

**Update:** the organizer portal described below as a gap is now implemented —
see `/organizer/login.html` (vendor/partner/admin login + vendor-only signup),
`/organizer/authoring.html` (shared vendor+admin authoring dashboard),
`/organizer/approvals.html` (admin-only approval/oversight dashboard), and
`/organizer/partner.html` (stand-alone partner dashboard), backed by
`assets/js/vendor-signup.php`, `organizer-login.php`, `organizer-me.php`,
`organizer-profile.php`, `organizer-trips.php`, `organizer-roams.php`,
`organizer-enquiries.php`, `organizer-sales.php`, and `organizer-vendors.php`.
Role-aware authorization is centralized in `ep_require_role()` (added to
`assets/js/db.php`) — every one of those endpoints calls it first. The public
site's tour-detail form still sends its enquiry through the contact handler
(packing the product reference into subject/message text) rather than the
dedicated `trip_enquiries` table directly; wiring that form to post there
instead remains future scope (§ below still applies to that one item). A new
`sales` table (manual confirmed-booking ledger — there is still no checkout
flow) backs both dashboards' "track sales" requirement.

## Requirements-to-schema validation

| Requirement | Schema support | Current application status |
|---|---|---|
| Customer login/signup | `users` (`account_type='customer'`) | Customer signup/login use `signup.php` and `login.php`; signup defaults to customer. |
| Vendor login/signup | `users`, `vendor_profiles` | Implemented: `organizer/login.html` + `vendor-signup.php` (public, vendor-only) and `organizer-login.php` (role-checked). New vendor accounts stay `pending` until an admin approves them in `organizer-vendors.php` / approvals.html. |
| Admin login | `users` (`account_type='admin'`) | Implemented via `organizer-login.php`'s `as=admin` path and `organizer-me.php`'s route guard. There is still no public admin signup — seed the first admin per the note at the end of `schema.sql`. |
| Newsletter signup | `newsletter_subscribers` | `subscribe.php` stores the address and token; sending/validating the confirmation link is not implemented. |
| Trip enquiry | `trip_enquiries` | Organizer side implemented in `organizer-enquiries.php` (list/forward/status). The public `tour-render.js` form still posts to `contact_messages` instead of this table — connecting that form is the one remaining gap here. |
| Contact-us / large-group / itinerary consultation | `contact_messages.enquiry_type` | `connect.php` stores the legacy subject/message fields; `organizer-enquiries.php` now lists/updates them for admin. The form itself does not yet classify enquiry_type. |
| Customer signup | `users` | Implemented for the current customer form. |
| Vendor signup/application | `vendor_profiles` | Implemented: pending by default, with admin approve/reject/suspend/reinstate/delete in `organizer-vendors.php`. |
| ROAMS, normally 9–11 days, admin-posted | `roams`, `roam_details`, `roam_stays` | Listing-level CRUD implemented in `organizer-roams.php` (admin-only, draft by default), plus pause/resume (`status='paused'`, reversible, distinct from the one-way `archived`). The nested `roam_details` JSON (gallery/FAQ/packing/etc.) is seeded as an empty shell — authoring that content still needs a dedicated multi-section editor (see that file's header comment). |
| TRIPS, 3–9 days, admin/vendor-posted | `tours` and its child tables | Implemented in `organizer-trips.php`: vendor submissions go to `pending_review`, admin create/edit publishes immediately, admin approve/reject reviews vendor submissions, and both roles can pause/resume a published trip. Range is validated at 2–9 days in the endpoint (schema's hard floor is 2). |
| Pausing a TRIP/ROAM removes it from the customer site; adding one adds it | `tours.status` / `roams.status` ENUM `'paused'` | Implemented: `public-trips.php` / `public-roams.php` are unauthenticated read endpoints that only ever return `status='published'` rows; `public-catalogue-sync.js` merges their results into `DESTINATIONS_DATA` / `ROAMS_DATA` before a page's own render logic runs (see destination-tours.html, tour-render.js, roams/roams.html). `chrome.js` additionally rebuilds the navbar's "Roams" dropdown (desktop + mobile, every page) from `public-roams.php` on load, so pausing/publishing a ROAM no longer requires editing the ~15 pages that dropdown is hand-pasted into. |
| Existing destination dropdown | `destinations` | `organizer-trips.php`'s `action:"destinations"` now serves this to the Add Tour form. The public catalogue pages still read `datasets.js`, not this table (future-scope migration, unchanged). |
| Tour title, duration, meal prices, hotel type | `tours` | Now authored directly through the Add Tour form/endpoint, including the meal-plan prices and hotel type that `datasets.js` doesn't carry. |
| Inclusions/exclusions | `tour_inclusions`, `tour_exclusions`; ROAM JSON `roam_details.inclusions` | TRIP inclusions/exclusions are now authored and persisted via `organizer-trips.php` (replace-on-save). `tour-render.js` on the public site is unchanged and still generates its own sample content. |
| Ordered daily plans, highlight, optional note | `tour_itinerary_days`; ROAM `roam_details.itinerary` JSON | TRIP itinerary days are now authored and persisted (minimum 3 enforced server-side) via `organizer-trips.php`. The public `tour-render.js` display is unchanged. |
| Number of check-ins and hotel names | `tour_stays`, `roam_stays` | TRIP stays are now authored and persisted via `organizer-trips.php`. ROAM stays (`roam_stays`) have no authoring UI yet — scoped out alongside `roam_details` above. |

## Code and data audited

The JavaScript/PHP audit covered all non-vendored files under `assets/js/` and
`auth/`, including:

- `connect.php`, `subscribe.php`, `signup.php`, `login.php`, `logout.php`, and
  shared `db.php` — these are the only current PHP data handlers.
- `contact-form.js`, `chrome.js`, and `auth/auth.js` — the current browser
  submission contracts for contact, newsletter, signup, and login.
- `datasets.js`, `tour-render.js`, and `roams-data.js` — destination/TRIP
  fields, generated day plans, generated lodging/inclusion examples, and the
  existing trip-enquiry request.
- `roam-details-data.js` and `roam-render.js` — the nested ROAM detail
  structure, including itinerary notes, highlights, galleries, FAQs, prices,
  and included/excluded items.
- Remaining scripts were checked for database/API writes; they implement
  page chrome, carousels, or display-only data and do not query the database.

The current SQL written by handlers targets:

```text
contact_messages       connect.php, organizer-enquiries.php (status only)
newsletter_subscribers subscribe.php
users                  signup.php, login.php, vendor-signup.php, organizer-login.php,
                        organizer-profile.php, organizer-vendors.php
vendor_profiles        vendor-signup.php, organizer-profile.php, organizer-vendors.php
rate_limits            db.php
destinations           organizer-trips.php (read-only dropdown source), public-trips.php (read-only)
tours + child tables    organizer-trips.php, public-trips.php (read-only, published only)
roams + roam_details    organizer-roams.php (listing fields only; see table above), public-roams.php (read-only, published only)
trip_enquiries          organizer-enquiries.php
sales                   organizer-sales.php
```

The public-facing catalogue pages (destination/trip/roam listings and
detail pages) still render primarily from the `datasets.js` / `roams-data.js`
/ `roam-details-data.js` JavaScript arrays, but as of the pause/resume
feature they are no longer blind to the database: `public-trips.php` and
`public-roams.php` expose whatever is currently `published`, and
`public-catalogue-sync.js` merges that into the same `DESTINATIONS_DATA` /
`ROAMS_DATA` globals those pages already read, before their existing render
logic runs. A fully database-backed public catalogue (no JS arrays at all)
is still the longer-term future-scope item described earlier in this
document — what exists now is enough for the organizer portal's own
pause/resume and publish actions to take visible effect on the public site,
nothing more.

## Schema map

### Accounts and submissions

- `users` keeps the existing customer form fields and password/lockout columns.
  `account_type` represents customer/vendor/admin; existing signup omits it,
  so the database default safely creates a customer. Admin accounts must be
  provisioned privately. Login currently does not check `account_type` or
  `account_status`; authorization middleware is required before any portal is
  exposed.
- `vendor_profiles` stores an organization's public/business details and
  review state. A vendor is not allowed to publish merely because a profile
  row exists: portal/API authorization must require both vendor account type
  and `review_status='approved'`.
- `contact_messages` remains compatible with `connect.php`'s `name`, `sub`,
  `email`, `contact`, and `msg` insert. New classification and consent columns
  have defaults so the current handler still runs. Note that the current PHP
  ignores the contact form's consent input; `consent_given` therefore remains
  false until that handler is deliberately updated.
- `trip_enquiries` has optional customer association, contact details,
  preferred check-in date, group size, consent timestamp, workflow status, and
  a required reference to exactly one TRIP or ROAM. Product deletion is
  restricted while enquiries refer to it; archive products instead.
- `newsletter_subscribers` retains the existing double-opt-in fields. A
  generated token without an email/confirmation endpoint is not proof of
  consent confirmation.
- `rate_limits` is the database-backed throttle used by the current PHP
  endpoints. Extend its allowed action names when new write endpoints ship.

### Catalogues and organizer content

- `destinations` is normalized from `DESTINATIONS_DATA`: unique slug, name,
  region, image, and blurb.
- `tours` represents the requirements' TRIPS and preserves the current
  `article_id`, `voyage_id`, duration, category, and INR card price. It adds
  publication/review ownership, breakfast and breakfast-plus-dinner rates,
  and hotel type.
- `tour_inclusions`, `tour_exclusions`, and `tour_itinerary_days` keep
  ordered editable content. Each itinerary row carries the day number, title,
  plan text, highlight flag, and optional note text.
- `tour_stays` stores ordered check-in stops, hotel names, and optional
  check-in/check-out day numbers. Its row count is the number of stay/check-in
  entries; the UI should derive and show that count rather than storing a
  second count that could drift.
- `roams` remains the lightweight listing record. Its `days` and meal-plan /
  hotel fields support organizer entry. Meal-plan amounts use the row's
  `price_currency` because current ROAM copy includes USD display prices;
  the long-form `eligibility.price` remains a display string in JSON.
  `created_by_user_id` and review
  fields support the admin-published workflow.
- `roam_details` stores the nine nested content sections consumed by
  `roam-render.js` as JSON, with one row per ROAM. The complete field contract
  is in [`roam-details-fields.txt`](roam-details-fields.txt). `roam_stays`
  holds ordered hotel/check-in entries for the organizer flow.

## Data rules and constraints

The database enforces unique emails, destination slugs, ROAM slugs, current
TRIP article IDs/voyage IDs, positive prices, unique itinerary day numbers,
and the TRIP minimum duration of 2 days. It also ensures that each
`trip_enquiries` row refers to exactly one product.

Cross-row/business rules need transactions and server-side validation; a
static HTML form or client-side checkbox is not an authorization boundary:

1. Allow customers to use customer routes; allow vendors to submit TRIPS only
   after vendor approval; allow admins to publish ROAMS and TRIPS. Check
   `account_type`, `account_status`, and vendor review status on every
   protected endpoint.
2. Validate TRIPS against the intended 3–9 day range and warn when a ROAM is
   outside its usual 9–11 day range. ROAM duration is intentionally not
   hard-limited to exactly 9–11 because the source requirement says “usually.”
3. Require at least 3 itinerary-day records and require each submitted day to
   have a usable 3–4 line plan. Require `note_text` only when Note is checked;
   clear it when unchecked. The database cannot reliably enforce visual line
   count or a parent/child minimum row count.
4. Save a product, inclusions/exclusions, itinerary, and stays in one
   transaction; validate check-in ordering and hotel names before commit.
5. Keep a draft/pending product hidden from public catalogue queries; only
   `status='published'` is public.
6. Persist the actual contact-consent choice and timestamp before relying on
   it for retention or marketing purposes.

## Install and production cautions

For a **new, empty** MySQL 8.0+ / MariaDB 10.5+ database:

```bash
mysql -u DB_ADMIN -p your_database_name < database/schema.sql
```

`CREATE TABLE IF NOT EXISTS` does not upgrade the earlier schema shipped in
this archive. For a database that already contains rows, inspect its actual
tables, back up first, then author/test ordered `ALTER TABLE` migrations in a
staging copy; do not rerun the fresh-install file and assume columns were
added. No live database connection or deployed schema was available during
the original archive review, so runtime parity for the contact/newsletter/
customer-signup handlers is unverified. The organizer portal added since is
the exception: it was built and tested against a real local MariaDB 10.11 +
PHP 8.3 instance (schema load, vendor signup, admin seed/login/approve,
trip create/approve/publish, enquiry forward with PII stripped, sale log,
profile/password change) — see the "[done] Organizer portal" entry in
Final_Changes.txt for exactly what was exercised. That still isn't the same
as production traffic against your actual host/MySQL version.

Before launch:

- Apply least-privilege grants to a dedicated application user; the app does
  not need `DROP`, `ALTER`, or `GRANT`. (The organizer portal's own test run
  used exactly this pattern — an `ep_app` user with only SELECT/INSERT/
  UPDATE/DELETE on the application database, no admin privileges.)
- Set a unique `EMBARKPEDIA_PASSWORD_PEPPER` per environment outside source
  control and rotate any password exposed in an earlier copy of `connect.php`.
- [done] Role-aware portal authorization and protected organizer CRUD
  endpoints — implemented via `ep_require_role()` and the nine
  `organizer-*.php` endpoints; see the requirements-to-schema table above.
- Add the dedicated trip-enquiry handler and wire `tour-render.js` to store
  structured product IDs/date/group details rather than free-text fields.
- Wire and test newsletter confirmation delivery plus a server endpoint that
  consumes tokens; do not email unconfirmed subscribers.
- Decide retention/deletion rules for enquiries, accounts, and vendor
  registration details; review legal/privacy copy.
- Schedule rate-limit cleanup and tune limits to measured traffic.
- Test schema creation and migrations against the exact MySQL/MariaDB version
  used by the host, including CHECK-constraint behavior.
