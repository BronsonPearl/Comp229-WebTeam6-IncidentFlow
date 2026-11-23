# Requirement traceability

Maps each blueprint requirement to where it lives in this build. Items marked **Team** are process deliverables the team produces (video, board, PDF), not code.

## Product requirements (Blueprint section 2)

| ID | Requirement | Implementation | Verification |
| --- | --- | --- | --- |
| REQ-001 | Landing page: name, team logo, records, Sign Up/In | `client/src/pages/Home.jsx` | Live public records from `GET /api/incidents` |
| REQ-002 | Navigation with current page indicated | `components/Layout.jsx` (`NavLink` active styles, public navbar + sidebar) | `__tests__/components.test.jsx` Navigation tests |
| REQ-003 | Users, My Profile, Sign Out when signed in | `PublicNavbar`, `Sidebar` in `Layout.jsx` | Navigation tests (admin vs user) |
| REQ-004 | React connected to Express CRUD API | `client/src/services/api.js`, `services/index.js` | All pages call the API; no static data in the normal build |
| REQ-005 | Full user CRUD | `server/controllers/userController.js`, `pages/Users.jsx`, `pages/Profile.jsx`, `pages/Auth.jsx` | `tests/api/api.test.js` Users suite |
| REQ-006 | Full incident CRUD | `server/controllers/incidentController.js`, `pages/IncidentForms.jsx`, `IncidentDetails.jsx`, `IncidentLists.jsx` | `tests/api/api.test.js` Incidents suite, Cypress |
| REQ-007 | GitHub + commits from every member | **Team** | Branch names in blueprint 15.2 |
| REQ-008 | Agile board | **Team** | |
| REQ-009 | Demo video | **Team** | Blueprint 19 |
| REQ-010 | Polished, error-free | `client/src/styles.css` design system, states in `components/common.jsx` | Zero console errors across all pages in demo run |
| REQ-011 | Unit tests | `client/src/__tests__/components.test.jsx`, `tests/unit/` | 9 component + 7 unit tests passing |
| REQ-012 | Cypress E2E | `cypress/e2e/report-incident.cy.js`, `admin-technician.cy.js` | **Team** records the run |
| REQ-013 | Performance before/after | Route code splitting in `App.jsx`, Mongo indexes | README "Performance review" |
| REQ-014 | Cloud deployment | `render.yaml`, Express serves `client/dist` | **Team** deploys |
| REQ-015 | Cloud database | `MONGODB_URI` → Atlas | |
| REQ-016 | CI/CD branch → merge → live | `.github/workflows/ci.yml`, Render `autoDeploy` | **Team** captures before/after |
| REQ-017 | Product Design Specification | **Team** (use screenshots from the app) | |
| REQ-018 | Organized repo, no secrets | `.gitignore`, `.env.example`, README | |
| REQ-019 | Final backlog | **Team** | |
| REQ-020 | Clean ZIP | Exclude `node_modules`, `.env`, `dist` | |

## Pages (Blueprint section 6)

| # | Page | Route | File |
| --- | --- | --- | --- |
| 6.1 | Home | `/` | `pages/Home.jsx` |
| 6.2 | Public Incidents | `/incidents` | `pages/PublicIncidents.jsx` |
| 6.3 | Sign Up | `/signup` | `pages/Auth.jsx` |
| 6.4 | Sign In | `/signin` | `pages/Auth.jsx` |
| 6.5 | User Dashboard | `/dashboard` (user) | `pages/Dashboards.jsx` |
| 6.6 | My Incidents | `/my-incidents` | `pages/IncidentLists.jsx` |
| 6.7 | Report Incident | `/incidents/new` | `pages/IncidentForms.jsx` |
| 6.8 | Incident Details | `/incidents/:id` | `pages/IncidentDetails.jsx` |
| 6.9 | Edit Incident | `/incidents/:id/edit` | `pages/IncidentForms.jsx` |
| 6.10 | My Profile | `/profile` | `pages/Profile.jsx` |
| 6.11 | Edit Profile | `/profile/edit` | `pages/Profile.jsx` |
| 6.12 | Technician Dashboard | `/dashboard` (technician) | `pages/Dashboards.jsx` |
| 6.13 | Assigned Incidents | `/assigned` | `pages/IncidentLists.jsx` |
| 6.14 | Admin Dashboard | `/dashboard` (admin) | `pages/Dashboards.jsx` |
| 6.15 | Manage Incidents | `/admin/incidents` | `pages/IncidentLists.jsx` |
| 6.16 | Manage Users | `/admin/users` | `pages/Users.jsx` |
| 6.17 | Edit User (+ New User) | `/admin/users/:id/edit`, `/admin/users/new` | `pages/Users.jsx` |
| 6.18 | Notifications | `/notifications` | `pages/Notifications.jsx` |
| 6.19 | Analytics | `/admin/analytics` | `pages/Analytics.jsx` |
| 6.20 | Security / 2FA | Deferred (Tier 3) | Password change lives in Edit Profile |

## API (Blueprint 7.1)

All routes in the blueprint table are implemented in `server/routes/index.js`. Additions, each needed by a page in the blueprint:

| Route | Why |
| --- | --- |
| `GET /api/auth/me` | Validate a stored token and refresh role/status on app load |
| `GET /api/activities/recent` | "Recent activity" on dashboards (6.5) |
| `GET /api/incidents/:id/attachments` | Show attachments on Incident Details (6.8) |
| `GET /api/attachments/:id/file` | Authorized file download (files are never public static URLs) |
| `GET /api/health` | Render health check |

## Permission decisions (where the blueprint said "limited" or "as configured")

- Reporters edit and delete their own incidents only while status is **Open**.
- Reporters may move their own **Resolved** incident to **Closed** ("request closure").
- Technicians can **view** all incidents (operational visibility) but **edit** only those assigned to them, and must follow the lifecycle. Resolving requires a resolution summary.
- Users cannot open details of other people's incidents (403). Public list shows only safe fields.
- Admins can do everything, but cannot delete themselves or remove the last active admin.
- Deleting a technician returns their *Assigned* incidents to the unassigned queue.
