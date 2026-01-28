/**
 * Auth Context - Manages authentication state throughout the app
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, getAuthToken, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authApi.me();
          setUser(userData.user || userData);
        } catch (err) {
          // Token invalid or expired
          setAuthToken(null);
          setError(err.message);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const result = await authApi.login(credentials);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (data) => {
    setError(null);
    try {
      const result = await authApi.register(data);
      if (result.token) {
        setAuthToken(result.token);
        setUser(result.user);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
