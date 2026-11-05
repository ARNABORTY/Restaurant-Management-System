import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from './app.mjs';
import { initializeDatabase } from './database.mjs';

const databasePath = resolve(process.env.DATABASE_PATH ?? 'data/havenly.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
initializeDatabase(database, {
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminName: process.env.ADMIN_NAME ?? 'Workspace Admin',
});

const port = Number(process.env.API_PORT ?? 3000);
const app = createApp(database);
const server = app.listen(port, () => {
  console.log(`Havenly API listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
