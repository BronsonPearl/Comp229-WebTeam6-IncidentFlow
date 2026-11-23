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

import User from '../models/User.js';
import { Activity, Counter, Notification } from '../models/supporting.js';
import { idOf } from '../../shared/incidentPolicy.js';

// ---------- INCIDENT NUMBERS ----------

// adds 1 to a counter document and formats it like INC-000123
// $inc is atomic so two incidents at the same time never get the same number
export async function nextIncidentNumber() {
  const counter = await Counter.findByIdAndUpdate('incident', { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `INC-${String(counter.seq).padStart(6, '0')}`;
}

// ---------- ACTIVITY LOG ----------

// saves one line of the audit timeline, ex. "changed status from Open to Assigned"
// values are stored as strings so the timeline can show anything
export function logActivity(incident, user, action, { field = null, oldValue = null, newValue = null } = {}) {
  return Activity.create({
    incident: incident._id,
    user: user?._id,
    action,
    field,
    oldValue: oldValue == null ? null : String(oldValue),
    newValue: newValue == null ? null : String(newValue),
  });
}

// ---------- NOTIFICATIONS ----------

// sends the same notification to a list of users
// removes duplicates and empty values, and never notifies the person who did the action
export async function notify(recipients, actor, incident, type, message) {
  const unique = [...new Set(recipients.filter(Boolean).map(idOf))].filter((id) => id !== idOf(actor));
  if (!unique.length) return [];
  return Notification.insertMany(unique.map((user) => ({ user, incident: incident?._id || null, type, message })));
}

// ids of all active admins (they get notified about escalations)
export async function adminIds() {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  return admins.map((a) => a._id);
}
