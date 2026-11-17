import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createApp } from './app.js';
import { getDatabaseConfig } from './db/connection-config.js';

const { Pool } = pg;
const port = Number(process.env.PORT) || 5000;
const database = new Pool({ ...getDatabaseConfig(), max: 10 });

async function startServer() {
  const schema = await readFile(new URL('./db/schema.sql', import.meta.url), 'utf8');
  await database.query(schema);

  const app = createApp({ database });
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API running at http://localhost:${port}`);
    console.log('PostgreSQL schema is ready.');
  });

  async function stopServer() {
    server.close(async () => {
      await database.end();
      process.exit(0);
    });
  }

  process.once('SIGINT', stopServer);
  process.once('SIGTERM', stopServer);
}

startServer().catch(async (error) => {
  console.error('Backend startup failed:', error.message);
  await database.end();
  process.exitCode = 1;
});
