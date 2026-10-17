<?php
/**
 * customer-profile.php
 * ------------------------------------------------------------------
 * Self-service profile editing for customer accounts — backs
 * /account/profile.html (see profile.js). Vendor/admin/partner already
 * have their own equivalent at organizer-profile.php; this is
 * deliberately customer-only (ep_require_role(['customer'])) rather
 * than merged with that endpoint, since the two screens show different
 * fields (no organization/business fields here, but a one-time name
 * split step that organizer-profile.php doesn't need — every vendor/
 * admin signup already collects first+last name separately).
 *
 * All actions are POST + JSON body (see ep_json_body in db.php):
 *   action=update_name   { full_name } OR { first_name, last_name }
 *     — update_name accepts EITHER shape. Sending full_name splits it
 *       on the first space (first word -> first_name, remainder ->
 *       last_name) and always sets name_is_split = 1; sending the two
 *       fields directly does the same. This is what both the normal
 *       "Full Name" field and the one-time first-login split prompt on
 *       profile.html post to — see that page's two render states.
 *   action=update_contact { contact, email }
 *   action=change_password { current_password, new_password, confirm }
 *   action=deactivate_account { } — sets account_status='suspended' on the
 *                               caller's own account and logs the session
 *                               out immediately. Nothing is deleted;
 *                               support reactivates it. Same split as
 *                               organizer-profile.php's identical action,
 *                               just without that file's vendor/admin/
 *                               partner role check (this endpoint is
 *                               customer-only already, see ep_current_user()
 *                               check above).
 *   action=delete_account { current_password } — permanently deletes the
 *                               caller's own account. Unlike
 *                               organizer-profile.php's version, there's no
 *                               "financial history on file" guard here —
 *                               trip_enquiries.user_id is
 *                               ON DELETE SET NULL (see schema.sql), so a
 *                               customer's past enquiries just lose the
 *                               account link rather than blocking deletion.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}
ep_verify_same_site_request();

$user = ep_current_user();
if (!$user || $user['account_status'] !== 'active' || $user['account_type'] !== 'customer') {
    ep_json_fail(401, 'Please sign in to manage your profile.');
}

$body = ep_json_body();
$action = (string)($body['action'] ?? '');
$conn = ep_db();

if ($action === 'update_name') {
    if (array_key_exists('full_name', $body) && !array_key_exists('first_name', $body)) {
        $full = trim((string)($body['full_name'] ?? ''));
        if ($full === '' || mb_strlen($full) > 200) ep_json_fail(422, 'Enter your name.');
        $parts = preg_split('/\s+/', $full, 2);
        $fname = $parts[0];
        $lname = $parts[1] ?? $parts[0]; // single-word name: store it in both so last_name stays non-empty
    } else {
        $fname = trim((string)($body['first_name'] ?? ''));
        $lname = trim((string)($body['last_name'] ?? ''));
    }

    if ($fname === '' || mb_strlen($fname) > 100) ep_json_fail(422, 'Enter a first name.');
    if ($lname === '' || mb_strlen($lname) > 100) ep_json_fail(422, 'Enter a last name.');

    $stmt = $conn->prepare('UPDATE users SET first_name = ?, last_name = ?, name_is_split = 1 WHERE id = ?');
    $stmt->bind_param('ssi', $fname, $lname, $user['id']);
    $stmt->execute();
    $stmt->close();

    ep_json_ok(['message' => 'Name updated.', 'first_name' => $fname, 'last_name' => $lname]);
}

if ($action === 'update_contact') {
    $contact = trim((string)($body['contact'] ?? ''));
    $email = trim((string)($body['email'] ?? ''));

    if (!preg_match('/^[0-9+\-\s]{7,15}$/', $contact)) ep_json_fail(422, 'Enter a valid contact number.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 254) ep_json_fail(422, 'Enter a valid email address.');

    if (strcasecmp($email, $user['email']) !== 0) {
        $check = $conn->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $check->bind_param('si', $email, $user['id']);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            $check->close();
            ep_json_fail(409, 'That email is already in use by another account.');
        }
        $check->close();
    }

    $stmt = $conn->prepare('UPDATE users SET contact = ?, email = ? WHERE id = ?');
    $stmt->bind_param('ssi', $contact, $email, $user['id']);
    $stmt->execute();
    $stmt->close();

    // The session + login form both key off email, so keep them in sync
    // immediately rather than requiring a re-login.
    $_SESSION['email'] = $email;

    ep_json_ok(['message' => 'Contact details updated.']);
}

if ($action === 'change_password') {
    $current = (string)($body['current_password'] ?? '');
    $new = (string)($body['new_password'] ?? '');
    $confirm = (string)($body['confirm'] ?? '');

    $stmt = $conn->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !password_verify($current . EP_PASSWORD_PEPPER, $row['password_hash'])) {
        ep_json_fail(401, 'Current password is incorrect.');
    }
    if (mb_strlen($new) < 8 || mb_strlen($new) > 72) ep_json_fail(422, 'New password must be 8–72 characters.');
    if ($new !== $confirm) ep_json_fail(422, 'New passwords do not match.');

    $hash = password_hash($new . EP_PASSWORD_PEPPER, PASSWORD_BCRYPT, ['cost' => 12]);
    $upd = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $upd->bind_param('si', $hash, $user['id']);
    $upd->execute();
    $upd->close();

    ep_json_ok(['message' => 'Password changed.']);
}

if ($action === 'deactivate_account') {
    $conn->query("UPDATE users SET account_status = 'suspended' WHERE id = " . (int)$user['id']);
    session_destroy();
    ep_json_ok(['message' => 'Your account has been deactivated. Contact support@embarkpedia.com to reactivate it.']);
}

if ($action === 'delete_account') {
    $current = (string)($body['current_password'] ?? '');
    $stmt = $conn->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row || !password_verify($current . EP_PASSWORD_PEPPER, $row['password_hash'])) {
        ep_json_fail(401, 'Enter your current password to confirm account deletion.');
    }

    $del = $conn->prepare('DELETE FROM users WHERE id = ?');
    $del->bind_param('i', $user['id']);
    $del->execute();
    $del->close();
    session_destroy();

    ep_json_ok(['message' => 'Your account has been deleted.']);
}

ep_json_fail(400, 'Unknown action.');
