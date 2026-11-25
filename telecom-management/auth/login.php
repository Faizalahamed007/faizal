<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

if (!empty($_SESSION['admin'])) {
    header('Location: /telecom-management/dashboard.php');
    exit;
}

$adminCount = (int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
$isSetup = ($adminCount === 0);
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($isSetup) {
        $fullName = trim($_POST['full_name'] ?? 'System Administrator');
        $email = trim($_POST['email'] ?? '');
        if (strlen($username) < 3 || strlen($password) < 6 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Provide a valid username (3+ chars), email, and password (6+ chars).';
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare(
                'INSERT INTO admins (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$username, $hash, $fullName, $email, 'System Administrator']);
            session_regenerate_id(true);
            $_SESSION['admin'] = [
                'admin_id' => (int)$pdo->lastInsertId(),
                'username' => $username,
                'full_name' => $fullName,
                'role' => 'System Administrator',
            ];
            header('Location: /telecom-management/dashboard.php');
            exit;
        }
    } else {
        $stmt = $pdo->prepare('SELECT admin_id, username, password_hash, full_name, role FROM admins WHERE username = ?');
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        if ($row && password_verify($password, $row['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin'] = [
                'admin_id' => (int)$row['admin_id'],
                'username' => $row['username'],
                'full_name' => $row['full_name'],
                'role' => $row['role'],
            ];
            header('Location: /telecom-management/dashboard.php');
            exit;
        } else {
            $error = 'Invalid username or password.';
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login · CONNECT TELECOM PORTAL</title>
  <link rel="stylesheet" href="/telecom-management/assets/css/style.css" />
</head>
<body>
<div class="login-shell">
  <div class="login-card">
    <div class="login-head">
      <div style="font-weight:700;font-size:17px;">CONNECT TELECOM PORTAL</div>
      <div style="font-size:12px;color:#cbd5e1;margin-top:3px;">Telecommunications Management System</div>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 6px;font-size:18px;color:#0f213a;">
        <?= $isSetup ? 'Initial Administrator Setup' : 'Administrator Sign In' ?>
      </h2>
      <p style="margin:0 0 18px;font-size:13px;color:#64748b;">
        <?= $isSetup ? 'Create the primary administrator account in MySQL to begin.' : 'Sign in with your administrator credentials.' ?>
      </p>

      <?php if ($error): ?>
        <div class="alert alert-error"><?= esc($error) ?></div>
      <?php endif; ?>

      <form method="post" action="/telecom-management/auth/login.php">
        <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
        <div class="form-group">
          <label for="username">Username</label>
          <input id="username" class="form-control" type="text" name="username" required />
        </div>
        <?php if ($isSetup): ?>
          <div class="form-group">
            <label for="full_name">Full Name</label>
            <input id="full_name" class="form-control" type="text" name="full_name" required />
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" class="form-control" type="email" name="email" required />
          </div>
        <?php endif; ?>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" class="form-control" type="password" name="password" required />
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px;" type="submit">
          <?= $isSetup ? 'Create Admin & Continue' : 'Sign In' ?>
        </button>
      </form>
    </div>
  </div>
</div>
</body>
</html>
