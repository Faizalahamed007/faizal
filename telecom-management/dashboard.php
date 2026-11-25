<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/auth.php';

$activeNav = 'dashboard';
$pageTitle = 'Dashboard';
$pageSubtitle = 'Operational overview across subscribers, plans, billing & support';

$totalCustomers = (int)$pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
$activePlans = (int)$pdo->query('SELECT COUNT(*) FROM plans WHERE is_active = 1')->fetchColumn();
$totalBills = (int)$pdo->query('SELECT COUNT(*) FROM bills')->fetchColumn();
$openTickets = (int)$pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status != 'Resolved'")->fetchColumn();

$recentCustomers = $pdo->query('SELECT customer_id, full_name, phone, city, status FROM customers ORDER BY customer_id DESC LIMIT 5')->fetchAll();
$recentSubs = $pdo->query('SELECT subscription_id, customer_name, plan_name, monthly_fee, expiry_date, status FROM v_active_subscriptions_summary ORDER BY subscription_id DESC LIMIT 5')->fetchAll();
$recentPayments = $pdo->query(
    'SELECT p.payment_id, b.bill_number, c.full_name AS customer_name, p.amount_paid, p.payment_mode, p.payment_date
     FROM payments p
     INNER JOIN bills b ON p.bill_id = b.bill_id
     INNER JOIN customers c ON p.customer_id = c.customer_id
     ORDER BY p.payment_id DESC LIMIT 5'
)->fetchAll();
$monthlyRevenue = $pdo->query('SELECT * FROM v_monthly_revenue_stats')->fetchAll();
$serviceStats = $pdo->query('SELECT * FROM v_service_distribution')->fetchAll();

require_once __DIR__ . '/includes/layout_top.php';
?>
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Total Customers</div>
    <div class="kpi-value"><?= $totalCustomers ?></div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Active Plans</div>
    <div class="kpi-value"><?= $activePlans ?></div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Total Bills</div>
    <div class="kpi-value"><?= $totalBills ?></div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Open Tickets</div>
    <div class="kpi-value"><?= $openTickets ?></div>
  </div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-header"><h2>Monthly Revenue (SQL View)</h2></div>
    <table>
      <thead><tr><th>Month</th><th class="num">Payments</th><th class="num">Revenue</th></tr></thead>
      <tbody>
        <?php foreach ($monthlyRevenue as $mr): ?>
          <tr>
            <td><?= esc($mr['month_key']) ?></td>
            <td class="num"><?= (int)$mr['payment_count'] ?></td>
            <td class="num"><?= format_inr((float)$mr['total_revenue']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div class="card">
    <div class="card-header"><h2>Service Statistics (SQL View)</h2></div>
    <table>
      <thead><tr><th>Service Type</th><th class="num">Active Lines</th><th class="num">Total Lines</th></tr></thead>
      <tbody>
        <?php foreach ($serviceStats as $ss): ?>
          <tr>
            <td><strong><?= esc($ss['service_type']) ?></strong></td>
            <td class="num"><?= (int)$ss['active_services'] ?></td>
            <td class="num"><?= (int)$ss['total_services'] ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<div class="card">
  <div class="card-header"><h2>Recent Customers</h2><a class="btn btn-secondary" href="/telecom-management/customers/index.php">Manage Customers</a></div>
  <table>
    <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>City</th><th>Status</th></tr></thead>
    <tbody>
      <?php foreach ($recentCustomers as $c): ?>
        <tr>
          <td>CUST-<?= str_pad((string)$c['customer_id'], 4, '0', STR_PAD_LEFT) ?></td>
          <td><strong><?= esc($c['full_name']) ?></strong></td>
          <td><?= esc($c['phone']) ?></td>
          <td><?= esc($c['city']) ?></td>
          <td><span class="status-<?= esc($c['status']) ?>"><?= esc($c['status']) ?></span></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-header"><h2>Recent Subscriptions</h2></div>
    <table>
      <thead><tr><th>Subscriber</th><th>Plan</th><th>Expiry</th><th>Status</th></tr></thead>
      <tbody>
        <?php foreach ($recentSubs as $s): ?>
          <tr>
            <td><?= esc($s['customer_name']) ?></td>
            <td><?= esc($s['plan_name']) ?></td>
            <td><?= esc($s['expiry_date']) ?></td>
            <td><span class="status-<?= esc($s['status']) ?>"><?= esc($s['status']) ?></span></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="card">
    <div class="card-header"><h2>Recent Payments</h2></div>
    <table>
      <thead><tr><th>Bill #</th><th>Customer</th><th>Mode</th><th class="num">Amount</th></tr></thead>
      <tbody>
        <?php foreach ($recentPayments as $p): ?>
          <tr>
            <td><?= esc($p['bill_number']) ?></td>
            <td><?= esc($p['customer_name']) ?></td>
            <td><?= esc($p['payment_mode']) ?></td>
            <td class="num"><?= format_inr((float)$p['amount_paid']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php require_once __DIR__ . '/includes/layout_bottom.php'; ?>
