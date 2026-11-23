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

// ---------- API ERROR ----------

// an Error that also carries an HTTP status and optional field errors
// ex. throw ApiError.forbidden() and the error handler sends a 403
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  // shortcut methods for the status codes we use the most
  static badRequest(message = 'Please correct the highlighted fields.', errors) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Please sign in to continue.') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError(403, message);
  }
  static notFound(message = 'The requested record was not found.') {
    return new ApiError(404, message);
  }
  static conflict(message, errors) {
    return new ApiError(409, message, errors);
  }
}

// ---------- HELPERS ----------

// wraps an async controller so any thrown error goes to the error handler (next)
// without this an error in an async function would just hang the request
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// the success format every route uses: { success: true, data, message }
export function ok(res, data, message, status = 200) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}

// same thing with status 201 (something was created)
export const created = (res, data, message) => ok(res, data, message, 201);

// escapes special characters so a search like "a.b*" is treated as plain text in $regex
export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// copies only the allowed keys from an object
// used so nobody can sneak extra fields like role or createdBy into a request
export function pick(obj = {}, keys = []) {
  const out = {};
  keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  });
  return out;
}
