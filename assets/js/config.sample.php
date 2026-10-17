<?php
/**
 * config.sample.php
 * ------------------------------------------------------------------
 * Template for assets/js/config.php (NOT committed — see .gitignore).
 * Copy this file to config.php in the same directory and fill in
 * real values, OR set the equivalent environment variables and skip
 * config.php entirely. Every *.php endpoint (db.php, connect.php,
 * signup.php, login.php, logout.php, subscribe.php) reads credentials
 * the same way: environment variables first, config.php constants
 * second. See db.php for the loader.
 *
 *   cp assets/js/config.sample.php assets/js/config.php
 *
 * Environment variable names (preferred — works on most hosts without
 * editing any PHP file):
 *   EMBARKPEDIA_DB_HOST
 *   EMBARKPEDIA_DB_NAME
 *   EMBARKPEDIA_DB_USER
 *   EMBARKPEDIA_DB_PASS
 *   EMBARKPEDIA_PASSWORD_PEPPER   (32+ random bytes, hex or base64)
 *   EMBARKPEDIA_APP_ENV           ("production" or "development")
 * ------------------------------------------------------------------
 */

define('EMBARKPEDIA_DB_HOST', 'localhost');
define('EMBARKPEDIA_DB_NAME', 'your_database_name');
define('EMBARKPEDIA_DB_USER', 'your_database_user');
define('EMBARKPEDIA_DB_PASS', 'your_database_password');

// Secret "pepper" appended to every password before hashing (in addition
// to bcrypt's own per-password salt). Generate with:
//   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
// Changing this invalidates every stored password hash, so generate it
// once per environment and keep it out of source control.
define('EMBARKPEDIA_PASSWORD_PEPPER', 'change-me-to-a-random-64-char-hex-string');

// "production" enforces secure, HTTPS-only session cookies and hides
// internal error detail from responses. Use "development" only on
// localhost over plain HTTP.
define('EMBARKPEDIA_APP_ENV', 'development');
