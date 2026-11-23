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

import Icon from './Icon.jsx';
import { roleLabel } from '../utils/format.js';

// turns "In Progress" into the CSS class "status-in-progress"
export const statusClass = (status) => `status-${String(status).toLowerCase().replace(/\s+/g, '-')}`;
export const priorityClass = (priority) => `priority-${String(priority).toLowerCase()}`;

// status pill with a small dot, data-testid is used by the unit tests
export function StatusBadge({ status }) {
  return (
    <span className={`badge ${statusClass(status)}`} data-testid="status-badge">
      <span className="dot" aria-hidden="true" />
      {status}
    </span>
  );
}

// Critical also gets a warning icon
export function PriorityBadge({ priority }) {
  return (
    <span className={`badge ${priorityClass(priority)}`} data-testid="priority-badge">
      {priority === 'Critical' && <Icon name="alert" size={12} />}
      {priority}
    </span>
  );
}

// red flag badge for escalated incidents
export function EscalatedBadge() {
  return (
    <span className="badge badge-escalated">
      <Icon name="flag" size={12} /> Escalated
    </span>
  );
}

// User / Technician / Admin
export function RoleBadge({ role }) {
  return <span className={`badge badge-role role-${role}`}>{roleLabel(role)}</span>;
}

// Active or Deactivated
export function ActiveBadge({ active }) {
  return <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>{active ? 'Active' : 'Deactivated'}</span>;
}
