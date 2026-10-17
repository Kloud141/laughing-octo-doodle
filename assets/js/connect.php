<?php
/**
 * connect.php
 * ------------------------------------------------------------------
 * Handles the contact form POST from /contact/contact.html.
 *
 * This revision moves credential loading, session hardening, and the
 * database connection into the shared assets/js/db.php (also used by
 * subscribe.php, signup.php and login.php) and adds the same
 * anti-abuse controls those endpoints use: Origin/Referer check,
 * honeypot field, and IP-based rate limiting. The parameterised
 * mysqli prepared statement from the previous revision is unchanged —
 * user input was already never concatenated into SQL.
 *
 * NOTE: credentials that were hardcoded in an earlier copy of this
 * file were exposed publicly. If that database is still live, rotate
 * its password — replacing this file does not undo that exposure.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    // Pretend success so the bot doesn't learn it was caught; nothing written.
    ep_json_ok(['message' => 'Done! Thank You!']);
}

ep_rate_limit('contact', 6, 600); // 6 enquiries / 10 minutes / IP

// ---- Input handling: trim, require the fields the form marks as
// required, and validate the email format. The prepared statement
// below is what actually prevents SQL injection; this is about
// giving the user useful feedback.
$name    = trim((string)($_POST['name'] ?? ''));
$sub     = trim((string)($_POST['sub'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$contact = trim((string)($_POST['contact'] ?? ''));
$msg     = trim((string)($_POST['msg'] ?? ''));

if ($name === '' || mb_strlen($name) > 120 || $email === '' || $msg === '') {
    ep_json_fail(422, 'Please fill in your name, email, and message.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ep_json_fail(422, 'Please enter a valid email address.');
}
if (mb_strlen($msg) > 5000) {
    ep_json_fail(422, 'Message is too long (5000 characters max).');
}

$conn = ep_db();

$stmt = $conn->prepare(
    'INSERT INTO contact_messages (name, sub, email, contact, msg, created_at) VALUES (?, ?, ?, ?, ?, NOW())'
);
$stmt->bind_param('sssss', $name, $sub, $email, $contact, $msg);

if ($stmt->execute()) {
    $stmt->close();
    ep_json_ok(['message' => 'Done! Thank You!']);
} else {
    $stmt->close();
    ep_json_fail(500, 'Something went wrong. Please try again later.');
}
