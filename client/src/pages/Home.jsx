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

import { Link } from 'react-router-dom';
import { incidentService } from '../services/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { summarize } from '@shared/incidentQuery.js';
import Icon from '../components/Icon.jsx';
import { BrandMark, TeamLogo } from '../components/Brand.jsx';
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import { EmptyState, LoadingState } from '../components/common.jsx';
import { IncidentTable } from '../components/incidents.jsx';
import { timeAgo } from '../utils/format.js';

// feature cards: [icon, title, text]
const FEATURES = [
  ['inbox', 'One place for every report', 'Replace scattered emails, chats and spreadsheets with a single, searchable incident record.'],
  ['tool', 'Clear ownership', 'Admins assign each incident to a technician so everyone knows who is working on what.'],
  ['activity', 'Full audit history', 'Every assignment, status change, comment and file is recorded on a timeline.'],
  ['bell', 'Notifications that matter', 'Reporters and technicians are told about assignments, updates and resolutions.'],
  ['shield', 'Secure by design', 'JWT sign-in, hashed passwords and role-based permissions enforced on the server.'],
  ['chart', 'Live analytics', 'Status, priority, category, resolution time and technician workload from real data.'],
];

// ---------- HOME PAGE ----------

export default function Home() {
  const { isAuthenticated } = useAuth();

  // load up to 100 public incidents for the overview numbers and the table
  const { data, loading, error } = useAsync(() => incidentService.list({ scope: 'public', limit: 100, sort: 'newest' }).then((r) => r.data), []);
  const items = data?.items || [];

  // counts for the 3 boxes in the live overview
  const s = summarize(items);

  return (
    <>
      {/* hero: name, tagline, buttons and team logo on the left, live overview on the right */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <span className="eyebrow"><BrandMark className="brand-mark" /> Incident Management Platform</span>
            <h1>Incident<span className="accent">Flow</span></h1>
            <p className="tagline">Report. Track. Resolve.</p>
            <p className="lead">
              A calm, professional console for reporting operational incidents, assigning the right technician,
              and following every step from first report to final resolution.
            </p>
            <div className="hero-ctas">
              {/* different buttons if you are already signed in */}
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="btn btn-accent btn-lg">Go to dashboard <Icon name="arrowRight" size={16} /></Link>
                  <Link to="/incidents/new" className="btn btn-on-dark btn-lg">Report an incident</Link>
                </>
              ) : (
                <>
                  <Link to="/signup" className="btn btn-accent btn-lg">Sign Up free <Icon name="arrowRight" size={16} /></Link>
                  <Link to="/signin" className="btn btn-on-dark btn-lg">Sign In</Link>
                </>
              )}
            </div>
            <div className="team-credit">
              <TeamLogo />
              <span>Designed and built by<br /><strong style={{ color: 'var(--white)' }}>Web Team Six</strong></span>
            </div>
          </div>

          {/* live overview box with real numbers from the API */}
          <div className="console" aria-label="Live incident overview">
            <div className="console-head">
              <span className="console-dots"><span /><span /><span /></span>
              <span>Live overview</span>
            </div>
            <div className="console-mini">
              <div><b>{loading ? '–' : s.Open + s.Assigned}</b><small>Awaiting work</small></div>
              <div><b>{loading ? '–' : s['In Progress'] + s['On Hold']}</b><small>In progress</small></div>
              <div><b>{loading ? '–' : s.Resolved + s.Closed}</b><small>Resolved</small></div>
            </div>
            {loading && <LoadingState rows={4} />}
            {!loading && items.slice(0, 4).map((i) => (
              <div className="console-row" key={i._id}>
                <span className="t">
                  <strong>{i.title}</strong>
                  <span>{i.incidentNumber} · {i.category} · {timeAgo(i.createdAt)}</span>
                </span>
                <PriorityBadge priority={i.priority} />
                <StatusBadge status={i.status} />
              </div>
            ))}
            {!loading && !items.length && <p className="text-sm" style={{ color: 'var(--slate-400)' }}>No incidents reported yet.</p>}
          </div>
        </div>
      </section>

      {/* recent incidents table with loading, error and empty states */}
      <section className="section">
        <div className="page-header">
          <div>
            <h2 style={{ fontSize: 26 }}>Recent incidents</h2>
            <p>A public snapshot. Details, reporters and comments stay private to signed-in participants.</p>
          </div>
          <Link to="/incidents" className="btn btn-secondary">View all public incidents <Icon name="arrowRight" size={15} /></Link>
        </div>
        <div className="card">
          {loading && <LoadingState rows={5} />}
          {error && <EmptyState icon="alert" title="Recent incidents are unavailable" message="We could not reach the server. The rest of the site still works, please try again shortly." />}
          {!loading && !error && items.length === 0 && <EmptyState title="No incidents yet" message="When incidents are reported they will appear here." />}
          {!loading && !error && items.length > 0 && <IncidentTable incidents={items.slice(0, 6)} columns={['category', 'priority', 'status', 'created']} linkable={false} />}
        </div>
      </section>

      {/* feature cards */}
      <section className="roles-band">
        <div className="section">
          <div className="section-head">
            <h2>Built for how incidents really get fixed</h2>
            <p>IncidentFlow goes beyond a simple form: it gives every incident an owner, a status and a history.</p>
          </div>
          <div className="grid grid-3">
            {FEATURES.map(([icon, title, text]) => (
              <div className="card feature" key={title}>
                <div className="feature-icon"><Icon name={icon} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Three roles, one workflow</h2>
          <p>From the first report to the final sign-off, everyone sees exactly what they need.</p>
        </div>
        {/* how the 3 roles work together */}
        <div className="steps">
          <div className="card step"><h3>Users report</h3><p>Anyone with an account can report an incident with a category, priority, location and photos, then track it to resolution.</p></div>
          <div className="card step"><h3>Admins assign</h3><p>Admins triage the queue, assign technicians, escalate critical issues and manage user accounts and roles.</p></div>
          <div className="card step"><h3>Technicians resolve</h3><p>Technicians work their assigned queue, post updates, attach evidence and record how each incident was resolved.</p></div>
        </div>
        {/* sign up call to action, hidden once signed in */}
        {!isAuthenticated && (
          <div className="cta-band mt-4" style={{ marginTop: 40 }}>
            <div>
              <h2>Ready to report your first incident?</h2>
              <p>Create an account in under a minute.</p>
            </div>
            <div className="flex gap-2 wrap">
              <Link to="/signup" className="btn btn-accent btn-lg">Sign Up</Link>
              <Link to="/signin" className="btn btn-on-dark btn-lg">Sign In</Link>
            </div>
          </div>
        )}
      </section>

      {/* footer with the team and the stack */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-team">
            <TeamLogo />
            <div>
              <strong style={{ color: 'var(--white)' }}>IncidentFlow</strong> · Report. Track. Resolve.
              <br />A Web Team Six product · Ivan Seck Ali, Robel Teffera, Ryan Sunil, Bronson Pearl
            </div>
          </div>
          <div>© {new Date().getFullYear()} Web Team Six. Built with MongoDB, Express, React and Node.js.</div>
        </div>
      </footer>
    </>
  );
} // end Home
