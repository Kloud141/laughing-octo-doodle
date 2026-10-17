<?php
/**
 * organizer-partners.php
 * ------------------------------------------------------------------
 * Admin-only management of the partner program. A vendor's own
 * partner_profiles row is created automatically by organizer-vendors.php
 * (approve/onboard) — this file is for everything else:
 *   - onboarding a stand-alone partner (not a vendor) directly
 *   - editing a partner's profit-share tier/percent (never retroactive —
 *     see partner_earnings.profit_share_percent_applied, which freezes
 *     the rate at the moment each referral is credited)
 *   - suspend / reinstate / delete the account
 *   - running a payout for a partner (sweeps every pending
 *     partner_earnings row into one new partner_payouts record)
 *   - viewing one partner's full ledger
 *
 * Request: POST, JSON body, { action: "...", ...fields }.
 * Actions: list | ledger | onboard | update_tier | suspend | reinstate |
 *          delete | run_payout
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

// Shared SELECT used by list/ledger — one row per partner with their
// account info, tier, and running totals split by payout status.
function ep_partner_summary_sql(): string
{
    return "SELECT u.id AS user_id, u.first_name, u.last_name, u.email, u.contact,
                   u.account_type, u.account_status, u.created_at,
                   pp.partner_id, pp.display_name, pp.is_company, pp.profit_share_percent,
                   pp.tier_label, pp.last_edited_at,
                   (SELECT COUNT(*) FROM partner_earnings pe WHERE pe.partner_user_id = u.id) AS referral_count,
                   (SELECT COALESCE(SUM(pe.commission_amount),0) FROM partner_earnings pe WHERE pe.partner_user_id = u.id) AS total_payout,
                   (SELECT COALESCE(SUM(pe.commission_amount),0) FROM partner_earnings pe WHERE pe.partner_user_id = u.id AND pe.payout_id IS NULL) AS pending_payout
            FROM users u JOIN partner_profiles pp ON pp.user_id = u.id";
}

if ($action === 'list') {
    $rows = $conn->query(ep_partner_summary_sql() . ' ORDER BY u.created_at DESC')->fetch_all(MYSQLI_ASSOC);
    ep_json_ok(['partners' => $rows]);
}

if ($action === 'ledger') {
    $userId = (int)($body['user_id'] ?? 0);
    $partner = $conn->query(ep_partner_summary_sql() . " WHERE u.id = {$userId}")->fetch_assoc();
    if (!$partner) ep_json_fail(404, 'Partner not found.');

    $earnings = $conn->query(
        "SELECT id, voyage_id, tour_title, pax, base_amount, profit_share_percent_applied, commission_amount, credited_at, payout_id
         FROM partner_earnings WHERE partner_user_id = {$userId} ORDER BY credited_at DESC"
    )->fetch_all(MYSQLI_ASSOC);

    $payouts = $conn->query(
        "SELECT id, period_start, period_end, total_amount, paid_at, notes
         FROM partner_payouts WHERE partner_user_id = {$userId} ORDER BY paid_at DESC"
    )->fetch_all(MYSQLI_ASSOC);

    ep_json_ok(['partner' => $partner, 'earnings' => $earnings, 'payouts' => $payouts]);
}

if ($action === 'onboard') {
    $displayName = trim((string)($body['display_name'] ?? ''));
    $isCompany = !empty($body['is_company']) ? 1 : 0;
    $fname = trim((string)($body['contact_fname'] ?? ''));
    $lname = trim((string)($body['contact_lname'] ?? ''));
    $contact = trim((string)($body['contact'] ?? ''));
    $email = trim((string)($body['email'] ?? ''));
    $tempPassword = (string)($body['temp_password'] ?? '');
    $profitShare = isset($body['profit_share_percent']) ? (float)$body['profit_share_percent'] : 30.00;
    $tierLabel = trim((string)($body['tier_label'] ?? ''));
    $tierLabelOrNull = $tierLabel !== '' ? $tierLabel : null;

    if ($displayName === '' || mb_strlen($displayName) > 180) ep_json_fail(422, 'Enter the partner\'s name or company name.');
    if ($fname === '' || $lname === '') ep_json_fail(422, 'Enter the contact person\'s name.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) ep_json_fail(422, 'Enter a valid email address.');
    if (mb_strlen($tempPassword) < 8) ep_json_fail(422, 'Set a temporary password of at least 8 characters.');
    if ($profitShare < 30 || $profitShare > 50) ep_json_fail(422, 'Profit share must be between 30% and 50%.');

    $check = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->bind_param('s', $email);
    $check->execute();
    if ($check->get_result()->num_rows > 0) ep_json_fail(409, 'That email is already registered.');
    $check->close();

    $hash = password_hash($tempPassword . EP_PASSWORD_PEPPER, PASSWORD_BCRYPT, ['cost' => 12]);

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare(
            "INSERT INTO users (first_name, last_name, contact, email, password_hash, account_type) VALUES (?, ?, ?, ?, ?, 'partner')"
        );
        $stmt->bind_param('sssss', $fname, $lname, $contact, $email, $hash);
        $stmt->execute();
        $newUserId = $stmt->insert_id;
        $stmt->close();

        $partnerId = ep_generate_partner_id($conn);
        $ins = $conn->prepare(
            'INSERT INTO partner_profiles (user_id, partner_id, display_name, is_company, profit_share_percent, tier_label, last_edited_by_user_id, last_edited_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $ins->bind_param('issidsi', $newUserId, $partnerId, $displayName, $isCompany, $profitShare, $tierLabelOrNull, $admin['id']);
        $ins->execute();
        $ins->close();

        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        ep_json_fail(500, 'Could not onboard the partner.');
    }

    ep_json_ok(['message' => 'Partner onboarded. Share the temporary password through a secure channel.', 'partner_id' => $partnerId]);
}

// Edits the LIVE rate only. Every already-credited partner_earnings row
// keeps the percent it was credited at — see
// profit_share_percent_applied — so this never touches past commissions,
// only ones credited from now on.
if ($action === 'update_tier') {
    $userId = (int)($body['user_id'] ?? 0);
    $profitShare = isset($body['profit_share_percent']) ? (float)$body['profit_share_percent'] : null;
    $tierLabel = trim((string)($body['tier_label'] ?? ''));
    $tierLabelOrNull = $tierLabel !== '' ? $tierLabel : null;

    if ($profitShare === null || $profitShare < 30 || $profitShare > 50) {
        ep_json_fail(422, 'Profit share must be between 30% and 50%.');
    }

    $stmt = $conn->prepare(
        'UPDATE partner_profiles SET profit_share_percent = ?, tier_label = ?, last_edited_by_user_id = ?, last_edited_at = NOW() WHERE user_id = ?'
    );
    $stmt->bind_param('dsii', $profitShare, $tierLabelOrNull, $admin['id'], $userId);
    $ok = $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if (!$ok) ep_json_fail(500, 'Could not update the partner\'s tier.');
    if ($affected === 0) ep_json_fail(404, 'Partner not found.');

    ep_json_ok(['message' => 'Tier updated. This rate applies to future referrals only — nothing already credited changes.']);
}

if (in_array($action, ['suspend', 'reinstate'], true)) {
    $userId = (int)($body['user_id'] ?? 0);
    $newStatus = $action === 'suspend' ? 'suspended' : 'active';
    $stmt = $conn->prepare("UPDATE users SET account_status = ? WHERE id = ? AND id IN (SELECT user_id FROM partner_profiles)");
    $stmt->bind_param('si', $newStatus, $userId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    if ($affected === 0) ep_json_fail(404, 'Partner not found.');
    ep_json_ok(['message' => 'Partner ' . $action . 'd.']);
}

if ($action === 'delete') {
    $userId = (int)($body['user_id'] ?? 0);
    $row = $conn->query("SELECT account_type FROM users WHERE id = {$userId} LIMIT 1")->fetch_assoc();
    if (!$row) ep_json_fail(404, 'Partner not found.');
    if ($row['account_type'] !== 'partner') {
        ep_json_fail(400, 'This account is a vendor as well as a partner — delete it from Vendor Approvals instead, which handles both in one step.');
    }

    $earningsChk = $conn->query("SELECT COUNT(*) AS c FROM partner_earnings WHERE partner_user_id = {$userId}")->fetch_assoc();
    if ((int)$earningsChk['c'] > 0) {
        ep_json_fail(409, 'This partner has earnings on record and cannot be deleted. Suspend the account instead.');
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND account_type = 'partner'");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $deleted = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$deleted) ep_json_fail(404, 'Partner not found.');
    ep_json_ok(['message' => 'Partner deleted.']);
}

// Sweeps every pending (payout_id IS NULL) partner_earnings row for this
// partner into one new partner_payouts record. There's no payment
// gateway in this project (same as `sales`), so this is the manual
// record of "we paid them" — run it once a quarter per the design brief
// ("paid at end of every 3rd month"); nothing here sends money anywhere.
if ($action === 'run_payout') {
    $userId = (int)($body['user_id'] ?? 0);
    $notes = trim((string)($body['notes'] ?? ''));
    $notesOrNull = $notes !== '' ? $notes : null;
    $periodStart = (string)($body['period_start'] ?? '');
    $periodEnd = (string)($body['period_end'] ?? date('Y-m-d'));

    if (!$conn->query("SELECT 1 FROM partner_profiles WHERE user_id = {$userId}")->fetch_row()) {
        ep_json_fail(404, 'Partner not found.');
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodStart) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodEnd)) {
        ep_json_fail(422, 'Enter a valid payout period (period_start / period_end).');
    }

    $pending = $conn->query(
        "SELECT id, commission_amount FROM partner_earnings WHERE partner_user_id = {$userId} AND payout_id IS NULL"
    )->fetch_all(MYSQLI_ASSOC);

    if (empty($pending)) ep_json_fail(422, 'This partner has no pending payout to run.');

    $total = 0.0;
    $ids = [];
    foreach ($pending as $row) {
        $total += (float)$row['commission_amount'];
        $ids[] = (int)$row['id'];
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare(
            'INSERT INTO partner_payouts (partner_user_id, period_start, period_end, total_amount, paid_at, paid_by_user_id, notes)
             VALUES (?, ?, ?, ?, NOW(), ?, ?)'
        );
        $stmt->bind_param('issdis', $userId, $periodStart, $periodEnd, $total, $admin['id'], $notesOrNull);
        $stmt->execute();
        $payoutId = $stmt->insert_id;
        $stmt->close();

        $idList = implode(',', $ids);
        $conn->query("UPDATE partner_earnings SET payout_id = {$payoutId} WHERE id IN ({$idList})");

        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        ep_json_fail(500, 'Could not run the payout.');
    }

    ep_json_ok(['message' => 'Payout of ' . number_format($total, 2) . ' recorded for ' . count($ids) . ' referral(s).', 'id' => $payoutId]);
}

ep_json_fail(400, 'Unknown action.');
