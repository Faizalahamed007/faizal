import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, initializeDatabase } from './src/server/db.ts';

dotenv.config();
initializeDatabase();

const app = express();
const PORT = 3000;

app.use(express.json());

interface AdminSession {
  token: string;
  adminId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  expiresAt: number;
}

const activeSessions = new Map<string, AdminSession>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function createSessionToken(admin: {
  admin_id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
}): AdminSession {
  const token = crypto.randomBytes(32).toString('hex');
  const session: AdminSession = {
    token,
    adminId: admin.admin_id,
    username: admin.username,
    fullName: admin.full_name,
    email: admin.email,
    role: admin.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  activeSessions.set(token, session);
  return session;
}

interface AuthenticatedRequest extends Request {
  admin?: AdminSession;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  req.admin = session;
  next();
}

// ---------- AUTHENTICATION ROUTES ----------

app.get('/api/auth/status', (_req, res) => {
  const envConfigured = Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0);
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM admins').get() as { count: number };
  res.json({
    initialized: envConfigured || countRow.count > 0,
    envConfigured,
  });
});

app.post('/api/auth/setup', (req, res) => {
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  if (envPassword) {
    res.status(403).json({ error: 'Admin credentials are managed via environment configuration.' });
    return;
  }

  const countRow = db.prepare('SELECT COUNT(*) AS count FROM admins').get() as { count: number };
  if (countRow.count > 0) {
    res.status(409).json({ error: 'Admin account is already initialized. Please sign in.' });
    return;
  }

  const { username, password, full_name, email } = req.body ?? {};
  const cleanUser = typeof username === 'string' ? username.trim() : '';
  const cleanPass = typeof password === 'string' ? password : '';
  const cleanName = typeof full_name === 'string' && full_name.trim() ? full_name.trim() : 'Portal Administrator';
  const cleanEmail =
    typeof email === 'string' && email.trim() ? email.trim() : `${cleanUser || 'admin'}@connecttelecom.local`;

  if (cleanUser.length < 3 || cleanPass.length < 6) {
    res.status(400).json({ error: 'Username must be at least 3 characters and password at least 6 characters.' });
    return;
  }

  try {
    const passwordHash = hashPassword(cleanPass);
    const result = db
      .prepare(
        `INSERT INTO admins (username, password_hash, full_name, email, role)
         VALUES (?, ?, ?, ?, 'System Administrator')`
      )
      .run(cleanUser, passwordHash, cleanName, cleanEmail);

    const created = db
      .prepare('SELECT admin_id, username, full_name, email, role FROM admins WHERE admin_id = ?')
      .get(result.lastInsertRowid) as {
      admin_id: number;
      username: string;
      full_name: string;
      email: string;
      role: string;
    };

    const session = createSessionToken(created);
    res.status(201).json({
      token: session.token,
      admin: {
        adminId: created.admin_id,
        username: created.username,
        fullName: created.full_name,
        email: created.email,
        role: created.role,
      },
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message || 'Could not initialize admin account.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  const cleanUser = typeof username === 'string' ? username.trim() : '';
  const cleanPass = typeof password === 'string' ? password : '';

  if (!cleanUser || !cleanPass) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  const envUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';

  if (envPassword) {
    const userMatches = cleanUser === envUsername;
    const passBufA = Buffer.from(cleanPass, 'utf8');
    const passBufB = Buffer.from(envPassword, 'utf8');
    const passMatches = passBufA.length === passBufB.length && crypto.timingSafeEqual(passBufA, passBufB);

    if (userMatches && passMatches) {
      const session = createSessionToken({
        admin_id: 0,
        username: envUsername,
        full_name: 'System Administrator',
        email: 'admin@connecttelecom.local',
        role: 'System Administrator',
      });
      res.json({
        token: session.token,
        admin: {
          adminId: session.adminId,
          username: session.username,
          fullName: session.fullName,
          email: session.email,
          role: session.role,
        },
      });
      return;
    }
  }

  const adminRow = db
    .prepare('SELECT admin_id, username, password_hash, full_name, email, role FROM admins WHERE username = ?')
    .get(cleanUser) as
    | {
        admin_id: number;
        username: string;
        password_hash: string;
        full_name: string;
        email: string;
        role: string;
      }
    | undefined;

  if (!adminRow || !verifyPassword(cleanPass, adminRow.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const session = createSessionToken(adminRow);
  res.json({
    token: session.token,
    admin: {
      adminId: adminRow.admin_id,
      username: adminRow.username,
      fullName: adminRow.full_name,
      email: adminRow.email,
      role: adminRow.role,
    },
  });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ admin: req.admin });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.admin) {
    activeSessions.delete(req.admin.token);
  }
  res.json({ success: true });
});

// ---------- DASHBOARD ROUTE ----------

app.get('/api/dashboard', requireAuth, (_req, res) => {
  const totalCustomers = (db.prepare('SELECT COUNT(*) AS count FROM customers').get() as { count: number }).count;
  const activePlans = (db.prepare('SELECT COUNT(*) AS count FROM plans WHERE is_active = 1').get() as { count: number })
    .count;
  const billStats = db
    .prepare(
      `SELECT COUNT(*) AS total_bills,
              SUM(CASE WHEN status IN ('Unpaid', 'Overdue', 'Partial') THEN 1 ELSE 0 END) AS pending_bills,
              COALESCE(SUM(amount), 0) AS total_billed_amount
       FROM bills`
    )
    .get() as { total_bills: number; pending_bills: number; total_billed_amount: number };
  const openTickets = (
    db.prepare("SELECT COUNT(*) AS count FROM support_tickets WHERE status != 'Resolved'").get() as { count: number }
  ).count;

  const recentCustomers = db
    .prepare(
      `SELECT customer_id, full_name, email, phone, city, status, created_at
       FROM customers
       ORDER BY customer_id DESC
       LIMIT 5`
    )
    .all();

  const recentSubscriptions = db
    .prepare(
      `SELECT subscription_id, customer_name, plan_name, service_type, monthly_fee, start_date, expiry_date, status
       FROM v_active_subscriptions_summary
       ORDER BY subscription_id DESC
       LIMIT 5`
    )
    .all();

  const recentPayments = db
    .prepare(
      `SELECT p.payment_id, b.bill_number, c.full_name AS customer_name, p.amount_paid, p.payment_mode, p.transaction_ref, p.payment_date
       FROM payments p
       INNER JOIN bills b ON p.bill_id = b.bill_id
       INNER JOIN customers c ON p.customer_id = c.customer_id
       ORDER BY p.payment_id DESC
       LIMIT 5`
    )
    .all();

  const monthlyRevenue = db.prepare('SELECT month_key, payment_count, total_revenue FROM v_monthly_revenue_stats').all();
  const serviceStats = db.prepare('SELECT service_type, total_services, active_services FROM v_service_distribution').all();

  res.json({
    summary: {
      totalCustomers,
      activePlans,
      totalBills: billStats.total_bills,
      pendingBills: billStats.pending_bills ?? 0,
      totalBilledAmount: billStats.total_billed_amount ?? 0,
      openTickets,
    },
    recentCustomers,
    recentSubscriptions,
    recentPayments,
    monthlyRevenue,
    serviceStats,
  });
});

// ---------- CUSTOMERS CRUD ----------

app.get('/api/customers', requireAuth, (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  let sql = `
    SELECT c.*,
           COUNT(DISTINCT s.service_id) AS service_count,
           COUNT(DISTINCT CASE WHEN b.status != 'Paid' THEN b.bill_id END) AS unpaid_bills
    FROM customers c
    LEFT JOIN services s ON c.customer_id = s.customer_id
    LEFT JOIN bills b ON c.customer_id = b.customer_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (search) {
    sql += ` AND (c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.city LIKE ? OR CAST(c.customer_id AS TEXT) = ?)`;
    const like = `%${search}%`;
    params.push(like, like, like, like, search);
  }
  if (status && ['Active', 'Inactive', 'Suspended'].includes(status)) {
    sql += ` AND c.status = ?`;
    params.push(status);
  }

  sql += ` GROUP BY c.customer_id ORDER BY c.customer_id DESC`;

  const rows = db.prepare(sql).all(...params);
  res.json({ customers: rows });
});

app.get('/api/customers/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid customer ID.' });
    return;
  }

  const customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found.' });
    return;
  }

  const services = db.prepare('SELECT * FROM services WHERE customer_id = ? ORDER BY service_id DESC').all(id);
  const subscriptions = db
    .prepare(
      `SELECT sub.*, p.plan_name, p.service_type, p.monthly_fee
       FROM subscriptions sub
       INNER JOIN plans p ON sub.plan_id = p.plan_id
       WHERE sub.customer_id = ?
       ORDER BY sub.subscription_id DESC`
    )
    .all(id);
  const bills = db.prepare('SELECT * FROM bills WHERE customer_id = ? ORDER BY bill_id DESC').all(id);
  const tickets = db.prepare('SELECT * FROM support_tickets WHERE customer_id = ? ORDER BY ticket_id DESC').all(id);

  res.json({ customer, services, subscriptions, bills, tickets });
});

app.post('/api/customers', requireAuth, (req, res) => {
  const { full_name, email, phone, address, city, status } = req.body ?? {};
  if (!full_name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim()) {
    res.status(400).json({ error: 'Name, email, phone number, and address are required.' });
    return;
  }
  const cleanStatus = ['Active', 'Inactive', 'Suspended'].includes(status) ? status : 'Active';
  const cleanCity = typeof city === 'string' && city.trim() ? city.trim() : 'Chennai';

  try {
    const info = db
      .prepare(
        `INSERT INTO customers (full_name, email, phone, address, city, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(full_name.trim(), email.trim(), phone.trim(), address.trim(), cleanCity, cleanStatus);

    const created = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ customer: created });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/customers/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid customer ID.' });
    return;
  }
  const { full_name, email, phone, address, city, status } = req.body ?? {};
  if (!full_name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim()) {
    res.status(400).json({ error: 'Name, email, phone number, and address are required.' });
    return;
  }
  const cleanStatus = ['Active', 'Inactive', 'Suspended'].includes(status) ? status : 'Active';
  const cleanCity = typeof city === 'string' && city.trim() ? city.trim() : 'Chennai';

  try {
    const result = db
      .prepare(
        `UPDATE customers
         SET full_name = ?, email = ?, phone = ?, address = ?, city = ?, status = ?
         WHERE customer_id = ?`
      )
      .run(full_name.trim(), email.trim(), phone.trim(), address.trim(), cleanCity, cleanStatus, id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    const updated = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(id);
    res.json({ customer: updated });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/customers/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid customer ID.' });
    return;
  }
  const result = db.prepare('DELETE FROM customers WHERE customer_id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Customer not found.' });
    return;
  }
  res.json({ success: true });
});

// ---------- SERVICES CRUD ----------

app.get('/api/services', requireAuth, (req, res) => {
  const serviceType = typeof req.query.service_type === 'string' ? req.query.service_type.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let sql = `
    SELECT s.*, c.full_name AS customer_name, c.phone AS customer_phone
    FROM services s
    INNER JOIN customers c ON s.customer_id = c.customer_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (serviceType && ['Mobile', 'Broadband', 'Landline'].includes(serviceType)) {
    sql += ` AND s.service_type = ?`;
    params.push(serviceType);
  }
  if (search) {
    sql += ` AND (s.service_identifier LIKE ? OR s.service_area LIKE ? OR c.full_name LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  sql += ` ORDER BY s.service_id DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ services: rows });
});

app.post('/api/services', requireAuth, (req, res) => {
  const { customer_id, service_type, service_identifier, service_area, status } = req.body ?? {};
  const custId = Number(customer_id);
  if (!Number.isInteger(custId) || custId <= 0) {
    res.status(400).json({ error: 'Valid customer is required.' });
    return;
  }
  if (!['Mobile', 'Broadband', 'Landline'].includes(service_type)) {
    res.status(400).json({ error: 'Service type must be Mobile, Broadband, or Landline.' });
    return;
  }
  if (!service_area?.trim()) {
    res.status(400).json({ error: 'Service area is required.' });
    return;
  }

  const prefix = service_type === 'Mobile' ? 'MOB' : service_type === 'Broadband' ? 'FIB' : 'LL';
  const cleanIdentifier =
    typeof service_identifier === 'string' && service_identifier.trim()
      ? service_identifier.trim()
      : `${prefix}-${Date.now().toString().slice(-6)}`;
  const cleanStatus = ['Active', 'Inactive', 'Suspended'].includes(status) ? status : 'Active';

  try {
    const info = db
      .prepare(
        `INSERT INTO services (customer_id, service_type, service_identifier, service_area, status)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(custId, service_type, cleanIdentifier, service_area.trim(), cleanStatus);

    const created = db
      .prepare(
        `SELECT s.*, c.full_name AS customer_name
         FROM services s
         INNER JOIN customers c ON s.customer_id = c.customer_id
         WHERE s.service_id = ?`
      )
      .get(info.lastInsertRowid);
    res.status(201).json({ service: created });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/services/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { customer_id, service_type, service_identifier, service_area, status } = req.body ?? {};
  const custId = Number(customer_id);

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(custId) || custId <= 0) {
    res.status(400).json({ error: 'Invalid service or customer ID.' });
    return;
  }
  if (!['Mobile', 'Broadband', 'Landline'].includes(service_type) || !service_area?.trim() || !service_identifier?.trim()) {
    res.status(400).json({ error: 'All service fields are required.' });
    return;
  }
  const cleanStatus = ['Active', 'Inactive', 'Suspended'].includes(status) ? status : 'Active';

  try {
    const result = db
      .prepare(
        `UPDATE services
         SET customer_id = ?, service_type = ?, service_identifier = ?, service_area = ?, status = ?
         WHERE service_id = ?`
      )
      .run(custId, service_type, service_identifier.trim(), service_area.trim(), cleanStatus, id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/services/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid service ID.' });
    return;
  }
  const result = db.prepare('DELETE FROM services WHERE service_id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Service not found.' });
    return;
  }
  res.json({ success: true });
});

// ---------- PLANS CRUD ----------

app.get('/api/plans', requireAuth, (req, res) => {
  const serviceType = typeof req.query.service_type === 'string' ? req.query.service_type.trim() : '';
  let sql = `
    SELECT p.*,
           COUNT(CASE WHEN sub.status IN ('Active', 'Renewed') THEN 1 END) AS active_subscribers
    FROM plans p
    LEFT JOIN subscriptions sub ON p.plan_id = sub.plan_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (serviceType && ['Mobile', 'Broadband', 'Landline'].includes(serviceType)) {
    sql += ` AND p.service_type = ?`;
    params.push(serviceType);
  }

  sql += ` GROUP BY p.plan_id ORDER BY p.plan_id ASC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ plans: rows });
});

app.post('/api/plans', requireAuth, (req, res) => {
  const { plan_name, service_type, data_limit_gb, call_limit_mins, validity_days, monthly_fee, description, is_active } =
    req.body ?? {};
  if (!plan_name?.trim() || !['Mobile', 'Broadband', 'Landline'].includes(service_type)) {
    res.status(400).json({ error: 'Plan name and valid service type are required.' });
    return;
  }
  const fee = Number(monthly_fee);
  const validity = Number(validity_days);
  const dataLimit = Number(data_limit_gb ?? 0);
  const callLimit = Number(call_limit_mins ?? 0);

  if (Number.isNaN(fee) || fee < 0 || Number.isNaN(validity) || validity <= 0) {
    res.status(400).json({ error: 'Valid monthly fee and validity days are required.' });
    return;
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO plans (plan_name, service_type, data_limit_gb, call_limit_mins, validity_days, monthly_fee, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        plan_name.trim(),
        service_type,
        dataLimit,
        callLimit,
        validity,
        fee,
        (description ?? '').trim(),
        is_active === false || is_active === 0 ? 0 : 1
      );

    const created = db.prepare('SELECT * FROM plans WHERE plan_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ plan: created });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/plans/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid plan ID.' });
    return;
  }
  const { plan_name, service_type, data_limit_gb, call_limit_mins, validity_days, monthly_fee, description, is_active } =
    req.body ?? {};

  if (!plan_name?.trim() || !['Mobile', 'Broadband', 'Landline'].includes(service_type)) {
    res.status(400).json({ error: 'Plan name and service type are required.' });
    return;
  }

  try {
    const result = db
      .prepare(
        `UPDATE plans
         SET plan_name = ?, service_type = ?, data_limit_gb = ?, call_limit_mins = ?, validity_days = ?, monthly_fee = ?, description = ?, is_active = ?
         WHERE plan_id = ?`
      )
      .run(
        plan_name.trim(),
        service_type,
        Number(data_limit_gb ?? 0),
        Number(call_limit_mins ?? 0),
        Number(validity_days ?? 30),
        Number(monthly_fee ?? 0),
        (description ?? '').trim(),
        is_active === false || is_active === 0 ? 0 : 1,
        id
      );

    if (result.changes === 0) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/plans/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid plan ID.' });
    return;
  }
  const linked = db.prepare('SELECT COUNT(*) AS count FROM subscriptions WHERE plan_id = ?').get(id) as { count: number };
  if (linked.count > 0) {
    res.status(400).json({ error: 'Cannot delete a plan that has active or historical subscriptions.' });
    return;
  }
  const result = db.prepare('DELETE FROM plans WHERE plan_id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Plan not found.' });
    return;
  }
  res.json({ success: true });
});

// ---------- SUBSCRIPTIONS ----------

app.get('/api/subscriptions', requireAuth, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  let sql = `
    SELECT sub.subscription_id, sub.customer_id, sub.plan_id, sub.service_id,
           sub.start_date, sub.expiry_date, sub.status, sub.created_at,
           c.full_name AS customer_name, c.phone AS customer_phone,
           p.plan_name, p.service_type, p.monthly_fee, p.validity_days,
           sv.service_identifier
    FROM subscriptions sub
    INNER JOIN customers c ON sub.customer_id = c.customer_id
    INNER JOIN plans p ON sub.plan_id = p.plan_id
    LEFT JOIN services sv ON sub.service_id = sv.service_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (status && ['Active', 'Expired', 'Cancelled', 'Renewed'].includes(status)) {
    sql += ` AND sub.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY sub.subscription_id DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ subscriptions: rows });
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const { customer_id, plan_id, service_id, start_date } = req.body ?? {};
  const custId = Number(customer_id);
  const planId = Number(plan_id);
  const svcId = service_id ? Number(service_id) : null;

  if (!Number.isInteger(custId) || custId <= 0 || !Number.isInteger(planId) || planId <= 0) {
    res.status(400).json({ error: 'Valid customer and plan are required.' });
    return;
  }

  const plan = db.prepare('SELECT * FROM plans WHERE plan_id = ?').get(planId) as
    | { plan_id: number; validity_days: number; monthly_fee: number }
    | undefined;
  if (!plan) {
    res.status(404).json({ error: 'Selected plan not found.' });
    return;
  }

  const start = start_date && /^\d{4}-\d{2}-\d{2}$/.test(start_date) ? start_date : new Date().toISOString().slice(0, 10);
  const expiryDateObj = new Date(start + 'T00:00:00Z');
  expiryDateObj.setUTCDate(expiryDateObj.getUTCDate() + plan.validity_days);
  const expiry = expiryDateObj.toISOString().slice(0, 10);

  try {
    const createSubTx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO subscriptions (customer_id, plan_id, service_id, start_date, expiry_date, status)
           VALUES (?, ?, ?, ?, ?, 'Active')`
        )
        .run(custId, planId, svcId, start, expiry);

      return info.lastInsertRowid;
    });

    const newId = createSubTx();
    res.status(201).json({ subscription_id: newId });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/subscriptions/:id/renew', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid subscription ID.' });
    return;
  }

  const sub = db
    .prepare(
      `SELECT sub.*, p.validity_days, p.monthly_fee
       FROM subscriptions sub
       INNER JOIN plans p ON sub.plan_id = p.plan_id
       WHERE sub.subscription_id = ?`
    )
    .get(id) as
    | {
        subscription_id: number;
        customer_id: number;
        expiry_date: string;
        validity_days: number;
        monthly_fee: number;
      }
    | undefined;

  if (!sub) {
    res.status(404).json({ error: 'Subscription not found.' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const baseDate = sub.expiry_date > today ? sub.expiry_date : today;
  const nextExpiry = new Date(baseDate + 'T00:00:00Z');
  nextExpiry.setUTCDate(nextExpiry.getUTCDate() + sub.validity_days);
  const newExpiry = nextExpiry.toISOString().slice(0, 10);

  const renewTx = db.transaction(() => {
    db.prepare(
      `UPDATE subscriptions
       SET start_date = ?, expiry_date = ?, status = 'Renewed'
       WHERE subscription_id = ?`
    ).run(baseDate, newExpiry, id);

    if (req.body?.generate_bill) {
      const billNum = `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const period = baseDate.slice(0, 7);
      const due = new Date(baseDate + 'T00:00:00Z');
      due.setUTCDate(due.getUTCDate() + 15);
      db.prepare(
        `INSERT INTO bills (bill_number, customer_id, subscription_id, billing_period, amount, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Unpaid')`
      ).run(billNum, sub.customer_id, sub.subscription_id, period, sub.monthly_fee, due.toISOString().slice(0, 10));
    }
  });

  renewTx();
  res.json({ success: true, expiry_date: newExpiry });
});

app.patch('/api/subscriptions/:id/status', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  if (!Number.isInteger(id) || id <= 0 || !['Active', 'Expired', 'Cancelled', 'Renewed'].includes(status)) {
    res.status(400).json({ error: 'Invalid subscription ID or status.' });
    return;
  }
  const result = db.prepare('UPDATE subscriptions SET status = ? WHERE subscription_id = ?').run(status, id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Subscription not found.' });
    return;
  }
  res.json({ success: true });
});

// ---------- BILLING & PAYMENTS ----------

app.get('/api/billing', requireAuth, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  let sql = `
    SELECT b.*,
           c.full_name AS customer_name,
           c.email AS customer_email,
           c.phone AS customer_phone,
           COALESCE(SUM(p.amount_paid), 0) AS total_paid,
           MAX(p.payment_mode) AS latest_payment_mode,
           MAX(p.payment_date) AS latest_payment_date
    FROM bills b
    INNER JOIN customers c ON b.customer_id = c.customer_id
    LEFT JOIN payments p ON b.bill_id = p.bill_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (status && ['Paid', 'Unpaid', 'Overdue', 'Partial'].includes(status)) {
    sql += ` AND b.status = ?`;
    params.push(status);
  }

  sql += ` GROUP BY b.bill_id ORDER BY b.bill_id DESC`;

  const bills = db.prepare(sql).all(...params);
  const payments = db
    .prepare(
      `SELECT p.*, b.bill_number, b.billing_period, c.full_name AS customer_name
       FROM payments p
       INNER JOIN bills b ON p.bill_id = b.bill_id
       INNER JOIN customers c ON p.customer_id = c.customer_id
       ORDER BY p.payment_id DESC`
    )
    .all();

  res.json({ bills, payments });
});

app.post('/api/billing', requireAuth, (req, res) => {
  const { customer_id, subscription_id, billing_period, amount, due_date } = req.body ?? {};
  const custId = Number(customer_id);
  const subId = subscription_id ? Number(subscription_id) : null;
  const billAmount = Number(amount);

  if (!Number.isInteger(custId) || custId <= 0 || Number.isNaN(billAmount) || billAmount <= 0) {
    res.status(400).json({ error: 'Valid customer and positive amount are required.' });
    return;
  }
  if (!billing_period?.trim() || !due_date?.trim()) {
    res.status(400).json({ error: 'Billing period and due date are required.' });
    return;
  }

  const billNumber = `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const createBillTx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO bills (bill_number, customer_id, subscription_id, billing_period, amount, due_date, status)
           VALUES (?, ?, ?, ?, ?, ?, 'Unpaid')`
        )
        .run(billNumber, custId, subId, billing_period.trim(), billAmount, due_date.trim());
      return info.lastInsertRowid;
    });

    const billId = createBillTx();
    res.status(201).json({ bill_id: billId, bill_number: billNumber });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/billing/:id/pay', requireAuth, (req, res) => {
  const billId = Number(req.params.id);
  const { amount_paid, payment_mode, notes } = req.body ?? {};
  const amountPaid = Number(amount_paid);

  if (!Number.isInteger(billId) || billId <= 0) {
    res.status(400).json({ error: 'Invalid bill ID.' });
    return;
  }
  if (!['UPI', 'Card', 'Cash'].includes(payment_mode)) {
    res.status(400).json({ error: 'Payment mode must be UPI, Card, or Cash.' });
    return;
  }
  if (Number.isNaN(amountPaid) || amountPaid <= 0) {
    res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    return;
  }

  const bill = db.prepare('SELECT * FROM bills WHERE bill_id = ?').get(billId) as
    | { bill_id: number; customer_id: number; amount: number; status: string }
    | undefined;

  if (!bill) {
    res.status(404).json({ error: 'Bill not found.' });
    return;
  }

  const prefix = payment_mode === 'UPI' ? 'UPI' : payment_mode === 'Card' ? 'CRD' : 'CSH';
  const txRef = `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const payTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO payments (bill_id, customer_id, amount_paid, payment_mode, transaction_ref, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(billId, bill.customer_id, amountPaid, payment_mode, txRef, (notes ?? '').trim());
      // trg_after_payment_insert automatically updates bills.status
    });

    payTx();
    const updatedBill = db.prepare('SELECT * FROM bills WHERE bill_id = ?').get(billId);
    res.status(201).json({ success: true, transaction_ref: txRef, bill: updatedBill });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ---------- SUPPORT TICKETS ----------

app.get('/api/support', requireAuth, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  let sql = `
    SELECT t.*, c.full_name AS customer_name, c.phone AS customer_phone, sv.service_identifier, sv.service_type
    FROM support_tickets t
    INNER JOIN customers c ON t.customer_id = c.customer_id
    LEFT JOIN services sv ON t.service_id = sv.service_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (status && ['Open', 'Pending', 'In Progress', 'Resolved'].includes(status)) {
    sql += ` AND t.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY t.ticket_id DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json({ tickets: rows });
});

app.post('/api/support', requireAuth, (req, res) => {
  const { customer_id, service_id, subject, issue_description, priority } = req.body ?? {};
  const custId = Number(customer_id);
  const svcId = service_id ? Number(service_id) : null;

  if (!Number.isInteger(custId) || custId <= 0 || !subject?.trim() || !issue_description?.trim()) {
    res.status(400).json({ error: 'Customer, subject, and issue description are required.' });
    return;
  }

  const cleanPriority = ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium';

  try {
    const info = db
      .prepare(
        `INSERT INTO support_tickets (customer_id, service_id, subject, issue_description, priority, status)
         VALUES (?, ?, ?, ?, ?, 'Open')`
      )
      .run(custId, svcId, subject.trim(), issue_description.trim(), cleanPriority);

    res.status(201).json({ ticket_id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.patch('/api/support/:id/status', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  if (!Number.isInteger(id) || id <= 0 || !['Open', 'Pending', 'In Progress', 'Resolved'].includes(status)) {
    res.status(400).json({ error: 'Valid ticket ID and status are required.' });
    return;
  }
  const result = db.prepare('UPDATE support_tickets SET status = ? WHERE ticket_id = ?').run(status, id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Support ticket not found.' });
    return;
  }
  res.json({ success: true });
});

app.delete('/api/support/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid ticket ID.' });
    return;
  }
  const result = db.prepare('DELETE FROM support_tickets WHERE ticket_id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Support ticket not found.' });
    return;
  }
  res.json({ success: true });
});

// ---------- REPORTS & DBMS ANALYTICS ----------

app.get('/api/reports', requireAuth, (_req, res) => {
  const totalCustomers = (db.prepare('SELECT COUNT(*) AS count FROM customers').get() as { count: number }).count;
  const totalDataUsage = (
    db.prepare('SELECT COALESCE(SUM(data_used_gb), 0) AS total_gb FROM usage_records').get() as { total_gb: number }
  ).total_gb;
  const totalRevenue = (
    db.prepare('SELECT COALESCE(SUM(amount_paid), 0) AS total_rev FROM payments').get() as { total_rev: number }
  ).total_rev;
  const openTickets = (
    db.prepare("SELECT COUNT(*) AS count FROM support_tickets WHERE status != 'Resolved'").get() as { count: number }
  ).count;

  const monthlyRevenue = db.prepare('SELECT * FROM v_monthly_revenue_stats').all();

  const customerGrowth = db
    .prepare(
      `SELECT substr(created_at, 1, 7) AS month_key,
              COUNT(*) AS new_customers
       FROM customers
       GROUP BY substr(created_at, 1, 7)
       ORDER BY month_key ASC`
    )
    .all();

  const serviceDistribution = db.prepare('SELECT * FROM v_service_distribution').all();

  const paymentByMode = db
    .prepare(
      `SELECT payment_mode, COUNT(*) AS tx_count, COALESCE(SUM(amount_paid), 0) AS total_amount
       FROM payments
       GROUP BY payment_mode
       ORDER BY total_amount DESC`
    )
    .all();

  const billStatusBreakdown = db
    .prepare(
      `SELECT status, COUNT(*) AS bill_count, COALESCE(SUM(amount), 0) AS total_amount
       FROM bills
       GROUP BY status`
    )
    .all();

  // DBMS Showcase Query 1: Subquery (Customers whose total spending exceeds average bill amount)
  const highValueCustomers = db
    .prepare(
      `SELECT c.customer_id, c.full_name, c.city,
              COALESCE(SUM(p.amount_paid), 0) AS total_spent
       FROM customers c
       INNER JOIN payments p ON c.customer_id = p.customer_id
       GROUP BY c.customer_id
       HAVING total_spent > (SELECT COALESCE(AVG(amount), 0) FROM bills)
       ORDER BY total_spent DESC`
    )
    .all();

  // DBMS Showcase Query 2: RIGHT JOIN (All plans including plans with zero or multiple subscriptions)
  const planUtilization = db
    .prepare(
      `SELECT p.plan_id, p.plan_name, p.service_type, p.monthly_fee,
              COUNT(sub.subscription_id) AS subscription_count
       FROM subscriptions sub
       RIGHT JOIN plans p ON sub.plan_id = p.plan_id
       GROUP BY p.plan_id
       ORDER BY subscription_count DESC, p.monthly_fee DESC`
    )
    .all();

  // DBMS Showcase Query 3: View + LEFT JOIN ledger
  const customerLedger = db.prepare('SELECT * FROM v_customer_billing_overview ORDER BY total_billed DESC').all();

  res.json({
    kpis: {
      totalCustomers,
      totalDataUsage: Number(totalDataUsage.toFixed(1)),
      totalRevenue,
      openTickets,
    },
    monthlyRevenue,
    customerGrowth,
    serviceDistribution,
    paymentByMode,
    billStatusBreakdown,
    dbmsAnalytics: {
      highValueCustomers,
      planUtilization,
      customerLedger,
    },
  });
});

// ---------- SERVER STARTUP WITH VITE MIDDLEWARE ----------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CONNECT TELECOM PORTAL running on http://localhost:${PORT}`);
  });
}

startServer();
