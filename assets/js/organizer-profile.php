<?php
/**
 * organizer-profile.php
 * ------------------------------------------------------------------
 * Self-service profile editing — used by the organizer portal's "Edit
 * Profile" tab (vendor/admin, on authoring.html) and by the partner
 * hub's Profile tab (organizer.js, on /organizer/partner.html).
 * All actions are POST + JSON body (see ep_json_body in db.php):
 *   action=update_profile     { first_name, last_name, contact,
 *                               organization_name?, business_phone?,
 *                               website_url?, business_description?,
 *                               display_name?, is_company? }
 *   action=change_password    { current_password, new_password, confirm }
 *   action=deactivate_account { } — sets account_status='suspended' on
 *                               the caller's own account. Vendor/partner
 *                               only; logs the session out immediately.
 *   action=delete_account     { current_password } — permanently deletes
 *                               the caller's own account. Vendor/partner
 *                               only, and refused if there is any
 *                               financial history to preserve (sales for
 *                               a vendor, partner_earnings for a
 *                               partner) — contact admin for those.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}
ep_verify_same_site_request();

$user = ep_require_role(['vendor', 'admin', 'partner']);
$body = ep_json_body();
$action = (string)($body['action'] ?? '');
$conn = ep_db();

if ($action === 'update_profile') {
    $fname = trim((string)($body['first_name'] ?? ''));
    $lname = trim((string)($body['last_name'] ?? ''));
    $contact = trim((string)($body['contact'] ?? ''));

    if ($fname === '' || mb_strlen($fname) > 100) ep_json_fail(422, 'Enter a first name.');
    if ($lname === '' || mb_strlen($lname) > 100) ep_json_fail(422, 'Enter a last name.');
    if (!preg_match('/^[0-9+\-\s]{7,15}$/', $contact)) ep_json_fail(422, 'Enter a valid contact number.');

    $stmt = $conn->prepare('UPDATE users SET first_name = ?, last_name = ?, contact = ? WHERE id = ?');
    $stmt->bind_param('sssi', $fname, $lname, $contact, $user['id']);
    $stmt->execute();
    $stmt->close();

    if ($user['account_type'] === 'vendor') {
        $org = trim((string)($body['organization_name'] ?? ''));
        $bizPhone = trim((string)($body['business_phone'] ?? ''));
        $website = trim((string)($body['website_url'] ?? ''));
        $about = trim((string)($body['business_description'] ?? ''));

        if ($org === '' || mb_strlen($org) > 180) ep_json_fail(422, 'Enter your organization/agency name.');

        $upd = $conn->prepare(
            'UPDATE vendor_profiles SET organization_name = ?, business_phone = ?, website_url = ?, business_description = ?
             WHERE user_id = ?'
        );
        $websiteOrNull = $website !== '' ? $website : null;
        $aboutOrNull = $about !== '' ? $about : null;
        $bizPhoneOrNull = $bizPhone !== '' ? $bizPhone : null;
        $upd->bind_param('ssssi', $org, $bizPhoneOrNull, $websiteOrNull, $aboutOrNull, $user['id']);
        $upd->execute();
        $upd->close();
    }

    // A vendor might ALSO be a partner (see organizer-vendors.php) — if
    // they have a partner_profiles row, let this same form update its
    // display name too. A pure 'partner' account always has one.
    $partnerProfile = ep_partner_profile((int)$user['id']);
    if ($partnerProfile && array_key_exists('display_name', $body)) {
        $displayName = trim((string)($body['display_name'] ?? ''));
        $isCompany = !empty($body['is_company']) ? 1 : 0;
        if ($displayName === '' || mb_strlen($displayName) > 180) {
            ep_json_fail(422, 'Enter your name or company name.');
        }
        $updP = $conn->prepare('UPDATE partner_profiles SET display_name = ?, is_company = ? WHERE user_id = ?');
        $updP->bind_param('sii', $displayName, $isCompany, $user['id']);
        $updP->execute();
        $updP->close();
    }

    ep_json_ok(['message' => 'Profile updated.']);
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
    if ($user['account_type'] === 'admin') ep_json_fail(403, 'Admin accounts cannot self-deactivate from here.');

    $conn->query("UPDATE users SET account_status = 'suspended' WHERE id = " . (int)$user['id']);
    session_destroy();
    ep_json_ok(['message' => 'Your account has been deactivated. Contact support@embarkpedia.com to reactivate it.']);
}

if ($action === 'delete_account') {
    if ($user['account_type'] === 'admin') ep_json_fail(403, 'Admin accounts cannot self-delete from here.');

    $current = (string)($body['current_password'] ?? '');
    $stmt = $conn->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row || !password_verify($current . EP_PASSWORD_PEPPER, $row['password_hash'])) {
        ep_json_fail(401, 'Enter your current password to confirm account deletion.');
    }

    // Preserve financial history: a vendor with any sales, or a partner
    // with any earnings on record, can't self-delete — only an admin can
    // remove an account like that (organizer-vendors.php / organizer-partners.php),
    // after deciding what to do with that history.
    if ($user['account_type'] === 'vendor') {
        $chk = $conn->query("SELECT COUNT(*) AS c FROM sales WHERE vendor_user_id = " . (int)$user['id'])->fetch_assoc();
        if ((int)$chk['c'] > 0) {
            ep_json_fail(409, 'You have recorded sales on file, so this account can\'t be self-deleted. Contact support@embarkpedia.com.');
        }
    }
    $earningsChk = $conn->query("SELECT COUNT(*) AS c FROM partner_earnings WHERE partner_user_id = " . (int)$user['id'])->fetch_assoc();
    if ((int)$earningsChk['c'] > 0) {
        ep_json_fail(409, 'You have partner earnings on file, so this account can\'t be self-deleted. Contact support@embarkpedia.com.');
    }

    if ($user['account_type'] === 'vendor') {
        $conn->query("UPDATE tours SET status = 'archived' WHERE submitted_by_user_id = " . (int)$user['id']);
    }
    $del = $conn->prepare('DELETE FROM users WHERE id = ?');
    $del->bind_param('i', $user['id']);
    $del->execute();
    $del->close();
    session_destroy();

    ep_json_ok(['message' => 'Your account has been deleted.']);
}

ep_json_fail(400, 'Unknown action.');
