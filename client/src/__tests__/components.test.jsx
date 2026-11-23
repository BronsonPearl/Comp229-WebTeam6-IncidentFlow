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

// Vitest + Testing Library (renders components in a fake browser)
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// the code being tested
import { PRIORITIES, STATUSES } from '@shared/constants.js';
import { filterIncidents, sortIncidents } from '@shared/incidentQuery.js';
import { PriorityBadge, StatusBadge, priorityClass, statusClass } from '../components/Badges.jsx';
import { IncidentForm } from '../components/incidents.jsx';
import { PublicNavbar, navItemsFor } from '../components/Layout.jsx';
import { SignIn } from '../pages/Auth.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';

// ---------- HELPER ----------

// renders a component with a fake signed in (or signed out) user
// vi.fn() makes empty functions we do not care about here
function withAuth(ui, user = null) {
  const value = { user, token: user ? 't' : null, isAuthenticated: !!user, checking: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() };
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

// ---------- SIGN IN ----------

describe('Sign In form', () => {
  test('renders expected fields and validates required input', async () => {
    withAuth(<SignIn />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // submit empty, both required messages should show
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });
});

// ---------- INCIDENT FORM ----------

describe('Incident form', () => {
  // empty form should show errors and never call onSubmit
  test('rejects missing required fields and does not submit', async () => {
    const onSubmit = vi.fn();
    render(<IncidentForm onSubmit={onSubmit} submitLabel="Submit incident" />);
    await userEvent.click(screen.getByRole('button', { name: /submit incident/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Choose a valid category.')).toBeInTheDocument();
    expect(screen.getByText('Location is required.')).toBeInTheDocument();
  });

  // fill in every field like a user would, then onSubmit should get the data
  test('submits valid data', async () => {
    const onSubmit = vi.fn();
    render(<IncidentForm onSubmit={onSubmit} submitLabel="Submit incident" />);
    await userEvent.type(screen.getByLabelText(/title/i), 'Projector displays no signal');
    await userEvent.type(screen.getByLabelText(/description/i), 'Shows no signal with two different laptops.');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Equipment');
    await userEvent.type(screen.getByLabelText(/location/i), 'Room C210');
    await userEvent.click(screen.getByRole('button', { name: /submit incident/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Projector displays no signal', category: 'Equipment', priority: 'Medium' }), []);
  });
});

// ---------- NAVIGATION ----------

describe('Navigation', () => {
  test('signed out shows Sign In / Sign Up', () => {
    withAuth(<PublicNavbar />);
    expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
  });

  // admin should see Users, My Profile and Sign Out
  test('signed in admin sees Users, My Profile and Sign Out', () => {
    withAuth(<PublicNavbar />, { _id: '1', firstName: 'Alex', lastName: 'Morgan', role: 'admin' });
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument();
  });

  test('normal user does not see Users link; sidebar items depend on role', () => {
    withAuth(<PublicNavbar />, { _id: '2', firstName: 'Taylor', lastName: 'Chen', role: 'user' });
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();

    // check the sidebar links for each role
    const labels = (role) => navItemsFor(role).map((i) => i.label).filter(Boolean);
    expect(labels('user')).not.toContain('Users');
    expect(labels('technician')).toContain('Assigned Incidents');
    expect(labels('admin')).toEqual(expect.arrayContaining(['Users', 'Analytics', 'Manage Incidents']));
  });
});

// ---------- BADGES ----------

describe('Badges', () => {
  test('StatusBadge maps every status to a visible label and class', () => {
    // every status should show its text and the right CSS class
    STATUSES.forEach((s) => {
      const { unmount } = render(<StatusBadge status={s} />);
      const el = screen.getByTestId('status-badge');
      expect(el).toHaveTextContent(s);
      expect(el).toHaveClass(statusClass(s));
      unmount();
    });
    expect(statusClass('In Progress')).toBe('status-in-progress');
  });

  test('PriorityBadge maps every priority to a visible label and class', () => {
    PRIORITIES.forEach((p) => {
      const { unmount } = render(<PriorityBadge priority={p} />);
      const el = screen.getByTestId('priority-badge');
      expect(el).toHaveTextContent(p);
      expect(el).toHaveClass(priorityClass(p));
      unmount();
    });
  });
});

// ---------- FILTER / SEARCH ----------

describe('Incident filter / search utility', () => {
  const list = [
    { _id: '1', incidentNumber: 'INC-000001', title: 'Wi-Fi unavailable', location: 'Lab 4', category: 'IT', priority: 'High', status: 'Open', createdAt: '2026-11-01' },
    { _id: '2', incidentNumber: 'INC-000002', title: 'Water leak', location: 'Building B', category: 'Facilities', priority: 'Critical', status: 'Assigned', createdAt: '2026-11-02' },
    { _id: '3', incidentNumber: 'INC-000003', title: 'Projector', location: 'Room C210', category: 'Equipment', priority: 'Medium', status: 'Resolved', createdAt: '2026-11-03' },
  ];

  // search, filters and sorting should return the right incidents in the right order
  test('returns expected records', () => {
    expect(filterIncidents(list, { q: 'lab 4' }).map((i) => i._id)).toEqual(['1']);
    expect(filterIncidents(list, { q: 'INC-000003' }).map((i) => i._id)).toEqual(['3']);
    expect(filterIncidents(list, { status: 'Assigned', priority: 'Critical' })).toHaveLength(1);
    expect(filterIncidents(list, { category: 'Safety' })).toHaveLength(0);
    expect(sortIncidents(list, 'priority').map((i) => i._id)).toEqual(['2', '1', '3']);
    expect(sortIncidents(list, 'newest')[0]._id).toBe('3');
  });
});
