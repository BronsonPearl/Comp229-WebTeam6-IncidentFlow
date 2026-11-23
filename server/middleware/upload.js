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

// node built-ins (crypto is for the random file names)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// multer handles multipart/form-data uploads
import multer from 'multer';
import config from '../../config/config.js';
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from '../../shared/constants.js';
import { ApiError } from '../utils/http.js';

// make the uploads folder if it is not there yet
fs.mkdirSync(config.uploadDir, { recursive: true });

// ---------- STORAGE ----------

// save to disk with a random name so people cannot guess other file URLs
// ex. 3f9a...c1.png, keeps the original extension
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
});

// ---------- FILE CHECKS ----------

// checks both the MIME type and the extension match our allowed list
function fileFilter(_req, file, cb) {
  const allowedExt = ATTACHMENT_TYPES[file.mimetype];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt || !allowedExt.includes(ext)) {
    return cb(ApiError.badRequest('Only JPG, PNG and PDF files are allowed.', { file: 'Only JPG, PNG and PDF files are allowed.' }));
  }
  cb(null, true);
}

// reads one file from the form field named "file", with the 5 MB limit
export const uploadSingle = multer({ storage, fileFilter, limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 } }).single('file');
