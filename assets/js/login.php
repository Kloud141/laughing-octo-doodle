<?php
/**
 * login.php
 * ------------------------------------------------------------------
 * Backend for the "Log In" tab on /auth/login.html (#ep-login-form).
 * Replaces the client-only mock in auth.js. Returns JSON.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    ep_json_ok(); // pretend success to the bot
}

ep_rate_limit('login', 10, 300); // 10 attempts / 5 minutes / IP — slows credential stuffing

$email = trim((string)($_POST['email'] ?? ''));
$password = (string)($_POST['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    // Generic message: never confirm/deny which field was wrong.
    ep_json_fail(401, 'Incorrect email or password.');
}

$conn = ep_db();
$stmt = $conn->prepare('SELECT id, password_hash, account_status, failed_attempts, locked_until, must_change_password FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Account lockout after repeated failures (in addition to the IP-based
// rate limit above), so one leaked password list can't be hammered
// against a single account from many IPs.
if ($user && $user['locked_until'] !== null && strtotime($user['locked_until']) > time()) {
    ep_json_fail(423, 'This account is temporarily locked due to repeated failed attempts. Try again later.');
}

$valid = $user && password_verify($password . EP_PASSWORD_PEPPER, $user['password_hash']);

if (!$valid) {
    if ($user) {
        $attempts = (int)$user['failed_attempts'] + 1;
        $lockUntil = $attempts >= 5 ? "NOW() + INTERVAL 15 MINUTE" : "NULL";
        $upd = $conn->prepare("UPDATE users SET failed_attempts = ?, locked_until = {$lockUntil} WHERE id = ?");
        $upd->bind_param('ii', $attempts, $user['id']);
        $upd->execute();
        $upd->close();
    }
    // Same generic message whether the email exists or not.
    ep_json_fail(401, 'Incorrect email or password.');
}

// A correct password on a deactivated account (customer-profile.php's
// deactivate_account, or an admin suspension) should not sign in — same
// check organizer-login.php already makes for vendor/admin/partner.
// Pre-existing gap: this account_status check didn't exist here before
// customer self-deactivation was added.
if ($user['account_status'] !== 'active') {
    ep_json_fail(403, 'This account has been deactivated. Contact support@embarkpedia.com to reactivate it.');
}

// ---- Success: reset throttling, rotate session, log in -----------------
$reset = $conn->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?');
$reset->bind_param('i', $user['id']);
$reset->execute();
$reset->close();

session_regenerate_id(true); // mitigates session fixation
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['email'] = $email;

$remember = ($_POST['remember'] ?? '') !== '';
if ($remember) {
    // Extend the PHP session cookie lifetime only when requested; the
    // cookie remains HttpOnly + SameSite=Lax (+ Secure in production).
    setcookie(session_name(), session_id(), [
        'expires'  => time() + 30 * 24 * 60 * 60,
        'path'     => '/',
        'secure'   => EP_IS_PROD,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

// A password assigned by forgot-password.php must be changed before the
// visitor goes anywhere else — see change-password.php and the column
// comment in database/schema.sql.
if (!empty($user['must_change_password'])) {
    ep_json_ok([
        'message' => 'Signed in. Please set a new password to continue.',
        'must_change_password' => true,
        'redirect' => '/auth/change-password.html',
    ]);
}

ep_json_ok(['message' => 'Signed in successfully.', 'redirect' => '/index.html']);
