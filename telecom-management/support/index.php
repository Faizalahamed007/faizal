<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$activeNav = 'support';
$pageTitle = 'Customer Support';
$pageSubtitle = 'Register complaints and update ticket workflow statuses';
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'create') {
            $custId = (int)$_POST['customer_id'];
            $subject = trim($_POST['subject'] ?? '');
            $desc = trim($_POST['issue_description'] ?? '');
            $priority = $_POST['priority'] ?? 'Medium';
            $stmt = $pdo->prepare(
                'INSERT INTO support_tickets (customer_id, subject, issue_description, priority, status) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$custId, $subject, $desc, $priority, 'Open']);
            $msg = 'Support ticket registered.';
        } elseif ($action === 'status') {
            $ticketId = (int)$_POST['ticket_id'];
            $status = $_POST['status'] ?? 'Open';
            $stmt = $pdo->prepare('UPDATE support_tickets SET status = ? WHERE ticket_id = ?');
            $stmt->execute([$status, $ticketId]);
            $msg = 'Ticket status updated.';
        }
    } catch (PDOException $e) {
        $err = $e->getMessage();
    }
}

$customers = $pdo->query('SELECT customer_id, full_name FROM customers ORDER BY full_name')->fetchAll();
$tickets = $pdo->query(
    'SELECT t.*, c.full_name AS customer_name
     FROM support_tickets t
     INNER JOIN customers c ON t.customer_id = c.customer_id
     ORDER BY t.ticket_id DESC'
)->fetchAll();

require_once __DIR__ . '/../includes/layout_top.php';
?>
<?php if ($msg): ?><div class="alert alert-ok"><?= esc($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-error"><?= esc($err) ?></div><?php endif; ?>

<div class="card card-pad">
  <h2 style="margin-top:0;font-size:15px;">Register Complaint</h2>
  <form method="post">
    <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
    <input type="hidden" name="action" value="create" />
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
        <label>Priority</label>
        <select class="form-control" name="priority">
          <option value="Low">Low</option>
          <option value="Medium" selected>Medium</option>
          <option value="High">High</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Issue Subject</label>
      <input class="form-control" name="subject" required />
    </div>
    <div class="form-group">
      <label>Issue Description</label>
      <textarea class="form-control" rows="2" name="issue_description" required></textarea>
    </div>
    <button class="btn btn-primary" type="submit">Register Complaint</button>
  </form>
</div>

<div class="card">
  <div class="card-header"><h2>Support Tickets (<?= count($tickets) ?>)</h2></div>
  <table>
    <thead><tr><th>Ticket ID</th><th>Customer</th><th>Issue</th><th>Created Date</th><th>Status</th><th>Update Status</th></tr></thead>
    <tbody>
      <?php foreach ($tickets as $t): ?>
        <tr>
          <td>TKT-<?= str_pad((string)$t['ticket_id'], 4, '0', STR_PAD_LEFT) ?></td>
          <td><strong><?= esc($t['customer_name']) ?></strong></td>
          <td><?= esc($t['subject']) ?></td>
          <td><?= esc($t['created_at']) ?></td>
          <td><span class="status-<?= esc($t['status']) ?>"><?= esc($t['status']) ?></span></td>
          <td>
            <form method="post" style="display:flex;gap:6px;">
              <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
              <input type="hidden" name="action" value="status" />
              <input type="hidden" name="ticket_id" value="<?= (int)$t['ticket_id'] ?>" />
              <select class="form-control" style="width:130px;padding:4px 6px;" name="status">
                <?php foreach (['Open', 'Pending', 'In Progress', 'Resolved'] as $st): ?>
                  <option value="<?= $st ?>" <?= $t['status'] === $st ? 'selected' : '' ?>><?= $st ?></option>
                <?php endforeach; ?>
              </select>
              <button class="btn btn-secondary" type="submit">Update</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/layout_bottom.php'; ?>
