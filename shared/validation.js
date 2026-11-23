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

// enums and length limits from the shared constants file
import { CATEGORIES, PRIORITIES, STATUSES, ROLES, LIMITS } from './constants.js';

// ---------- HELPERS ----------

// simple email pattern: something@something.something
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// turns anything into a trimmed string so "   " counts as empty
const str = (v) => (typeof v === 'string' ? v.trim() : '');

// checks a field is filled in and between min and max characters
// puts the error message straight into the errors object
function length(errors, field, value, [min, max], label) {
  const v = str(value);
  if (!v) errors[field] = `${label} is required.`;
  else if (v.length < min || v.length > max) errors[field] = `${label} must be ${min} to ${max} characters.`;
}

// true if the email matches the pattern
export function isValidEmail(email) {
  return EMAIL_RE.test(str(email));
}

// ---------- SIGN UP / SIGN IN ----------

// used by the Sign Up page and the signup API route
export function validateSignUp(data = {}) {
  const errors = {};
  length(errors, 'firstName', data.firstName, LIMITS.name, 'First name');
  length(errors, 'lastName', data.lastName, LIMITS.name, 'Last name');
  if (!str(data.email)) errors.email = 'Email is required.';
  else if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address.';

  // password needs 8+ characters with at least one letter and one number
  if (!data.password) errors.password = 'Password is required.';
  else if (String(data.password).length < LIMITS.passwordMin) errors.password = `Password must be at least ${LIMITS.passwordMin} characters.`;
  else if (!/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) errors.password = 'Password must include a letter and a number.';

  // only checks confirm password if the form sent it (the API does not)
  if ('confirmPassword' in data && data.confirmPassword !== data.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
} // end validateSignUp

// sign in just needs a valid looking email and any password
export function validateSignIn(data = {}) {
  const errors = {};
  if (!str(data.email)) errors.email = 'Email is required.';
  else if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.password) errors.password = 'Password is required.';
  return errors;
}

// ---------- PROFILE / USERS ----------

// partial = true means only check the fields that were actually sent
// ex. an update that only changes firstName should not fail because email is missing
export function validateProfile(data = {}, { partial = false } = {}) {
  const errors = {};
  if (!partial || 'firstName' in data) length(errors, 'firstName', data.firstName, LIMITS.name, 'First name');
  if (!partial || 'lastName' in data) length(errors, 'lastName', data.lastName, LIMITS.name, 'Last name');
  if (!partial || 'email' in data) {
    if (!str(data.email)) errors.email = 'Email is required.';
    else if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address.';
  }

  // role and isActive can only be sent by an admin, but still have to be valid values
  if ('role' in data && !ROLES.includes(data.role)) errors.role = 'Choose a valid role.';
  if ('isActive' in data && typeof data.isActive !== 'boolean') errors.isActive = 'Active status must be true or false.';
  return errors;
}

// ---------- INCIDENTS ----------

// same partial idea as validateProfile, used for create (full) and edit (partial)
export function validateIncident(data = {}, { partial = false } = {}) {
  const errors = {};

  // true if this field should be checked
  const has = (f) => !partial || f in data;
  if (has('title')) length(errors, 'title', data.title, LIMITS.title, 'Title');
  if (has('description')) length(errors, 'description', data.description, LIMITS.description, 'Description');
  if (has('location')) length(errors, 'location', data.location, LIMITS.location, 'Location');
  if (has('category') && !CATEGORIES.includes(data.category)) errors.category = 'Choose a valid category.';
  if (has('priority') && !PRIORITIES.includes(data.priority)) errors.priority = 'Choose a valid priority.';
  if ('status' in data && !STATUSES.includes(data.status)) errors.status = 'Choose a valid status.';

  // resolution is optional here, the controller decides when it is required (resolving)
  if ('resolution' in data && data.resolution && str(data.resolution).length > LIMITS.resolution[1]) {
    errors.resolution = `Resolution must be under ${LIMITS.resolution[1]} characters.`;
  }
  return errors;
} // end validateIncident

// ---------- COMMENTS ----------

// a comment cannot be empty and has a max length
export function validateComment(data = {}) {
  const errors = {};
  length(errors, 'message', data.message, LIMITS.comment, 'Comment');
  return errors;
}

// quick way to ask "did anything fail?"
export const hasErrors = (errors) => Object.keys(errors).length > 0;
