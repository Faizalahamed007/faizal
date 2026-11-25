<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$activeNav = 'billing';
$pageTitle = 'Billing & Payments';
$pageSubtitle = 'Generate invoices and record UPI, Card & Cash payments via stored procedures and triggers';
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'generate') {
            $custId = (int)$_POST['customer_id'];
            $period = trim($_POST['billing_period']);
            $amount = (float)$_POST['amount'];
            $due = $_POST['due_date'];
            $stmt = $pdo->prepare('CALL sp_GenerateMonthlyBill(?, NULL, ?, ?, ?)');
            $stmt->execute([$custId, $period, $amount, $due]);
            $msg = 'Bill generated inside SQL transaction.';
        } elseif ($action === 'pay') {
            $billId = (int)$_POST['bill_id'];
            $amountPaid = (float)$_POST['amount_paid'];
            $mode = $_POST['payment_mode'] ?? 'UPI';
            $notes = trim($_POST['notes'] ?? "Paid via {$mode}");
            $stmt = $pdo->prepare('CALL sp_RecordPaymentAndUpdateBill(?, ?, ?, ?)');
            $stmt->execute([$billId, $amountPaid, $mode, $notes]);
            $msg = 'Payment recorded and bill status updated automatically via trigger.';
        }
    } catch (PDOException $e) {
        $err = $e->getMessage();
    }
}

$customers = $pdo->query('SELECT customer_id, full_name FROM customers ORDER BY full_name')->fetchAll();
$bills = $pdo->query(
    'SELECT b.*, c.full_name AS customer_name, MAX(p.payment_mode) AS payment_mode
     FROM bills b
     INNER JOIN customers c ON b.customer_id = c.customer_id
     LEFT JOIN payments p ON b.bill_id = p.bill_id
     GROUP BY b.bill_id
     ORDER BY b.bill_id DESC'
)->fetchAll();

require_once __DIR__ . '/../includes/layout_top.php';
?>
<?php if ($msg): ?><div class="alert alert-ok"><?= esc($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-error"><?= esc($err) ?></div><?php endif; ?>

<div class="card card-pad">
  <h2 style="margin-top:0;font-size:15px;">Generate Customer Bill</h2>
  <form method="post">
    <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
    <input type="hidden" name="action" value="generate" />
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
        <label>Billing Period (YYYY-MM)</label>
        <input class="form-control" name="billing_period" value="<?= date('Y-m') ?>" required />
      </div>
      <div class="form-group">
        <label>Amount (₹)</label>
        <input class="form-control" type="number" step="0.01" min="1" name="amount" value="599" required />
      </div>
      <div class="form-group">
        <label>Due Date</label>
        <input class="form-control" type="date" name="due_date" value="<?= date('Y-m-d', strtotime('+14 days')) ?>" required />
      </div>
    </div>
    <button class="btn btn-primary" type="submit">Generate Bill</button>
  </form>
</div>

<div class="card">
  <div class="card-header"><h2>Customer Bills (<?= count($bills) ?>)</h2></div>
  <table>
    <thead><tr><th>Bill Number</th><th>Customer</th><th>Period</th><th class="num">Amount</th><th>Mode</th><th>Status</th><th>Due Date</th><th>Record Payment</th></tr></thead>
    <tbody>
      <?php foreach ($bills as $b): ?>
        <tr>
          <td><strong><?= esc($b['bill_number']) ?></strong></td>
          <td><?= esc($b['customer_name']) ?></td>
          <td><?= esc($b['billing_period']) ?></td>
          <td class="num"><?= format_inr((float)$b['amount']) ?></td>
          <td><?= esc($b['payment_mode'] ?? '—') ?></td>
          <td><span class="status-<?= esc($b['status']) ?>"><?= esc($b['status']) ?></span></td>
          <td><?= esc($b['due_date']) ?></td>
          <td>
            <?php if ($b['status'] !== 'Paid'): ?>
              <form method="post" style="display:flex;gap:6px;align-items:center;">
                <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
                <input type="hidden" name="action" value="pay" />
                <input type="hidden" name="bill_id" value="<?= (int)$b['bill_id'] ?>" />
                <input type="hidden" name="amount_paid" value="<?= esc((string)$b['amount']) ?>" />
                <select class="form-control" style="width:90px;padding:4px 6px;" name="payment_mode">
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                </select>
                <button class="btn btn-primary" type="submit">Pay</button>
              </form>
            <?php else: ?>
              <span style="color:#64748b;font-size:12px;">Settled</span>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/layout_bottom.php'; ?>
