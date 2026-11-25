-- ============================================================================
-- CONNECT TELECOM PORTAL - MySQL Database Script (3NF Normalized)
-- Compatible with MySQL 8.0+ / MariaDB 10.4+ (XAMPP / phpMyAdmin)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS telecom_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE telecom_management;

-- Clean re-import order (child tables before parent tables)
DROP TRIGGER IF EXISTS trg_after_payment_insert;
DROP TRIGGER IF EXISTS trg_before_subscription_insert;
DROP TRIGGER IF EXISTS trg_after_ticket_update;
DROP PROCEDURE IF EXISTS sp_GenerateMonthlyBill;
DROP PROCEDURE IF EXISTS sp_RecordPaymentAndUpdateBill;
DROP PROCEDURE IF EXISTS sp_RenewSubscription;
DROP PROCEDURE IF EXISTS sp_GetCustomerSummary;
DROP PROCEDURE IF EXISTS sp_BatchProcessOverdueBills;
DROP FUNCTION IF EXISTS fn_GetCustomerTotalSpend;
DROP FUNCTION IF EXISTS fn_GetCustomerOpenTickets;
DROP FUNCTION IF EXISTS fn_CalculateLateFee;
DROP VIEW IF EXISTS v_active_subscriptions_summary;
DROP VIEW IF EXISTS v_customer_billing_overview;
DROP VIEW IF EXISTS v_monthly_revenue_stats;
DROP VIEW IF EXISTS v_service_distribution;

DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS usage_records;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS admins;

-- 1. Admins Table
CREATE TABLE admins (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role VARCHAR(60) NOT NULL DEFAULT 'System Administrator',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Customers Table (3NF)
CREATE TABLE customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL DEFAULT 'Chennai',
  status ENUM('Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active',
  created_at DATE NOT NULL DEFAULT (CURRENT_DATE),
  INDEX idx_customers_status (status),
  INDEX idx_customers_city (city)
) ENGINE=InnoDB;

-- 3. Plans Table (3NF)
CREATE TABLE plans (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(120) NOT NULL UNIQUE,
  service_type ENUM('Mobile', 'Broadband', 'Landline') NOT NULL,
  data_limit_gb DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  call_limit_mins INT NOT NULL DEFAULT 0,
  validity_days INT NOT NULL DEFAULT 30,
  monthly_fee DECIMAL(10, 2) NOT NULL CHECK (monthly_fee >= 0),
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATE NOT NULL DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB;

-- 4. Services Table (3NF)
CREATE TABLE services (
  service_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  service_type ENUM('Mobile', 'Broadband', 'Landline') NOT NULL,
  service_identifier VARCHAR(80) NOT NULL UNIQUE,
  service_area VARCHAR(100) NOT NULL,
  status ENUM('Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active',
  activated_at DATE NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT fk_services_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_services_type (service_type),
  INDEX idx_services_customer (customer_id)
) ENGINE=InnoDB;

-- 5. Subscriptions Table (3NF)
CREATE TABLE subscriptions (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  plan_id INT NOT NULL,
  service_id INT NULL,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status ENUM('Active', 'Expired', 'Cancelled', 'Renewed') NOT NULL DEFAULT 'Active',
  created_at DATE NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT fk_sub_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id)
    REFERENCES plans(plan_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_sub_service FOREIGN KEY (service_id)
    REFERENCES services(service_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_sub_status (status)
) ENGINE=InnoDB;

-- 6. Usage Records Table (3NF)
CREATE TABLE usage_records (
  usage_id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  customer_id INT NOT NULL,
  record_month CHAR(7) NOT NULL,
  data_used_gb DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  voice_used_mins INT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usage_sub FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(subscription_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_usage_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_usage_month (record_month)
) ENGINE=InnoDB;

-- 7. Bills Table (3NF)
CREATE TABLE bills (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  bill_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  subscription_id INT NULL,
  billing_period CHAR(7) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status ENUM('Paid', 'Unpaid', 'Overdue', 'Partial') NOT NULL DEFAULT 'Unpaid',
  generated_at DATE NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT fk_bills_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bills_sub FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(subscription_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_bills_status (status),
  INDEX idx_bills_due (due_date)
) ENGINE=InnoDB;

-- 8. Payments Table (3NF)
CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid > 0),
  payment_mode ENUM('UPI', 'Card', 'Cash') NOT NULL,
  transaction_ref VARCHAR(80) NOT NULL UNIQUE,
  payment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  notes VARCHAR(255) DEFAULT '',
  CONSTRAINT fk_payments_bill FOREIGN KEY (bill_id)
    REFERENCES bills(bill_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_payments_date (payment_date)
) ENGINE=InnoDB;

-- 9. Support Tickets Table (3NF)
CREATE TABLE support_tickets (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  service_id INT NULL,
  subject VARCHAR(160) NOT NULL,
  issue_description TEXT NOT NULL,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  status ENUM('Open', 'Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Open',
  created_at DATE NOT NULL DEFAULT (CURRENT_DATE),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_service FOREIGN KEY (service_id)
    REFERENCES services(service_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_tickets_status (status)
) ENGINE=InnoDB;

-- ============================================================================
-- SQL VIEWS
-- ============================================================================

CREATE VIEW v_active_subscriptions_summary AS
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

CREATE VIEW v_customer_billing_overview AS
SELECT
  c.customer_id,
  c.full_name,
  c.email,
  c.status AS account_status,
  COUNT(DISTINCT b.bill_id) AS total_bills,
  COALESCE(SUM(b.amount), 0.00) AS total_billed,
  COALESCE((
    SELECT SUM(pay.amount_paid)
    FROM payments pay
    WHERE pay.customer_id = c.customer_id
  ), 0.00) AS total_paid
FROM customers c
LEFT JOIN bills b ON c.customer_id = b.customer_id
GROUP BY c.customer_id, c.full_name, c.email, c.status;

CREATE VIEW v_monthly_revenue_stats AS
SELECT
  DATE_FORMAT(payment_date, '%Y-%m') AS month_key,
  COUNT(*) AS payment_count,
  SUM(amount_paid) AS total_revenue
FROM payments
GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
ORDER BY month_key ASC;

CREATE VIEW v_service_distribution AS
SELECT
  service_type,
  COUNT(*) AS total_services,
  SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_services
FROM services
GROUP BY service_type;

-- ============================================================================
-- STORED FUNCTIONS
-- ============================================================================

DELIMITER $$

CREATE FUNCTION fn_GetCustomerTotalSpend(p_customer_id INT)
RETURNS DECIMAL(10, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(10, 2);
  SELECT COALESCE(SUM(amount_paid), 0.00) INTO v_total
  FROM payments
  WHERE customer_id = p_customer_id;
  RETURN v_total;
END$$

CREATE FUNCTION fn_GetCustomerOpenTickets(p_customer_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_open INT;
  SELECT COUNT(*) INTO v_open
  FROM support_tickets
  WHERE customer_id = p_customer_id AND status != 'Resolved';
  RETURN v_open;
END$$

CREATE FUNCTION fn_CalculateLateFee(p_amount DECIMAL(10, 2), p_due_date DATE)
RETURNS DECIMAL(10, 2)
DETERMINISTIC
NO SQL
BEGIN
  IF CURRENT_DATE > p_due_date THEN
    RETURN ROUND(p_amount * 0.05, 2);
  END IF;
  RETURN 0.00;
END$$

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_after_payment_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  DECLARE v_bill_amount DECIMAL(10, 2);
  DECLARE v_paid_sum DECIMAL(10, 2);

  SELECT amount INTO v_bill_amount FROM bills WHERE bill_id = NEW.bill_id;
  SELECT COALESCE(SUM(amount_paid), 0.00) INTO v_paid_sum FROM payments WHERE bill_id = NEW.bill_id;

  IF v_paid_sum >= v_bill_amount THEN
    UPDATE bills SET status = 'Paid' WHERE bill_id = NEW.bill_id;
  ELSE
    UPDATE bills SET status = 'Partial' WHERE bill_id = NEW.bill_id;
  END IF;
END$$

CREATE TRIGGER trg_before_subscription_insert
BEFORE INSERT ON subscriptions
FOR EACH ROW
BEGIN
  IF NEW.expiry_date < NEW.start_date THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expiry date cannot precede start date.';
  END IF;
END$$

CREATE TRIGGER trg_after_ticket_update
BEFORE UPDATE ON support_tickets
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

-- ============================================================================
-- STORED PROCEDURES & CURSORS (with Transactions)
-- ============================================================================

CREATE PROCEDURE sp_GenerateMonthlyBill(
  IN p_customer_id INT,
  IN p_subscription_id INT,
  IN p_billing_period CHAR(7),
  IN p_amount DECIMAL(10, 2),
  IN p_due_date DATE
)
BEGIN
  DECLARE v_bill_num VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SET v_bill_num = CONCAT('BILL-', YEAR(CURRENT_DATE), '-', FLOOR(1000 + RAND() * 9000));
  INSERT INTO bills (bill_number, customer_id, subscription_id, billing_period, amount, due_date, status)
  VALUES (v_bill_num, p_customer_id, p_subscription_id, p_billing_period, p_amount, p_due_date, 'Unpaid');
  COMMIT;
END$$

CREATE PROCEDURE sp_RecordPaymentAndUpdateBill(
  IN p_bill_id INT,
  IN p_amount_paid DECIMAL(10, 2),
  IN p_payment_mode ENUM('UPI', 'Card', 'Cash'),
  IN p_notes VARCHAR(255)
)
BEGIN
  DECLARE v_customer_id INT;
  DECLARE v_tx_ref VARCHAR(80);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT customer_id INTO v_customer_id FROM bills WHERE bill_id = p_bill_id FOR UPDATE;
  SET v_tx_ref = CONCAT(
    CASE p_payment_mode WHEN 'UPI' THEN 'UPI' WHEN 'Card' THEN 'CRD' ELSE 'CSH' END,
    '-', DATE_FORMAT(CURRENT_DATE, '%Y%m%d'), '-', FLOOR(1000 + RAND() * 9000)
  );
  INSERT INTO payments (bill_id, customer_id, amount_paid, payment_mode, transaction_ref, notes)
  VALUES (p_bill_id, v_customer_id, p_amount_paid, p_payment_mode, v_tx_ref, p_notes);
  COMMIT;
END$$

CREATE PROCEDURE sp_RenewSubscription(
  IN p_subscription_id INT,
  IN p_generate_bill TINYINT(1)
)
BEGIN
  DECLARE v_customer_id INT;
  DECLARE v_validity INT;
  DECLARE v_fee DECIMAL(10, 2);
  DECLARE v_expiry DATE;
  DECLARE v_base_date DATE;
  DECLARE v_new_expiry DATE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT s.customer_id, s.expiry_date, p.validity_days, p.monthly_fee
  INTO v_customer_id, v_expiry, v_validity, v_fee
  FROM subscriptions s
  INNER JOIN plans p ON s.plan_id = p.plan_id
  WHERE s.subscription_id = p_subscription_id FOR UPDATE;

  SET v_base_date = IF(v_expiry > CURRENT_DATE, v_expiry, CURRENT_DATE);
  SET v_new_expiry = DATE_ADD(v_base_date, INTERVAL v_validity DAY);

  UPDATE subscriptions
  SET start_date = v_base_date, expiry_date = v_new_expiry, status = 'Renewed'
  WHERE subscription_id = p_subscription_id;

  IF p_generate_bill = 1 THEN
    INSERT INTO bills (bill_number, customer_id, subscription_id, billing_period, amount, due_date, status)
    VALUES (
      CONCAT('BILL-', YEAR(CURRENT_DATE), '-', FLOOR(1000 + RAND() * 9000)),
      v_customer_id,
      p_subscription_id,
      DATE_FORMAT(v_base_date, '%Y-%m'),
      v_fee,
      DATE_ADD(v_base_date, INTERVAL 15 DAY),
      'Unpaid'
    );
  END IF;
  COMMIT;
END$$

CREATE PROCEDURE sp_GetCustomerSummary(IN p_customer_id INT)
BEGIN
  SELECT
    c.customer_id,
    c.full_name,
    c.email,
    c.phone,
    c.status,
    fn_GetCustomerTotalSpend(c.customer_id) AS total_spend,
    fn_GetCustomerOpenTickets(c.customer_id) AS open_tickets
  FROM customers c
  WHERE c.customer_id = p_customer_id;
END$$

-- Cursor Demonstration: Batch mark unpaid bills past due date as Overdue
CREATE PROCEDURE sp_BatchProcessOverdueBills(OUT p_updated_count INT)
BEGIN
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_bill_id INT;
  DECLARE cur_overdue CURSOR FOR
    SELECT bill_id FROM bills WHERE status = 'Unpaid' AND due_date < CURRENT_DATE;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SET p_updated_count = 0;
  START TRANSACTION;
  OPEN cur_overdue;
  read_loop: LOOP
    FETCH cur_overdue INTO v_bill_id;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;
    UPDATE bills SET status = 'Overdue' WHERE bill_id = v_bill_id;
    SET p_updated_count = p_updated_count + 1;
  END LOOP;
  CLOSE cur_overdue;
  COMMIT;
END$$

DELIMITER ;

-- ============================================================================
-- SAMPLE SEED DATA
-- ============================================================================

INSERT INTO customers (full_name, email, phone, address, city, status, created_at) VALUES
('Aarav Sundaram', 'aarav.sundaram@example.com', '+91-98401-22104', '14 Cathedral Road, Gopalapuram', 'Chennai', 'Active', '2026-06-12'),
('Priya Venkataraman', 'priya.venkat@example.com', '+91-98402-33819', '88 Indiranagar 100ft Road', 'Bengaluru', 'Active', '2026-06-25'),
('Karthik Narayanan', 'karthik.n@example.com', '+91-98840-77412', '22 Anna Nagar West Extension', 'Chennai', 'Active', '2026-07-08'),
('Meera Krishnan', 'meera.krishnan@example.com', '+91-99401-55210', '51 Besant Nagar 4th Avenue', 'Chennai', 'Active', '2026-07-19'),
('Rohan Deshmukh', 'rohan.deshmukh@example.com', '+91-98201-66423', '302 Koregaon Park Lane 6', 'Pune', 'Active', '2026-08-04'),
('Ananya Subramanian', 'ananya.sub@example.com', '+91-97890-11843', '76 Race Course Road', 'Coimbatore', 'Active', '2026-08-22'),
('Vikramaditya Rao', 'vikram.rao@example.com', '+91-98490-44561', '19 Jubilee Hills Road 36', 'Hyderabad', 'Suspended', '2026-09-10'),
('Divya Menon', 'divya.menon@example.com', '+91-98470-99102', '45 Marine Drive Promenade', 'Kochi', 'Active', '2026-09-28'),
('Siddharth Iyer', 'siddharth.iyer@example.com', '+91-98111-33490', '128 Bandra West Linking Rd', 'Mumbai', 'Active', '2026-10-14'),
('Nandini Balasubramanian', 'nandini.b@example.com', '+91-94440-88231', '9 Mylapore Luz Church Road', 'Chennai', 'Inactive', '2026-11-02');

INSERT INTO plans (plan_name, service_type, data_limit_gb, call_limit_mins, validity_days, monthly_fee, description, is_active) VALUES
('Connect 5G Unlimited', 'Mobile', 150.00, 3000, 30, 599.00, 'High-speed 5G mobile voice and data pack with national roaming.', 1),
('Starter 4G Value', 'Mobile', 45.00, 1000, 28, 299.00, 'Essential daily mobile data and voice calling plan.', 1),
('FiberMax 300 Mbps', 'Broadband', 1500.00, 0, 30, 999.00, 'Symmetrical 300 Mbps fiber broadband for homes and remote offices.', 1),
('Business GigaLine 1 Gbps', 'Broadband', 5000.00, 1500, 30, 2499.00, 'Enterprise-grade 1 Gbps leased fiber with static IP allocation.', 1),
('Landline Voice Plus', 'Landline', 0.00, 2500, 30, 349.00, 'Crystal-clear PSTN and VoIP landline connectivity for offices.', 1),
('Enterprise Triple Play', 'Broadband', 3000.00, 5000, 30, 1799.00, 'Bundled high-speed fiber with unlimited landline trunk calling.', 1);

INSERT INTO services (customer_id, service_type, service_identifier, service_area, status, activated_at) VALUES
(1, 'Mobile', 'MOB-98401-22104', 'Chennai South', 'Active', '2026-06-12'),
(1, 'Broadband', 'FIB-CHN-00412', 'Chennai South', 'Active', '2026-06-15'),
(2, 'Broadband', 'FIB-BLR-01189', 'Bengaluru East', 'Active', '2026-06-26'),
(3, 'Mobile', 'MOB-98840-77412', 'Chennai West', 'Active', '2026-07-08'),
(3, 'Landline', 'LL-044-26158890', 'Chennai West', 'Active', '2026-07-10'),
(4, 'Mobile', 'MOB-99401-55210', 'Chennai Coastal', 'Active', '2026-07-19'),
(5, 'Broadband', 'FIB-PUN-00741', 'Pune Central', 'Active', '2026-08-05'),
(6, 'Mobile', 'MOB-97890-11843', 'Coimbatore North', 'Active', '2026-08-22'),
(7, 'Broadband', 'FIB-HYD-00921', 'Hyderabad West', 'Suspended', '2026-09-10'),
(8, 'Landline', 'LL-0484-2391042', 'Kochi Metro', 'Active', '2026-09-28'),
(8, 'Mobile', 'MOB-98470-99102', 'Kochi Metro', 'Active', '2026-09-30'),
(9, 'Broadband', 'FIB-MUM-02314', 'Mumbai West', 'Active', '2026-10-14'),
(9, 'Landline', 'LL-022-26401190', 'Mumbai West', 'Active', '2026-10-16'),
(10, 'Mobile', 'MOB-94440-88231', 'Chennai Central', 'Inactive', '2026-11-02');

INSERT INTO subscriptions (customer_id, plan_id, service_id, start_date, expiry_date, status, created_at) VALUES
(1, 1, 1, '2026-11-01', '2026-12-01', 'Active', '2026-11-01'),
(1, 3, 2, '2026-11-01', '2026-12-01', 'Active', '2026-11-01'),
(2, 4, 3, '2026-11-05', '2026-12-05', 'Active', '2026-11-05'),
(3, 1, 4, '2026-10-28', '2026-11-27', 'Active', '2026-10-28'),
(3, 5, 5, '2026-11-01', '2026-12-01', 'Active', '2026-11-01'),
(4, 2, 6, '2026-11-10', '2026-12-08', 'Active', '2026-11-10'),
(5, 3, 7, '2026-11-03', '2026-12-03', 'Active', '2026-11-03'),
(6, 1, 8, '2026-10-15', '2026-11-14', 'Expired', '2026-10-15'),
(7, 4, 9, '2026-10-01', '2026-10-31', 'Expired', '2026-10-01'),
(8, 5, 10, '2026-11-08', '2026-12-08', 'Active', '2026-11-08'),
(9, 6, 12, '2026-11-12', '2026-12-12', 'Active', '2026-11-12'),
(10, 2, 14, '2026-09-15', '2026-10-13', 'Cancelled', '2026-09-15');

INSERT INTO usage_records (subscription_id, customer_id, record_month, data_used_gb, voice_used_mins) VALUES
(1, 1, '2026-10', 112.40, 1420),
(1, 1, '2026-11', 94.80, 1180),
(2, 1, '2026-11', 842.50, 0),
(3, 2, '2026-10', 2140.00, 620),
(3, 2, '2026-11', 1895.30, 540),
(4, 3, '2026-11', 78.20, 890),
(5, 3, '2026-11', 0.00, 1250),
(6, 4, '2026-11', 31.60, 410),
(7, 5, '2026-11', 965.40, 0),
(8, 6, '2026-10', 132.90, 1740),
(10, 8, '2026-11', 0.00, 980),
(11, 9, '2026-11', 1420.00, 2110);

INSERT INTO bills (bill_number, customer_id, subscription_id, billing_period, amount, due_date, status, generated_at) VALUES
('BILL-2026-1001', 1, 1, '2026-06', 599.00, '2026-07-10', 'Unpaid', '2026-06-30'),
('BILL-2026-1002', 2, 3, '2026-07', 2499.00, '2026-08-10', 'Unpaid', '2026-07-31'),
('BILL-2026-1003', 3, 4, '2026-08', 948.00, '2026-09-10', 'Unpaid', '2026-08-31'),
('BILL-2026-1004', 5, 7, '2026-09', 999.00, '2026-10-10', 'Unpaid', '2026-09-30'),
('BILL-2026-1005', 1, 2, '2026-10', 1598.00, '2026-11-10', 'Unpaid', '2026-10-31'),
('BILL-2026-1006', 2, 3, '2026-10', 2499.00, '2026-11-10', 'Unpaid', '2026-10-31'),
('BILL-2026-1007', 9, 11, '2026-11', 1799.00, '2026-12-05', 'Unpaid', '2026-11-15'),
('BILL-2026-1008', 4, 6, '2026-11', 299.00, '2026-12-05', 'Unpaid', '2026-11-15'),
('BILL-2026-1009', 7, 9, '2026-10', 2499.00, '2026-11-05', 'Overdue', '2026-10-31'),
('BILL-2026-1010', 6, 8, '2026-11', 599.00, '2026-11-30', 'Unpaid', '2026-11-16'),
('BILL-2026-1011', 8, 10, '2026-11', 349.00, '2026-12-08', 'Unpaid', '2026-11-18'),
('BILL-2026-1012', 5, 7, '2026-11', 999.00, '2026-12-05', 'Unpaid', '2026-11-19');

INSERT INTO payments (bill_id, customer_id, amount_paid, payment_mode, transaction_ref, payment_date, notes) VALUES
(1, 1, 599.00, 'UPI', 'UPI-20260705-8812', '2026-07-05', 'Settled via UPI autopay'),
(2, 2, 2499.00, 'Card', 'CRD-20260804-4190', '2026-08-04', 'Corporate Visa card payment'),
(3, 3, 948.00, 'UPI', 'UPI-20260903-1129', '2026-09-03', 'Combined mobile and landline bill'),
(4, 5, 999.00, 'Cash', 'CSH-20261006-0092', '2026-10-06', 'Paid at Pune regional desk'),
(5, 1, 1598.00, 'UPI', 'UPI-20261104-6621', '2026-11-04', 'October fiber + 5G invoice'),
(6, 2, 2499.00, 'Card', 'CRD-20261108-7745', '2026-11-08', 'Business GigaLine October'),
(7, 9, 1799.00, 'UPI', 'UPI-20261118-9034', '2026-11-18', 'Triple Play November'),
(8, 4, 299.00, 'Cash', 'CSH-20261120-0144', '2026-11-20', 'Counter settlement'),
(11, 8, 200.00, 'UPI', 'UPI-20261121-3310', '2026-11-21', 'Partial installment paid');

INSERT INTO support_tickets (customer_id, service_id, subject, issue_description, priority, status, created_at) VALUES
(7, 9, 'Fiber link downtime after storm', 'ONT optical LOS red indicator flashing in Hyderabad West node.', 'High', 'Open', '2026-11-18'),
(3, 4, '5G roaming activation request', 'International roaming add-on failed to provision on SIM.', 'Medium', 'In Progress', '2026-11-19'),
(5, 7, 'Intermittent upload speed drop', 'Evening upload throughput drops from 300 Mbps to 45 Mbps.', 'Medium', 'Pending', '2026-11-20'),
(1, 2, 'Static IP routing clarification', 'Customer requested reverse DNS PTR record update.', 'Low', 'Resolved', '2026-11-14'),
(6, 8, 'SIM replacement and eSIM transfer', 'Requested eSIM QR re-issuance for upgraded handset.', 'Medium', 'Open', '2026-11-21'),
(9, 13, 'Landline caller ID display issue', 'Incoming caller ID numbers truncated on desk terminal.', 'Low', 'In Progress', '2026-11-22'),
(2, 3, 'Scheduled maintenance window inquiry', 'Enterprise customer confirming SLA uptime window.', 'Low', 'Resolved', '2026-11-12'),
(8, 11, 'Invoice breakdown query', 'Customer requested clarification on partial payment balance.', 'Medium', 'Open', '2026-11-23');
