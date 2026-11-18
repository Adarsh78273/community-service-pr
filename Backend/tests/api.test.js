import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { DataType, newDb } from 'pg-mem';
import { createApp } from '../app.js';

const database = newDb();
database.public.registerFunction({
  name: 'to_char',
  args: [DataType.date, DataType.text],
  returns: DataType.text,
  implementation: (value) => value.toISOString().slice(0, 10),
});
database.public.registerFunction({
  name: 'to_char',
  args: [DataType.time, DataType.text],
  returns: DataType.text,
  implementation: (value) => String(value).slice(0, 5),
});
const { Pool } = database.adapters.createPg();
const pool = new Pool();
const app = createApp({ database: pool, jwtSecret: 'test-secret-that-is-at-least-32-characters-long' });
const adminAgent = request.agent(app);
const volunteerAgent = request.agent(app);

before(async () => {
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) {
    await pool.query(statement);
  }

  const passwordHash = await bcrypt.hash('AdminPass123', 4);
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'ngo_admin')`,
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Test Admin', 'admin@example.test', passwordHash],
  );
});

after(async () => {
  await pool.end();
});

test('auth, event CRUD, capacity, and attendance work with PostgreSQL-compatible test storage', async () => {
  const health = await request(app).get('/api/health').expect(200);
  assert.equal(health.body.status, 'ok');

  const adminLogin = await adminAgent.post('/api/auth/login')
    .send({ email: 'admin@example.test', password: 'AdminPass123' })
    .expect(200);
  assert.equal(adminLogin.body.user.role, 'ngo_admin');

  const signup = await volunteerAgent.post('/api/auth/register')
    .send({ name: 'Test Volunteer', email: 'volunteer@example.test', password: 'VolunteerPass123', role: 'ngo_admin' })
    .expect(201);
  assert.equal(signup.body.user.role, 'volunteer');
  await request(app).post('/api/auth/register')
    .send({ name: 'Duplicate', email: 'VOLUNTEER@example.test', password: 'VolunteerPass123' })
    .expect(409);
  await volunteerAgent.post('/api/auth/login')
    .send({ email: 'volunteer@example.test', password: 'VolunteerPass123' })
    .expect(200);
  await volunteerAgent.get('/api/auth/me').expect(200);

  await request(app).get('/api/events').expect(401);
  await volunteerAgent.post('/api/events').send({}).expect(403);
  await request(app).post('/api/events').set('Origin', 'https://not-the-app.example').send({}).expect(403);

  const created = await adminAgent.post('/api/events').send({
    title: 'Community Day',
    description: 'A test event.',
    date: '2026-12-01',
    time: '10:00',
    location: 'Community Hall',
    capacity: 1,
  }).expect(201);
  const eventId = created.body.id;
  assert.equal(created.body.status, 'draft');

  await adminAgent.patch(`/api/events/${eventId}`).send({ status: 'live' }).expect(200);
  await volunteerAgent.patch(`/api/events/${eventId}`).send({ title: 'Unauthorized edit' }).expect(403);
  await adminAgent.post(`/api/events/${eventId}/attendance`).send({}).expect(403);
  const qr = await adminAgent.post(`/api/events/${eventId}/qr`).expect(200);
  assert.match(qr.body.qrToken, /^[0-9a-f-]{36}$/i);

  const registration = await volunteerAgent.post(`/api/events/${eventId}/registrations`).expect(201);
  assert.equal(registration.body.attended, false);
  const volunteerEvents = await volunteerAgent.get('/api/events').expect(200);
  assert.equal(volunteerEvents.body.find((event) => event.id === eventId).registrationCount, 1);

  const secondSignup = await request(app).post('/api/auth/register')
    .send({ name: 'Second Volunteer', email: 'second@example.test', password: 'SecondPass123' })
    .expect(201);
  const secondAgent = request.agent(app);
  await secondAgent.post('/api/auth/login')
    .send({ email: secondSignup.body.user.email, password: 'SecondPass123' })
    .expect(200);
  await secondAgent.post(`/api/events/${eventId}/registrations`).expect(409);

  const checkIn = await volunteerAgent.post(`/api/events/${eventId}/attendance`)
    .send({ qrToken: qr.body.qrToken })
    .expect(200);
  assert.equal(checkIn.body.attended, true);
  await volunteerAgent.post(`/api/events/${eventId}/attendance`)
    .send({ qrToken: qr.body.qrToken })
    .expect(409);

  const replacementQr = await adminAgent.post(`/api/events/${eventId}/qr`).expect(200);
  await volunteerAgent.post(`/api/events/${eventId}/attendance`)
    .send({ qrToken: qr.body.qrToken })
    .expect(409);
  assert.notEqual(replacementQr.body.qrToken, qr.body.qrToken);

  const eventRegistrations = await adminAgent.get(`/api/events/${eventId}/registrations`).expect(200);
  assert.equal(eventRegistrations.body.length, 1);
  assert.equal(eventRegistrations.body[0].volunteerName, 'Test Volunteer');
});
