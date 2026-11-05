import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import { recordResources, verifyPassword, hashPassword, writeAuditEvent } from './database.mjs';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const RESOURCE_FIELDS = {
  residents: ['name', 'unit', 'property', 'lease', 'payment', 'move', 'initials', 'tone', 'balance', 'email'],
  units: ['label', 'value', 'total', 'tone'],
  invoices: ['label', 'detail', 'amount', 'status'],
  maintenance: ['title', 'unit', 'priority', 'status', 'assignee', 'age'],
  menu: ['name', 'description', 'price', 'category', 'image'],
  orders: ['customer', 'table', 'items', 'total', 'status', 'time'],
  customers: ['name', 'email', 'phone', 'visits', 'lifetimeSpend', 'favoriteTable', 'favoriteItem'],
};
const editableSettings = new Set([
  'organizationName',
  'contactEmail',
  'currency',
  'timezone',
  'emailNotifications',
  'maintenanceAlerts',
  'darkMode',
]);

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function getCookie(request, name) {
  const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function sendError(response, status, message) {
  response.status(status).json({ error: message });
}

function validateRecord(resource, record, { partial = false } = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return 'Request body must be an object.';
  const allowedFields = RESOURCE_FIELDS[resource];
  if (Object.keys(record).some((field) => !allowedFields.includes(field))) return 'Request contains an unsupported field.';
  const requiredFields = {
    residents: ['name', 'unit', 'property', 'email'],
    units: ['label', 'value', 'total', 'tone'],
    invoices: ['label', 'detail', 'amount', 'status'],
    maintenance: ['title', 'unit', 'priority', 'status', 'assignee'],
    menu: ['name', 'description', 'price', 'category'],
    orders: ['customer', 'table', 'items', 'total', 'status'],
    customers: ['name', 'email', 'phone'],
  }[resource];

  if (!partial && requiredFields.some((field) => record[field] === undefined || record[field] === null || record[field] === '')) {
    return 'Complete all required fields.';
  }
  for (const [field, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.length > 2000) return `${field} is too long.`;
    if (typeof value === 'number' && !Number.isFinite(value)) return `${field} must be a finite number.`;
    if (!['string', 'number', 'boolean'].includes(typeof value)) return `${field} has an invalid value.`;
  }
  if (resource === 'residents' && record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) return 'Enter a valid resident email.';
  if (resource === 'customers' && record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) return 'Enter a valid customer email.';
  if (resource === 'maintenance' && record.priority && !['Normal', 'High', 'Urgent'].includes(record.priority)) return 'Priority is invalid.';
  if (resource === 'maintenance' && record.status && !['New', 'Assigned', 'In progress', 'Resolved'].includes(record.status)) return 'Maintenance status is invalid.';
  if (resource === 'orders' && record.status && !['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'].includes(record.status)) return 'Order status is invalid.';
  return null;
}

export function createApp(db, { secureCookies = process.env.NODE_ENV === 'production' } = {}) {
  const app = express();
  const failedLogins = new Map();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const authenticate = (request, response, next) => {
    const token = getCookie(request, 'rms_session');
    if (!token) return sendError(response, 401, 'Sign in is required.');

    const session = db.prepare(`
      SELECT users.id, users.email, users.name, users.role, users.active, sessions.expires_at
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
    `).get(hashToken(token));
    if (!session || session.expires_at <= Date.now() || !session.active) {
      if (session) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
      response.clearCookie('rms_session', { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' });
      return sendError(response, 401, 'Your session has expired. Sign in again.');
    }

    request.user = { id: session.id, email: session.email, name: session.name, role: session.role };
    next();
  };

  const requireManager = (request, response, next) => {
    if (!['admin', 'manager'].includes(request.user.role)) return sendError(response, 403, 'Manager access is required.');
    next();
  };
  const requireAdmin = (request, response, next) => {
    if (request.user.role !== 'admin') return sendError(response, 403, 'Administrator access is required.');
    next();
  };

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

  app.post('/api/auth/login', (request, response) => {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    const now = Date.now();
    const address = request.ip;
    const attempt = failedLogins.get(address) ?? { count: 0, resetAt: now + 15 * 60 * 1000 };
    if (attempt.resetAt <= now) {
      attempt.count = 0;
      attempt.resetAt = now + 15 * 60 * 1000;
    }
    if (attempt.count >= 10) return sendError(response, 429, 'Too many sign-in attempts. Try again in 15 minutes.');

    const user = db.prepare(`
      SELECT id, email, name, role, password_salt, password_hash, active FROM users WHERE email = ?
    `).get(email);
    if (!user || !user.active || !password || !verifyPassword(password, user.password_salt ?? 'invalid', user.password_hash ?? '')) {
      attempt.count += 1;
      failedLogins.set(address, attempt);
      return sendError(response, 401, 'Email or password is incorrect.');
    }

    failedLogins.delete(address);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = now + SESSION_TTL_MS;
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), user.id, expiresAt);
    response.cookie('rms_session', token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS,
    });
    writeAuditEvent(db, user.id, 'login', 'auth');
    response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.get('/api/auth/me', authenticate, (request, response) => response.json({ user: request.user }));

  app.post('/api/auth/logout', authenticate, (request, response) => {
    const token = getCookie(request, 'rms_session');
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    writeAuditEvent(db, request.user.id, 'logout', 'auth');
    response.clearCookie('rms_session', { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' });
    response.status(204).end();
  });

  app.get('/api/settings', authenticate, (_request, response) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    response.json(Object.fromEntries(rows.map(({ key, value }) => [key, JSON.parse(value)])));
  });

  app.put('/api/settings', authenticate, requireManager, (request, response) => {
    const settings = request.body;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return sendError(response, 400, 'Settings must be an object.');
    const entries = Object.entries(settings);
    if (entries.length === 0 || entries.some(([key]) => !editableSettings.has(key))) return sendError(response, 400, 'Settings contain an unsupported field.');
    const current = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(({ key, value }) => [key, JSON.parse(value)]));
    const next = { ...current, ...settings };
    if (typeof next.organizationName !== 'string' || next.organizationName.trim().length < 2 || next.organizationName.length > 100) return sendError(response, 400, 'Organization name must be between 2 and 100 characters.');
    if (typeof next.contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.contactEmail)) return sendError(response, 400, 'Enter a valid contact email.');
    if (!['INR', 'USD', 'EUR', 'GBP'].includes(next.currency)) return sendError(response, 400, 'Currency is not supported.');
    if (typeof next.timezone !== 'string' || next.timezone.length > 100) return sendError(response, 400, 'Time zone is invalid.');
    for (const key of ['emailNotifications', 'maintenanceAlerts', 'darkMode']) {
      if (typeof next[key] !== 'boolean') return sendError(response, 400, `${key} must be true or false.`);
    }
    const upsert = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
    const timestamp = new Date().toISOString();
    db.exec('BEGIN');
    try {
      for (const [key, value] of Object.entries(next)) upsert.run(key, JSON.stringify(value), timestamp);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    writeAuditEvent(db, request.user.id, 'update', 'settings');
    response.json(next);
  });

  app.get('/api/admin/users', authenticate, requireAdmin, (_request, response) => {
    const users = db.prepare('SELECT id, email, name, role, active, created_at AS createdAt FROM users ORDER BY name').all();
    response.json(users.map((user) => ({ ...user, active: Boolean(user.active) })));
  });

  app.get('/api/admin/audit', authenticate, requireAdmin, (request, response) => {
    const requestedLimit = Number(request.query.limit ?? 50);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) return sendError(response, 400, 'Audit limit must be between 1 and 100.');
    const events = db.prepare(`
      SELECT audit_events.id, users.name AS actor, audit_events.action, audit_events.resource,
        audit_events.record_id AS recordId, audit_events.created_at AS createdAt
      FROM audit_events LEFT JOIN users ON users.id = audit_events.actor_id
      ORDER BY audit_events.created_at DESC LIMIT ?
    `).all(requestedLimit);
    response.json(events);
  });

  app.post('/api/admin/users', authenticate, requireAdmin, (request, response) => {
    const { email, name, password, role } = request.body ?? {};
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof name !== 'string' || name.trim().length < 2 || name.length > 100 ||
      typeof password !== 'string' || password.length < 12 ||
      !['admin', 'manager', 'staff'].includes(role)) {
      return sendError(response, 400, 'Provide a valid email, name, role, and a password of at least 12 characters.');
    }

    const credentials = hashPassword(password);
    const id = randomBytes(16).toString('hex');
    try {
      db.prepare(`
        INSERT INTO users (id, email, name, role, password_salt, password_hash, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(id, email.trim().toLowerCase(), name.trim(), role, credentials.salt, credentials.hash, new Date().toISOString());
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendError(response, 409, 'A user with that email already exists.');
      throw error;
    }
    writeAuditEvent(db, request.user.id, 'create', 'users', id);
    response.status(201).json({ id, email: email.trim().toLowerCase(), name: name.trim(), role, active: true });
  });

  app.patch('/api/admin/users/:id', authenticate, requireAdmin, (request, response) => {
    const user = db.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(request.params.id);
    if (!user) return sendError(response, 404, 'User not found.');
    const updates = request.body ?? {};
    if (Object.keys(updates).length !== 1 || !['role', 'active'].includes(Object.keys(updates)[0])) return sendError(response, 400, 'Update one supported user field at a time.');
    if (updates.role !== undefined && !['admin', 'manager', 'staff'].includes(updates.role)) return sendError(response, 400, 'Role is invalid.');
    if (updates.active !== undefined && typeof updates.active !== 'boolean') return sendError(response, 400, 'Active must be true or false.');
    if (user.id === request.user.id && (updates.active === false || (updates.role && updates.role !== 'admin'))) return sendError(response, 400, 'You cannot remove your own administrator access.');

    const nextRole = updates.role ?? user.role;
    const nextActive = updates.active ?? Boolean(user.active);
    if (user.role === 'admin' && user.active && (nextRole !== 'admin' || !nextActive)) {
      const admins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND active = 1").get().count;
      if (admins <= 1) return sendError(response, 400, 'The last active administrator cannot be removed or deactivated.');
    }
    db.prepare('UPDATE users SET role = ?, active = ? WHERE id = ?').run(nextRole, Number(nextActive), user.id);
    if (!nextActive) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    writeAuditEvent(db, request.user.id, 'update', 'users', user.id);
    response.json({ ...user, role: nextRole, active: nextActive });
  });

  app.get('/api/data/:resource', authenticate, (request, response) => {
    const { resource } = request.params;
    if (!recordResources.has(resource)) return sendError(response, 404, 'Data collection not found.');
    const rows = db.prepare('SELECT data FROM records WHERE resource = ? ORDER BY created_at, id').all(resource);
    response.json(rows.map(({ data }) => JSON.parse(data)));
  });

  app.post('/api/data/:resource', authenticate, (request, response) => {
    const { resource } = request.params;
    if (!recordResources.has(resource)) return sendError(response, 404, 'Data collection not found.');
    if (request.user.role === 'staff' && !['orders', 'maintenance'].includes(resource)) return sendError(response, 403, 'Manager access is required to change this collection.');
    const validationError = validateRecord(resource, request.body);
    if (validationError) return sendError(response, 400, validationError);
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const record = { ...request.body, id };
    db.prepare('INSERT INTO records (resource, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(resource, id, JSON.stringify(record), now, now);
    writeAuditEvent(db, request.user.id, 'create', resource, id);
    response.status(201).json(record);
  });

  app.patch('/api/data/:resource/:id', authenticate, (request, response) => {
    const { resource, id } = request.params;
    if (!recordResources.has(resource)) return sendError(response, 404, 'Data collection not found.');
    if (request.user.role === 'staff' &&
      (!['orders', 'maintenance'].includes(resource) || Object.keys(request.body ?? {}).length !== 1 || !Object.hasOwn(request.body ?? {}, 'status'))) {
      return sendError(response, 403, 'Staff can only update order and maintenance statuses.');
    }
    const existing = db.prepare('SELECT data FROM records WHERE resource = ? AND id = ?').get(resource, id);
    if (!existing) return sendError(response, 404, 'Record not found.');
    const patch = request.body;
    const validationError = validateRecord(resource, patch, { partial: true });
    if (validationError) return sendError(response, 400, validationError);
    const record = { ...JSON.parse(existing.data), ...patch, id };
    const completeValidationError = validateRecord(resource, Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'id')));
    if (completeValidationError) return sendError(response, 400, completeValidationError);
    db.prepare('UPDATE records SET data = ?, updated_at = ? WHERE resource = ? AND id = ?')
      .run(JSON.stringify(record), new Date().toISOString(), resource, id);
    writeAuditEvent(db, request.user.id, 'update', resource, id);
    response.json(record);
  });

  app.delete('/api/data/:resource/:id', authenticate, (request, response) => {
    if (request.user.role !== 'admin') return sendError(response, 403, 'Administrator access is required to delete records.');
    const { resource, id } = request.params;
    if (!recordResources.has(resource)) return sendError(response, 404, 'Data collection not found.');
    const result = db.prepare('DELETE FROM records WHERE resource = ? AND id = ?').run(resource, id);
    if (result.changes === 0) return sendError(response, 404, 'Record not found.');
    writeAuditEvent(db, request.user.id, 'delete', resource, id);
    response.status(204).end();
  });

  app.use((error, _request, response, _next) => {
    console.error('API request failed:', error);
    if (response.headersSent) return;
    sendError(response, 500, 'The server could not complete the request.');
  });

  return app;
}
