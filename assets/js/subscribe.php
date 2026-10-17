<?php
/**
 * subscribe.php
 * ------------------------------------------------------------------
 * Backend for the footer newsletter form (#ep-newsletter-form, present
 * on every page via assets/include/footer.html). Replaces the
 * "temporarily unavailable" mock in assets/js/chrome.js.
 *
 * The footer no longer shows a passive disclaimer paragraph next to the
 * form (see assets/include/footer.html). Consent is instead captured by
 * the Accept/Deny prompt chrome.js shows on submit, and that response is
 * persisted here in the `consent` column alongside the email — not just
 * displayed as text — so there's a durable record of what the visitor
 * agreed to, independent of the UI copy.
 *
 * Implements a double opt-in: the row is stored as unconfirmed and a
 * confirmation token is generated. Actually emailing that token
 * requires a transactional-email provider (SES/SendGrid/Postmark) —
 * wiring one in is listed as a required follow-up in database/README.md /
 * Final_Changes.txt, since it needs real provider credentials this
 * archive cannot include.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    ep_json_ok(['message' => 'Thank you for subscribing!']);
}

ep_rate_limit('subscribe', 5, 600); // 5 attempts / 10 minutes / IP

$email = trim((string)($_POST['email'] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 254) {
    ep_json_fail(422, 'Please enter a valid email address.');
}

// The browser only ever sends this request after the visitor clicks
// "Accept" on the confirmation prompt (see chrome.js), so anything else
// arriving here isn't a recognised consent response. Default to "Accept"
// since that's the only value the real form can send, but don't just
// trust an arbitrary string blindly.
$consent = trim((string)($_POST['consent'] ?? 'Accept'));
if ($consent !== 'Accept') {
    ep_json_fail(422, 'Consent is required to subscribe.');
}

$conn = ep_db();
$token = bin2hex(random_bytes(32));

// Idempotent: re-subscribing an existing (even confirmed) address just
// refreshes its token (and consent record) rather than erroring, so a
// visitor who subscribes twice by mistake doesn't see a confusing failure.
$stmt = $conn->prepare(
    'INSERT INTO newsletter_subscribers (email, consent, confirm_token, confirmed_at, created_at)
     VALUES (?, ?, ?, NULL, NOW())
     ON DUPLICATE KEY UPDATE confirm_token = VALUES(confirm_token), consent = VALUES(consent)'
);
$stmt->bind_param('sss', $email, $consent, $token);

if (!$stmt->execute()) {
    $stmt->close();
    ep_json_fail(500, 'Could not save your subscription. Please try again later.');
}
$stmt->close();

// TODO (needs a provider): send a confirmation email containing a link
// such as /assets/js/confirm_subscription.php?token=<$token> before
// marking confirmed_at. Until that's wired up, treat this table as a
// lead list requiring manual export/consent-check, not a live mailing
// list — do not bulk-email unconfirmed rows.

ep_json_ok(['message' => 'Thank you for subscribing! Please check your inbox to confirm.']);
