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

// backup storage if localStorage is not available
const memory = new Map();

// ---------- STORAGE OBJECT ----------

export const storage = {
  // read a value
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },

  // save a value
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },

  // delete a value
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },

  // read and JSON.parse, returns the fallback if missing or broken
  getJSON(key, fallback = null) {
    try {
      const raw = this.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  // JSON.stringify then save
  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },
};

// the key where we keep { token, user } after signing in
export const AUTH_KEY = 'incidentflow_auth';
