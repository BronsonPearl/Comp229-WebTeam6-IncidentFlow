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

import Incident from '../models/Incident.js';
import User from '../models/User.js';
import { buildAnalytics } from '../../shared/incidentQuery.js';
import { asyncHandler, ok } from '../utils/http.js';

// admin only (checked in the routes)
export const summary = asyncHandler(async (req, res) => {
  // trend chart range, kept between 7 and 180 days
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);

  // only load the fields the charts need, plus the recent lists for the dashboard
  // lean() gives plain objects which is faster when we are not saving
  const [incidents, users, recentUsers, recentIncidents] = await Promise.all([
    Incident.find().select('status priority category createdAt resolvedAt assignedTo isEscalated').lean(),
    User.find().select('firstName lastName role isActive').lean(),
    User.find().sort({ createdAt: -1 }).limit(5),
    Incident.find().sort({ createdAt: -1 }).limit(6).populate('createdBy', 'firstName lastName').populate('assignedTo', 'firstName lastName').lean(),
  ]);
  ok(res, { ...buildAnalytics(incidents, users, { days }), recentUsers, recentIncidents });
});
