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

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/index.js';
import { storage, AUTH_KEY } from '../utils/storage.js';

// the context object, null until the provider sets it
const AuthContext = createContext(null);

// ---------- PROVIDER ----------

export function AuthProvider({ children }) {
  // start with whatever was saved last time { token, user }
  const [auth, setAuth] = useState(() => storage.getJSON(AUTH_KEY));

  // true while we check a saved token with the server
  const [checking, setChecking] = useState(Boolean(auth?.token));

  // save to state and localStorage together (null = signed out)
  const persist = useCallback((next) => {
    if (next) storage.setJSON(AUTH_KEY, next);
    else storage.remove(AUTH_KEY);
    setAuth(next);
  }, []);

  // calls the API, saves the token, returns the user so the page can say hi
  const signIn = useCallback(
    async (credentials) => {
      const res = await authService.signIn(credentials);
      persist({ token: res.data.token, user: res.data.user });
      return res.data.user;
    },
    [persist]
  );

  // clearing the saved auth is all signing out needs
  const signOut = useCallback(() => persist(null), [persist]);

  // after editing your profile, update the saved user so the sidebar shows the new name
  const updateUser = useCallback((user) => setAuth((prev) => {
    const next = prev ? { ...prev, user: { ...prev.user, ...user } } : prev;
    if (next) storage.setJSON(AUTH_KEY, next);
    return next;
  }), []);

  useEffect(() => {
    // once when the app opens: ask the server who we are
    // (our role or active status could have changed since last time)
    if (!auth?.token) return;
    authService
      .me()
      .then((res) => updateUser(res.data.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    // api.js fires this event on any 401, so we sign out
    const handler = () => persist(null);
    window.addEventListener('incidentflow:unauthorized', handler);
    return () => window.removeEventListener('incidentflow:unauthorized', handler);
  }, [persist]);

  // useMemo so components only re-render when something actually changes
  const value = useMemo(
    () => ({ user: auth?.user || null, token: auth?.token || null, isAuthenticated: Boolean(auth?.token), checking, signIn, signOut, updateUser }),
    [auth, checking, signIn, signOut, updateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} // end AuthProvider

// ---------- HOOK ----------

// const { user, signIn } = useAuth() in any component
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export { AuthContext };
