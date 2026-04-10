import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { AuthContext } from './authContext';

const STORAGE_USER = 'mpb_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/auth/me');
        if (!cancelled) {
          setUser(data.user);
          localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem('token');
          localStorage.removeItem(STORAGE_USER);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(STORAGE_USER);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
