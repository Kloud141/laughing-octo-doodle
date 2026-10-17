<?php
/**
 * organizer-sales.php
 * ------------------------------------------------------------------
 * There is no payment/checkout flow yet (see database/schema.sql §9),
 * so a "sale" here is a manually-logged confirmed booking: a vendor
 * records their own, an admin records any (including ROAMS, which
 * have no vendor). Design brief: vendor "track sales of self", admin
 * "track sales for all vendors".
 *
 * Request: POST, JSON body, { action: "...", ...fields }.
 * Actions: list | summary | create
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}
ep_verify_same_site_request();

$user = ep_require_role(['vendor', 'admin']);
$isAdmin = $user['account_type'] === 'admin';
$body = ep_json_body();
$action = (string)($body['action'] ?? '');
$conn = ep_db();

if ($action === 'list') {
    if ($isAdmin) {
        $vendorId = (int)($body['vendor_id'] ?? 0);
        if ($vendorId > 0) {
            $stmt = $conn->prepare(
                "SELECT s.*, t.title AS tour_title, r.title AS roam_title,
                        CONCAT(u.first_name,' ',u.last_name) AS vendor_name
                 FROM sales s
                 LEFT JOIN tours t ON t.id = s.tour_id LEFT JOIN roams r ON r.id = s.roam_id
                 LEFT JOIN users u ON u.id = s.vendor_user_id
                 WHERE s.vendor_user_id = ? ORDER BY s.sale_date DESC LIMIT 300"
            );
            $stmt->bind_param('i', $vendorId);
        } else {
            $stmt = $conn->prepare(
                "SELECT s.*, t.title AS tour_title, r.title AS roam_title,
                        CONCAT(u.first_name,' ',u.last_name) AS vendor_name
                 FROM sales s
                 LEFT JOIN tours t ON t.id = s.tour_id LEFT JOIN roams r ON r.id = s.roam_id
                 LEFT JOIN users u ON u.id = s.vendor_user_id
                 ORDER BY s.sale_date DESC LIMIT 300"
            );
        }
    } else {
        $stmt = $conn->prepare(
            "SELECT s.*, t.title AS tour_title, r.title AS roam_title
             FROM sales s LEFT JOIN tours t ON t.id = s.tour_id LEFT JOIN roams r ON r.id = s.roam_id
             WHERE s.vendor_user_id = ? ORDER BY s.sale_date DESC LIMIT 300"
        );
        $stmt->bind_param('i', $user['id']);
    }
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    ep_json_ok(['sales' => $rows]);
}

if ($action === 'summary') {
    $scope = $isAdmin ? '' : ('WHERE vendor_user_id = ' . (int)$user['id'] . ' AND ');
    $scope = $scope === '' ? 'WHERE ' : $scope;
    $whereStatus = $scope . "status = 'confirmed'";

    $totals = $conn->query("SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total FROM sales {$whereStatus}")->fetch_assoc();
    $byMonth = $conn->query(
        "SELECT DATE_FORMAT(sale_date, '%Y-%m') AS ym, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
         FROM sales {$whereStatus} AND sale_date >= (CURDATE() - INTERVAL 6 MONTH)
         GROUP BY ym ORDER BY ym"
    )->fetch_all(MYSQLI_ASSOC);

    $out = ['total_count' => (int)$totals['cnt'], 'total_amount' => (float)$totals['total'], 'by_month' => $byMonth];

    if ($isAdmin) {
        $out['by_vendor'] = $conn->query(
            "SELECT s.vendor_user_id, CONCAT(u.first_name,' ',u.last_name) AS vendor_name,
                    COUNT(*) AS cnt, COALESCE(SUM(s.amount),0) AS total
             FROM sales s LEFT JOIN users u ON u.id = s.vendor_user_id
             WHERE s.status = 'confirmed'
             GROUP BY s.vendor_user_id ORDER BY total DESC"
        )->fetch_all(MYSQLI_ASSOC);
    }

    ep_json_ok(['summary' => $out]);
}

if ($action === 'create') {
    $tourId = isset($body['tour_id']) && $body['tour_id'] !== '' ? (int)$body['tour_id'] : null;
    $roamId = isset($body['roam_id']) && $body['roam_id'] !== '' ? (int)$body['roam_id'] : null;
    $buyerName = trim((string)($body['buyer_name'] ?? ''));
    $buyerEmail = trim((string)($body['buyer_email'] ?? ''));
    $buyerContact = trim((string)($body['buyer_contact'] ?? ''));
    $groupSize = isset($body['group_size']) && $body['group_size'] !== '' ? (int)$body['group_size'] : null;
    $amount = (float)($body['amount'] ?? -1);
    $currency = trim((string)($body['currency'] ?? 'INR'));
    $saleDate = trim((string)($body['sale_date'] ?? ''));
    $notes = trim((string)($body['notes'] ?? ''));

    if (($tourId === null) === ($roamId === null)) ep_json_fail(422, 'Pick exactly one trip or ROAM for this sale.');
    if ($buyerName === '') ep_json_fail(422, 'Enter the buyer\'s name.');
    if ($amount < 0) ep_json_fail(422, 'Enter a valid amount.');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $saleDate)) ep_json_fail(422, 'Enter the sale date.');

    $vendorUserId = null;
    if ($tourId !== null) {
        $t = $conn->query("SELECT submitted_by_user_id FROM tours WHERE id = {$tourId}")->fetch_assoc();
        if (!$t) ep_json_fail(404, 'Trip not found.');
        $vendorUserId = $t['submitted_by_user_id'] !== null ? (int)$t['submitted_by_user_id'] : null;
        if (!$isAdmin && (int)$vendorUserId !== (int)$user['id']) {
            ep_json_fail(403, 'You can only log sales for your own trips.');
        }
    } elseif (!$isAdmin) {
        ep_json_fail(403, 'Only admins can log ROAM sales (ROAMS have no vendor).');
    }

    $buyerEmailOrNull = $buyerEmail !== '' ? $buyerEmail : null;
    $buyerContactOrNull = $buyerContact !== '' ? $buyerContact : null;
    $notesOrNull = $notes !== '' ? $notes : null;

    $stmt = $conn->prepare(
        'INSERT INTO sales (tour_id, roam_id, vendor_user_id, recorded_by_user_id, buyer_name, buyer_email,
                             buyer_contact, group_size, amount, currency, sale_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param(
        'iiiisssidsss',
        $tourId, $roamId, $vendorUserId, $user['id'], $buyerName, $buyerEmailOrNull,
        $buyerContactOrNull, $groupSize, $amount, $currency, $saleDate, $notesOrNull
    );
    if (!$stmt->execute()) {
        $stmt->close();
        ep_json_fail(500, 'Could not save the sale.');
    }
    $stmt->close();
    ep_json_ok(['message' => 'Sale logged.']);
}

ep_json_fail(400, 'Unknown action.');
