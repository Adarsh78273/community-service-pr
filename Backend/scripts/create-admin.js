import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

async function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run npm run create-admin directly in an interactive PowerShell window.');
  }
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (data) => {
      const key = data.toString('utf8');
      if (key === '\u0003') return finish(new Error('Setup cancelled.'));
      if (key === '\r' || key === '\n') return finish();
      if (key === '\u0008' || key === '\u007f') value = value.slice(0, -1);
      else if (!key.startsWith('\u001b')) value += key;
    };
    stdin.on('data', onData);
  });
}

async function createAdmin() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  let name;
  let email;
  try {
    name = (await rl.question('NGO Admin name: ')).trim();
    email = (await rl.question('NGO Admin email: ')).trim().toLowerCase();
  } finally {
    rl.close();
  }
  if (!name || name.length > 100) throw new Error('Name is required and must be 100 characters or fewer.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.');

  // DATABASE_URL targets a hosted database; without it, use local PostgreSQL.
  const hostedDatabaseUrl = process.env.DATABASE_URL?.trim();
  let databaseConfig;
  let databasePassword;
  if (hostedDatabaseUrl) {
    databaseConfig = { connectionString: hostedDatabaseUrl, connectionTimeoutMillis: 10000 };
  } else {
    databasePassword = await readHidden('Current PostgreSQL password for user postgres (input hidden): ');
    if (!databasePassword) throw new Error('PostgreSQL password cannot be empty.');
    databaseConfig = {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: databasePassword,
      database: 'ngo_connect',
      connectionTimeoutMillis: 5000,
    };
  }
  const database = new Pool(databaseConfig);

  const adminPassword = randomBytes(24).toString('base64url');
  try {
    await database.query('SELECT 1');
    const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
    await database.query(schema);

    if (!hostedDatabaseUrl) {
      const envLines = [
        'PORT=5000',
        'FRONTEND_URL=http://localhost:5173',
        'PGHOST=localhost',
        'PGPORT=5432',
        'PGUSER=postgres',
        `PGPASSWORD_BASE64=${Buffer.from(databasePassword, 'utf8').toString('base64')}`,
        'PGDATABASE=ngo_connect',
        `JWT_SECRET=${randomBytes(32).toString('hex')}`,
        'COOKIE_SAME_SITE=lax',
        'NODE_ENV=development',
        '',
      ];
      await writeFile(new URL('../.env', import.meta.url), envLines.join('\n'), { encoding: 'utf8' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const result = await database.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'ngo_admin')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email, role`,
      [randomUUID(), name, email, passwordHash],
    );
    if (!result.rowCount) throw new Error('That email already exists. Ask the project owner to reset its access.');

    console.log('\nNGO Admin created successfully. Save this password privately; it will not be shown again.');
    console.log(`Login email: ${result.rows[0].email}`);
    console.log(`Login password: ${adminPassword}`);
    if (!hostedDatabaseUrl) console.log('\nBackend/.env was configured for local PostgreSQL.');
  } finally {
    await database.end();
  }
}

createAdmin().catch((error) => {
  if (error.code === '28P01' || error.message.includes('SASL')) {
    console.error('PostgreSQL rejected that password. Enter the current password that works in psql.');
  } else if (error.code === 'ECONNREFUSED') {
    console.error(process.env.DATABASE_URL
      ? 'Could not connect to the hosted PostgreSQL database. Check DATABASE_URL and network access.'
      : 'PostgreSQL is not running at localhost:5432.');
  } else {
    console.error('Could not create NGO Admin:', error.message);
  }
  process.exitCode = 1;
});
