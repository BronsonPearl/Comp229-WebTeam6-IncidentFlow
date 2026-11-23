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

// shared rules and data, same files the real server uses
import { storage } from '../../utils/storage.js';
import { SEED_INCIDENTS, SEED_USERS } from '@shared/seedData.js';
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from '@shared/constants.js';
import { validateComment, validateIncident, validateProfile, validateSignIn, validateSignUp } from '@shared/validation.js';
import { allowedStatusTargets, canDeleteIncident, canViewIncident, editableFields, idOf, toPublicIncident } from '@shared/incidentPolicy.js';
import { buildAnalytics, queryIncidents, summarize } from '@shared/incidentQuery.js';

// where the fake database is saved in localStorage
const DB_KEY = 'incidentflow_demo_db_v1';

// every demo account uses this password
export const DEMO_PASSWORD = 'demo1234';
const RESOLVED = ['Resolved', 'Closed'];

// the whole fake database lives in this object
let db = null;

// makes a 24 character id that looks like a MongoDB id
const uid = () => (Date.now().toString(16) + Math.random().toString(16).slice(2, 10)).padEnd(24, '0').slice(0, 24);
const now = () => new Date().toISOString();
const save = () => storage.setJSON(DB_KEY, db);

// ---------- DEMO DATA ----------

// builds the starting data from seedData.js, same idea as server/utils/seed.js
function seed() {
  const hoursAgo = (h) => new Date(Date.now() - h * 36e5).toISOString();
  const d = { users: [], incidents: [], comments: [], activities: [], notifications: [], attachments: [], counter: 0 };
  const byKey = {};

  // users first, saved by key so incidents can point at them
  SEED_USERS.forEach((u, i) => {
    const user = { _id: uid() + i, ...u, isActive: u.isActive ?? true, password: DEMO_PASSWORD, createdAt: hoursAgo(24 * (60 - i * 5)), updatedAt: hoursAgo(24 * 3) };
    delete user.key;
    user._id = user._id.slice(-24);
    byKey[u.key] = user;
    d.users.push(user);
  });

  // incidents oldest first with their history, comments and notifications
  [...SEED_INCIDENTS].reverse().forEach((s, idx) => {
    const n = idx + 1;
    const createdAt = hoursAgo(s.ageDays * 24 + 2 + (n % 7));
    const t0 = new Date(createdAt).getTime();
    const at = (h) => new Date(t0 + h * 36e5).toISOString();
    const resolvedAt = s.resolvedAfterHours ? at(s.resolvedAfterHours) : null;
    const inc = {
      _id: uid().slice(0, 20) + String(n).padStart(4, '0'),
      incidentNumber: `INC-${String(n).padStart(6, '0')}`,
      title: s.title, description: s.description, category: s.category, priority: s.priority, status: s.status, location: s.location,
      createdBy: byKey[s.by]._id, assignedTo: s.to ? byKey[s.to]._id : null, resolution: s.resolution || '',
      isEscalated: Boolean(s.escalated), escalationReason: s.escalated ? 'Automatically escalated: Critical priority.' : '',
      resolvedAt, createdAt, updatedAt: resolvedAt || at(s.to ? 2 : 0),
    };
    d.incidents.push(inc);
    const act = (user, action, extra, when) => d.activities.push({ _id: uid(), incident: inc._id, user: user._id, action, field: null, oldValue: null, newValue: null, ...extra, createdAt: when });
    act(byKey[s.by], 'created', { newValue: inc.incidentNumber }, createdAt);
    if (s.to) {
      act(byKey.alex, 'assigned', { field: 'assignedTo', newValue: `${byKey[s.to].firstName} ${byKey[s.to].lastName}` }, at(1));
      act(byKey.alex, 'status_changed', { field: 'status', oldValue: 'Open', newValue: 'Assigned' }, at(1));
    }
    if (['In Progress', 'On Hold', 'Resolved', 'Closed'].includes(s.status)) act(byKey[s.to], 'status_changed', { field: 'status', oldValue: 'Assigned', newValue: 'In Progress' }, at(2));
    if (s.status === 'On Hold') act(byKey[s.to], 'status_changed', { field: 'status', oldValue: 'In Progress', newValue: 'On Hold' }, at(3));
    if (resolvedAt) act(byKey[s.to], 'status_changed', { field: 'status', oldValue: 'In Progress', newValue: 'Resolved' }, resolvedAt);
    if (s.status === 'Closed') act(byKey[s.by], 'status_changed', { field: 'status', oldValue: 'Resolved', newValue: 'Closed' }, resolvedAt);
    (s.comments || []).forEach(([who, message], i) => {
      d.comments.push({ _id: uid(), incident: inc._id, author: byKey[who]._id, message, createdAt: at(2.5 + i), updatedAt: at(2.5 + i) });
      act(byKey[who], 'commented', {}, at(2.5 + i));
    });
    if (s.to && !RESOLVED.includes(s.status)) d.notifications.push({ _id: uid(), user: byKey[s.to]._id, incident: inc._id, type: 'assignment', message: `You were assigned ${inc.incidentNumber}: ${inc.title}`, isRead: s.status !== 'Assigned', createdAt: at(1) });
    if (s.status === 'Resolved') d.notifications.push({ _id: uid(), user: byKey[s.by]._id, incident: inc._id, type: 'resolution', message: `${inc.incidentNumber} was resolved: ${inc.title}`, isRead: false, createdAt: resolvedAt });
  });
  d.counter = SEED_INCIDENTS.length;
  return d;
}

// use the saved data if there is some, otherwise make new demo data
function load() {
  if (!db) db = storage.getJSON(DB_KEY) || seed();
  save();
  return db;
}

// the "Reset demo data" button calls this
export function resetDemoData() {
  db = seed();
  save();
}

// ---------- HELPERS (same idea as the server utils) ----------

class HttpError extends Error {
  constructor(status, message, errors) { super(message); this.status = status; this.errors = errors; }
}
const bad = (message = 'Please correct the highlighted fields.', errors) => new HttpError(400, message, errors);
const forbidden = (m = 'You do not have permission to do that.') => new HttpError(403, m);
const notFound = (m = 'The requested record was not found.') => new HttpError(404, m);

// same response format as the real API
const ok = (data, message, status = 200) => ({ status, body: { success: true, data, ...(message ? { message } : {}) } });

// throw a 400 if the validator found errors
const check = (errors) => { if (Object.keys(errors).length) throw bad(undefined, errors); };

// never send the password back
const publicUser = (u) => { if (!u) return null; const { password, ...rest } = u; return { ...rest, fullName: `${u.firstName} ${u.lastName}` }; };

// like .populate() on the server, swaps an id for the person's name
const person = (id) => { const u = db.users.find((x) => x._id === idOf(id)); return u ? { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role } : null; };
const populateIncident = (i) => ({ ...i, createdBy: person(i.createdBy) || { _id: i.createdBy, firstName: 'Deleted', lastName: 'user' }, assignedTo: i.assignedTo ? person(i.assignedTo) : null });
const perms = (user, i) => ({ editableFields: editableFields(user, i), statusTargets: allowedStatusTargets(user, i), canDelete: canDeleteIncident(user, i) });
const findIncident = (id) => { const i = db.incidents.find((x) => x._id === id); if (!i) throw notFound('Incident not found.'); return i; };
const pick = (o = {}, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
const adminIds = () => db.users.filter((u) => u.role === 'admin' && u.isActive).map((u) => u._id);

// same as logActivity and notify in server/services/workflow.js
function log(incident, user, action, extra = {}) {
  db.activities.push({ _id: uid(), incident: incident._id, user: user?._id, action, field: null, oldValue: null, newValue: null, ...extra, createdAt: now() });
}
function notify(recipients, actor, incident, type, message) {
  [...new Set(recipients.filter(Boolean).map(idOf))].filter((r) => r !== actor._id).forEach((user) => {
    db.notifications.push({ _id: uid(), user, incident: incident?._id || null, type, message, isRead: false, createdAt: now() });
  });
}

// demo tokens look like "demo.<userId>"
function currentUser(token, required = true) {
  const id = token?.startsWith('demo.') ? token.slice(5) : null;
  const user = id && db.users.find((u) => u._id === id);
  if (!user) { if (required) throw new HttpError(401, token ? 'Your session has expired. Please sign in again.' : 'Please sign in to continue.'); return null; }
  if (!user.isActive) { if (required) throw forbidden('Your account has been deactivated. Contact an administrator.'); return null; }
  return user;
}
const requireRole = (user, ...roles) => { if (!roles.includes(user.role)) throw forbidden('This area is restricted to ' + roles.join(' / ') + ' accounts.'); };

// ---------- ROUTES ----------

// each route is [method, path, handler], the handlers follow the real controllers
const routes = [
  ['GET', '/health', () => ok({ status: 'ok', demo: true })],

  // auth
  ['POST', '/auth/signup', ({ body }) => {
    check(validateSignUp(body));
    const email = body.email.trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) throw new HttpError(409, 'An account with that email already exists.', { email: 'An account with that email already exists.' });
    const user = { _id: uid(), firstName: body.firstName.trim(), lastName: body.lastName.trim(), email, role: 'user', isActive: true, password: body.password, createdAt: now(), updatedAt: now() };
    db.users.push(user);
    return ok({ user: publicUser(user) }, 'Account created. You can now sign in.', 201);
  }],
  ['POST', '/auth/signin', ({ body }) => {
    check(validateSignIn(body));
    const user = db.users.find((u) => u.email === body.email.trim().toLowerCase());
    if (!user || user.password !== body.password) throw new HttpError(401, 'Incorrect email or password.');
    if (!user.isActive) throw forbidden('Your account has been deactivated. Contact an administrator.');
    return ok({ token: `demo.${user._id}`, user: publicUser(user) }, `Welcome back, ${user.firstName}.`);
  }],
  ['GET', '/auth/me', ({ user }) => ok({ user: publicUser(user) })],

  // users
  ['GET', '/users', ({ user, query }) => {
    requireRole(user, 'admin');
    let items = [...db.users];
    if (query.role) items = items.filter((u) => u.role === query.role);
    if (query.status) items = items.filter((u) => u.isActive === (query.status === 'active'));
    if (query.q) { const q = query.q.toLowerCase(); items = items.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)); }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok({ items: items.map(publicUser), total: items.length });
  }],
  ['POST', '/users', ({ user, body }) => {
    requireRole(user, 'admin');
    check({ ...validateSignUp(body), ...validateProfile(pick(body, ['role']), { partial: true }) });
    const email = body.email.trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) throw new HttpError(409, 'An account with that email already exists.', { email: 'An account with that email already exists.' });
    const created = { _id: uid(), firstName: body.firstName.trim(), lastName: body.lastName.trim(), email, role: body.role || 'user', isActive: body.isActive ?? true, password: body.password, createdAt: now(), updatedAt: now() };
    db.users.push(created);
    return ok({ user: publicUser(created) }, 'User created.', 201);
  }],
  ['GET', '/users/:id', ({ user, params }) => {
    if (user._id !== params.id && user.role !== 'admin') throw forbidden('You can only view your own profile.');
    const target = db.users.find((u) => u._id === params.id);
    if (!target) throw notFound('User not found.');
    return ok({ user: publicUser(target), stats: { reported: summarize(db.incidents.filter((i) => i.createdBy === target._id)), assigned: summarize(db.incidents.filter((i) => i.assignedTo === target._id)) } });
  }],
  ['PUT', '/users/:id', ({ user, params, body }) => {
    const self = user._id === params.id;
    const admin = user.role === 'admin';
    if (!self && !admin) throw forbidden('You can only edit your own profile.');
    const allowed = admin ? ['firstName', 'lastName', 'email', 'role', 'isActive'] : ['firstName', 'lastName', 'email'];
    const blocked = Object.keys(body).filter((k) => !allowed.includes(k) && !['password', 'currentPassword'].includes(k));
    if (blocked.length) throw forbidden(`You are not allowed to change: ${blocked.join(', ')}.`);
    const changes = pick(body, allowed);
    check(validateProfile(changes, { partial: true }));
    const target = db.users.find((u) => u._id === params.id);
    if (!target) throw notFound('User not found.');
    const losingAdmin = target.role === 'admin' && ((changes.role && changes.role !== 'admin') || changes.isActive === false);
    if (losingAdmin && !db.users.some((u) => u.role === 'admin' && u.isActive && u._id !== target._id)) throw new HttpError(409, 'At least one active admin is required. Promote another admin first.');
    if (changes.email) {
      changes.email = changes.email.trim().toLowerCase();
      if (db.users.some((u) => u.email === changes.email && u._id !== target._id)) throw new HttpError(409, 'An account with that email already exists.', { email: 'An account with that email already exists.' });
    }
    if (body.password) {
      if (String(body.password).length < 8) throw bad(undefined, { password: 'Password must be at least 8 characters.' });
      if (self && body.currentPassword !== target.password) throw bad(undefined, { currentPassword: 'Current password is incorrect.' });
      target.password = body.password;
    }
    ['firstName', 'lastName'].forEach((k) => { if (changes[k]) changes[k] = changes[k].trim(); });
    Object.assign(target, changes, { updatedAt: now() });
    return ok({ user: publicUser(target) }, self ? 'Profile updated.' : 'User updated.');
  }],
  ['DELETE', '/users/:id', ({ user, params }) => {
    requireRole(user, 'admin');
    if (user._id === params.id) throw new HttpError(409, 'You cannot delete your own account while signed in.');
    const target = db.users.find((u) => u._id === params.id);
    if (!target) throw notFound('User not found.');
    db.incidents.forEach((i) => { if (i.assignedTo === target._id) { i.assignedTo = null; if (i.status === 'Assigned') i.status = 'Open'; } });
    db.users = db.users.filter((u) => u._id !== target._id);
    return ok({ id: params.id }, 'User deleted.');
  }],

  // incidents
  ['GET', '/incidents', ({ token, query }) => {
    const user = currentUser(token, false);
    const scope = user ? query.scope || 'mine' : 'public';
    let items = db.incidents;
    if (scope === 'mine') items = items.filter((i) => i.createdBy === user._id);
    else if (scope === 'assigned') { requireRole(user, 'technician', 'admin'); items = items.filter((i) => i.assignedTo === user._id); }
    else if (scope === 'all') requireRole(user, 'technician', 'admin');
    items = queryIncidents(items, query);
    const limit = Math.min(Number(query.limit) || 50, 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const total = items.length;
    items = items.slice((page - 1) * limit, page * limit).map((i) => (scope === 'public' ? toPublicIncident(i) : populateIncident(i)));
    return ok({ items, total, page, pages: Math.ceil(total / limit) || 1, scope });
  }],
  ['POST', '/incidents', ({ user, body }) => {
    const data = pick(body, ['title', 'description', 'category', 'priority', 'location']);
    check(validateIncident(data));
    db.counter += 1;
    const incident = {
      _id: uid(), incidentNumber: `INC-${String(db.counter).padStart(6, '0')}`, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),
      status: 'Open', createdBy: user._id, assignedTo: null, resolution: '', isEscalated: false, escalationReason: '', resolvedAt: null, createdAt: now(), updatedAt: now(),
    };
    if (incident.priority === 'Critical') { incident.isEscalated = true; incident.escalationReason = 'Automatically escalated: Critical priority.'; }
    db.incidents.push(incident);
    log(incident, user, 'created', { newValue: incident.incidentNumber });
    if (incident.isEscalated) { log(incident, user, 'escalated', { newValue: incident.escalationReason }); notify(adminIds(), user, incident, 'escalation', `${incident.incidentNumber} was reported as Critical: ${incident.title}`); }
    return ok({ incident: populateIncident(incident), permissions: perms(user, incident) }, `Incident ${incident.incidentNumber} reported.`, 201);
  }],
  ['GET', '/incidents/:id', ({ user, params }) => {
    const i = findIncident(params.id);
    if (!canViewIncident(user, i)) throw forbidden('You do not have access to this incident.');
    return ok({ incident: populateIncident(i), permissions: perms(user, i) });
  }],

  // same order as the real updateIncident: fields, priority, assignment, status, escalation
  ['PUT', '/incidents/:id', ({ user, params, body }) => {
    const incident = findIncident(params.id);
    if (!canViewIncident(user, incident)) throw forbidden('You do not have access to this incident.');
    const allowed = editableFields(user, incident);
    if (!allowed.length) throw forbidden('You are not authorized to update this incident.');
    const blocked = Object.keys(body).filter((k) => body[k] !== undefined && !allowed.includes(k));
    if (blocked.length) throw forbidden(`You are not authorized to change: ${blocked.join(', ')}.`);
    const b = pick(body, allowed);
    check(validateIncident(b, { partial: true }));
    const before = { ...incident };
    const events = [];
    ['title', 'description', 'category', 'location', 'resolution'].forEach((f) => {
      if (f in b && String(b[f]).trim() !== String(before[f] ?? '')) {
        incident[f] = String(b[f]).trim();
        const long = f === 'description' || f === 'resolution';
        log(incident, user, 'updated', { field: f, oldValue: long ? null : before[f], newValue: long ? null : incident[f] });
      }
    });
    if (b.priority && b.priority !== before.priority) {
      incident.priority = b.priority;
      log(incident, user, 'priority_changed', { field: 'priority', oldValue: before.priority, newValue: b.priority });
      if (b.priority === 'Critical' && !incident.isEscalated && !RESOLVED.includes(incident.status)) {
        incident.isEscalated = true; incident.escalationReason = 'Automatically escalated: priority raised to Critical.';
        log(incident, user, 'escalated', { newValue: incident.escalationReason });
        events.push(['escalation', `${incident.incidentNumber} was escalated (Critical).`, [...adminIds(), incident.assignedTo]]);
      }
    }
    if ('assignedTo' in b && String(b.assignedTo || '') !== String(before.assignedTo || '')) {
      if (b.assignedTo) {
        const tech = db.users.find((u) => u._id === b.assignedTo && u.role === 'technician' && u.isActive);
        if (!tech) throw bad(undefined, { assignedTo: 'Assignee must be an active technician.' });
        incident.assignedTo = tech._id;
        log(incident, user, 'assigned', { field: 'assignedTo', newValue: `${tech.firstName} ${tech.lastName}` });
        events.push(['assignment', `You were assigned ${incident.incidentNumber}: ${incident.title}`, [tech._id]]);
        if (incident.status === 'Open' && !b.status) { incident.status = 'Assigned'; log(incident, user, 'status_changed', { field: 'status', oldValue: 'Open', newValue: 'Assigned' }); }
      } else {
        incident.assignedTo = null;
        log(incident, user, 'unassigned', { field: 'assignedTo' });
        if (incident.status === 'Assigned' && !b.status) incident.status = 'Open';
      }
    }
    if (b.status && b.status !== before.status) {
      if (!allowedStatusTargets(user, before).includes(b.status)) throw forbidden(`You cannot move an incident from ${before.status} to ${b.status}.`);
      if (b.status === 'Assigned' && !incident.assignedTo) throw bad(undefined, { status: 'Assign a technician before setting status to Assigned.' });
      if (b.status === 'Resolved' && !String(incident.resolution || '').trim()) throw bad(undefined, { resolution: 'Add a resolution summary before resolving.' });
      const reopening = RESOLVED.includes(before.status) && !RESOLVED.includes(b.status);
      incident.status = b.status;
      if (RESOLVED.includes(b.status) && !incident.resolvedAt) incident.resolvedAt = now();
      if (reopening) { incident.resolvedAt = null; log(incident, user, 'reopened', { field: 'status', oldValue: before.status, newValue: b.status }); }
      else log(incident, user, 'status_changed', { field: 'status', oldValue: before.status, newValue: b.status });
      if (b.status === 'Resolved') { incident.isEscalated = false; events.push(['resolution', `${incident.incidentNumber} was resolved: ${incident.title}`, [incident.createdBy]]); }
      else events.push(['status', `${incident.incidentNumber} status changed to ${b.status}.`, [incident.createdBy, incident.assignedTo]]);
    }
    if ('isEscalated' in b && Boolean(b.isEscalated) !== before.isEscalated) {
      if (b.isEscalated) {
        const reason = String(b.escalationReason || '').trim();
        if (reason.length < 3) throw bad(undefined, { escalationReason: 'Give a reason for the escalation.' });
        incident.isEscalated = true; incident.escalationReason = reason;
        log(incident, user, 'escalated', { newValue: reason });
        events.push(['escalation', `${incident.incidentNumber} was escalated: ${reason}`, [...adminIds(), incident.assignedTo, incident.createdBy]]);
      } else { incident.isEscalated = false; log(incident, user, 'de_escalated', { oldValue: before.escalationReason }); }
    }
    incident.updatedAt = now();
    events.forEach(([type, msg, rec]) => notify(rec, user, incident, type, msg));
    return ok({ incident: populateIncident(incident), permissions: perms(user, incident) }, 'Incident updated.');
  }],
  ['DELETE', '/incidents/:id', ({ user, params }) => {
    const i = findIncident(params.id);
    if (!canDeleteIncident(user, i)) throw forbidden(user.role === 'admin' ? undefined : 'You can only delete your own incidents while they are still Open.');
    ['comments', 'activities', 'notifications', 'attachments'].forEach((c) => { db[c] = db[c].filter((x) => x.incident !== i._id); });
    db.incidents = db.incidents.filter((x) => x._id !== i._id);
    return ok({ id: i._id }, `Incident ${i.incidentNumber} deleted.`);
  }],
  ['GET', '/incidents/:id/activities', ({ user, params }) => {
    const i = findIncident(params.id);
    if (!canViewIncident(user, i)) throw forbidden('You do not have access to this incident.');
    const items = db.activities.filter((a) => a.incident === i._id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((a) => ({ ...a, user: person(a.user) }));
    return ok({ items });
  }],
  ['GET', '/activities/recent', ({ user, query }) => {
    let items = db.activities;
    if (user.role === 'user') { const mine = new Set(db.incidents.filter((i) => i.createdBy === user._id).map((i) => i._id)); items = items.filter((a) => mine.has(a.incident)); }
    items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, Math.min(Number(query.limit) || 8, 30))
      .map((a) => { const inc = db.incidents.find((i) => i._id === a.incident); return { ...a, user: person(a.user), incident: inc ? { _id: inc._id, incidentNumber: inc.incidentNumber, title: inc.title } : null }; });
    return ok({ items });
  }],

  // comments
  ['GET', '/incidents/:id/comments', ({ user, params }) => {
    const i = findIncident(params.id);
    if (!canViewIncident(user, i)) throw forbidden('You do not have access to this incident.');
    return ok({ items: db.comments.filter((c) => c.incident === i._id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((c) => ({ ...c, author: person(c.author) })) });
  }],
  ['POST', '/incidents/:id/comments', ({ user, params, body }) => {
    const i = findIncident(params.id);
    if (!canViewIncident(user, i)) throw forbidden('You cannot comment on this incident.');
    check(validateComment(body));
    const c = { _id: uid(), incident: i._id, author: user._id, message: body.message.trim(), createdAt: now(), updatedAt: now() };
    db.comments.push(c);
    log(i, user, 'commented');
    notify([i.createdBy, i.assignedTo], user, i, 'comment', `${user.firstName} commented on ${i.incidentNumber}.`);
    return ok({ comment: { ...c, author: person(c.author) } }, 'Comment added.', 201);
  }],
  ['PUT', '/comments/:id', ({ user, params, body }) => {
    const c = db.comments.find((x) => x._id === params.id);
    if (!c) throw notFound('Comment not found.');
    if (c.author !== user._id) throw forbidden('You can only edit your own comments.');
    check(validateComment(body));
    Object.assign(c, { message: body.message.trim(), updatedAt: now() });
    return ok({ comment: { ...c, author: person(c.author) } }, 'Comment updated.');
  }],
  ['DELETE', '/comments/:id', ({ user, params }) => {
    const c = db.comments.find((x) => x._id === params.id);
    if (!c) throw notFound('Comment not found.');
    if (c.author !== user._id && user.role !== 'admin') throw forbidden('You can only delete your own comments.');
    db.comments = db.comments.filter((x) => x._id !== c._id);
    return ok({ id: c._id }, 'Comment deleted.');
  }],

  // attachments (stored as data URLs in the browser)
  ['GET', '/incidents/:id/attachments', ({ user, params }) => {
    const i = findIncident(params.id);
    if (!canViewIncident(user, i)) throw forbidden('You do not have access to this incident.');
    return ok({ items: db.attachments.filter((a) => a.incident === i._id).map(({ dataUrl, ...a }) => ({ ...a, uploadedBy: person(a.uploadedBy) })) });
  }],
  ['POST', '/incidents/:id/attachments', async ({ user, params, file }) => {
    const i = findIncident(params.id);
    if (!canViewIncident(user, i)) throw forbidden('You do not have access to this incident.');
    if (!file) throw bad('Choose a file to upload.', { file: 'Choose a file to upload.' });
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ATTACHMENT_TYPES[file.type]?.includes(ext)) throw bad('Only JPG, PNG and PDF files are allowed.', { file: 'Only JPG, PNG and PDF files are allowed.' });
    if (file.size > MAX_ATTACHMENT_BYTES) throw bad('File is too large. Maximum size is 5 MB.', { file: 'File is too large. Maximum size is 5 MB.' });

    // localStorage is small so demo files are limited to 1.5 MB
    if (file.size > 1.5 * 1024 * 1024) throw bad('Demo mode stores files in your browser, so keep demo uploads under 1.5 MB.', { file: 'Demo uploads are limited to 1.5 MB.' });
    const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
    const a = { _id: uid(), incident: i._id, uploadedBy: user._id, fileName: file.name, fileType: file.type, fileUrl: 'demo', fileSize: file.size, dataUrl, createdAt: now() };
    db.attachments.push(a);
    log(i, user, 'attachment_added', { newValue: file.name });
    const { dataUrl: _omit, ...meta } = a;
    return ok({ attachment: { ...meta, uploadedBy: person(a.uploadedBy) } }, 'File attached.', 201);
  }],
  ['GET', '/attachments/:id/file', async ({ user, params }) => {
    const a = db.attachments.find((x) => x._id === params.id);
    if (!a) throw notFound('Attachment not found.');
    if (!canViewIncident(user, findIncident(a.incident))) throw forbidden();
    return { status: 200, body: await (await fetch(a.dataUrl)).blob() };
  }],
  ['DELETE', '/attachments/:id', ({ user, params }) => {
    const a = db.attachments.find((x) => x._id === params.id);
    if (!a) throw notFound('Attachment not found.');
    if (a.uploadedBy !== user._id && user.role !== 'admin') throw forbidden('Only the uploader or an admin can remove this file.');
    db.attachments = db.attachments.filter((x) => x._id !== a._id);
    log(findIncident(a.incident), user, 'attachment_removed', { oldValue: a.fileName });
    return ok({ id: a._id }, 'File removed.');
  }],

  // notifications
  ['GET', '/notifications', ({ user }) => {
    const mine = db.notifications.filter((n) => n.user === user._id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok({ items: mine.map((n) => { const inc = db.incidents.find((i) => i._id === n.incident); return { ...n, incident: inc ? { _id: inc._id, incidentNumber: inc.incidentNumber, title: inc.title } : null }; }), unread: mine.filter((n) => !n.isRead).length });
  }],
  ['PUT', '/notifications/read-all', ({ user }) => {
    let updated = 0;
    db.notifications.forEach((n) => { if (n.user === user._id && !n.isRead) { n.isRead = true; updated += 1; } });
    return ok({ updated }, 'All notifications marked as read.');
  }],
  ['PUT', '/notifications/:id/read', ({ user, params }) => {
    const n = db.notifications.find((x) => x._id === params.id && x.user === user._id);
    if (!n) throw notFound('Notification not found.');
    n.isRead = true;
    return ok({ notification: n });
  }],

  // analytics
  ['GET', '/analytics/summary', ({ user, query }) => {
    requireRole(user, 'admin');
    const days = Math.min(Math.max(Number(query.days) || 30, 7), 180);
    const recentUsers = [...db.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(publicUser);
    const recentIncidents = [...db.incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(populateIncident);
    return ok({ ...buildAnalytics(db.incidents, db.users, { days }), recentUsers, recentIncidents });
  }],
];

// ---------- ROUTER ----------

// routes that work without signing in
const PUBLIC = new Set(['GET /health', 'POST /auth/signup', 'POST /auth/signin', 'GET /incidents']);

// finds the route for a method + path and pulls out :id style params
function match(method, path) {
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue;
    const names = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
    const hit = path.match(re);
    if (hit) return { handler, pattern, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(hit[i + 1])])) };
  }
  return null;
}

// api.js calls this instead of fetch() in demo mode
export async function handle(method, path, { body = {}, query = {}, token, file } = {}) {
  load();

  // small fake delay so the loading states show like on a real server
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180)); // realistic network latency
  const route = match(method, path);
  if (!route) return { status: 404, body: { success: false, message: `No API route for ${method} ${path}` } };
  try {
    const user = PUBLIC.has(`${method} ${route.pattern}`) ? null : currentUser(token);

    // body is copied so the handler cannot change the caller's object
    const result = await route.handler({ user, token, params: route.params, body: JSON.parse(JSON.stringify(body || {})), query, file });
    save();
    return result;
  } catch (err) {
    // turn errors into the same JSON error format as the real API
    if (err instanceof HttpError) return { status: err.status, body: { success: false, message: err.message || 'You do not have permission to do that.', ...(err.errors ? { errors: err.errors } : {}) } };
    console.error('[demo api]', err);
    return { status: 500, body: { success: false, message: 'Something went wrong on our side. Please try again.' } };
  }
}
