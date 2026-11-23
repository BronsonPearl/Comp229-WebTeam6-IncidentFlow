/**
 * COMP229 - Web Application Development
 * Project: IncidentFlow - Incident Management System
 *
 * Team Members:
 * Ivan Seck Ali - 301501210
 * Robel Teffera - 301113578
 * Ryan Sunil - 301495962
 * Bronson Pearl - 301328703
 *
 * Description:
 * This file is part of the IncidentFlow MERN application.
 */

// test runner, assert, mongoose, supertest and the in memory MongoDB
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

// test settings have to be set before the app is imported
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = 'tmp-test-uploads';

// filled in by before()
let mongo;
let app;
let User;

// JWT token and id for each test user
const tokens = {};
const ids = {};

// shortcuts for making requests and adding the auth header
const api = () => request(app);
const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

// ---------- SETUP ----------

// start the temporary database and import the app
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = (await import('../../server/express.js')).default;
  User = (await import('../../server/models/User.js')).default;

  // make an admin and a technician directly in the database
  // (sign up can only make normal users) then sign them in
  for (const [key, role] of [['admin', 'admin'], ['tech', 'technician']]) {
    const u = new User({ firstName: key, lastName: 'Test', email: `${key}@test.dev`, role });
    await u.setPassword('Password1');
    await u.save();
    ids[key] = String(u._id);
    const res = await api().post('/api/auth/signin').send({ email: `${key}@test.dev`, password: 'Password1' });
    tokens[key] = res.body.data.token;
  }
});

// stop the database when all tests are done
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

// ---------- AUTH TESTS ----------

describe('Auth', () => {
  test('valid signup creates a user and never exposes the password', async () => {
    const res = await api().post('/api/auth/signup').send({ firstName: 'Taylor', lastName: 'Chen', email: 'Taylor@Test.dev', password: 'Password1' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'user');
    assert.equal(res.body.data.user.email, 'taylor@test.dev');
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.ok(!JSON.stringify(res.body).includes('Password1'));
    ids.user = res.body.data.user._id;
  });

  test('duplicate email is rejected with 409', async () => {
    const res = await api().post('/api/auth/signup').send({ firstName: 'Taylor', lastName: 'Chen', email: 'taylor@test.dev', password: 'Password1' });
    assert.equal(res.status, 409);
    assert.ok(res.body.errors.email);
  });

  test('valid signin returns a token; invalid password is rejected', async () => {
    const good = await api().post('/api/auth/signin').send({ email: 'taylor@test.dev', password: 'Password1' });
    assert.equal(good.status, 200);
    assert.ok(good.body.data.token);
    tokens.user = good.body.data.token;
    const bad = await api().post('/api/auth/signin').send({ email: 'taylor@test.dev', password: 'nope12345' });
    assert.equal(bad.status, 401);
  });

  // trying to sign up as admin should still give a normal user
  test('signup cannot self-assign admin role', async () => {
    const res = await api().post('/api/auth/signup').send({ firstName: 'Evil', lastName: 'User', email: 'evil@test.dev', password: 'Password1', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'user');
    const login = await api().post('/api/auth/signin').send({ email: 'evil@test.dev', password: 'Password1' });
    tokens.other = login.body.data.token;
    ids.other = login.body.data.user._id;
  });
});

// ---------- USER TESTS ----------

describe('Users', () => {
  test('admin can list users; normal user is forbidden', async () => {
    assert.equal((await api().get('/api/users').set(auth('admin'))).status, 200);
    assert.equal((await api().get('/api/users').set(auth('user'))).status, 403);
  });

  test('user can update own profile but not another user or own role', async () => {
    const own = await api().put(`/api/users/${ids.user}`).set(auth('user')).send({ firstName: 'Tay' });
    assert.equal(own.status, 200);
    assert.equal(own.body.data.user.firstName, 'Tay');
    assert.equal((await api().put(`/api/users/${ids.other}`).set(auth('user')).send({ firstName: 'Hacked' })).status, 403);
    assert.equal((await api().put(`/api/users/${ids.user}`).set(auth('user')).send({ role: 'admin' })).status, 403);
  });

  test('last active admin cannot be demoted', async () => {
    const res = await api().put(`/api/users/${ids.admin}`).set(auth('admin')).send({ role: 'user' });
    assert.equal(res.status, 409);
  });

  test('invalid ObjectId returns 400', async () => {
    assert.equal((await api().get('/api/users/not-an-id').set(auth('admin'))).status, 400);
  });
});

// ---------- INCIDENT TESTS ----------

describe('Incidents', () => {
  const body = { title: 'Wi-Fi unavailable in Lab 4', description: 'Devices cannot obtain an IP address.', category: 'IT', priority: 'High', location: 'Building A - Lab 4' };

  test('unauthenticated create is rejected', async () => {
    assert.equal((await api().post('/api/incidents').send(body)).status, 401);
  });

  test('authenticated create records owner, Open status, number and activity', async () => {
    // sending status and createdBy should be ignored by the server
    const res = await api().post('/api/incidents').set(auth('user')).send({ ...body, status: 'Closed', createdBy: ids.admin });
    assert.equal(res.status, 201);
    const inc = res.body.data.incident;
    assert.equal(inc.status, 'Open');
    assert.equal(inc.createdBy._id, ids.user);
    assert.match(inc.incidentNumber, /^INC-\d{6}$/);
    ids.incident = inc._id;
    const acts = await api().get(`/api/incidents/${inc._id}/activities`).set(auth('user'));
    assert.equal(acts.body.data.items[0].action, 'created');
  });

  test('validation errors return 400 with field messages', async () => {
    const res = await api().post('/api/incidents').set(auth('user')).send({ ...body, title: 'abc', category: 'Nope' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.title && res.body.errors.category);
  });

  test('public list hides protected fields', async () => {
    const res = await api().get('/api/incidents');
    assert.equal(res.status, 200);
    const item = res.body.data.items[0];
    assert.equal(item.description, undefined);
    assert.equal(item.createdBy, undefined);
  });

  test('owner can read and edit while Open; other users are forbidden', async () => {
    assert.equal((await api().get(`/api/incidents/${ids.incident}`).set(auth('user'))).status, 200);
    assert.equal((await api().get(`/api/incidents/${ids.incident}`).set(auth('other'))).status, 403);
    const edit = await api().put(`/api/incidents/${ids.incident}`).set(auth('user')).send({ title: 'Wi-Fi unavailable in Lab 4 (urgent)' });
    assert.equal(edit.status, 200);
    assert.equal((await api().put(`/api/incidents/${ids.incident}`).set(auth('other')).send({ title: 'Hijacked title' })).status, 403);
  });

  test('normal user cannot assign a technician', async () => {
    const res = await api().put(`/api/incidents/${ids.incident}`).set(auth('user')).send({ assignedTo: ids.tech });
    assert.equal(res.status, 403);
  });

  test('admin assigns technician: status Assigned, activity and notification created', async () => {
    const res = await api().put(`/api/incidents/${ids.incident}`).set(auth('admin')).send({ assignedTo: ids.tech });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.incident.status, 'Assigned');
    const notes = await api().get('/api/notifications').set(auth('tech'));
    assert.equal(notes.body.data.items[0].type, 'assignment');
  });

  test('owner can no longer edit or delete once work has started', async () => {
    assert.equal((await api().put(`/api/incidents/${ids.incident}`).set(auth('user')).send({ title: 'Changed title here' })).status, 403);
    assert.equal((await api().delete(`/api/incidents/${ids.incident}`).set(auth('user'))).status, 403);
  });

  // cannot jump straight to Resolved, and needs a resolution text
  test('technician follows lifecycle and needs a resolution to resolve', async () => {
    const skip = await api().put(`/api/incidents/${ids.incident}`).set(auth('tech')).send({ status: 'Resolved' });
    assert.equal(skip.status, 403);
    assert.equal((await api().put(`/api/incidents/${ids.incident}`).set(auth('tech')).send({ status: 'In Progress' })).status, 200);
    const noRes = await api().put(`/api/incidents/${ids.incident}`).set(auth('tech')).send({ status: 'Resolved' });
    assert.equal(noRes.status, 400);
    const done = await api().put(`/api/incidents/${ids.incident}`).set(auth('tech')).send({ status: 'Resolved', resolution: 'Replaced the PoE injector.' });
    assert.equal(done.status, 200);
    assert.ok(done.body.data.incident.resolvedAt);
    const notes = await api().get('/api/notifications').set(auth('user'));
    assert.ok(notes.body.data.items.some((n) => n.type === 'resolution'));
  });

  test('comments: participants can comment, outsiders cannot', async () => {
    assert.equal((await api().post(`/api/incidents/${ids.incident}/comments`).set(auth('user')).send({ message: 'Thanks!' })).status, 201);
    assert.equal((await api().post(`/api/incidents/${ids.incident}/comments`).set(auth('other')).send({ message: 'Hi' })).status, 403);
  });

  test('critical incidents are escalated automatically; admin analytics reflect real data', async () => {
    const res = await api().post('/api/incidents').set(auth('other')).send({ ...body, title: 'Water leak near stairwell', priority: 'Critical' });
    assert.equal(res.body.data.incident.isEscalated, true);
    const a = await api().get('/api/analytics/summary').set(auth('admin'));
    assert.equal(a.status, 200);
    assert.equal(a.body.data.totals.incidents, 2);
    assert.equal((await api().get('/api/analytics/summary').set(auth('user'))).status, 403);
    ids.critical = res.body.data.incident._id;
  });

  test('delete follows permissions', async () => {
    assert.equal((await api().delete(`/api/incidents/${ids.critical}`).set(auth('user'))).status, 403);
    assert.equal((await api().delete(`/api/incidents/${ids.critical}`).set(auth('other'))).status, 200);
    assert.equal((await api().delete(`/api/incidents/${ids.incident}`).set(auth('admin'))).status, 200);
  });

  // last test: deactivate a user then try to sign in
  test('deactivated users cannot sign in', async () => {
    await api().put(`/api/users/${ids.other}`).set(auth('admin')).send({ isActive: false });
    const res = await api().post('/api/auth/signin').send({ email: 'evil@test.dev', password: 'Password1' });
    assert.equal(res.status, 403);
  });
});
