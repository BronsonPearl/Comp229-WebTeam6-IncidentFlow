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

import { useState } from 'react';
import { Link } from 'react-router-dom';

// shared lists, sort options and validation
import { CATEGORIES, PRIORITIES, STATUSES, LIMITS, ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from '@shared/constants.js';
import { SORT_OPTIONS } from '@shared/incidentQuery.js';
import { validateIncident } from '@shared/validation.js';
import Icon from './Icon.jsx';
import { EscalatedBadge, PriorityBadge, StatusBadge } from './Badges.jsx';
import { Field, Person, SubmitButton } from './common.jsx';
import { formatBytes, formatDate, fullName, timeAgo } from '../utils/format.js';

// ---------- SEARCH / FILTER BAR ----------

// value = current filters, onChange gets the new filters object
// extra = more controls a page can add (like the Unassigned checkbox)
export function SearchFilterBar({ value, onChange, total, extra = [], hide = [] }) {
  // makes an onChange handler for one filter key
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="filter-bar" role="search">
      <div className="search-input">
        <Icon name="search" />
        <label htmlFor="incident-search" className="sr-only">Search incidents</label>
        <input id="incident-search" type="search" placeholder="Search by number, title or location" value={value.q || ''} onChange={set('q')} />
      </div>
      {!hide.includes('status') && (
        <select aria-label="Filter by status" value={value.status || ''} onChange={set('status')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      )}
      <select aria-label="Filter by priority" value={value.priority || ''} onChange={set('priority')}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
      </select>
      <select aria-label="Filter by category" value={value.category || ''} onChange={set('category')}>
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      {extra}
      <select aria-label="Sort incidents" value={value.sort || 'newest'} onChange={set('sort')}>
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {typeof total === 'number' && <span className="result-count" aria-live="polite">{total} result{total === 1 ? '' : 's'}</span>}
    </div>
  );
} // end SearchFilterBar

// ---------- INCIDENT TABLE ----------

// columns picks which columns to show, renderActions adds buttons on each row
// linkable = false for public pages since they cannot open details
export function IncidentTable({ incidents, columns = ['title', 'priority', 'status', 'assignee', 'created'], linkable = true, renderActions }) {
  const has = (c) => columns.includes(c);

  // title with the number and location under it
  const TitleCell = ({ i }) => (
    <>
      <div className="cell-title">
        {linkable ? <Link to={`/incidents/${i._id}`}>{i.title}</Link> : i.title}
      </div>
      <div className="cell-sub">
        <span className="mono">{i.incidentNumber}</span>
        {i.location && <> · {i.location}</>}
        {!has('category') && i.category && <> · {i.category}</>}
      </div>
    </>
  );
  return (
    <>
      {/* normal table (hidden on phones by the CSS) */}
      <div className="table-wrap incident-table">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Incident</th>
              {has('category') && <th scope="col">Category</th>}
              {has('priority') && <th scope="col">Priority</th>}
              {has('status') && <th scope="col">Status</th>}
              {has('reporter') && <th scope="col">Reporter</th>}
              {has('assignee') && <th scope="col">Technician</th>}
              {has('created') && <th scope="col">Reported</th>}
              {has('updated') && <th scope="col">Updated</th>}
              {renderActions && <th scope="col"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {/* one row per incident, open critical ones get the red bar on the left */}
            {incidents.map((i) => (
              <tr key={i._id} className={i.priority === 'Critical' && !['Resolved', 'Closed'].includes(i.status) ? 'row-critical' : ''}>
                <td><TitleCell i={i} /></td>
                {has('category') && <td>{i.category}</td>}
                {has('priority') && (
                  <td>
                    <div className="flex gap-2 wrap"><PriorityBadge priority={i.priority} />{i.isEscalated && <EscalatedBadge />}</div>
                  </td>
                )}
                {has('status') && <td><StatusBadge status={i.status} /></td>}
                {has('reporter') && <td className="nowrap">{fullName(i.createdBy)}</td>}
                {has('assignee') && <td className="nowrap">{i.assignedTo ? fullName(i.assignedTo) : <span className="text-muted">Unassigned</span>}</td>}
                {has('created') && <td className="nowrap" title={new Date(i.createdAt).toLocaleString()}>{formatDate(i.createdAt)}</td>}
                {has('updated') && <td className="nowrap">{timeAgo(i.updatedAt)}</td>}
                {renderActions && <td><div className="row-actions">{renderActions(i)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* card version for phones */}
      <div className="incident-cards">
        {incidents.map((i) => {
          const body = (
            <>
              <div className="top">
                <span className="mono">{i.incidentNumber}</span>
                <span className="text-sm text-muted">{formatDate(i.createdAt)}</span>
              </div>
              <div className="cell-title">{i.title}</div>
              {i.location && <div className="cell-sub">{i.location}</div>}
              <div className="badges">
                <StatusBadge status={i.status} />
                <PriorityBadge priority={i.priority} />
                {i.isEscalated && <EscalatedBadge />}
                {i.category && <span className="badge badge-role">{i.category}</span>}
              </div>
              {renderActions && <div className="row-actions mt-2" style={{ justifyContent: 'flex-start' }}>{renderActions(i)}</div>}
            </>
          );
          return linkable && !renderActions ? (
            <Link key={i._id} className="incident-card" to={`/incidents/${i._id}`}>{body}</Link>
          ) : (
            <div key={i._id} className="incident-card">{linkable ? <Link to={`/incidents/${i._id}`} style={{ color: 'inherit' }}>{body}</Link> : body}</div>
          );
        })}
      </div>
    </>
  );
} // end IncidentTable

// ---------- INCIDENT FORM ----------

// starting values for a new incident (Medium is the default priority)
const EMPTY = { title: '', description: '', category: '', priority: 'Medium', location: '' };

// checks file type and size before uploading, returns an error message or null
export function validateFiles(files) {
  for (const f of files) {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ATTACHMENT_TYPES[f.type]?.includes(ext)) return `${f.name}: only JPG, PNG and PDF files are allowed.`;
    if (f.size > MAX_ATTACHMENT_BYTES) return `${f.name}: file is larger than 5 MB.`;
  }
  return null;
}

// shared create / edit form
// fields = which inputs can be changed (others are greyed out), children = extra section for the edit page
export function IncidentForm({ initial = EMPTY, fields = ['title', 'description', 'category', 'priority', 'location'], allowFiles = false, submitLabel = 'Submit', busy, serverErrors = {}, onSubmit, onCancel, children }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});

  // only show errors live after the first submit attempt
  const [touched, setTouched] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [drag, setDrag] = useState(false);

  // our own errors plus any that came back from the server
  const allErrors = { ...errors, ...serverErrors };
  const editable = (f) => fields.includes(f);

  // updates one field and re-checks it if the form was already submitted once
  const update = (k) => (e) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (touched) setErrors(validateIncident(pick(next, fields), { partial: true }));
  };

  // adds dropped or picked files, max 5
  const addFiles = (list) => {
    const arr = Array.from(list || []);
    const err = validateFiles(arr);
    setFileError(err);
    if (!err) setFiles((prev) => [...prev, ...arr].slice(0, 5));
  };

  // validate first, focus the first bad field, otherwise pass the data up to the page
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    const data = pick(values, fields);
    const v = validateIncident(data, { partial: true });
    setErrors(v);
    if (Object.keys(v).length) {
      document.getElementById(`incident-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    onSubmit(data, files);
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-label="Incident form">
      {Object.keys(allErrors).length > 0 && touched && (
        <div className="alert alert-error" role="alert">Please fix {Object.keys(allErrors).length} field{Object.keys(allErrors).length > 1 ? 's' : ''} below.</div>
      )}
      <Field id="incident-title" label="Title" required error={allErrors.title} hint="A short summary, 5 to 120 characters.">
        <input id="incident-title" name="title" value={values.title} onChange={update('title')} maxLength={LIMITS.title[1]} disabled={!editable('title')} aria-invalid={!!allErrors.title} placeholder="e.g. Wi-Fi unavailable in Lab 4" />
      </Field>
      <Field id="incident-description" label="Description" required error={allErrors.description}>
        <textarea id="incident-description" name="description" rows={6} value={values.description} onChange={update('description')} maxLength={LIMITS.description[1]} disabled={!editable('description')} aria-invalid={!!allErrors.description} placeholder="What happened, when it started, who is affected, and anything you already tried." />
        <span className="counter">{values.description.length} / {LIMITS.description[1]}</span>
      </Field>
      <div className="form-row-3">
        <Field id="incident-category" label="Category" required error={allErrors.category}>
          <select id="incident-category" name="category" value={values.category} onChange={update('category')} disabled={!editable('category')} aria-invalid={!!allErrors.category}>
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field id="incident-priority" label="Priority" required error={allErrors.priority} hint={values.priority === 'Critical' ? 'Critical incidents are escalated immediately.' : undefined}>
          <select id="incident-priority" name="priority" value={values.priority} onChange={update('priority')} disabled={!editable('priority')}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field id="incident-location" label="Location" required error={allErrors.location}>
          <input id="incident-location" name="location" value={values.location} onChange={update('location')} maxLength={LIMITS.location[1]} disabled={!editable('location')} aria-invalid={!!allErrors.location} placeholder="Building, floor, room" />
        </Field>
      </div>
      {allowFiles && (
        <Field id="incident-files" label="Attachments (optional)" error={fileError} hint="JPG, PNG or PDF, up to 5 MB each.">
          {/* drag and drop box, the real file input inside it is hidden */}
          <label
            className={`dropzone ${drag ? 'drag' : ''}`}
            htmlFor="incident-files"
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          >
            <input id="incident-files" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <Icon name="upload" size={20} /> <br />Drop files here or <strong style={{ color: 'var(--sky-600)' }}>browse</strong>
          </label>
          {files.length > 0 && (
            <div>
              {files.map((f, idx) => (
                <span key={idx} className="file-pill">
                  {f.name} <span className="text-muted">({formatBytes(f.size)})</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== idx))}>×</button>
                </span>
              ))}
            </div>
          )}
        </Field>
      )}
      {/* extra section from the page (the Workflow box on the edit page) */}
      {children}
      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>}
        <SubmitButton busy={busy}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
} // end IncidentForm

// copy just these keys out of the form values
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

export { Person };
