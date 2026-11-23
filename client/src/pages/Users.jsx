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
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROLES } from '@shared/constants.js';
import { validateProfile, validateSignUp } from '@shared/validation.js';
import { userService } from '../services/index.js';
import { useAsync, useDebounced } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import { ActiveBadge, RoleBadge } from '../components/Badges.jsx';
import { ConfirmDialog, EmptyState, ErrorState, Field, LoadingState, PageHeader, SubmitButton } from '../components/common.jsx';
import { formatDate, fullName, initials, roleLabel } from '../utils/format.js';

// ---------- MANAGE USERS ----------

export function ManageUsers() {
  const { user: me } = useAuth();
  const { notify } = useToast();
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const q = useDebounced(filters.q);
  const state = useAsync(() => userService.list({ ...filters, q }).then((r) => r.data), [q, filters.role, filters.status]);

  // which action is waiting for confirmation: { type, user }
  const [confirm, setConfirm] = useState(null); // { type: 'delete'|'deactivate'|'activate', user }
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  // runs the confirmed action and updates the list without reloading
  const run = async () => {
    setBusy(true);
    const { type, user } = confirm;
    try {
      // delete removes them from the list, deactivate / activate swaps in the updated user
      if (type === 'delete') {
        await userService.remove(user._id);
        state.setData((d) => ({ ...d, items: d.items.filter((u) => u._id !== user._id), total: d.total - 1 }));
        notify(`${fullName(user)} was deleted.`);
      } else {
        const res = await userService.update(user._id, { isActive: type === 'activate' });
        state.setData((d) => ({ ...d, items: d.items.map((u) => (u._id === user._id ? res.data.user : u)) }));
        notify(`${fullName(user)} was ${type === 'activate' ? 'reactivated' : 'deactivated'}.`);
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  // dialog title, message and button text for each action
  const text = {
    delete: ['Delete user?', 'This permanently deletes the account. Their reported incidents stay in the system. Consider deactivating instead.', 'Delete user'],
    deactivate: ['Deactivate user?', 'They will no longer be able to sign in. You can reactivate them at any time.', 'Deactivate'],
    activate: ['Reactivate user?', 'They will be able to sign in again.', 'Reactivate'],
  }[confirm?.type || 'delete'];

  return (
    <>
      <PageHeader title="Users" subtitle="Manage accounts, roles and access." actions={<Link to="/admin/users/new" className="btn btn-primary"><Icon name="plus" size={16} /> New user</Link>} />
      <div className="card">
        {/* search by name or email, filter by role and status */}
        <div className="filter-bar" role="search">
          <div className="search-input">
            <Icon name="search" />
            <label htmlFor="user-search" className="sr-only">Search users</label>
            <input id="user-search" type="search" placeholder="Search by name or email" value={filters.q} onChange={set('q')} />
          </div>
          <select aria-label="Filter by role" value={filters.role} onChange={set('role')}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
          <select aria-label="Filter by status" value={filters.status} onChange={set('status')}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
          {state.data && <span className="result-count">{state.data.total} user{state.data.total === 1 ? '' : 's'}</span>}
        </div>
        {state.loading && <LoadingState rows={6} />}
        {state.error && <ErrorState error={state.error} onRetry={state.reload} />}
        {state.data?.items.length === 0 && <EmptyState icon="users" title="No users found" message="Try a different search or filter." />}
        {state.data?.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {state.data.items.map((u) => {
                  // no deactivate or delete buttons on your own row
                  const self = u._id === me._id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <span className="person">
                          <span className="avatar" aria-hidden="true">{initials(u)}</span>
                          <span><span className="cell-title">{fullName(u)}{self && <span className="text-muted text-sm"> (you)</span>}</span><span className="cell-sub" style={{ display: 'block' }}>{u.email}</span></span>
                        </span>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td><ActiveBadge active={u.isActive} /></td>
                      <td className="nowrap">{formatDate(u.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/admin/users/${u._id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                          {!self && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm({ type: u.isActive ? 'deactivate' : 'activate', user: u })}>
                              {u.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                          {!self && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red-600)' }} onClick={() => setConfirm({ type: 'delete', user: u })} aria-label={`Delete ${fullName(u)}`}><Icon name="trash" size={15} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog open={!!confirm} busy={busy} title={text[0]} message={confirm && `${fullName(confirm.user)}: ${text[1]}`} confirmLabel={text[2]} tone={confirm?.type === 'activate' ? 'primary' : 'danger'} onCancel={() => setConfirm(null)} onConfirm={run} />
    </>
  );
} // end ManageUsers

// ---------- USER FORM (EDIT OR NEW) ----------

// no :id in the URL means we are creating a new user
export function UserForm() {
  const { id } = useParams();
  const isNew = !id;
  const { user: me, updateUser } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  // load the user when editing
  const existing = useAsync(() => (isNew ? Promise.resolve(null) : userService.get(id).then((r) => r.data.user)), [id]);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (existing.loading) return <div className="card"><LoadingState rows={6} /></div>;
  if (existing.error) return <div className="card"><ErrorState error={existing.error} onRetry={existing.reload} /></div>;

  // starting values: the user being edited, or a blank new user
  const base = existing.data
    ? { firstName: existing.data.firstName, lastName: existing.data.lastName, email: existing.data.email, role: existing.data.role, isActive: existing.data.isActive, password: '' }
    : { firstName: '', lastName: '', email: '', role: 'user', isActive: true, password: '' };
  const v = values || base;

  // checkboxes use checked, everything else uses value
  const set = (k) => (e) => setValues({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const self = id === me._id;

  // new users need a valid password, when editing a password is optional (reset)
  const submit = async (e) => {
    e.preventDefault();
    const { password, ...profile } = v;
    const errs = isNew ? { ...validateSignUp(v), ...validateProfile(profile) } : validateProfile(profile);
    if (!isNew && password && password.length < 8) errs.password = 'Password must be at least 8 characters.';
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const body = { ...profile };
      if (password) body.password = password;
      const res = isNew ? await userService.create(body) : await userService.update(id, body);

      // if I edited myself, update the saved user too
      if (self) updateUser(res.data.user);
      notify(res.message);
      navigate('/admin/users');
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={isNew ? 'New user' : `Edit ${fullName(existing.data)}`} subtitle={isNew ? 'Create an account with any role.' : 'Change profile details, role or access.'} back={{ to: '/admin/users', label: 'Users' }} />
      <form className="card card-pad form" style={{ maxWidth: 720 }} onSubmit={submit} noValidate aria-label="User form">
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        <div className="form-row">
          <Field id="firstName" label="First Name" required error={errors.firstName}><input id="firstName" value={v.firstName} onChange={set('firstName')} /></Field>
          <Field id="lastName" label="Last Name" required error={errors.lastName}><input id="lastName" value={v.lastName} onChange={set('lastName')} /></Field>
        </div>
        <Field id="email" label="Email" required error={errors.email}><input id="email" type="email" value={v.email} onChange={set('email')} /></Field>
        <div className="form-row">
          <Field id="role" label="Role" required error={errors.role} hint={self ? 'Changing your own role takes effect immediately.' : undefined}>
            <select id="role" value={v.role} onChange={set('role')}>
              {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </Field>
          <Field id="password" label={isNew ? 'Password' : 'Reset password'} required={isNew} error={errors.password} hint={isNew ? '8+ characters with a letter and a number.' : 'Leave blank to keep the current password.'}>
            <input id="password" type="password" value={v.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
        </div>
        {/* active checkbox is locked on your own account */}
        <label className="checkbox">
          <input type="checkbox" checked={v.isActive} onChange={set('isActive')} disabled={self} /> Account is active {self && <span className="text-muted text-sm">(you cannot deactivate yourself)</span>}
        </label>
        <div className="form-actions">
          <Link to="/admin/users" className="btn btn-secondary">Cancel</Link>
          <SubmitButton busy={busy}>{isNew ? 'Create user' : 'Save changes'}</SubmitButton>
        </div>
      </form>
    </>
  );
} // end UserForm
