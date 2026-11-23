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

// node built-ins for file paths
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// express + middleware packages
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// our own files
import config from '../config/config.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errors.js';

// ES modules do not have __dirname so we rebuild it from the file URL
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// where npm run build puts the React site
const clientDist = path.resolve(__dirname, '../client/dist');

// ---------- APP SETUP ----------

const app = express();

// don't tell people we are running Express
app.disable('x-powered-by');

// hosting sites like Render sit in front of the app, this makes req.ip the real user IP
// (needed so the rate limiter does not block everyone at once)
app.set('trust proxy', 1); // correct client IPs for rate limiting behind Render/Railway proxies

// helmet adds a bunch of security headers for us
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(
  // CORS = which websites are allowed to call this API from the browser
  cors({
    origin(origin, cb) {
      // no origin means same site or a tool like Postman, otherwise it has to be in our list
      if (!origin || config.clientUrls.includes(origin)) return cb(null, true);
      cb(null, false);
    },
  })
);

// reads JSON request bodies into req.body (100kb max so nobody sends a huge body)
app.use(express.json({ limit: '100kb' }));

// morgan logs every request in the terminal, turned off during tests
if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// ---------- ROUTES ----------

// every API route starts with /api, the list is in routes/index.js
app.use('/api', apiRoutes);

// any /api route that does not exist gets a 404 JSON response
app.use('/api', notFound);

// ---------- SERVE THE REACT BUILD (PRODUCTION) ----------

// one service for everything: Express serves the built website too
if (config.serveClient && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '7d', index: false }));

  // any other URL gets index.html so React Router can handle it
  // (this is what makes refreshing on /dashboard work)
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ---------- ERROR HANDLER ----------

// has to be last so it catches errors from everything above
app.use(errorHandler);

export default app;
