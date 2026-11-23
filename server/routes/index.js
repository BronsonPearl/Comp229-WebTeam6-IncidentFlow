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

// packages
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

// middleware
import config from '../../config/config.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateObjectId } from '../middleware/errors.js';
import { uploadSingle } from '../middleware/upload.js';

// shared validation used on the auth routes
import { validateSignIn, validateSignUp } from '../../shared/validation.js';

// controllers (import * gives an object with all the exported functions)
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as incidents from '../controllers/incidentController.js';
import * as collab from '../controllers/collaborationController.js';
import * as analytics from '../controllers/analyticsController.js';

// ---------- SETUP ----------

const router = Router();

// shortcut, checks that :id in the URL is a real MongoDB id before the controller runs
const id = validateObjectId('id');

// max 50 sign in / sign up attempts per 15 minutes per IP to slow down password guessing
// (1000 during tests so the tests are not blocked)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.isTest ? 1000 : 50, standardHeaders: 'draft-7', legacyHeaders: false });

// simple check that the server is up, Render uses this
router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

// ---------- AUTH ----------

router.post('/auth/signup', authLimiter, validateBody(validateSignUp), auth.signup);
router.post('/auth/signin', authLimiter, validateBody(validateSignIn), auth.signin);

// returns the signed in user, the React app calls this on load to check the token is still good
router.get('/auth/me', requireAuth, auth.me);

// ---------- USERS ----------

// list and create are admin only
router.get('/users', requireAuth, requireRole('admin'), users.listUsers);
router.post('/users', requireAuth, requireRole('admin'), users.createUser);

// view and edit allow yourself or an admin, the controller does that check
router.get('/users/:id', requireAuth, id, users.getUser);
router.put('/users/:id', requireAuth, id, users.updateUser);
router.delete('/users/:id', requireAuth, requireRole('admin'), id, users.deleteUser);

// ---------- INCIDENTS ----------

// optionalAuth because the list also works signed out (public fields only)
router.get('/incidents', optionalAuth, incidents.listIncidents);
router.post('/incidents', requireAuth, incidents.createIncident);
router.get('/incidents/:id', requireAuth, id, incidents.getIncident);
router.put('/incidents/:id', requireAuth, id, incidents.updateIncident);
router.delete('/incidents/:id', requireAuth, id, incidents.deleteIncident);

// audit timeline for one incident, and the recent activity feed for dashboards
router.get('/incidents/:id/activities', requireAuth, id, incidents.listActivities);
router.get('/activities/recent', requireAuth, incidents.recentActivities);

// ---------- COMMENTS ----------

router.get('/incidents/:id/comments', requireAuth, id, collab.listComments);
router.post('/incidents/:id/comments', requireAuth, id, collab.addComment);
router.put('/comments/:id', requireAuth, id, collab.updateComment);
router.delete('/comments/:id', requireAuth, id, collab.deleteComment);

// ---------- ATTACHMENTS ----------

router.get('/incidents/:id/attachments', requireAuth, id, collab.listAttachments);

// uploadSingle (multer) reads the file before the controller
router.post('/incidents/:id/attachments', requireAuth, id, uploadSingle, collab.uploadAttachment);

// files are downloaded through a route that checks access, not a public link
router.get('/attachments/:id/file', requireAuth, id, collab.downloadAttachment);
router.delete('/attachments/:id', requireAuth, id, collab.deleteAttachment);

// ---------- NOTIFICATIONS ----------

router.get('/notifications', requireAuth, collab.listNotifications);

// read-all has to come before /:id/read or Express would treat "read-all" as an id
router.put('/notifications/read-all', requireAuth, collab.markAllRead);
router.put('/notifications/:id/read', requireAuth, id, collab.markRead);

// ---------- ANALYTICS ----------

router.get('/analytics/summary', requireAuth, requireRole('admin'), analytics.summary);

export default router;
