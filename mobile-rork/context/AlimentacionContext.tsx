import React, { useState, useCallback, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

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

  // Cargar datos locales al inicio
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      setIsLoading(true);
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

    const alimentosBajoStock = alimentos.filter(a => a.cantidad < 5).length;
    const registrosHoy = registros.filter(r => r.fecha === hoy).length;

    // Calcular gasto mensual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const gastoMensual = alimentos
      .filter(a => a.fecha_compra && new Date(a.fecha_compra) >= inicioMes)
      .reduce((acc, a) => acc + ((a.precio_unitario || 0) * a.cantidad), 0);

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
      const newAlimento: Alimento = {
        ...alimentoData,
        id: `alimento-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

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
      const newRegistro: RegistroAlimentacion = {
        ...registroData,
        id: `registro-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      setRegistros(prev => {
        const updated = [newRegistro, ...prev];
        saveRegistros(updated);
        return updated;
      });

      // Descontar del inventario si hay alimento_id
      if (registroData.alimento_id) {
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
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteRegistro = useCallback(async (id: string) => {
    try {
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
      const newDieta: Dieta = {
        ...dietaData,
        id: `dieta-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

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
    await loadLocalData();
  }, []);

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
