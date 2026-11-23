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

// to read the saved token
import { storage, AUTH_KEY } from '../utils/storage.js';

// true only in the demo build (set in client/.env.demo)
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// empty VITE_API_URL means same site, so requests go to /api
const BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api';

// ---------- API ERROR ----------

// error with the HTTP status and the field errors from the server
// so forms can show the message next to the right input
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

// current token, or null if signed out
const token = () => storage.getJSON(AUTH_KEY)?.token || null;

// turns { status: "Open", q: "" } into "?status=Open" (skips empty values)
function buildQuery(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

// ---------- SEND A REQUEST ----------

async function send(method, path, { body, query, file, raw } = {}) {
  const t = token();
  let status;
  let payload;

  // demo build: load the fake server only when needed and ask it instead
  if (DEMO_MODE) {
    const { handle } = await import('./demo/mockServer.js');
    ({ status, body: payload } = await handle(method, path, { body, query: query || {}, token: t, file }));
    if (raw && status < 400) return payload;

  // real build: normal fetch() to Express
  } else {
    const headers = {};
    let requestBody;

    // files are sent as form data, everything else as JSON
    if (file) {
      requestBody = new FormData();
      requestBody.append('file', file);
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    // add the token so the server knows who we are
    if (t) headers.Authorization = `Bearer ${t}`;
    let res;
    try {
      res = await fetch(BASE_URL + path + buildQuery(query), { method, headers, body: requestBody });

    // fetch only throws when the server cannot be reached at all
    } catch {
      throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
    }
    status = res.status;

    // raw = we want the file itself (attachment download)
    if (raw && res.ok) return res.blob();
    payload = await res.json().catch(() => ({ success: false, message: 'Unexpected response from the server.' }));
  }

  // anything that failed becomes an ApiError
  if (status >= 400 || payload?.success === false) {
    // our token stopped working, tell AuthContext to sign us out
    if (status === 401 && t) window.dispatchEvent(new CustomEvent('incidentflow:unauthorized'));
    throw new ApiError(status, payload?.message || 'Request failed.', payload?.errors);
  }

  // success, the page gets { success, data, message }
  return payload; // { success, data, message }
}

// ---------- SHORTCUTS ----------

// api.get("/users"), api.post("/incidents", body) etc.
export const api = {
  get: (path, query) => send('GET', path, { query }),
  post: (path, body) => send('POST', path, { body }),
  put: (path, body) => send('PUT', path, { body }),
  del: (path) => send('DELETE', path),
  upload: (path, file) => send('POST', path, { file }),
  blob: (path) => send('GET', path, { raw: true }),
};
