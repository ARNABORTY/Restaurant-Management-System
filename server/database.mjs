import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

export const recordResources = new Set([
  'residents',
  'units',
  'invoices',
  'maintenance',
  'menu',
  'orders',
  'customers',
]);

const initialSettings = {
  organizationName: 'Northstar Living',
  contactEmail: 'hello@northstarliving.example',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  emailNotifications: true,
  maintenanceAlerts: true,
  darkMode: false,
};

const initialRecords = {
  residents: [
    { name: 'Maya Thompson', unit: 'B-204', property: 'Parkview Heights', lease: 'Active', payment: 'Paid', move: 'Aug 12, 2023', initials: 'MT', tone: 'teal', balance: '₹0.00', email: 'maya@example.com' },
    { name: 'James Wilson', unit: 'A-118', property: 'The Linden', lease: 'Renewal due', payment: 'Due in 3 days', move: 'Jun 04, 2022', initials: 'JW', tone: 'blue', balance: '₹1,240.00', email: 'james@example.com' },
    { name: 'Priya Shah', unit: 'C-307', property: 'Parkview Heights', lease: 'Active', payment: 'Paid', move: 'Jan 19, 2024', initials: 'PS', tone: 'purple', balance: '₹0.00', email: 'priya@example.com' },
    { name: 'Ethan Brooks', unit: 'D-102', property: 'Riverside Lofts', lease: 'Active', payment: 'Processing', move: 'Mar 26, 2024', initials: 'EB', tone: 'orange', balance: '₹860.00', email: 'ethan@example.com' },
  ],
  units: [
    { label: 'Occupied', value: 184, total: 212, tone: 'occupied' },
    { label: 'Available', value: 18, total: 212, tone: 'available' },
    { label: 'Maintenance', value: 6, total: 212, tone: 'maintenance' },
    { label: 'Notice given', value: 4, total: 212, tone: 'notice' },
  ],
  invoices: [
    { label: 'September rent roll', detail: 'Due Sep 01 · 212 units', amount: '₹145,200', status: '84% collected' },
    { label: 'Utility reimbursements', detail: 'Due Sep 15 · 48 residents', amount: '₹9,840', status: '76% collected' },
  ],
  maintenance: [
    { id: 'MT-2048', title: 'Kitchen sink leaking', unit: 'B-204', priority: 'High', status: 'Assigned', assignee: 'Caleb R.', age: '22m ago' },
    { id: 'MT-2047', title: 'AC not cooling', unit: 'A-118', priority: 'Urgent', status: 'In progress', assignee: 'Northstar HVAC', age: '1h ago' },
    { id: 'MT-2043', title: 'Replace hallway light', unit: 'C-307', priority: 'Normal', status: 'New', assignee: 'Unassigned', age: '3h ago' },
  ],
  menu: [
    { name: 'Garden herb toast', description: 'Sourdough, whipped ricotta, herbs and lemon oil', price: '₹999', category: 'Starters', image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=640&q=85' },
    { name: 'Crispy cauliflower bites', description: 'Spiced cauliflower, yogurt dip and coriander', price: '₹899', category: 'Starters', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=640&q=85' },
    { name: 'Avocado quinoa salad', description: 'Quinoa, avocado, greens, cucumber and lemon dressing', price: '₹1,099', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Grilled chicken protein bowl', description: 'Grilled chicken, brown rice, greens and hummus', price: '₹1,399', category: 'Healthy choices', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=85' },
    { name: 'Crispy chicken burger', description: 'Spiced chicken, lettuce, tomato and house sauce', price: '₹1,199', category: 'Fast food', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=85' },
    { name: 'Margherita pizza', description: 'Tomato, fresh mozzarella, basil and olive oil', price: '₹1,249', category: 'Pizzas', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=640&q=85' },
    { name: 'Watermelon cooler', description: 'Fresh watermelon, lime, mint and ice', price: '₹449', category: 'Drinks', image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=640&q=85' },
    { name: 'Samosa platter', description: 'Crisp vegetable samosas with mint and tamarind chutney', price: '₹649', category: 'Snacks', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=85' },
  ],
  orders: [
    { id: '#1048', customer: 'Maya Thompson', table: 'Table 12', items: '3 items', total: '₹5,699', status: 'Preparing', time: '12 min ago' },
    { id: '#1047', customer: 'James Wilson', table: 'Takeaway', items: '2 items', total: '₹3,499', status: 'Ready', time: '18 min ago' },
    { id: '#1046', customer: 'Priya Shah', table: 'Table 04', items: '5 items', total: '₹9,999', status: 'Completed', time: '31 min ago' },
  ],
  customers: [
    { name: 'Maya Thompson', email: 'maya.thompson@email.com', phone: '+1 (555) 014-2048', visits: 18, lifetimeSpend: '₹1,284', favoriteTable: '12', favoriteItem: 'Salmon bowl' },
  ],
};

export function hashPassword(password, salt = randomUUID()) {
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString('hex'),
  };
}

export function verifyPassword(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function initializeDatabase(db, { adminEmail, adminPassword, adminName = 'Workspace Admin' } = {}) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS records (
      resource TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (resource, id)
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      record_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS records_resource_idx ON records(resource);
    CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_events(created_at);
  `);

  const now = new Date().toISOString();
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    if (!adminEmail || !adminPassword || adminPassword.length < 12) {
      throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD with at least 12 characters before starting the API.');
    }

    const credentials = hashPassword(adminPassword);
    db.prepare(`
      INSERT INTO users (id, email, name, role, password_salt, password_hash, active, created_at)
      VALUES (?, ?, ?, 'admin', ?, ?, 1, ?)
    `).run(randomUUID(), adminEmail.trim().toLowerCase(), adminName, credentials.salt, credentials.hash, now);
  }

  const settingInsert = db.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
  for (const [key, value] of Object.entries(initialSettings)) {
    settingInsert.run(key, JSON.stringify(value), now);
  }

  const recordInsert = db.prepare('INSERT OR IGNORE INTO records (resource, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
  for (const [resource, records] of Object.entries(initialRecords)) {
    records.forEach((record, index) => {
      const id = record.id ?? `${resource}-${index + 1}`;
      const data = { ...record, id };
      recordInsert.run(resource, id, JSON.stringify(data), now, now);
    });
  }
}

export function writeAuditEvent(db, actorId, action, resource, recordId = null) {
  db.prepare(`
    INSERT INTO audit_events (id, actor_id, action, resource, record_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), actorId, action, resource, recordId, new Date().toISOString());
}
