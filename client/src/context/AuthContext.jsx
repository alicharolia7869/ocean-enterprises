import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ocean_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ocean_token'));
  const [loading, setLoading] = useState(true);

  const login = async (emailOrPhone, password) => {
    const res = await api.login(emailOrPhone, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('ocean_token', res.token);
    localStorage.setItem('ocean_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ocean_token');
    localStorage.removeItem('ocean_user');
  };

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('ocean_user', JSON.stringify(res.user));
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          logout();
        }
      }
      setLoading(false);
    }

    const handleAuthChange = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('ocean_auth_change', handleAuthChange);
    checkAuth();

    return () => window.removeEventListener('ocean_auth_change', handleAuthChange);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
