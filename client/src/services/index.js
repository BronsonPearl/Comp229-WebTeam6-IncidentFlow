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

import { api } from './api.js';

// ---------- AUTH ----------

export const authService = {
  signUp: (data) => api.post('/auth/signup', data),
  signIn: (data) => api.post('/auth/signin', data),
  me: () => api.get('/auth/me'),
};

// ---------- USERS ----------

export const userService = {
  list: (query) => api.get('/users', query),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.del(`/users/${id}`),
};

// ---------- INCIDENTS ----------

export const incidentService = {
  // query has scope, search, filters and sort
  list: (query) => api.get('/incidents', query),
  get: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  remove: (id) => api.del(`/incidents/${id}`),
  activities: (id) => api.get(`/incidents/${id}/activities`),
  recentActivity: (limit = 8) => api.get('/activities/recent', { limit }),
};

// ---------- COMMENTS ----------

export const commentService = {
  list: (incidentId) => api.get(`/incidents/${incidentId}/comments`),
  add: (incidentId, message) => api.post(`/incidents/${incidentId}/comments`, { message }),
  update: (id, message) => api.put(`/comments/${id}`, { message }),
  remove: (id) => api.del(`/comments/${id}`),
};

// ---------- ATTACHMENTS ----------

export const attachmentService = {
  list: (incidentId) => api.get(`/incidents/${incidentId}/attachments`),
  upload: (incidentId, file) => api.upload(`/incidents/${incidentId}/attachments`, file),

  // gets the file as a blob so we can open it
  download: (id) => api.blob(`/attachments/${id}/file`),
  remove: (id) => api.del(`/attachments/${id}`),
};

// ---------- NOTIFICATIONS ----------

export const notificationService = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ---------- ANALYTICS ----------

export const analyticsService = {
  summary: (days = 30) => api.get('/analytics/summary', { days }),
};
