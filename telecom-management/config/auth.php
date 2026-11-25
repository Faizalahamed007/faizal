<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function esc(?string $val): string {
    return htmlspecialchars((string)$val, ENT_QUOTES, 'UTF-8');
}

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(): void {
    $token = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        die('Invalid security token. Please refresh and try again.');
    }
}

function require_admin(): array {
    if (empty($_SESSION['admin'])) {
        header('Location: /telecom-management/index.php');
        exit;
    }
    return $_SESSION['admin'];
}

function format_inr(float $amount): string {
    return '₹' . number_format($amount, 0);
}
