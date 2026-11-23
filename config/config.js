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

// dotenv reads the .env file into process.env
import 'dotenv/config';
import path from 'node:path';

// development, test or production
const env = process.env.NODE_ENV || 'development';

// ---------- CONFIG OBJECT ----------

const config = {
  env,
  isProduction: env === 'production',
  isTest: env === 'test',
  port: Number(process.env.PORT) || 5000,   // default port 5000 if PORT is not set
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/incidentflow',   // local MongoDB if no Atlas URI is set

  // in production there is no fallback secret, it has to be set (checked below)
  jwtSecret: process.env.JWT_SECRET || (env === 'production' ? '' : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',   // how long a sign in lasts

  // the website address(es) allowed to call the API (CORS)
  // can be a comma separated list, ex. "http://localhost:5173,https://our-site.com"
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // uploaded files go in a folder outside the code (and it is in .gitignore)
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),

  // in production Express also serves the built React site so it is one app on one URL
  serveClient: process.env.SERVE_CLIENT === 'true' || env === 'production',
};

// stop the server from starting in production without a real secret
if (config.isProduction && !config.jwtSecret) {
  throw new Error('JWT_SECRET must be set in production.');
}

export default config;
