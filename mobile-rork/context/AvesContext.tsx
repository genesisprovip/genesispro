import React, { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Ave } from '@/types';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

interface AvesState {
  aves: Ave[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchAves: (params?: { page?: number; sexo?: string; estado?: string }) => Promise<void>;
  addAve: (ave: Omit<Ave, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string; data?: any }>;
  updateAve: (id: string, data: Partial<Ave>) => Promise<{ success: boolean; error?: string }>;
  deleteAve: (id: string) => Promise<{ success: boolean; error?: string }>;
  getAveById: (id: string) => Ave | undefined;
  refreshAves: () => Promise<void>;
}

export const [AvesProvider, useAves] = createContextHook<AvesState>(() => {
  const { isAuthenticated } = useAuth();
  const [aves, setAves] = useState<Ave[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchAves();
    }
  }, [isAuthenticated]);

  const fetchAves = useCallback(async (params?: { page?: number; sexo?: string; estado?: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getAves({
        page: params?.page || 1,
        limit: 20,
        sexo: params?.sexo,
        estado: params?.estado,
      });

      if (response.success) {
        setAves(response.data);
        setPagination(response.pagination);
      }
    } catch (err: any) {
      console.error('Error fetching aves:', err);
      setError(err.message || 'Error al cargar las aves');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAves = useCallback(async () => {
    await fetchAves({ page: pagination.page });
  }, [fetchAves, pagination.page]);

  const addAve = useCallback(async (aveData: Omit<Ave, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await api.createAve(aveData);

      if (response.success) {
        setAves(prev => [response.data, ...prev]);
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Error al crear el ave' };
    } catch (err: any) {
      console.error('Error creating ave:', err);
      return { success: false, error: err.message || 'Error al crear el ave' };
    }
  }, []);

  const updateAve = useCallback(async (id: string, data: Partial<Ave>) => {
    try {
      const response = await api.updateAve(id, data);

      if (response.success) {
        setAves(prev =>
          prev.map(ave => (ave.id === id ? { ...ave, ...response.data } : ave))
        );
        return { success: true };
      }
      return { success: false, error: 'Error al actualizar el ave' };
    } catch (err: any) {
      console.error('Error updating ave:', err);
      return { success: false, error: err.message || 'Error al actualizar el ave' };
    }
  }, []);

  const deleteAve = useCallback(async (id: string) => {
    try {
      const response = await api.deleteAve(id);

      if (response.success) {
        setAves(prev => prev.filter(ave => ave.id !== id));
        return { success: true };
      }
      return { success: false, error: 'Error al eliminar el ave' };
    } catch (err: any) {
      console.error('Error deleting ave:', err);
      return { success: false, error: err.message || 'Error al eliminar el ave' };
    }
  }, []);

  const getAveById = useCallback(
    (id: string) => {
      return aves.find(ave => ave.id === id);
    },
    [aves]
  );

  return {
    aves,
    isLoading,
    error,
    pagination,
    fetchAves,
    addAve,
    updateAve,
    deleteAve,
    getAveById,
    refreshAves,
  };
});

export function useFilteredAves(filters: {
  search?: string;
  sexo?: 'M' | 'H' | 'todos';
  estado?: string;
  disponibleVenta?: boolean;
}) {
  const { aves } = useAves();

  return useMemo(() => {
    return aves.filter(ave => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          ave.codigo_identidad.toLowerCase().includes(searchLower) ||
          ave.color?.toLowerCase().includes(searchLower) ||
          ave.linea_genetica?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.sexo && filters.sexo !== 'todos' && ave.sexo !== filters.sexo) {
        return false;
      }

      if (filters.estado && ave.estado !== filters.estado) {
        return false;
      }

      if (filters.disponibleVenta !== undefined && ave.disponible_venta !== filters.disponibleVenta) {
        return false;
      }

      return true;
    });
  }, [aves, filters.search, filters.sexo, filters.estado, filters.disponibleVenta]);
}
