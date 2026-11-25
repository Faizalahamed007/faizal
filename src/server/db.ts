import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.TELECOM_DB_PATH
  ? path.resolve(process.env.TELECOM_DB_PATH)
  : path.resolve(process.cwd(), 'telecom_management.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'System Administrator',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Chennai',
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
      created_at TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_name TEXT NOT NULL UNIQUE,
      service_type TEXT NOT NULL CHECK (service_type IN ('Mobile', 'Broadband', 'Landline')),
      data_limit_gb REAL NOT NULL DEFAULT 0,
      call_limit_mins INTEGER NOT NULL DEFAULT 0,
      validity_days INTEGER NOT NULL DEFAULT 30,
      monthly_fee REAL NOT NULL CHECK (monthly_fee >= 0),
      description TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      service_id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      service_type TEXT NOT NULL CHECK (service_type IN ('Mobile', 'Broadband', 'Landline')),
      service_identifier TEXT NOT NULL UNIQUE,
      service_area TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
      activated_at TEXT NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      service_id INTEGER,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Cancelled', 'Renewed')),
      created_at TEXT NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(plan_id) ON DELETE RESTRICT,
      FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      record_month TEXT NOT NULL,
      data_used_gb REAL NOT NULL DEFAULT 0,
      voice_used_mins INTEGER NOT NULL DEFAULT 0,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      subscription_id INTEGER,
      billing_period TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Overdue', 'Partial')),
      generated_at TEXT NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount_paid REAL NOT NULL CHECK (amount_paid > 0),
      payment_mode TEXT NOT NULL CHECK (payment_mode IN ('UPI', 'Card', 'Cash')),
      transaction_ref TEXT NOT NULL UNIQUE,
      payment_date TEXT NOT NULL DEFAULT (date('now')),
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      service_id INTEGER,
      subject TEXT NOT NULL,
      issue_description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
      status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Pending', 'In Progress', 'Resolved')),
      created_at TEXT NOT NULL DEFAULT (date('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE SET NULL
    );

    -- SQL Views for DBMS Reporting & Analytics
    CREATE VIEW IF NOT EXISTS v_active_subscriptions_summary AS
    SELECT
      s.subscription_id,
      c.customer_id,
      c.full_name AS customer_name,
      c.phone,
      p.plan_name,
      p.service_type,
      p.monthly_fee,
      s.start_date,
      s.expiry_date,
      s.status
    FROM subscriptions s
    INNER JOIN customers c ON s.customer_id = c.customer_id
    INNER JOIN plans p ON s.plan_id = p.plan_id;

    CREATE VIEW IF NOT EXISTS v_customer_billing_overview AS
    SELECT
      c.customer_id,
      c.full_name,
      c.email,
      c.status AS account_status,
      COUNT(DISTINCT b.bill_id) AS total_bills,
      COALESCE(SUM(b.amount), 0) AS total_billed,
      COALESCE((
        SELECT SUM(pay.amount_paid)
        FROM payments pay
        WHERE pay.customer_id = c.customer_id
      ), 0) AS total_paid
    FROM customers c
    LEFT JOIN bills b ON c.customer_id = b.customer_id
    GROUP BY c.customer_id;

    CREATE VIEW IF NOT EXISTS v_monthly_revenue_stats AS
    SELECT
      substr(payment_date, 1, 7) AS month_key,
      COUNT(*) AS payment_count,
      SUM(amount_paid) AS total_revenue
    FROM payments
    GROUP BY substr(payment_date, 1, 7)
    ORDER BY month_key ASC;

    CREATE VIEW IF NOT EXISTS v_service_distribution AS
    SELECT
      service_type,
      COUNT(*) AS total_services,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_services
    FROM services
    GROUP BY service_type;

    -- SQL Triggers
    CREATE TRIGGER IF NOT EXISTS trg_after_payment_insert
    AFTER INSERT ON payments
    BEGIN
      UPDATE bills
      SET status = CASE
        WHEN (SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE bill_id = NEW.bill_id) >= amount THEN 'Paid'
        ELSE 'Partial'
      END
      WHERE bill_id = NEW.bill_id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_after_ticket_update
    AFTER UPDATE OF status ON support_tickets
    BEGIN
      UPDATE support_tickets
      SET updated_at = datetime('now')
      WHERE ticket_id = NEW.ticket_id;
    END;
  `);

  seedSampleDataIfEmpty();
}

function seedSampleDataIfEmpty(): void {
  const row = db.prepare('SELECT COUNT(*) AS count FROM customers').get() as { count: number };
  if (row.count > 0) return;

  const seedTx = db.transaction(() => {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (full_name, email, phone, address, city, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const customers = [
      ['Aarav Sundaram', 'aarav.sundaram@example.com', '+91-98401-22104', '14 Cathedral Road, Gopalapuram', 'Chennai', 'Active', '2026-06-12'],
      ['Priya Venkataraman', 'priya.venkat@example.com', '+91-98402-33819', '88 Indiranagar 100ft Road', 'Bengaluru', 'Active', '2026-06-25'],
      ['Karthik Narayanan', 'karthik.n@example.com', '+91-98840-77412', '22 Anna Nagar West Extension', 'Chennai', 'Active', '2026-07-08'],
      ['Meera Krishnan', 'meera.krishnan@example.com', '+91-99401-55210', '51 Besant Nagar 4th Avenue', 'Chennai', 'Active', '2026-07-19'],
      ['Rohan Deshmukh', 'rohan.deshmukh@example.com', '+91-98201-66423', '302 Koregaon Park Lane 6', 'Pune', 'Active', '2026-08-04'],
      ['Ananya Subramanian', 'ananya.sub@example.com', '+91-97890-11843', '76 Race Course Road', 'Coimbatore', 'Active', '2026-08-22'],
      ['Vikramaditya Rao', 'vikram.rao@example.com', '+91-98490-44561', '19 Jubilee Hills Road 36', 'Hyderabad', 'Suspended', '2026-09-10'],
      ['Divya Menon', 'divya.menon@example.com', '+91-98470-99102', '45 Marine Drive Promenade', 'Kochi', 'Active', '2026-09-28'],
      ['Siddharth Iyer', 'siddharth.iyer@example.com', '+91-98111-33490', '128 Bandra West Linking Rd', 'Mumbai', 'Active', '2026-10-14'],
      ['Nandini Balasubramanian', 'nandini.b@example.com', '+91-94440-88231', '9 Mylapore Luz Church Road', 'Chennai', 'Inactive', '2026-11-02'],
    ];
    for (const c of customers) insertCustomer.run(...c);

    const insertPlan = db.prepare(`
      INSERT INTO plans (plan_name, service_type, data_limit_gb, call_limit_mins, validity_days, monthly_fee, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const plans = [
      ['Connect 5G Unlimited', 'Mobile', 150, 3000, 30, 599, 'High-speed 5G mobile voice and data pack with national roaming.', 1],
      ['Starter 4G Value', 'Mobile', 45, 1000, 28, 299, 'Essential daily mobile data and voice calling plan.', 1],
      ['FiberMax 300 Mbps', 'Broadband', 1500, 0, 30, 999, 'Symmetrical 300 Mbps fiber broadband for homes and remote offices.', 1],
      ['Business GigaLine 1 Gbps', 'Broadband', 5000, 1500, 30, 2499, 'Enterprise-grade 1 Gbps leased fiber with static IP allocation.', 1],
      ['Landline Voice Plus', 'Landline', 0, 2500, 30, 349, 'Crystal-clear PSTN and VoIP landline connectivity for offices.', 1],
      ['Enterprise Triple Play', 'Broadband', 3000, 5000, 30, 1799, 'Bundled high-speed fiber with unlimited landline trunk calling.', 1],
    ];
    for (const p of plans) insertPlan.run(...p);

    const insertService = db.prepare(`
      INSERT INTO services (customer_id, service_type, service_identifier, service_area, status, activated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const services = [
      [1, 'Mobile', 'MOB-98401-22104', 'Chennai South', 'Active', '2026-06-12'],
      [1, 'Broadband', 'FIB-CHN-00412', 'Chennai South', 'Active', '2026-06-15'],
      [2, 'Broadband', 'FIB-BLR-01189', 'Bengaluru East', 'Active', '2026-06-26'],
      [3, 'Mobile', 'MOB-98840-77412', 'Chennai West', 'Active', '2026-07-08'],
      [3, 'Landline', 'LL-044-26158890', 'Chennai West', 'Active', '2026-07-10'],
      [4, 'Mobile', 'MOB-99401-55210', 'Chennai Coastal', 'Active', '2026-07-19'],
      [5, 'Broadband', 'FIB-PUN-00741', 'Pune Central', 'Active', '2026-08-05'],
      [6, 'Mobile', 'MOB-97890-11843', 'Coimbatore North', 'Active', '2026-08-22'],
      [7, 'Broadband', 'FIB-HYD-00921', 'Hyderabad West', 'Suspended', '2026-09-10'],
      [8, 'Landline', 'LL-0484-2391042', 'Kochi Metro', 'Active', '2026-09-28'],
      [8, 'Mobile', 'MOB-98470-99102', 'Kochi Metro', 'Active', '2026-09-30'],
      [9, 'Broadband', 'FIB-MUM-02314', 'Mumbai West', 'Active', '2026-10-14'],
      [9, 'Landline', 'LL-022-26401190', 'Mumbai West', 'Active', '2026-10-16'],
      [10, 'Mobile', 'MOB-94440-88231', 'Chennai Central', 'Inactive', '2026-11-02'],
    ];
    for (const s of services) insertService.run(...s);

    const insertSub = db.prepare(`
      INSERT INTO subscriptions (customer_id, plan_id, service_id, start_date, expiry_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const subs = [
      [1, 1, 1, '2026-11-01', '2026-12-01', 'Active', '2026-11-01'],
      [1, 3, 2, '2026-11-01', '2026-12-01', 'Active', '2026-11-01'],
      [2, 4, 3, '2026-11-05', '2026-12-05', 'Active', '2026-11-05'],
      [3, 1, 4, '2026-10-28', '2026-11-27', 'Active', '2026-10-28'],
      [3, 5, 5, '2026-11-01', '2026-12-01', 'Active', '2026-11-01'],
      [4, 2, 6, '2026-11-10', '2026-12-08', 'Active', '2026-11-10'],
      [5, 3, 7, '2026-11-03', '2026-12-03', 'Active', '2026-11-03'],
      [6, 1, 8, '2026-10-15', '2026-11-14', 'Expired', '2026-10-15'],
      [7, 4, 9, '2026-10-01', '2026-10-31', 'Expired', '2026-10-01'],
      [8, 5, 10, '2026-11-08', '2026-12-08', 'Active', '2026-11-08'],
      [9, 6, 12, '2026-11-12', '2026-12-12', 'Active', '2026-11-12'],
      [10, 2, 14, '2026-09-15', '2026-10-13', 'Cancelled', '2026-09-15'],
    ];
    for (const sub of subs) insertSub.run(...sub);

    const insertUsage = db.prepare(`
      INSERT INTO usage_records (subscription_id, customer_id, record_month, data_used_gb, voice_used_mins)
      VALUES (?, ?, ?, ?, ?)
    `);

    const usageData = [
      [1, 1, '2026-10', 112.4, 1420],
      [1, 1, '2026-11', 94.8, 1180],
      [2, 1, '2026-11', 842.5, 0],
      [3, 2, '2026-10', 2140.0, 620],
      [3, 2, '2026-11', 1895.3, 540],
      [4, 3, '2026-11', 78.2, 890],
      [5, 3, '2026-11', 0, 1250],
      [6, 4, '2026-11', 31.6, 410],
      [7, 5, '2026-11', 965.4, 0],
      [8, 6, '2026-10', 132.9, 1740],
      [10, 8, '2026-11', 0, 980],
      [11, 9, '2026-11', 1420.0, 2110],
    ];
    for (const u of usageData) insertUsage.run(...u);

    const insertBill = db.prepare(`
      INSERT INTO bills (bill_number, customer_id, subscription_id, billing_period, amount, due_date, status, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const bills = [
      ['BILL-2026-1001', 1, 1, '2026-06', 599, '2026-07-10', 'Unpaid', '2026-06-30'],
      ['BILL-2026-1002', 2, 3, '2026-07', 2499, '2026-08-10', 'Unpaid', '2026-07-31'],
      ['BILL-2026-1003', 3, 4, '2026-08', 948, '2026-09-10', 'Unpaid', '2026-08-31'],
      ['BILL-2026-1004', 5, 7, '2026-09', 999, '2026-10-10', 'Unpaid', '2026-09-30'],
      ['BILL-2026-1005', 1, 2, '2026-10', 1598, '2026-11-10', 'Unpaid', '2026-10-31'],
      ['BILL-2026-1006', 2, 3, '2026-10', 2499, '2026-11-10', 'Unpaid', '2026-10-31'],
      ['BILL-2026-1007', 9, 11, '2026-11', 1799, '2026-12-05', 'Unpaid', '2026-11-15'],
      ['BILL-2026-1008', 4, 6, '2026-11', 299, '2026-12-05', 'Unpaid', '2026-11-15'],
      ['BILL-2026-1009', 7, 9, '2026-10', 2499, '2026-11-05', 'Overdue', '2026-10-31'],
      ['BILL-2026-1010', 6, 8, '2026-11', 599, '2026-11-30', 'Unpaid', '2026-11-16'],
      ['BILL-2026-1011', 8, 10, '2026-11', 349, '2026-12-08', 'Unpaid', '2026-11-18'],
      ['BILL-2026-1012', 5, 7, '2026-11', 999, '2026-12-05', 'Unpaid', '2026-11-19'],
    ];
    for (const b of bills) insertBill.run(...b);

    // Inserting payments triggers trg_after_payment_insert automatically!
    const insertPayment = db.prepare(`
      INSERT INTO payments (bill_id, customer_id, amount_paid, payment_mode, transaction_ref, payment_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const payments = [
      [1, 1, 599, 'UPI', 'UPI-20260705-8812', '2026-07-05', 'Settled via UPI autopay'],
      [2, 2, 2499, 'Card', 'CRD-20260804-4190', '2026-08-04', 'Corporate Visa card payment'],
      [3, 3, 948, 'UPI', 'UPI-20260903-1129', '2026-09-03', 'Combined mobile and landline bill'],
      [4, 5, 999, 'Cash', 'CSH-20261006-0092', '2026-10-06', 'Paid at Pune regional desk'],
      [5, 1, 1598, 'UPI', 'UPI-20261104-6621', '2026-11-04', 'October fiber + 5G invoice'],
      [6, 2, 2499, 'Card', 'CRD-20261108-7745', '2026-11-08', 'Business GigaLine October'],
      [7, 9, 1799, 'UPI', 'UPI-20261118-9034', '2026-11-18', 'Triple Play November'],
      [8, 4, 299, 'Cash', 'CSH-20261120-0144', '2026-11-20', 'Counter settlement'],
      [11, 8, 200, 'UPI', 'UPI-20261121-3310', '2026-11-21', 'Partial installment paid'],
    ];
    for (const p of payments) insertPayment.run(...p);

    const insertTicket = db.prepare(`
      INSERT INTO support_tickets (customer_id, service_id, subject, issue_description, priority, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const tickets = [
      [7, 9, 'Fiber link downtime after storm', 'ONT optical LOS red indicator flashing in Hyderabad West node.', 'High', 'Open', '2026-11-18'],
      [3, 4, '5G roaming activation request', 'International roaming add-on failed to provision on SIM.', 'Medium', 'In Progress', '2026-11-19'],
      [5, 7, 'Intermittent upload speed drop', 'Evening upload throughput drops from 300 Mbps to 45 Mbps.', 'Medium', 'Pending', '2026-11-20'],
      [1, 2, 'Static IP routing clarification', 'Customer requested reverse DNS PTR record update.', 'Low', 'Resolved', '2026-11-14'],
      [6, 8, 'SIM replacement and eSIM transfer', 'Requested eSIM QR re-issuance for upgraded handset.', 'Medium', 'Open', '2026-11-21'],
      [9, 13, 'Landline caller ID display issue', 'Incoming caller ID numbers truncated on desk terminal.', 'Low', 'In Progress', '2026-11-22'],
      [2, 3, 'Scheduled maintenance window inquiry', 'Enterprise customer confirming SLA uptime window.', 'Low', 'Resolved', '2026-11-12'],
      [8, 11, 'Invoice breakdown query', 'Customer requested clarification on partial payment balance.', 'Medium', 'Open', '2026-11-23'],
    ];
    for (const t of tickets) insertTicket.run(...t);
  });

  seedTx();
}
