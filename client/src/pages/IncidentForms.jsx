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
import { useNavigate, useParams } from 'react-router-dom';
import { attachmentService, incidentService, userService } from '../services/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ErrorState, Field, LoadingState, PageHeader } from '../components/common.jsx';
import { IncidentForm } from '../components/incidents.jsx';
import { StatusBadge } from '../components/Badges.jsx';
import { LIMITS } from '@shared/constants.js';

// ---------- REPORT INCIDENT ----------

export function ReportIncident() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  // errors sent back by the API, shown next to the fields
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState(null);

  // create the incident first, then upload the files one by one
  const submit = async (data, files) => {
    setBusy(true);
    setServerErrors({});
    setFormError(null);
    try {
      const res = await incidentService.create(data);
      const incident = res.data.incident;

      // a failed upload should not lose the incident, we just list which files failed
      const failed = [];
      for (const f of files) {
        try {
          await attachmentService.upload(incident._id, f);
        } catch {
          failed.push(f.name);
        }
      }
      notify(res.message);
      if (failed.length) notify(`Could not upload: ${failed.join(', ')}`, 'error');

      // open the new incident (replace so Back does not return to the empty form)
      navigate(`/incidents/${incident._id}`, { replace: true });
    } catch (err) {
      setServerErrors(err.errors || {});
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Report Incident" subtitle="Tell us what happened. Your report is saved as Open and an admin will assign a technician." back={{ to: '/my-incidents', label: 'My Incidents' }} />
      <div className="card card-pad" style={{ maxWidth: 860 }}>
        {formError && <div className="alert alert-error mb-4" role="alert">{formError}</div>}
        <IncidentForm allowFiles submitLabel="Submit incident" busy={busy} serverErrors={serverErrors} onSubmit={submit} onCancel={() => navigate(-1)} />
      </div>
    </>
  );
} // end ReportIncident

// ---------- EDIT INCIDENT ----------

export function EditIncident() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => incidentService.get(id).then((r) => r.data), [id]);

  // admins need the technician list for the assign dropdown
  const techs = useAsync(() => (user.role === 'admin' ? userService.list({ role: 'technician', status: 'active' }).then((r) => r.data.items) : Promise.resolve([])), [user.role]);

  // status / resolution / technician values, null until the user changes something
  const [workflow, setWorkflow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState(null);

  // loading and error states before we have the incident
  if (loading) return <div className="card"><LoadingState rows={8} /></div>;
  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;

  const { incident, permissions } = data;

  // is this field in my editableFields list from the server?
  const can = (f) => permissions.editableFields.includes(f);

  // nothing editable = show the no access message
  if (!permissions.editableFields.length) {
    return <div className="card"><ErrorState error={{ status: 403, message: 'You are not authorized to edit this incident. Reporters can edit only while an incident is still Open.' }} /></div>;
  }
  const wf = workflow || { status: incident.status, resolution: incident.resolution || '', assignedTo: incident.assignedTo?._id || '' };

  // which normal form fields are unlocked for me
  const baseFields = ['title', 'description', 'category', 'priority', 'location'].filter(can);

  // only send the fields that actually changed
  const submit = async (values) => {
    const changes = {};
    Object.entries(values).forEach(([k, v]) => { if (String(v) !== String(incident[k] ?? '')) changes[k] = v; });
    if (can('assignedTo') && wf.assignedTo !== (incident.assignedTo?._id || '')) changes.assignedTo = wf.assignedTo || null;
    if (can('resolution') && wf.resolution !== (incident.resolution || '')) changes.resolution = wf.resolution;
    if (can('status') && wf.status !== incident.status) changes.status = wf.status;
    if (!Object.keys(changes).length) return notify('No changes to save.');
    setBusy(true);
    setServerErrors({});
    setFormError(null);
    try {
      const res = await incidentService.update(id, changes);
      notify(res.message);
      navigate(`/incidents/${id}`);
    } catch (err) {
      setServerErrors(err.errors || {});
      setFormError(err.message);
      setBusy(false);
    }
  };

  // current status plus the ones I am allowed to move to
  const statusOptions = [incident.status, ...permissions.statusTargets];
  const showWorkflow = can('status') || can('resolution') || can('assignedTo');

  return (
    <>
      <PageHeader title={`Edit ${incident.incidentNumber}`} subtitle={incident.title} back={{ to: `/incidents/${id}`, label: 'Back to incident' }} />
      <div className="card card-pad" style={{ maxWidth: 860 }}>
        {formError && <div className="alert alert-error mb-4" role="alert">{formError}</div>}
        {baseFields.length < 5 && <div className="alert alert-info mb-4">Some fields are read-only for your role. Locked fields are greyed out.</div>}
        <IncidentForm initial={incident} fields={baseFields} submitLabel="Save changes" busy={busy} serverErrors={serverErrors} onSubmit={submit} onCancel={() => navigate(`/incidents/${id}`)}>
          {/* workflow box, only for people who can change status, resolution or the technician */}
          {showWorkflow && (
            <fieldset className="card card-pad" style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', margin: 0 }}>
              <legend className="label" style={{ padding: '0 6px' }}>Workflow</legend>
              <div className="form-row">
                {can('assignedTo') && (
                  <Field id="wf-assigned" label="Assigned technician" error={serverErrors.assignedTo}>
                    <select id="wf-assigned" value={wf.assignedTo} onChange={(e) => setWorkflow({ ...wf, assignedTo: e.target.value })}>
                      <option value="">Unassigned</option>
                      {(techs.data || []).map((t) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                  </Field>
                )}
                {can('status') && (
                  <Field id="wf-status" label="Status" error={serverErrors.status} hint={<>Current: <StatusBadge status={incident.status} /></>}>
                    <select id="wf-status" value={wf.status} onChange={(e) => setWorkflow({ ...wf, status: e.target.value })}>
                      {statusOptions.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                )}
              </div>
              {can('resolution') && (
                <div className="mt-4">
                  <Field id="wf-resolution" label="Resolution summary" error={serverErrors.resolution} hint="Required before an incident can be marked Resolved.">
                    <textarea id="wf-resolution" rows={3} value={wf.resolution} maxLength={LIMITS.resolution[1]} onChange={(e) => setWorkflow({ ...wf, resolution: e.target.value })} style={{ minHeight: 80 }} />
                  </Field>
                </div>
              )}
            </fieldset>
          )}
        </IncidentForm>
      </div>
    </>
  );
} // end EditIncident
