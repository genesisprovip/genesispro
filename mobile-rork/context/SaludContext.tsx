import React, { useState, useCallback, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface RegistroSalud {
  id: string;
  ave_id: string;
  tipo: 'vacuna' | 'tratamiento' | 'enfermedad' | 'revision' | 'desparasitacion';
  nombre: string;
  descripcion?: string;
  fecha: string;
  fecha_proxima?: string;
  veterinario?: string;
  medicamentos?: string;
  dosis?: string;
  costo?: number;
  notas?: string;
  created_at: string;
}

interface SaludStats {
  totalRegistros: number;
  vacunasPendientes: number;
  tratamientosActivos: number;
  ultimoRegistro?: RegistroSalud;
}

interface SaludState {
  registros: RegistroSalud[];
  stats: SaludStats;
  isLoading: boolean;
  error: string | null;
  fetchRegistros: (params?: { ave_id?: string; tipo?: string }) => Promise<void>;
  addRegistro: (registro: Omit<RegistroSalud, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateRegistro: (id: string, data: Partial<RegistroSalud>) => Promise<{ success: boolean; error?: string }>;
  deleteRegistro: (id: string) => Promise<{ success: boolean; error?: string }>;
  getRegistrosByAve: (aveId: string) => RegistroSalud[];
  getProximasVacunas: () => RegistroSalud[];
  refreshRegistros: () => Promise<void>;
}

const STORAGE_KEY = 'salud_registros';

export const [SaludProvider, useSalud] = createContextHook<SaludState>(() => {
  const { isAuthenticated } = useAuth();
  const [registros, setRegistros] = useState<RegistroSalud[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos locales al inicio
  useEffect(() => {
    loadLocalData();
  }, []);

  // Cargar datos del servidor cuando está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistros();
    }
  }, [isAuthenticated]);

  const loadLocalData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRegistros(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading local salud data:', err);
    }
  };

  const saveLocalData = async (data: RegistroSalud[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving local salud data:', err);
    }
  };

  const stats = useMemo((): SaludStats => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vacunasPendientes = registros.filter(r => {
      if (r.tipo !== 'vacuna' || !r.fecha_proxima) return false;
      const fechaProxima = new Date(r.fecha_proxima);
      return fechaProxima >= hoy;
    }).length;

    const tratamientosActivos = registros.filter(r => {
      if (r.tipo !== 'tratamiento') return false;
      const fechaRegistro = new Date(r.fecha);
      const diasDesde = Math.floor((hoy.getTime() - fechaRegistro.getTime()) / (1000 * 60 * 60 * 24));
      return diasDesde <= 30; // Tratamientos de los últimos 30 días
    }).length;

    const registrosOrdenados = [...registros].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return {
      totalRegistros: registros.length,
      vacunasPendientes,
      tratamientosActivos,
      ultimoRegistro: registrosOrdenados[0],
    };
  }, [registros]);

  const fetchRegistros = useCallback(async (params?: { ave_id?: string; tipo?: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Por ahora usar solo almacenamiento local
      // El backend tiene endpoints específicos (/salud/vacunas, /salud/tratamientos, etc.)
      // que requieren integración más compleja
      await loadLocalData();
    } catch (err: any) {
      console.error('Error fetching registros salud:', err);
      setError('Error cargando datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRegistros = useCallback(async () => {
    await fetchRegistros();
  }, [fetchRegistros]);

  const addRegistro = useCallback(async (registroData: Omit<RegistroSalud, 'id' | 'created_at'>) => {
    try {
      // Crear registro local
      const localRegistro: RegistroSalud = {
        ...registroData,
        id: `salud-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as RegistroSalud;

      setRegistros(prev => {
        const updated = [localRegistro, ...prev];
        saveLocalData(updated);
        return updated;
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error creating registro salud:', err);
      return { success: false, error: err.message || 'Error al crear el registro' };
    }
  }, []);

  const updateRegistro = useCallback(async (id: string, data: Partial<RegistroSalud>) => {
    try {
      // Actualizar localmente
      setRegistros(prev => {
        const updated = prev.map(r => (r.id === id ? { ...r, ...data } : r));
        saveLocalData(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error updating registro salud:', err);
      return { success: false, error: err.message || 'Error al actualizar el registro' };
    }
  }, []);

  const deleteRegistro = useCallback(async (id: string) => {
    try {
      // Eliminar localmente
      setRegistros(prev => {
        const updated = prev.filter(r => r.id !== id);
        saveLocalData(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting registro salud:', err);
      return { success: false, error: err.message || 'Error al eliminar el registro' };
    }
  }, []);

  const getRegistrosByAve = useCallback((aveId: string) => {
    return registros
      .filter(r => r.ave_id === aveId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [registros]);

  const getProximasVacunas = useCallback(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return registros
      .filter(r => {
        if (r.tipo !== 'vacuna' || !r.fecha_proxima) return false;
        const fechaProxima = new Date(r.fecha_proxima);
        return fechaProxima >= hoy;
      })
      .sort((a, b) => new Date(a.fecha_proxima!).getTime() - new Date(b.fecha_proxima!).getTime());
  }, [registros]);

  return {
    registros,
    stats,
    isLoading,
    error,
    fetchRegistros,
    addRegistro,
    updateRegistro,
    deleteRegistro,
    getRegistrosByAve,
    getProximasVacunas,
    refreshRegistros,
  };
});
