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

import User from '../models/User.js';
import Incident from '../models/Incident.js';
import { validateProfile, validateSignUp } from '../../shared/validation.js';
import { ApiError, asyncHandler, created, escapeRegex, ok, pick } from '../utils/http.js';

// used for the incident counts on the profile page
import { summarize } from '../../shared/incidentQuery.js';

// true if the :id in the URL is the signed in user
const isSelf = (req) => String(req.user._id) === req.params.id;

// counts the other active admins, used for the last admin guard
async function activeAdminCount(excludeId) {
  return User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: excludeId } });
}

// ---------- LIST USERS (ADMIN) ----------

// GET /api/users?q=&role=&status=
export const listUsers = asyncHandler(async (req, res) => {
  const { q, role, status } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  // search first name, last name or email, not case sensitive
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
  ok(res, { items: users, total: users.length });
});

// ---------- GET ONE USER ----------

// GET /api/users/:id, yourself or admin
export const getUser = asyncHandler(async (req, res) => {
  if (!isSelf(req) && req.user.role !== 'admin') throw ApiError.forbidden('You can only view your own profile.');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  // get the incidents they reported (and assigned ones if they are a technician)
  // Promise.all runs both queries at the same time
  const [reported, assigned] = await Promise.all([
    Incident.find({ createdBy: user._id }).select('status priority isEscalated assignedTo').lean(),
    user.role === 'technician' ? Incident.find({ assignedTo: user._id }).select('status priority isEscalated assignedTo').lean() : [],
  ]);
  ok(res, { user, stats: { reported: summarize(reported), assigned: summarize(assigned) } });
});

// ---------- CREATE USER (ADMIN) ----------

// POST /api/users, unlike sign up the admin can pick the role
export const createUser = asyncHandler(async (req, res) => {
  const errors = { ...validateSignUp(req.body), ...validateProfile(pick(req.body, ['role']), { partial: true }) };
  if (Object.keys(errors).length) throw ApiError.badRequest(undefined, errors);
  const user = new User(pick(req.body, ['firstName', 'lastName', 'email', 'role', 'isActive']));
  await user.setPassword(req.body.password);
  await user.save();
  created(res, { user }, 'User created.');
});

// ---------- UPDATE USER ----------

// PUT /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const admin = req.user.role === 'admin';
  if (!isSelf(req) && !admin) throw ApiError.forbidden('You can only edit your own profile.');

  // admins can also change role and active status, normal users only name and email
  const allowed = admin ? ['firstName', 'lastName', 'email', 'role', 'isActive'] : ['firstName', 'lastName', 'email'];

  // reject the request if it tries to change something it is not allowed to
  const blocked = Object.keys(req.body).filter((k) => !allowed.includes(k) && !['password', 'currentPassword'].includes(k));
  if (blocked.length) throw ApiError.forbidden(`You are not allowed to change: ${blocked.join(', ')}.`);

  const changes = pick(req.body, allowed);
  const errors = validateProfile(changes, { partial: true });
  if (Object.keys(errors).length) throw ApiError.badRequest(undefined, errors);

  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found.');

  // stop the last active admin from being demoted or deactivated
  const losingAdmin = user.role === 'admin' && ((changes.role && changes.role !== 'admin') || changes.isActive === false);
  if (losingAdmin && (await activeAdminCount(user._id)) === 0) {
    throw ApiError.conflict('At least one active admin is required. Promote another admin first.');
  }

  // new email cannot belong to someone else
  if (changes.email && changes.email.trim().toLowerCase() !== user.email) {
    const taken = await User.exists({ email: changes.email.trim().toLowerCase(), _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('An account with that email already exists.', { email: 'An account with that email already exists.' });
  }

  // password change: you need your current password, an admin resetting someone else does not
  if (req.body.password) {
    if (String(req.body.password).length < 8) throw ApiError.badRequest(undefined, { password: 'Password must be at least 8 characters.' });
    if (isSelf(req) && !(await user.checkPassword(req.body.currentPassword || ''))) {
      throw ApiError.badRequest(undefined, { currentPassword: 'Current password is incorrect.' });
    }
    await user.setPassword(req.body.password);
  }

  // copy the changes onto the user and save
  Object.assign(user, changes);
  await user.save();
  ok(res, { user: user.toJSON() }, isSelf(req) ? 'Profile updated.' : 'User updated.');
});

// ---------- DELETE USER (ADMIN) ----------

// DELETE /api/users/:id (deactivating with isActive = false is the softer option)
export const deleteUser = asyncHandler(async (req, res) => {
  // you cannot delete yourself while signed in
  if (isSelf(req)) throw ApiError.conflict('You cannot delete your own account while signed in.');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  if (user.role === 'admin' && user.isActive && (await activeAdminCount(user._id)) === 0) {
    throw ApiError.conflict('At least one active admin is required.');
  }

  // if it was a technician, send their Assigned work back to the unassigned queue
  await Incident.updateMany({ assignedTo: user._id, status: 'Assigned' }, { assignedTo: null, status: 'Open' });
  await Incident.updateMany({ assignedTo: user._id }, { assignedTo: null });
  await user.deleteOne();
  ok(res, { id: req.params.id }, 'User deleted.');
});
