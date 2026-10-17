<?php
/**
 * organizer-roams.php
 * ------------------------------------------------------------------
 * Admin-only visibility control for ROAMS (the admin-posted 9–11 day
 * product line — design brief: ROAMS are an admin capability only;
 * vendors get Tours only, via organizer-trips.php).
 *
 * Scope note: this endpoint reads the `roams` listing row (slug, title,
 * route, dates, price, image, status) and toggles its `status` column.
 * It does not create rows or touch any other column — new ROAMS and
 * the nested `roam_details` JSON (hero/about/gallery/itinerary/packing/
 * eligibility/faq/footer — nine sections, see
 * database/roam-details-fields.txt) are added directly in the database.
 *
 * Request: POST, JSON body, { action: "...", ...fields }.
 * Actions: list | get | publish | pause | resume | archive
 *
 * NOTE: "create" and "update" were intentionally removed. Admins can no
 * longer author new ROAMS or edit an existing one's fields from this
 * dashboard — only toggle an existing row's visibility (publish/resume
 * = "Start", pause = "Pause", archive = "Stop", the last of which is
 * one-way by design: an archived ROAM can never be published/resumed
 * again). Rows still have to be added directly in the database.
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
    $rows = $conn->query('SELECT * FROM roams ORDER BY created_at DESC')->fetch_all(MYSQLI_ASSOC);
    ep_json_ok(['roams' => $rows]);
}

if ($action === 'get') {
    $id = (int)($body['id'] ?? 0);
    $row = $conn->query("SELECT * FROM roams WHERE id = {$id}")->fetch_assoc();
    if (!$row) ep_json_fail(404, 'ROAM not found.');
    ep_json_ok(['roam' => $row]);
}

if ($action === 'create' || $action === 'update') {
    ep_json_fail(410, 'Creating or editing ROAMS from the admin portal has been disabled. Use Pause / Start / Stop to manage an existing ROAM\'s visibility; new rows must be added directly in the database.');
}

// "Start": publishes a draft, or resumes a paused ROAM. Refuses to touch
// an archived ("stopped") ROAM — that status is one-way by design.
if ($action === 'publish') {
    $id = (int)($body['id'] ?? 0);
    $row = $conn->query("SELECT status FROM roams WHERE id = {$id}")->fetch_assoc();
    if (!$row) ep_json_fail(404, 'ROAM not found.');
    if ($row['status'] === 'archived') ep_json_fail(409, 'This ROAM was stopped and cannot be started again.');
    if ($row['status'] === 'published') ep_json_fail(409, 'This ROAM is already published.');
    $stmt = $conn->prepare("UPDATE roams SET status='published', reviewed_by_user_id=?, reviewed_at=NOW() WHERE id=?");
    $stmt->bind_param('ii', $admin['id'], $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not publish the ROAM.');
    ep_json_ok(['message' => 'ROAM published — it now appears in the navbar and roams list.']);
}

// "Stop": one-way. Pulls it from the navbar dropdown and roams.html listing
// (public-roams.php only serves status='published') and it can never be
// started again — see the "publish" guard above.
if ($action === 'archive') {
    $id = (int)($body['id'] ?? 0);
    $row = $conn->query("SELECT status FROM roams WHERE id = {$id}")->fetch_assoc();
    if (!$row) ep_json_fail(404, 'ROAM not found.');
    if ($row['status'] === 'archived') ep_json_fail(409, 'This ROAM has already been stopped.');
    $stmt = $conn->prepare("UPDATE roams SET status='archived' WHERE id=?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not stop the ROAM.');
    ep_json_ok(['message' => 'ROAM stopped — removed from the navbar and roams list for good.']);
}

// Pause/resume: pulls a ROAM from the navbar dropdown and roams.html listing
// (public-roams.php only serves status='published') without losing its
// roam_details content or review history — archive is the one-way version.
if ($action === 'pause') {
    $id = (int)($body['id'] ?? 0);
    $row = $conn->query("SELECT status FROM roams WHERE id = {$id}")->fetch_assoc();
    if (!$row) ep_json_fail(404, 'ROAM not found.');
    if ($row['status'] !== 'published') ep_json_fail(409, 'Only a published ROAM can be paused.');
    $stmt = $conn->prepare("UPDATE roams SET status='paused' WHERE id=?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not pause the ROAM.');
    ep_json_ok(['message' => 'ROAM paused — it no longer appears in the navbar or roams list.']);
}

if ($action === 'resume') {
    $id = (int)($body['id'] ?? 0);
    $row = $conn->query("SELECT status FROM roams WHERE id = {$id}")->fetch_assoc();
    if (!$row) ep_json_fail(404, 'ROAM not found.');
    if ($row['status'] !== 'paused') ep_json_fail(409, 'Only a paused ROAM can be resumed.');
    $stmt = $conn->prepare("UPDATE roams SET status='published' WHERE id=?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not resume the ROAM.');
    ep_json_ok(['message' => 'ROAM resumed — it is back in the navbar and roams list.']);
}

ep_json_fail(400, 'Unknown action.');
