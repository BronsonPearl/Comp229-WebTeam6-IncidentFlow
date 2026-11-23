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
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// same permission rules as the server, used here only to show or hide buttons
import { canDeleteIncident, editableFields, allowedStatusTargets } from '@shared/incidentPolicy.js';
import { incidentService, userService } from '../services/index.js';
import { useAsync, useDebounced } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/common.jsx';
import { IncidentTable, SearchFilterBar } from '../components/incidents.jsx';

// filters with nothing picked
const BLANK = { q: '', status: '', priority: '', category: '', sort: 'newest' };

// ---------- SHARED HELPERS ----------

// loads incidents for a scope (mine / assigned / all) with the current filters
function useIncidentList(scope, filters) {
  const q = useDebounced(filters.q);
  return useAsync(
    () => incidentService.list({ ...filters, q, scope, limit: 100 }).then((r) => r.data),
    [scope, q, filters.status, filters.priority, filters.category, filters.sort, filters.unassigned, filters.escalated]
  );
}

// picks what to show: loading, error, "no results" (with a clear button), empty, or the list
// children is a function that gets the items and draws the table
function ListBody({ state, filters, setFilters, empty, children }) {
  const { data, loading, error, reload } = state;
  const filtered = Object.entries(filters).some(([k, v]) => k !== 'sort' && v);
  if (loading) return <LoadingState rows={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data.items.length === 0) {
    return filtered ? (
      <EmptyState icon="search" title="No incidents match your filters" message="Try a different search term or clear the filters." action={<button className="btn btn-secondary btn-sm" onClick={() => setFilters(BLANK)}>Clear filters</button>} />
    ) : empty;
  }
  return children(data.items);
}

// ---------- MY INCIDENTS ----------

export function MyIncidents() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(BLANK);
  const state = useIncidentList('mine', filters);

  // incident waiting for delete confirmation
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  // delete and take it out of the list without reloading
  const confirmDelete = async () => {
    setBusy(true);
    try {
      const res = await incidentService.remove(deleting._id);
      notify(res.message);
      state.setData((d) => ({ ...d, items: d.items.filter((i) => i._id !== deleting._id), total: d.total - 1 }));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader title="My Incidents" subtitle="Incidents you have reported. You can edit or delete an incident until a technician starts on it." actions={<Link to="/incidents/new" className="btn btn-primary"><Icon name="plus" size={16} /> Report Incident</Link>} />
      <div className="card">
        <SearchFilterBar value={filters} onChange={setFilters} total={state.data?.total} />
        <ListBody
          state={state}
          filters={filters}
          setFilters={setFilters}
          empty={<EmptyState title="No incidents yet" message="Report an incident and it will appear here." action={<Link to="/incidents/new" className="btn btn-primary btn-sm">Report Incident</Link>} />}
        >
          {(items) => (
            <IncidentTable
              incidents={items}
              columns={['category', 'priority', 'status', 'assignee', 'created']}
              renderActions={(i) => (
                <>
                  {/* View for everything, Edit and Delete only while I am still allowed (status Open) */}
                  <Link to={`/incidents/${i._id}`} className="btn btn-ghost btn-sm">View</Link>
                  {editableFields(user, i).includes('title') && <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/incidents/${i._id}/edit`)}>Edit</button>}
                  {canDeleteIncident(user, i) && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red-600)' }} onClick={() => setDeleting(i)}>Delete</button>}
                </>
              )}
            />
          )}
        </ListBody>
      </div>
      <ConfirmDialog open={!!deleting} busy={busy} title={`Delete ${deleting?.incidentNumber}?`} message={`"${deleting?.title}" and its comments and history will be permanently removed.`} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
    </>
  );
} // end MyIncidents

// ---------- ASSIGNED INCIDENTS (TECHNICIAN) ----------

export function AssignedIncidents() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [filters, setFilters] = useState({ ...BLANK, sort: 'priority' });
  const state = useIncidentList('assigned', filters);

  // id of the incident being updated (disables its buttons)
  const [working, setWorking] = useState(null);

  // quick status change from the list, ex. Start work or Hold
  const move = async (incident, status) => {
    setWorking(incident._id);
    try {
      const res = await incidentService.update(incident._id, { status });
      notify(`${incident.incidentNumber} moved to ${status}.`);
      state.setData((d) => ({ ...d, items: d.items.map((i) => (i._id === incident._id ? res.data.incident : i)) }));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setWorking(null);
    }
  };

  return (
    <>
      <PageHeader title="Assigned Incidents" subtitle="Your queue. Start work, put incidents on hold, and open an incident to record its resolution." />
      <div className="card">
        <SearchFilterBar value={filters} onChange={setFilters} total={state.data?.total} />
        <ListBody state={state} filters={filters} setFilters={setFilters} empty={<EmptyState icon="checkCircle" title="Nothing assigned to you" message="When an admin assigns you an incident it will appear here." />}>
          {(items) => (
            <IncidentTable
              incidents={items}
              columns={['priority', 'status', 'reporter', 'updated']}
              renderActions={(i) => {
                // quick buttons for every allowed move except Resolved
                // Resolve opens the incident page because it needs a resolution text
                const targets = allowedStatusTargets(user, i).filter((s) => s !== 'Resolved');
                return (
                  <>
                    {targets.map((s) => (
                      <button key={s} type="button" className="btn btn-secondary btn-sm" disabled={working === i._id} onClick={() => move(i, s)}>
                        {s === 'In Progress' ? (i.status === 'On Hold' ? 'Resume' : 'Start work') : s === 'On Hold' ? 'Hold' : s}
                      </button>
                    ))}
                    {allowedStatusTargets(user, i).includes('Resolved') && <Link to={`/incidents/${i._id}#resolve`} className="btn btn-primary btn-sm">Resolve</Link>}
                    <Link to={`/incidents/${i._id}`} className="btn btn-ghost btn-sm">Open</Link>
                  </>
                );
              }}
            />
          )}
        </ListBody>
      </div>
    </>
  );
} // end AssignedIncidents

// ---------- MANAGE INCIDENTS (ADMIN) ----------

export function ManageIncidents() {
  const { notify } = useToast();

  // the dashboard can link here with ?unassigned=true already ticked
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ ...BLANK, unassigned: params.get('unassigned') || '', escalated: params.get('escalated') || '' });
  const state = useIncidentList('all', filters);

  // active technicians for the assign dropdowns
  const techs = useAsync(() => userService.list({ role: 'technician', status: 'active' }).then((r) => r.data.items), []);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [escalating, setEscalating] = useState(null);
  const [reason, setReason] = useState('');

  // swap the updated incident into the list
  const replace = (incident) => state.setData((d) => ({ ...d, items: d.items.map((i) => (i._id === incident._id ? incident : i)) }));

  // assign or unassign a technician straight from the table
  const assign = async (incident, assignedTo) => {
    try {
      const res = await incidentService.update(incident._id, { assignedTo: assignedTo || null });
      replace(res.data.incident);
      notify(assignedTo ? `${incident.incidentNumber} assigned.` : `${incident.incidentNumber} unassigned.`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // escalate with a reason, or remove the escalation
  const toggleEscalation = async () => {
    setBusy(true);
    try {
      const turnOn = !escalating.isEscalated;
      const res = await incidentService.update(escalating._id, turnOn ? { isEscalated: true, escalationReason: reason } : { isEscalated: false });
      replace(res.data.incident);
      notify(turnOn ? 'Incident escalated.' : 'Escalation removed.');
      setEscalating(null);
      setReason('');
    } catch (err) {
      notify(err.errors?.escalationReason || err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      const res = await incidentService.remove(deleting._id);
      notify(res.message);
      state.setData((d) => ({ ...d, items: d.items.filter((i) => i._id !== deleting._id), total: d.total - 1 }));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  // extra checkboxes added to the filter bar
  const extra = [
    <label key="u" className="checkbox text-sm"><input type="checkbox" checked={filters.unassigned === 'true'} onChange={(e) => setFilters({ ...filters, unassigned: e.target.checked ? 'true' : '' })} /> Unassigned</label>,
    <label key="e" className="checkbox text-sm"><input type="checkbox" checked={filters.escalated === 'true'} onChange={(e) => setFilters({ ...filters, escalated: e.target.checked ? 'true' : '' })} /> Escalated</label>,
  ];

  return (
    <>
      <PageHeader title="Manage Incidents" subtitle="Every incident in the system. Assign technicians, escalate, edit or delete." />
      <div className="card">
        <SearchFilterBar value={filters} onChange={setFilters} total={state.data?.total} extra={extra} />
        <ListBody state={state} filters={filters} setFilters={(f) => setFilters({ ...f, unassigned: '', escalated: '' })} empty={<EmptyState title="No incidents in the system" />}>
          {(items) => (
            <IncidentTable
              incidents={items}
              columns={['priority', 'status', 'reporter', 'created']}
              renderActions={(i) => (
                <>
                  {/* assign dropdown, escalate, edit and delete on every row */}
                  <label className="sr-only" htmlFor={`assign-${i._id}`}>Technician for {i.incidentNumber}</label>
                  <select id={`assign-${i._id}`} value={i.assignedTo?._id || ''} onChange={(e) => assign(i, e.target.value)} style={{ width: 160, padding: '6px 8px', fontSize: 13 }} disabled={['Resolved', 'Closed'].includes(i.status)}>
                    <option value="">Unassigned</option>
                    {(techs.data || []).map((t) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                  <button type="button" className="btn btn-ghost btn-sm" title={i.isEscalated ? 'Remove escalation' : 'Escalate'} aria-label={i.isEscalated ? `Remove escalation from ${i.incidentNumber}` : `Escalate ${i.incidentNumber}`} onClick={() => setEscalating(i)} style={{ color: i.isEscalated ? 'var(--red-600)' : undefined }}><Icon name="flag" size={15} /></button>
                  <Link to={`/incidents/${i._id}/edit`} className="btn btn-ghost btn-sm" aria-label={`Edit ${i.incidentNumber}`}><Icon name="edit" size={15} /></Link>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red-600)' }} aria-label={`Delete ${i.incidentNumber}`} onClick={() => setDeleting(i)}><Icon name="trash" size={15} /></button>
                </>
              )}
            />
          )}
        </ListBody>
      </div>
      <ConfirmDialog open={!!deleting} busy={busy} title={`Delete ${deleting?.incidentNumber}?`} message="This permanently removes the incident with its comments, attachments and audit history." onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      <ConfirmDialog
        open={!!escalating}
        busy={busy}
        tone="primary"
        title={escalating?.isEscalated ? `Remove escalation from ${escalating?.incidentNumber}?` : `Escalate ${escalating?.incidentNumber}?`}
        message={escalating?.isEscalated ? `Current reason: ${escalating?.escalationReason}` : 'Admins, the assigned technician and the reporter will be notified.'}
        confirmLabel={escalating?.isEscalated ? 'Remove escalation' : 'Escalate'}
        onCancel={() => { setEscalating(null); setReason(''); }}
        onConfirm={toggleEscalation}
      >
        {!escalating?.isEscalated && (
          <div className="field mt-4">
            <label htmlFor="esc-reason">Reason</label>
            <input id="esc-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Affects the whole building" />
          </div>
        )}
      </ConfirmDialog>
    </>
  );
} // end ManageIncidents
