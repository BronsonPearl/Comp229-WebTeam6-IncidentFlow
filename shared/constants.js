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

// ---------- ROLES AND INCIDENT ENUMS ----------

// the 3 roles a user can have
// everyone who signs up starts as "user", only an admin can change it
export const ROLES = ['user', 'technician', 'admin'];

// what kind of incident it is (shows in the Category dropdown)
export const CATEGORIES = ['IT', 'Facilities', 'Equipment', 'Safety', 'Security', 'Other'];

// how urgent it is, lowest to highest
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// every step an incident can be in, in lifecycle order
export const STATUSES = ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed'];

// gives each priority a number so we can sort Critical first
// (sorting the words alphabetically would put Critical before High which is wrong)
export const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

// ---------- LIFECYCLE RULES ----------

// which status a technician is allowed to move to from each status
// ex. from Assigned they can only go to In Progress
// admins skip this list and can set any status (like reopening)
export const TECHNICIAN_TRANSITIONS = {
  Assigned: ['In Progress'],
  'In Progress': ['On Hold', 'Resolved'],
  'On Hold': ['In Progress'],
  Resolved: [],
  Closed: [],
  Open: [],
};

// ---------- FILE UPLOADS ----------

// the only file types we accept, and the extensions that go with each one
// checking both stops someone renaming a .exe to .png
export const ATTACHMENT_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
};

// 5 MB in bytes (5 x 1024 x 1024)
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

// ---------- OTHER LISTS ----------

// the events that send a notification to someone
export const NOTIFICATION_TYPES = ['assignment', 'status', 'comment', 'escalation', 'resolution'];

// min and max character counts used by the validation
// [min, max] arrays, except passwordMin which is just a number
export const LIMITS = {
  name: [2, 50],
  title: [5, 120],
  description: [10, 3000],
  location: [2, 160],
  comment: [1, 1000],
  resolution: [5, 2000],
  escalationReason: [3, 300],
  passwordMin: 8,
};
