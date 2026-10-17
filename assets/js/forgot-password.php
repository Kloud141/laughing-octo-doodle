<?php
/**
 * forgot-password.php
 * ------------------------------------------------------------------
 * Shared "Forgot password?" handler for /auth/login.html (customers)
 * and /organizer/login.html (vendor/partner). Admin accounts are
 * deliberately excluded — they're provisioned privately (see the seed
 * note at the end of database/schema.sql) and don't get a self-service
 * reset path.
 *
 * On a match: generates a random 12-character [a-zA-Z0-9] password
 * (ep_generate_temp_password(), db.php), stores its bcrypt+pepper hash,
 * sets must_change_password = 1 so login.php / organizer-login.php both
 * force a visit to change-password.html on next sign-in, and emails the
 * temp password via ep_send_mail() (db.php — logs instead of sending
 * outside production).
 *
 * Responds with the same generic, enumeration-safe message whether or
 * not the email matches an account — see login.php's comments for why
 * ("never confirm/deny which field was wrong" applies equally here to
 * "whether this email is registered").
 * ------------------------------------------------------------------
 */

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ep_json_fail(405, 'Method not allowed.');
}

ep_verify_same_site_request();

if (ep_honeypot_tripped()) {
    ep_json_ok(['message' => 'If an account exists for that email, a new temporary password has been sent.']);
}

ep_rate_limit('forgot_password', 5, 900); // 5 attempts / 15 minutes / IP

$email = trim((string)($_POST['email'] ?? ''));
$generic = 'If an account exists for that email, a new temporary password has been sent.';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    // Still generic: don't confirm the address itself is malformed vs. unknown.
    ep_json_ok(['message' => $generic]);
}

$conn = ep_db();
$stmt = $conn->prepare('SELECT id, first_name, account_type, account_status FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($user
    && $user['account_status'] === 'active'
    && in_array($user['account_type'], ['customer', 'vendor', 'partner'], true)
) {
    $tempPassword = ep_generate_temp_password();
    $hash = password_hash($tempPassword . EP_PASSWORD_PEPPER, PASSWORD_BCRYPT, ['cost' => 12]);

    $upd = $conn->prepare(
        'UPDATE users
         SET password_hash = ?, must_change_password = 1, failed_attempts = 0, locked_until = NULL
         WHERE id = ?'
    );
    $upd->bind_param('si', $hash, $user['id']);
    $upd->execute();
    $upd->close();

    $subject = 'Your Embark Pedia temporary password';
    $body = "Hi {$user['first_name']},\n\n"
        . "We received a request to reset your Embark Pedia password. Your new temporary password is:\n\n"
        . "    {$tempPassword}\n\n"
        . "Sign in with it, and you'll be asked to choose a new password right away. "
        . "If you didn't request this, contact support@embarkpedia.com immediately.\n\n"
        . "— Embark Pedia";
    ep_send_mail($email, $subject, $body);
}

// Same response whether $user was found or not.
ep_json_ok(['message' => $generic]);
