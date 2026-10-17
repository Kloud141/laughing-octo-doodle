<?php
/**
 * partner-dashboard.php
 * ------------------------------------------------------------------
 * The logged-in user's OWN partner data — never anyone else's (admin
 * uses organizer-partners.php's `ledger` action to view any partner).
 * Usable by both a stand-alone 'partner' account (organizer/partner.html)
 * and a 'vendor' account that also has a partner_profiles row ("every
 * vendor is a partner" — see organizer-vendors.php's approve/onboard
 * actions), surfaced as the Partner tab on organizer/authoring.html.
 *
 * Request: POST, JSON body, { action: "...", ...fields }.
 * Actions: sales
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}
ep_verify_same_site_request();

$user = ep_require_role(['vendor', 'partner']);
$profile = ep_partner_profile((int)$user['id']);
if (!$profile) ep_json_fail(404, 'No partner profile on this account yet.');

$body = ep_json_body();
$action = (string)($body['action'] ?? '');
$conn = ep_db();
$userId = (int)$user['id'];

// "Sales Tab: [VoyageID wise, number of pax.] [Total Earnings, Monthly
// Earnings]" + the pending/paid split needed for "maintain total payout
// and pending payout".
if ($action === 'sales') {
    $earnings = $conn->query(
        "SELECT id, voyage_id, tour_title, pax, base_amount, profit_share_percent_applied, commission_amount, credited_at, payout_id
         FROM partner_earnings WHERE partner_user_id = {$userId} ORDER BY credited_at DESC"
    )->fetch_all(MYSQLI_ASSOC);

    $totalEarnings = 0.0;
    $monthlyEarnings = 0.0;
    $totalPayout = 0.0;   // already paid out (payout_id IS NOT NULL)
    $pendingPayout = 0.0; // not yet paid (payout_id IS NULL) — next paid at quarter-end
    $monthStart = date('Y-m-01 00:00:00');

    foreach ($earnings as $row) {
        $amt = (float)$row['commission_amount'];
        $totalEarnings += $amt;
        if ($row['credited_at'] >= $monthStart) $monthlyEarnings += $amt;
        if ($row['payout_id'] !== null) $totalPayout += $amt;
        else $pendingPayout += $amt;
    }

    $payouts = $conn->query(
        "SELECT id, period_start, period_end, total_amount, paid_at FROM partner_payouts
         WHERE partner_user_id = {$userId} ORDER BY paid_at DESC"
    )->fetch_all(MYSQLI_ASSOC);

    ep_json_ok([
        'partner_id'       => $profile['partner_id'],
        'display_name'     => $profile['display_name'],
        'profit_share_percent' => (float)$profile['profit_share_percent'],
        'tier_label'       => $profile['tier_label'],
        'earnings'         => $earnings,
        'payouts'          => $payouts,
        'totals'           => [
            'total_earnings'   => round($totalEarnings, 2),
            'monthly_earnings' => round($monthlyEarnings, 2),
            'total_payout'     => round($totalPayout, 2),
            'pending_payout'   => round($pendingPayout, 2),
        ],
    ]);
}

ep_json_fail(400, 'Unknown action.');
