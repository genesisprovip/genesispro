import React, { useState, useCallback, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

export interface Combate {
  id: string;
  ave_id: string;
  macho_id?: string;
  fecha: string;
  ubicacion: string;
  oponente_codigo?: string;
  peso_combate: number;
  peso_oponente?: number;
  resultado: 'victoria' | 'derrota' | 'empate' | 'pendiente' | 'cancelado';
  duracion_minutos?: number;
  tipo_victoria?: string;
  notas?: string;
  created_at: string;
  // Legacy aliases (local data may still use these)
  lugar?: string;
  oponente_info?: string;
  peso_ave?: number;
  apostado?: number;
  ganado?: number;
}

interface CombatesStats {
  total: number;
  victorias: number;
  derrotas: number;
  empates: number;
  porcentajeVictorias: number;
  roi: number;
  totalApostado: number;
  totalGanado: number;
}

interface CombatesState {
  combates: Combate[];
  stats: CombatesStats;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchCombates: (params?: { page?: number; ave_id?: string }) => Promise<void>;
  addCombate: (combate: Omit<Combate, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateCombate: (id: string, data: Partial<Combate>) => Promise<{ success: boolean; error?: string }>;
  deleteCombate: (id: string) => Promise<{ success: boolean; error?: string }>;
  getCombateById: (id: string) => Combate | undefined;
  refreshCombates: () => Promise<void>;
}

export const [CombatesProvider, useCombates] = createContextHook<CombatesState>(() => {
  const { isAuthenticated } = useAuth();
  const [combates, setCombates] = useState<Combate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const calculateStats = useCallback((combatesList: Combate[]): CombatesStats => {
    const victorias = combatesList.filter(c => c.resultado === 'victoria').length;
    const derrotas = combatesList.filter(c => c.resultado === 'derrota').length;
    const empates = combatesList.filter(c => c.resultado === 'empate').length;
    const total = combatesList.length;
    const porcentajeVictorias = total > 0 ? Math.round((victorias / total) * 100) : 0;
    const totalApostado = combatesList.reduce((acc, c) => acc + (c.apostado || 0), 0);
    const totalGanado = combatesList.reduce((acc, c) => acc + (c.ganado || 0), 0);
    const roi = totalApostado > 0 ? totalGanado - totalApostado : 0;

    return {
      total,
      victorias,
      derrotas,
      empates,
      porcentajeVictorias,
      roi,
      totalApostado,
      totalGanado,
    };
  }, []);

  const [stats, setStats] = useState<CombatesStats>({
    total: 0,
    victorias: 0,
    derrotas: 0,
    empates: 0,
    porcentajeVictorias: 0,
    roi: 0,
    totalApostado: 0,
    totalGanado: 0,
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchCombates();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setStats(calculateStats(combates));
  }, [combates, calculateStats]);

  const fetchCombates = useCallback(async (params?: { page?: number; ave_id?: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getCombates({
        page: params?.page || 1,
        limit: 50,
        ave_id: params?.ave_id,
      });

      if (response.success) {
        setCombates(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err: any) {
      console.error('Error fetching combates:', err);
      setError(err.message || 'Error al cargar los combates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCombates = useCallback(async () => {
    await fetchCombates({ page: pagination.page });
  }, [fetchCombates, pagination.page]);

  const addCombate = useCallback(async (combateData: Omit<Combate, 'id' | 'created_at'>) => {
    try {
      const response = await api.createCombate(combateData);

      if (response.success) {
        setCombates(prev => [response.data, ...prev]);
        return { success: true };
      }
      return { success: false, error: 'Error al registrar el combate' };
    } catch (err: any) {
      console.error('Error creating combate:', err);
      return { success: false, error: err.message || 'Error al registrar el combate' };
    }
  }, []);

  const updateCombate = useCallback(async (id: string, data: Partial<Combate>) => {
    try {
      const response = await api.updateCombate(id, data);

      if (response.success) {
        setCombates(prev =>
          prev.map(combate => (combate.id === id ? { ...combate, ...response.data } : combate))
        );
        return { success: true };
      }
      return { success: false, error: 'Error al actualizar el combate' };
    } catch (err: any) {
      console.error('Error updating combate:', err);
      return { success: false, error: err.message || 'Error al actualizar el combate' };
    }
  }, []);

  const deleteCombate = useCallback(async (id: string) => {
    try {
      const response = await api.deleteCombate(id);

      if (response.success) {
        setCombates(prev => prev.filter(combate => combate.id !== id));
        return { success: true };
      }
      return { success: false, error: 'Error al eliminar el combate' };
    } catch (err: any) {
      console.error('Error deleting combate:', err);
      return { success: false, error: err.message || 'Error al eliminar el combate' };
    }
  }, []);

  const getCombateById = useCallback(
    (id: string) => {
      return combates.find(combate => combate.id === id);
    },
    [combates]
  );

  return {
    combates,
    stats,
    isLoading,
    error,
    pagination,
    fetchCombates,
    addCombate,
    updateCombate,
    deleteCombate,
    getCombateById,
    refreshCombates,
  };
});
