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

// node's built in test runner and assert library
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedStatusTargets, canDeleteIncident, canViewIncident, editableFields, toPublicIncident } from '../../shared/incidentPolicy.js';
import { validateIncident, validateSignUp, validateComment } from '../../shared/validation.js';
import { buildAnalytics, filterIncidents, sortIncidents, summarize } from '../../shared/incidentQuery.js';

// ---------- TEST DATA ----------

// fake users for each role (only _id and role are needed for the policy)
const user = { _id: 'u1', role: 'user' };
const other = { _id: 'u2', role: 'user' };
const tech = { _id: 't1', role: 'technician' };
const tech2 = { _id: 't2', role: 'technician' };
const admin = { _id: 'a1', role: 'admin' };

// makes a test incident reported by u1, override any field with o
const incident = (o = {}) => ({ _id: 'i1', createdBy: 'u1', assignedTo: null, status: 'Open', ...o });

// ---------- PERMISSION TESTS ----------

test('reporter can edit and delete own incident only while Open', () => {
  assert.ok(editableFields(user, incident()).includes('title'));
  assert.ok(canDeleteIncident(user, incident()));

  // once a technician is working on it the reporter cannot edit or delete
  assert.deepEqual(editableFields(user, incident({ status: 'In Progress', assignedTo: 't1' })), []);
  assert.equal(canDeleteIncident(user, incident({ status: 'Assigned' })), false);
});

// one user should never touch another user's incident
test('users cannot view or edit other users incidents', () => {
  assert.equal(canViewIncident(other, incident()), false);
  assert.deepEqual(editableFields(other, incident()), []);
  assert.equal(canDeleteIncident(other, incident()), false);
});

// technician can only edit what is assigned to them and must follow the lifecycle
test('technician edits only assigned incidents and follows lifecycle', () => {
  const assigned = incident({ assignedTo: 't1', status: 'Assigned' });
  assert.deepEqual(editableFields(tech, assigned).sort(), ['priority', 'resolution', 'status']);
  assert.deepEqual(editableFields(tech2, assigned), []);
  assert.deepEqual(allowedStatusTargets(tech, assigned), ['In Progress']);
  assert.deepEqual(allowedStatusTargets(tech, { ...assigned, status: 'In Progress' }).sort(), ['On Hold', 'Resolved']);
  assert.ok(!editableFields(tech, assigned).includes('assignedTo'), 'technicians cannot reassign');
});

// admin can do anything, reporter can close a Resolved incident
test('admin has full control; reporter may close a resolved incident', () => {
  assert.ok(editableFields(admin, incident()).includes('assignedTo'));
  assert.ok(canDeleteIncident(admin, incident({ status: 'Closed' })));
  assert.deepEqual(allowedStatusTargets(user, incident({ status: 'Resolved', assignedTo: 't1' })), ['Closed']);
});

// the public version should only have the 7 safe fields
test('public projection never leaks protected fields', () => {
  const pub = toPublicIncident({ _id: 'x', incidentNumber: 'INC-1', title: 't', description: 'secret', createdBy: 'u1', location: 'Room', resolution: 'r', status: 'Open', priority: 'Low', category: 'IT', createdAt: 'd' });
  assert.deepEqual(Object.keys(pub).sort(), ['_id', 'category', 'createdAt', 'incidentNumber', 'priority', 'status', 'title']);
});

// ---------- VALIDATION TESTS ----------

test('validation rules match the blueprint', () => {
  assert.ok(validateIncident({ title: 'abc', description: 'short', category: 'Nope', priority: 'Low', location: 'X' }).title);
  assert.deepEqual(validateIncident({ title: 'Printer on fire', description: 'There is smoke coming out', category: 'Safety', priority: 'Critical', location: 'Room 1' }), {});
  assert.ok(validateSignUp({ firstName: 'A', lastName: 'Bee', email: 'bad', password: 'short' }).email);
  assert.ok(validateSignUp({ firstName: 'Ann', lastName: 'Bee', email: 'a@b.co', password: 'abcdefgh1', confirmPassword: 'x' }).confirmPassword);
  assert.ok(validateComment({ message: '   ' }).message);
});

// ---------- LIST HELPER TESTS ----------

test('filter, sort and summary helpers', () => {
  const list = [
    { incidentNumber: 'INC-1', title: 'Wi-Fi down', category: 'IT', priority: 'High', status: 'Open', createdAt: '2026-01-02' },
    { incidentNumber: 'INC-2', title: 'Leak', category: 'Facilities', priority: 'Critical', status: 'Assigned', createdAt: '2026-01-01', assignedTo: 't1' },
    { incidentNumber: 'INC-3', title: 'Lights', category: 'Facilities', priority: 'Low', status: 'Resolved', createdAt: '2026-01-03', resolvedAt: '2026-01-04' },
  ];
  assert.equal(filterIncidents(list, { q: 'wi-fi' }).length, 1);
  assert.equal(filterIncidents(list, { category: 'Facilities', status: 'Resolved' }).length, 1);
  assert.equal(filterIncidents(list, { unassigned: 'true' }).length, 2);
  assert.equal(sortIncidents(list, 'priority')[0].incidentNumber, 'INC-2');
  assert.equal(sortIncidents(list, 'oldest')[0].incidentNumber, 'INC-2');
  const s = summarize(list);
  assert.equal(s.critical, 1);
  assert.equal(s.total, 3);

  // analytics should count from the data we pass in
  const a = buildAnalytics(list, [{ _id: 't1', role: 'technician', firstName: 'J', lastName: 'L', isActive: true }], { days: 7, now: new Date('2026-01-05') });
  assert.equal(a.byPriority.find((p) => p.name === 'Critical').value, 1);
  assert.equal(a.workload[0].active, 1);
  assert.equal(a.resolution.resolvedCount, 1);
});
