<?php
/**
 * organizer-login.php
 * ------------------------------------------------------------------
 * Backend for /organizer/login.html (also the partner login — same
 * page, same form, a third tab). Deliberately separate from the public
 * assets/js/login.php (customer accounts): this endpoint also takes an
 * `as` field ("vendor", "admin" or "partner") and requires it to match
 * the account's actual account_type, so a vendor can't accidentally
 * (or deliberately) land in the admin shell by guessing a URL — the
 * organizer.js page guard calls organizer-me.php again on every page
 * load as a second check. Vendor lands on /organizer/authoring.html,
 * admin on /organizer/approvals.html, and partner on /organizer/partner.html.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    ep_json_ok();
}

ep_rate_limit('organizer_login', 10, 300); // 10 attempts / 5 minutes / IP

$email = trim((string)($_POST['email'] ?? ''));
$password = (string)($_POST['password'] ?? '');
$as = (string)($_POST['as'] ?? '');

if (!in_array($as, ['vendor', 'admin', 'partner'], true)) {
    ep_json_fail(400, 'Select Vendor, Partner or Admin before signing in.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    ep_json_fail(401, 'Incorrect email or password.');
}

$conn = ep_db();
$stmt = $conn->prepare(
    'SELECT id, password_hash, account_type, account_status, failed_attempts, locked_until, must_change_password
     FROM users WHERE email = ? LIMIT 1'
);
$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($user && $user['locked_until'] !== null && strtotime($user['locked_until']) > time()) {
    ep_json_fail(423, 'This account is temporarily locked due to repeated failed attempts. Try again later.');
}

$valid = $user && password_verify($password . EP_PASSWORD_PEPPER, $user['password_hash']);

// The tab must match the real role. Checked alongside password validity
// (not before) so a wrong-tab guess on a real account still only gets
// the same generic failure message as a wrong password.
if ($valid && $user['account_type'] !== $as) {
    $valid = false;
}

if (!$valid) {
    if ($user) {
        $attempts = (int)$user['failed_attempts'] + 1;
        $lockUntil = $attempts >= 5 ? 'NOW() + INTERVAL 15 MINUTE' : 'NULL';
        $upd = $conn->prepare("UPDATE users SET failed_attempts = ?, locked_until = {$lockUntil} WHERE id = ?");
        $upd->bind_param('ii', $attempts, $user['id']);
        $upd->execute();
        $upd->close();
    }
    ep_json_fail(401, 'Incorrect email or password.');
}

if ($user['account_status'] !== 'active') {
    ep_json_fail(403, 'This account has been suspended. Contact Embark Pedia support.');
}

$vendorStatus = null;
if ($as === 'vendor') {
    $profile = ep_vendor_profile((int)$user['id']);
    $vendorStatus = $profile['review_status'] ?? 'pending';
    if ($vendorStatus === 'rejected') {
        ep_json_fail(403, 'Your vendor application was not approved. Contact support@embarkpedia.com for details.');
    }
    if ($vendorStatus === 'suspended') {
        ep_json_fail(403, 'Your vendor account is currently suspended. Contact support@embarkpedia.com.');
    }
}

$reset = $conn->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?');
$reset->bind_param('i', $user['id']);
$reset->execute();
$reset->close();

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['email'] = $email;

$remember = ($_POST['remember'] ?? '') !== '';
if ($remember) {
    setcookie(session_name(), session_id(), [
        'expires'  => time() + 30 * 24 * 60 * 60,
        'path'     => '/',
        'secure'   => EP_IS_PROD,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

$redirect = $as === 'partner' ? '/organizer/partner.html' :
    ($as === 'admin' ? '/organizer/approvals.html' : '/organizer/authoring.html');

// Same forced-reset check as the public login.php — a password assigned
// by forgot-password.php must be changed before reaching the dashboard.
if (!empty($user['must_change_password'])) {
    ep_json_ok([
        'message' => 'Signed in. Please set a new password to continue.',
        'must_change_password' => true,
        'redirect' => '/auth/change-password.html',
        'role' => $as,
    ]);
}

ep_json_ok([
    'message'      => 'Signed in successfully.',
    'redirect'     => $redirect,
    'role'         => $as,
    'vendor_status' => $vendorStatus, // null for admin/partner
]);
