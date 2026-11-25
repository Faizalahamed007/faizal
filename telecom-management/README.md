# CONNECT TELECOM PORTAL

Telecommunications Management System built for DBMS Mini Project demonstration.

## Folder Structure (XAMPP / PHP + MySQL)

- `config/` — PDO MySQL connection (`db.php`) and session/CSRF helpers (`auth.php`)
- `assets/css/` — Navy-blue, light blue-grey, white card, gold accent stylesheet
- `assets/js/` — Client-side table filtering scripts
- `auth/` — Secure administrator login (`password_hash`/`password_verify`) and logout
- `customers/` — Customer CRUD and search
- `services/` — Mobile, Broadband, and Landline service provisioning
- `plans/` — Tariff plan management
- `subscriptions/` — Plan assignment and atomic renewal via stored procedure
- `billing/` — Invoice generation and simulated UPI/Card/Cash payment recording
- `support/` — Complaint registration and status workflow
- `reports/` — KPIs, SQL Views, Subqueries, `RIGHT JOIN`, `GROUP BY/HAVING`, and Cursor execution
- `database/telecom_management.sql` — Complete 3NF MySQL schema, Views, Stored Procedures, Functions, Triggers, Cursors, and sample data

## XAMPP & phpMyAdmin Setup Instructions

1. Copy the `telecom-management/` folder into your XAMPP `htdocs` directory (e.g., `C:\xampp\htdocs\telecom-management`).
2. Start **Apache** and **MySQL** in the XAMPP Control Panel.
3. Open **phpMyAdmin** at `http://localhost/phpmyadmin`.
4. Click **Import**, choose `telecom-management/database/telecom_management.sql`, and click **Go**.
5. Open `http://localhost/telecom-management/` in your browser.
6. On first launch, complete the **Initial Administrator Setup** form to create your administrator account (stored securely with `password_hash()`).
