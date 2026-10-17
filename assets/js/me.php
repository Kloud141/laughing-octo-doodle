<?php
/**
 * me.php
 * ------------------------------------------------------------------
 * GET-style endpoint (no body needed), unauthenticated-safe: unlike
 * organizer-me.php (which requires vendor/admin/partner via
 * ep_require_role() and 401s otherwise), this one is callable from any
 * public page and simply reports whether anyone is signed in. It is
 * read by three different front-end scripts, each using only the
 * fields it needs:
 *   - chrome.js   — swaps the header's "Login / Sign Up" link for
 *                   "My Account" / "Log Out" once signed in.
 *   - account/profile.js — the customer profile page itself.
 *   - tour-render.js — autofills Name/Email/Contact on the trip
 *                   enquiry form (destinations/tour-details.html).
 * Always 200s; "signed out" is a normal, expected response here, not
 * an error — so this returns {ok:true, signed_in:false} rather than a
 * 401 the way organizer-me.php does for an actually-protected screen.
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

$user = ep_current_user();

if (!$user || $user['account_status'] !== 'active') {
    ep_json_ok(['signed_in' => false]);
}

ep_json_ok([
    'signed_in' => true,
    'user' => [
        'id'                    => (int)$user['id'],
        'first_name'            => $user['first_name'],
        'last_name'             => $user['last_name'],
        'full_name'             => trim($user['first_name'] . ' ' . $user['last_name']),
        'email'                 => $user['email'],
        'contact'               => $user['contact'],
        'account_type'          => $user['account_type'],
        'name_is_split'         => (bool)$user['name_is_split'],
        'must_change_password'  => (bool)$user['must_change_password'],
    ],
]);
