import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { getDatabaseConfig } from '../db/connection-config.js';

const { Pool } = pg;
const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('Usage: npm run reset-admin-password -- admin@example.org');
  process.exitCode = 1;
} else {
  const database = new Pool(getDatabaseConfig());
  try {
    const newPassword = randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const result = await database.query(
      `UPDATE users SET password_hash = $1
       WHERE email = $2 AND role = 'ngo_admin'
       RETURNING email`,
      [passwordHash, email],
    );
    if (!result.rowCount) throw new Error('No NGO Admin account exists for that email.');
    console.log('Admin password reset. Save this password privately; it will not be shown again.');
    console.log(`Login email: ${result.rows[0].email}`);
    console.log(`New login password: ${newPassword}`);
  } catch (error) {
    console.error('Could not reset admin password:', error.message);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}
