<?php
/**
 * organizer-me.php
 * ------------------------------------------------------------------
 * GET-style endpoint (no body needed) called by organizer.js at the
 * top of every /organizer/*.html page load, including the partner hub.
 * Returns the signed-in user's role +
 * profile/review status, or a 401 that the caller treats as "redirect
 * to login". This is the real authorization boundary — the HTML pages
 * themselves carry no secrets and are not a substitute for it (static
 * .html cannot be protected server-side on its own; every data-bearing
 * fetch re-checks the session via ep_require_role()).
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

$user = ep_require_role(['vendor', 'admin', 'partner']);

$out = [
    'id'           => (int)$user['id'],
    'first_name'   => $user['first_name'],
    'last_name'    => $user['last_name'],
    'email'        => $user['email'],
    'contact'      => $user['contact'],
    'account_type' => $user['account_type'],
];

if ($user['account_type'] === 'vendor') {
    $out['vendor_profile'] = ep_vendor_profile((int)$user['id']);
}

// A vendor can ALSO be a partner (every approved vendor is given a
// partner_profiles row — see organizer-vendors.php), so this is checked
// by user id, independent of account_type, and attached whenever it
// exists: a 'partner' account always has one, a 'vendor' account might.
$partnerProfile = ep_partner_profile((int)$user['id']);
if ($partnerProfile) {
    $out['partner_profile'] = $partnerProfile;
}

ep_json_ok(['user' => $out]);
