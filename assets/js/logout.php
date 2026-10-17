<?php
/**
 * logout.php — destroys the current session (if any) and clears the cookie.
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

ep_json_ok(['message' => 'Signed out.']);
