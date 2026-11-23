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

// ---------- NAMES ----------

// "Taylor Chen", or "Unassigned" if there is no person
export const fullName = (p) => (p ? `${p.firstName} ${p.lastName}` : 'Unassigned');

// "TC" for the round avatar
export const initials = (p) => (p ? `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase() : '?');

// ---------- DATES ----------

// ex. "Nov 22, 2026" in the user's local format
export function formatDate(d, opts = {}) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', ...opts });
}

// ex. "Nov 22, 4:13 PM"
export function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ex. "just now", "5m ago", "3h ago", "2d ago", then a normal date after 30 days
export function timeAgo(d) {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

// ---------- OTHER ----------

// ex. 2048 -> "2 KB"
export const formatBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

// 'technician' -> 'Technician'
export const roleLabel = (r) => ({ user: 'User', technician: 'Technician', admin: 'Admin' }[r] || r);

// ---------- ACTIVITY SENTENCES ----------

// one function per activity type that builds the sentence shown after the person's name
// ex. "Jordan Lee" + "changed status from Assigned to In Progress"
const ACTION_TEXT = {
  created: () => 'reported this incident',
  assigned: (a) => `assigned it to ${a.newValue}`,
  unassigned: () => 'removed the technician',
  status_changed: (a) => `changed status from ${a.oldValue} to ${a.newValue}`,
  reopened: (a) => `reopened it (${a.oldValue} → ${a.newValue})`,
  priority_changed: (a) => `changed priority from ${a.oldValue} to ${a.newValue}`,
  escalated: (a) => `escalated it${a.newValue ? `: ${a.newValue}` : ''}`,
  de_escalated: () => 'removed the escalation',
  commented: () => 'added a comment',
  attachment_added: (a) => `attached ${a.newValue}`,
  attachment_removed: (a) => `removed ${a.oldValue}`,
  updated: (a) => (a.oldValue != null && a.newValue != null ? `changed ${a.field} from "${a.oldValue}" to "${a.newValue}"` : `updated the ${a.field}`),
};

// unknown types fall back to the action name with spaces instead of underscores
export const describeActivity = (a) => (ACTION_TEXT[a.action] || (() => a.action.replace(/_/g, ' ')))(a);
