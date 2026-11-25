import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextInstance';
import { authAPI } from '../services/api';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('shareplate_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('shareplate_token'));

  useEffect(() => {
    let isMounted = true;
    const storedToken = localStorage.getItem('shareplate_token');

    if (!storedToken) {
      return;
    }

    authAPI.getMe()
      .then((res) => {
        if (isMounted) {
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('shareplate_token');
            setUser(null);
            setToken(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          localStorage.removeItem('shareplate_token');
          setUser(null);
          setToken(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Login action
  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.token && res.user) {
      localStorage.setItem('shareplate_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error('Invalid response from server.');
  };

  // Register action
  const register = async (registrationData) => {
    const res = await authAPI.register(registrationData);
    if (res.token && res.user) {
      localStorage.setItem('shareplate_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    return res;
  };

  // Logout action
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Clean up locally regardless of server response
    } finally {
      localStorage.removeItem('shareplate_token');
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
