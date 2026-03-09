import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Eye, Radio, Volume2, VolumeX, Lock, Maximize2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

const DEFAULT_PREVIEW_MINUTES = 5;

interface LiveStreamViewerProps {
  hlsUrl: string;
  isLive: boolean;
  viewersCount: number;
  calidad: string;
  previewMinutos?: number | null;
  onFullscreen?: () => void;
  userPlan?: 'free' | 'basico' | 'pro' | 'premium';
}

export default function LiveStreamViewer({
  hlsUrl,
  isLive,
  viewersCount,
  calidad,
  previewMinutos,
  onFullscreen,
  userPlan = 'free',
}: LiveStreamViewerProps) {
  const router = useRouter();
  const videoViewRef = useRef<VideoView>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<'buffering' | 'playing' | 'error'>('buffering');
  const previewSeconds = (previewMinutos ?? DEFAULT_PREVIEW_MINUTES) * 60;
  const [previewTimeLeft, setPreviewTimeLeft] = useState(previewSeconds);
  const [previewExpired, setPreviewExpired] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isFreeUser = previewMinutos !== null && previewMinutos !== undefined ? true : userPlan === 'free';

  // Native video player via expo-video (ExoPlayer on Android, AVPlayer on iOS)
  // Use source object with buffering hints for low latency
  const player = useVideoPlayer({
    uri: hlsUrl,
    headers: {},
  }, (p) => {
    p.loop = false;
    p.muted = false;
    // Minimize buffer for lower latency on live streams
    p.preferredForwardBufferDuration = 2; // Only buffer 2 seconds ahead
    p.play();
  });

  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_AUTO_RETRIES = 10;

  // Auto-reconnect on error
  const autoReconnect = useCallback(() => {
    if (!player || previewExpired) return;
    if (retryCountRef.current >= MAX_AUTO_RETRIES) return;
    retryCountRef.current += 1;
    console.log(`[Video] Auto-reconnect attempt ${retryCountRef.current}/${MAX_AUTO_RETRIES}`);
    setPlayerStatus('buffering');
    retryTimerRef.current = setTimeout(() => {
      try {
        player.replace(hlsUrl);
        player.play();
      } catch (e) {
        console.log('[Video] Reconnect failed:', e);
      }
    }, 3000);
  }, [player, hlsUrl, previewExpired]);

  // Listen to player status
  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', (event) => {
      if (event.status === 'readyToPlay') {
        setPlayerStatus('playing');
        retryCountRef.current = 0; // Reset retries on success
      } else if (event.status === 'loading') {
        setPlayerStatus('buffering');
      } else if (event.status === 'error') {
        console.log('[Video] Error:', event.error);
        autoReconnect();
      }
    });

    const playingSub = player.addListener('playingChange', (event) => {
      if (event.isPlaying) {
        setPlayerStatus('playing');
        retryCountRef.current = 0;
      }
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [player, autoReconnect]);

  // Sync mute state
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  // Live pulse animation
  useEffect(() => {
    if (!isLive) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLive, pulseAnim]);

  // Free user preview timer
  useEffect(() => {
    if (!isFreeUser || previewExpired || !isLive) return;
    const interval = setInterval(() => {
      setPreviewTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPreviewExpired(true);
          if (player) {
            player.pause();
            player.muted = true;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isFreeUser, previewExpired, isLive, player]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleRetry = () => {
    retryCountRef.current = 0;
    setPlayerStatus('buffering');
    if (player) {
      player.replace(hlsUrl);
      player.play();
    }
  };

  if (playerStatus === 'error' && retryCountRef.current >= MAX_AUTO_RETRIES) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Radio size={48} color={COLORS.textSecondary} />
        <Text style={styles.errorTitle}>Error de transmision</Text>
        <Text style={styles.errorText}>
          No se pudo cargar la transmision en vivo. Verifica tu conexion e intenta de nuevo.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView
        ref={videoViewRef}
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="contain"
        allowsFullscreen
      />

      {playerStatus === 'buffering' && (
        <View style={styles.bufferingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={COLORS.textLight} />
          <Text style={styles.bufferingText}>Cargando transmision...</Text>
        </View>
      )}

      {/* Top overlay: Live badge + quality + viewers */}
      <View style={styles.topOverlay} pointerEvents="none">
        <View style={styles.topLeft}>
          {isLive && (
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
          )}
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>{calidad}</Text>
          </View>
        </View>
        <View style={styles.viewersContainer}>
          <Eye size={14} color={COLORS.textLight} />
          <Text style={styles.viewersText}>{viewersCount.toLocaleString()}</Text>
        </View>
      </View>

      {/* Bottom overlay: controls */}
      <View style={styles.bottomOverlay}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
          {isMuted ? (
            <VolumeX size={22} color={COLORS.textLight} />
          ) : (
            <Volume2 size={22} color={COLORS.textLight} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => videoViewRef.current?.enterFullscreen()}
        >
          <Maximize2 size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Free user preview timer */}
      {isFreeUser && !previewExpired && (
        <View style={styles.timerOverlay} pointerEvents="none">
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>
              Vista previa: {formatTime(previewTimeLeft)}
            </Text>
          </View>
        </View>
      )}

      {/* Paywall overlay when preview expires */}
      {isFreeUser && previewExpired && (
        <View style={styles.paywallOverlay}>
          <Lock size={48} color={COLORS.textLight} />
          <Text style={styles.paywallTitle}>Vista previa terminada</Text>
          <Text style={styles.paywallText}>
            Suscribete para seguir viendo la transmision en vivo
          </Text>
          <TouchableOpacity
            style={styles.paywallButton}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.paywallButtonText}>Ver Planes</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingText: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: SPACING.sm,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.sm,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight,
  },
  liveText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qualityBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  qualityText: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: '600',
  },
  viewersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 5,
  },
  viewersText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  timerOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm + 90,
    alignItems: 'center',
  },
  timerBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  timerText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  paywallOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  paywallTitle: {
    color: COLORS.textLight,
    fontSize: 20,
    fontWeight: '800',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  paywallText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  paywallButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  paywallButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
});
