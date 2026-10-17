-- ============================================================
-- Embark Pedia — database schema
-- ============================================================
-- Fresh-install reference schema for MySQL 8.0+ / MariaDB 10.5+.
-- InnoDB, utf8mb4. This file is not an in-place migration: CREATE TABLE
-- IF NOT EXISTS does not add columns to tables that already exist — see
-- the ALTER TABLE migration snippets inline where an existing install
-- might be missing a newer column.
--
-- Companion documents (read these alongside this file, not instead of
-- it — this file remains the single authoritative source of DDL):
--   database/README_DB.md    — architecture reference: ERD, domain-grouped
--                               table guide, status lifecycles, and
--                               forward-looking (non-blocking) notes.
--   database/DB_Research.txt — plain-language, per-table use-case and
--                               data-movement walkthrough, plus full
--                               user-journey traces.
--   database/README.md       — historical audit trail / implementation
--                               status changelog and pre-launch checklist.
--
-- Table order below follows foreign-key dependency (every referenced
-- table is created before the table that references it), grouped where
-- possible into the six domains README_DB.md describes:
--   1. Accounts & Identity        (users, vendor_profiles, partner_profiles)
--   2. Partner Program            (partner_payouts here; partner_earnings
--                                  is necessarily last — see its own note)
--   3. Public Submissions & Abuse Control
--   4. Catalogue — TRIPS (tours)
--   5. Catalogue — ROAMS (roams)
--   6. Enquiries & Sales
--
-- Legacy note: an older contact handler used a table named `table1`.
-- If it still exists in the target database, inspect/back up the data and
-- migrate it to `contact_messages` before installing this schema:
--   RENAME TABLE table1 TO contact_messages;
--
-- Implementation boundary (kept current — see database/README.md for the
-- full history): the public site, the full organizer portal (vendor TRIP
-- authoring/approval, admin ROAM visibility toggling, partner referrals
-- and payouts), and dedicated trip-enquiry handling are all live against
-- this schema. The one still-database-only path is ROAM *authoring*: a
-- new `roams`/`roam_details` row is always inserted directly against the
-- database by hand — `organizer-roams.php` deliberately has no
-- create/update action (see the comment on `roams` below, and
-- README_DB.md §2.5/§4 item 7 for why).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Accounts & Identity
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL, -- for vendor/admin accounts: the primary contact person's name
  last_name VARCHAR(100) NOT NULL,
  age TINYINT UNSIGNED NULL,     -- required by signup.php for account_type='customer' only;
  gender ENUM('female','male','nonbinary','undisclosed') NULL, -- vendor/admin rows (organizations/staff) leave these NULL
  contact VARCHAR(30) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- password_hash(PASSWORD_BCRYPT) + server-side pepper
  -- 'partner' = refers paying customers in for a profit-share commission
  -- (see partner_profiles). Every vendor is also given a partner_profiles
  -- row at approval time (vendors can refer clients too), but a partner's
  -- own account_type stays whatever it already was ('vendor' or 'partner')
  -- — partner_profiles.user_id is the only thing that makes someone a
  -- partner, account_type here just decides which dashboard they land on.
  account_type ENUM('customer','vendor','admin','partner') NOT NULL DEFAULT 'customer',
  account_status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_type_status (account_type, account_status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One profile per vendor account. A pending profile must not be allowed
-- to publish until an application-layer authorization check approves it.
CREATE TABLE IF NOT EXISTS vendor_profiles (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  organization_name VARCHAR(180) NOT NULL,
  public_name VARCHAR(180) NULL,
  business_email VARCHAR(254) NULL,
  business_phone VARCHAR(30) NULL,
  registration_number VARCHAR(100) NULL,
  website_url VARCHAR(500) NULL,
  business_description TEXT NULL,
  review_status ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  reviewer_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vendor_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_vendor_profiles_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_vendor_profiles_review_status (review_status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Partner program (assets/js/organizer-partners.php,
--    assets/js/partner-dashboard.php)
-- ------------------------------------------------------------
-- One row per partner. A vendor gets one of these automatically the
-- moment their vendor_profiles.review_status becomes 'approved' (see
-- organizer-vendors.php) — "every vendor is a partner" — while a
-- stand-alone partner is onboarded directly from organizer-partners.php
-- (action=onboard), which is the only way a 'partner'-type user gets
-- created at all (no public partner signup).
--
-- partner_id format (13 chars, always uppercase): YY + EP50T + 6 random
-- [A-Z0-9] chars, e.g. "26EP50TQ7M2X9" (the real generator is
-- db.php: ep_generate_partner_id).
--
-- profit_share_percent is the CURRENT/live commission rate; admins edit
-- it from organizer-partners.php at any time (action=update_tier). That
-- edit is deliberately NOT retroactive: every partner_earnings row below
-- freezes its own profit_share_percent_applied at the moment it was
-- credited, so changing this column never rewrites history.
CREATE TABLE IF NOT EXISTS partner_profiles (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  partner_id CHAR(13) NOT NULL,
  display_name VARCHAR(180) NOT NULL, -- person's name, or company name if is_company
  is_company TINYINT(1) NOT NULL DEFAULT 0,
  profit_share_percent DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  tier_label VARCHAR(40) NULL, -- optional cosmetic label admin sets alongside the percent, e.g. "Gold"
  last_edited_by_user_id BIGINT UNSIGNED NULL, -- which admin last changed the tier/percent
  last_edited_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_partner_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_partner_profiles_editor
    FOREIGN KEY (last_edited_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_partner_profiles_share_range
    CHECK (profit_share_percent >= 30.00 AND profit_share_percent <= 50.00),
  UNIQUE KEY uq_partner_profiles_partner_id (partner_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- There's no payment gateway in this project (see §7 below), so a payout
-- here is the same kind of manual ledger entry as `sales`: an admin runs
-- it once per quarter, it sweeps every partner_earnings row for that
-- partner still showing payout_id IS NULL into one new row here and
-- stamps them all with this payout's id (so "pending" vs. "total payout"
-- for a partner is always just a payout_id IS NULL / IS NOT NULL split of
-- partner_earnings — see partner-dashboard.php). Created here, right
-- after partner_profiles, because unlike partner_earnings it only
-- references `users` — it doesn't need to wait for tours/trip_enquiries
-- to exist.
CREATE TABLE IF NOT EXISTS partner_payouts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  partner_user_id BIGINT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_at DATETIME NOT NULL,
  paid_by_user_id BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(255) NULL,
  CONSTRAINT fk_partner_payouts_partner
    FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_payouts_admin
    FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_partner_payouts_partner (partner_user_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- partner_earnings itself is defined much further down this file, as
-- section 2c, right after §6 (Enquiries & Sales) — see the note there
-- for why it can't live here next to its sibling partner tables.

-- ------------------------------------------------------------
-- 3. Public submissions & abuse control
-- ------------------------------------------------------------
-- 3a. Public contact-us enquiries (assets/js/connect.php)
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  sub VARCHAR(200) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL,
  contact VARCHAR(30) NULL,
  msg TEXT NOT NULL,
  enquiry_type ENUM('general','large_group','itinerary_consult') NOT NULL DEFAULT 'general',
  consent_given TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('new','in_progress','responded','closed','spam') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_messages_created_at (created_at),
  INDEX idx_contact_messages_email (email),
  INDEX idx_contact_messages_type_status (enquiry_type, status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- `connect.php` currently writes only the original fields above and does
-- not persist the contact consent checkbox. consent_given therefore
-- defaults to false until that handler is updated to store consent.

-- 3b. Newsletter subscribers (assets/js/subscribe.php)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  consent VARCHAR(10) NOT NULL DEFAULT 'Accept',
  confirm_token CHAR(64) NOT NULL,
  confirmed_at DATETIME NULL,
  unsubscribed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_newsletter_email (email),
  UNIQUE KEY uq_newsletter_confirm_token (confirm_token),
  INDEX idx_newsletter_confirmation (confirmed_at, unsubscribed_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- subscribe.php creates the token but no confirmation-mail/confirmation
-- endpoint is present yet. Do not treat unconfirmed rows as a mailing list.

-- 3c. Shared endpoint abuse controls (assets/js/db.php)
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL, -- IPv4 or IPv6
  action VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rate_limits_lookup (ip_address, action, created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Housekeeping (schedule through cron after confirming retention needs):
-- DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL 1 DAY;

-- ------------------------------------------------------------
-- 4. Catalogue — TRIPS (destinations, tours, and tour detail)
--    Source reference: assets/js/datasets.js / tour-render.js /
--    organizer-trips.php
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destinations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(140) NOT NULL,
  name VARCHAR(160) NOT NULL,
  region VARCHAR(80) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  blurb VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_destinations_slug (slug),
  INDEX idx_destinations_region (region)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- This table represents TRIPS (the 2–9 day product class). `price_inr`
-- remains for the existing card renderer; explicit meal-plan rates are
-- for the organizer submission workflow.
--
-- Status note (see README_DB.md §3.1 for the full, code-verified
-- lifecycle): 'draft' is this column's DEFAULT but is not actually
-- reachable through organizer-trips.php today — a vendor's create()
-- inserts straight at 'pending_review' and an admin's create() inserts
-- straight at 'published'. A vendor's update() of any of their own
-- non-published trips (including a previously 'rejected', 'paused' or
-- 'archived' one) always resets status back to 'pending_review'; an
-- admin's update() never changes status. 'published' is the only status
-- public-trips.php ever serves.
--
-- Migration for an existing tours table whose status ENUM predates
-- 'paused': ALTER TABLE tours MODIFY COLUMN status
--   ENUM('draft','pending_review','published','paused','rejected','archived')
--   NOT NULL DEFAULT 'draft';
CREATE TABLE IF NOT EXISTS tours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  destination_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  article_id VARCHAR(20) NOT NULL,
  voyage_id CHAR(6) NOT NULL,
  days SMALLINT UNSIGNED NOT NULL,
  nights SMALLINT UNSIGNED NOT NULL,
  category VARCHAR(60) NOT NULL,
  price_inr DECIMAL(10,2) NOT NULL,
  price_with_breakfast_inr DECIMAL(10,2) NULL,
  price_with_breakfast_dinner_inr DECIMAL(10,2) NULL,
  hotel_type VARCHAR(80) NULL,
  image_url VARCHAR(500) NULL,
  -- 'paused' (added alongside the organizer portal's pause/resume actions,
  -- see organizer-trips.php): a vendor or admin can take a published trip
  -- off the public site without losing its review/approval history or its
  -- child rows (inclusions/itinerary/stays) — unlike 'archived', which is
  -- a retirement a vendor can only apply to their own non-published trips
  -- (an admin may archive any trip regardless of status).
  status ENUM('draft','pending_review','published','paused','rejected','archived') NOT NULL DEFAULT 'draft',
  submitted_by_user_id BIGINT UNSIGNED NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tours_destination
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tours_submitter
    FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tours_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_tours_minimum_days CHECK (days >= 2),
  CONSTRAINT chk_tours_price_nonnegative CHECK (price_inr >= 0),
  CONSTRAINT chk_tours_breakfast_price_nonnegative
    CHECK (price_with_breakfast_inr IS NULL OR price_with_breakfast_inr >= 0),
  CONSTRAINT chk_tours_breakfast_dinner_price_nonnegative
    CHECK (price_with_breakfast_dinner_inr IS NULL OR price_with_breakfast_dinner_inr >= 0),
  UNIQUE KEY uq_tours_article_id (article_id),
  UNIQUE KEY uq_tours_voyage_id (voyage_id),
  INDEX idx_tours_destination_status (destination_id, status),
  INDEX idx_tours_category (category),
  INDEX idx_tours_submitter (submitted_by_user_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tour_inclusions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tour_id BIGINT UNSIGNED NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  item_text VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tour_inclusions_tour
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tour_inclusions_position (tour_id, position)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tour_exclusions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tour_id BIGINT UNSIGNED NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  item_text VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tour_exclusions_tour
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tour_exclusions_position (tour_id, position)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Each record is one itinerary day. Store the 3–4 line day plan as text;
-- validate the line-count and minimum three submitted days in the API/UI.
-- A note is stored on the same day and should be required only when the
-- organizer's "Note" checkbox is selected.
CREATE TABLE IF NOT EXISTS tour_itinerary_days (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tour_id BIGINT UNSIGNED NOT NULL,
  day_number SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  plan_text TEXT NOT NULL,
  is_highlight TINYINT(1) NOT NULL DEFAULT 0,
  note_text TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tour_itinerary_days_tour
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
  CONSTRAINT chk_tour_itinerary_day_number CHECK (day_number >= 1),
  UNIQUE KEY uq_tour_itinerary_day (tour_id, day_number)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One row per lodging/check-in stop; position is the ordered check-in
-- number and hotel_name stores the organizer-entered property name.
CREATE TABLE IF NOT EXISTS tour_stays (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tour_id BIGINT UNSIGNED NOT NULL,
  checkin_number SMALLINT UNSIGNED NOT NULL,
  hotel_name VARCHAR(200) NOT NULL,
  checkin_day SMALLINT UNSIGNED NULL,
  checkout_day SMALLINT UNSIGNED NULL,
  notes VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tour_stays_tour
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
  CONSTRAINT chk_tour_stays_checkin_number CHECK (checkin_number >= 1),
  CONSTRAINT chk_tour_stays_day_order
    CHECK (checkout_day IS NULL OR checkin_day IS NULL OR checkout_day >= checkin_day),
  UNIQUE KEY uq_tour_stays_checkin (tour_id, checkin_number)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Catalogue — ROAMS (admin-managed 9–11 day products) and their
--    detail page
--    Summary source: assets/js/roams-data.js
--    Long-form source shape: assets/js/roam-details-data.js
--
-- IMPORTANT — there is no INSERT path for `roams` anywhere in the
-- application. organizer-roams.php's "create"/"update" actions are
-- deliberately disabled (they return HTTP 410, "new rows must be added
-- directly in the database"), and the admin dashboard's own empty-state
-- copy tells the admin the same thing. Every new ROAM — both this listing
-- row and its roam_details row below — is inserted by hand, directly
-- against the database, by whoever has that access; `created_by_user_id`
-- is consequently NOT populated by any current code path (set it
-- yourself on insert if you want that provenance recorded).
-- organizer-roams.php only ever UPDATEs this table's `status` column:
-- publish (also resumes a paused row; explicitly refuses an archived
-- row), pause (requires 'published'), and archive (one-way). See
-- README_DB.md §2.5/§3.2/§4 item 7 for the full, code-verified picture —
-- and note that database/README.md's older "listing-level CRUD
-- implemented" description of this endpoint predates its removal and is
-- no longer accurate.
--
-- Migration for an existing roams table whose status ENUM predates
-- 'paused': ALTER TABLE roams MODIFY COLUMN status
--   ENUM('draft','pending_review','published','paused','rejected','archived')
--   NOT NULL DEFAULT 'draft';
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roams (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(140) NOT NULL,
  title VARCHAR(160) NOT NULL,
  route VARCHAR(255) NOT NULL,
  date_range VARCHAR(120) NOT NULL,
  days SMALLINT UNSIGNED NULL,
  price_with_breakfast DECIMAL(10,2) NULL,
  price_with_breakfast_dinner DECIMAL(10,2) NULL,
  price_currency CHAR(3) NULL,
  hotel_type VARCHAR(80) NULL,
  image_url VARCHAR(500) NOT NULL,
  description VARCHAR(500) NOT NULL,
  full_page_path VARCHAR(255) NOT NULL,
  -- 'paused' — see the matching note on tours.status above. Pausing a ROAM
  -- also pulls it from the navbar dropdown (chrome.js re-fetches
  -- public-roams.php on every page load, see that file's header comment).
  status ENUM('draft','pending_review','published','paused','rejected','archived') NOT NULL DEFAULT 'draft',
  created_by_user_id BIGINT UNSIGNED NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_roams_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_roams_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_roams_days_positive CHECK (days IS NULL OR days >= 1),
  CONSTRAINT chk_roams_breakfast_price_nonnegative
    CHECK (price_with_breakfast IS NULL OR price_with_breakfast >= 0),
  CONSTRAINT chk_roams_breakfast_dinner_price_nonnegative
    CHECK (price_with_breakfast_dinner IS NULL OR price_with_breakfast_dinner >= 0),
  UNIQUE KEY uq_roams_slug (slug),
  INDEX idx_roams_status (status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The JSON columns preserve the exact nested shape consumed by
-- roam-render.js. See roam-details-fields.txt for every key and type.
-- Same no-INSERT-path caveat as `roams` above applies here too — see that
-- table's comment.
CREATE TABLE IF NOT EXISTS roam_details (
  roam_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  page_title VARCHAR(160) NOT NULL,
  hero JSON NOT NULL,
  about JSON NOT NULL,
  gallery JSON NOT NULL,
  itinerary JSON NOT NULL,
  inclusions JSON NOT NULL,
  packing JSON NOT NULL,
  eligibility JSON NOT NULL,
  faq JSON NOT NULL,
  footer JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_roam_details_roam
    FOREIGN KEY (roam_id) REFERENCES roams(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Optional structured lodging/check-in rows for the organizer form;
-- the full roam page's inclusions and itinerary remain in roam_details JSON.
CREATE TABLE IF NOT EXISTS roam_stays (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  roam_id BIGINT UNSIGNED NOT NULL,
  checkin_number SMALLINT UNSIGNED NOT NULL,
  hotel_name VARCHAR(200) NOT NULL,
  checkin_day SMALLINT UNSIGNED NULL,
  checkout_day SMALLINT UNSIGNED NULL,
  notes VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_roam_stays_roam
    FOREIGN KEY (roam_id) REFERENCES roams(id) ON DELETE CASCADE,
  CONSTRAINT chk_roam_stays_checkin_number CHECK (checkin_number >= 1),
  CONSTRAINT chk_roam_stays_day_order
    CHECK (checkout_day IS NULL OR checkin_day IS NULL OR checkout_day >= checkin_day),
  UNIQUE KEY uq_roam_stays_checkin (roam_id, checkin_number)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Enquiries & sales
-- ------------------------------------------------------------
-- 6a. Dedicated trip enquiries — assets/js/submit-trip-enquiry.php (public
--     submission) and assets/js/organizer-enquiries.php (admin queue).
--
-- Exactly one product reference is required: either a TRIP (`tour_id`) or
-- a ROAM (`roam_id`). submit-trip-enquiry.php writes directly into this
-- table (including resolving an optional typed-in PartnerID against
-- partner_profiles into partner_user_id) — tour-render.js calls that
-- endpoint, not connect.php. (database/README.md still describes the
-- older, now-superseded state where this form posted through connect.php
-- into contact_messages as plain subject/message text — see README_DB.md's
-- opening note for the corrected history.)
--
-- Migration for an existing trip_enquiries table missing the newest
-- columns:
--   ALTER TABLE trip_enquiries
--     ADD COLUMN shared_with_vendor TINYINT(1) NOT NULL DEFAULT 0,
--     ADD COLUMN shared_at DATETIME NULL,
--     ADD COLUMN partner_id_entered VARCHAR(13) NULL,
--     ADD COLUMN partner_user_id BIGINT UNSIGNED NULL,
--     ADD COLUMN resolved_by_user_id BIGINT UNSIGNED NULL,
--     ADD COLUMN resolved_at DATETIME NULL,
--     ADD COLUMN partner_credit_status ENUM('not_applicable','awaiting_window','credited') NOT NULL DEFAULT 'not_applicable',
--     ADD COLUMN invoice_reference VARCHAR(100) NULL,
--     MODIFY COLUMN status ENUM('on_hold','closed','resolved') NOT NULL DEFAULT 'on_hold';
CREATE TABLE IF NOT EXISTS trip_enquiries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tour_id BIGINT UNSIGNED NULL,
  roam_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  contact VARCHAR(30) NOT NULL,
  -- Doubles as "travel date" for the partner-commission 7-day window rule
  -- below — there is only ever one date on an enquiry.
  preferred_checkin_date DATE NULL,
  group_size SMALLINT UNSIGNED NULL, -- "number of pax"
  message TEXT NULL,
  consent_at DATETIME NULL,
  -- Exactly the three admin-facing states from the design brief:
  --   on_hold  (default — customer still deciding whether to book)
  --   closed   (customer isn't going ahead)
  --   resolved (customer paid the booking amount, invoice generated)
  status ENUM('on_hold','closed','resolved') NOT NULL DEFAULT 'on_hold',
  -- Admin-controlled privacy gate (organizer-enquiries.php): a TRIP enquiry
  -- is invisible to its vendor until an admin explicitly forwards it, and
  -- even then the vendor's API response omits name/email/contact — the
  -- admin remains the customer's point of contact.
  shared_with_vendor TINYINT(1) NOT NULL DEFAULT 0,
  shared_at DATETIME NULL,
  -- ---- Partner referral fields (tour-details.html enquiry form) --------
  -- partner_id_entered keeps whatever the customer actually typed, even
  -- if it didn't match anyone (so admin can spot and fix a typo);
  -- partner_user_id is the resolved FK once a match is found, and is
  -- what organizer-enquiries.php actually credits against on resolve.
  partner_id_entered VARCHAR(13) NULL,
  partner_user_id BIGINT UNSIGNED NULL,
  resolved_by_user_id BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  -- "On resolving, once the booking is within 7 days of travel, number
  -- of pax gets updated to partner as well" — resolving doesn't always
  -- credit immediately (travel might be months away), so this tracks
  -- where a referred-and-resolved enquiry stands:
  --   not_applicable  — no partner_user_id on this enquiry at all
  --   awaiting_window — resolved, has a partner, but travel is still
  --                     more than 7 days out; organizer-enquiries.php
  --                     re-checks this on every admin page load and
  --                     credits it the moment the window opens
  --   credited        — a partner_earnings row now exists for this enquiry
  partner_credit_status ENUM('not_applicable','awaiting_window','credited') NOT NULL DEFAULT 'not_applicable',
  invoice_reference VARCHAR(100) NULL, -- optional note admin can add on resolve
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_trip_enquiries_tour
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE RESTRICT,
  CONSTRAINT fk_trip_enquiries_roam
    FOREIGN KEY (roam_id) REFERENCES roams(id) ON DELETE RESTRICT,
  CONSTRAINT fk_trip_enquiries_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_trip_enquiries_partner
    FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_trip_enquiries_resolver
    FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_trip_enquiries_one_product
    CHECK ((tour_id IS NULL AND roam_id IS NOT NULL) OR
           (tour_id IS NOT NULL AND roam_id IS NULL)),
  CONSTRAINT chk_trip_enquiries_group_size CHECK (group_size IS NULL OR group_size >= 1),
  INDEX idx_trip_enquiries_status_created (status, created_at),
  INDEX idx_trip_enquiries_email (email),
  INDEX idx_trip_enquiries_partner_credit (partner_user_id, partner_credit_status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6b. Sales — organizer-sales.php (vendor dashboard "track sales of self";
--     admin dashboard "track sales for all vendors")
--
-- There is still no payment/booking flow (see §7), so a sale here is a
-- manually-recorded confirmed booking: a vendor logs their own sale, or
-- an admin logs one for any TRIP/ROAM (ROAMS have no vendor, so
-- vendor_user_id is NULL for those — admin-only revenue). Exactly one of
-- tour_id/roam_id is required, same rule as trip_enquiries.
CREATE TABLE IF NOT EXISTS sales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tour_id BIGINT UNSIGNED NULL,
  roam_id BIGINT UNSIGNED NULL,
  vendor_user_id BIGINT UNSIGNED NULL, -- denormalised copy of tours.submitted_by_user_id at sale time
  recorded_by_user_id BIGINT UNSIGNED NOT NULL, -- who logged the sale (vendor or admin)
  buyer_name VARCHAR(120) NOT NULL,
  buyer_email VARCHAR(254) NULL,
  buyer_contact VARCHAR(30) NULL,
  group_size SMALLINT UNSIGNED NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  sale_date DATE NOT NULL,
  status ENUM('confirmed','cancelled','refunded') NOT NULL DEFAULT 'confirmed',
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_tour FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_roam FOREIGN KEY (roam_id) REFERENCES roams(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_vendor FOREIGN KEY (vendor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_recorder FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_sales_one_product
    CHECK ((tour_id IS NULL AND roam_id IS NOT NULL) OR (tour_id IS NOT NULL AND roam_id IS NULL)),
  CONSTRAINT chk_sales_amount_nonnegative CHECK (amount >= 0),
  INDEX idx_sales_vendor_date (vendor_user_id, sale_date),
  INDEX idx_sales_date (sale_date)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2c. Partner earnings ledger (continued from §2 above) —
--     assets/js/organizer-enquiries.php credits a row here when a
--     referred enquiry is resolved and within the 7-day travel window;
--     assets/js/partner-dashboard.php and organizer-partners.php read it.
-- ------------------------------------------------------------
-- Defined here, after tours/roams/trip_enquiries/sales/partner_payouts,
-- rather than back in §2 alongside partner_profiles/partner_payouts,
-- because its foreign keys require trip_enquiries and tours to already
-- exist — defining it earlier (as a previous revision of this file did)
-- makes CREATE TABLE fail outright against a fresh database, since MySQL
-- requires a referenced table to exist before the referencing table's FK
-- can be added. Conceptually it's still part of the Partner Program
-- domain (see README_DB.md §2.2/§1) — this is purely a physical-ordering
-- constraint, not a reclassification.
--
-- One row per credited trip_enquiries.id (see uq_partner_earnings_enquiry
-- — an enquiry can only ever be credited once). base_amount,
-- profit_share_percent_applied and commission_amount are all snapshotted
-- at credit time and never recalculated, which is what makes a later
-- profit_share_percent change on partner_profiles non-retroactive.
CREATE TABLE IF NOT EXISTS partner_earnings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  partner_user_id BIGINT UNSIGNED NOT NULL,
  enquiry_id BIGINT UNSIGNED NOT NULL,
  tour_id BIGINT UNSIGNED NOT NULL,
  voyage_id VARCHAR(20) NOT NULL, -- denormalised copy of tours.voyage_id at credit time, for the "VoyageID wise" sales tab
  tour_title VARCHAR(200) NOT NULL, -- denormalised copy of tours.title at credit time
  pax SMALLINT UNSIGNED NOT NULL,
  base_amount DECIMAL(12,2) NOT NULL, -- tours.price_inr * pax, snapshotted
  profit_share_percent_applied DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL, -- base_amount * profit_share_percent_applied / 100, frozen
  credited_at DATETIME NOT NULL,
  -- NULL = pending payout; set once included in a partner_payouts run.
  -- Now a real FK (previously just a bare column with no referential
  -- integrity, despite the relationship being documented everywhere else
  -- — see README_DB.md's ERD) — ON DELETE SET NULL rather than RESTRICT,
  -- since a payout record being removed shouldn't be blocked by, or take
  -- down, the earnings it had swept up; it should simply fall back to
  -- "pending" so the next payout run picks it up again.
  payout_id BIGINT UNSIGNED NULL,
  CONSTRAINT fk_partner_earnings_partner
    FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_earnings_enquiry
    FOREIGN KEY (enquiry_id) REFERENCES trip_enquiries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_earnings_tour
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_earnings_payout
    FOREIGN KEY (payout_id) REFERENCES partner_payouts(id) ON DELETE SET NULL,
  CONSTRAINT chk_partner_earnings_pax_positive CHECK (pax >= 1),
  CONSTRAINT chk_partner_earnings_amounts_nonnegative
    CHECK (base_amount >= 0 AND commission_amount >= 0),
  UNIQUE KEY uq_partner_earnings_enquiry (enquiry_id),
  INDEX idx_partner_earnings_partner_payout (partner_user_id, payout_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Deliberately deferred until matching product flows exist
-- ------------------------------------------------------------
-- bookings / payments (sales above is a manual ledger, not a checkout flow)
-- password_resets / email_verification (no user-facing flows yet)
-- reviews/testimonials (currently hardcoded in assets/js/testimony.js)
-- sessions table (PHP's native session store is used for this single-host site)

-- ------------------------------------------------------------
-- 8. Seeding the first admin account (organizer portal has no public
--    admin signup — see assets/js/organizer-login.php). Generate a
--    bcrypt+pepper hash with:
--      php -r "echo password_hash('your-temp-password' . getenv('EMBARKPEDIA_PASSWORD_PEPPER'), PASSWORD_BCRYPT, ['cost'=>12]), PHP_EOL;"
--    then:
--      INSERT INTO users (first_name, last_name, contact, email, password_hash, account_type)
--      VALUES ('Admin', 'User', '+91 00000 00000', 'admin@embarkpedia.com', '<generated hash>', 'admin');
--    Change the password via the organizer profile page on first login.
-- ------------------------------------------------------------
