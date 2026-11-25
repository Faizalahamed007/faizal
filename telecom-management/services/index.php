<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$activeNav = 'services';
$pageTitle = 'Service Management';
$pageSubtitle = 'Manage Mobile, Broadband, and Landline connections';
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'save') {
            $id = (int)($_POST['service_id'] ?? 0);
            $customerId = (int)($_POST['customer_id'] ?? 0);
            $type = $_POST['service_type'] ?? 'Mobile';
            $identifier = trim($_POST['service_identifier'] ?? '');
            $area = trim($_POST['service_area'] ?? '');
            $status = $_POST['status'] ?? 'Active';
            if ($id > 0) {
                $stmt = $pdo->prepare('UPDATE services SET customer_id=?, service_type=?, service_identifier=?, service_area=?, status=? WHERE service_id=?');
                $stmt->execute([$customerId, $type, $identifier, $area, $status, $id]);
                $msg = 'Service updated.';
            } else {
                $stmt = $pdo->prepare('INSERT INTO services (customer_id, service_type, service_identifier, service_area, status) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$customerId, $type, $identifier, $area, $status]);
                $msg = 'Service provisioned.';
            }
        } elseif ($action === 'delete') {
            $stmt = $pdo->prepare('DELETE FROM services WHERE service_id = ?');
            $stmt->execute([(int)$_POST['service_id']]);
            $msg = 'Service deleted.';
        }
    } catch (PDOException $e) {
        $err = $e->getMessage();
    }
}

$editService = null;
if (!empty($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM services WHERE service_id = ?');
    $stmt->execute([(int)$_GET['edit']]);
    $editService = $stmt->fetch();
}

$customers = $pdo->query('SELECT customer_id, full_name FROM customers ORDER BY full_name')->fetchAll();
$services = $pdo->query(
    'SELECT s.*, c.full_name AS customer_name
     FROM services s
     INNER JOIN customers c ON s.customer_id = c.customer_id
     ORDER BY s.service_id DESC'
)->fetchAll();

require_once __DIR__ . '/../includes/layout_top.php';
?>
<?php if ($msg): ?><div class="alert alert-ok"><?= esc($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-error"><?= esc($err) ?></div><?php endif; ?>

<div class="card card-pad">
  <h2 style="margin-top:0;font-size:15px;"><?= $editService ? 'Edit Service' : 'Provision Service' ?></h2>
  <form method="post">
    <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
    <input type="hidden" name="action" value="save" />
    <input type="hidden" name="service_id" value="<?= (int)($editService['service_id'] ?? 0) ?>" />
    <div class="form-grid">
      <div class="form-group">
        <label>Customer</label>
        <select class="form-control" name="customer_id" required>
          <?php foreach ($customers as $c): ?>
            <option value="<?= (int)$c['customer_id'] ?>" <?= (int)($editService['customer_id'] ?? 0) === (int)$c['customer_id'] ? 'selected' : '' ?>>
              <?= esc($c['full_name']) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group">
        <label>Service Type</label>
        <select class="form-control" name="service_type">
          <?php foreach (['Mobile', 'Broadband', 'Landline'] as $t): ?>
            <option value="<?= $t ?>" <?= ($editService['service_type'] ?? 'Mobile') === $t ? 'selected' : '' ?>><?= $t ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group">
        <label>Service Identifier</label>
        <input class="form-control" name="service_identifier" required placeholder="e.g. MOB-98400-11223" value="<?= esc($editService['service_identifier'] ?? '') ?>" />
      </div>
      <div class="form-group">
        <label>Service Area</label>
        <input class="form-control" name="service_area" required placeholder="e.g. Chennai South" value="<?= esc($editService['service_area'] ?? '') ?>" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-control" name="status">
          <?php foreach (['Active', 'Inactive', 'Suspended'] as $st): ?>
            <option value="<?= $st ?>" <?= ($editService['status'] ?? 'Active') === $st ? 'selected' : '' ?>><?= $st ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <button class="btn btn-primary" type="submit"><?= $editService ? 'Update Service' : 'Add Service' ?></button>
    <?php if ($editService): ?><a class="btn btn-secondary" href="/telecom-management/services/index.php">Cancel</a><?php endif; ?>
  </form>
</div>

<div class="card">
  <div class="card-header"><h2>Provisioned Services (<?= count($services) ?>)</h2></div>
  <table>
    <thead><tr><th>Service ID</th><th>Type</th><th>Identifier</th><th>Customer</th><th>Area</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      <?php foreach ($services as $s): ?>
        <tr>
          <td>SVC-<?= str_pad((string)$s['service_id'], 4, '0', STR_PAD_LEFT) ?></td>
          <td><strong><?= esc($s['service_type']) ?></strong></td>
          <td><?= esc($s['service_identifier']) ?></td>
          <td><?= esc($s['customer_name']) ?></td>
          <td><?= esc($s['service_area']) ?></td>
          <td><span class="status-<?= esc($s['status']) ?>"><?= esc($s['status']) ?></span></td>
          <td style="white-space:nowrap;">
            <a class="btn btn-secondary" href="?edit=<?= (int)$s['service_id'] ?>">Edit</a>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="service_id" value="<?= (int)$s['service_id'] ?>" />
              <button class="btn btn-danger" type="submit">Delete</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/layout_bottom.php'; ?>
