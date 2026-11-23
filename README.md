# IncidentFlow

**Report. Track. Resolve.** IncidentFlow is a MERN incident management platform for reporting, assigning, resolving and auditing operational incidents. Built by **Web Team Six**.

> This repository is a working reference build of the *IncidentFlow Master Product Blueprint v1.1*. Every page, role, API route and workflow in the blueprint is implemented. See [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) for the requirement-by-requirement map.

## Team

| Member | Project role |
| --- | --- |
| Ivan Seck Ali | To be confirmed by team |
| Robel Teffera | To be confirmed by team |
| Ryan Sunil | To be confirmed by team |
| Bronson Pearl | To be confirmed by team |

## Technology stack

- **Frontend:** React 18, React Router 6, Vite 5, Recharts (analytics, lazy-loaded), Inter font, hand-written CSS design system
- **Backend:** Node.js 20+, Express 4, Mongoose 8, JWT (`jsonwebtoken`), bcrypt password hashing, Helmet, CORS, rate limiting, Multer uploads
- **Database:** MongoDB Atlas (production), any MongoDB 6+ locally
- **Testing:** Node test runner + Supertest + mongodb-memory-server (API), Vitest + Testing Library (components), Cypress (E2E)
- **CI/CD:** GitHub Actions (tests + build on every PR), Render auto-deploy from `main`

## Features

- Public landing page with live public incident snapshot and team branding
- Sign up / sign in with JWT, hashed passwords, deactivated-account handling
- Three roles (**User, Technician, Admin**) with a server-enforced permission matrix (`shared/incidentPolicy.js`)
- Full CRUD for users and incidents, search / filter / sort, role-aware navigation with active-page state
- Incident lifecycle: Open → Assigned → In Progress ⇄ On Hold → Resolved → Closed (admins can reopen)
- Technician assignment, comments, attachments (JPG/PNG/PDF ≤ 5 MB), activity / audit timeline
- In-app notifications with unread badge, mark read and mark all read
- Automatic escalation of Critical incidents plus manual admin escalation
- Admin analytics from live data: status, priority, category, created vs resolved trend, resolution time, technician workload
- Loading, empty, validation, 401/403/404 and server-error states on every page; responsive down to phones (tables become cards)

## Project structure

```
incidentflow/
├── client/                 React + Vite app
│   └── src/{assets,components,context,hooks,pages,services,utils}
├── server/
│   ├── controllers/        auth, users, incidents, comments/attachments/notifications, analytics
│   ├── middleware/         auth (JWT + roles), errors/validation, uploads
│   ├── models/             User, Incident, Comment, Activity, Notification, Attachment, Counter
│   ├── routes/             all /api routes
│   ├── services/           incident numbers, activity log, notifications
│   ├── utils/              response envelope helpers, seed script
│   └── express.js          builds the Express app
├── shared/                 constants, validation, permission policy, query/analytics helpers
│                           (imported by BOTH the API and React so rules never drift)
├── config/config.js        environment configuration
├── tests/                  API unit + integration tests
├── cypress/e2e/            end-to-end tests
├── server.js               entry point: connect MongoDB, start Express
└── .env.example
```

> **Design decision:** the `shared/` folder is the one addition to the blueprint's suggested structure. Validation rules and the permission matrix live there once and are used by the API (authoritative) and the UI (to show/hide controls).

## Prerequisites

- Node.js 20 or newer
- A MongoDB connection string (MongoDB Atlas free tier works, or local `mongod`)

## Installation

```bash
git clone <repo-url> incidentflow
cd incidentflow
npm install                 # API dependencies (set CYPRESS_INSTALL_BINARY=0 to skip the Cypress download)
npm --prefix client install # React dependencies
cp .env.example .env        # then fill in MONGODB_URI, JWT_SECRET and SEED_DEMO_PASSWORD
npm run seed                # optional: loads demo users and incidents
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing tokens (required in production) |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS, comma separated |
| `UPLOAD_DIR` | Folder for uploaded files (outside the repo) |
| `SEED_DEMO_PASSWORD` | Password given to seeded demo accounts |
| `client/.env: VITE_API_URL` | Only when the API is hosted on a different origin |

Real values go in `.env`, which is git-ignored. Never commit secrets.

## Development

```bash
npm run dev        # API on :5000 (auto-restart) + React on :5173 (proxies /api)
```

Open http://localhost:5173. After `npm run seed`, sign in with `alex.morgan@incidentflow.demo` (admin), `jordan.lee@incidentflow.demo` (technician) or `taylor.chen@incidentflow.demo` (user) using your `SEED_DEMO_PASSWORD`.

## Production build

```bash
npm run build      # builds client/dist
NODE_ENV=production npm start   # Express serves the API and the React build on one port
```

## Testing

```bash
npm run test:unit      # policy / validation / analytics unit tests (no database)
npm run test:server    # unit + API integration tests against an in-memory MongoDB
npm run test:client    # Vitest component tests
npm test               # everything above
CYPRESS_DEMO_PASSWORD=<seed password> npm run cypress:run   # E2E (needs npm run dev + seed)
```

## Deployment (Render + MongoDB Atlas)

1. Create an Atlas cluster, a database user, and allow Render's outbound IPs (or `0.0.0.0/0` for coursework).
2. On Render choose **New → Blueprint** and point it at this repo; `render.yaml` defines the service.
3. Set `MONGODB_URI` and `CLIENT_URL` (your Render URL) in the Render dashboard. `JWT_SECRET` is generated.
4. Run the seed once from your machine against the Atlas URI if you want demo data.
5. Every merge to `main` redeploys automatically, which is what the CI/CD before/after verification uses.

Deployment URL: `<add after first deploy>`

## Static demo build

`npm --prefix client run build:demo` produces `client/dist-demo`, a self-contained preview that runs entirely in the browser using an in-memory copy of the API rules (`client/src/services/demo/mockServer.js`). It is for sharing the UI only. It is **not** the production system and is never included in the normal build.

## Performance review (REQ-013)

Measured with `vite build`, same machine and command before and after.

| | Initial JavaScript | gzip |
| --- | --- | --- |
| Before: all pages in one bundle | 687.7 kB | 194.8 kB |
| After: admin pages + Recharts lazy-loaded with `React.lazy` | 263.1 kB | 80.3 kB |

Result: **59% less JavaScript** to download before the first page renders for every user. Analytics (418 kB, mostly Recharts) loads only when an admin opens it. Database side: compound indexes on `createdBy`, `assignedTo + status` and `status + priority + createdAt` back the list queries. Re-run your own Lighthouse before/after captures for the official evidence.

## Deferred (Tier 3)

2FA, OAuth, email/SMS notifications, maps and Socket.IO real-time updates are not implemented, per the blueprint's rule that Tier 3 must never destabilize the core release. The notification bell polls every 30 seconds instead.
# Comp229-WebTeam6-IncidentFlow
