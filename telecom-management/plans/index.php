<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$activeNav = 'plans';
$pageTitle = 'Plan Management';
$pageSubtitle = 'Configure telecom tariff plans, data quotas, call limits & validity';
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'save') {
            $id = (int)($_POST['plan_id'] ?? 0);
            $name = trim($_POST['plan_name'] ?? '');
            $type = $_POST['service_type'] ?? 'Mobile';
            $data = (float)($_POST['data_limit_gb'] ?? 0);
            $calls = (int)($_POST['call_limit_mins'] ?? 0);
            $validity = (int)($_POST['validity_days'] ?? 30);
            $fee = (float)($_POST['monthly_fee'] ?? 0);
            $desc = trim($_POST['description'] ?? '');
            $active = isset($_POST['is_active']) ? 1 : 0;

            if ($id > 0) {
                $stmt = $pdo->prepare(
                    'UPDATE plans SET plan_name=?, service_type=?, data_limit_gb=?, call_limit_mins=?, validity_days=?, monthly_fee=?, description=?, is_active=? WHERE plan_id=?'
                );
                $stmt->execute([$name, $type, $data, $calls, $validity, $fee, $desc, $active, $id]);
                $msg = 'Plan updated.';
            } else {
                $stmt = $pdo->prepare(
                    'INSERT INTO plans (plan_name, service_type, data_limit_gb, call_limit_mins, validity_days, monthly_fee, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute([$name, $type, $data, $calls, $validity, $fee, $desc, $active]);
                $msg = 'Plan created.';
            }
        } elseif ($action === 'delete') {
            $stmt = $pdo->prepare('DELETE FROM plans WHERE plan_id = ?');
            $stmt->execute([(int)$_POST['plan_id']]);
            $msg = 'Plan deleted.';
        }
    } catch (PDOException $e) {
        $err = $e->getMessage();
    }
}

$editPlan = null;
if (!empty($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM plans WHERE plan_id = ?');
    $stmt->execute([(int)$_GET['edit']]);
    $editPlan = $stmt->fetch();
}

$plans = $pdo->query('SELECT * FROM plans ORDER BY plan_id ASC')->fetchAll();

require_once __DIR__ . '/../includes/layout_top.php';
?>
<?php if ($msg): ?><div class="alert alert-ok"><?= esc($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-error"><?= esc($err) ?></div><?php endif; ?>

<div class="card card-pad">
  <h2 style="margin-top:0;font-size:15px;"><?= $editPlan ? 'Edit Plan' : 'Create Tariff Plan' ?></h2>
  <form method="post">
    <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
    <input type="hidden" name="action" value="save" />
    <input type="hidden" name="plan_id" value="<?= (int)($editPlan['plan_id'] ?? 0) ?>" />
    <div class="form-grid">
      <div class="form-group">
        <label>Plan Name</label>
        <input class="form-control" name="plan_name" required value="<?= esc($editPlan['plan_name'] ?? '') ?>" />
      </div>
      <div class="form-group">
        <label>Service Type</label>
        <select class="form-control" name="service_type">
          <?php foreach (['Mobile', 'Broadband', 'Landline'] as $t): ?>
            <option value="<?= $t ?>" <?= ($editPlan['service_type'] ?? 'Mobile') === $t ? 'selected' : '' ?>><?= $t ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="form-group">
        <label>Data Limit (GB)</label>
        <input class="form-control" type="number" step="0.5" min="0" name="data_limit_gb" required value="<?= esc((string)($editPlan['data_limit_gb'] ?? '100')) ?>" />
      </div>
      <div class="form-group">
        <label>Call Limit (Mins)</label>
        <input class="form-control" type="number" min="0" name="call_limit_mins" required value="<?= esc((string)($editPlan['call_limit_mins'] ?? '1000')) ?>" />
      </div>
      <div class="form-group">
        <label>Validity (Days)</label>
        <input class="form-control" type="number" min="1" name="validity_days" required value="<?= esc((string)($editPlan['validity_days'] ?? '30')) ?>" />
      </div>
      <div class="form-group">
        <label>Monthly Fee (₹)</label>
        <input class="form-control" type="number" step="0.01" min="0" name="monthly_fee" required value="<?= esc((string)($editPlan['monthly_fee'] ?? '499')) ?>" />
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <input class="form-control" name="description" value="<?= esc($editPlan['description'] ?? '') ?>" />
    </div>
    <div class="form-group">
      <label><input type="checkbox" name="is_active" <?= ($editPlan['is_active'] ?? 1) ? 'checked' : '' ?> /> Active Plan</label>
    </div>
    <button class="btn btn-primary" type="submit"><?= $editPlan ? 'Update Plan' : 'Save Plan' ?></button>
    <?php if ($editPlan): ?><a class="btn btn-secondary" href="/telecom-management/plans/index.php">Cancel</a><?php endif; ?>
  </form>
</div>

<div class="card">
  <div class="card-header"><h2>Configured Plans (<?= count($plans) ?>)</h2></div>
  <table>
    <thead><tr><th>Plan ID</th><th>Plan Name</th><th>Type</th><th class="num">Data (GB)</th><th class="num">Calls (Mins)</th><th class="num">Validity</th><th class="num">Monthly Fee</th><th>Actions</th></tr></thead>
    <tbody>
      <?php foreach ($plans as $p): ?>
        <tr>
          <td>PLN-<?= str_pad((string)$p['plan_id'], 3, '0', STR_PAD_LEFT) ?></td>
          <td><strong><?= esc($p['plan_name']) ?></strong></td>
          <td><?= esc($p['service_type']) ?></td>
          <td class="num"><?= (float)$p['data_limit_gb'] ?></td>
          <td class="num"><?= (int)$p['call_limit_mins'] ?></td>
          <td class="num"><?= (int)$p['validity_days'] ?> days</td>
          <td class="num"><?= format_inr((float)$p['monthly_fee']) ?></td>
          <td style="white-space:nowrap;">
            <a class="btn btn-secondary" href="?edit=<?= (int)$p['plan_id'] ?>">Edit</a>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="plan_id" value="<?= (int)$p['plan_id'] ?>" />
              <button class="btn btn-danger" type="submit">Delete</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/layout_bottom.php'; ?>
