<?php
/**
 * public-trips.php
 * ------------------------------------------------------------------
 * Unauthenticated GET endpoint. Returns every TRIP with status =
 * 'published' — never a draft, never pending review, never one a
 * vendor/admin has paused, rejected, or archived — grouped by
 * destination in the same shape as DESTINATIONS_DATA in datasets.js:
 *   { destinations: [ { slug, name, region, image, blurb,
 *       tours: [ { title, days, nights, category, price, articleId,
 *                  voyageId, image } ] } ] }
 * Consumed by destinations/destination-tours.html and
 * destinations/tour-details.html, which merge this into
 * DESTINATIONS_DATA before their existing render/lookup logic runs —
 * see the merge note at the top of assets/js/datasets.js for how the
 * two are kept in sync without changing that logic.
 * A destination this trip belongs to is included even if it has no
 * tours client-side is already showing for it (e.g. a brand-new
 * destination an admin hasn't added to datasets.js yet) — the merge
 * script creates it on the fly.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ep_json_fail(405, 'Method not allowed.');
}

$conn = ep_db();
$rows = $conn->query(
    "SELECT t.title, t.days, t.nights, t.category, t.price_inr, t.article_id, t.voyage_id, t.image_url,
            d.slug AS destination_slug, d.name AS destination_name, d.region, d.image_url AS destination_image, d.blurb
     FROM tours t JOIN destinations d ON d.id = t.destination_id
     WHERE t.status = 'published'
     ORDER BY d.name, t.created_at DESC"
)->fetch_all(MYSQLI_ASSOC);

$byDestination = [];
foreach ($rows as $r) {
    $slug = $r['destination_slug'];
    if (!isset($byDestination[$slug])) {
        $byDestination[$slug] = [
            'slug'   => $slug,
            'name'   => $r['destination_name'],
            'region' => $r['region'],
            'image'  => $r['destination_image'],
            'blurb'  => $r['blurb'],
            'tours'  => [],
        ];
    }
    $byDestination[$slug]['tours'][] = [
        'title'     => $r['title'],
        'days'      => (int)$r['days'],
        'nights'    => (int)$r['nights'],
        'category'  => $r['category'],
        'price'     => (float)$r['price_inr'],
        'articleId' => $r['article_id'],
        'voyageId'  => $r['voyage_id'],
        'image'     => $r['image_url'],
    ];
}

ep_json_ok(['destinations' => array_values($byDestination)]);
