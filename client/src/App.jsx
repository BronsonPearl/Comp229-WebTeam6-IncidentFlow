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

// React and router
import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';

// context, layouts and shared components
import { useAuth } from './context/AuthContext.jsx';
import { AppLayout, ProtectedRoute, PublicLayout, RoleRoute } from './components/Layout.jsx';
import { PageLoader } from './components/common.jsx';
import Icon from './components/Icon.jsx';

// pages that load right away
import Home from './pages/Home.jsx';
import PublicIncidents from './pages/PublicIncidents.jsx';
import { SignIn, SignUp } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboards.jsx';
import { AssignedIncidents, MyIncidents } from './pages/IncidentLists.jsx';
import { EditIncident, ReportIncident } from './pages/IncidentForms.jsx';
import IncidentDetails from './pages/IncidentDetails.jsx';
import { EditProfile, Profile } from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';

// ---------- LAZY LOADED PAGES ----------

// these only download when someone opens them
// Analytics has the chart library which is the biggest part of the app
const ManageIncidents = lazy(() => import('./pages/IncidentLists.jsx').then((m) => ({ default: m.ManageIncidents })));
const ManageUsers = lazy(() => import('./pages/Users.jsx').then((m) => ({ default: m.ManageUsers })));
const UserForm = lazy(() => import('./pages/Users.jsx').then((m) => ({ default: m.UserForm })));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));

// ---------- HELPERS ----------

// Sign In / Sign Up are only for people who are signed out, otherwise go to the dashboard
function GuestOnly({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

// 404 page for URLs that do not exist
export function NotFound() {
  return (
    <div className="full-center">
      <div className="state">
        <div className="state-icon"><Icon name="search" /></div>
        <h3>Page not found</h3>
        <p>The page you are looking for does not exist or has moved.</p>
        <div className="flex gap-2 mt-2">
          <Link to="/" className="btn btn-secondary btn-sm">Home</Link>
          <Link to="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
        </div>
      </div>
    </div>
  );
} // end NotFound

// shortcut: protect a page and optionally limit it to some roles
const app = (el, roles) => <ProtectedRoute>{roles ? <RoleRoute roles={roles}>{el}</RoleRoute> : el}</ProtectedRoute>;

// ---------- ROUTES ----------

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* public pages with the top navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/incidents" element={<PublicIncidents />} />
          <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
          <Route path="/signin" element={<GuestOnly><SignIn /></GuestOnly>} />
        </Route>

        {/* signed in pages with the sidebar (any role) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-incidents" element={<MyIncidents />} />
          <Route path="/incidents/new" element={<ReportIncident />} />
          <Route path="/incidents/:id" element={<IncidentDetails />} />
          <Route path="/incidents/:id/edit" element={<EditIncident />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          {/* role limited pages (the API also checks the role) */}
          <Route path="/assigned" element={app(<AssignedIncidents />, ['technician', 'admin'])} />
          <Route path="/admin/incidents" element={app(<ManageIncidents />, ['admin'])} />
          <Route path="/admin/users" element={app(<ManageUsers />, ['admin'])} />
          <Route path="/admin/users/new" element={app(<UserForm />, ['admin'])} />
          <Route path="/admin/users/:id/edit" element={app(<UserForm />, ['admin'])} />
          <Route path="/admin/analytics" element={app(<Analytics />, ['admin'])} />
        </Route>

        <Route element={<PublicLayout />}>
          {/* anything else is a 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
} // end App
