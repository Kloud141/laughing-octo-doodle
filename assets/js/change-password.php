<?php
/**
 * change-password.php
 * ------------------------------------------------------------------
 * Backend for /auth/change-password.html — the forced step after
 * signing in with a temporary password from forgot-password.php. Works
 * for any active account_type (customer, vendor, partner; admin can't
 * reach must_change_password=1 in the first place, see
 * forgot-password.php, but this endpoint doesn't need to care).
 *
 * Deliberately does NOT ask for the current (temporary) password: the
 * visitor already proved they have it by signing in with it moments ago
 * (see login.php / organizer-login.php, which only redirect here after
 * a successful password_verify()). Requiring it again would just be
 * asking them to retype the one-time password they're here to replace.
 * Compare organizer-profile.php's change_password action, which DOES
 * require current_password — that's a normal, already-settled account.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}
ep_verify_same_site_request();

if (empty($_SESSION['user_id'])) {
    ep_json_fail(401, 'Your session has expired. Please sign in again.');
}

$body = ep_json_body();
$new = (string)($body['new_password'] ?? '');
$confirm = (string)($body['confirm'] ?? '');

if (mb_strlen($new) < 8 || mb_strlen($new) > 72) {
    ep_json_fail(422, 'New password must be 8–72 characters.');
}
if ($new !== $confirm) {
    ep_json_fail(422, 'New passwords do not match.');
}

$conn = ep_db();
$hash = password_hash($new . EP_PASSWORD_PEPPER, PASSWORD_BCRYPT, ['cost' => 12]);
$stmt = $conn->prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?');
$stmt->bind_param('si', $hash, $_SESSION['user_id']);
$stmt->execute();
$stmt->close();

// Send the visitor somewhere sensible for their account type, same
// mapping login.php / organizer-login.php use.
$conn2 = $conn->prepare('SELECT account_type FROM users WHERE id = ? LIMIT 1');
$conn2->bind_param('i', $_SESSION['user_id']);
$conn2->execute();
$accountType = ($conn2->get_result()->fetch_assoc()['account_type']) ?? 'customer';
$conn2->close();

$redirect = '/index.html';
if ($accountType === 'vendor') $redirect = '/organizer/authoring.html';
elseif ($accountType === 'admin') $redirect = '/organizer/approvals.html';
elseif ($accountType === 'partner') $redirect = '/organizer/partner.html';

ep_json_ok(['message' => 'Password updated. You\'re all set.', 'redirect' => $redirect]);
