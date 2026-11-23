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

// Recharts components for the charts
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { analyticsService } from '../services/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from '../components/common.jsx';

// same colours as the badges so everything matches
const STATUS_COLORS = { Open: '#2563EB', Assigned: '#06B6D4', 'In Progress': '#4F46E5', 'On Hold': '#D97706', Resolved: '#16A34A', Closed: '#64748B' };
const PRIORITY_COLORS = { Low: '#94A3B8', Medium: '#2563EB', High: '#EA580C', Critical: '#DC2626' };

// small grey axis labels
const axis = { fontSize: 12, fill: '#64748B' };

// card wrapper for a chart, shows "No data yet" when empty
function ChartCard({ title, children, empty }) {
  return (
    <div className="card chart-card">
      <div className="card-header"><h2>{title}</h2></div>
      <div className="card-body">{empty ? <EmptyState icon="chart" title="No data yet" /> : children}</div>
    </div>
  );
}

// ---------- ANALYTICS PAGE ----------

export default function Analytics() {
  // time range for the trend chart, reloads when it changes
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAsync(() => analyticsService.summary(days).then((r) => r.data), [days]);

  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  const t = data?.totals;

  // no incidents at all means show one empty message instead of empty charts
  const none = data && t.incidents === 0;

  // turn "2026-11-22" into "Nov 22" for the chart labels
  const trend = (data?.trend || []).map((d) => ({ ...d, label: new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) }));

  // biggest category count, used to size the category bars
  const maxCat = Math.max(1, ...(data?.byCategory || []).map((c) => c.value));

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Calculated live from incident records."
        actions={
          <>
            <label htmlFor="days" className="sr-only">Time range</label>
            <select id="days" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 'auto' }}>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </>
        }
      />
      {loading && <div className="card"><LoadingState rows={8} /></div>}
      {data && (
        <>
          {/* stat cards */}
          <div className="stats">
            <StatCard label="Total incidents" value={t.incidents} icon="layers" tone="slate" />
            <StatCard label="Resolved" value={t.resolved} icon="checkCircle" tone="green" />
            <StatCard label="Avg resolution" value={data.resolution.avgHours != null ? `${data.resolution.avgHours} h` : '-'} icon="clock" tone="indigo" hint={data.resolution.medianHours != null ? `Median ${data.resolution.medianHours} h` : undefined} />
            <StatCard label="Open critical" value={t.critical} icon="alert" tone="red" />
            <StatCard label="Escalated" value={t.escalated} icon="flag" tone="amber" />
            <StatCard label="Unassigned" value={t.unassigned} icon="inbox" tone="blue" />
          </div>
          {/* one empty message if there is no data, otherwise the 4 charts and the workload table */}
          {none ? (
            <div className="card"><EmptyState icon="chart" title="No incidents yet" message="Charts appear once incidents are reported." /></div>
          ) : (
            <div className="grid grid-2">
              <ChartCard title={`Created vs resolved (last ${days} days)`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }} barGap={1}>
                    <CartesianGrid stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis allowDecimals={false} tick={axis} />
                    <Tooltip cursor={{ fill: '#F1F5F9' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="created" name="Created" fill="#0284C7" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#16A34A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Incidents by status">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.byStatus.filter((s) => s.value)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2} isAnimationActive={false}>
                      {data.byStatus.filter((s) => s.value).map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Incidents by priority">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byPriority} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={axis} />
                    <YAxis allowDecimals={false} tick={axis} />
                    <Tooltip cursor={{ fill: '#F1F5F9' }} />
                    <Bar dataKey="value" name="Incidents" radius={[6, 6, 0, 0]}>
                      {data.byPriority.map((p) => <Cell key={p.name} fill={PRIORITY_COLORS[p.name]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <div className="card">
                <div className="card-header"><h2>Incidents by category</h2></div>
                <div className="card-body bar-list">
                  {data.byCategory.map((c) => (
                    <div className="bar-row" key={c.name}>
                      <span>{c.name}</span>
                      <span className="bar-track" role="img" aria-label={`${c.name}: ${c.value}`}><span className="bar-fill" style={{ width: `${(c.value / maxCat) * 100}%` }} /></span>
                      <b>{c.value}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header"><h2>Technician workload and performance</h2></div>
                {data.workload.length === 0 ? <EmptyState icon="users" title="No technicians yet" /> : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th scope="col">Technician</th><th scope="col">Active incidents</th><th scope="col">Resolved</th><th scope="col">Avg resolution time</th></tr></thead>
                      <tbody>
                        {data.workload.map((w) => (
                          <tr key={w.technicianId}>
                            <td className="cell-title">{w.name}</td>
                            <td>{w.active}</td>
                            <td>{w.resolved}</td>
                            <td>{w.avgResolutionHours != null ? `${w.avgResolutionHours} hours` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
} // end Analytics
