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

// priority numbers so Critical sorts first
import { PRIORITY_RANK } from './constants.js';

// ---------- SEARCH, FILTER, SORT ----------

// options for the Sort dropdown (value is what gets sent, label is what you see)
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'priority', label: 'Highest priority' },
];

// keeps only the incidents that match every filter that was picked
// an empty filter ("") means "any" so it gets skipped
export function filterIncidents(incidents = [], { q = '', status = '', priority = '', category = '', escalated = '', unassigned = '' } = {}) {
  // search is not case sensitive
  const term = q.trim().toLowerCase();
  return incidents.filter((i) => {
    if (status && i.status !== status) return false;
    if (priority && i.priority !== priority) return false;
    if (category && i.category !== category) return false;

    // checkbox filters come in as the string 'true'
    if (escalated === 'true' && !i.isEscalated) return false;
    if (unassigned === 'true' && i.assignedTo) return false;

    // no search text, so it passed all the filters
    if (!term) return true;

    // match the search text against number, title, location or category
    return [i.incidentNumber, i.title, i.location, i.category]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(term));
  });
} // end filterIncidents

// returns a sorted copy, [...incidents] so we don't change the original array
export function sortIncidents(incidents = [], sort = 'newest') {
  const list = [...incidents];

  // turns a date into milliseconds so dates can be subtracted
  const t = (d) => new Date(d).getTime() || 0;
  switch (sort) {
    case 'oldest':
      return list.sort((a, b) => t(a.createdAt) - t(b.createdAt));
    case 'updated':
      return list.sort((a, b) => t(b.updatedAt || b.createdAt) - t(a.updatedAt || a.createdAt));

    // highest priority first, if two are the same then newest first
    case 'priority':
      return list.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0) || t(b.createdAt) - t(a.createdAt));
    case 'newest':
    default:
      return list.sort((a, b) => t(b.createdAt) - t(a.createdAt));
  }
} // end sortIncidents

// filter then sort in one call
export const queryIncidents = (incidents, params = {}) => sortIncidents(filterIncidents(incidents, params), params.sort);

// ---------- DASHBOARD COUNTS ----------

// counts incidents by status for the stat cards on the dashboards
export function summarize(incidents = []) {
  const s = { total: incidents.length, Open: 0, Assigned: 0, 'In Progress': 0, 'On Hold': 0, Resolved: 0, Closed: 0, critical: 0, escalated: 0, unassigned: 0 };

  // critical / escalated / unassigned only count if the incident is still open
  incidents.forEach((i) => {
    s[i.status] = (s[i.status] || 0) + 1;
    if (i.priority === 'Critical' && !['Resolved', 'Closed'].includes(i.status)) s.critical += 1;
    if (i.isEscalated && !['Resolved', 'Closed'].includes(i.status)) s.escalated += 1;
    if (!i.assignedTo && !['Resolved', 'Closed'].includes(i.status)) s.unassigned += 1;
  });
  return s;
}

// ---------- ANALYTICS ----------

// builds everything the Analytics page needs from the incidents and users
// days = how far back the trend chart goes
export function buildAnalytics(incidents = [], users = [], { days = 30, now = new Date() } = {}) {
  // counts how many incidents have each value, ex. byStatus = [{ name: "Open", value: 3 }, ...]
  const count = (key, values) => values.map((v) => ({ name: v, value: incidents.filter((i) => i[key] === v).length }));

  // turns a date into "YYYY-MM-DD" so we can group by day
  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

  // one entry per day with how many were created and resolved that day
  const trend = [];
  for (let n = days - 1; n >= 0; n -= 1) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - n);
    const key = dayKey(d);
    trend.push({
      date: key,
      created: incidents.filter((i) => dayKey(i.createdAt) === key).length,
      resolved: incidents.filter((i) => i.resolvedAt && dayKey(i.resolvedAt) === key).length,
    });
  }

  // resolution time in hours for every resolved incident
  // 36e5 = 3,600,000 ms in an hour
  const resolved = incidents.filter((i) => i.resolvedAt);
  const hours = resolved.map((i) => (new Date(i.resolvedAt) - new Date(i.createdAt)) / 36e5).filter((h) => h >= 0);

  // average rounded to 1 decimal, null if there is nothing to average
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  // workload table: how many active and resolved incidents each technician has
  const technicians = users.filter((u) => u.role === 'technician');
  const workload = technicians.map((t) => {
    const mine = incidents.filter((i) => i.assignedTo && String(i.assignedTo._id || i.assignedTo) === String(t._id));
    const done = mine.filter((i) => i.resolvedAt);
    return {
      technicianId: String(t._id),
      name: `${t.firstName} ${t.lastName}`,
      active: mine.filter((i) => !['Resolved', 'Closed'].includes(i.status)).length,
      resolved: done.length,
      avgResolutionHours: avg(done.map((i) => (new Date(i.resolvedAt) - new Date(i.createdAt)) / 36e5)),
    };
  });

  // reuse the dashboard counts for the totals
  const s = summarize(incidents);
  return {
    totals: {
      users: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      technicians: technicians.length,
      incidents: incidents.length,
      open: s.Open,
      inProgress: s['In Progress'],
      resolved: s.Resolved + s.Closed,
      critical: s.critical,
      escalated: s.escalated,
      unassigned: s.unassigned,
    },
    byStatus: count('status', ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed']),
    byPriority: count('priority', ['Low', 'Medium', 'High', 'Critical']),
    byCategory: count('category', ['IT', 'Facilities', 'Equipment', 'Safety', 'Security', 'Other']),
    trend,
    resolution: {
      resolvedCount: resolved.length,
      avgHours: avg(hours),

      // median = the middle value after sorting, less affected by one really slow incident
      medianHours: hours.length ? Math.round([...hours].sort((a, b) => a - b)[Math.floor(hours.length / 2)] * 10) / 10 : null,
    },
    workload,
  };
} // end buildAnalytics
