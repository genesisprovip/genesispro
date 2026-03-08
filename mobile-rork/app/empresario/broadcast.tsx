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
  useWindowDimensions,
  Vibration,
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
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { api } from '@/services/api';

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

  const isLive = broadcastStatus === 'live' || broadcastStatus === 'reconnecting';
  const currentPelea = peleas.length > 0 ? peleas[currentPeleaIndex] : null;
  const hasMoreFights = currentPeleaIndex < peleas.length - 1;

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

  // Fight timer
  useEffect(() => {
    if (fightTimerRunning) {
      fightTimerRef.current = setInterval(() => {
        setFightTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (fightTimerRef.current) clearInterval(fightTimerRef.current);
    }
    return () => {
      if (fightTimerRef.current) clearInterval(fightTimerRef.current);
    };
  }, [fightTimerRunning]);

  // Poll viewer count every 10s while live
  useEffect(() => {
    if (!isLive || !eventoId) return;
    const poll = setInterval(async () => {
      try {
        const res = await api.getStreamInfo(eventoId);
        if (res.success && res.data?.viewersCount !== undefined) {
          setViewersCount(res.data.viewersCount);
        }
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(poll);
  }, [isLive, eventoId]);

  // Load fights
  const loadPeleas = useCallback(async () => {
    if (!eventoId) return;
    try {
      const res = await api.getPeleasEvento(eventoId);
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
  }, [eventoId]);

  // Load peleas as soon as we have a streamKey (don't wait for live status)
  useEffect(() => {
    if (streamKey) loadPeleas();
  }, [streamKey, loadPeleas]);

  useEffect(() => {
    if (currentPelea) {
      setFightTimerSeconds(0);
      setFightTimerRunning(false);
    }
  }, [currentPeleaIndex]);

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
      await api.iniciarPelea(currentPelea.id);
      // Update local state
      setPeleas(prev => prev.map(p =>
        p.id === currentPelea.id ? { ...p, estado: 'en_curso' } : p
      ));
      setFightTimerSeconds(0);
      setFightTimerRunning(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar la pelea');
    }
  };

  const handleSiguientePelea = () => {
    if (hasMoreFights) {
      setCurrentPeleaIndex(prev => prev + 1);
      setFightTimerSeconds(0);
      setFightTimerRunning(false);
    } else {
      loadPeleas();
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
    if (!eventoId) return;

    // Request Android permissions BEFORE loading WebView
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    setIsStarting(true);
    try {
      const res = await api.startStream(eventoId);
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
          webViewRef.current?.injectJavaScript('stopStream(); true;');
          try {
            if (eventoId) await api.stopStream(eventoId);
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
      } else if (msg.type === 'log') {
        console.log('[Broadcast]', msg.data);
      }
    } catch {}
  };

  const handleSwitchCamera = () => {
    webViewRef.current?.injectJavaScript('switchCamera(); true;');
  };

  // Pre-streaming screen (no streamKey yet)
  if (!streamKey) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.closeBtnAbs} onPress={handleClose}>
          <X size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        <Video size={64} color={COLORS.secondary} />
        <Text style={styles.preTitle}>Transmision en Vivo</Text>
        <Text style={styles.preSubtitle}>{eventoNombre || 'Evento'}</Text>

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
      </View>
    );
  }

  // Shared camera view component
  const renderCamera = () => (
    <>
      <WebView
        ref={webViewRef}
        source={{
          uri: `https://api.genesispro.vip/palenque/broadcast.html?key=${streamKey}&evento=${encodeURIComponent(eventoNombre || '')}&embedded=1`,
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
    >
      {currentPelea && (
        <View style={styles.fightPanel}>
          <View style={styles.fightInfoRow}>
            <Text style={styles.fightNumber}>
              Pelea {currentPelea.numero_pelea} de {peleas.length}
              {currentPelea.numero_ronda ? `  ·  Ronda ${currentPelea.numero_ronda}` : ''}
            </Text>
            <View style={styles.fightMatchup}>
              <View style={styles.fightCornerBox}>
                {currentPelea.partido_rojo_nombre && (
                  <Text style={styles.fightPartidoName}>{currentPelea.partido_rojo_nombre}</Text>
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
                {currentPelea.partido_verde_nombre && (
                  <Text style={styles.fightPartidoName}>{currentPelea.partido_verde_nombre}</Text>
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

          {currentPelea.estado === 'finalizada' && (
            <TouchableOpacity style={styles.siguientePeleaBtn} onPress={handleSiguientePelea} activeOpacity={0.7}>
              <Text style={styles.siguientePeleaBtnText}>
                {hasMoreFights ? 'SIGUIENTE PELEA >' : 'VER RESULTADOS'}
              </Text>
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
});
