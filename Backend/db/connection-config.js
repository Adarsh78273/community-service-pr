export function getDatabaseConfig(environment = process.env) {
  const host = environment.PGHOST?.trim();
  const user = environment.PGUSER?.trim();
  const encodedPassword = environment.PGPASSWORD_BASE64;
  const password = encodedPassword
    ? Buffer.from(encodedPassword, 'base64').toString('utf8')
    : environment.PGPASSWORD;
  const database = environment.PGDATABASE?.trim();

  // Direct fields avoid URL encoding problems with PostgreSQL passwords.
  if (host || user || password !== undefined || database) {
    if (!host || !user || typeof password !== 'string' || !password || !database) {
      throw new Error('Set PGHOST, PGUSER, PGPASSWORD or PGPASSWORD_BASE64, and PGDATABASE in Backend/.env.');
    }
    const port = Number(environment.PGPORT || 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('PGPORT must be a valid port number.');
    }
    return { host, port, user, password, database, connectionTimeoutMillis: 5000 };
  }

  const connectionString = environment.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('Database settings are missing. Set PostgreSQL connection fields in Backend/.env.');
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol) || !parsedUrl.password) {
    throw new Error('DATABASE_URL must use PostgreSQL and include its password.');
  }
  return { connectionString, connectionTimeoutMillis: 5000 };
}
