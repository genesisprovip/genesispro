import React, { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { api } from '@/services/api';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  plan?: string;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    console.log('Initializing auth...');
    try {
      await api.init();
      if (api.isAuthenticated()) {
        await refreshProfile();
      }
    } catch (error) {
      console.log('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeUser = (userData: any): User => {
    return {
      ...userData,
      plan: userData.plan_actual || userData.plan || 'basico',
      has_subscription: userData.has_subscription || false,
      estado_cuenta: userData.estado_cuenta || 'trial',
    };
  };

  const refreshProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.success) {
        setUser(normalizeUser(response.data.user));
      }
    } catch (error) {
      console.log('Error refreshing profile:', error);
      await api.clearTokens();
      setUser(null);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    setIsLoading(true);

    try {
      const response = await api.login(email, password);

      if (response.success) {
        setUser(normalizeUser(response.data.user));
        console.log('Login successful');
        return { success: true };
      } else {
        return { success: false, error: 'Error de autenticación' };
      }
    } catch (error: any) {
      console.log('Login error:', error);
      return { success: false, error: error.message || 'Credenciales inválidas' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    console.log('Attempting registration for:', data.email);
    setIsLoading(true);

    try {
      const response = await api.register(data);

      if (response.success) {
        setUser(normalizeUser(response.data.user));
        console.log('Registration successful');
        return { success: true };
      } else {
        return { success: false, error: 'Error en el registro' };
      }
    } catch (error: any) {
      console.log('Registration error:', error);
      return { success: false, error: error.message || 'Error en el registro' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('Logging out...');
    try {
      await api.logout();
      setUser(null);
      console.log('Logout successful');
    } catch (error) {
      console.log('Logout error:', error);
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    refreshProfile,
  };
});
