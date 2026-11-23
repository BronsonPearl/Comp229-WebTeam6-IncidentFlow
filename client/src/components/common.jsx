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

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { fullName, initials } from '../utils/format.js';
import { RoleBadge } from './Badges.jsx';

// ---------- PAGE HEADER ----------

// title, subtitle, buttons on the right and an optional back link
export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-header">
      <div>
        {back && (
          <Link to={back.to} className="back-link">
            <Icon name="arrowLeft" size={16} /> {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

// ---------- STAT CARD ----------

// number card for the dashboards, if "to" is passed the whole card is a link
export function StatCard({ label, value, icon, tone = 'blue', hint, to }) {
  const inner = (
    <>
      <span className="stat-label">
        <span className="stat-icon"><Icon name={icon} /></span>
        {label}
      </span>
      <span className="stat-value">{value ?? '-'}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={`card stat tone-${tone}`}>{inner}</Link>
  ) : (
    <div className={`card stat tone-${tone}`}>{inner}</div>
  );
}

// ---------- LOADING / EMPTY / ERROR ----------

// grey shimmer rows while data loads, role="status" tells screen readers it is loading
export function LoadingState({ rows = 5, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" style={{ width: `${90 - (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}

// full page spinner (used while lazy pages download)
export function PageLoader() {
  return (
    <div className="full-center" role="status">
      <span className="spinner" style={{ width: 28, height: 28, color: 'var(--sky-600)' }} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// friendly message when there is no data, with an optional button for the next step
export function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="state">
      <div className="state-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// shows a different message for 403 (no access), 404 (not found) and everything else
// only real errors get a Try again button
export function ErrorState({ error, onRetry }) {
  const status = error?.status;
  const map = {
    403: ['lock', 'Access restricted', error?.message || 'You do not have permission to view this.'],
    404: ['search', 'Not found', error?.message || 'This record does not exist or was removed.'],
  };
  const [icon, title, message] = map[status] || ['alert', 'Something went wrong', error?.message || 'We could not load this right now.'];
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      <p>{message}</p>
      <div className="flex gap-2 mt-2">
        {onRetry && status !== 403 && status !== 404 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            <Icon name="refresh" size={14} /> Try again
          </button>
        )}
        {(status === 403 || status === 404) && <Link className="btn btn-secondary btn-sm" to="/dashboard">Back to dashboard</Link>}
      </div>
    </div>
  );
}

// ---------- CONFIRM DIALOG ----------

// popup to confirm deletes and other big actions
// children lets a page add extra inputs (like the escalation reason)
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', tone = 'danger', busy, onConfirm, onCancel, children }) {
  const ref = useRef(null);

  // focus the dialog when it opens and close it with Escape
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.querySelector('button')?.focus();
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  // nothing to show when closed
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}>
        <h2 id="dialog-title">{title}</h2>
        {message && <p>{message}</p>}
        {children}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <span className="spinner" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
} // end ConfirmDialog

// ---------- FORM AND PEOPLE HELPERS ----------

// avatar with initials + name, shows "Unassigned" if there is nobody
export function Person({ person, showRole = false, fallback = 'Unassigned' }) {
  if (!person) return <span className="text-muted">{fallback}</span>;
  return (
    <span className="person">
      <span className="avatar" aria-hidden="true">{initials(person)}</span>
      <span>
        {fullName(person)}
        {showRole && person.role && <small><RoleBadge role={person.role} /></small>}
      </span>
    </span>
  );
}

// label + input + hint or error text, so every form looks the same
// the input goes in as children
export function Field({ id, label, required, error, hint, children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <span className="hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  );
}

// submit button that is disabled and shows a spinner while saving (stops double clicks)
export function SubmitButton({ busy, children, className = 'btn btn-primary', ...rest }) {
  return (
    <button type="submit" className={className} disabled={busy} aria-busy={busy} {...rest}>
      {busy && <span className="spinner" />}
      {children}
    </button>
  );
}
