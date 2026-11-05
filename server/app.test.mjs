import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from './app.mjs';
import { initializeDatabase } from './database.mjs';

const database = new DatabaseSync(':memory:');
initializeDatabase(database, {
  adminEmail: 'admin@example.com',
  adminPassword: 'a-strong-test-password',
});
const server = createApp(database, { secureCookies: false }).listen(0);
let baseUrl;
let adminCookie;

before(async () => {
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  database.close();
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers ?? {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
  });
}

test('requires authentication before reading application data', async () => {
  const response = await request('/api/data/residents');
  assert.equal(response.status, 401);
});

test('logs in with configured credentials and returns a secure session cookie', async () => {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'a-strong-test-password' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, 'admin');
  adminCookie = response.headers.get('set-cookie').split(';')[0];
  assert.match(adminCookie, /^rms_session=/);
  assert.equal(response.headers.get('set-cookie').toLowerCase().includes('httponly'), true);
});

test('persists settings and refuses writes from staff roles', async () => {
  const update = await request('/api/settings', {
    method: 'PUT',
    cookie: adminCookie,
    body: JSON.stringify({ organizationName: 'Willow Group' }),
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).organizationName, 'Willow Group');

  const created = await request('/api/admin/users', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      email: 'manager@example.com',
      name: 'Branch Manager',
      password: 'a-different-test-password',
      role: 'manager',
    }),
  });
  assert.equal(created.status, 201);
  const manager = await created.json();
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: manager.email, password: 'a-different-test-password' }),
  });
  const managerCookie = login.headers.get('set-cookie').split(';')[0];
  const managerSettings = await request('/api/settings', {
    method: 'PUT',
    cookie: managerCookie,
    body: JSON.stringify({ organizationName: 'Manager Approved Group' }),
  });
  assert.equal(managerSettings.status, 200);

  const staffResponse = await request('/api/admin/users', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      email: 'staff@example.com',
      name: 'Workspace Staff',
      password: 'a-third-test-password-2026',
      role: 'staff',
    }),
  });
  assert.equal(staffResponse.status, 201);
  const staff = await staffResponse.json();
  const staffLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: staff.email, password: 'a-third-test-password-2026' }),
  });
  const staffCookie = staffLogin.headers.get('set-cookie').split(';')[0];
  const denied = await request('/api/settings', {
    method: 'PUT',
    cookie: staffCookie,
    body: JSON.stringify({ organizationName: 'Not allowed' }),
  });
  assert.equal(denied.status, 403);

  const order = await request('/api/data/orders', {
    method: 'POST',
    cookie: staffCookie,
    body: JSON.stringify({ customer: 'Guest', table: 'Takeaway', items: '2 items', total: '₹1,200', status: 'Received' }),
  });
  assert.equal(order.status, 201);
  const createdOrder = await order.json();
  const orderUpdate = await request(`/api/data/orders/${createdOrder.id}`, {
    method: 'PATCH',
    cookie: staffCookie,
    body: JSON.stringify({ status: 'Preparing' }),
  });
  assert.equal(orderUpdate.status, 200);

  const ticket = await request('/api/data/maintenance', {
    method: 'POST',
    cookie: staffCookie,
    body: JSON.stringify({ title: 'Replace a light', unit: 'C-307', priority: 'Normal', status: 'New', assignee: 'Unassigned' }),
  });
  assert.equal(ticket.status, 201);
  const createdTicket = await ticket.json();
  const ticketUpdate = await request(`/api/data/maintenance/${createdTicket.id}`, {
    method: 'PATCH',
    cookie: staffCookie,
    body: JSON.stringify({ status: 'Assigned' }),
  });
  assert.equal(ticketUpdate.status, 200);

  const deniedInvoice = await request('/api/data/invoices', {
    method: 'POST',
    cookie: staffCookie,
    body: JSON.stringify({ label: 'New invoice', detail: 'Due today', amount: '₹500', status: '0% collected' }),
  });
  assert.equal(deniedInvoice.status, 403);
});

test('persists and validates records', async () => {
  const created = await request('/api/data/residents', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      name: 'Avery Morgan',
      unit: 'B-204',
      property: 'Parkview Heights',
      email: 'avery@example.com',
    }),
  });
  assert.equal(created.status, 201);
  const resident = await created.json();
  const listed = await request('/api/data/residents', { cookie: adminCookie });
  assert.equal((await listed.json()).some((entry) => entry.id === resident.id), true);

  const invalid = await request('/api/data/residents', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({ name: 'Bad email', unit: 'C-1', property: 'House', email: 'invalid' }),
  });
  assert.equal(invalid.status, 400);

  const invoice = await request('/api/data/invoices', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({ label: 'October rent roll', detail: 'Due Oct 01 · 212 units', amount: '₹145,200', status: '0% collected' }),
  });
  assert.equal(invoice.status, 201);

  const customer = await request('/api/data/customers', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({ name: 'Avery Morgan', email: 'avery@example.com', phone: '+1 555 0100', visits: 0, lifetimeSpend: '₹0', favoriteTable: '—', favoriteItem: '—' }),
  });
  assert.equal(customer.status, 201);
  const createdCustomer = await customer.json();
  const updateCustomer = await request(`/api/data/customers/${createdCustomer.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: JSON.stringify({ phone: '+1 555 0101' }),
  });
  assert.equal(updateCustomer.status, 200);
});

test('prevents removal of the final active administrator', async () => {
  const users = await request('/api/admin/users', { cookie: adminCookie });
  const admin = (await users.json()).find((user) => user.role === 'admin');
  const update = await request(`/api/admin/users/${admin.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: JSON.stringify({ active: false }),
  });
  assert.equal(update.status, 400);
});
