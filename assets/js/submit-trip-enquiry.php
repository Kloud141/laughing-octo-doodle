<?php
/**
 * submit-trip-enquiry.php
 * ------------------------------------------------------------------
 * Public endpoint for the "Enquire about this trip" form on
 * destinations/tour-details.html (assets/js/tour-render.js). Writes an
 * actual row into trip_enquiries — the form previously posted into the
 * generic `contact_messages` table via connect.php, which meant nothing
 * ever reached organizer-enquiries.php's Trip Approvals-adjacent
 * "Enquiry Forwarder" queue. This is the fix for that gap, and also
 * where the partner-referral fields land:
 *   - partner_id (optional, typed by the customer): looked up against
 *     partner_profiles.partner_id; if it matches an ACTIVE partner,
 *     partner_user_id is set and that's what organizer-enquiries.php
 *     later credits on resolve. If it doesn't match anything (typo, or
 *     left blank), the enquiry is still accepted — partner_id_entered
 *     just keeps whatever was typed (or NULL) for admin visibility.
 *   - group_size ("number of pax")
 *
 * Same anti-abuse pattern as the other public endpoints in this file
 * (same-site check, honeypot, rate limit) — see connect.php for the
 * identical approach and why there's no server-side reCAPTCHA
 * verification here either (not implemented anywhere in this project
 * yet; the widget is client-side only, see tour-render.js's comment on
 * RECAPTCHA_SITE_KEY).
 *
 * POST fields: voyage_id, name, email, contact, preferred_checkin_date
 * (YYYY-MM-DD), group_size, message, partner_id (optional), website
 * (honeypot).
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    ep_json_ok(['message' => 'Thanks — we\'ll be in touch shortly.']);
}

ep_rate_limit('trip_enquiry', 8, 600); // 8 enquiries / 10 minutes / IP

$voyageId = trim((string)($_POST['voyage_id'] ?? ''));
$name = trim((string)($_POST['name'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$contact = trim((string)($_POST['contact'] ?? ''));
$checkinRaw = trim((string)($_POST['preferred_checkin_date'] ?? ''));
$groupSizeRaw = trim((string)($_POST['group_size'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));
$partnerIdRaw = strtoupper(trim((string)($_POST['partner_id'] ?? '')));

if ($voyageId === '') ep_json_fail(422, 'Missing trip reference.');
if ($name === '' || mb_strlen($name) > 120) ep_json_fail(422, 'Enter your name.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) ep_json_fail(422, 'Enter a valid email address.');
if (!preg_match('/^[0-9+\-\s()]{7,20}$/', $contact)) ep_json_fail(422, 'Enter a valid contact number.');

$checkinDate = null;
if ($checkinRaw !== '') {
    $d = DateTime::createFromFormat('Y-m-d', $checkinRaw);
    if (!$d || $d->format('Y-m-d') !== $checkinRaw) ep_json_fail(422, 'Enter a valid preferred check-in date.');
    $checkinDate = $checkinRaw;
}

$groupSize = null;
if ($groupSizeRaw !== '') {
    if (!ctype_digit($groupSizeRaw) || (int)$groupSizeRaw < 1 || (int)$groupSizeRaw > 500) {
        ep_json_fail(422, 'Enter a valid number of pax (1–500).');
    }
    $groupSize = (int)$groupSizeRaw;
}

if (mb_strlen($message) > 3000) ep_json_fail(422, 'Message is too long (3000 characters max).');

$conn = ep_db();

$tourStmt = $conn->prepare('SELECT id FROM tours WHERE voyage_id = ? AND status IN (\'published\', \'paused\') LIMIT 1');
$tourStmt->bind_param('s', $voyageId);
$tourStmt->execute();
$tour = $tourStmt->get_result()->fetch_assoc();
$tourStmt->close();
if (!$tour) ep_json_fail(404, 'We couldn\'t find that trip — it may have been taken down.');
$tourId = (int)$tour['id'];

// Resolve an optional PartnerID. Only an ACTIVE account counts — a
// suspended partner's old link should not keep crediting them.
$partnerUserId = null;
$partnerIdEnteredOrNull = $partnerIdRaw !== '' ? $partnerIdRaw : null;
if ($partnerIdRaw !== '') {
    if (!preg_match('/^[A-Z0-9]{13}$/', $partnerIdRaw)) {
        ep_json_fail(422, 'Partner ID should be 13 characters (letters and numbers only).');
    }
    $pStmt = $conn->prepare(
        "SELECT pp.user_id FROM partner_profiles pp JOIN users u ON u.id = pp.user_id
         WHERE pp.partner_id = ? AND u.account_status = 'active' LIMIT 1"
    );
    $pStmt->bind_param('s', $partnerIdRaw);
    $pStmt->execute();
    $pRow = $pStmt->get_result()->fetch_assoc();
    $pStmt->close();
    if ($pRow) $partnerUserId = (int)$pRow['user_id'];
    // No match: still accept the enquiry, just leave partner_user_id NULL —
    // partner_id_entered keeps the typed value for admin to spot the typo.
}

$partnerCreditStatus = $partnerUserId !== null ? 'awaiting_window' : 'not_applicable';

$stmt = $conn->prepare(
    'INSERT INTO trip_enquiries
       (tour_id, name, email, contact, preferred_checkin_date, group_size, message, consent_at,
        status, partner_id_entered, partner_user_id, partner_credit_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), \'on_hold\', ?, ?, ?)'
);
$stmt->bind_param(
    'isssssssis',
    $tourId, $name, $email, $contact, $checkinDate, $groupSize, $message,
    $partnerIdEnteredOrNull, $partnerUserId, $partnerCreditStatus
);

if ($stmt->execute()) {
    $stmt->close();
    ep_json_ok(['message' => 'Thanks — your enquiry has been sent. We\'ll be in touch shortly.']);
} else {
    $stmt->close();
    ep_json_fail(500, 'Something went wrong. Please try again later.');
}
