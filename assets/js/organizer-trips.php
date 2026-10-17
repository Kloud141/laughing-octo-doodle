<?php
/**
 * organizer-trips.php
 * ------------------------------------------------------------------
 * CRUD + review workflow for TRIPS (`tours` + its child tables), used
 * by both the vendor and admin "List Trips / Add Tour" screens in
 * /organizer/authoring.html, and by the admin's approval queue in
 * /organizer/approvals.html. One file, action-routed (this project's
 * other endpoints are one-action-per-file; a resource with several
 * operations reads better as one file with an `action` switch than as
 * six near-duplicate files — see database/README.md for the
 * authorization rules this encodes).
 *
 * Request: POST, JSON body, { action: "...", ...fields }.
 * Actions: destinations | list | get | create | update | archive |
 *          approve | reject
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

// A vendor may only act on their own trips, and only while a trip is not
// yet published — once live, only an admin edits it (README_UI.md rule).
function ep_trip_owned_editable(mysqli $conn, int $tourId, array $user, bool $isAdmin): array
{
    $stmt = $conn->prepare('SELECT id, submitted_by_user_id, status FROM tours WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $tourId);
    $stmt->execute();
    $tour = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$tour) ep_json_fail(404, 'Trip not found.');
    if (!$isAdmin) {
        if ((int)$tour['submitted_by_user_id'] !== (int)$user['id']) {
            ep_json_fail(403, 'You can only manage your own trips.');
        }
        if ($tour['status'] === 'published') {
            ep_json_fail(403, 'Published trips can only be edited by an admin.');
        }
    }
    return $tour;
}

function ep_random_code(int $bytes): string
{
    return strtoupper(bin2hex(random_bytes($bytes)));
}

// ---- destinations: dropdown source for the Add Tour form ---------------
if ($action === 'destinations') {
    $rows = $conn->query('SELECT id, slug, name, region FROM destinations ORDER BY name')->fetch_all(MYSQLI_ASSOC);
    ep_json_ok(['destinations' => $rows]);
}

// ---- list: vendor sees own trips; admin sees all (optionally filtered) --
if ($action === 'list') {
    if ($isAdmin) {
        $status = (string)($body['status'] ?? '');
        if ($status !== '') {
            $stmt = $conn->prepare(
                'SELECT t.*, d.name AS destination_name, u.first_name AS vendor_first_name, u.last_name AS vendor_last_name
                 FROM tours t JOIN destinations d ON d.id = t.destination_id
                 LEFT JOIN users u ON u.id = t.submitted_by_user_id
                 WHERE t.status = ? ORDER BY t.created_at DESC'
            );
            $stmt->bind_param('s', $status);
        } else {
            $stmt = $conn->prepare(
                'SELECT t.*, d.name AS destination_name, u.first_name AS vendor_first_name, u.last_name AS vendor_last_name
                 FROM tours t JOIN destinations d ON d.id = t.destination_id
                 LEFT JOIN users u ON u.id = t.submitted_by_user_id
                 ORDER BY t.created_at DESC'
            );
        }
    } else {
        $stmt = $conn->prepare(
            'SELECT t.*, d.name AS destination_name
             FROM tours t JOIN destinations d ON d.id = t.destination_id
             WHERE t.submitted_by_user_id = ? ORDER BY t.created_at DESC'
        );
        $stmt->bind_param('i', $user['id']);
    }
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    ep_json_ok(['trips' => $rows]);
}

// ---- get: one trip with its inclusions/exclusions/itinerary/stays ------
if ($action === 'get') {
    $id = (int)($body['id'] ?? 0);
    $tour = ep_trip_owned_editable($conn, $id, $user, true); // read is always allowed if owned-or-admin
    if (!$isAdmin && (int)$tour['submitted_by_user_id'] !== (int)$user['id']) {
        ep_json_fail(403, 'You can only view your own trips.');
    }
    $full = $conn->query('SELECT * FROM tours WHERE id = ' . $id)->fetch_assoc();
    $full['inclusions'] = $conn->query("SELECT item_text FROM tour_inclusions WHERE tour_id = {$id} ORDER BY position")->fetch_all(MYSQLI_ASSOC);
    $full['exclusions'] = $conn->query("SELECT item_text FROM tour_exclusions WHERE tour_id = {$id} ORDER BY position")->fetch_all(MYSQLI_ASSOC);
    $full['itinerary']  = $conn->query("SELECT day_number, title, plan_text, is_highlight, note_text FROM tour_itinerary_days WHERE tour_id = {$id} ORDER BY day_number")->fetch_all(MYSQLI_ASSOC);
    $full['stays']      = $conn->query("SELECT checkin_number, hotel_name, checkin_day, checkout_day, notes FROM tour_stays WHERE tour_id = {$id} ORDER BY checkin_number")->fetch_all(MYSQLI_ASSOC);
    ep_json_ok(['trip' => $full]);
}

// ---- shared validation for create/update --------------------------------
function ep_validate_trip_payload(array $b): array
{
    $errors = [];
    $title = trim((string)($b['title'] ?? ''));
    $destinationId = (int)($b['destination_id'] ?? 0);
    $days = (int)($b['days'] ?? 0);
    $nights = (int)($b['nights'] ?? 0);
    $category = trim((string)($b['category'] ?? ''));
    $price = (float)($b['price_inr'] ?? -1);
    $itinerary = is_array($b['itinerary'] ?? null) ? $b['itinerary'] : [];

    if ($title === '' || mb_strlen($title) > 200) $errors[] = 'Enter a trip title.';
    if ($destinationId <= 0) $errors[] = 'Select a destination.';
    if ($days < 2 || $days > 9) $errors[] = 'Trip duration should be between 2 and 9 days (TRIPS are the 3–9 day product line).';
    if ($nights < 1) $errors[] = 'Enter the number of nights.';
    if ($category === '') $errors[] = 'Enter a category (e.g. Honeymoon, Family, Adventure).';
    if ($price < 0) $errors[] = 'Enter a base price.';
    if (count($itinerary) < 3) $errors[] = 'Add at least 3 day-by-day itinerary entries.';
    foreach ($itinerary as $i => $day) {
        if (trim((string)($day['title'] ?? '')) === '') $errors[] = 'Itinerary day ' . ($i + 1) . ' needs a title.';
        if (trim((string)($day['plan_text'] ?? '')) === '') $errors[] = 'Itinerary day ' . ($i + 1) . ' needs a plan description.';
    }
    return $errors;
}

function ep_save_trip_children(mysqli $conn, int $tourId, array $b): void
{
    $conn->query("DELETE FROM tour_inclusions WHERE tour_id = {$tourId}");
    $conn->query("DELETE FROM tour_exclusions WHERE tour_id = {$tourId}");
    $conn->query("DELETE FROM tour_itinerary_days WHERE tour_id = {$tourId}");
    $conn->query("DELETE FROM tour_stays WHERE tour_id = {$tourId}");

    $pos = 1;
    foreach ((array)($b['inclusions'] ?? []) as $item) {
        $item = trim((string)$item);
        if ($item === '') continue;
        $stmt = $conn->prepare('INSERT INTO tour_inclusions (tour_id, position, item_text) VALUES (?, ?, ?)');
        $stmt->bind_param('iis', $tourId, $pos, $item);
        $stmt->execute();
        $stmt->close();
        $pos++;
    }
    $pos = 1;
    foreach ((array)($b['exclusions'] ?? []) as $item) {
        $item = trim((string)$item);
        if ($item === '') continue;
        $stmt = $conn->prepare('INSERT INTO tour_exclusions (tour_id, position, item_text) VALUES (?, ?, ?)');
        $stmt->bind_param('iis', $tourId, $pos, $item);
        $stmt->execute();
        $stmt->close();
        $pos++;
    }
    $dayNum = 1;
    foreach ((array)($b['itinerary'] ?? []) as $day) {
        $dTitle = trim((string)($day['title'] ?? ''));
        $dPlan = trim((string)($day['plan_text'] ?? ''));
        if ($dTitle === '' || $dPlan === '') continue;
        $highlight = !empty($day['is_highlight']) ? 1 : 0;
        $note = trim((string)($day['note_text'] ?? ''));
        $noteOrNull = $note !== '' ? $note : null;
        $stmt = $conn->prepare(
            'INSERT INTO tour_itinerary_days (tour_id, day_number, title, plan_text, is_highlight, note_text) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('iissis', $tourId, $dayNum, $dTitle, $dPlan, $highlight, $noteOrNull);
        $stmt->execute();
        $stmt->close();
        $dayNum++;
    }
    $checkin = 1;
    foreach ((array)($b['stays'] ?? []) as $stay) {
        $hotel = trim((string)($stay['hotel_name'] ?? ''));
        if ($hotel === '') continue;
        $checkinDay = isset($stay['checkin_day']) && $stay['checkin_day'] !== '' ? (int)$stay['checkin_day'] : null;
        $checkoutDay = isset($stay['checkout_day']) && $stay['checkout_day'] !== '' ? (int)$stay['checkout_day'] : null;
        $notes = trim((string)($stay['notes'] ?? ''));
        $notesOrNull = $notes !== '' ? $notes : null;
        $stmt = $conn->prepare(
            'INSERT INTO tour_stays (tour_id, checkin_number, hotel_name, checkin_day, checkout_day, notes) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('iisiis', $tourId, $checkin, $hotel, $checkinDay, $checkoutDay, $notesOrNull);
        $stmt->execute();
        $stmt->close();
        $checkin++;
    }
}

if ($action === 'create') {
    $errors = ep_validate_trip_payload($body);
    if (!empty($errors)) ep_json_fail(422, implode(' ', $errors));

    $destCheck = $conn->prepare('SELECT id FROM destinations WHERE id = ? LIMIT 1');
    $destCheck->bind_param('i', $body['destination_id']);
    $destCheck->execute();
    if ($destCheck->get_result()->num_rows === 0) ep_json_fail(422, 'Selected destination does not exist.');
    $destCheck->close();

    $status = $isAdmin ? 'published' : 'pending_review';
    $submittedBy = (int)$user['id'];

    $conn->begin_transaction();
    try {
        $title = trim((string)$body['title']);
        $days = (int)$body['days'];
        $nights = (int)$body['nights'];
        $category = trim((string)$body['category']);
        $price = (float)$body['price_inr'];
        $priceBreakfast = isset($body['price_with_breakfast_inr']) && $body['price_with_breakfast_inr'] !== '' ? (float)$body['price_with_breakfast_inr'] : null;
        $priceBreakfastDinner = isset($body['price_with_breakfast_dinner_inr']) && $body['price_with_breakfast_dinner_inr'] !== '' ? (float)$body['price_with_breakfast_dinner_inr'] : null;
        $hotelType = trim((string)($body['hotel_type'] ?? ''));
        $hotelTypeOrNull = $hotelType !== '' ? $hotelType : null;
        $imageUrl = trim((string)($body['image_url'] ?? ''));
        $imageUrlOrNull = $imageUrl !== '' ? $imageUrl : null;
        $destinationId = (int)$body['destination_id'];

        // article_id/voyage_id are internal catalogue codes the public site
        // already displays (see datasets.js) — organizers never type these;
        // retry on the rare unique-key collision.
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $articleId = 'TRP' . ep_random_code(3);
            $voyageId = ep_random_code(3);
            $stmt = $conn->prepare(
                'INSERT INTO tours (destination_id, title, article_id, voyage_id, days, nights, category,
                                     price_inr, price_with_breakfast_inr, price_with_breakfast_dinner_inr,
                                     hotel_type, image_url, status, submitted_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->bind_param(
                'isssiisdddsssi',
                $destinationId, $title, $articleId, $voyageId, $days, $nights, $category,
                $price, $priceBreakfast, $priceBreakfastDinner, $hotelTypeOrNull, $imageUrlOrNull, $status, $submittedBy
            );
            if ($stmt->execute()) {
                $tourId = $stmt->insert_id;
                $stmt->close();
                break;
            }
            $stmt->close();
            if ($attempt === 4) throw new RuntimeException('could not allocate a unique trip code');
        }

        ep_save_trip_children($conn, $tourId, $body);
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        ep_json_fail(500, 'Could not save the trip. Please try again.');
    }

    ep_json_ok([
        'message' => $isAdmin ? 'Trip published.' : 'Trip submitted for admin review.',
        'id' => $tourId,
    ]);
}

if ($action === 'update') {
    $id = (int)($body['id'] ?? 0);
    ep_trip_owned_editable($conn, $id, $user, $isAdmin);

    $errors = ep_validate_trip_payload($body);
    if (!empty($errors)) ep_json_fail(422, implode(' ', $errors));

    $conn->begin_transaction();
    try {
        $title = trim((string)$body['title']);
        $days = (int)$body['days'];
        $nights = (int)$body['nights'];
        $category = trim((string)$body['category']);
        $price = (float)$body['price_inr'];
        $priceBreakfast = isset($body['price_with_breakfast_inr']) && $body['price_with_breakfast_inr'] !== '' ? (float)$body['price_with_breakfast_inr'] : null;
        $priceBreakfastDinner = isset($body['price_with_breakfast_dinner_inr']) && $body['price_with_breakfast_dinner_inr'] !== '' ? (float)$body['price_with_breakfast_dinner_inr'] : null;
        $hotelType = trim((string)($body['hotel_type'] ?? ''));
        $hotelTypeOrNull = $hotelType !== '' ? $hotelType : null;
        $imageUrl = trim((string)($body['image_url'] ?? ''));
        $imageUrlOrNull = $imageUrl !== '' ? $imageUrl : null;
        $destinationId = (int)$body['destination_id'];
        // A vendor's edit of a previously-rejected trip goes back to the
        // review queue rather than silently re-publishing.
        $stmt = $conn->prepare(
            'UPDATE tours SET destination_id=?, title=?, days=?, nights=?, category=?, price_inr=?,
                    price_with_breakfast_inr=?, price_with_breakfast_dinner_inr=?, hotel_type=?, image_url=?,
                    status = IF(? = 1, status, \'pending_review\')
             WHERE id = ?'
        );
        $isAdminInt = $isAdmin ? 1 : 0;
        $stmt->bind_param('isiisdddssii', $destinationId, $title, $days, $nights, $category, $price,
            $priceBreakfast, $priceBreakfastDinner, $hotelTypeOrNull, $imageUrlOrNull, $isAdminInt, $id);
        $stmt->execute();
        $stmt->close();

        ep_save_trip_children($conn, $id, $body);
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        ep_json_fail(500, 'Could not update the trip. Please try again.');
    }

    ep_json_ok(['message' => 'Trip updated.']);
}

if ($action === 'archive') {
    $id = (int)($body['id'] ?? 0);
    ep_trip_owned_editable($conn, $id, $user, $isAdmin);
    $stmt = $conn->prepare("UPDATE tours SET status = 'archived' WHERE id = ?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not archive the trip.');
    ep_json_ok(['message' => 'Trip archived.']);
}

// Pause/resume: takes a published trip off the public site (public-trips.php
// only ever serves status='published') without touching its review history
// or child rows — unlike archive, this is meant to be reversible day to day.
if ($action === 'pause') {
    $id = (int)($body['id'] ?? 0);
    // Deliberately NOT ep_trip_owned_editable() — that helper blocks a
    // vendor from touching an already-published trip, which is exactly
    // the trip a vendor needs to be able to pause. Ownership is checked
    // directly instead.
    $stmt = $conn->prepare('SELECT id, submitted_by_user_id, status FROM tours WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $tour = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$tour) ep_json_fail(404, 'Trip not found.');
    if (!$isAdmin && (int)$tour['submitted_by_user_id'] !== (int)$user['id']) {
        ep_json_fail(403, 'You can only pause your own trips.');
    }
    if ($tour['status'] !== 'published') {
        ep_json_fail(409, 'Only a published trip can be paused.');
    }
    $stmt = $conn->prepare("UPDATE tours SET status = 'paused' WHERE id = ?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not pause the trip.');
    ep_json_ok(['message' => 'Trip paused — it no longer appears on the public site.']);
}

if ($action === 'resume') {
    $id = (int)($body['id'] ?? 0);
    $stmt = $conn->prepare('SELECT id, submitted_by_user_id, status FROM tours WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $tour = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$tour) ep_json_fail(404, 'Trip not found.');
    if (!$isAdmin && (int)$tour['submitted_by_user_id'] !== (int)$user['id']) {
        ep_json_fail(403, 'You can only resume your own trips.');
    }
    if ($tour['status'] !== 'paused') {
        ep_json_fail(409, 'Only a paused trip can be resumed.');
    }
    $stmt = $conn->prepare("UPDATE tours SET status = 'published' WHERE id = ?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not resume the trip.');
    ep_json_ok(['message' => 'Trip resumed — it is live on the public site again.']);
}

if ($action === 'approve') {
    if (!$isAdmin) ep_json_fail(403, 'Admin only.');
    $id = (int)($body['id'] ?? 0);
    $stmt = $conn->prepare("UPDATE tours SET status='published', reviewed_by_user_id=?, reviewed_at=NOW() WHERE id=?");
    $stmt->bind_param('ii', $user['id'], $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not approve the trip.');
    ep_json_ok(['message' => 'Trip approved and published.']);
}

if ($action === 'reject') {
    if (!$isAdmin) ep_json_fail(403, 'Admin only.');
    $id = (int)($body['id'] ?? 0);
    $stmt = $conn->prepare("UPDATE tours SET status='rejected', reviewed_by_user_id=?, reviewed_at=NOW() WHERE id=?");
    $stmt->bind_param('ii', $user['id'], $id);
    $ok = $stmt->execute();
    $stmt->close();
    if (!$ok) ep_json_fail(500, 'Could not reject the trip.');
    ep_json_ok(['message' => 'Trip sent back to the vendor as rejected.']);
}

ep_json_fail(400, 'Unknown action.');
