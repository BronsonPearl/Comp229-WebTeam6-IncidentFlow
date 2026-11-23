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
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { validateSignIn, validateSignUp } from '@shared/validation.js';
import { authService } from '../services/index.js';
import { DEMO_MODE } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import { Field, SubmitButton } from '../components/common.jsx';
import { TeamLogo } from '../components/Brand.jsx';

// dark panel on the left with the team logo and a few selling points
function AuthAside() {
  return (
    <aside className="auth-aside">
      <TeamLogo style={{ width: 180, height: 'auto', borderRadius: 10 }} />
      <h2>Every incident, owned and accounted for.</h2>
      <ul>
        <li><Icon name="check" /> Report incidents with category, priority, location and photos</li>
        <li><Icon name="check" /> Follow progress with a full activity timeline</li>
        <li><Icon name="check" /> Get notified the moment something changes</li>
        <li><Icon name="check" /> Role-based access for users, technicians and admins</li>
      </ul>
    </aside>
  );
}

// ---------- SIGN UP ----------

export function SignUp() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });

  // field errors and a general error message at the top
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  // makes an onChange handler for one field
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  // validate, send to the API, then go to Sign In with a success message
  const submit = async (e) => {
    e.preventDefault();
    const v = validateSignUp(values);
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      // confirm password is only for the form, the API does not need it
      const { confirmPassword, ...body } = values;
      await authService.signUp(body);
      navigate('/signin', { replace: true, state: { email: values.email, created: true } });

    // show what the server said, ex. the email is already used
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthAside />
      <div className="auth-main">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="sub">Sign up to report and track incidents.</p>
          <form className="form" onSubmit={submit} noValidate aria-label="Sign up form">
            {formError && <div className="alert alert-error" role="alert">{formError}</div>}
            <div className="form-row">
              <Field id="firstName" label="First Name" required error={errors.firstName}>
                <input id="firstName" autoComplete="given-name" value={values.firstName} onChange={set('firstName')} aria-invalid={!!errors.firstName} />
              </Field>
              <Field id="lastName" label="Last Name" required error={errors.lastName}>
                <input id="lastName" autoComplete="family-name" value={values.lastName} onChange={set('lastName')} aria-invalid={!!errors.lastName} />
              </Field>
            </div>
            <Field id="email" label="Email" required error={errors.email}>
              <input id="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field id="password" label="Password" required error={errors.password} hint="At least 8 characters, including a letter and a number.">
              <input id="password" type="password" autoComplete="new-password" value={values.password} onChange={set('password')} aria-invalid={!!errors.password} />
            </Field>
            <Field id="confirmPassword" label="Confirm Password" required error={errors.confirmPassword}>
              <input id="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
            </Field>
            <SubmitButton busy={busy} className="btn btn-primary btn-lg btn-block">Create account</SubmitButton>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/signin">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
} // end SignUp

// ---------- SIGN IN ----------

// quick sign in buttons, only shown in the demo build
const DEMO_ACCOUNTS = [
  ['Admin', 'Alex Morgan', 'alex.morgan@incidentflow.demo'],
  ['Technician', 'Jordan Lee', 'jordan.lee@incidentflow.demo'],
  ['User', 'Taylor Chen', 'taylor.chen@incidentflow.demo'],
];

// email is filled in if we came from Sign Up
export function SignIn() {
  const { signIn } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: location.state?.email || '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  // sign in, say hi, then go back to the page they wanted or the dashboard
  const doSignIn = async (creds) => {
    setBusy(true);
    setFormError(null);
    try {
      const user = await signIn(creds);
      notify(`Welcome back, ${user.firstName}.`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
      setBusy(false);
    }
  };

  // check the fields before calling the API
  const submit = (e) => {
    e.preventDefault();
    const v = validateSignIn(values);
    setErrors(v);
    if (Object.keys(v).length) return;
    doSignIn(values);
  };

  return (
    <div className="auth-page">
      <AuthAside />
      <div className="auth-main">
        <div className="auth-card">
          <h1>Sign in</h1>
          <p className="sub">Welcome back to IncidentFlow.</p>
          <form className="form" onSubmit={submit} noValidate aria-label="Sign in form">
            {/* green message right after signing up */}
            {location.state?.created && !formError && <div className="alert alert-success" role="status">Account created. Sign in with your new password.</div>}
            {formError && <div className="alert alert-error" role="alert">{formError}</div>}
            <Field id="email" label="Email" required error={errors.email}>
              <input id="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field id="password" label="Password" required error={errors.password}>
              <input id="password" type="password" autoComplete="current-password" value={values.password} onChange={set('password')} aria-invalid={!!errors.password} />
            </Field>
            <SubmitButton busy={busy} className="btn btn-primary btn-lg btn-block">Sign in</SubmitButton>
          </form>
          <p className="auth-switch">New to IncidentFlow? <Link to="/signup">Create an account</Link></p>
          {/* demo build only */}
          {DEMO_MODE && (
            <div className="demo-logins">
              <p>Demo accounts (password <code>demo1234</code>). Try each role:</p>
              <div className="demo-grid">
                {DEMO_ACCOUNTS.map(([role, name, email]) => (
                  <button key={email} type="button" className="btn btn-secondary" disabled={busy} onClick={() => doSignIn({ email, password: 'demo1234' })}>
                    {role}<small>{name}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} // end SignIn
