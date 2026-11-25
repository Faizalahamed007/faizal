<?php
$admin = require_admin();
$activeNav = $activeNav ?? 'dashboard';
$pageTitle = $pageTitle ?? 'Dashboard';
$pageSubtitle = $pageSubtitle ?? 'CONNECT TELECOM PORTAL';

$navItems = [
    'dashboard' => ['label' => 'Dashboard', 'href' => '/telecom-management/dashboard.php'],
    'customers' => ['label' => 'Customers', 'href' => '/telecom-management/customers/index.php'],
    'services' => ['label' => 'Services', 'href' => '/telecom-management/services/index.php'],
    'plans' => ['label' => 'Plans', 'href' => '/telecom-management/plans/index.php'],
    'subscriptions' => ['label' => 'Subscriptions', 'href' => '/telecom-management/subscriptions/index.php'],
    'billing' => ['label' => 'Billing', 'href' => '/telecom-management/billing/index.php'],
    'support' => ['label' => 'Support', 'href' => '/telecom-management/support/index.php'],
    'reports' => ['label' => 'Reports', 'href' => '/telecom-management/reports/index.php'],
];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= esc($pageTitle) ?> · CONNECT TELECOM PORTAL</title>
  <link rel="stylesheet" href="/telecom-management/assets/css/style.css" />
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-title">CONNECT</div>
      <div class="brand-sub">TELECOM PORTAL</div>
    </div>
    <nav class="nav-list">
      <?php foreach ($navItems as $id => $item): ?>
        <a class="nav-link <?= $activeNav === $id ? 'active' : '' ?>" href="<?= esc($item['href']) ?>">
          <span><?= esc($item['label']) ?></span>
        </a>
      <?php endforeach; ?>
    </nav>
    <div class="nav-footer">
      <a class="nav-link" href="/telecom-management/auth/logout.php">Logout</a>
    </div>
  </aside>
  <div class="main-wrap">
    <header class="topbar">
      <div>
        <h1><?= esc($pageTitle) ?></h1>
        <p><?= esc($pageSubtitle) ?></p>
      </div>
      <div style="font-size:12px;text-align:right;">
        <strong><?= esc($admin['full_name']) ?></strong><br />
        <span style="color:#64748b;"><?= esc($admin['role']) ?></span>
      </div>
    </header>
    <main class="content">
