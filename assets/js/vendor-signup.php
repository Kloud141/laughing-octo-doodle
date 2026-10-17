<?php
/**
 * vendor-signup.php
 * ------------------------------------------------------------------
 * Backend for the "Vendor Sign Up" tab on /organizer/login.html.
 * Unlike signup.php (customer accounts), this creates a `users` row
 * with account_type='vendor' AND a `vendor_profiles` row with
 * review_status='pending' — in one transaction, so a vendor account
 * never exists without a profile to review. The new vendor is logged
 * in immediately but organizer-trips.php will not let them publish
 * until an admin approves the profile (see organizer-vendors.php).
 *
 * There is deliberately no admin-signup endpoint: admin accounts are
 * seeded directly in the database (see the note at the end of
 * database/schema.sql) and never created from a public form.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    ep_json_ok(); // pretend success; nothing written
}

ep_rate_limit('vendor_signup', 8, 600); // 8 attempts / 10 minutes / IP

// ---- Collect + validate ------------------------------------------------
$orgName   = trim((string)($_POST['org_name'] ?? ''));
$fname     = trim((string)($_POST['contact_fname'] ?? ''));
$lname     = trim((string)($_POST['contact_lname'] ?? ''));
$contact   = trim((string)($_POST['contact'] ?? ''));
$email     = trim((string)($_POST['email'] ?? ''));
$website   = trim((string)($_POST['business_website'] ?? '')); // note: distinct from the honeypot field "website"
$about     = trim((string)($_POST['about'] ?? ''));
$password  = (string)($_POST['password'] ?? '');
$confirm   = (string)($_POST['confirm'] ?? '');
$terms     = in_array($_POST['terms'] ?? '', ['on', '1', 'true'], true);

$errors = [];
if ($orgName === '' || mb_strlen($orgName) > 180) $errors['org_name'] = 'Enter your organization/agency name.';
if ($fname === '' || mb_strlen($fname) > 100) $errors['contact_fname'] = 'Enter the contact person\'s first name.';
if ($lname === '' || mb_strlen($lname) > 100) $errors['contact_lname'] = 'Enter the contact person\'s last name.';
if (!preg_match('/^[0-9+\-\s]{7,15}$/', $contact)) $errors['contact'] = 'Enter a valid contact number.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 254) $errors['email'] = 'Enter a valid email address.';
if ($website !== '' && mb_strlen($website) > 500) $errors['business_website'] = 'Website URL is too long.';
if (mb_strlen($about) > 2000) $errors['about'] = 'Please keep this under 2000 characters.';
if (mb_strlen($password) < 8 || mb_strlen($password) > 72) $errors['password'] = 'Password must be 8–72 characters.';
if ($password !== $confirm) $errors['confirm'] = 'Passwords do not match.';
if (!$terms) $errors['terms'] = 'You must accept the Terms & Conditions.';

if (!empty($errors)) {
    ep_json_fail(422, 'Please fix the highlighted fields.');
}

$conn = ep_db();

$check = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$check->bind_param('s', $email);
$check->execute();
$exists = $check->get_result()->num_rows > 0;
$check->close();

if ($exists) {
    // Deliberately vague — same reasoning as signup.php: don't confirm
    // whether an email is already registered to an unauthenticated caller.
    ep_json_fail(409, 'That email could not be registered. Try signing in, or use a different address.');
}

$hash = password_hash($password . EP_PASSWORD_PEPPER, PASSWORD_BCRYPT, ['cost' => 12]);

$conn->begin_transaction();
try {
    $stmt = $conn->prepare(
        'INSERT INTO users (first_name, last_name, contact, email, password_hash, account_type, name_is_split, created_at)
         VALUES (?, ?, ?, ?, ?, \'vendor\', 1, NOW())'
    );
    $stmt->bind_param('sssss', $fname, $lname, $contact, $email, $hash);
    if (!$stmt->execute()) {
        throw new RuntimeException('user insert failed');
    }
    $userId = $stmt->insert_id;
    $stmt->close();

    $profile = $conn->prepare(
        'INSERT INTO vendor_profiles (user_id, organization_name, business_email, business_phone, website_url, business_description, review_status)
         VALUES (?, ?, ?, ?, ?, ?, \'pending\')'
    );
    $websiteOrNull = $website !== '' ? $website : null;
    $aboutOrNull = $about !== '' ? $about : null;
    $profile->bind_param('isssss', $userId, $orgName, $email, $contact, $websiteOrNull, $aboutOrNull);
    if (!$profile->execute()) {
        throw new RuntimeException('vendor_profiles insert failed');
    }
    $profile->close();

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    ep_json_fail(500, 'Could not create the vendor account. Please try again later.');
}

session_regenerate_id(true);
$_SESSION['user_id'] = $userId;
$_SESSION['email'] = $email;

ep_json_ok([
    'message'  => 'Vendor account created. Your profile is pending admin approval — you can explore the dashboard in the meantime.',
    'redirect' => '/organizer/authoring.html',
]);
