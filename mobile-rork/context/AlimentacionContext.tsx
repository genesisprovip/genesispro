import React, { useState, useCallback, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import api from '@/services/api';

export interface Alimento {
  id: string;
  nombre: string;
  tipo: 'concentrado' | 'suplemento' | 'vitamina' | 'mineral' | 'otro';
  cantidad: number;
  unidad: 'kg' | 'lb' | 'g' | 'litro' | 'unidad';
  precio_unitario?: number;
  fecha_compra?: string;
  fecha_vencimiento?: string;
  proveedor?: string;
  notas?: string;
  created_at: string;
}

export interface RegistroAlimentacion {
  id: string;
  ave_id?: string;
  alimento_id?: string;
  alimento_nombre: string;
  cantidad: number;
  unidad: string;
  fecha: string;
  hora?: string;
  tipo_comida: 'desayuno' | 'almuerzo' | 'cena' | 'suplemento' | 'otro';
  notas?: string;
  created_at: string;
}

export interface Dieta {
  id: string;
  ave_id: string;
  nombre: string;
  descripcion?: string;
  alimentos: {
    alimento_nombre: string;
    cantidad: number;
    unidad: string;
    frecuencia: string;
  }[];
  activa: boolean;
  created_at: string;
}

interface AlimentacionStats {
  totalAlimentos: number;
  alimentosBajoStock: number;
  registrosHoy: number;
  gastoMensual: number;
}

interface AlimentacionState {
  alimentos: Alimento[];
  registros: RegistroAlimentacion[];
  dietas: Dieta[];
  stats: AlimentacionStats;
  isLoading: boolean;
  error: string | null;
  // Alimentos (Inventario)
  addAlimento: (alimento: Omit<Alimento, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateAlimento: (id: string, data: Partial<Alimento>) => Promise<{ success: boolean; error?: string }>;
  deleteAlimento: (id: string) => Promise<{ success: boolean; error?: string }>;
  // Registros de alimentación
  addRegistro: (registro: Omit<RegistroAlimentacion, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  deleteRegistro: (id: string) => Promise<{ success: boolean; error?: string }>;
  getRegistrosByAve: (aveId: string) => RegistroAlimentacion[];
  getRegistrosByFecha: (fecha: string) => RegistroAlimentacion[];
  // Dietas
  addDieta: (dieta: Omit<Dieta, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateDieta: (id: string, data: Partial<Dieta>) => Promise<{ success: boolean; error?: string }>;
  deleteDieta: (id: string) => Promise<{ success: boolean; error?: string }>;
  getDietasByAve: (aveId: string) => Dieta[];
  refreshData: () => Promise<void>;
}

const STORAGE_KEYS = {
  alimentos: 'alimentacion_alimentos',
  registros: 'alimentacion_registros',
  dietas: 'alimentacion_dietas',
};

export const [AlimentacionProvider, useAlimentacion] = createContextHook<AlimentacionState>(() => {
  const { isAuthenticated } = useAuth();
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [registros, setRegistros] = useState<RegistroAlimentacion[]>([]);
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data: try API first, fallback to local
  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      if (isAuthenticated && api.isAuthenticated()) {
        // Try loading from backend API
        try {
          const [alimentosRes, registrosRes, dietasRes] = await Promise.all([
            api.getAlimentos(),
            api.getRegistrosAlimentacion({ limit: 200 }),
            api.getDietas(),
          ]);

          if (alimentosRes?.data) {
            const mapped = alimentosRes.data.map((a: any) => ({
              ...a,
              id: String(a.id),
              cantidad: Number(a.cantidad) || 0,
              precio_unitario: a.precio_unitario ? Number(a.precio_unitario) : undefined,
            }));
            setAlimentos(mapped);
            await AsyncStorage.setItem(STORAGE_KEYS.alimentos, JSON.stringify(mapped));
          }
          if (registrosRes?.data) {
            const mapped = registrosRes.data.map((r: any) => ({
              ...r,
              id: String(r.id),
              cantidad: Number(r.cantidad) || 0,
              fecha: (r.fecha || '').split('T')[0],
            }));
            setRegistros(mapped);
            await AsyncStorage.setItem(STORAGE_KEYS.registros, JSON.stringify(mapped));
          }
          if (dietasRes?.data) {
            const mapped = dietasRes.data.map((d: any) => ({
              ...d,
              id: String(d.id),
              alimentos: typeof d.alimentos === 'string' ? JSON.parse(d.alimentos) : d.alimentos || [],
            }));
            setDietas(mapped);
            await AsyncStorage.setItem(STORAGE_KEYS.dietas, JSON.stringify(mapped));
          }
          return; // API loaded successfully
        } catch {
          console.log('[alimentacion] API unavailable, falling back to local');
        }
      }

      // Fallback: load from local storage
      const [alimentosData, registrosData, dietasData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.alimentos),
        AsyncStorage.getItem(STORAGE_KEYS.registros),
        AsyncStorage.getItem(STORAGE_KEYS.dietas),
      ]);

      if (alimentosData) setAlimentos(JSON.parse(alimentosData));
      if (registrosData) setRegistros(JSON.parse(registrosData));
      if (dietasData) setDietas(JSON.parse(dietasData));
    } catch (err) {
      console.error('Error loading alimentacion data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAlimentos = async (data: Alimento[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.alimentos, JSON.stringify(data));
  };

  const saveRegistros = async (data: RegistroAlimentacion[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.registros, JSON.stringify(data));
  };

  const saveDietas = async (data: Dieta[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.dietas, JSON.stringify(data));
  };

  const stats = useMemo((): AlimentacionStats => {
    const hoy = new Date().toISOString().split('T')[0];

    const alimentosBajoStock = alimentos.filter(a => Number(a.cantidad) < 5).length;
    const registrosHoy = registros.filter(r => r.fecha === hoy).length;

    // Calcular gasto mensual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const gastoMensual = alimentos
      .filter(a => a.fecha_compra && new Date(a.fecha_compra) >= inicioMes)
      .reduce((acc, a) => acc + ((Number(a.precio_unitario) || 0) * (Number(a.cantidad) || 0)), 0);

    return {
      totalAlimentos: alimentos.length,
      alimentosBajoStock,
      registrosHoy,
      gastoMensual,
    };
  }, [alimentos, registros]);

  // ALIMENTOS (Inventario)
  const addAlimento = useCallback(async (alimentoData: Omit<Alimento, 'id' | 'created_at'>) => {
    try {
      let newAlimento: Alimento;

      if (api.isAuthenticated()) {
        try {
          const res = await api.createAlimento(alimentoData);
          if (res?.data) {
            newAlimento = { ...res.data, id: String(res.data.id) };
          } else {
            throw new Error('API error');
          }
        } catch {
          newAlimento = { ...alimentoData, id: `alimento-${Date.now()}`, created_at: new Date().toISOString() };
        }
      } else {
        newAlimento = { ...alimentoData, id: `alimento-${Date.now()}`, created_at: new Date().toISOString() };
      }

      setAlimentos(prev => {
        const updated = [newAlimento, ...prev];
        saveAlimentos(updated);
        return updated;
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateAlimento = useCallback(async (id: string, data: Partial<Alimento>) => {
    try {
      if (api.isAuthenticated() && !id.startsWith('alimento-')) {
        try { await api.updateAlimento(id, data); } catch { /* local fallback */ }
      }
      setAlimentos(prev => {
        const updated = prev.map(a => (a.id === id ? { ...a, ...data } : a));
        saveAlimentos(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteAlimento = useCallback(async (id: string) => {
    try {
      if (api.isAuthenticated() && !id.startsWith('alimento-')) {
        try { await api.deleteAlimento(id); } catch { /* local fallback */ }
      }
      setAlimentos(prev => {
        const updated = prev.filter(a => a.id !== id);
        saveAlimentos(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  // REGISTROS DE ALIMENTACIÓN
  const addRegistro = useCallback(async (registroData: Omit<RegistroAlimentacion, 'id' | 'created_at'>) => {
    try {
      let newRegistro: RegistroAlimentacion;

      if (api.isAuthenticated()) {
        try {
          const res = await api.createRegistroAlimentacion(registroData);
          if (res?.data) {
            newRegistro = { ...res.data, id: String(res.data.id), fecha: (res.data.fecha || '').split('T')[0] };
          } else {
            throw new Error('API error');
          }
        } catch {
          newRegistro = { ...registroData, id: `registro-${Date.now()}`, created_at: new Date().toISOString() };
        }
      } else {
        newRegistro = { ...registroData, id: `registro-${Date.now()}`, created_at: new Date().toISOString() };
      }

      setRegistros(prev => {
        const updated = [newRegistro, ...prev];
        saveRegistros(updated);
        return updated;
      });

      // Descontar del inventario localmente (API ya lo descuenta en el backend)
      if (registroData.alimento_id && !api.isAuthenticated()) {
        setAlimentos(prev => {
          const updated = prev.map(a => {
            if (a.id === registroData.alimento_id) {
              return { ...a, cantidad: Math.max(0, a.cantidad - registroData.cantidad) };
            }
            return a;
          });
          saveAlimentos(updated);
          return updated;
        });
      } else if (registroData.alimento_id && api.isAuthenticated()) {
        // Refresh alimentos to get updated quantity from API
        try {
          const res = await api.getAlimentos();
          if (res?.data) {
            const mapped = res.data.map((a: any) => ({ ...a, id: String(a.id) }));
            setAlimentos(mapped);
            saveAlimentos(mapped);
          }
        } catch { /* ignore */ }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteRegistro = useCallback(async (id: string) => {
    try {
      if (api.isAuthenticated() && !id.startsWith('registro-')) {
        try { await api.deleteRegistroAlimentacion(id); } catch { /* local fallback */ }
      }
      setRegistros(prev => {
        const updated = prev.filter(r => r.id !== id);
        saveRegistros(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const getRegistrosByAve = useCallback((aveId: string) => {
    return registros
      .filter(r => r.ave_id === aveId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [registros]);

  const getRegistrosByFecha = useCallback((fecha: string) => {
    return registros.filter(r => r.fecha === fecha);
  }, [registros]);

  // DIETAS
  const addDieta = useCallback(async (dietaData: Omit<Dieta, 'id' | 'created_at'>) => {
    try {
      let newDieta: Dieta;

      if (api.isAuthenticated()) {
        try {
          const res = await api.createDieta(dietaData);
          if (res?.data) {
            newDieta = {
              ...res.data,
              id: String(res.data.id),
              alimentos: typeof res.data.alimentos === 'string' ? JSON.parse(res.data.alimentos) : res.data.alimentos || [],
            };
          } else {
            throw new Error('API error');
          }
        } catch {
          newDieta = { ...dietaData, id: `dieta-${Date.now()}`, created_at: new Date().toISOString() };
        }
      } else {
        newDieta = { ...dietaData, id: `dieta-${Date.now()}`, created_at: new Date().toISOString() };
      }

      setDietas(prev => {
        const updated = [newDieta, ...prev];
        saveDietas(updated);
        return updated;
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateDieta = useCallback(async (id: string, data: Partial<Dieta>) => {
    try {
      if (api.isAuthenticated() && !id.startsWith('dieta-')) {
        try { await api.updateDieta(id, data); } catch { /* local fallback */ }
      }
      setDietas(prev => {
        const updated = prev.map(d => (d.id === id ? { ...d, ...data } : d));
        saveDietas(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteDieta = useCallback(async (id: string) => {
    try {
      if (api.isAuthenticated() && !id.startsWith('dieta-')) {
        try { await api.deleteDieta(id); } catch { /* local fallback */ }
      }
      setDietas(prev => {
        const updated = prev.filter(d => d.id !== id);
        saveDietas(updated);
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const getDietasByAve = useCallback((aveId: string) => {
    return dietas.filter(d => d.ave_id === aveId);
  }, [dietas]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [isAuthenticated]);

  return {
    alimentos,
    registros,
    dietas,
    stats,
    isLoading,
    error,
    addAlimento,
    updateAlimento,
    deleteAlimento,
    addRegistro,
    deleteRegistro,
    getRegistrosByAve,
    getRegistrosByFecha,
    addDieta,
    updateDieta,
    deleteDieta,
    getDietasByAve,
    refreshData,
  };
});
