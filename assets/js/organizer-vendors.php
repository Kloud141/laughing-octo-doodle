<?php
/**
 * organizer-vendors.php
 * ------------------------------------------------------------------
 * Admin-only. Design brief: "approve Vendor trips ... onboard and
 * delete vendors". Trip approval itself lives in organizer-trips.php
 * (action=approve/reject on a tour); this file manages the vendor
 * ACCOUNT: review the vendor_profiles application, suspend/reinstate,
 * create a vendor directly (bypassing public signup), or delete one.
 *
 * Request: POST, JSON body, { action: "...", ...fields }.
 * Actions: list | approve | reject | suspend | reinstate | onboard | delete
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}
ep_verify_same_site_request();

$admin = ep_require_role(['admin']);
$body = ep_json_body();
$action = (string)($body['action'] ?? '');
$conn = ep_db();

if ($action === 'list') {
    $rows = $conn->query(
        "SELECT u.id AS user_id, u.first_name, u.last_name, u.email, u.contact, u.account_status, u.created_at,
                vp.organization_name, vp.business_email, vp.business_phone, vp.website_url,
                vp.business_description, vp.review_status, vp.reviewed_at,
                (SELECT COUNT(*) FROM tours t WHERE t.submitted_by_user_id = u.id) AS trip_count,
                (SELECT COALESCE(SUM(amount),0) FROM sales s WHERE s.vendor_user_id = u.id AND s.status='confirmed') AS total_sales
         FROM users u JOIN vendor_profiles vp ON vp.user_id = u.id
         WHERE u.account_type = 'vendor'
         ORDER BY (vp.review_status = 'pending') DESC, u.created_at DESC"
    )->fetch_all(MYSQLI_ASSOC);
    ep_json_ok(['vendors' => $rows]);
}

if (in_array($action, ['approve', 'reject', 'suspend', 'reinstate'], true)) {
    $userId = (int)($body['user_id'] ?? 0);
    $notes = trim((string)($body['notes'] ?? ''));
    $notesOrNull = $notes !== '' ? $notes : null;

    $statusMap = ['approve' => 'approved', 'reject' => 'rejected', 'suspend' => 'suspended', 'reinstate' => 'approved'];
    $reviewStatus = $statusMap[$action];

    $stmt = $conn->prepare(
        'UPDATE vendor_profiles SET review_status = ?, reviewed_by_user_id = ?, reviewed_at = NOW(), reviewer_notes = ?
         WHERE user_id = ?'
    );
    $stmt->bind_param('sisi', $reviewStatus, $admin['id'], $notesOrNull, $userId);
    $stmt->execute();
    $stmt->close();

    // Suspending a vendor's application also locks their login outright;
    // every other transition leaves account_status untouched (an approved
    // applicant is already active from signup).
    if ($action === 'suspend') {
        $conn->query("UPDATE users SET account_status = 'suspended' WHERE id = {$userId}");
    } elseif ($action === 'reinstate') {
        $conn->query("UPDATE users SET account_status = 'active' WHERE id = {$userId}");
    }

    // "Every vendor is a partner" — the moment a vendor becomes approved,
    // give them a partner_profiles row (and a Partner ID) if they don't
    // already have one, so they can refer clients and earn commission
    // too. Does nothing on reject/suspend, and is a no-op if already present.
    if ($action === 'approve' && !ep_partner_profile($userId)) {
        $vendorRow = $conn->query("SELECT organization_name FROM vendor_profiles WHERE user_id = {$userId}")->fetch_assoc();
        $displayName = $vendorRow['organization_name'] ?? 'Vendor Partner';
        $partnerId = ep_generate_partner_id($conn);
        $ins = $conn->prepare(
            "INSERT INTO partner_profiles (user_id, partner_id, display_name, is_company, profit_share_percent, last_edited_by_user_id, last_edited_at)
             VALUES (?, ?, ?, 1, 30.00, ?, NOW())"
        );
        $ins->bind_param('issi', $userId, $partnerId, $displayName, $admin['id']);
        $ins->execute();
        $ins->close();
    }

    ep_json_ok(['message' => 'Vendor ' . $action . 'd.']);
}

if ($action === 'onboard') {
    $orgName = trim((string)($body['org_name'] ?? ''));
    $fname = trim((string)($body['contact_fname'] ?? ''));
    $lname = trim((string)($body['contact_lname'] ?? ''));
    $contact = trim((string)($body['contact'] ?? ''));
    $email = trim((string)($body['email'] ?? ''));
    $tempPassword = (string)($body['temp_password'] ?? '');

    if ($orgName === '') ep_json_fail(422, 'Enter the organization name.');
    if ($fname === '' || $lname === '') ep_json_fail(422, 'Enter the contact person\'s name.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) ep_json_fail(422, 'Enter a valid email address.');
    if (mb_strlen($tempPassword) < 8) ep_json_fail(422, 'Set a temporary password of at least 8 characters.');

    $check = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->bind_param('s', $email);
    $check->execute();
    if ($check->get_result()->num_rows > 0) ep_json_fail(409, 'That email is already registered.');
    $check->close();

    $hash = password_hash($tempPassword . EP_PASSWORD_PEPPER, PASSWORD_BCRYPT, ['cost' => 12]);

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare(
            "INSERT INTO users (first_name, last_name, contact, email, password_hash, account_type) VALUES (?, ?, ?, ?, ?, 'vendor')"
        );
        $stmt->bind_param('sssss', $fname, $lname, $contact, $email, $hash);
        $stmt->execute();
        $newUserId = $stmt->insert_id;
        $stmt->close();

        // Admin-onboarded vendors are pre-approved — the admin is vouching
        // for them directly, unlike the public self-signup review queue.
        $profile = $conn->prepare(
            "INSERT INTO vendor_profiles (user_id, organization_name, business_email, business_phone, review_status, reviewed_by_user_id, reviewed_at)
             VALUES (?, ?, ?, ?, 'approved', ?, NOW())"
        );
        $profile->bind_param('isssi', $newUserId, $orgName, $email, $contact, $admin['id']);
        $profile->execute();
        $profile->close();

        // Same "every vendor is a partner" rule as the approve action above.
        $partnerId = ep_generate_partner_id($conn);
        $partnerIns = $conn->prepare(
            "INSERT INTO partner_profiles (user_id, partner_id, display_name, is_company, profit_share_percent, last_edited_by_user_id, last_edited_at)
             VALUES (?, ?, ?, 1, 30.00, ?, NOW())"
        );
        $partnerIns->bind_param('issi', $newUserId, $partnerId, $orgName, $admin['id']);
        $partnerIns->execute();
        $partnerIns->close();

        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        ep_json_fail(500, 'Could not onboard the vendor.');
    }

    ep_json_ok(['message' => 'Vendor onboarded and pre-approved. Share the temporary password through a secure channel.']);
}

if ($action === 'delete') {
    $userId = (int)($body['user_id'] ?? 0);
    if ($userId === (int)$admin['id']) ep_json_fail(400, 'You cannot delete your own account from here.');

    // A vendor is also a partner (see 'approve'/'onboard' above) — if
    // they've earned any referral commission, the partner_earnings FK is
    // ON DELETE RESTRICT on purpose, so refuse up front with a clear
    // message instead of letting the DELETE fail with a raw SQL error.
    $earningsChk = $conn->query("SELECT COUNT(*) AS c FROM partner_earnings WHERE partner_user_id = {$userId}")->fetch_assoc();
    if ((int)$earningsChk['c'] > 0) {
        ep_json_fail(409, 'This vendor has partner earnings on record and cannot be deleted. Suspend the account instead, or run their pending payout first via Partners.');
    }

    // Archive their trips first so the public catalogue doesn't show a
    // listing whose vendor just vanished, then delete the account —
    // vendor_profiles and partner_profiles cascade via FK;
    // tours.submitted_by_user_id is ON DELETE SET NULL so archived
    // trips remain for records/sales history.
    $conn->query("UPDATE tours SET status = 'archived' WHERE submitted_by_user_id = {$userId}");
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND account_type = 'vendor'");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $deleted = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$deleted) ep_json_fail(404, 'Vendor not found.');
    ep_json_ok(['message' => 'Vendor deleted.']);
}

ep_json_fail(400, 'Unknown action.');
