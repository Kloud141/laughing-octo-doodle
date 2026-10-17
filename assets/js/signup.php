<?php
/**
 * signup.php
 * ------------------------------------------------------------------
 * Backend for the "Sign Up" tab on /auth/login.html (#ep-signup-form).
 * Replaces the client-only mock in auth.js ("Account creation is not
 * available yet..."). Responds with JSON; see assets/js/auth.js for
 * the matching fetch() call.
 *
 * Field names below match the existing HTML exactly (fname, lname,
 * age, gender, contact, email, password, confirm) — no markup changes
 * were required to wire this up, only auth.js.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    ep_json_ok(); // pretend success to the bot; nothing is written
}

ep_rate_limit('signup', 8, 600); // 8 attempts / 10 minutes / IP

// ---- Collect + validate ------------------------------------------------
$fname   = trim((string)($_POST['fname'] ?? ''));
$lname   = trim((string)($_POST['lname'] ?? ''));
$age     = (int)($_POST['age'] ?? 0);
$gender  = trim((string)($_POST['gender'] ?? ''));
$contact = trim((string)($_POST['contact'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$password = (string)($_POST['password'] ?? '');
$confirm  = (string)($_POST['confirm'] ?? '');
$terms    = ($_POST['terms'] ?? '') === 'on' || ($_POST['terms'] ?? '') === '1' || ($_POST['terms'] ?? '') === 'true';

$errors = [];
if ($fname === '' || mb_strlen($fname) > 100) $errors['fname'] = 'Enter a first name.';
if ($lname === '' || mb_strlen($lname) > 100) $errors['lname'] = 'Enter a last name.';
if ($age < 13 || $age > 120) $errors['age'] = 'Enter a valid age (13–120).';
if (!in_array($gender, ['female', 'male', 'nonbinary', 'undisclosed'], true)) {
    // Matches the <option value="..."> list in auth/login.html exactly.
    $errors['gender'] = 'Select a gender option.';
}
if (!preg_match('/^[0-9+\-\s]{7,15}$/', $contact)) $errors['contact'] = 'Enter a valid contact number.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 254) $errors['email'] = 'Enter a valid email address.';
if (mb_strlen($password) < 8 || mb_strlen($password) > 72) $errors['password'] = 'Password must be 8–72 characters.';
if ($password !== $confirm) $errors['confirm'] = 'Passwords do not match.';
if (!$terms) $errors['terms'] = 'You must accept the Terms & Conditions.';

// Note: the signup form's canvas captcha (su-captcha-*) is drawn and
// checked entirely client-side in auth.js, so it cannot be re-verified
// here — it only deters unsophisticated bots. The honeypot + rate
// limit above are this endpoint's real anti-automation controls.
// Future scope: replace the canvas captcha with a server-verified
// challenge (hCaptcha/Turnstile) — see database/README.md.

if (!empty($errors)) {
    ep_json_fail(422, 'Please fix the highlighted fields.');
}

$conn = ep_db();

// ---- Uniqueness check ----------------------------------------------
$check = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$check->bind_param('s', $email);
$check->execute();
$exists = $check->get_result()->num_rows > 0;
$check->close();

if ($exists) {
    // Deliberately vague: do not reveal whether an email is registered
    // to an unauthenticated caller (prevents account enumeration).
    ep_json_fail(409, 'That email could not be registered. Try signing in, or use a different address.');
}

// ---- Hash + store --------------------------------------------------
// password_hash() already salts per-password with bcrypt; the pepper
// is an additional server-side secret not stored in the database, so
// a stolen `users` table alone is not enough to brute-force passwords.
$hash = password_hash($password . EP_PASSWORD_PEPPER, PASSWORD_BCRYPT, ['cost' => 12]);

// name_is_split = 1: this form already collects first/last name as two
// separate fields, so there's nothing to prompt for later (see
// database/schema.sql and assets/js/me.php).
$stmt = $conn->prepare(
    'INSERT INTO users (first_name, last_name, age, gender, contact, email, password_hash, name_is_split, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())'
);
$stmt->bind_param('ssissss', $fname, $lname, $age, $gender, $contact, $email, $hash);

if (!$stmt->execute()) {
    $stmt->close();
    ep_json_fail(500, 'Could not create the account. Please try again later.');
}
$userId = $stmt->insert_id;
$stmt->close();

// ---- Log the visitor in immediately (session cookie) -----------------
session_regenerate_id(true);
$_SESSION['user_id'] = $userId;
$_SESSION['email'] = $email;

ep_json_ok(['message' => 'Account created. Welcome to Embark Pedia!', 'redirect' => '/index.html']);
