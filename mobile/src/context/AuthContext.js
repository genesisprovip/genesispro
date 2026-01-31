import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const response = await authAPI.getProfile();
        setUser(response.data.data);
      }
    } catch (err) {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      const { user, tokens } = response.data.data;

      await SecureStore.setItemAsync('accessToken', tokens.access_token);
      await SecureStore.setItemAsync('refreshToken', tokens.refresh_token);

      setUser(user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Error al iniciar sesión';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (data) => {
    try {
      setError(null);
      const response = await authAPI.register(data);
      const { user, tokens } = response.data.data;

      await SecureStore.setItemAsync('accessToken', tokens.access_token);
      await SecureStore.setItemAsync('refreshToken', tokens.refresh_token);

      setUser(user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Error al registrarse';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
