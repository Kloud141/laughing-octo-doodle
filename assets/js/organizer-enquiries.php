<?php
/**
 * organizer-enquiries.php
 * ------------------------------------------------------------------
 * Design brief: admin gets a "Contact-Us enquiry page" (contact_messages)
 * and a "Trip Enquiry Page" with an "inquiry forwarder without sharing
 * Personal Data". Vendor gets an "Enquiry Page" that should only ever
 * show what the admin has chosen to forward.
 *
 * Privacy design: a trip_enquiries row is invisible to its vendor until
 * an admin calls action=forward on it (sets shared_with_vendor=1). Even
 * once forwarded, the vendor's `list_trip` response has name/email/contact
 * replaced with a reference code — the admin stays the customer's point
 * of contact; the vendor sees only trip/date/group-size/message, enough
 * to prepare a quote. See the shared_with_vendor column note in
 * database/schema.sql.
 *
 * Trip enquiry status is admin-only and exactly three values:
 *   on_hold  (default — customer still deciding)
 *   closed   (customer isn't going ahead)
 *   resolved (customer paid the booking amount, invoice generated)
 * Vendors can view what's been forwarded to them but no longer change
 * its status — that call belongs to admin (they're the one who knows
 * whether payment/invoice actually happened).
 *
 * Partner commission: an enquiry can optionally carry a partner_user_id
 * (resolved from a typed Partner ID at submission — see
 * submit-trip-enquiry.php). Moving status to 'resolved' tries to credit
 * that partner immediately via ep_try_credit_partner() below, but only
 * actually writes a partner_earnings row once travel is within 7 days —
 * otherwise the enquiry is left 'awaiting_window' and every subsequent
 * list_trip call re-checks it (there's no job scheduler in this stack,
 * so "checked on every admin page load" is the practical equivalent of
 * a daily cron here — recheck_partner_credits below can also be called
 * directly, e.g. from a "Check due credits" button).
 *
 * Request: POST, JSON body, { action: "...", ...fields }.
 * Actions: list_contact (admin) | list_trip | forward (admin) |
 *          update_status (admin) | recheck_partner_credits (admin)
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

// Tries to credit the partner on one resolved enquiry. No-ops quietly if
// there's nothing to do (no partner, already credited). Leaves the
// enquiry 'awaiting_window' — untouched otherwise — if travel is still
// more than 7 days out, or credits it right now if it's due.
function ep_try_credit_partner(mysqli $conn, int $enquiryId): void
{
    $enquiry = $conn->query(
        "SELECT id, tour_id, group_size, preferred_checkin_date, partner_user_id, partner_credit_status
         FROM trip_enquiries WHERE id = {$enquiryId} LIMIT 1"
    )->fetch_assoc();
    if (!$enquiry) return;
    if ($enquiry['partner_user_id'] === null) return;
    if ($enquiry['partner_credit_status'] === 'credited') return;

    $travelDate = $enquiry['preferred_checkin_date'];
    $due = true; // no travel date on file at all -> can't apply the window rule, credit now
    if ($travelDate !== null) {
        $daysUntil = (strtotime($travelDate) - strtotime(date('Y-m-d'))) / 86400;
        $due = $daysUntil <= 7;
    }

    if (!$due) {
        $conn->query("UPDATE trip_enquiries SET partner_credit_status = 'awaiting_window' WHERE id = {$enquiryId}");
        return;
    }

    $tour = $conn->query(
        "SELECT price_inr, voyage_id, title FROM tours WHERE id = " . (int)$enquiry['tour_id']
    )->fetch_assoc();
    $partner = $conn->query(
        "SELECT profit_share_percent FROM partner_profiles WHERE user_id = " . (int)$enquiry['partner_user_id']
    )->fetch_assoc();
    if (!$tour || !$partner) return; // defensive — shouldn't happen if the FKs are intact

    $pax = max(1, (int)($enquiry['group_size'] ?? 1));
    $baseAmount = (float)$tour['price_inr'] * $pax;
    $percentApplied = (float)$partner['profit_share_percent']; // snapshot of the LIVE rate, right now
    $commission = round($baseAmount * $percentApplied / 100, 2);

    $conn->begin_transaction();
    try {
        $ins = $conn->prepare(
            'INSERT INTO partner_earnings
               (partner_user_id, enquiry_id, tour_id, voyage_id, tour_title, pax, base_amount, profit_share_percent_applied, commission_amount, credited_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $ins->bind_param(
            'iiissiddd',
            $enquiry['partner_user_id'], $enquiryId, $enquiry['tour_id'], $tour['voyage_id'], $tour['title'],
            $pax, $baseAmount, $percentApplied, $commission
        );
        $ins->execute();
        $ins->close();

        $conn->query("UPDATE trip_enquiries SET partner_credit_status = 'credited' WHERE id = {$enquiryId}");
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
    }
}

// Scans every resolved-but-not-yet-credited enquiry and re-tries each —
// this is what makes the 7-day window actually fire once it's reached,
// since nothing else in this stack runs on a timer.
function ep_recheck_all_pending_partner_credits(mysqli $conn): void
{
    $ids = $conn->query(
        "SELECT id FROM trip_enquiries WHERE status = 'resolved' AND partner_credit_status = 'awaiting_window'"
    )->fetch_all(MYSQLI_ASSOC);
    foreach ($ids as $row) {
        ep_try_credit_partner($conn, (int)$row['id']);
    }
}

// ---- Contact-Us page (admin only — general/large-group/itinerary enquiries) --
if ($action === 'list_contact') {
    if (!$isAdmin) ep_json_fail(403, 'Admin only.');
    $rows = $conn->query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200')->fetch_all(MYSQLI_ASSOC);
    ep_json_ok(['messages' => $rows]);
}

// ---- Trip Enquiry page ----------------------------------------------------
if ($action === 'list_trip') {
    if ($isAdmin) {
        ep_recheck_all_pending_partner_credits($conn);

        $rows = $conn->query(
            "SELECT e.*, t.title AS tour_title, r.title AS roam_title,
                    CONCAT(u.first_name, ' ', u.last_name) AS vendor_name,
                    pp.partner_id AS partner_id_matched, pp.display_name AS partner_display_name
             FROM trip_enquiries e
             LEFT JOIN tours t ON t.id = e.tour_id
             LEFT JOIN roams r ON r.id = e.roam_id
             LEFT JOIN users u ON u.id = t.submitted_by_user_id
             LEFT JOIN partner_profiles pp ON pp.user_id = e.partner_user_id
             ORDER BY e.created_at DESC LIMIT 200"
        )->fetch_all(MYSQLI_ASSOC);
        ep_json_ok(['enquiries' => $rows]);
    }

    // Vendor: only enquiries for their own trips, only once forwarded,
    // and with the customer's personal details — and all partner/
    // commission information, which is strictly admin-partner business —
    // stripped before it ever leaves the database query.
    $stmt = $conn->prepare(
        "SELECT e.id, e.tour_id, t.title AS tour_title, e.preferred_checkin_date, e.group_size,
                e.message, e.status, e.created_at,
                CONCAT('Shared by Embark Pedia admin — ref EP-', e.id) AS contact_note
         FROM trip_enquiries e
         JOIN tours t ON t.id = e.tour_id
         WHERE t.submitted_by_user_id = ? AND e.shared_with_vendor = 1
         ORDER BY e.created_at DESC LIMIT 200"
    );
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    ep_json_ok(['enquiries' => $rows]);
}

// ---- Admin forwards an enquiry to the owning vendor -----------------------
if ($action === 'forward') {
    if (!$isAdmin) ep_json_fail(403, 'Admin only.');
    $id = (int)($body['id'] ?? 0);
    $stmt = $conn->prepare(
        "SELECT e.id FROM trip_enquiries e JOIN tours t ON t.id = e.tour_id
         WHERE e.id = ? AND t.submitted_by_user_id IS NOT NULL LIMIT 1"
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $found = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    if (!$found) ep_json_fail(404, 'This enquiry has no vendor to forward to (it may be for a ROAM, which has no vendor).');

    $upd = $conn->prepare('UPDATE trip_enquiries SET shared_with_vendor = 1, shared_at = NOW() WHERE id = ?');
    $upd->bind_param('i', $id);
    $upd->execute();
    $upd->close();
    ep_json_ok(['message' => 'Enquiry forwarded to the vendor (customer details withheld).']);
}

// ---- Status updates: admin only (on_hold / closed / resolved) -------------
if ($action === 'update_status') {
    if (!$isAdmin) ep_json_fail(403, 'Only admin can change an enquiry\'s status.');

    $id = (int)($body['id'] ?? 0);
    $kind = (string)($body['kind'] ?? 'trip'); // 'trip' | 'contact'

    if ($kind === 'contact') {
        $status = (string)($body['status'] ?? '');
        if (!in_array($status, ['new', 'in_progress', 'responded', 'closed', 'spam'], true)) {
            ep_json_fail(422, 'Invalid status.');
        }
        $stmt = $conn->prepare('UPDATE contact_messages SET status = ? WHERE id = ?');
        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        $stmt->close();
        ep_json_ok(['message' => 'Status updated.']);
    }

    $status = (string)($body['status'] ?? '');
    if (!in_array($status, ['on_hold', 'closed', 'resolved'], true)) {
        ep_json_fail(422, 'Status must be on_hold, closed, or resolved.');
    }
    $invoiceRef = trim((string)($body['invoice_reference'] ?? ''));
    $invoiceRefOrNull = $invoiceRef !== '' ? $invoiceRef : null;

    if ($status === 'resolved') {
        $stmt = $conn->prepare(
            "UPDATE trip_enquiries SET status = 'resolved', resolved_by_user_id = ?, resolved_at = NOW(), invoice_reference = COALESCE(?, invoice_reference)
             WHERE id = ?"
        );
        $stmt->bind_param('isi', $user['id'], $invoiceRefOrNull, $id);
        $stmt->execute();
        $stmt->close();
        $exists = $conn->query("SELECT 1 FROM trip_enquiries WHERE id = {$id}")->num_rows > 0;
        if (!$exists) ep_json_fail(404, 'Enquiry not found.');

        ep_try_credit_partner($conn, $id);
    } else {
        $stmt = $conn->prepare('UPDATE trip_enquiries SET status = ? WHERE id = ?');
        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        $stmt->close();
    }

    ep_json_ok(['message' => 'Status updated.']);
}

// ---- Manual trigger to re-run the 7-day-window check on demand ------------
if ($action === 'recheck_partner_credits') {
    if (!$isAdmin) ep_json_fail(403, 'Admin only.');
    ep_recheck_all_pending_partner_credits($conn);
    ep_json_ok(['message' => 'Checked for any partner credits now due.']);
}

ep_json_fail(400, 'Unknown action.');
