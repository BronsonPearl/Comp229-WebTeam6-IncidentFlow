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
import { summarize } from '@shared/incidentQuery.js';
import { analyticsService, incidentService } from '../services/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';
import { ActiveBadge, EscalatedBadge, PriorityBadge, RoleBadge, StatusBadge } from '../components/Badges.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from '../components/common.jsx';
import { IncidentTable } from '../components/incidents.jsx';
import { describeActivity, fullName, initials, timeAgo } from '../utils/format.js';

// Good morning / afternoon / evening based on the time
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// ---------- ACTIVITY FEED ----------

// recent activity list used by the user and technician dashboards
function ActivityFeed() {
  const { data, loading, error } = useAsync(() => incidentService.recentActivity(8).then((r) => r.data.items), []);
  return (
    <div className="card">
      <div className="card-header"><h2>Recent activity</h2></div>
      {loading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} />}
      {data && data.length === 0 && <EmptyState icon="activity" title="Nothing yet" message="Updates on your incidents will appear here." />}
      {data && data.length > 0 && (
        <ul className="feed">
          {data.map((a) => (
            <li key={a._id}>
              <span className="feed-dot" aria-hidden="true" />
              <span>
                <strong>{a.user ? fullName(a.user) : 'System'}</strong> {describeActivity(a)}
                {a.incident && <> on <Link to={`/incidents/${a.incident._id}`}>{a.incident.incidentNumber}</Link></>}
                <time dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- USER DASHBOARD ----------

// loads my incidents and counts them for the stat cards
export function UserDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => incidentService.list({ scope: 'mine', limit: 100 }).then((r) => r.data.items), []);
  const s = summarize(data || []);
  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.firstName}`}
        subtitle="Here is the latest on the incidents you have reported."
        actions={<Link to="/incidents/new" className="btn btn-primary"><Icon name="plus" size={16} /> Report Incident</Link>}
      />
      {error ? <div className="card"><ErrorState error={error} onRetry={reload} /></div> : (
        <>
          <div className="stats">
            <StatCard label="Total reported" value={loading ? '…' : s.total} icon="layers" tone="slate" to="/my-incidents" />
            <StatCard label="Open" value={loading ? '…' : s.Open + s.Assigned} icon="inbox" tone="blue" hint="Awaiting a technician" />
            <StatCard label="In progress" value={loading ? '…' : s['In Progress'] + s['On Hold']} icon="clock" tone="indigo" />
            <StatCard label="Resolved" value={loading ? '…' : s.Resolved + s.Closed} icon="checkCircle" tone="green" />
            <StatCard label="Critical" value={loading ? '…' : s.critical} icon="alert" tone="red" hint="Open critical incidents" />
          </div>
          {/* recent incidents on the left, activity feed on the right */}
          <div className="split">
            <div className="card">
              <div className="card-header"><h2>Recent incidents</h2><Link to="/my-incidents" className="text-sm">View all</Link></div>
              {loading && <LoadingState rows={5} />}
              {data && data.length === 0 && (
                <EmptyState title="You have not reported anything yet" message="When something breaks, report it here and track it to resolution." action={<Link to="/incidents/new" className="btn btn-primary btn-sm">Report your first incident</Link>} />
              )}
              {data && data.length > 0 && <IncidentTable incidents={data.slice(0, 6)} columns={['priority', 'status', 'assignee', 'updated']} />}
            </div>
            <ActivityFeed />
          </div>
        </>
      )}
    </>
  );
} // end UserDashboard

// ---------- TECHNICIAN DASHBOARD ----------

// my assigned incidents, highest priority first
export function TechnicianDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => incidentService.list({ scope: 'assigned', limit: 100, sort: 'priority' }).then((r) => r.data.items), []);
  const list = data || [];
  const s = summarize(list);

  // active = not resolved or closed yet
  const active = list.filter((i) => !['Resolved', 'Closed'].includes(i.status));
  const escalated = active.filter((i) => i.isEscalated);
  return (
    <>
      <PageHeader title={`${greeting()}, ${user.firstName}`} subtitle="Your operational queue, sorted by priority." actions={<Link to="/assigned" className="btn btn-primary"><Icon name="tool" size={16} /> Open my queue</Link>} />
      {error ? <div className="card"><ErrorState error={error} onRetry={reload} /></div> : (
        <>
          <div className="stats">
            <StatCard label="Assigned to me" value={loading ? '…' : active.length} icon="tool" tone="slate" to="/assigned" hint="Active incidents" />
            <StatCard label="New assignments" value={loading ? '…' : s.Assigned} icon="inbox" tone="cyan" hint="Not started yet" />
            <StatCard label="In progress" value={loading ? '…' : s['In Progress'] + s['On Hold']} icon="clock" tone="indigo" />
            <StatCard label="Critical" value={loading ? '…' : s.critical} icon="alert" tone="red" />
            <StatCard label="Resolved" value={loading ? '…' : s.Resolved + s.Closed} icon="checkCircle" tone="green" />
          </div>
          {/* red banner listing escalated incidents */}
          {escalated.length > 0 && (
            <div className="escalation-banner" role="alert">
              <Icon name="flag" />
              <span><strong>{escalated.length} escalated incident{escalated.length > 1 ? 's' : ''}</strong> need{escalated.length === 1 ? 's' : ''} your attention: {escalated.map((i) => i.incidentNumber).join(', ')}</span>
            </div>
          )}
          <div className="split">
            <div className="card">
              <div className="card-header"><h2>Active queue</h2><Link to="/assigned" className="text-sm">Manage queue</Link></div>
              {loading && <LoadingState rows={5} />}
              {data && active.length === 0 && <EmptyState icon="checkCircle" title="Queue is clear" message="No active incidents are assigned to you right now." />}
              {active.length > 0 && <IncidentTable incidents={active} columns={['priority', 'status', 'reporter', 'updated']} />}
            </div>
            <ActivityFeed />
          </div>
        </>
      )}
    </>
  );
} // end TechnicianDashboard

// ---------- ADMIN DASHBOARD ----------

// totals come from the analytics route, plus a separate list of unassigned incidents
export function AdminDashboard() {
  const summary = useAsync(() => analyticsService.summary(30).then((r) => r.data), []);
  const unassigned = useAsync(() => incidentService.list({ scope: 'all', unassigned: 'true', sort: 'priority', limit: 6 }).then((r) => r.data), []);
  const t = summary.data?.totals;

  // show … while loading
  const v = (n) => (summary.loading ? '…' : n);

  if (summary.error) return <div className="card"><ErrorState error={summary.error} onRetry={summary.reload} /></div>;
  return (
    <>
      <PageHeader
        title="Admin dashboard"
        subtitle="System-wide view of users, incidents and workload."
        actions={<><Link to="/admin/analytics" className="btn btn-secondary"><Icon name="chart" size={16} /> Analytics</Link><Link to="/admin/incidents" className="btn btn-primary"><Icon name="layers" size={16} /> Manage incidents</Link></>}
      />
      <div className="stats">
        <StatCard label="Total users" value={v(t?.users)} icon="users" tone="slate" to="/admin/users" hint={t ? `${t.activeUsers} active` : undefined} />
        <StatCard label="Technicians" value={v(t?.technicians)} icon="tool" tone="cyan" to="/admin/users" />
        <StatCard label="Total incidents" value={v(t?.incidents)} icon="layers" tone="slate" to="/admin/incidents" />
        <StatCard label="Open" value={v(t?.open)} icon="inbox" tone="blue" />
        <StatCard label="In progress" value={v(t?.inProgress)} icon="clock" tone="indigo" />
        <StatCard label="Resolved" value={v(t?.resolved)} icon="checkCircle" tone="green" />
        <StatCard label="Critical" value={v(t?.critical)} icon="alert" tone="red" />
        <StatCard label="Escalated" value={v(t?.escalated)} icon="flag" tone="amber" />
      </div>
      {/* 4 panels: unassigned, recent incidents, recent users, technician workload */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h2>Unassigned incidents {unassigned.data && <span className="badge status-open" style={{ marginLeft: 6 }}>{unassigned.data.total}</span>}</h2>
            <Link to="/admin/incidents?unassigned=true" className="text-sm">Assign now</Link>
          </div>
          {unassigned.loading && <LoadingState rows={4} />}
          {unassigned.data?.items.length === 0 && <EmptyState icon="checkCircle" title="Everything is assigned" message="New reports will show up here for triage." />}
          {unassigned.data?.items.length > 0 && (
            <ul className="mini-list">
              {unassigned.data.items.map((i) => (
                <li key={i._id}>
                  <span className="grow">
                    <strong><Link to={`/incidents/${i._id}`}>{i.title}</Link></strong>
                    <small>{i.incidentNumber} · {i.location} · {timeAgo(i.createdAt)}</small>
                  </span>
                  <PriorityBadge priority={i.priority} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-header"><h2>Recent incidents</h2><Link to="/admin/incidents" className="text-sm">View all</Link></div>
          {summary.loading && <LoadingState rows={4} />}
          {summary.data && (
            <ul className="mini-list">
              {summary.data.recentIncidents.map((i) => (
                <li key={i._id}>
                  <span className="grow">
                    <strong><Link to={`/incidents/${i._id}`}>{i.title}</Link></strong>
                    <small>{i.incidentNumber} · {fullName(i.createdBy)} · {timeAgo(i.createdAt)}</small>
                  </span>
                  {i.isEscalated && <EscalatedBadge />}
                  <StatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-header"><h2>Recent users</h2><Link to="/admin/users" className="text-sm">Manage users</Link></div>
          {summary.loading && <LoadingState rows={4} />}
          {summary.data && (
            <ul className="mini-list">
              {summary.data.recentUsers.map((u) => (
                <li key={u._id}>
                  <span className="avatar" aria-hidden="true">{initials(u)}</span>
                  <span className="grow"><strong>{fullName(u)}</strong><small>{u.email}</small></span>
                  <RoleBadge role={u.role} />
                  {!u.isActive && <ActiveBadge active={false} />}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-header"><h2>Technician workload</h2><Link to="/admin/analytics" className="text-sm">Full analytics</Link></div>
          {summary.loading && <LoadingState rows={4} />}
          {summary.data && (
            <ul className="mini-list">
              {summary.data.workload.map((w) => (
                <li key={w.technicianId}>
                  <span className="grow"><strong>{w.name}</strong><small>{w.resolved} resolved · avg {w.avgResolutionHours ?? '-'} h</small></span>
                  <span className="badge status-in-progress">{w.active} active</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
} // end AdminDashboard

// ---------- PICK THE DASHBOARD ----------

// /dashboard shows a different page for each role
export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'technician') return <TechnicianDashboard />;
  return <UserDashboard />;
}
