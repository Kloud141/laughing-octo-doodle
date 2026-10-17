<?php
/**
 * db.php
 * ------------------------------------------------------------------
 * Shared bootstrap for every form-handling endpoint:
 *   connect.php (contact) · subscribe.php (newsletter) ·
 *   signup.php · login.php · logout.php
 *
 * Centralising this means a security fix (e.g. a stricter session
 * cookie flag) only has to be made once. Nothing in this file prints
 * HTML; every endpoint that includes it is responsible for its own
 * response format (this project uses JSON — see json_fail/json_ok).
 * ------------------------------------------------------------------
 */

declare(strict_types=1);

// ---- 1. Environment --------------------------------------------------
$APP_ENV = getenv('EMBARKPEDIA_APP_ENV') ?: 'production';
define('EP_IS_PROD', $APP_ENV !== 'development');

// Never show PHP errors to visitors; log them instead.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// ---- 2. Credentials: environment variables first, config.php second --
function ep_config(string $envName, string $constName)
{
    $v = getenv($envName);
    if ($v !== false && $v !== '') {
        return $v;
    }
    static $loaded = false;
    if (!$loaded) {
        $configPath = __DIR__ . '/config.php';
        if (file_exists($configPath)) {
            require $configPath;
        }
        $loaded = true;
    }
    return defined($constName) ? constant($constName) : false;
}

$dbHost = ep_config('EMBARKPEDIA_DB_HOST', 'EMBARKPEDIA_DB_HOST');
$dbName = ep_config('EMBARKPEDIA_DB_NAME', 'EMBARKPEDIA_DB_NAME');
$dbUser = ep_config('EMBARKPEDIA_DB_USER', 'EMBARKPEDIA_DB_USER');
$dbPass = ep_config('EMBARKPEDIA_DB_PASS', 'EMBARKPEDIA_DB_PASS');
$pepper = ep_config('EMBARKPEDIA_PASSWORD_PEPPER', 'EMBARKPEDIA_PASSWORD_PEPPER');

if ($dbHost === false || $dbName === false || $dbUser === false || $dbPass === false) {
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode(['ok' => false, 'error' => 'Server misconfiguration: database credentials are not set.']));
}
define('EP_PASSWORD_PEPPER', $pepper !== false ? $pepper : '');

// ---- 3. Session hardening --------------------------------------------
// Must run before session_start(). Cookie is HttpOnly + SameSite=Lax
// always; Secure is added automatically once the site is on HTTPS
// (EP_IS_PROD) so local HTTP development still works.
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => EP_IS_PROD,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('EP_SESSION');
    session_start();
}

// ---- 4. Database connection (mysqli, always prepared statements) -----
function ep_db(): mysqli
{
    global $dbHost, $dbUser, $dbPass, $dbName;
    static $conn = null;
    if ($conn === null) {
        mysqli_report(MYSQLI_REPORT_OFF); // we check errors manually, never leak them
        $conn = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            ep_json_fail(500, 'Could not connect to the database. Please try again later.');
        }
        $conn->set_charset('utf8mb4');
    }
    return $conn;
}

// ---- 5. JSON response helpers -----------------------------------------
function ep_json_ok(array $data = []): void
{
    header('Content-Type: application/json');
    echo json_encode(array_merge(['ok' => true], $data));
    exit;
}

function ep_json_fail(int $httpCode, string $message): void
{
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

// ---- 6. CSRF / cross-site protection -----------------------------------
// This site has no build step, so forms are plain static .html — a
// server-rendered synchronizer token can't be embedded in them. Instead
// every state-changing endpoint in this project requires BOTH of:
//   (a) the request's Origin/Referer header to match this site's own
//       host (blocks a form hosted on another domain from posting here)
//   (b) for the two sensitive flows (login + sign-up) an additional
//       same-site, HttpOnly, SameSite=Lax cookie-based session check.
// This is a pragmatic baseline, not a full double-submit-token scheme.
// If the project ever adds a templating/build step (see
// assets/include/ gap in README_UI.md), switch to real per-request
// CSRF tokens rendered into each form.
function ep_verify_same_site_request(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $source = $origin !== '' ? $origin : $referer;

    if ($source === '' || $host === '') {
        ep_json_fail(403, 'Request validation failed.');
    }
    $sourceHost = parse_url($source, PHP_URL_HOST);
    if ($sourceHost === null || strcasecmp($sourceHost, parse_url('http://' . $host, PHP_URL_HOST)) !== 0) {
        ep_json_fail(403, 'Request validation failed.');
    }
}

// ---- 7. Honeypot spam trap ---------------------------------------------
// Every public form includes a hidden field named "website" (real users
// never see or fill it; CSS hides it, not `display:none` alone, since
// some bots skip display:none fields). A non-empty value means a bot.
// On detection we return a generic success so the bot doesn't learn
// it was caught, without writing anything to the database.
function ep_honeypot_tripped(): bool
{
    return trim((string)($_POST['website'] ?? '')) !== '';
}

// ---- 8. Simple DB-backed rate limiting ---------------------------------
// Counts recent attempts per (ip, action) using the rate_limits table
// (see database/schema.sql). Works without APCu/Redis so it runs on
// any shared PHP host; swap for Redis if traffic grows.
function ep_rate_limit(string $action, int $maxAttempts, int $windowSeconds): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $conn = ep_db();

    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS attempts FROM rate_limits WHERE ip_address = ? AND action = ? AND created_at > (NOW() - INTERVAL ? SECOND)'
    );
    $stmt->bind_param('ssi', $ip, $action, $windowSeconds);
    $stmt->execute();
    $count = (int)($stmt->get_result()->fetch_assoc()['attempts'] ?? 0);
    $stmt->close();

    if ($count >= $maxAttempts) {
        ep_json_fail(429, 'Too many attempts. Please wait a few minutes and try again.');
    }

    $log = $conn->prepare('INSERT INTO rate_limits (ip_address, action) VALUES (?, ?)');
    $log->bind_param('ss', $ip, $action);
    $log->execute();
    $log->close();
}

// ---- 9. Organizer portal: session user + role guard --------------------
// Added for /organizer/* (authoring.html, approvals.html, partner.html). Every organizer-*.php
// endpoint calls ep_require_role() first; it is the single authorization
// choke point referenced throughout database/README.md.
function ep_current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $conn = ep_db();
    $stmt = $conn->prepare(
        'SELECT id, first_name, last_name, email, contact, account_type, account_status,
                must_change_password, name_is_split
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->bind_param('i', $_SESSION['user_id']);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $user ?: null;
}

// Ends the request with 401 unless the session belongs to an active user
// of one of $roles (e.g. ['vendor'], ['admin'], ['vendor','admin']).
// Returns the user row so callers don't have to look it up twice.
function ep_require_role(array $roles): array
{
    $user = ep_current_user();
    if (!$user || $user['account_status'] !== 'active' || !in_array($user['account_type'], $roles, true)) {
        ep_json_fail(401, 'Please sign in to the organizer portal to continue.');
    }
    return $user;
}

// Vendor-only helper: fetches the caller's vendor_profiles row (always
// expected to exist once ep_require_role(['vendor']) has passed, since
// vendor-signup.php creates both rows in one transaction).
function ep_vendor_profile(int $userId): ?array
{
    $conn = ep_db();
    $stmt = $conn->prepare('SELECT * FROM vendor_profiles WHERE user_id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

// Partner-only helper: fetches the caller's (or any user's) partner_profiles
// row. A 'vendor' user can have one of these too — "every vendor is a
// partner" — so this is looked up by user_id, never by account_type.
function ep_partner_profile(int $userId): ?array
{
    $conn = ep_db();
    $stmt = $conn->prepare('SELECT * FROM partner_profiles WHERE user_id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

// Generates a unique 13-char partner_id: YY (2-digit year) + EP50T (5) +
// 6 random [A-Z0-9] chars, e.g. "26EP50TQ7M2X9". Retries on the (very
// unlikely) chance of a collision with an existing row.
function ep_generate_partner_id(mysqli $conn): string
{
    $yy = date('y');
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $suffix = '';
        for ($i = 0; $i < 6; $i++) {
            $suffix .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $candidate = $yy . 'EP50T' . $suffix;
        $stmt = $conn->prepare('SELECT 1 FROM partner_profiles WHERE partner_id = ? LIMIT 1');
        $stmt->bind_param('s', $candidate);
        $stmt->execute();
        $exists = $stmt->get_result()->num_rows > 0;
        $stmt->close();
        if (!$exists) return $candidate;
    }
    throw new RuntimeException('Could not allocate a unique partner ID.');
}

// ---- 10. Forgot-password: temp password + mail delivery ----------------
// Generates a random 12-character password from [a-zA-Z0-9] using
// random_int() (CSPRNG, not mt_rand) for every character. Used by
// forgot-password.php; never shown back to the caller — only emailed.
function ep_generate_temp_password(): string
{
    $alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $max = strlen($alphabet) - 1;
    $out = '';
    for ($i = 0; $i < 12; $i++) {
        $out .= $alphabet[random_int(0, $max)];
    }
    return $out;
}

// Best-effort mail delivery. This project has no SMTP/PHPMailer wired up
// (see auth.js's SSO stub comment for the same "future scope" pattern), so
// in development ep_config('EMBARKPEDIA_APP_ENV', ...) !== 'production'
// this logs the message instead of calling mail(), so the reset flow is
// still fully testable without a mail server. In production it calls
// PHP's mail(); if that returns false the caller still proceeds (the
// password has already been changed server-side) but the JSON response
// should say delivery could not be confirmed.
function ep_send_mail(string $to, string $subject, string $body): bool
{
    if (!EP_IS_PROD) {
        error_log("[EmbarkPedia dev mail] To: {$to}\nSubject: {$subject}\n{$body}\n");
        return true;
    }
    $headers = "From: Embark Pedia <no-reply@embarkpedia.com>\r\nContent-Type: text/plain; charset=utf-8";
    return @mail($to, $subject, $body, $headers);
}

// Reads a JSON request body into an assoc array (organizer-*.php endpoints
// use JSON bodies for nested arrays — inclusions/exclusions/itinerary days/
// stays — rather than flat form-encoding). Falls back to $_POST so the
// same endpoints still accept a plain form post for simple actions.
function ep_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return $_POST;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}
