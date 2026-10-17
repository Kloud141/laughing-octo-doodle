<?php
/**
 * public-roams.php
 * ------------------------------------------------------------------
 * Unauthenticated GET endpoint. Returns every ROAM with status =
 * 'published' — i.e. never a draft, never one an admin has paused or
 * archived (see the `status` ENUM note on the `roams` table in
 * schema.sql). Consumed by:
 *   - assets/js/chrome.js, on every page, to replace the three
 *     hand-pasted sample ROAMS in the navbar "Roams" dropdown
 *     (desktop + mobile) with whatever's actually published.
 *   - roams/roams.html, to merge these into window.ROAMS_DATA before
 *     its existing card-grid render runs.
 * No session/role check — this mirrors what any visitor could already
 * see on the public site, just sourced from the database instead of
 * the hand-authored roams-data.js array.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ep_json_fail(405, 'Method not allowed.');
}

$conn = ep_db();
$rows = $conn->query(
    "SELECT slug, title, route, date_range, days, image_url, description, full_page_path
     FROM roams WHERE status = 'published' ORDER BY created_at DESC"
)->fetch_all(MYSQLI_ASSOC);

$out = array_map(function ($r) {
    return [
        'slug'        => $r['slug'],
        'title'       => $r['title'],
        'route'       => $r['route'],
        'dates'       => $r['date_range'] . ($r['days'] ? ' · ' . (int)$r['days'] . ' days' : ''),
        'image'       => $r['image_url'],
        'description' => $r['description'],
    ];
}, $rows);

ep_json_ok(['roams' => $out]);
