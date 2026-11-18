import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SESSION_COOKIE = 'ngo_session';
const TOKEN_LIFETIME_MS = 8 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cookieOptions() {
  const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: TOKEN_LIFETIME_MS,
  };
}

function sendUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateEvent(body, partial = false) {
  const fields = ['title', 'description', 'date', 'time', 'location', 'capacity'];
  const values = {};

  for (const field of fields) {
    if (partial && body[field] === undefined) continue;
    values[field] = field === 'capacity' && body[field] === undefined ? 30 : body[field];
  }

  if ('title' in values && (typeof values.title !== 'string' || !values.title.trim() || values.title.length > 150)) {
    return { error: 'Title is required and must be 150 characters or fewer.' };
  }
  if ('description' in values && (typeof values.description !== 'string' || !values.description.trim())) {
    return { error: 'Description is required.' };
  }
  if ('date' in values && !isValidDate(values.date)) return { error: 'Date must be a valid YYYY-MM-DD date.' };
  if ('time' in values && (typeof values.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time))) {
    return { error: 'Time must use the HH:MM format.' };
  }
  if ('location' in values && (typeof values.location !== 'string' || !values.location.trim() || values.location.length > 200)) {
    return { error: 'Location is required and must be 200 characters or fewer.' };
  }
  if ('capacity' in values && (!Number.isInteger(Number(values.capacity)) || Number(values.capacity) < 1)) {
    return { error: 'Capacity must be a positive whole number.' };
  }
  if ('status' in body && !['draft', 'live', 'closed'].includes(body.status)) {
    return { error: 'Status must be draft, live, or closed.' };
  }

  return { values };
}

export function createApp({ database, jwtSecret = process.env.JWT_SECRET }) {
  if (!database) throw new Error('A PostgreSQL database pool is required.');
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');

  const app = express();
  const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  const tokenOptions = { issuer: 'ngo-connect-api', audience: 'ngo-connect-frontend' };
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Wait 15 minutes and try again.' },
  });

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }));
  app.use((request, response, next) => {
    const origin = request.get('origin');
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (!safeMethod && origin && origin !== frontendOrigin) {
      return response.status(403).json({ message: 'This browser origin is not allowed.' });
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  async function requireAuth(request, response, next) {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return response.status(401).json({ message: 'Sign in to continue.' });

    try {
      const payload = jwt.verify(token, jwtSecret, { ...tokenOptions, algorithms: ['HS256'] });
      request.authUserId = payload.sub;
    } catch {
      response.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
      return response.status(401).json({ message: 'Your session expired. Please sign in again.' });
    }

    const result = await database.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [request.authUserId],
    );
    if (!result.rowCount) {
      response.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
      return response.status(401).json({ message: 'This account is no longer available.' });
    }
    request.user = result.rows[0];
    next();
  }

  function requireRole(...roles) {
    return (request, response, next) => {
      if (!request.user || !roles.includes(request.user.role)) {
        return response.status(403).json({ message: 'You do not have permission to do that.' });
      }
      next();
    };
  }

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/health/database', async (_request, response) => {
    try {
      await database.query('SELECT 1');
      response.json({ status: 'ok', database: 'connected' });
    } catch {
      response.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  app.post('/api/auth/register', authLimiter, async (request, response) => {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = request.body?.password;

    if (!name || name.length > 100) return response.status(400).json({ message: 'Name is required and must be 100 characters or fewer.' });
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return response.status(400).json({ message: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return response.status(400).json({ message: 'Password must contain between 8 and 72 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const result = await database.query(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'volunteer')
         RETURNING id, name, email, role`,
        [randomUUID(), name, email, passwordHash],
      );
      response.status(201).json({ user: sendUser(result.rows[0]) });
    } catch (error) {
      if (error.code === '23505') return response.status(409).json({ message: 'An account with this email already exists.' });
      throw error;
    }
  });

  app.post('/api/auth/login', authLimiter, async (request, response) => {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = request.body?.password;
    if (!email || typeof password !== 'string') return response.status(400).json({ message: 'Email and password are required.' });

    const result = await database.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    const validPassword = user && await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return response.status(401).json({ message: 'Incorrect email or password.' });

    const token = jwt.sign({ sub: user.id }, jwtSecret, { ...tokenOptions, algorithm: 'HS256', expiresIn: '8h' });
    response.cookie(SESSION_COOKIE, token, cookieOptions());
    response.json({ user: sendUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (request, response) => {
    response.json({ user: sendUser(request.user) });
  });

  app.post('/api/auth/logout', (_request, response) => {
    response.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
    response.status(204).end();
  });

  app.get('/api/events', requireAuth, async (request, response) => {
    const values = [];
    let where = "status = 'live'";
    if (request.user.role === 'ngo_admin') {
      values.push(request.user.id);
      where = 'owner_id = $1';
    } else {
      values.push(request.user.id);
      where = "status = 'live' OR id IN (SELECT event_id FROM registrations WHERE volunteer_id = $1)";
    }
    const result = await database.query(
      `SELECT id, title, description, to_char(date, 'YYYY-MM-DD') AS date,
              to_char(time, 'HH24:MI') AS time, location, capacity, status,
              qr_token AS "qrToken", qr_updated_at AS "qrUpdatedAt"
       FROM events WHERE ${where} ORDER BY date, time`,
      values,
    );
    const counts = await database.query(
      'SELECT event_id AS "eventId", COUNT(*)::int AS total FROM registrations GROUP BY event_id',
    );
    const countByEventId = new Map(counts.rows.map((row) => [row.eventId, row.total]));
    response.json(result.rows.map((event) => ({ ...event, registrationCount: countByEventId.get(event.id) ?? 0 })));
  });

  app.post('/api/events', requireAuth, requireRole('ngo_admin'), async (request, response) => {
    const checked = validateEvent(request.body || {});
    if (checked.error) return response.status(400).json({ message: checked.error });
    const event = checked.values;
    const result = await database.query(
      `INSERT INTO events (id, owner_id, title, description, date, time, location, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, description, to_char(date, 'YYYY-MM-DD') AS date,
                 to_char(time, 'HH24:MI') AS time, location, capacity, status,
                 qr_token AS "qrToken", qr_updated_at AS "qrUpdatedAt"`,
      [randomUUID(), request.user.id, event.title.trim(), event.description.trim(), event.date,
        event.time, event.location.trim(), Number(event.capacity ?? 30)],
    );
    response.status(201).json(result.rows[0]);
  });

  app.patch('/api/events/:eventId', requireAuth, requireRole('ngo_admin'), async (request, response) => {
    if (!UUID_PATTERN.test(request.params.eventId)) return response.status(404).json({ message: 'Event not found.' });
    const checked = validateEvent(request.body || {}, true);
    if (checked.error) return response.status(400).json({ message: checked.error });

    const columns = { title: 'title', description: 'description', date: 'date', time: 'time', location: 'location', capacity: 'capacity', status: 'status' };
    const entries = Object.entries({ ...checked.values, ...(request.body.status !== undefined ? { status: request.body.status } : {}) });
    if (!entries.length) return response.status(400).json({ message: 'Provide at least one event field to update.' });
    const assignments = entries.map(([key], index) => `${columns[key]} = $${index + 3}`).join(', ');
    const values = entries.map(([key, value]) => key === 'title' || key === 'description' || key === 'location' ? value.trim() : key === 'capacity' ? Number(value) : value);
    const result = await database.query(
      `UPDATE events SET ${assignments}, updated_at = NOW()
       WHERE id = $1 AND owner_id = $2
       RETURNING id, title, description, to_char(date, 'YYYY-MM-DD') AS date,
                 to_char(time, 'HH24:MI') AS time, location, capacity, status,
                 qr_token AS "qrToken", qr_updated_at AS "qrUpdatedAt"`,
      [request.params.eventId, request.user.id, ...values],
    );
    if (!result.rowCount) return response.status(404).json({ message: 'Event not found.' });
    response.json(result.rows[0]);
  });

  app.post('/api/events/:eventId/qr', requireAuth, requireRole('ngo_admin'), async (request, response) => {
    if (!UUID_PATTERN.test(request.params.eventId)) return response.status(404).json({ message: 'Event not found.' });
    const token = randomUUID();
    const result = await database.query(
      `UPDATE events SET qr_token = $1, qr_updated_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND owner_id = $3
       RETURNING qr_token AS "qrToken", qr_updated_at AS "qrUpdatedAt"`,
      [token, request.params.eventId, request.user.id],
    );
    if (!result.rowCount) return response.status(404).json({ message: 'Event not found.' });
    response.json(result.rows[0]);
  });

  app.post('/api/events/:eventId/registrations', requireAuth, requireRole('volunteer'), async (request, response) => {
    if (!UUID_PATTERN.test(request.params.eventId)) return response.status(404).json({ message: 'Event not found.' });
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const eventResult = await client.query(
        'SELECT id, status, capacity FROM events WHERE id = $1 FOR UPDATE',
        [request.params.eventId],
      );
      const event = eventResult.rows[0];
      if (!event) {
        await client.query('ROLLBACK');
        return response.status(404).json({ message: 'Event not found.' });
      }
      if (event.status !== 'live') {
        await client.query('ROLLBACK');
        return response.status(409).json({ message: 'This event is not open for registration.' });
      }
      const countResult = await client.query(
        'SELECT COUNT(*)::int AS total FROM registrations WHERE event_id = $1',
        [event.id],
      );
      if (countResult.rows[0].total >= event.capacity) {
        await client.query('ROLLBACK');
        return response.status(409).json({ message: 'This event has reached capacity.' });
      }
      const registrationResult = await client.query(
        `INSERT INTO registrations (id, event_id, volunteer_id)
         VALUES ($1, $2, $3)
         RETURNING id, event_id AS "eventId", volunteer_id AS "volunteerId",
                   attended, checked_in_at AS "checkedInAt"`,
        [randomUUID(), event.id, request.user.id],
      );
      await client.query('COMMIT');
      response.status(201).json(registrationResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') return response.status(409).json({ message: 'You are already registered for this event.' });
      throw error;
    } finally {
      client.release();
    }
  });

  app.get('/api/registrations', requireAuth, async (request, response) => {
    const isAdmin = request.user.role === 'ngo_admin';
    const query = isAdmin
      ? `SELECT r.id, r.event_id AS "eventId", r.volunteer_id AS "volunteerId",
                u.name AS "volunteerName", u.email AS "volunteerEmail", r.attended,
                r.checked_in_at AS "checkedInAt"
         FROM registrations r JOIN users u ON u.id = r.volunteer_id
         JOIN events e ON e.id = r.event_id WHERE e.owner_id = $1 ORDER BY r.registered_at DESC`
      : `SELECT r.id, r.event_id AS "eventId", r.volunteer_id AS "volunteerId",
                u.name AS "volunteerName", u.email AS "volunteerEmail", r.attended,
                r.checked_in_at AS "checkedInAt"
         FROM registrations r JOIN users u ON u.id = r.volunteer_id
         WHERE r.volunteer_id = $1 ORDER BY r.registered_at DESC`;
    const result = await database.query(query, [request.user.id]);
    response.json(result.rows);
  });

  app.get('/api/events/:eventId/registrations', requireAuth, requireRole('ngo_admin'), async (request, response) => {
    if (!UUID_PATTERN.test(request.params.eventId)) return response.status(404).json({ message: 'Event not found.' });
    const event = await database.query(
      'SELECT id FROM events WHERE id = $1 AND owner_id = $2',
      [request.params.eventId, request.user.id],
    );
    if (!event.rowCount) return response.status(404).json({ message: 'Event not found.' });
    const result = await database.query(
      `SELECT r.id, r.event_id AS "eventId", r.volunteer_id AS "volunteerId",
              u.name AS "volunteerName", u.email AS "volunteerEmail", r.attended,
              r.checked_in_at AS "checkedInAt"
       FROM registrations r JOIN users u ON u.id = r.volunteer_id
       WHERE r.event_id = $1 ORDER BY r.registered_at`,
      [request.params.eventId],
    );
    response.json(result.rows);
  });

  app.post('/api/events/:eventId/attendance', requireAuth, requireRole('volunteer'), async (request, response) => {
    if (!UUID_PATTERN.test(request.params.eventId)) return response.status(404).json({ message: 'Event not found.' });
    const qrToken = request.body?.qrToken;
    if (typeof qrToken !== 'string' || !UUID_PATTERN.test(qrToken)) {
      return response.status(400).json({ message: 'A valid event QR token is required.' });
    }
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const event = await client.query(
        `SELECT id FROM events
         WHERE id = $1 AND status = 'live' AND qr_token = $2
         FOR UPDATE`,
        [request.params.eventId, qrToken],
      );
      if (!event.rowCount) {
        await client.query('ROLLBACK');
        return response.status(409).json({ message: 'QR is invalid or the event is not live.' });
      }
      const result = await client.query(
        `UPDATE registrations SET attended = TRUE, checked_in_at = NOW()
         WHERE event_id = $1 AND volunteer_id = $2 AND attended = FALSE
         RETURNING id, event_id AS "eventId", volunteer_id AS "volunteerId",
                   attended, checked_in_at AS "checkedInAt"`,
        [request.params.eventId, request.user.id],
      );
      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return response.status(409).json({ message: 'You are not registered, or attendance is already recorded.' });
      }
      await client.query('COMMIT');
      response.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ message: 'API route not found.' });
  });

  app.use((error, _request, response, _next) => {
    console.error('API request failed:', error);
    response.status(500).json({ message: 'Unexpected server error.' });
  });

  return app;
}
