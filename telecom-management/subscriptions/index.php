<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$activeNav = 'subscriptions';
$pageTitle = 'Subscription Management';
$pageSubtitle = 'Assign telecom plans to customers and process renewals using stored procedures';
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'assign') {
            $custId = (int)$_POST['customer_id'];
            $planId = (int)$_POST['plan_id'];
            $start = $_POST['start_date'] ?: date('Y-m-d');
            $stmtPlan = $pdo->prepare('SELECT validity_days FROM plans WHERE plan_id = ?');
            $stmtPlan->execute([$planId]);
            $validity = (int)$stmtPlan->fetchColumn();
            $expiry = date('Y-m-d', strtotime("{$start} +{$validity} days"));
            $stmt = $pdo->prepare(
                'INSERT INTO subscriptions (customer_id, plan_id, start_date, expiry_date, status) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$custId, $planId, $start, $expiry, 'Active']);
            $msg = 'Plan assigned successfully.';
        } elseif ($action === 'renew') {
            $subId = (int)$_POST['subscription_id'];
            $genBill = isset($_POST['generate_bill']) ? 1 : 0;
            $stmt = $pdo->prepare('CALL sp_RenewSubscription(?, ?)');
            $stmt->execute([$subId, $genBill]);
            $msg = 'Subscription renewed atomically via stored procedure.';
        }
    } catch (PDOException $e) {
        $err = $e->getMessage();
    }
}

$customers = $pdo->query('SELECT customer_id, full_name FROM customers ORDER BY full_name')->fetchAll();
$plans = $pdo->query('SELECT plan_id, plan_name, service_type, monthly_fee FROM plans WHERE is_active = 1')->fetchAll();
$subs = $pdo->query(
    'SELECT s.*, c.full_name AS customer_name, p.plan_name, p.monthly_fee
     FROM subscriptions s
     INNER JOIN customers c ON s.customer_id = c.customer_id
     INNER JOIN plans p ON s.plan_id = p.plan_id
     ORDER BY s.subscription_id DESC'
)->fetchAll();

require_once __DIR__ . '/../includes/layout_top.php';
?>
<?php if ($msg): ?><div class="alert alert-ok"><?= esc($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-error"><?= esc($err) ?></div><?php endif; ?>

<div class="card card-pad">
  <h2 style="margin-top:0;font-size:15px;">Assign New Subscription</h2>
  <form method="post">
    <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
    <input type="hidden" name="action" value="assign" />
    <div class="form-grid">
      <div class="form-group">
        <label>Customer</label>
        <select class="form-control" name="customer_id" required>
          <?php foreach ($customers as $c): ?>
            <option value="<?= (int)$c['customer_id'] ?>"><?= esc($c['full_name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group">
        <label>Plan</label>
        <select class="form-control" name="plan_id" required>
          <?php foreach ($plans as $p): ?>
            <option value="<?= (int)$p['plan_id'] ?>"><?= esc($p['plan_name']) ?> (<?= format_inr((float)$p['monthly_fee']) ?>)</option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group">
        <label>Start Date</label>
        <input class="form-control" type="date" name="start_date" value="<?= date('Y-m-d') ?>" required />
      </div>
    </div>
    <button class="btn btn-primary" type="submit">Assign Plan</button>
  </form>
</div>

<div class="card">
  <div class="card-header"><h2>Subscriptions (<?= count($subs) ?>)</h2></div>
  <table>
    <thead><tr><th>Sub ID</th><th>Customer Name</th><th>Plan Name</th><th>Start Date</th><th>Expiry Date</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>
      <?php foreach ($subs as $s): ?>
        <tr>
          <td>SUB-<?= str_pad((string)$s['subscription_id'], 4, '0', STR_PAD_LEFT) ?></td>
          <td><strong><?= esc($s['customer_name']) ?></strong></td>
          <td><?= esc($s['plan_name']) ?></td>
          <td><?= esc($s['start_date']) ?></td>
          <td><?= esc($s['expiry_date']) ?></td>
          <td><span class="status-<?= esc($s['status']) ?>"><?= esc($s['status']) ?></span></td>
          <td>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
              <input type="hidden" name="action" value="renew" />
              <input type="hidden" name="subscription_id" value="<?= (int)$s['subscription_id'] ?>" />
              <input type="hidden" name="generate_bill" value="1" />
              <button class="btn btn-secondary" type="submit">Renew & Bill</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/layout_bottom.php'; ?>
