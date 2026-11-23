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
import { signToken } from '../middleware/auth.js';
import { ApiError, asyncHandler, created, ok } from '../utils/http.js';

// ---------- SIGN UP ----------

// POST /api/auth/signup (the body was already validated by validateBody in the routes)
export const signup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // check the email is not already used, 409 if it is
  const exists = await User.exists({ email: String(email).trim().toLowerCase() });
  if (exists) throw ApiError.conflict('An account with that email already exists.', { email: 'An account with that email already exists.' });

  // role is always 'user' here, even if someone sends role: 'admin' in the request
  const user = new User({ firstName, lastName, email, role: 'user' });

  // hash the password before saving
  await user.setPassword(password);
  await user.save();
  created(res, { user }, 'Account created. You can now sign in.');
});

// ---------- SIGN IN ----------

// POST /api/auth/signin
export const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // need +passwordHash because it is hidden by default
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');

  // same message for wrong email or wrong password so nobody can tell which emails exist
  if (!user || !(await user.checkPassword(password))) throw ApiError.unauthorized('Incorrect email or password.');

  // deactivated accounts cannot sign in
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact an administrator.');

  // send back the token and the user (without the hash)
  ok(res, { token: signToken(user), user: user.toJSON() }, `Welcome back, ${user.firstName}.`);
});

// ---------- ME ----------

// GET /api/auth/me, requireAuth already loaded req.user
export const me = asyncHandler(async (req, res) => ok(res, { user: req.user }));
