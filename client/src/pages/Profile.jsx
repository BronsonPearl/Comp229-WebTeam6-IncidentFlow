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
import { Link, useNavigate } from 'react-router-dom';
import { validateProfile } from '@shared/validation.js';
import { userService } from '../services/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import { ActiveBadge, RoleBadge } from '../components/Badges.jsx';
import { ErrorState, Field, LoadingState, PageHeader, StatCard, SubmitButton } from '../components/common.jsx';
import { formatDate, fullName, initials } from '../utils/format.js';

// ---------- MY PROFILE ----------

// loads my user record with the incident stats from the API
export function Profile() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => userService.get(user._id).then((r) => r.data), [user._id]);
  if (loading) return <div className="card"><LoadingState rows={6} /></div>;
  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;

  // r = incidents I reported, a = incidents assigned to me
  const { user: me, stats } = data;
  const r = stats.reported;
  const a = stats.assigned;

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your account details and incident summary." actions={<Link to="/profile/edit" className="btn btn-primary"><Icon name="edit" size={15} /> Edit Profile</Link>} />
      <div className="split" style={{ gridTemplateColumns: '360px minmax(0,1fr)' }}>
        <div className="card card-pad">
          <div className="flex items-center gap-3 mb-4">
            <span className="avatar avatar-lg" aria-hidden="true">{initials(me)}</span>
            <div>
              <h2 style={{ fontSize: 20 }}>{fullName(me)}</h2>
              <div className="flex gap-2 mt-2"><RoleBadge role={me.role} /><ActiveBadge active={me.isActive} /></div>
            </div>
          </div>
          <dl className="meta-list">
            <dt>Email</dt><dd>{me.email}</dd>
            <dt>Role</dt><dd>{me.role === 'admin' ? 'Administrator' : me.role === 'technician' ? 'Technician' : 'User'}</dd>
            <dt>Member since</dt><dd>{formatDate(me.createdAt)}</dd>
            <dt>Account status</dt><dd>{me.isActive ? 'Active' : 'Deactivated'}</dd>
          </dl>
        </div>
        <div className="stack">
          <div>
            <h2 className="card-title mb-4">Incidents I reported</h2>
            <div className="stats" style={{ marginBottom: 0 }}>
              <StatCard label="Total" value={r.total} icon="layers" tone="slate" to="/my-incidents" />
              <StatCard label="Open" value={r.Open + r.Assigned} icon="inbox" tone="blue" />
              <StatCard label="In progress" value={r['In Progress'] + r['On Hold']} icon="clock" tone="indigo" />
              <StatCard label="Resolved" value={r.Resolved + r.Closed} icon="checkCircle" tone="green" />
            </div>
          </div>
          {/* technicians also see their assigned work */}
          {me.role === 'technician' && (
            <div>
              <h2 className="card-title mb-4">Incidents assigned to me</h2>
              <div className="stats" style={{ marginBottom: 0 }}>
                <StatCard label="Assigned" value={a.total} icon="tool" tone="slate" to="/assigned" />
                <StatCard label="Active" value={a.Assigned + a['In Progress'] + a['On Hold']} icon="clock" tone="indigo" />
                <StatCard label="Resolved" value={a.Resolved + a.Closed} icon="checkCircle" tone="green" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} // end Profile

// ---------- EDIT PROFILE ----------

export function EditProfile() {
  const { user, updateUser } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email });

  // password fields are separate and optional
  const [pw, setPw] = useState({ currentPassword: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });
  const setP = (k) => (e) => setPw({ ...pw, [k]: e.target.value });

  // check the profile fields, and the password fields only if they were filled in
  const submit = async (e) => {
    e.preventDefault();
    const v = validateProfile(values);
    if (pw.password || pw.currentPassword) {
      if (!pw.currentPassword) v.currentPassword = 'Enter your current password.';
      if (pw.password.length < 8) v.password = 'New password must be at least 8 characters.';
      if (pw.password !== pw.confirm) v.confirm = 'Passwords do not match.';
    }
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      // only send the password if a new one was typed
      const body = { ...values };
      if (pw.password) Object.assign(body, { password: pw.password, currentPassword: pw.currentPassword });
      const res = await userService.update(user._id, body);

      // update the saved user so the sidebar shows the new name right away
      updateUser(res.data.user);
      notify(res.message);
      navigate('/profile');
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Edit Profile" subtitle="Update your name, email or password." back={{ to: '/profile', label: 'My Profile' }} />
      <form className="card card-pad form" style={{ maxWidth: 720 }} onSubmit={submit} noValidate aria-label="Edit profile form">
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        <div className="form-row">
          <Field id="firstName" label="First Name" required error={errors.firstName}>
            <input id="firstName" value={values.firstName} onChange={set('firstName')} autoComplete="given-name" />
          </Field>
          <Field id="lastName" label="Last Name" required error={errors.lastName}>
            <input id="lastName" value={values.lastName} onChange={set('lastName')} autoComplete="family-name" />
          </Field>
        </div>
        <Field id="email" label="Email" required error={errors.email}>
          <input id="email" type="email" value={values.email} onChange={set('email')} autoComplete="email" />
        </Field>
        {/* optional password change */}
        <div className="divider" />
        <div>
          <h2 className="card-title">Change password</h2>
          <p className="text-sm text-muted">Leave blank to keep your current password.</p>
        </div>
        <Field id="currentPassword" label="Current password" error={errors.currentPassword}>
          <input id="currentPassword" type="password" value={pw.currentPassword} onChange={setP('currentPassword')} autoComplete="current-password" />
        </Field>
        <div className="form-row">
          <Field id="newPassword" label="New password" error={errors.password}>
            <input id="newPassword" type="password" value={pw.password} onChange={setP('password')} autoComplete="new-password" />
          </Field>
          <Field id="confirmNew" label="Confirm new password" error={errors.confirm}>
            <input id="confirmNew" type="password" value={pw.confirm} onChange={setP('confirm')} autoComplete="new-password" />
          </Field>
        </div>
        <div className="form-actions">
          <Link to="/profile" className="btn btn-secondary">Cancel</Link>
          <SubmitButton busy={busy}>Save changes</SubmitButton>
        </div>
      </form>
    </>
  );
} // end EditProfile
