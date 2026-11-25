<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$activeNav = 'reports';
$pageTitle = 'Reports & Analytics';
$pageSubtitle = 'Revenue, customer growth, data usage, and DBMS SQL views, joins & cursors';
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'run_cursor') {
    verify_csrf();
    $pdo->query('CALL sp_BatchProcessOverdueBills(@updated_cnt)');
    $updated = (int)$pdo->query('SELECT @updated_cnt')->fetchColumn();
    $msg = "Executed cursor procedure sp_BatchProcessOverdueBills: {$updated} overdue bills updated.";
}

$totalCustomers = (int)$pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
$totalDataUsage = (float)$pdo->query('SELECT COALESCE(SUM(data_used_gb), 0) FROM usage_records')->fetchColumn();
$totalRevenue = (float)$pdo->query('SELECT COALESCE(SUM(amount_paid), 0) FROM payments')->fetchColumn();
$openTickets = (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status != 'Resolved'")->fetchColumn();

$highValue = $pdo->query(
    'SELECT c.customer_id, c.full_name, c.city, COALESCE(SUM(p.amount_paid), 0) AS total_spent
     FROM customers c
     INNER JOIN payments p ON c.customer_id = p.customer_id
     GROUP BY c.customer_id, c.full_name, c.city
     HAVING total_spent > (SELECT COALESCE(AVG(amount), 0) FROM bills)
     ORDER BY total_spent DESC'
)->fetchAll();

$planUtil = $pdo->query(
    'SELECT p.plan_name, p.service_type, p.monthly_fee, COUNT(sub.subscription_id) AS subscription_count
     FROM subscriptions sub
     RIGHT JOIN plans p ON sub.plan_id = p.plan_id
     GROUP BY p.plan_id, p.plan_name, p.service_type, p.monthly_fee
     ORDER BY subscription_count DESC'
)->fetchAll();

$ledger = $pdo->query('SELECT * FROM v_customer_billing_overview ORDER BY total_billed DESC')->fetchAll();

require_once __DIR__ . '/../includes/layout_top.php';
?>
<?php if ($msg): ?><div class="alert alert-ok"><?= esc($msg) ?></div><?php endif; ?>

<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">Total Customers</div><div class="kpi-value"><?= $totalCustomers ?></div></div>
  <div class="kpi-card"><div class="kpi-label">Data Usage</div><div class="kpi-value"><?= number_format($totalDataUsage, 1) ?> GB</div></div>
  <div class="kpi-card"><div class="kpi-label">Total Revenue</div><div class="kpi-value"><?= format_inr($totalRevenue) ?></div></div>
  <div class="kpi-card"><div class="kpi-label">Open Tickets</div><div class="kpi-value"><?= $openTickets ?></div></div>
</div>

<div class="card card-pad" style="display:flex;justify-content:space-between;align-items:center;">
  <div>
    <strong>Overdue Bill Batch Cursor</strong>
    <div style="font-size:12px;color:#64748b;">Runs MySQL stored procedure <code>sp_BatchProcessOverdueBills</code> using a SQL CURSOR inside a transaction.</div>
  </div>
  <form method="post">
    <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
    <input type="hidden" name="action" value="run_cursor" />
    <button class="btn btn-primary" type="submit">Run Overdue Cursor</button>
  </form>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-header"><h2>High-Value Subscribers (Subquery + HAVING)</h2></div>
    <table>
      <thead><tr><th>Customer</th><th>City</th><th class="num">Total Paid</th></tr></thead>
      <tbody>
        <?php foreach ($highValue as $h): ?>
          <tr>
            <td><strong><?= esc($h['full_name']) ?></strong></td>
            <td><?= esc($h['city']) ?></td>
            <td class="num"><?= format_inr((float)$h['total_spent']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div class="card">
    <div class="card-header"><h2>Plan Utilization (RIGHT JOIN)</h2></div>
    <table>
      <thead><tr><th>Plan Name</th><th>Type</th><th class="num">Fee</th><th class="num">Subscriptions</th></tr></thead>
      <tbody>
        <?php foreach ($planUtil as $pu): ?>
          <tr>
            <td><strong><?= esc($pu['plan_name']) ?></strong></td>
            <td><?= esc($pu['service_type']) ?></td>
            <td class="num"><?= format_inr((float)$pu['monthly_fee']) ?></td>
            <td class="num"><?= (int)$pu['subscription_count'] ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<div class="card">
  <div class="card-header"><h2>Customer Billing Overview (SQL View: v_customer_billing_overview)</h2></div>
  <table>
    <thead><tr><th>Customer</th><th>Status</th><th class="num">Bills</th><th class="num">Billed</th><th class="num">Paid</th></tr></thead>
    <tbody>
      <?php foreach ($ledger as $row): ?>
        <tr>
          <td><strong><?= esc($row['full_name']) ?></strong></td>
          <td><span class="status-<?= esc($row['account_status']) ?>"><?= esc($row['account_status']) ?></span></td>
          <td class="num"><?= (int)$row['total_bills'] ?></td>
          <td class="num"><?= format_inr((float)$row['total_billed']) ?></td>
          <td class="num"><?= format_inr((float)$row['total_paid']) ?></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/layout_bottom.php'; ?>
