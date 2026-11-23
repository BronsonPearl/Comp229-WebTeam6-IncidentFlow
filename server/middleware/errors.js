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

import mongoose from 'mongoose';
import multer from 'multer';
import config from '../../config/config.js';
import { ApiError } from '../utils/http.js';

// ---------- VALIDATION MIDDLEWARE ----------

// stops bad ids like /api/users/abc before they reach Mongo (gives 400 instead of crashing)
export const validateObjectId = (param = 'id') => (req, _res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) return next(ApiError.badRequest('That record ID is not valid.'));
  next();
};

// runs a validator from shared/validation.js, sends 400 with the field errors if anything fails
export const validateBody = (validator, options) => (req, _res, next) => {
  const errors = validator(req.body || {}, options);
  if (Object.keys(errors).length) return next(ApiError.badRequest(undefined, errors));
  next();
};

// for /api routes that do not exist
export const notFound = (req, _res, next) => next(ApiError.notFound(`No API route for ${req.method} ${req.originalUrl}`));

// ---------- ERROR HANDLER ----------

// Express knows this is the error handler because it has 4 parameters
// every error ends up here and gets sent back as { success: false, message, errors }
export function errorHandler(err, req, res, _next) {
  // our own ApiError already has a status, anything else defaults to 500
  let status = err.status || 500;
  let message = err.message;
  let errors = err.errors;

  // mongoose schema validation failed -> 400 with a message per field
  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Please correct the highlighted fields.';
    errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));

  // bad id format -> 400
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = 'That record ID is not valid.';
    errors = undefined;

  // MongoDB duplicate key (ex. email already used) -> 409 conflict
  } else if (err?.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = field === 'email' ? 'An account with that email already exists.' : `That ${field} is already in use.`;
    errors = { [field]: message };

  // file upload problems like a file that is too big -> 400
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum size is 5 MB.' : err.message;
    errors = { file: message };

  // someone sent broken JSON
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  }

  // real server errors: log the details for us but only send a friendly message
  // (never send the stack trace to the browser)
  if (status >= 500) {
    if (!config.isTest) console.error('[error]', req.method, req.originalUrl, err);
    message = 'Something went wrong on our side. Please try again.';
    errors = undefined;
  }

  const body = { success: false, message };
  if (errors && !(errors instanceof Error)) body.errors = errors;
  res.status(status).json(body);
}
