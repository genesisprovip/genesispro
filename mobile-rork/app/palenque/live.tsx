import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
  BackHandler,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Trophy,
  Swords,
  Users,
  Eye,
  UserCheck,
  Clock,
  MapPin,
  Calendar,
  RefreshCw,
  Megaphone,
} from 'lucide-react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { api } from '@/services/api';
import LiveStreamViewer from '@/components/streaming/LiveStreamViewer';
import LiveChat from '@/components/streaming/LiveChat';
import { playFightStartSound, playResultSound, unloadSounds } from '@/utils/sounds';

type RolType = 'visitante' | 'partido' | null;

interface EventoData {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  lugar: string;
  estado: string;
  tipo_derby: string;
  total_peleas: number;
  pelea_actual: number;
  aves_por_partido: number;
  premio_campeon: number;
  costo_inscripcion: number;
}

interface PeleaData {
  id: string;
  numero_pelea: number;
  estado: string;
  resultado: string | null;
  anillo_rojo: string;
  anillo_verde: string;
  peso_rojo: number;
  peso_verde: number;
  placa_rojo: string;
  placa_verde: string;
  hora_inicio: string | null;
  duracion_minutos: number | null;
  tipo_victoria: string | null;
  numero_ronda: number | null;
  partido_rojo_nombre: string | null;
  partido_verde_nombre: string | null;
}

interface TablaData {
  nombre?: string;
  nombre_partido?: string;
  numero_partido: number;
  puntos: number;
  victorias: number;
  derrotas: number;
  tablas: number;
  es_comodin: boolean;
}

interface MiPartidoData {
  partido: {
    id: string;
    nombre: string;
    numero_partido: number;
    puntos: number;
    codigo_acceso: string;
  };
  peleas: MiPeleaData[];
  aves: any[];
}

interface MiPeleaData {
  id: string;
  numero_pelea: number;
  estado: string;
  resultado: string | null;
  mi_esquina: 'rojo' | 'verde' | null;
  mi_anillo: string;
  mi_peso: number;
  oponente_nombre: string;
  oponente_anillo: string;
  oponente_peso: number;
  anillo_rojo: string;
  anillo_verde: string;
  peso_rojo: number;
  peso_verde: number;
  placa_rojo: string;
  placa_verde: string;
}

export default function LiveEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string; eventoId?: string }>();

  // If not authenticated, skip role selection and go straight to spectator view
  const isGuest = !api.isAuthenticated();
  const [rol, setRol] = useState<RolType>(isGuest ? 'visitante' : null);
  const [partidoId, setPartidoId] = useState('');
  const [partidoIdInput, setPartidoIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evento, setEvento] = useState<EventoData | null>(null);
  const [peleas, setPeleas] = useState<PeleaData[]>([]);
  const [tabla, setTabla] = useState<TablaData[]>([]);
  const [miPartido, setMiPartido] = useState<MiPartidoData | null>(null);
  const [avisos, setAvisos] = useState<{ id: string; mensaje: string; tipo: string; created_at: string }[]>([]);
  const [eventoId, setEventoId] = useState<string | null>(params.eventoId || null);
  const [streamInfo, setStreamInfo] = useState<{
    isLive: boolean;
    hlsUrl: string;
    calidad: string;
    viewersCount: number;
  } | null>(null);

  // Keep screen awake during live event
  useKeepAwake();

  // Allow landscape rotation for video viewing
  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const isPublic = !api.isAuthenticated();

  // Breathing pulse animation for winner (must be before conditional returns)
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const currentFightForAnim = peleas.find(p => p.numero_pelea === (evento?.pelea_actual ?? -1));

  useEffect(() => {
    if (currentFightForAnim?.resultado) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [currentFightForAnim?.resultado]);

  // --- Sound notifications for fight events ---
  const previousPeleaActual = useRef<number | null>(null);
  const previousResults = useRef<Record<string, string | null>>({});

  useEffect(() => {
    // Only play sounds when event is live
    if (evento?.estado !== 'en_curso') return;

    // Detect new fight starting (pelea_actual changed)
    if (
      evento.pelea_actual != null &&
      previousPeleaActual.current != null &&
      evento.pelea_actual !== previousPeleaActual.current
    ) {
      playFightStartSound();
    }
    previousPeleaActual.current = evento.pelea_actual ?? null;

    // Detect fight result announced
    for (const pelea of peleas) {
      const prevResult = previousResults.current[pelea.id];
      if (!prevResult && pelea.resultado) {
        // Fight just got a result
        playResultSound();
        break; // one sound per refresh cycle is enough
      }
    }

    // Update tracked results
    const newResults: Record<string, string | null> = {};
    for (const pelea of peleas) {
      newResults[pelea.id] = pelea.resultado;
    }
    previousResults.current = newResults;
  }, [evento?.estado, evento?.pelea_actual, peleas]);

  // Cleanup sounds on unmount
  useEffect(() => {
    return () => {
      unloadSounds();
    };
  }, []);

  const handleBack = useCallback(() => {
    if (rol) {
      Alert.alert(
        'Salir del evento',
        '¿Seguro que deseas salir del evento en vivo?',
        [
          { text: 'Quedarme', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => router.back() },
        ]
      );
      return true; // Prevent default back
    }
    return false; // Allow default back on role selection screen
  }, [rol]);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  const loadEventByCode = useCallback(async () => {
    if (!params.code && !eventoId) return;
    setIsLoading(true);
    try {
      let id = eventoId;
      // Always try to load evento data by code if available
      if (params.code) {
        const res = await api.getEventoPorCodigo(params.code);
        if (res.success && res.data?.id) {
          id = res.data.id;
          setEventoId(id);
          setEvento(res.data);
        }
      } else if (eventoId && !evento) {
        // No code but have eventoId - load via authenticated endpoint
        try {
          const res = await api.getEvento(eventoId);
          if (res.success) setEvento(res.data);
        } catch {
          // Try public endpoint as fallback
          const pRes = await api.getEventosPublicos();
          const found = pRes.data?.find((e: any) => e.id === eventoId);
          if (found) setEvento(found);
        }
      }
      if (id) {
        await loadEventData(id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar el evento');
    } finally {
      setIsLoading(false);
    }
  }, [params.code, eventoId]);

  const loadEventData = async (id: string, codigoPartido?: string) => {
    // Load peleas and tabla
    try {
      const [peleasRes, tablaRes] = await Promise.all([
        api.getPeleasEvento(id, true).catch(() => ({ success: false, data: [] })),
        api.getTabla(id, true).catch(() => ({ success: true, data: [] })),
      ]);
      if (peleasRes.success) setPeleas(peleasRes.data || []);
      if (tablaRes.success) setTabla(tablaRes.data || []);
    } catch (err) {
      console.log('Error loading peleas/tabla:', err);
    }

    // Refresh evento data (use public endpoint as it's more reliable)
    try {
      if (params.code) {
        const evRes = await api.getEventoPorCodigo(params.code);
        if (evRes.success) setEvento(evRes.data);
      } else if (!isPublic) {
        const evRes = await api.getEvento(id);
        if (evRes.success) setEvento(evRes.data);
      }
    } catch (err) {
      console.log('Error refreshing evento:', err);
    }

    // Load avisos + stream info
    try {
      const avisosRes = await api.getAvisosEvento(id);
      if (avisosRes.success) setAvisos(avisosRes.data || []);
    } catch (err) { /* ignore */ }

    try {
      const streamRes = await api.getStreamInfo(id);
      if (streamRes.success && streamRes.data?.isLive) {
        setStreamInfo({
          isLive: true,
          hlsUrl: streamRes.data.hlsUrl,
          calidad: streamRes.data.calidad,
          viewersCount: streamRes.data.viewersCount || 0,
        });
      } else {
        setStreamInfo(null);
      }
    } catch (err) {
      // Stream not available — that's fine
      setStreamInfo(null);
    }

    // Load partido-specific data if we have a partido code
    const codigo = codigoPartido || partidoId;
    if (codigo) {
      try {
        const partidoRes = await api.getPartidoPorCodigo(id, codigo);
        if (partidoRes.success) setMiPartido(partidoRes.data);
      } catch (err) {
        console.log('Error loading partido data:', err);
      }
    }
  };

  useEffect(() => {
    loadEventByCode();
  }, []);

  // Auto-refresh every 5 seconds when event is en_curso
  useEffect(() => {
    if (evento?.estado !== 'en_curso' || !eventoId) return;
    const interval = setInterval(() => {
      loadEventData(eventoId);
    }, 5000);
    return () => clearInterval(interval);
  }, [evento?.estado, eventoId]);

  const onRefresh = async () => {
    if (!eventoId) return;
    setRefreshing(true);
    await loadEventData(eventoId);
    setRefreshing(false);
  };

  // Role selection screen
  if (!rol) {
    return (
      <LinearGradient colors={['#0F172A', '#1a2744', '#0F172A']} style={styles.container}>
        <View style={[styles.roleScreen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <View style={styles.roleHeader}>
            <Trophy size={48} color={COLORS.secondary} />
            <Text style={styles.roleTitle}>Como participas?</Text>
            <Text style={styles.roleSubtitle}>
              {params.code ? `Evento: ${params.code}` : 'Selecciona tu rol'}
            </Text>
          </View>

          <View style={styles.roleCards}>
            <TouchableOpacity
              style={[styles.roleCard, SHADOWS.md]}
              activeOpacity={0.8}
              onPress={() => setRol('partido')}
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                style={styles.roleCardGradient}
              >
                <UserCheck size={36} color={COLORS.textLight} />
                <Text style={styles.roleCardTitle}>Soy Partido</Text>
                <Text style={styles.roleCardDesc}>
                  Tengo aves registradas en este evento. Recibire alertas de mis peleas.
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, SHADOWS.md]}
              activeOpacity={0.8}
              onPress={() => {
                setRol('visitante');
                loadEventByCode();
              }}
            >
              <View style={styles.roleCardContent}>
                <Eye size={36} color={COLORS.accent} />
                <Text style={[styles.roleCardTitle, { color: COLORS.text }]}>Soy Espectador</Text>
                <Text style={[styles.roleCardDesc, { color: COLORS.textSecondary }]}>
                  Quiero ver las peleas en vivo y recibir resultados.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Partido ID input - always show when "Soy Partido" is selected and no partidoId confirmed
  if (rol === 'partido' && !partidoId.trim()) {
    return (
      <LinearGradient colors={['#0F172A', '#1a2744', '#0F172A']} style={styles.container}>
        <View style={[styles.roleScreen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={() => setRol(null)} style={styles.backBtn}>
            <ChevronLeft size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <View style={styles.roleHeader}>
            <UserCheck size={48} color={COLORS.secondary} />
            <Text style={styles.roleTitle}>Ingresa tu codigo de partido</Text>
            <Text style={styles.roleSubtitle}>
              El organizador te dio un codigo al registrarte
            </Text>
          </View>

          <TextInput
            style={styles.partidoInput}
            placeholder="Ej: K7X3NP"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={partidoIdInput}
            onChangeText={(t) => setPartidoIdInput(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
          />

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={async () => {
              const code = partidoIdInput.trim().toUpperCase();
              if (!code) {
                Alert.alert('Error', 'Ingresa tu codigo de partido');
                return;
              }
              // Validate the code against the event
              if (eventoId) {
                try {
                  const res = await api.getPartidoPorCodigo(eventoId, code);
                  if (res.success) {
                    setMiPartido(res.data);
                    setPartidoId(code);
                    loadEventData(eventoId, code);
                  } else {
                    Alert.alert('Codigo invalido', 'No se encontro un partido con ese codigo en este evento');
                  }
                } catch {
                  Alert.alert('Codigo invalido', 'Verifica tu codigo e intenta de nuevo');
                }
              } else {
                setPartidoId(code);
                loadEventByCode();
              }
            }}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmText}>Entrar al Evento</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={{ color: COLORS.textLight, marginTop: SPACING.md }}>Cargando evento...</Text>
      </View>
    );
  }

  if (!evento) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: COLORS.textLight, fontSize: 16 }}>No se encontro el evento</Text>
        <TouchableOpacity style={{ marginTop: SPACING.md }} onPress={() => router.back()}>
          <Text style={{ color: COLORS.secondary, fontWeight: '600' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main live view
  const currentFight = peleas.find(p => p.numero_pelea === evento.pelea_actual);
  const finalizadas = peleas.filter(p => p.estado === 'finalizada').length;
  const campeon = tabla.length > 0 ? tabla[0] : null;

  const getCornerGlow = (side: 'rojo' | 'verde') => {
    if (!currentFight?.resultado) return {};
    const r = currentFight.resultado;
    const isTablas = r === 'tabla' || r === 'empate';
    const isWinner = r === side;

    if (!isWinner && !isTablas) return {};

    const glowColor = isTablas ? '#F59E0B' : (side === 'rojo' ? '#EF4444' : '#10B981');

    return {
      backgroundColor: pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [`${glowColor}15`, `${glowColor}45`],
      }),
      borderWidth: 2,
      borderColor: pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [`${glowColor}30`, `${glowColor}90`],
      }),
      borderRadius: 12,
      padding: 8,
      marginHorizontal: -8,
    };
  };

  const resultColor = (r: string | null) => {
    if (r === 'rojo') return '#EF4444';
    if (r === 'verde') return '#10B981';
    return COLORS.textSecondary;
  };

  const resultLabel = (r: string | null) => {
    const labels: Record<string, string> = { rojo: 'Rojo', verde: 'Verde', tabla: 'Tablas', empate: 'Empate' };
    return r ? labels[r] || r : '-';
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.liveHeader, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.liveHeaderRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ChevronLeft size={24} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.liveEventName} numberOfLines={1}>{evento.nombre}</Text>
            <View style={styles.liveMetaRow}>
              <Text style={styles.liveMeta}>
                {new Date(evento.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </Text>
              {evento.lugar && <Text style={styles.liveMeta}> | {evento.lugar}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
            <RefreshCw size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Live status */}
        {evento.estado === 'en_curso' && currentFight ? (
          <View style={styles.livePanel}>
            {currentFight.resultado ? (
              <Text style={[styles.liveBadge, { backgroundColor: currentFight.resultado === 'rojo' ? '#EF4444' : currentFight.resultado === 'verde' ? '#10B981' : '#F59E0B' }]}>
                {currentFight.resultado === 'tabla' || currentFight.resultado === 'empate' ? 'TABLAS' : `GANA ${currentFight.resultado.toUpperCase()}`}
              </Text>
            ) : (
              <Text style={styles.liveBadge}>EN VIVO</Text>
            )}
            <Text style={styles.liveFightNum}>Pelea #{currentFight.numero_pelea}</Text>
            <View style={styles.vsRow}>
              <Animated.View style={[styles.cornerBox, getCornerGlow('rojo')]}>
                <Text style={[styles.cornerLabel, { color: '#EF4444' }]}>ROJO</Text>
                <Text style={styles.cornerAnillo}>{currentFight.placa_rojo || currentFight.anillo_rojo || '---'}</Text>
                <Text style={styles.cornerPeso}>{currentFight.peso_rojo}g</Text>
                {currentFight.resultado === 'rojo' && (
                  <Text style={styles.winnerTag}>GANADOR</Text>
                )}
              </Animated.View>
              <Text style={styles.vsText}>VS</Text>
              <Animated.View style={[styles.cornerBox, getCornerGlow('verde')]}>
                <Text style={[styles.cornerLabel, { color: '#10B981' }]}>VERDE</Text>
                <Text style={styles.cornerAnillo}>{currentFight.placa_verde || currentFight.anillo_verde || '---'}</Text>
                <Text style={styles.cornerPeso}>{currentFight.peso_verde}g</Text>
                {currentFight.resultado === 'verde' && (
                  <Text style={[styles.winnerTag, { color: '#10B981' }]}>GANADOR</Text>
                )}
              </Animated.View>
            </View>
            {(currentFight.resultado === 'tabla' || currentFight.resultado === 'empate') && (
              <Text style={styles.tablasTag}>TABLAS</Text>
            )}
            <View style={styles.liveStats}>
              <Text style={styles.liveStatText}>{finalizadas}/{peleas.length} peleas</Text>
              <Text style={styles.liveStatText}>{evento.tipo_derby || 'Derby'}</Text>
            </View>
          </View>
        ) : evento.estado === 'finalizado' && campeon ? (
          <View style={styles.livePanel}>
            <Text style={{ fontSize: 32 }}>🏆</Text>
            <Text style={[styles.liveBadge, { backgroundColor: '#F59E0B' }]}>FINALIZADO</Text>
            <Text style={[styles.liveFightNum, { color: '#F59E0B' }]}>{campeon.nombre_partido || campeon.nombre}</Text>
            <Text style={styles.liveStatText}>{campeon.puntos} pts - {campeon.victorias} victorias</Text>
          </View>
        ) : (
          <View style={styles.livePanel}>
            <Clock size={24} color={COLORS.secondary} />
            <Text style={styles.liveFightNum}>Evento Programado</Text>
            <Text style={styles.liveStatText}>Esperando inicio...</Text>
          </View>
        )}
      </LinearGradient>

      {/* Live Stream Video */}
      {streamInfo?.isLive && (
        <View style={styles.streamContainer}>
          <LiveStreamViewer
            hlsUrl={streamInfo.hlsUrl}
            isLive={streamInfo.isLive}
            viewersCount={streamInfo.viewersCount}
            calidad={streamInfo.calidad}
            userPlan={isPublic ? 'free' : 'premium'}
          />
        </View>
      )}

      {/* Current fight info bar */}
      {evento?.estado === 'en_curso' && (() => {
        const currentFight = peleas.find(p => p.numero_pelea === evento.pelea_actual);
        if (!currentFight) return null;
        const isFinished = currentFight.estado === 'finalizada';
        return (
          <View style={styles.fightInfoBar}>
            <View style={styles.fightInfoTop}>
              <Text style={styles.fightInfoLabel}>
                Pelea {currentFight.numero_pelea} de {peleas.length}
                {currentFight.numero_ronda ? ` · Ronda ${currentFight.numero_ronda}` : ''}
              </Text>
              <Text style={[styles.fightInfoStatus,
                currentFight.estado === 'en_curso' && { color: '#F59E0B' },
                isFinished && { color: COLORS.primary },
              ]}>
                {currentFight.estado === 'programada' ? 'PROXIMA' :
                 currentFight.estado === 'en_curso' ? 'EN CURSO' :
                 isFinished && currentFight.resultado === 'rojo' ? 'GANA ROJO' :
                 isFinished && currentFight.resultado === 'verde' ? 'GANA VERDE' :
                 isFinished && (currentFight.resultado === 'tabla' || currentFight.resultado === 'empate') ? 'TABLAS' : ''}
              </Text>
            </View>
            <View style={styles.fightInfoMatchup}>
              <View style={[styles.fightInfoCorner,
                isFinished && currentFight.resultado === 'rojo' && styles.fightInfoCornerWinner,
              ]}>
                {currentFight.partido_rojo_nombre && (
                  <Text style={styles.fightInfoPartido}>{currentFight.partido_rojo_nombre}</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.fightInfoDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.fightInfoAnillo}>{currentFight.anillo_rojo || 'ROJO'}</Text>
                </View>
                {currentFight.peso_rojo && <Text style={styles.fightInfoPeso}>{currentFight.peso_rojo}kg</Text>}
              </View>
              <Text style={styles.fightInfoVs}>VS</Text>
              <View style={[styles.fightInfoCorner,
                isFinished && currentFight.resultado === 'verde' && styles.fightInfoCornerWinner,
              ]}>
                {currentFight.partido_verde_nombre && (
                  <Text style={styles.fightInfoPartido}>{currentFight.partido_verde_nombre}</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.fightInfoDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.fightInfoAnillo}>{currentFight.anillo_verde || 'VERDE'}</Text>
                </View>
                {currentFight.peso_verde && <Text style={styles.fightInfoPeso}>{currentFight.peso_verde}kg</Text>}
              </View>
            </View>
          </View>
        );
      })()}

      {/* Guest registration banner */}
      {isGuest && (
        <TouchableOpacity
          style={styles.guestBanner}
          onPress={() => router.push('/register')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.guestBannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.guestBannerTitle}>Registrate gratis</Text>
              <Text style={styles.guestBannerDesc}>Acceso completo, alertas de peleas y mas</Text>
            </View>
            <ChevronLeft size={20} color={COLORS.textLight} style={{ transform: [{ rotate: '180deg' }] }} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.liveContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
        }
      >
        {/* Avisos */}
        {avisos.length > 0 && (
          <View style={[styles.section, SHADOWS.sm, { borderWidth: 1, borderColor: COLORS.warning + '40' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm }}>
              <Megaphone size={16} color={COLORS.warning} />
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: COLORS.warning }]}>Avisos</Text>
            </View>
            {avisos.map((a) => (
              <View key={a.id} style={[styles.avisoItem, a.tipo === 'urgente' && { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.avisoText}>{a.mensaje}</Text>
                <Text style={styles.avisoTime}>
                  {new Date(a.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  {a.tipo === 'urgente' ? '  URGENTE' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Mi Partido - Personalized view */}
        {rol === 'partido' && miPartido && (
          <View style={[styles.section, SHADOWS.sm, { borderWidth: 1, borderColor: COLORS.secondary + '40' }]}>
            <View style={styles.miPartidoHeader}>
              <UserCheck size={18} color={COLORS.secondary} />
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: COLORS.secondary }]}>
                {miPartido.partido.nombre}
              </Text>
              <Text style={styles.miPartidoPts}>{miPartido.partido.puntos} pts</Text>
            </View>

            {miPartido.peleas.length > 0 ? miPartido.peleas.map((p, i) => {
              const esMiVictoria = (p.mi_esquina === 'rojo' && p.resultado === 'rojo') ||
                (p.mi_esquina === 'verde' && p.resultado === 'verde');
              const esMiDerrota = (p.mi_esquina === 'rojo' && p.resultado === 'verde') ||
                (p.mi_esquina === 'verde' && p.resultado === 'rojo');
              const esTablas = p.resultado === 'tabla' || p.resultado === 'empate';
              const isCurrent = p.numero_pelea === evento?.pelea_actual && evento?.estado === 'en_curso';

              return (
                <View key={p.id} style={[
                  styles.miPeleaCard,
                  isCurrent && { borderColor: COLORS.secondary, borderWidth: 1 },
                  i < miPartido.peleas.length - 1 && { marginBottom: SPACING.sm }
                ]}>
                  <View style={styles.miPeleaTop}>
                    <Text style={styles.miPeleaNum}>Pelea #{p.numero_pelea}</Text>
                    {p.resultado ? (
                      <View style={[styles.miResultBadge, {
                        backgroundColor: esMiVictoria ? COLORS.success + '20' :
                          esMiDerrota ? COLORS.error + '20' : COLORS.warning + '20'
                      }]}>
                        <Text style={[styles.miResultText, {
                          color: esMiVictoria ? COLORS.success :
                            esMiDerrota ? COLORS.error : COLORS.warning
                        }]}>
                          {esMiVictoria ? 'Victoria' : esMiDerrota ? 'Derrota' : 'Tablas'}
                        </Text>
                      </View>
                    ) : isCurrent ? (
                      <View style={[styles.miResultBadge, { backgroundColor: COLORS.secondary + '20' }]}>
                        <Text style={[styles.miResultText, { color: COLORS.secondary }]}>EN CURSO</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12, color: COLORS.textDisabled }}>Pendiente</Text>
                    )}
                  </View>

                  <View style={styles.miPeleaVs}>
                    {/* ROJO siempre izquierda */}
                    <View style={[styles.miAveBox, {
                      borderColor: '#EF4444',
                      backgroundColor: '#EF444408'
                    }]}>
                      <Text style={[styles.miAveCorner, { color: '#EF4444' }]}>ROJO</Text>
                      <Text style={styles.miAveAnillo}>
                        {p.mi_esquina === 'rojo' ? (p.mi_anillo || '---') : (p.oponente_anillo || '---')}
                      </Text>
                      <Text style={styles.miAvePeso}>
                        {p.mi_esquina === 'rojo'
                          ? (p.mi_peso ? `${Math.round(p.mi_peso * 1000)}g` : '-')
                          : (p.oponente_peso ? `${Math.round(p.oponente_peso * 1000)}g` : '-')}
                      </Text>
                      <Text style={styles.miAveLabel}>
                        {p.mi_esquina === 'rojo' ? 'Tu ave' : (p.oponente_nombre || 'Oponente')}
                      </Text>
                    </View>

                    <Text style={styles.miVsText}>VS</Text>

                    {/* VERDE siempre derecha */}
                    <View style={[styles.miAveBox, {
                      borderColor: '#10B981',
                      backgroundColor: '#10B98108'
                    }]}>
                      <Text style={[styles.miAveCorner, { color: '#10B981' }]}>VERDE</Text>
                      <Text style={styles.miAveAnillo}>
                        {p.mi_esquina === 'verde' ? (p.mi_anillo || '---') : (p.oponente_anillo || '---')}
                      </Text>
                      <Text style={styles.miAvePeso}>
                        {p.mi_esquina === 'verde'
                          ? (p.mi_peso ? `${Math.round(p.mi_peso * 1000)}g` : '-')
                          : (p.oponente_peso ? `${Math.round(p.oponente_peso * 1000)}g` : '-')}
                      </Text>
                      <Text style={styles.miAveLabel}>
                        {p.mi_esquina === 'verde' ? 'Tu ave' : (p.oponente_nombre || 'Oponente')}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }) : (
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: SPACING.md }}>
                Aun no hay peleas asignadas
              </Text>
            )}
          </View>
        )}

        {/* Standings */}
        {tabla.length > 0 && (
          <View style={[styles.section, SHADOWS.sm]}>
            <Text style={styles.sectionTitle}>Tabla de Posiciones</Text>
            {tabla.map((p, i) => (
              <View key={i} style={[styles.tablaRow, i === 0 && styles.tablaRowFirst]}>
                <Text style={styles.tablaPos}>
                  {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </Text>
                <Text style={[styles.tablaNombre, i === 0 && { fontWeight: '800', color: '#F59E0B' }]} numberOfLines={1}>
                  {p.nombre_partido || p.nombre}{p.es_comodin ? ' *' : ''}
                </Text>
                <Text style={styles.tablaPts}>{p.puntos}</Text>
                <Text style={[styles.tablaDetail, { color: COLORS.success }]}>{p.victorias}V</Text>
                <Text style={[styles.tablaDetail, { color: COLORS.error }]}>{p.derrotas}D</Text>
                <Text style={styles.tablaDetail}>{p.tablas}T</Text>
              </View>
            ))}
          </View>
        )}

        {/* Peleas list */}
        <View style={[styles.section, SHADOWS.sm]}>
          <Text style={styles.sectionTitle}>Peleas ({peleas.length})</Text>
          {peleas.map(p => {
            const isCurrent = p.numero_pelea === evento.pelea_actual && evento.estado === 'en_curso';
            return (
              <View key={p.id} style={[styles.peleaRow, isCurrent && styles.peleaRowCurrent]}>
                <View style={styles.peleaNum}>
                  <Text style={[styles.peleaNumText, isCurrent && { color: COLORS.secondary }]}>
                    {p.numero_pelea}
                  </Text>
                </View>
                <View style={styles.peleaNames}>
                  <Text style={[styles.peleaName, { color: '#EF4444' }]} numberOfLines={1}>
                    {p.placa_rojo || p.anillo_rojo || '---'}
                  </Text>
                  <Text style={styles.peleaVs}>vs</Text>
                  <Text style={[styles.peleaName, { color: '#10B981' }]} numberOfLines={1}>
                    {p.placa_verde || p.anillo_verde || '---'}
                  </Text>
                </View>
                <View style={styles.peleaResult}>
                  {p.resultado ? (
                    <View style={[styles.resultBadge, { backgroundColor: resultColor(p.resultado) + '20' }]}>
                      <Text style={[styles.resultText, { color: resultColor(p.resultado) }]}>
                        {resultLabel(p.resultado)}
                      </Text>
                    </View>
                  ) : isCurrent ? (
                    <View style={[styles.resultBadge, { backgroundColor: COLORS.secondary + '20' }]}>
                      <Text style={[styles.resultText, { color: COLORS.secondary }]}>En curso</Text>
                    </View>
                  ) : (
                    <Text style={styles.peleaPending}>-</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Live Chat overlay */}
      {streamInfo?.isLive && eventoId && (
        <LiveChat eventoId={eventoId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { justifyContent: 'center', alignItems: 'center' },

  // Role selection
  roleScreen: { flex: 1, paddingHorizontal: SPACING.lg },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  roleHeader: { alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.xl },
  roleTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textLight, marginTop: SPACING.md },
  roleSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: SPACING.xs },
  roleCards: { gap: SPACING.md },
  roleCard: { borderRadius: BORDER_RADIUS.xl, overflow: 'hidden' },
  roleCardGradient: { padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm },
  roleCardContent: { padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.card },
  roleCardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textLight },
  roleCardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 260 },

  // Partido input
  partidoInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 24, fontWeight: '700',
    color: COLORS.textLight, textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: SPACING.lg,
  },
  confirmButton: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  confirmGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  confirmText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },

  // Live header
  liveHeader: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  liveHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  liveEventName: { fontSize: 17, fontWeight: '700', color: COLORS.textLight },
  liveMetaRow: { flexDirection: 'row' },
  liveMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  livePanel: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BORDER_RADIUS.xl, padding: SPACING.md, alignItems: 'center' },
  liveBadge: {
    fontSize: 11, fontWeight: '800', color: '#fff',
    backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round, letterSpacing: 1, overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  liveFightNum: { fontSize: 20, fontWeight: '700', color: COLORS.textLight, marginBottom: SPACING.sm },

  vsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  cornerBox: { alignItems: 'center', flex: 1 },
  cornerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cornerAnillo: { fontSize: 16, fontWeight: '700', color: COLORS.textLight, marginTop: 2 },
  cornerPeso: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  vsText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  winnerTag: {
    fontSize: 10, fontWeight: '800', color: '#EF4444',
    letterSpacing: 1, marginTop: 4,
  },
  tablasTag: {
    fontSize: 12, fontWeight: '800', color: '#F59E0B',
    letterSpacing: 1, marginTop: 4, textAlign: 'center',
  },

  liveStats: { flexDirection: 'row', gap: SPACING.md },
  liveStatText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // Stream
  streamContainer: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },

  // Fight info bar
  fightInfoBar: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fightInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fightInfoLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  fightInfoStatus: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fightInfoMatchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  fightInfoCorner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  fightInfoCornerWinner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  fightInfoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fightInfoPartido: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  fightInfoAnillo: {
    color: COLORS.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
  fightInfoPeso: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  fightInfoVs: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '700',
  },
  guestBanner: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  guestBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
  },
  guestBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  guestBannerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },

  // Content
  liveContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  section: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },

  // Tabla
  tablaRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: 8,
  },
  tablaRowFirst: { backgroundColor: '#FEF9C3', marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.sm },
  tablaPos: { width: 28, fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  tablaNombre: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  tablaPts: { width: 32, fontSize: 15, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  tablaDetail: { width: 24, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  // Peleas
  peleaRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  peleaRowCurrent: {
    backgroundColor: COLORS.secondary + '10',
    marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  peleaNum: { width: 30 },
  peleaNumText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  peleaNames: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  peleaName: { fontSize: 13, fontWeight: '600' },
  peleaVs: { fontSize: 11, color: COLORS.textSecondary },
  peleaResult: { width: 70, alignItems: 'flex-end' },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.round },
  resultText: { fontSize: 11, fontWeight: '700' },
  peleaPending: { fontSize: 14, color: COLORS.textDisabled },

  // Avisos
  avisoItem: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: COLORS.warning,
  },
  avisoText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  avisoTime: { fontSize: 11, color: COLORS.textDisabled, marginTop: 4 },

  // Mi Partido
  miPartidoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  miPartidoPts: {
    marginLeft: 'auto', fontSize: 16, fontWeight: '800',
    color: COLORS.secondary,
  },
  miPeleaCard: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  miPeleaTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.sm,
  },
  miPeleaNum: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  miResultBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  miResultText: { fontSize: 11, fontWeight: '700' },
  miPeleaVs: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  miAveBox: {
    flex: 1, borderWidth: 1, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, alignItems: 'center',
  },
  miAveCorner: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  miAveAnillo: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  miAvePeso: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  miAveLabel: { fontSize: 10, color: COLORS.textDisabled, marginTop: 2 },
  miVsText: { fontSize: 12, fontWeight: '700', color: COLORS.textDisabled },
  miOponenteNombre: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
});
