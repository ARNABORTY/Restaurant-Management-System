# Havenly Resident Operations

Havenly is an Angular operations dashboard with an Express API and SQLite persistence. The current app supports resident, unit, invoice, maintenance, menu, and order records, workspace preferences, local staff accounts, role-based access, and an administrator activity log.

## Requirements

- Node.js 24 or newer (uses the built-in `node:sqlite` module)
- npm 11 or newer

## Local setup

1. Copy `.env.example` to `.env` and set a unique administrator password of at least 12 characters. The first API start creates that admin account and the local sample data.
2. Start the API in one terminal:

   ```bash
   npm run start:api
   ```

3. Start the Angular app in another terminal:

   ```bash
   npm start
   ```

4. Open `http://localhost:4200`. Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `.env`.

The API listens on port 3000 by default. Angular proxies `/api` requests to it. SQLite data is stored in `data/havenly.sqlite` by default; both `.env` and `data/` are excluded from version control. To reset the local sample workspace, stop the API and remove that specific database file.

## API overview

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/settings`, `PUT /api/settings`
- `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id`
- `GET /api/admin/audit`
- `GET/POST /api/data/:resource`, `PATCH/DELETE /api/data/:resource/:id`
- `GET /api/health`

Supported record resources are `residents`, `units`, `invoices`, `maintenance`, `menu`, `orders`, and `customers`. Admins manage accounts and audit activity; admins and managers can change workspace settings and operational records; staff accounts are read-only.

Authentication uses expiring server-side sessions in HttpOnly, SameSite cookies. Passwords are stored as salted scrypt hashes. Admins manage accounts, audit activity, and record deletion; admins and managers can change workspace settings and operational records; staff can create orders and maintenance requests and update their statuses. Configure the initial admin through environment variables; never commit `.env` or use sample credentials in production.

## Validation

```bash
npm run build
npm test -- --watch=false
npm run test:server
```

## Scope note

This backend supports the screens and workflows currently present in the app. It is not yet the full multi-branch POS/KDS, payments, inventory, reservations, and offline-sync platform described in `docs/RMS-SYSTEM-SPEC.md`; those need additional product phases and infrastructure.
