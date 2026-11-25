<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$activeNav = 'customers';
$pageTitle = 'Customer Management';
$pageSubtitle = 'Add, edit, delete, search, and inspect telecom subscriber accounts';
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'save') {
            $id = (int)($_POST['customer_id'] ?? 0);
            $name = trim($_POST['full_name'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $phone = trim($_POST['phone'] ?? '');
            $address = trim($_POST['address'] ?? '');
            $city = trim($_POST['city'] ?? 'Chennai');
            $status = $_POST['status'] ?? 'Active';
            if ($id > 0) {
                $stmt = $pdo->prepare('UPDATE customers SET full_name=?, email=?, phone=?, address=?, city=?, status=? WHERE customer_id=?');
                $stmt->execute([$name, $email, $phone, $address, $city, $status, $id]);
                $msg = 'Customer updated successfully.';
            } else {
                $stmt = $pdo->prepare('INSERT INTO customers (full_name, email, phone, address, city, status) VALUES (?, ?, ?, ?, ?, ?)');
                $stmt->execute([$name, $email, $phone, $address, $city, $status]);
                $msg = 'New customer created successfully.';
            }
        } elseif ($action === 'delete') {
            $id = (int)($_POST['customer_id'] ?? 0);
            $stmt = $pdo->prepare('DELETE FROM customers WHERE customer_id = ?');
            $stmt->execute([$id]);
            $msg = 'Customer deleted.';
        }
    } catch (PDOException $e) {
        $err = $e->getMessage();
    }
}

$search = trim($_GET['search'] ?? '');
$editCustomer = null;
if (!empty($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM customers WHERE customer_id = ?');
    $stmt->execute([(int)$_GET['edit']]);
    $editCustomer = $stmt->fetch();
}

$sql = 'SELECT * FROM customers WHERE 1=1';
$params = [];
if ($search !== '') {
    $sql .= ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR city LIKE ?)';
    $like = "%{$search}%";
    $params = [$like, $like, $like, $like];
}
$sql .= ' ORDER BY customer_id DESC';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$customers = $stmt->fetchAll();

require_once __DIR__ . '/../includes/layout_top.php';
?>
<?php if ($msg): ?><div class="alert alert-ok"><?= esc($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert alert-error"><?= esc($err) ?></div><?php endif; ?>

<div class="card card-pad">
  <h2 style="margin-top:0;font-size:15px;"><?= $editCustomer ? 'Edit Customer' : 'Add New Customer' ?></h2>
  <form method="post">
    <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
    <input type="hidden" name="action" value="save" />
    <input type="hidden" name="customer_id" value="<?= (int)($editCustomer['customer_id'] ?? 0) ?>" />
    <div class="form-grid">
      <div class="form-group">
        <label>Full Name</label>
        <input class="form-control" name="full_name" required value="<?= esc($editCustomer['full_name'] ?? '') ?>" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input class="form-control" type="email" name="email" required value="<?= esc($editCustomer['email'] ?? '') ?>" />
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input class="form-control" name="phone" required value="<?= esc($editCustomer['phone'] ?? '') ?>" />
      </div>
      <div class="form-group">
        <label>City</label>
        <input class="form-control" name="city" required value="<?= esc($editCustomer['city'] ?? 'Chennai') ?>" />
      </div>
      <div class="form-group">
        <label>Address</label>
        <input class="form-control" name="address" required value="<?= esc($editCustomer['address'] ?? '') ?>" />
      </div>
      <div class="form-group">
        <label>Account Status</label>
        <select class="form-control" name="status">
          <?php foreach (['Active', 'Inactive', 'Suspended'] as $st): ?>
            <option value="<?= $st ?>" <?= ($editCustomer['status'] ?? 'Active') === $st ? 'selected' : '' ?>><?= $st ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <button class="btn btn-primary" type="submit"><?= $editCustomer ? 'Update Customer' : 'Add Customer' ?></button>
    <?php if ($editCustomer): ?>
      <a class="btn btn-secondary" href="/telecom-management/customers/index.php">Cancel</a>
    <?php endif; ?>
  </form>
</div>

<div class="card">
  <div class="card-header">
    <h2>Customer Directory (<?= count($customers) ?>)</h2>
    <form method="get" style="display:flex;gap:8px;">
      <input class="form-control" style="width:240px;" type="text" name="search" placeholder="Search name, email, phone..." value="<?= esc($search) ?>" data-table-filter="1" />
      <button class="btn btn-secondary" type="submit">Search</button>
    </form>
  </div>
  <table>
    <thead>
      <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Status</th><th>Actions</th></tr>
    </thead>
    <tbody>
      <?php foreach ($customers as $c): ?>
        <tr>
          <td>CUST-<?= str_pad((string)$c['customer_id'], 4, '0', STR_PAD_LEFT) ?></td>
          <td><strong><?= esc($c['full_name']) ?></strong></td>
          <td><?= esc($c['email']) ?></td>
          <td><?= esc($c['phone']) ?></td>
          <td><?= esc($c['address']) ?>, <?= esc($c['city']) ?></td>
          <td><span class="status-<?= esc($c['status']) ?>"><?= esc($c['status']) ?></span></td>
          <td style="white-space:nowrap;">
            <a class="btn btn-secondary" href="?edit=<?= (int)$c['customer_id'] ?>">Edit</a>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= esc(csrf_token()) ?>" />
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="customer_id" value="<?= (int)$c['customer_id'] ?>" />
              <button class="btn btn-danger" type="submit">Delete</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/layout_bottom.php'; ?>
