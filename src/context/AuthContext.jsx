import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, getAccessToken, getRefreshToken, setTokens, clearTokens } from '../api';
import { unsubscribeFromPush } from '../utils/pushNotifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const logoutPromiseRef = useRef(null);

  const loadUser = useCallback(async () => {
    if (logoutPromiseRef.current) {
      setLoading(false);
      return;
    }

    const hasToken = getAccessToken() || getRefreshToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      setUser(data.user);
      setEstablishments(data.establishments);
    } catch {
      clearTokens();
      setUser(null);
      setEstablishments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [loadUser]);

  const login = async (email, password) => {
    if (logoutPromiseRef.current) await logoutPromiseRef.current;
    const data = await api.auth.login({ email, password });
    setTokens(data.accessToken, data.refreshToken);
    await loadUser();
    return data.user;
  };

  const register = async (name, email, password) => {
    if (logoutPromiseRef.current) await logoutPromiseRef.current;
    const data = await api.auth.register({ name, email, password });
    setTokens(data.accessToken, data.refreshToken);
    await loadUser();
    return data.user;
  };

  const logout = useCallback(() => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;

    setUser(null);
    setEstablishments([]);

    const task = (async () => {
      try {
        await Promise.race([
          unsubscribeFromPush(api),
          new Promise((resolve) => window.setTimeout(resolve, 1500)),
        ]);
      } catch {
        // Logout must still complete when push or the network is unavailable.
      } finally {
        clearTokens();
      }
    })();

    logoutPromiseRef.current = task;
    task.finally(() => {
      logoutPromiseRef.current = null;
    });
    return task;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, establishments, loading, login, register, logout, reload: loadUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
