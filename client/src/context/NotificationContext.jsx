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
import { useLocation } from 'react-router-dom';
import { notificationService } from '../services/index.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext({ unread: 0, refresh: () => {} });

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();

  // the number on the bell
  const [unread, setUnread] = useState(0);

  // used to refresh when the page changes
  const location = useLocation();

  // ask the server for the unread count (signed out = 0)
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return setUnread(0);
    try {
      const res = await notificationService.list();
      setUnread(res.data.unread);

    // the bell is not important enough to show an error
    } catch {
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    // check again every 30 seconds, and stop the timer when signed out
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [isAuthenticated, refresh]);

  const value = useMemo(() => ({ unread, setUnread, refresh }), [unread, refresh]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
} // end NotificationProvider

// const { unread } = useNotifications() in any component
export const useNotifications = () => useContext(NotificationContext);
