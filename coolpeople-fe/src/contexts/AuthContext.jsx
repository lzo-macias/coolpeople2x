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
          const result = await authApi.me();
          // API returns {success: true, data: {user}} or {user}
          const userData = result.data?.user || result.user || result;
          setUser(userData);
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
      // API returns {success: true, data: {user, token}}
      const userData = result.data?.user || result.user;
      console.log('Login result:', result);
      console.log('Setting user:', userData);
      setUser(userData);
      return result;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      throw err;
    }
  };

  const register = async (data) => {
    setError(null);
    try {
      const result = await authApi.register(data);
      // Don't auto-login, let user sign in manually
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

  const loginWithGoogle = async () => {
    setError(null);
    try {
      // Initialize Google OAuth
      // For now, this will use a popup-based flow
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&response_type=code&scope=email%20profile&prompt=select_account`;
      window.location.href = googleAuthUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const loginWithApple = async () => {
    setError(null);
    try {
      // Initialize Apple Sign In
      const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${import.meta.env.VITE_APPLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&response_type=code&scope=email%20name&response_mode=form_post`;
      window.location.href = appleAuthUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    }
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
    loginWithGoogle,
    loginWithApple,
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
