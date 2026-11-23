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

// mongoose = library for talking to MongoDB
import mongoose from 'mongoose';
import config from './config/config.js';

// the Express app with all the routes
import app from './server/express.js';

// connect to the database first, only start the server if that worked
async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);

    // start accepting requests
    app.listen(config.port, () => {
      console.log(`[api] IncidentFlow API listening on http://localhost:${config.port} (${config.env})`);
    });

  // if the database is down there is no point running, so exit with an error code
  } catch (err) {
    console.error('[db] Could not connect to MongoDB:', err.message);
    process.exit(1);
  }
} // end start

// run it
start();
