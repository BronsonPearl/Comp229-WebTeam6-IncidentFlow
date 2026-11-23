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

// the list of allowed technician status moves
import { TECHNICIAN_TRANSITIONS } from './constants.js';

// ---------- HELPERS ----------

// IDs can show up as a string, a Mongo ObjectId, or a whole populated user object
// this turns any of them into a plain string so we can compare them with ===
export function idOf(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
}

// did this user report the incident?
export const isOwner = (user, incident) => !!user && idOf(incident.createdBy) === idOf(user);

// is this user the technician assigned to it?
export const isAssignee = (user, incident) => !!user && !!incident.assignedTo && idOf(incident.assignedTo) === idOf(user);

// role checks
export const isAdmin = (user) => user?.role === 'admin';
export const isTechnician = (user) => user?.role === 'technician';

// the reporter can only change their incident before work starts
export const OWNER_EDITABLE_STATUSES = ['Open'];

// ---------- VIEW / DELETE ----------

// staff (admin + technician) can see every incident
// a normal user can only open the ones they reported
export function canViewIncident(user, incident) {
  if (!user) return false;
  if (isAdmin(user) || isTechnician(user)) return true; // operational visibility
  return isOwner(user, incident);
}

// admin can delete anything, a reporter only while it is still Open
export function canDeleteIncident(user, incident) {
  if (isAdmin(user)) return true;
  return isOwner(user, incident) && OWNER_EDITABLE_STATUSES.includes(incident.status);
}

// ---------- EDIT PERMISSIONS ----------

// returns the list of fields this user is allowed to change on this incident
// an empty list means no edit access at all
export function editableFields(user, incident) {
  if (!user) return [];

  // admin can change everything including who it is assigned to
  if (isAdmin(user)) {
    return ['title', 'description', 'category', 'priority', 'location', 'status', 'resolution', 'assignedTo', 'isEscalated', 'escalationReason'];
  }

  // Set so the same field is not added twice
  const fields = new Set();

  // reporter can edit the basic info while it is Open
  if (isOwner(user, incident) && OWNER_EDITABLE_STATUSES.includes(incident.status)) {
    ['title', 'description', 'category', 'priority', 'location'].forEach((f) => fields.add(f));
  }

  // assigned technician can update the work side (status, priority, resolution)
  if (isTechnician(user) && isAssignee(user, incident) && !['Closed'].includes(incident.status)) {
    ['status', 'priority', 'resolution'].forEach((f) => fields.add(f));
  }

  // reporter can close their own incident once it is Resolved (confirming the fix)
  if (isOwner(user, incident) && incident.status === 'Resolved') fields.add('status');
  return [...fields];
} // end editableFields

// true if they can edit at least one field
export const canEditIncident = (user, incident) => editableFields(user, incident).length > 0;

// ---------- STATUS CHANGES ----------

// which statuses this user can move the incident to from where it is now
export function allowedStatusTargets(user, incident) {
  // admin can pick any status except the one it already has
  if (isAdmin(user)) return ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed'].filter((s) => s !== incident.status);
  const targets = new Set();

  // technician follows the lifecycle map from constants.js
  if (isTechnician(user) && isAssignee(user, incident)) {
    (TECHNICIAN_TRANSITIONS[incident.status] || []).forEach((s) => targets.add(s));
  }

  // reporter can only go Resolved -> Closed
  if (isOwner(user, incident) && incident.status === 'Resolved') targets.add('Closed');
  return [...targets];
} // end allowedStatusTargets

// only admins assign technicians and escalate
export const canAssign = (user) => isAdmin(user);
export const canEscalate = (user) => isAdmin(user);

// anyone who can open the incident can comment on it
export const canComment = (user, incident) => canViewIncident(user, incident);

// ---------- PUBLIC DATA ----------

// the only fields that are safe to show to people who are not signed in
// no description, reporter, location or comments
export const PUBLIC_FIELDS = ['_id', 'incidentNumber', 'title', 'category', 'priority', 'status', 'createdAt'];

// copies just the public fields into a new object
export function toPublicIncident(incident) {
  const out = {};
  PUBLIC_FIELDS.forEach((f) => {
    if (incident[f] !== undefined) out[f] = incident[f];
  });
  if (out._id) out._id = String(out._id);
  return out;
}
