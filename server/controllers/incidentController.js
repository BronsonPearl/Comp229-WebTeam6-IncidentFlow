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

// node built-ins for deleting attachment files
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

// models
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import { Activity, Attachment, Comment, Notification } from '../models/supporting.js';
import config from '../../config/config.js';

// shared rules
import { PRIORITY_RANK } from '../../shared/constants.js';
import { validateIncident } from '../../shared/validation.js';
import {
  allowedStatusTargets,
  canDeleteIncident,
  canViewIncident,
  editableFields,
  toPublicIncident,
} from '../../shared/incidentPolicy.js';
import { ApiError, asyncHandler, created, escapeRegex, ok, pick } from '../utils/http.js';

// workflow helpers (activity log and notifications)
import { adminIds, logActivity, nextIncidentNumber, notify } from '../services/workflow.js';

// which user fields to include when we populate createdBy and assignedTo
const PEOPLE = 'firstName lastName email role';
const populate = (q) => q.populate('createdBy', PEOPLE).populate('assignedTo', PEOPLE);

// statuses that count as finished
const RESOLVED = ['Resolved', 'Closed'];

// ---------- HELPERS ----------

// sent with the incident so React knows which buttons to show
function permissionsFor(user, incident) {
  return {
    editableFields: editableFields(user, incident),
    statusTargets: allowedStatusTargets(user, incident),
    canDelete: canDeleteIncident(user, incident),
  };
}

// load an incident with people filled in, or throw 404
async function findIncidentOr404(id) {
  const incident = await populate(Incident.findById(id));
  if (!incident) throw ApiError.notFound('Incident not found.');
  return incident;
}

// ---------- LIST INCIDENTS ----------

// GET /api/incidents
// scope: public (signed out), mine (I reported), assigned (my queue), all (staff only)
export const listIncidents = asyncHandler(async (req, res) => {
  const user = req.user;

  // signed out users always get the public scope
  const scope = user ? req.query.scope || 'mine' : 'public';
  const { q, status, priority, category, escalated, unassigned, sort = 'newest' } = req.query;

  // paging, max 100 per page
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const filter = {};

  // build the MongoDB filter for the scope
  if (scope === 'mine') filter.createdBy = user._id;
  else if (scope === 'assigned') {
    if (!['technician', 'admin'].includes(user.role)) throw ApiError.forbidden('Only technicians have an assigned queue.');
    filter.assignedTo = user._id;
  } else if (scope === 'all') {
    if (!['technician', 'admin'].includes(user.role)) throw ApiError.forbidden('Only staff can view all incidents.');
  } else if (scope !== 'public') throw ApiError.badRequest('Unknown scope.');

  // add the dropdown filters
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (escalated === 'true') filter.isEscalated = true;
  if (unassigned === 'true') filter.assignedTo = null;

  // search number, title or location
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: re }, { incidentNumber: re }, { location: re }];
  }

  // sort options that MongoDB can do directly
  const sorts = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, updated: { updatedAt: -1 } };
  const total = await Incident.countDocuments(filter);

  let items;

  // priority is a word so it needs an aggregation to sort by its rank number
  if (sort === 'priority') {
    const ranked = await Incident.aggregate([
      { $match: filter },
      { $addFields: { _rank: { $switch: { branches: Object.entries(PRIORITY_RANK).map(([k, v]) => ({ case: { $eq: ['$priority', k] }, then: v })), default: 0 } } } },
      { $sort: { _rank: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _id: 1 } },
    ]);
    const ids = ranked.map((r) => r._id);
    const docs = await populate(Incident.find({ _id: { $in: ids } })).lean();
    items = ids.map((id) => docs.find((d) => String(d._id) === String(id)));
  } else {
    items = await populate(Incident.find(filter).sort(sorts[sort] || sorts.newest).skip((page - 1) * limit).limit(limit)).lean();
  }

  // strip everything except the safe public fields
  if (scope === 'public') items = items.map(toPublicIncident);
  ok(res, { items, total, page, pages: Math.ceil(total / limit) || 1, scope });
});

// ---------- GET ONE INCIDENT ----------

// GET /api/incidents/:id, 403 if this user is not allowed to see it
export const getIncident = asyncHandler(async (req, res) => {
  const incident = await findIncidentOr404(req.params.id);
  if (!canViewIncident(req.user, incident)) throw ApiError.forbidden('You do not have access to this incident.');
  ok(res, { incident, permissions: permissionsFor(req.user, incident) });
});

// ---------- CREATE INCIDENT ----------

// POST /api/incidents
export const createIncident = asyncHandler(async (req, res) => {
  // only take the fields a reporter fills in (status, createdBy etc. are set by the server)
  const data = pick(req.body, ['title', 'description', 'category', 'priority', 'location']);
  const errors = validateIncident(data);
  if (Object.keys(errors).length) throw ApiError.badRequest(undefined, errors);

  // new incidents always start as Open with the signed in user as the reporter
  const incident = new Incident({ ...data, incidentNumber: await nextIncidentNumber(), createdBy: req.user._id, status: 'Open' });

  // Critical incidents are escalated right away
  if (incident.priority === 'Critical') {
    incident.isEscalated = true;
    incident.escalationReason = 'Automatically escalated: Critical priority.';
  }
  await incident.save();

  // first line of the audit timeline
  await logActivity(incident, req.user, 'created', { newValue: incident.incidentNumber });

  // tell the admins about a critical incident
  if (incident.isEscalated) {
    await logActivity(incident, req.user, 'escalated', { newValue: incident.escalationReason });
    await notify(await adminIds(), req.user, incident, 'escalation', `${incident.incidentNumber} was reported as Critical: ${incident.title}`);
  }
  const full = await findIncidentOr404(incident._id);
  created(res, { incident: full, permissions: permissionsFor(req.user, full) }, `Incident ${incident.incidentNumber} reported.`);
});

// ---------- UPDATE INCIDENT ----------

// PUT /api/incidents/:id
// what you can change depends on your role and the status (see editableFields)
export const updateIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found.');
  const actor = req.user;
  if (!canViewIncident(actor, incident)) throw ApiError.forbidden('You do not have access to this incident.');

  // no editable fields at all = 403
  const allowed = editableFields(actor, incident);
  if (!allowed.length) throw ApiError.forbidden('You are not authorized to update this incident.');
  const requested = Object.keys(req.body).filter((k) => req.body[k] !== undefined);

  // trying to change a field you are not allowed to = 403
  const blocked = requested.filter((k) => !allowed.includes(k));
  if (blocked.length) throw ApiError.forbidden(`You are not authorized to change: ${blocked.join(', ')}.`);

  const body = pick(req.body, allowed);
  const errors = validateIncident(body, { partial: true });
  if (Object.keys(errors).length) throw ApiError.badRequest(undefined, errors);

  const reporter = incident.createdBy;

  // copy of the old values for the activity log
  const before = incident.toObject();

  // notifications to send after saving: [type, message, who]
  const events = []; // [type, message, recipients]

  // 1. normal field edits, each change gets its own activity entry
  // (description and resolution are long so we just say they were updated)
  for (const field of ['title', 'description', 'category', 'location', 'resolution']) {
    if (field in body && String(body[field]).trim() !== String(before[field] ?? '')) {
      incident[field] = String(body[field]).trim();
      const long = field === 'description' || field === 'resolution';
      await logActivity(incident, actor, 'updated', { field, oldValue: long ? null : before[field], newValue: long ? null : incident[field] });
    }
  }

  // 2. priority change, raising it to Critical escalates it automatically
  if (body.priority && body.priority !== before.priority) {
    incident.priority = body.priority;
    await logActivity(incident, actor, 'priority_changed', { field: 'priority', oldValue: before.priority, newValue: body.priority });
    if (body.priority === 'Critical' && !incident.isEscalated && !RESOLVED.includes(incident.status)) {
      incident.isEscalated = true;
      incident.escalationReason = 'Automatically escalated: priority raised to Critical.';
      await logActivity(incident, actor, 'escalated', { newValue: incident.escalationReason });
      events.push(['escalation', `${incident.incidentNumber} was escalated (Critical).`, [...(await adminIds()), incident.assignedTo]]);
    }
  }

  // 3. assigning a technician (admin only)
  if ('assignedTo' in body && String(body.assignedTo || '') !== String(before.assignedTo || '')) {
    if (body.assignedTo) {
      if (!mongoose.isValidObjectId(body.assignedTo)) throw ApiError.badRequest(undefined, { assignedTo: 'Choose a valid technician.' });

      // the person has to be an active technician
      const tech = await User.findOne({ _id: body.assignedTo, role: 'technician', isActive: true });
      if (!tech) throw ApiError.badRequest(undefined, { assignedTo: 'Assignee must be an active technician.' });
      incident.assignedTo = tech._id;
      await logActivity(incident, actor, 'assigned', { field: 'assignedTo', newValue: tech.fullName });
      events.push(['assignment', `You were assigned ${incident.incidentNumber}: ${incident.title}`, [tech._id]]);

      // assigning an Open incident moves it to Assigned
      if (incident.status === 'Open' && !body.status) {
        incident.status = 'Assigned';
        await logActivity(incident, actor, 'status_changed', { field: 'status', oldValue: 'Open', newValue: 'Assigned' });
      }

    // unassigning puts an Assigned incident back to Open
    } else {
      incident.assignedTo = null;
      await logActivity(incident, actor, 'unassigned', { field: 'assignedTo' });
      if (incident.status === 'Assigned' && !body.status) incident.status = 'Open';
    }
  }

  // 4. status changes have to follow the lifecycle rules for this user
  if (body.status && body.status !== before.status) {
    const targets = allowedStatusTargets(actor, before);
    if (!targets.includes(body.status)) throw ApiError.forbidden(`You cannot move an incident from ${before.status} to ${body.status}.`);
    if (body.status === 'Assigned' && !incident.assignedTo) throw ApiError.badRequest(undefined, { status: 'Assign a technician before setting status to Assigned.' });

    // you cannot resolve without writing a resolution
    if (body.status === 'Resolved' && !String(incident.resolution || '').trim()) {
      throw ApiError.badRequest(undefined, { resolution: 'Add a resolution summary before resolving.' });
    }

    // going from Resolved/Closed back to an open status counts as reopening
    const reopening = RESOLVED.includes(before.status) && !RESOLVED.includes(body.status);
    incident.status = body.status;

    // resolvedAt is used for the resolution time analytics
    if (RESOLVED.includes(body.status) && !incident.resolvedAt) incident.resolvedAt = new Date();
    if (reopening) {
      incident.resolvedAt = null;
      await logActivity(incident, actor, 'reopened', { field: 'status', oldValue: before.status, newValue: body.status });
    } else {
      await logActivity(incident, actor, 'status_changed', { field: 'status', oldValue: before.status, newValue: body.status });
    }

    // reporter gets a resolution notification, other changes send a status notification
    if (body.status === 'Resolved') {
      if (incident.isEscalated) incident.isEscalated = false;
      events.push(['resolution', `${incident.incidentNumber} was resolved: ${incident.title}`, [reporter]]);
    } else {
      events.push(['status', `${incident.incidentNumber} status changed to ${body.status}.`, [reporter, incident.assignedTo]]);
    }
  }

  // 5. manual escalation by an admin (needs a reason)
  if ('isEscalated' in body && Boolean(body.isEscalated) !== before.isEscalated) {
    if (body.isEscalated) {
      const reason = String(body.escalationReason || '').trim();
      if (reason.length < 3) throw ApiError.badRequest(undefined, { escalationReason: 'Give a reason for the escalation.' });
      incident.isEscalated = true;
      incident.escalationReason = reason;
      await logActivity(incident, actor, 'escalated', { newValue: reason });
      events.push(['escalation', `${incident.incidentNumber} was escalated: ${reason}`, [...(await adminIds()), incident.assignedTo, reporter]]);
    } else {
      incident.isEscalated = false;
      await logActivity(incident, actor, 'de_escalated', { oldValue: before.escalationReason });
    }
  }

  // save once at the end, then send the notifications
  await incident.save();
  for (const [type, message, recipients] of events) await notify(recipients, actor, incident, type, message);

  const full = await findIncidentOr404(incident._id);
  ok(res, { incident: full, permissions: permissionsFor(actor, full) }, 'Incident updated.');
});

// ---------- DELETE INCIDENT ----------

// DELETE /api/incidents/:id, admin anytime, reporter only while Open
export const deleteIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found.');
  if (!canDeleteIncident(req.user, incident)) {
    throw ApiError.forbidden(req.user.role === 'admin' ? undefined : 'You can only delete your own incidents while they are still Open.');
  }

  // delete the uploaded files and everything linked to the incident
  const attachments = await Attachment.find({ incident: incident._id });
  await Promise.all(attachments.map((a) => fs.unlink(path.join(config.uploadDir, path.basename(a.fileUrl))).catch(() => {})));
  await Promise.all([
    Comment.deleteMany({ incident: incident._id }),
    Activity.deleteMany({ incident: incident._id }),
    Notification.deleteMany({ incident: incident._id }),
    Attachment.deleteMany({ incident: incident._id }),
  ]);
  await incident.deleteOne();
  ok(res, { id: req.params.id }, `Incident ${incident.incidentNumber} deleted.`);
});

// ---------- ACTIVITY TIMELINE ----------

// GET /api/incidents/:id/activities, oldest first like a timeline
export const listActivities = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id).select('createdBy assignedTo status');
  if (!incident) throw ApiError.notFound('Incident not found.');
  if (!canViewIncident(req.user, incident)) throw ApiError.forbidden('You do not have access to this incident.');
  const items = await Activity.find({ incident: incident._id }).sort({ createdAt: 1 }).populate('user', 'firstName lastName role');
  ok(res, { items });
});

// GET /api/activities/recent for the dashboard feed
// normal users only see activity on their own incidents
export const recentActivities = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'user') {
    const mine = await Incident.find({ createdBy: req.user._id }).select('_id');
    filter.incident = { $in: mine.map((i) => i._id) };
  }
  const items = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 8, 30))
    .populate('user', 'firstName lastName role')
    .populate('incident', 'incidentNumber title');
  ok(res, { items });
});
