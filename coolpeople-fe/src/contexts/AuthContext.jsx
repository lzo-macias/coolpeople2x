/**
 * Auth Context - Manages authentication state throughout the app
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, getAuthToken, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

// Normalize user data from backend - converts party object to party name string
const normalizeUser = (userData) => {
  if (!userData) return null;

  // If party is an object with name, extract the name as string
  // Keep partyId for API calls, but use party name string for display
  const normalized = { ...userData };
  if (userData.party && typeof userData.party === 'object' && userData.party.name) {
    normalized.party = userData.party.name;
    // Ensure partyId is set from the party object if not already present
    if (!normalized.partyId && userData.party.id) {
      normalized.partyId = userData.party.id;
    }
  }
  return normalized;
};

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
          setUser(normalizeUser(userData));
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
      setUser(normalizeUser(userData));
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

  // Refresh user data from server (use after party changes, profile updates, etc.)
  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const result = await authApi.me();
      const userData = result.data?.user || result.user || result;
      const normalized = normalizeUser(userData);
      setUser(normalized);
      return normalized;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      return null;
    }
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
    refreshUser,
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
