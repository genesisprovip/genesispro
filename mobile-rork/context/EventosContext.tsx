import React, { useState, useCallback, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './AuthContext';
import { useAves } from './AvesContext';
import { useCombates } from './CombatesContext';
import { useSalud } from './SaludContext';

export interface Evento {
  id: string;
  tipo: 'combate' | 'vacuna' | 'nacimiento' | 'venta' | 'tratamiento' | 'otro';
  titulo: string;
  descripcion?: string;
  fecha: string;
  ave_id?: string;
  ave_codigo?: string;
  datos?: any;
  color: string;
}

interface EventosPorFecha {
  [fecha: string]: Evento[];
}

interface EventosState {
  eventos: Evento[];
  eventosPorFecha: EventosPorFecha;
  fechasConEventos: string[];
  isLoading: boolean;
  getEventosByFecha: (fecha: string) => Evento[];
  getEventosByMes: (year: number, month: number) => EventosPorFecha;
  refreshEventos: () => void;
}

export const [EventosProvider, useEventos] = createContextHook<EventosState>(() => {
  const { isAuthenticated } = useAuth();
  const { aves } = useAves();
  const { combates } = useCombates();
  const { registros: registrosSalud } = useSalud();
  const [isLoading, setIsLoading] = useState(false);

  // Generar eventos a partir de los datos existentes
  const eventos = useMemo(() => {
    const eventosGenerados: Evento[] = [];

    // Eventos de combates
    combates.forEach(combate => {
      const ave = aves.find(a => a.id === combate.ave_id || a.id === combate.macho_id);
      eventosGenerados.push({
        id: `combate-${combate.id}`,
        tipo: 'combate',
        titulo: combate.resultado === 'victoria' ? 'Victoria en combate' :
                combate.resultado === 'derrota' ? 'Derrota en combate' : 'Combate',
        descripcion: `${ave?.codigo_identidad || 'Ave'} en ${combate.lugar}`,
        fecha: combate.fecha,
        ave_id: combate.ave_id || combate.macho_id,
        ave_codigo: ave?.codigo_identidad,
        datos: combate,
        color: combate.resultado === 'victoria' ? '#4CAF50' :
               combate.resultado === 'derrota' ? '#F44336' : '#FF9800',
      });
    });

    // Eventos de nacimientos (aves)
    aves.forEach(ave => {
      if (ave.fecha_nacimiento) {
        eventosGenerados.push({
          id: `nacimiento-${ave.id}`,
          tipo: 'nacimiento',
          titulo: 'Nacimiento',
          descripcion: `${ave.codigo_identidad} - ${ave.sexo === 'M' ? 'Macho' : 'Hembra'}`,
          fecha: ave.fecha_nacimiento,
          ave_id: ave.id,
          ave_codigo: ave.codigo_identidad,
          datos: ave,
          color: '#2196F3',
        });
      }
    });

    // Eventos de ventas
    aves.filter(a => a.estado === 'vendido').forEach(ave => {
      eventosGenerados.push({
        id: `venta-${ave.id}`,
        tipo: 'venta',
        titulo: 'Ave vendida',
        descripcion: `${ave.codigo_identidad} - $${ave.precio_venta || 'N/A'}`,
        fecha: ave.updated_at?.split('T')[0] || ave.created_at?.split('T')[0] || '',
        ave_id: ave.id,
        ave_codigo: ave.codigo_identidad,
        datos: ave,
        color: '#9C27B0',
      });
    });

    // Eventos de salud (vacunas, tratamientos, etc.)
    registrosSalud.forEach(registro => {
      const ave = aves.find(a => a.id === registro.ave_id);
      const colorMap: Record<string, string> = {
        vacuna: '#4CAF50',
        tratamiento: '#2196F3',
        enfermedad: '#F44336',
        revision: '#9C27B0',
        desparasitacion: '#FF9800',
      };
      eventosGenerados.push({
        id: `salud-${registro.id}`,
        tipo: registro.tipo === 'vacuna' ? 'vacuna' :
              registro.tipo === 'tratamiento' ? 'tratamiento' : 'otro',
        titulo: registro.nombre,
        descripcion: `${ave?.codigo_identidad || 'Ave'} - ${registro.tipo}`,
        fecha: registro.fecha,
        ave_id: registro.ave_id,
        ave_codigo: ave?.codigo_identidad,
        datos: registro,
        color: colorMap[registro.tipo] || '#9E9E9E',
      });
    });

    // Ordenar por fecha
    return eventosGenerados.sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [aves, combates, registrosSalud]);

  // Agrupar eventos por fecha
  const eventosPorFecha = useMemo(() => {
    const grouped: EventosPorFecha = {};
    eventos.forEach(evento => {
      const fecha = evento.fecha.split('T')[0];
      if (!grouped[fecha]) {
        grouped[fecha] = [];
      }
      grouped[fecha].push(evento);
    });
    return grouped;
  }, [eventos]);

  // Lista de fechas que tienen eventos
  const fechasConEventos = useMemo(() => {
    return Object.keys(eventosPorFecha);
  }, [eventosPorFecha]);

  const getEventosByFecha = useCallback((fecha: string) => {
    return eventosPorFecha[fecha] || [];
  }, [eventosPorFecha]);

  const getEventosByMes = useCallback((year: number, month: number) => {
    const mesStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const eventosDelMes: EventosPorFecha = {};

    Object.keys(eventosPorFecha).forEach(fecha => {
      if (fecha.startsWith(mesStr)) {
        eventosDelMes[fecha] = eventosPorFecha[fecha];
      }
    });

    return eventosDelMes;
  }, [eventosPorFecha]);

  const refreshEventos = useCallback(() => {
    // Los eventos se regeneran automáticamente cuando cambian aves o combates
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 100);
  }, []);

  return {
    eventos,
    eventosPorFecha,
    fechasConEventos,
    isLoading,
    getEventosByFecha,
    getEventosByMes,
    refreshEventos,
  };
});
