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

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LIMITS } from '@shared/constants.js';
import { attachmentService, commentService, incidentService, userService } from '../services/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import Icon from '../components/Icon.jsx';
import { EscalatedBadge, PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import { ConfirmDialog, ErrorState, LoadingState, Person } from '../components/common.jsx';
import { ActivityTimeline, AttachmentList, CommentThread } from '../components/collaboration.jsx';
import { formatDateTime } from '../utils/format.js';

// friendlier button text for each status move
const ACTION_LABEL = { 'In Progress': 'Start work', 'On Hold': 'Put on hold', Resolved: 'Resolve', Closed: 'Close incident', Open: 'Reopen', Assigned: 'Mark assigned' };

// ---------- DATA ----------

export default function IncidentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const { refresh: refreshBell } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // the incident with its permissions, and the activity timeline, loaded separately
  const main = useAsync(() => incidentService.get(id).then((r) => r.data), [id]);
  const activity = useAsync(() => incidentService.activities(id).then((r) => r.data.items), [id]);

  // comments and attachments are loaded once and updated in place
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [techs, setTechs] = useState([]);

  // state for the resolve form, delete dialog and escalation dialog
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolutionError, setResolutionError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  useEffect(() => {
    // load comments and attachments when the page opens
    commentService.list(id).then((r) => setComments(r.data.items)).catch(() => {});
    attachmentService.list(id).then((r) => setAttachments(r.data.items)).catch(() => {});
  }, [id]);
  useEffect(() => {
    // technician list for the admin assign dropdown
    if (user.role === 'admin') userService.list({ role: 'technician', status: 'active' }).then((r) => setTechs(r.data.items)).catch(() => {});
  }, [user.role]);
  useEffect(() => {
    // the Resolve button on the queue page links here with #resolve to open the form
    if (location.hash === '#resolve' && main.data?.permissions.statusTargets.includes('Resolved')) setResolving(true);
  }, [location.hash, main.data]);

  // loading / error states
  if (main.loading) return <div className="card"><LoadingState rows={10} /></div>;
  if (main.error) return <div className="card"><ErrorState error={main.error} onRetry={main.reload} /></div>;

  const { incident, permissions } = main.data;

  // ---------- ACTIONS ----------

  // after any update: show the new data, reload the timeline and the bell, show a message
  const after = (res, msg) => {
    main.setData(res.data);
    activity.reload();
    refreshBell();
    notify(msg || res.message);
  };

  // send a change to the API, returns true if it worked
  const update = async (changes, msg) => {
    setBusy(true);
    try {
      after(await incidentService.update(id, changes), msg);
      return true;
    } catch (err) {
      if (err.errors?.resolution) setResolutionError(err.errors.resolution);
      notify(err.message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Resolve opens the resolution form, everything else saves right away
  const changeStatus = (status) => {
    if (status === 'Resolved') return setResolving(true);
    update({ status }, `Status changed to ${status}.`);
  };

  // needs at least 5 characters, then saves the resolution and Resolved together
  const submitResolution = async (e) => {
    e.preventDefault();
    if (resolution.trim().length < LIMITS.resolution[0]) return setResolutionError(`Describe the resolution in at least ${LIMITS.resolution[0]} characters.`);
    setResolutionError(null);
    if (await update({ resolution, status: 'Resolved' }, `${incident.incidentNumber} resolved.`)) setResolving(false);
  };

  // delete and go back to the right list for my role
  const remove = async () => {
    setBusy(true);
    try {
      const res = await incidentService.remove(id);
      notify(res.message);
      navigate(user.role === 'admin' ? '/admin/incidents' : '/my-incidents', { replace: true });
    } catch (err) {
      notify(err.message, 'error');
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  // values used to decide what to show
  const canEdit = permissions.editableFields.length > 0;
  const isAdmin = user.role === 'admin';
  const closed = ['Resolved', 'Closed'].includes(incident.status);

  return (
    <>
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))} className="back-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}><Icon name="arrowLeft" size={16} /> Back</button>
      {/* header: number, badges, title and Edit / Delete if allowed */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="detail-title">
            <span className="mono" style={{ fontSize: 14 }}>{incident.incidentNumber}</span>
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
            {incident.isEscalated && <EscalatedBadge />}
          </div>
          <h1 style={{ fontSize: 26 }}>{incident.title}</h1>
          <p className="text-muted mt-2">Reported {formatDateTime(incident.createdAt)} · Last updated {formatDateTime(incident.updatedAt)}</p>
        </div>
        <div className="actions">
          {canEdit && <Link to={`/incidents/${id}/edit`} className="btn btn-secondary"><Icon name="edit" size={15} /> Edit</Link>}
          {permissions.canDelete && <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={15} /> Delete</button>}
        </div>
      </div>

      {/* red banner if escalated */}
      {incident.isEscalated && (
        <div className="escalation-banner" role="alert">
          <Icon name="alert" />
          <span><strong>Escalated.</strong> {incident.escalationReason}</span>
        </div>
      )}

      {/* left column: description, resolution, comments, attachments */}
      <div className="split">
        <div className="stack">
          <section className="card">
            <div className="card-header"><h2>Description</h2></div>
            <div className="card-body"><p className="description">{incident.description}</p></div>
          </section>

          {/* resolution card shows the form while resolving, otherwise the saved resolution */}
          {(incident.resolution || resolving) && (
            <section className="card" id="resolve">
              <div className="card-header"><h2>Resolution</h2>{incident.resolvedAt && <span className="text-sm text-muted">Resolved {formatDateTime(incident.resolvedAt)}</span>}</div>
              <div className="card-body">
                {resolving ? (
                  <form onSubmit={submitResolution} className="stack" style={{ gap: 10 }} noValidate>
                    <div className={`field ${resolutionError ? 'has-error' : ''}`}>
                      <label htmlFor="resolution">How was this resolved?</label>
                      <textarea id="resolution" rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} maxLength={LIMITS.resolution[1]} placeholder="What was the cause and what did you do to fix it?" autoFocus />
                      {resolutionError && <span className="error" role="alert">{resolutionError}</span>}
                    </div>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResolving(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy && <span className="spinner" />}<Icon name="checkCircle" size={14} /> Mark resolved</button>
                    </div>
                  </form>
                ) : (
                  <div className="resolution-box">{incident.resolution}</div>
                )}
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-header"><h2>Comments <span className="text-muted text-sm">({comments.length})</span></h2></div>
            <div className="card-body">
              <CommentThread incidentId={id} comments={comments} setComments={setComments} currentUser={user} canComment onChange={activity.reload} />
            </div>
          </section>

          <section className="card">
            <div className="card-header"><h2>Attachments <span className="text-muted text-sm">({attachments.length})</span></h2></div>
            <div className="card-body">
              <AttachmentList incidentId={id} attachments={attachments} setAttachments={setAttachments} currentUser={user} canUpload={!closed || isAdmin} onChange={activity.reload} />
            </div>
          </section>
        </div>

        {/* right column: details, actions and the activity timeline */}
        <div className="stack">
          <section className="card">
            <div className="card-header"><h2>Details</h2></div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>Status</dt><dd><StatusBadge status={incident.status} /></dd>
                <dt>Priority</dt><dd><PriorityBadge priority={incident.priority} /></dd>
                <dt>Category</dt><dd>{incident.category}</dd>
                <dt>Location</dt><dd>{incident.location}</dd>
                <dt>Reporter</dt><dd><Person person={incident.createdBy} /></dd>
                <dt>Technician</dt><dd><Person person={incident.assignedTo} /></dd>
                <dt>Reported</dt><dd>{formatDateTime(incident.createdAt)}</dd>
                {incident.resolvedAt && (<><dt>Resolved</dt><dd>{formatDateTime(incident.resolvedAt)}</dd></>)}
              </dl>
            </div>
          </section>

          {/* actions card, only if this user can do something */}
          {(permissions.statusTargets.length > 0 || isAdmin) && (
            <section className="card">
              <div className="card-header"><h2>Actions</h2></div>
              <div className="card-body action-panel">
                {isAdmin && (
                  <div className="field">
                    <label htmlFor="assign-tech">Assigned technician</label>
                    <select id="assign-tech" value={incident.assignedTo?._id || ''} disabled={busy || closed} onChange={(e) => update({ assignedTo: e.target.value || null }, e.target.value ? 'Technician assigned.' : 'Technician removed.')}>
                      <option value="">Unassigned</option>
                      {techs.map((t) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                  </div>
                )}
                {permissions.statusTargets.length > 0 && (
                  <div className="field">
                    <span className="label">Move status</span>
                    <div className="flex gap-2 wrap">
                      {permissions.statusTargets.map((s) => (
                        <button key={s} type="button" className={`btn btn-sm ${s === 'Resolved' ? 'btn-primary' : 'btn-secondary'}`} disabled={busy} onClick={() => changeStatus(s)}>
                          {ACTION_LABEL[s] || s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* admins can escalate or remove the escalation */}
                {isAdmin && !closed && (
                  <>
                    <div className="divider" />
                    <button type="button" className={`btn btn-sm ${incident.isEscalated ? 'btn-secondary' : 'btn-danger-outline'}`} disabled={busy}
                      onClick={() => (incident.isEscalated ? update({ isEscalated: false }, 'Escalation removed.') : setEscalateOpen(true))}>
                      <Icon name="flag" size={14} /> {incident.isEscalated ? 'Remove escalation' : 'Escalate incident'}
                    </button>
                  </>
                )}
                {user._id === incident.createdBy?._id && incident.status === 'Resolved' && (
                  <p className="text-sm text-muted">Happy with the fix? Close the incident to confirm it is resolved.</p>
                )}
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-header"><h2>Activity</h2></div>
            <div className="card-body">
              {activity.loading ? <LoadingState rows={4} /> : activity.error ? <ErrorState error={activity.error} /> : <ActivityTimeline items={activity.data} />}
            </div>
          </section>
        </div>
      </div>

      {/* popups for the escalation reason and the delete confirmation */}
      <ConfirmDialog
        open={escalateOpen}
        busy={busy}
        tone="primary"
        title={`Escalate ${incident.incidentNumber}?`}
        message="Admins, the assigned technician and the reporter will be notified."
        confirmLabel="Escalate"
        onCancel={() => { setEscalateOpen(false); setEscalationReason(''); }}
        onConfirm={async () => {
          if (escalationReason.trim().length < 3) return notify('Give a reason for the escalation.', 'error');
          if (await update({ isEscalated: true, escalationReason }, 'Incident escalated.')) { setEscalateOpen(false); setEscalationReason(''); }
        }}
      >
        <div className="field mt-4">
          <label htmlFor="escalation-reason">Reason</label>
          <input id="escalation-reason" value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} placeholder="e.g. Affects the whole floor" />
        </div>
      </ConfirmDialog>
      <ConfirmDialog open={confirmDelete} busy={busy} title={`Delete ${incident.incidentNumber}?`} message="This permanently removes the incident with its comments, attachments and audit history." onCancel={() => setConfirmDelete(false)} onConfirm={remove} />
    </>
  );
} // end IncidentDetails
