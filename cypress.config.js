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

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // local dev by default, or the deployed URL from the environment
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    video: true,   // records a video of each run
    viewportWidth: 1366,
    viewportHeight: 860,
  },

  // emails of the seeded demo accounts, the password is passed in separately
  env: {
    userEmail: 'taylor.chen@incidentflow.demo',
    adminEmail: 'alex.morgan@incidentflow.demo',
    techEmail: 'jordan.lee@incidentflow.demo',
  },
});
