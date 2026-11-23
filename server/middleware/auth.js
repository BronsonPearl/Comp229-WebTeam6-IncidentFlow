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

// jsonwebtoken makes and checks the tokens
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/http.js';

// ---------- TOKENS ----------

// creates a signed token holding the user id (sub) and role, expires after 7 days by default
export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// the React app sends the token as "Authorization: Bearer <token>"
function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// checks the token signature then finds the user in the database
// jwt.verify throws an error if the token is fake or expired
async function loadUser(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  const user = await User.findById(payload.sub);
  return user;
}

// ---------- MIDDLEWARE ----------

// for any route that needs you to be signed in
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);

  // no token = 401
  if (!token) throw ApiError.unauthorized();
  let user;
  try {
    user = await loadUser(token);

  // bad or expired token, also 401
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  // token is fine but the account was deleted
  if (!user) throw ApiError.unauthorized('Your account no longer exists.');

  // deactivated accounts get 403 even with a valid token
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact an administrator.');

  // the controllers use req.user from here on
  req.user = user; // role is read from the database, never trusted from the token alone
  next();
});

// for routes that work signed in or out (the public incident list)
// never blocks, just adds req.user if the token is good
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      const user = await loadUser(token);
      if (user?.isActive) req.user = user;
    } catch {
    }
  }
  next();
});

// requireRole("admin") lets only admins through, can pass more than one role
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden('This area is restricted to ' + roles.join(' / ') + ' accounts.'));
  next();
};
