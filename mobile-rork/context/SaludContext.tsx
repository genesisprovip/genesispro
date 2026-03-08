import React, { useState, useCallback, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';
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

  useEffect(() => {
    loadLocalData();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistrosFromAPI();
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
      return diasDesde <= 30;
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

  const mapTipoToEndpoint = (tipo: string): string => {
    switch (tipo) {
      case 'vacuna': return 'vacunas';
      case 'tratamiento': return 'tratamientos';
      case 'desparasitacion': return 'desparasitaciones';
      case 'revision':
      case 'enfermedad':
        return 'consultas';
      default: return 'consultas';
    }
  };

  const fetchRegistrosFromAPI = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [vacunas, tratamientos, desparasitaciones, consultas] = await Promise.allSettled([
        api.getRegistrosSalud({ tipo: 'vacuna' }),
        api.getRegistrosSalud({ tipo: 'tratamiento' }),
        api.getRegistrosSalud({ tipo: 'desparasitacion' }),
        api.getRegistrosSalud({ tipo: 'consulta' }),
      ]);

      const allRegistros: RegistroSalud[] = [];

      const extract = (result: PromiseSettledResult<any>, tipo: RegistroSalud['tipo']) => {
        if (result.status === 'fulfilled' && result.value?.success && Array.isArray(result.value.data)) {
          result.value.data.forEach((item: any) => {
            allRegistros.push({
              id: item.id?.toString() || `${tipo}-${Date.now()}-${Math.random()}`,
              ave_id: item.ave_id?.toString() || '',
              tipo,
              nombre: item.nombre || item.vacuna || item.producto || item.motivo || 'Sin nombre',
              descripcion: item.descripcion || item.observaciones || '',
              fecha: item.fecha || item.fecha_aplicacion || item.created_at,
              fecha_proxima: item.fecha_proxima || item.proxima_dosis || item.proxima_aplicacion,
              veterinario: item.veterinario || '',
              medicamentos: item.medicamentos || item.producto || '',
              dosis: item.dosis || '',
              costo: item.costo || 0,
              notas: item.notas || item.observaciones || '',
              created_at: item.created_at || new Date().toISOString(),
            });
          });
        }
      };

      extract(vacunas, 'vacuna');
      extract(tratamientos, 'tratamiento');
      extract(desparasitaciones, 'desparasitacion');
      extract(consultas, 'revision');

      if (allRegistros.length > 0) {
        setRegistros(allRegistros);
        saveLocalData(allRegistros);
      }
    } catch (err: any) {
      console.error('Error fetching registros from API:', err);
      // Fall back to local data silently
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistros = useCallback(async (params?: { ave_id?: string; tipo?: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated) {
        const response = await api.getRegistrosSalud(params);
        if (response.success && Array.isArray(response.data)) {
          const mapped = response.data.map((item: any) => ({
            id: item.id?.toString(),
            ave_id: item.ave_id?.toString() || '',
            tipo: item.tipo || 'revision',
            nombre: item.nombre || item.vacuna || item.producto || 'Sin nombre',
            descripcion: item.descripcion || '',
            fecha: item.fecha || item.created_at,
            fecha_proxima: item.fecha_proxima,
            veterinario: item.veterinario || '',
            medicamentos: item.medicamentos || '',
            dosis: item.dosis || '',
            costo: item.costo || 0,
            notas: item.notas || '',
            created_at: item.created_at,
          }));
          setRegistros(mapped);
          saveLocalData(mapped);
          return;
        }
      }
      await loadLocalData();
    } catch (err: any) {
      console.error('Error fetching registros salud:', err);
      setError('Error cargando datos de salud');
      await loadLocalData();
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshRegistros = useCallback(async () => {
    if (isAuthenticated) {
      await fetchRegistrosFromAPI();
    } else {
      await loadLocalData();
    }
  }, [isAuthenticated]);

  const addRegistro = useCallback(async (registroData: Omit<RegistroSalud, 'id' | 'created_at'>) => {
    try {
      if (isAuthenticated) {
        const response = await api.createRegistroSalud({
          ...registroData,
          tipo: registroData.tipo,
        });

        if (response.success) {
          const newRegistro: RegistroSalud = {
            ...registroData,
            id: response.data.id?.toString() || `salud-${Date.now()}`,
            created_at: response.data.created_at || new Date().toISOString(),
          };

          setRegistros(prev => {
            const updated = [newRegistro, ...prev];
            saveLocalData(updated);
            return updated;
          });

          return { success: true };
        }
      }

      // Fallback: save locally
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

      // Save locally as fallback
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
    }
  }, [isAuthenticated]);

  const updateRegistro = useCallback(async (id: string, data: Partial<RegistroSalud>) => {
    try {
      if (isAuthenticated && !id.startsWith('salud-')) {
        await api.updateRegistroSalud(id, data);
      }

      setRegistros(prev => {
        const updated = prev.map(r => (r.id === id ? { ...r, ...data } : r));
        saveLocalData(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error updating registro salud:', err);
      // Still update locally
      setRegistros(prev => {
        const updated = prev.map(r => (r.id === id ? { ...r, ...data } : r));
        saveLocalData(updated);
        return updated;
      });
      return { success: true };
    }
  }, [isAuthenticated]);

  const deleteRegistro = useCallback(async (id: string) => {
    try {
      if (isAuthenticated && !id.startsWith('salud-')) {
        await api.deleteRegistroSalud(id);
      }

      setRegistros(prev => {
        const updated = prev.filter(r => r.id !== id);
        saveLocalData(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting registro salud:', err);
      // Still delete locally
      setRegistros(prev => {
        const updated = prev.filter(r => r.id !== id);
        saveLocalData(updated);
        return updated;
      });
      return { success: true };
    }
  }, [isAuthenticated]);

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
