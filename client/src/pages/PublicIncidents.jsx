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
import { incidentService } from '../services/index.js';
import { useAsync, useDebounced } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/common.jsx';
import { IncidentTable, SearchFilterBar } from '../components/incidents.jsx';

export default function PublicIncidents() {
  const { isAuthenticated } = useAuth();

  // current search and filter values
  const [filters, setFilters] = useState({ q: '', status: '', priority: '', category: '', sort: 'newest' });

  // wait until typing stops before searching
  const q = useDebounced(filters.q);
  const params = { ...filters, q, scope: 'public', limit: 100 };

  // reload from the API whenever a filter changes
  const { data, loading, error, reload } = useAsync(() => incidentService.list(params).then((r) => r.data), [q, filters.status, filters.priority, filters.category, filters.sort]);

  return (
    <div className="section" style={{ paddingTop: 40 }}>
      <PageHeader
        title="Public Incidents"
        subtitle="Incident number, title, category, priority, status and date only. Sign in to see full details for incidents you are involved in."
        actions={isAuthenticated ? <Link to="/incidents/new" className="btn btn-primary">Report incident</Link> : <Link to="/signin" className="btn btn-primary">Sign in to report</Link>}
      />
      <div className="card">
        {/* search, filters and the result count */}
        <SearchFilterBar value={filters} onChange={setFilters} total={data?.total} />
        {/* loading, error, no results, or the table (no links since details need a sign in) */}
        {loading && <LoadingState rows={8} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {!loading && !error && data.items.length === 0 && (
          <EmptyState icon="search" title="No incidents match" message="Try a different search or clear the filters." action={<button className="btn btn-secondary btn-sm" onClick={() => setFilters({ q: '', status: '', priority: '', category: '', sort: 'newest' })}>Clear filters</button>} />
        )}
        {!loading && !error && data.items.length > 0 && <IncidentTable incidents={data.items} columns={['category', 'priority', 'status', 'created']} linkable={false} />}
      </div>
    </div>
  );
} // end PublicIncidents
