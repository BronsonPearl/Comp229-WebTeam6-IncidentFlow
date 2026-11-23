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

// react, router, contexts and our components
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DEMO_MODE } from '../services/api.js';
import { Brand, TeamLogo } from './Brand.jsx';
import Icon from './Icon.jsx';
import { PageLoader } from './common.jsx';
import { fullName, initials, roleLabel } from '../utils/format.js';

// ---------- SIDEBAR LINKS ----------

// builds the sidebar link list for a role
// items with "section" are the small grey headings
export function navItemsFor(role) {
  const items = [{ section: 'Workspace' }, { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }];

  // technicians get their queue, admins get Manage Incidents
  if (role === 'technician') items.push({ to: '/assigned', label: 'Assigned Incidents', icon: 'tool' });
  if (role === 'admin') items.push({ to: '/admin/incidents', label: 'Manage Incidents', icon: 'layers' });
  items.push({ to: '/my-incidents', label: 'My Incidents', icon: 'list' }, { to: '/incidents/new', label: 'Report Incident', icon: 'plus' }, { to: '/notifications', label: 'Notifications', icon: 'bell', badge: true });

  // admin only section
  if (role === 'admin') items.push({ section: 'Administration' }, { to: '/admin/users', label: 'Users', icon: 'users' }, { to: '/admin/analytics', label: 'Analytics', icon: 'chart' });
  items.push({ section: 'Public' }, { to: '/', label: 'Home', icon: 'home', end: true }, { to: '/incidents', label: 'Public Incidents', icon: 'globe', end: true });
  return items;
}

// ---------- HELPERS ----------

// shared sign out used by the navbar and the sidebar
function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  return () => {
    // go home first, otherwise ProtectedRoute would send us to Sign In when the token disappears
    navigate('/', { replace: true });
    setTimeout(() => {
      signOut();
      notify('You have been signed out.');
    }, 0);
  };
}

// banner only shown in the demo build, with a button to reset the demo data
function DemoBanner() {
  if (!DEMO_MODE) return null;
  const reset = async () => {
    const { resetDemoData } = await import('../services/demo/mockServer.js');
    resetDemoData();
    window.location.reload();
  };
  return (
    <div className="demo-banner">
      <span>Live demo: data is stored only in this browser, no real backend is connected.</span>
      <button type="button" onClick={reset}>Reset demo data</button>
    </div>
  );
}

// ---------- PUBLIC NAVBAR ----------

// top navbar for public pages, changes once you are signed in
export function PublicNavbar() {
  const { isAuthenticated, user } = useAuth();

  // mobile menu open or closed
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const signOut = useSignOut();

  // close the mobile menu when the page changes
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className={`public-nav ${open ? 'open' : ''}`}>
      <nav className="public-nav-inner" aria-label="Main navigation">
        <Brand subtitle={null} />
        <div className="public-links">
          {/* NavLink adds the "active" class to the current page (end = exact match) */}
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/incidents" end>Public Incidents</NavLink>
          {isAuthenticated && <NavLink to="/dashboard">Dashboard</NavLink>}
          {isAuthenticated && user.role === 'admin' && <NavLink to="/admin/users">Users</NavLink>}
        </div>
        <div className="public-actions">
          {/* signed in: My Profile + Sign Out, signed out: Sign In + Sign Up */}
          {isAuthenticated ? (
            <>
              <NavLink to="/profile" className="navlink hide-sm">My Profile</NavLink>
              <button type="button" className="btn btn-on-dark btn-sm hide-sm" onClick={signOut}>Sign Out</button>
            </>
          ) : (
            <>
              <NavLink to="/signin" className="navlink hide-sm">Sign In</NavLink>
              <Link to="/signup" className="btn btn-accent btn-sm hide-sm">Sign Up</Link>
            </>
          )}
          {/* hamburger button, only visible on phones */}
          <button type="button" className="menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </nav>
    </header>
  );
} // end PublicNavbar

// layout for public pages, Outlet is where the page goes
export function PublicLayout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <DemoBanner />
      <PublicNavbar />
      <main id="main"><Outlet /></main>
    </>
  );
}

// ---------- SIDEBAR ----------

// dark sidebar for signed in pages
function Sidebar({ open, onNavigate }) {
  const { user } = useAuth();
  const { unread } = useNotifications();
  const signOut = useSignOut();
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Application navigation">
      <Brand to="/dashboard" />
      <nav style={{ overflowY: 'auto', flex: 1 }}>
        {/* section headings and links, Notifications shows the unread count */}
        {navItemsFor(user.role).map((item, idx) =>
          item.section ? (
            <div key={`s${idx}`} className="nav-section">{item.section}</div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end ?? item.to === '/incidents/new'} className="side-link" onClick={onNavigate}>
              <Icon name={item.icon} />
              {item.label}
              {item.badge && unread > 0 && <span className="count" aria-label={`${unread} unread`}>{unread}</span>}
            </NavLink>
          )
        )}
      </nav>
      {/* profile link, sign out and the team logo at the bottom */}
      <div className="sidebar-footer">
        <NavLink to="/profile" className="user-chip" onClick={onNavigate}>
          <span className="avatar" aria-hidden="true">{initials(user)}</span>
          <span>
            My Profile
            <small>{fullName(user)} · {roleLabel(user.role)}</small>
          </span>
        </NavLink>
        <button type="button" className="side-link signout-btn" onClick={signOut}>
          <Icon name="logout" /> Sign Out
        </button>
        <div className="sidebar-team"><TeamLogo /> <span>Built by Web Team Six</span></div>
      </div>
    </aside>
  );
} // end Sidebar

// page names for the breadcrumb in the top bar
const TITLES = [
  ['/dashboard', 'Dashboard'], ['/my-incidents', 'My Incidents'], ['/incidents/new', 'Report Incident'], ['/assigned', 'Assigned Incidents'],
  ['/admin/incidents', 'Manage Incidents'], ['/admin/users', 'Users'], ['/admin/analytics', 'Analytics'], ['/notifications', 'Notifications'],
  ['/profile', 'My Profile'], ['/incidents/', 'Incident'],
];

// ---------- SIGNED IN LAYOUT ----------

export function AppLayout() {
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  // find the title for the current URL
  const crumb = TITLES.find(([p]) => location.pathname.startsWith(p))?.[1] || '';

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <DemoBanner />
      <div className="app-shell">
        {/* on small screens the sidebar slides in and the dark scrim closes it */}
        <Sidebar open={open} onNavigate={() => setOpen(false)} />
        <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
        <div className="main">
          {/* top bar: menu button (phones), breadcrumb, Report button and the bell */}
          <header className="topbar">
            <button type="button" className="icon-btn mobile-only" aria-label="Open navigation" onClick={() => setOpen(true)}><Icon name="menu" /></button>
            <span className="crumb">IncidentFlow / <strong style={{ color: 'var(--navy-950)' }}>{crumb}</strong></span>
            <span className="topbar-spacer" />
            <Link to="/incidents/new" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> <span>Report</span></Link>
            <Link to="/notifications" className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} data-testid="notification-bell">
              <Icon name="bell" />
              {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
            </Link>
          </header>
          <main id="main" className="content"><Outlet /></main>
        </div>
      </div>
    </>
  );
} // end AppLayout

// ---------- ROUTE GUARDS ----------

// signed out users get sent to Sign In, and we remember where they were going
export function ProtectedRoute({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (checking) return <PageLoader />;
  return children;
}

// shows "Access restricted" if your role is not allowed on this page
// this is just for the UI, the API sends 403 anyway
export function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}>
        <div className="state state-error">
          <div className="state-icon"><Icon name="lock" /></div>
          <h3>Access restricted</h3>
          <p>This page is only available to {roles.map(roleLabel).join(' and ')} accounts.</p>
          <Link to="/dashboard" className="btn btn-secondary btn-sm mt-2">Back to dashboard</Link>
        </div>
      </div>
    );
  }
  return children;
}
