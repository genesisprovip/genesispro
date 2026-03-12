import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Vibration,
  KeyboardAvoidingView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Platform, PermissionsAndroid } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Radio,
  X,
  Eye,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Video,
  CameraIcon,
  Maximize2,
  Search,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Shuffle,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import api from '@/services/api';

interface Pelea {
  id: string;
  numero_pelea: number;
  estado: string;
  resultado: string | null;
  anillo_rojo: string | null;
  anillo_verde: string | null;
  placa_rojo: string | null;
  placa_verde: string | null;
  peso_rojo: number | null;
  peso_verde: number | null;
  numero_ronda: number | null;
  partido_rojo_nombre: string | null;
  partido_verde_nombre: string | null;
  hora_inicio: string | null;
}

export default function BroadcastScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { eventoId, eventoNombre } = useLocalSearchParams<{
    eventoId: string;
    eventoNombre: string;
  }>();

  // Unlock screen orientation for landscape broadcasting
  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const webViewRef = useRef<WebView>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'connecting' | 'live' | 'reconnecting' | 'error' | 'stopped'>('idle');
  const [isStarting, setIsStarting] = useState(false);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [viewersCount, setViewersCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fight control state
  const [peleas, setPeleas] = useState<Pelea[]>([]);
  const [currentPeleaIndex, setCurrentPeleaIndex] = useState(0);
  const [fightTimerSeconds, setFightTimerSeconds] = useState(0);
  const [fightTimerRunning, setFightTimerRunning] = useState(false);
  const fightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [resultAnimation, setResultAnimation] = useState<string | null>(null);
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const [cameraFullscreen, setCameraFullscreen] = useState(false);

  // Zoom & focus state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);

  const [isSorteando, setIsSorteando] = useState(false);

  const [resolvedEventoId, setResolvedEventoId] = useState(eventoId || '');
  const [resolvedEventoNombre, setResolvedEventoNombre] = useState(eventoNombre || '');
  const [eventoModo, setEventoModo] = useState<'genesispro' | 'manual'>('genesispro');
  const [codigoInput, setCodigoInput] = useState('');
  const [searchingEvento, setSearchingEvento] = useState(false);
  const [eventoError, setEventoError] = useState('');
  const [needsEventSelection, setNeedsEventSelection] = useState(!eventoId);

  // Multi-camera state
  interface CamaraData {
    id: string;
    stream_id: string;
    nombre_camara: string;
    estado: string;
    es_principal: boolean;
    operador_nombre: string;
    started_at: string | null;
  }
  const [camaras, setCamaras] = useState<CamaraData[]>([]);
  const [settingPrincipal, setSettingPrincipal] = useState<string | null>(null);

  const isLive = broadcastStatus === 'live' || broadcastStatus === 'reconnecting';
  const isManual = eventoModo === 'manual';
  const currentPelea = peleas.length > 0 ? peleas[currentPeleaIndex] : null;
  const hasMoreFights = currentPeleaIndex < peleas.length - 1;

  // If eventoId was passed directly, resolve it
  useEffect(() => {
    if (eventoId) {
      setResolvedEventoId(eventoId);
      setNeedsEventSelection(false);
      api.getEvento(eventoId).then(res => {
        if (res.success && res.data) {
          if (res.data.modo) setEventoModo(res.data.modo);
          if (res.data.nombre) setResolvedEventoNombre(res.data.nombre);
          // Block if event is finalized
          if (res.data.estado === 'finalizado' || res.data.estado === 'cancelado') {
            setEventoError(`Este evento ya esta ${res.data.estado}. No se puede transmitir.`);
            setNeedsEventSelection(true);
            setResolvedEventoId('');
          }
        }
      }).catch(() => {});
    }
  }, [eventoId]);

  // Search event by codigo_acceso
  const handleSearchEvento = async () => {
    const code = codigoInput.trim().toUpperCase();
    if (!code) return;
    setSearchingEvento(true);
    setEventoError('');
    try {
      const res = await api.getEventos();
      if (res.success && res.data?.length > 0) {
        const found = res.data.find((e: any) => e.codigo_acceso?.toUpperCase() === code);
        if (!found) {
          setEventoError('No se encontro ningun evento con ese codigo');
        } else if (found.estado === 'finalizado' || found.estado === 'cancelado') {
          setEventoError(`El evento "${found.nombre}" ya esta ${found.estado}. No se puede transmitir.`);
        } else {
          setResolvedEventoId(found.id);
          setResolvedEventoNombre(found.nombre || '');
          setEventoModo(found.modo || 'genesispro');
          setNeedsEventSelection(false);
          setEventoError('');
        }
      } else {
        setEventoError('No tienes eventos registrados');
      }
    } catch (error: any) {
      setEventoError(error.message || 'Error buscando evento');
    } finally {
      setSearchingEvento(false);
    }
  };

  // Stream elapsed timer
  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive]);

  // Fight timer — synced from server hora_inicio
  useEffect(() => {
    if (currentPelea?.estado === 'en_curso' && currentPelea?.hora_inicio) {
      // Calculate from server time
      const calcElapsed = () => {
        const start = new Date(currentPelea.hora_inicio!).getTime();
        return Math.max(0, Math.floor((Date.now() - start) / 1000));
      };
      setFightTimerSeconds(calcElapsed());
      setFightTimerRunning(true);
      fightTimerRef.current = setInterval(() => {
        setFightTimerSeconds(calcElapsed());
      }, 1000);
    } else if (currentPelea?.estado === 'finalizada') {
      // Stop timer, keep last value
      setFightTimerRunning(false);
      if (fightTimerRef.current) clearInterval(fightTimerRef.current);
    } else {
      // programada or no pelea — reset
      if (!fightTimerRunning) setFightTimerSeconds(0);
      if (fightTimerRef.current) clearInterval(fightTimerRef.current);
    }
    return () => {
      if (fightTimerRef.current) clearInterval(fightTimerRef.current);
    };
  }, [currentPelea?.estado, currentPelea?.hora_inicio]);

  // Poll viewer count every 10s while live
  useEffect(() => {
    if (!isLive || !resolvedEventoId) return;
    const poll = setInterval(async () => {
      try {
        const res = await api.getStreamInfo(resolvedEventoId);
        if (res.success && res.data?.viewersCount !== undefined) {
          setViewersCount(res.data.viewersCount);
        }
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(poll);
  }, [isLive, resolvedEventoId]);

  // Poll active cameras every 5s while streaming
  useEffect(() => {
    if (!isLive || !resolvedEventoId) return;
    const loadCamaras = async () => {
      try {
        const res = await api.getCamarasEvento(resolvedEventoId);
        if (res.success && res.data) {
          setCamaras(res.data);
        }
      } catch { /* ignore - endpoint may not exist yet */ }
    };
    loadCamaras();
    const poll = setInterval(loadCamaras, 5000);
    return () => clearInterval(poll);
  }, [isLive, resolvedEventoId]);

  const handleSetPrincipal = async (streamId: string) => {
    if (!resolvedEventoId || settingPrincipal) return;
    setSettingPrincipal(streamId);
    try {
      await api.setPrincipalCamera(resolvedEventoId, streamId);
      // Optimistic update
      setCamaras(prev => prev.map(c => ({
        ...c,
        es_principal: c.stream_id === streamId,
      })));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cambiar la camara principal');
    } finally {
      setSettingPrincipal(null);
    }
  };

  // Load fights
  const loadPeleas = useCallback(async () => {
    if (!resolvedEventoId) return;
    try {
      const res = await api.getPeleasEvento(resolvedEventoId);
      if (res.success && res.data) {
        setPeleas(res.data);
        const idx = res.data.findIndex(
          (p: Pelea) => p.estado !== 'finalizada' && p.estado !== 'cancelada'
        );
        setCurrentPeleaIndex(idx >= 0 ? idx : 0);
      }
    } catch (error) {
      console.error('Error loading peleas:', error);
    }
  }, [resolvedEventoId]);

  // Load peleas as soon as we have a streamKey (don't wait for live status)
  useEffect(() => {
    if (streamKey) loadPeleas();
  }, [streamKey, loadPeleas]);

  // Poll peleas + event every 5s to stay in sync with dashboard
  // The phone IS the remote control — dashboard must mirror phone actions instantly
  useEffect(() => {
    if (!resolvedEventoId || (!isLive && !streamKey)) return;
    const poll = setInterval(async () => {
      try {
        const [peleasRes, eventoRes] = await Promise.all([
          api.getPeleasEvento(resolvedEventoId),
          api.getEvento(resolvedEventoId).catch(() => null),
        ]);
        if (peleasRes.success && peleasRes.data) {
          const newPeleas = peleasRes.data as Pelea[];
          setPeleas(prev => {
            const prevFP = prev.map(p => `${p.id}:${p.estado}:${p.resultado}`).join(',');
            const newFP = newPeleas.map(p => `${p.id}:${p.estado}:${p.resultado}`).join(',');
            if (prevFP === newFP) return prev;
            return newPeleas;
          });

          // Sync currentPeleaIndex with event's pelea_actual from dashboard
          if (eventoRes?.success && eventoRes.data?.pelea_actual) {
            const peleaActual = eventoRes.data.pelea_actual;
            const syncIdx = newPeleas.findIndex((p: Pelea) => p.numero_pelea === peleaActual);
            if (syncIdx >= 0) {
              setCurrentPeleaIndex(prev => prev !== syncIdx ? syncIdx : prev);
            }
          }
        }
      } catch { /* ignore */ }
    }, currentPelea?.estado === 'en_curso' ? 2000 : 5000);
    return () => clearInterval(poll);
  }, [isLive, streamKey, resolvedEventoId, currentPelea?.estado]);

  // Timer reset handled by the hora_inicio sync useEffect above

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatFightTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const showResultAnimation = (text: string) => {
    setResultAnimation(text);
    resultOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(1500),
      Animated.timing(resultOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setResultAnimation(null));
  };

  const handleRegisterResult = (resultado: 'rojo' | 'verde' | 'tabla') => {
    if (!currentPelea) return;
    const labels: Record<string, string> = { rojo: 'GANA ROJO', verde: 'GANA VERDE', tabla: 'TABLAS' };
    const durationDisplay = formatFightTime(fightTimerSeconds);

    Alert.alert('Confirmar Resultado', `Pelea #${currentPelea.numero_pelea}\n${labels[resultado]} (${durationDisplay})`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setIsSubmittingResult(true);
          try {
            if (currentPelea.estado === 'programada') await api.iniciarPelea(currentPelea.id);
            await api.registrarResultadoPelea(currentPelea.id, {
              resultado,
              duracion_segundos: fightTimerSeconds,
            });
            setFightTimerRunning(false);
            Vibration.vibrate([0, 200, 100, 200]); // Double vibration on success
            setPeleas(prev => prev.map(p =>
              p.id === currentPelea.id ? { ...p, estado: 'finalizada', resultado } : p
            ));
            showResultAnimation(labels[resultado]);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo registrar el resultado');
          } finally {
            setIsSubmittingResult(false);
          }
        },
      },
    ]);
  };

  const handleIniciarPelea = async () => {
    if (!currentPelea) return;
    try {
      const res = await api.iniciarPelea(currentPelea.id);
      const horaInicio = res?.data?.hora_inicio || new Date().toISOString();
      setPeleas(prev => prev.map(p =>
        p.id === currentPelea.id ? { ...p, estado: 'en_curso', hora_inicio: horaInicio } : p
      ));
      setFightTimerSeconds(0);
      setFightTimerRunning(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar la pelea');
    }
  };

  const handleSiguientePelea = async () => {
    if (hasMoreFights) {
      try {
        await api.siguientePelea(resolvedEventoId);
        setCurrentPeleaIndex(prev => prev + 1);
        setFightTimerSeconds(0);
        setFightTimerRunning(false);
      } catch (error: any) {
        // If API rejects (fight not finished, etc) show error and don't advance
        Alert.alert('Error', error.message || 'No se pudo avanzar a la siguiente pelea');
      }
    } else {
      loadPeleas();
    }
  };

  // Manual mode: jump to any fight
  const handleJumpToFight = (idx: number) => {
    setCurrentPeleaIndex(idx);
    setFightTimerSeconds(0);
    setFightTimerRunning(false);
  };

  // Sorteo: generate next round pairings
  const handleSorteo = async () => {
    if (!resolvedEventoId || isSorteando) return;
    setIsSorteando(true);
    try {
      const res = await api.ejecutarSorteo(resolvedEventoId);
      if (res.success) {
        const ronda = res.data?.ronda?.numero_ronda || '?';
        const numPeleas = res.data?.peleas?.length || 0;
        Alert.alert('Sorteo Ronda ' + ronda, `${numPeleas} peleas generadas`);
        await loadPeleas();
      }
    } catch (error: any) {
      Alert.alert('Error Sorteo', error.message || 'No se pudo ejecutar el sorteo');
    } finally {
      setIsSorteando(false);
    }
  };

  const requestCameraPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      const cameraGranted = grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
      const audioGranted = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
      if (!cameraGranted || !audioGranted) {
        Alert.alert('Permisos necesarios', 'Necesitas permitir acceso a la camara y microfono para transmitir en vivo.');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleStartStream = async () => {
    if (!resolvedEventoId) return;

    // Request Android permissions BEFORE loading WebView
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    setIsStarting(true);
    try {
      const res = await api.startStream(resolvedEventoId);
      if (res.success && res.data) {
        setStreamKey(res.data.streamKey);
        setBroadcastStatus('connecting');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar la transmision');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopStream = () => {
    Alert.alert('Detener Transmision', 'Se finalizara la transmision en vivo para todos los espectadores.', [
      { text: 'Continuar', style: 'cancel' },
      {
        text: 'Detener',
        style: 'destructive',
        onPress: async () => {
          // Tell WebView to stop
          webViewRef.current?.injectJavaScript('stopStreaming(); true;');
          try {
            if (resolvedEventoId) await api.stopStream(resolvedEventoId);
          } catch { /* ignore */ }
          setBroadcastStatus('stopped');
          setStreamKey(null);
          setFightTimerRunning(false);
          if (timerRef.current) clearInterval(timerRef.current);
          if (fightTimerRef.current) clearInterval(fightTimerRef.current);
          router.back();
        },
      },
    ]);
  };

  const handleClose = () => {
    if (isLive) handleStopStream();
    else router.back();
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'status') {
        if (msg.data === 'live') setBroadcastStatus('live');
        else if (msg.data === 'connecting') setBroadcastStatus('connecting');
        else if (msg.data === 'reconnecting') setBroadcastStatus('reconnecting');
        else if (msg.data === 'error') setBroadcastStatus('error');
        else if (msg.data === 'stopped') setBroadcastStatus('stopped');
        else if (msg.data === 'disconnected') setBroadcastStatus('reconnecting');
      } else if (msg.type === 'error' && msg.data === 'camera_denied') {
        Alert.alert('Permiso de camara', 'Necesitas permitir acceso a la camara para transmitir.');
        setBroadcastStatus('error');
      } else if (msg.type === 'zoom_info') {
        // WebView reports zoom capabilities after camera init
        setZoomSupported(msg.data.supported);
        setZoomMin(msg.data.min || 1);
        setZoomMax(msg.data.max || 1);
        setZoomLevel(msg.data.current || 1);
      } else if (msg.type === 'zoom_changed') {
        // WebView reports zoom level changed (from pinch or slider inside WebView)
        setZoomLevel(msg.data.level || 1);
      } else if (msg.type === 'focus_result') {
        // WebView reports focus attempt result
        if (msg.data === 'auto_only') {
          // Camera doesn't support manual focus — already handled visually
        }
      } else if (msg.type === 'log') {
        console.log('[Broadcast]', msg.data);
      }
    } catch {}
  };

  const handleSwitchCamera = () => {
    webViewRef.current?.injectJavaScript('switchCamera(); true;');
  };

  const handleZoomIn = () => {
    if (!zoomSupported) return;
    const step = (zoomMax - zoomMin) / 8;
    const newZoom = Math.min(zoomMax, zoomLevel + step);
    // Don't set zoomLevel optimistically — wait for zoom_changed callback from WebView
    webViewRef.current?.injectJavaScript(`setZoom(${newZoom}); true;`);
  };

  const handleZoomOut = () => {
    if (!zoomSupported) return;
    const step = (zoomMax - zoomMin) / 8;
    const newZoom = Math.max(zoomMin, zoomLevel - step);
    // Don't set zoomLevel optimistically — wait for zoom_changed callback from WebView
    webViewRef.current?.injectJavaScript(`setZoom(${newZoom}); true;`);
  };

  const handleZoomReset = () => {
    if (!zoomSupported) return;
    // Don't set zoomLevel optimistically — wait for zoom_changed callback from WebView
    webViewRef.current?.injectJavaScript(`animateZoomTo(${zoomMin}); true;`);
  };

  // Event code input screen — user must enter the event code to link the stream
  if (needsEventSelection || !resolvedEventoId) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, styles.center]}>
          <TouchableOpacity style={styles.closeBtnAbs} onPress={() => router.back()}>
            <X size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <Radio size={48} color={COLORS.secondary} />
          <Text style={styles.preTitle}>Transmitir En Vivo</Text>
          <Text style={styles.preDescription}>
            Ingresa el codigo del evento al que deseas conectar la transmision.
          </Text>

          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="Codigo del evento"
              placeholderTextColor={COLORS.textSecondary}
              value={codigoInput}
              onChangeText={(text) => { setCodigoInput(text.toUpperCase()); setEventoError(''); }}
              autoCapitalize="characters"
              maxLength={10}
              onSubmitEditing={handleSearchEvento}
              returnKeyType="search"
              editable={!searchingEvento}
            />
            <TouchableOpacity
              style={styles.codeSearchBtn}
              onPress={handleSearchEvento}
              disabled={searchingEvento || !codigoInput.trim()}
              activeOpacity={0.7}
            >
              {searchingEvento ? (
                <ActivityIndicator size="small" color={COLORS.textLight} />
              ) : (
                <Search size={20} color={COLORS.textLight} />
              )}
            </TouchableOpacity>
          </View>

          {eventoError ? (
            <View style={styles.errorRow}>
              <AlertCircle size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{eventoError}</Text>
            </View>
          ) : null}

          <Text style={styles.codeHint}>
            El codigo aparece en el detalle del evento (ej: ABC123)
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Pre-streaming screen — event is selected, ready to start
  if (!streamKey) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.closeBtnAbs} onPress={handleClose}>
          <X size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        <Video size={64} color={COLORS.secondary} />
        <Text style={styles.preTitle}>Transmision en Vivo</Text>
        <Text style={styles.preSubtitle}>{resolvedEventoNombre || 'Evento'}</Text>

        <Text style={styles.preDescription}>
          Se activara tu camara y comenzara a transmitir en vivo a todos los espectadores del evento.
        </Text>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStartStream}
          disabled={isStarting}
          activeOpacity={0.7}
        >
          {isStarting ? (
            <ActivityIndicator size="small" color={COLORS.textLight} />
          ) : (
            <>
              <Radio size={24} color={COLORS.textLight} />
              <Text style={styles.startBtnText}>Iniciar Transmision</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeEventBtn}
          onPress={() => { setNeedsEventSelection(true); setResolvedEventoId(''); setCodigoInput(''); setEventoError(''); }}
          activeOpacity={0.7}
        >
          <Text style={styles.changeEventText}>Cambiar evento</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Shared camera view component
  const renderCamera = () => (
    <>
      <WebView
        ref={webViewRef}
        source={{
          uri: `https://api.genesispro.vip/palenque/broadcast.html?key=${streamKey}&evento=${encodeURIComponent(resolvedEventoNombre || '')}&embedded=1`,
        }}
        style={styles.cameraWebView}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleWebViewMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        scalesPageToFit={false}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        androidLayerType="hardware"
        allowFileAccess
      />

      {/* Camera overlay badges */}
      <View style={styles.cameraOverlay}>
        <View style={styles.cameraOverlayLeft}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
          )}
          {broadcastStatus === 'connecting' && (
            <View style={[styles.liveBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.liveText}>CONECTANDO</Text>
            </View>
          )}
          {broadcastStatus === 'reconnecting' && (
            <View style={[styles.liveBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.liveText}>RECONECTANDO</Text>
            </View>
          )}
          {broadcastStatus === 'error' && (
            <View style={[styles.liveBadge, { backgroundColor: '#64748B' }]}>
              <Text style={styles.liveText}>ERROR</Text>
            </View>
          )}
        </View>

        <View style={styles.cameraOverlayRight}>
          <View style={styles.viewersBadge}>
            <Eye size={12} color={COLORS.textLight} />
            <Text style={styles.viewersText}>{viewersCount}</Text>
          </View>
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Zoom controls - right side */}
      {isLive && (
        <View style={styles.zoomControlsContainer}>
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.7}>
            <ZoomIn size={18} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleZoomReset} activeOpacity={0.7}>
            <View style={styles.zoomLevelBadge}>
              <Text style={styles.zoomLevelText}>{zoomLevel.toFixed(1)}x</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.7}>
            <ZoomOut size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      )}

      {/* Switch camera + fullscreen toggle */}
      <View style={styles.cameraBottomBtns}>
        <TouchableOpacity style={styles.switchCamBtn} onPress={handleSwitchCamera} activeOpacity={0.7}>
          <CameraIcon size={18} color={COLORS.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.switchCamBtn} onPress={() => setCameraFullscreen(f => !f)} activeOpacity={0.7}>
          {cameraFullscreen ? (
            <X size={18} color={COLORS.textLight} />
          ) : (
            <Maximize2 size={18} color={COLORS.textLight} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // Shared fight controls component
  const renderFightControls = () => (
    <ScrollView
      style={isLandscape && !cameraFullscreen ? styles.controlsScrollLandscape : styles.controlsScroll}
      contentContainerStyle={styles.controlsContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Mode indicator + manual fight selector */}
      {peleas.length > 0 && isManual && (
        <View style={styles.modeBar}>
          <Text style={styles.modeLabel}>MANUAL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {peleas.map((p, idx) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => handleJumpToFight(idx)}
                style={[
                  styles.fightTab,
                  idx === currentPeleaIndex && styles.fightTabActive,
                  p.estado === 'finalizada' && { opacity: 0.5 },
                ]}
              >
                <Text style={[
                  styles.fightTabText,
                  idx === currentPeleaIndex && styles.fightTabTextActive,
                ]}>#{p.numero_pelea}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Multi-camera director grid */}
      {camaras.length > 1 && (
        <View style={styles.camarasSection}>
          <View style={styles.camarasHeader}>
            <CameraIcon size={14} color={COLORS.textLight} />
            <Text style={styles.camarasTitle}>Camaras activas</Text>
            <View style={styles.camarasCountBadge}>
              <Text style={styles.camarasCountText}>{camaras.filter(c => c.estado === 'live' || c.estado === 'activa').length}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.camarasScroll}>
            {camaras.map((cam) => {
              const isPrincipal = cam.es_principal;
              const isSettingThis = settingPrincipal === cam.stream_id;
              return (
                <TouchableOpacity
                  key={cam.id}
                  style={[
                    styles.camaraCard,
                    isPrincipal && styles.camaraCardPrincipal,
                  ]}
                  onPress={() => !isPrincipal && handleSetPrincipal(cam.stream_id)}
                  disabled={isPrincipal || !!settingPrincipal}
                  activeOpacity={0.7}
                >
                  {isSettingThis && (
                    <ActivityIndicator size="small" color={COLORS.textLight} style={{ marginBottom: 4 }} />
                  )}
                  {isPrincipal && (
                    <View style={styles.enVivoBadge}>
                      <View style={styles.enVivoDot} />
                      <Text style={styles.enVivoText}>EN VIVO</Text>
                    </View>
                  )}
                  <Text style={styles.camaraNombre} numberOfLines={1}>{cam.nombre_camara || 'Camara'}</Text>
                  <Text style={styles.camaraOperador} numberOfLines={1}>{cam.operador_nombre || ''}</Text>
                  <Text style={[
                    styles.camaraEstado,
                    cam.estado === 'live' || cam.estado === 'activa' ? { color: '#10B981' } : { color: '#64748B' },
                  ]}>
                    {cam.estado === 'live' || cam.estado === 'activa' ? 'Activa' : cam.estado}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {currentPelea && (
        <View style={styles.fightPanel}>
          <View style={styles.fightInfoRow}>
            <Text style={styles.fightNumber}>
              Pelea {currentPelea.numero_pelea} de {peleas.length}
              {currentPelea.numero_ronda ? `  ·  Ronda ${currentPelea.numero_ronda}` : ''}
              {isManual ? '  ·  Manual' : ''}
            </Text>
            <View style={styles.fightMatchup}>
              <View style={styles.fightCornerBox}>
                {(currentPelea.placa_rojo || currentPelea.partido_rojo_nombre) && (
                  <Text style={styles.fightPartidoName} numberOfLines={1}>{currentPelea.placa_rojo || currentPelea.partido_rojo_nombre}</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.fightDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.fightCorner, { color: '#EF4444' }]}>
                    {currentPelea.anillo_rojo || 'ROJO'}
                  </Text>
                </View>
                {currentPelea.peso_rojo && (
                  <Text style={styles.fightPeso}>{currentPelea.peso_rojo}kg</Text>
                )}
              </View>
              <Text style={styles.fightVs}>VS</Text>
              <View style={styles.fightCornerBox}>
                {(currentPelea.placa_verde || currentPelea.partido_verde_nombre) && (
                  <Text style={styles.fightPartidoName} numberOfLines={1}>{currentPelea.placa_verde || currentPelea.partido_verde_nombre}</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.fightDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.fightCorner, { color: '#10B981' }]}>
                    {currentPelea.anillo_verde || 'VERDE'}
                  </Text>
                </View>
                {currentPelea.peso_verde && (
                  <Text style={styles.fightPeso}>{currentPelea.peso_verde}kg</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.timerRow}>
            <TouchableOpacity style={styles.timerControlBtn} onPress={() => setFightTimerRunning(r => !r)}>
              {fightTimerRunning ? <Pause size={16} color={COLORS.textLight} /> : <Play size={16} color={COLORS.textLight} />}
            </TouchableOpacity>
            <Text style={[styles.fightTimerText, isLandscape && { fontSize: 24, minWidth: 80 }]}>{formatFightTime(fightTimerSeconds)}</Text>
            <TouchableOpacity style={styles.timerControlBtn} onPress={() => { setFightTimerSeconds(0); setFightTimerRunning(false); }}>
              <RotateCcw size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {currentPelea.estado === 'programada' && (
            <TouchableOpacity style={styles.iniciarPeleaBtn} onPress={handleIniciarPelea} activeOpacity={0.7}>
              <Play size={18} color={COLORS.textLight} />
              <Text style={styles.iniciarPeleaBtnText}>INICIAR PELEA</Text>
            </TouchableOpacity>
          )}

          {/* Manual mode: show result buttons for programada too (auto-starts) */}
          {isManual && currentPelea.estado === 'programada' && (
            <View style={styles.resultBtnRow}>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnRojo]} onPress={() => handleRegisterResult('rojo')} disabled={isSubmittingResult} activeOpacity={0.7}>
                <Text style={styles.resultBtnText}>ROJO</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnTablas]} onPress={() => handleRegisterResult('tabla')} disabled={isSubmittingResult} activeOpacity={0.7}>
                <Text style={styles.resultBtnText}>TABLAS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnVerde]} onPress={() => handleRegisterResult('verde')} disabled={isSubmittingResult} activeOpacity={0.7}>
                <Text style={styles.resultBtnText}>VERDE</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentPelea.estado === 'en_curso' && (
            <View style={styles.resultBtnRow}>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnRojo]} onPress={() => handleRegisterResult('rojo')} disabled={isSubmittingResult} activeOpacity={0.7}>
                {isSubmittingResult ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.resultBtnText}>ROJO</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnTablas]} onPress={() => handleRegisterResult('tabla')} disabled={isSubmittingResult} activeOpacity={0.7}>
                <Text style={styles.resultBtnText}>TABLAS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnVerde]} onPress={() => handleRegisterResult('verde')} disabled={isSubmittingResult} activeOpacity={0.7}>
                <Text style={styles.resultBtnText}>VERDE</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentPelea.estado === 'finalizada' && hasMoreFights && (
            <TouchableOpacity style={styles.siguientePeleaBtn} onPress={handleSiguientePelea} activeOpacity={0.7}>
              <Text style={styles.siguientePeleaBtnText}>SIGUIENTE PELEA &gt;</Text>
            </TouchableOpacity>
          )}

          {currentPelea.estado === 'finalizada' && !hasMoreFights && !isManual && (
            <TouchableOpacity
              style={[styles.siguientePeleaBtn, { backgroundColor: '#F59E0B' }]}
              onPress={handleSorteo}
              disabled={isSorteando}
              activeOpacity={0.7}
            >
              {isSorteando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Shuffle size={18} color="#fff" />
                  <Text style={styles.siguientePeleaBtnText}>SORTEO SIGUIENTE RONDA</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {currentPelea.estado === 'finalizada' && !hasMoreFights && isManual && (
            <TouchableOpacity style={styles.siguientePeleaBtn} onPress={loadPeleas} activeOpacity={0.7}>
              <Text style={styles.siguientePeleaBtnText}>VER RESULTADOS</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {peleas.length === 0 && (
        <View style={styles.fightPanel}>
          <Text style={styles.noFightsText}>No hay peleas registradas para este evento</Text>
        </View>
      )}

      {peleas.length > 0 && !currentPelea && (
        <View style={styles.fightPanel}>
          <Text style={styles.noFightsText}>Todas las peleas han finalizado</Text>
        </View>
      )}

      {/* Stop button inside controls for landscape */}
      {isLandscape && !cameraFullscreen && (
        <TouchableOpacity style={[styles.stopBtn, { alignSelf: 'center', marginTop: SPACING.sm }]} onPress={handleStopStream} activeOpacity={0.7}>
          <View style={styles.stopIcon} />
          <Text style={styles.stopBtnText}>Detener</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // Single return - WebView stays mounted always. Fullscreen just hides controls.
  return (
    <View style={[styles.container, { paddingTop: cameraFullscreen ? 0 : (isLandscape ? 0 : insets.top) }]}>
      <View style={cameraFullscreen ? styles.fullscreenColumn : (isLandscape ? styles.landscapeRow : styles.portraitColumn)}>
        {/* Camera - always mounted, grows to fill in fullscreen */}
        <View style={cameraFullscreen ? styles.cameraContainerFullscreen : (isLandscape ? styles.cameraContainerLandscape : styles.cameraContainer)}>
          {renderCamera()}
        </View>

        {/* Fight Controls - hidden in fullscreen */}
        {!cameraFullscreen && renderFightControls()}
      </View>

      {/* Result Animation Overlay */}
      {resultAnimation && (
        <Animated.View style={[styles.resultAnimOverlay, { opacity: resultOpacity }]}>
          <Text style={[
            styles.resultAnimText,
            resultAnimation === 'GANA ROJO' && { color: '#EF4444' },
            resultAnimation === 'GANA VERDE' && { color: '#10B981' },
            resultAnimation === 'TABLAS' && { color: '#F59E0B' },
          ]}>{resultAnimation}</Text>
        </Animated.View>
      )}

      {/* Bottom bar - portrait only, not in fullscreen */}
      {!isLandscape && !cameraFullscreen && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <TouchableOpacity style={styles.stopBtn} onPress={handleStopStream} activeOpacity={0.7}>
            <View style={styles.stopIcon} />
            <Text style={styles.stopBtnText}>Detener</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },

  // Pre-streaming
  closeBtnAbs: {
    position: 'absolute', top: 50, left: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  preTitle: { color: COLORS.textLight, fontSize: 24, fontWeight: '800', marginTop: SPACING.lg },
  preSubtitle: { color: COLORS.secondary, fontSize: 16, fontWeight: '600', marginTop: 4 },
  preDescription: {
    color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center',
    maxWidth: 300, marginTop: SPACING.lg, lineHeight: 20,
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#EF4444', paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: BORDER_RADIUS.round, marginTop: SPACING.xl,
  },
  startBtnText: { color: COLORS.textLight, fontSize: 18, fontWeight: '700' },
  changeEventBtn: {
    marginTop: SPACING.lg, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
  },
  changeEventText: { color: COLORS.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
  codeInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: SPACING.xl, width: '80%', maxWidth: 320,
  },
  codeInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md,
    paddingVertical: 14, fontSize: 20, fontWeight: '700',
    color: COLORS.textLight, textAlign: 'center', letterSpacing: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderTopRightRadius: 0, borderBottomRightRadius: 0,
  },
  codeSearchBtn: {
    backgroundColor: COLORS.secondary, width: 52, height: 52,
    borderTopRightRadius: BORDER_RADIUS.md, borderBottomRightRadius: BORDER_RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: SPACING.md, paddingHorizontal: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  codeHint: {
    color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: SPACING.md, textAlign: 'center',
  },

  // Layout modes
  portraitColumn: { flex: 1, flexDirection: 'column' },
  landscapeRow: { flex: 1, flexDirection: 'row' },
  fullscreenColumn: { flex: 1, flexDirection: 'column' },

  // Camera area
  cameraContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraContainerLandscape: {
    width: '60%',
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraContainerFullscreen: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  cameraOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 8,
  },
  cameraOverlayLeft: { flexDirection: 'row', gap: 6 },
  cameraOverlayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.textLight },
  liveText: { color: COLORS.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  viewersBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  viewersText: { color: COLORS.textLight, fontSize: 11, fontWeight: '600' },
  timerText: {
    color: COLORS.textLight, fontSize: 12, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round, overflow: 'hidden',
  },
  cameraBottomBtns: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', gap: 8,
  },
  switchCamBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Zoom controls — positioned on right edge, vertically centered via render logic
  zoomControlsContainer: {
    position: 'absolute', right: 8, top: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center', gap: 4, zIndex: 10,
  },
  zoomBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  zoomLevelBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, minWidth: 42, alignItems: 'center',
  },
  zoomLevelText: {
    color: '#10B981', fontSize: 12, fontWeight: '800',
  },


  // Controls area
  controlsScroll: { flex: 1 },
  controlsScrollLandscape: { width: '40%' },
  controlsContent: { padding: SPACING.sm },

  // Fight Panel
  fightPanel: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  fightInfoRow: { alignItems: 'center', gap: 4 },
  fightNumber: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  fightMatchup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  fightCornerBox: { alignItems: 'center', gap: 4 },
  fightPartidoName: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  fightDot: { width: 10, height: 10, borderRadius: 5 },
  fightCorner: { fontSize: 16, fontWeight: '800' },
  fightPeso: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' },
  fightVs: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  fightTimerText: { color: COLORS.textLight, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 100, textAlign: 'center' },
  timerControlBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  resultBtnRow: { flexDirection: 'row', gap: SPACING.sm },
  resultBtn: { flex: 1, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  resultBtnRojo: { backgroundColor: '#EF4444' },
  resultBtnVerde: { backgroundColor: '#10B981' },
  resultBtnTablas: { backgroundColor: '#F59E0B' },
  resultBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  noFightsText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  iniciarPeleaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: BORDER_RADIUS.md,
  },
  iniciarPeleaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  siguientePeleaBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: BORDER_RADIUS.md,
  },
  siguientePeleaBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  // Manual mode
  modeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: BORDER_RADIUS.sm,
    marginBottom: 4,
  },
  modeLabel: {
    color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4,
  },
  fightTab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'transparent',
  },
  fightTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)', borderColor: '#6366F1',
  },
  fightTabText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  fightTabTextActive: { color: '#FFFFFF' },

  // Result Animation
  resultAnimOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100,
  },
  resultAnimText: {
    fontSize: 48, fontWeight: '900', letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },

  // Bottom
  bottomBar: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    alignItems: 'center',
  },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: BORDER_RADIUS.round, borderWidth: 2, borderColor: '#EF4444',
  },
  stopIcon: { width: 16, height: 16, borderRadius: 3, backgroundColor: '#EF4444' },
  stopBtnText: { color: COLORS.textLight, fontSize: 15, fontWeight: '700' },

  // Multi-camera director
  camarasSection: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  camarasHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.sm,
  },
  camarasTitle: {
    color: COLORS.textLight, fontSize: 13, fontWeight: '700', flex: 1,
  },
  camarasCountBadge: {
    backgroundColor: '#10B981', borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  camarasCountText: {
    color: '#FFFFFF', fontSize: 11, fontWeight: '800',
  },
  camarasScroll: {
    gap: SPACING.sm,
  },
  camaraCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  camaraCardPrincipal: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  enVivoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round, marginBottom: 4,
  },
  enVivoDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF',
  },
  enVivoText: {
    color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5,
  },
  camaraNombre: {
    color: COLORS.textLight, fontSize: 13, fontWeight: '700',
    marginBottom: 2,
  },
  camaraOperador: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500',
    marginBottom: 2,
  },
  camaraEstado: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.3,
  },
});
