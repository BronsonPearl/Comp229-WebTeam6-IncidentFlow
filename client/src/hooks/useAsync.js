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

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------- useAsync ----------

// loader = a function that returns a promise (usually an API call)
// deps = when any of these change the data is loaded again (like useEffect)
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  // so we never set state after the page was closed
  const mounted = useRef(true);

  // runs the loader and updates the state
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      if (mounted.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (mounted.current) setState({ data: null, loading: false, error });
      return null;
    }
  }, deps);

  // load when the page opens and whenever deps change
  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  // reload = load again, setData = change the data without reloading (after an edit or delete)
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) };
}

// ---------- useDebounced ----------

// returns the value only after it stops changing for 300ms
// so the search does not send a request on every key press
export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
