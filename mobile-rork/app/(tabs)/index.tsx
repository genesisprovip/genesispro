import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Bell,
  Plus,
  ChevronRight,
  Trophy,
  Swords,
  DollarSign,
  Heart,
  Calendar,
  TrendingUp,
  Activity,
  AlertTriangle,
  Ticket,
} from 'lucide-react-native';
import { Cloud, CloudOff } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import { useSalud } from '@/context/SaludContext';
import { useAlimentacion } from '@/context/AlimentacionContext';
import { useEventos } from '@/context/EventosContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import api from '@/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { aves, refreshAves, isLoading: loadingAves } = useAves();
  const { combates, stats, refreshCombates, isLoading: loadingCombates } = useCombates();
  const { stats: saludStats, getProximasVacunas } = useSalud();
  const { stats: alimentacionStats, registros: registrosAlimentacion } = useAlimentacion();
  const { eventos } = useEventos();
  const [refreshing, setRefreshing] = React.useState(false);
  const [eventoActivo, setEventoActivo] = React.useState<any>(null);
  const [visitorId, setVisitorId] = React.useState<string>('');
  const [pendingSync, setPendingSync] = React.useState(0);
  const [codigoEvento, setCodigoEvento] = React.useState('');
  const [joiningEvento, setJoiningEvento] = React.useState(false);
  const isEmpresario = !!user?.plan_empresario;

  React.useEffect(() => {
    api.getVisitorId().then(id => setVisitorId(id));
    if (api.isAuthenticated()) {
      api.getEventos({ estado: 'en_curso' })
        .then(res => {
          if (res.success && res.data?.length > 0) setEventoActivo(res.data[0]);
        })
        .catch(() => {});
    }
    // Sync queue listener
    setPendingSync(api.pendingSyncCount);
    const unsub = api.subscribeSyncQueue((queue) => setPendingSync(queue.length));
    return unsub;
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (api.pendingSyncCount > 0) {
      await api.processSyncQueue();
    }
    await Promise.all([refreshAves(), refreshCombates()]);
    setRefreshing(false);
  }, [refreshAves, refreshCombates]);

  const avesActivas = aves.filter(a => a.estado === 'activo').length;
  const machos = aves.filter(a => a.sexo === 'M').length;
  const hembras = aves.filter(a => a.sexo === 'H').length;
  const proximasVacunas = getProximasVacunas();
  const [alertasVisible, setAlertasVisible] = useState(false);

  // Campana semáforo: calcular alertas de múltiples fuentes
  const alertas = useMemo(() => {
    const criticas: { texto: string; tipo: string }[] = [];
    const proximas: { texto: string; tipo: string }[] = [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 1. Vacunas vencidas o próximas
    proximasVacunas.forEach(v => {
      const fecha = new Date(v.fecha_proxima!);
      const diffDias = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      const label = v.nombre || v.tipo || 'Vacuna';
      if (diffDias <= 0) {
        criticas.push({ texto: `Vacuna vencida: ${label}`, tipo: 'vacuna' });
      } else if (diffDias <= 3) {
        criticas.push({ texto: `Vacuna en ${diffDias} día${diffDias > 1 ? 's' : ''}: ${label}`, tipo: 'vacuna' });
      } else if (diffDias <= 7) {
        proximas.push({ texto: `Vacuna en ${diffDias} días: ${label}`, tipo: 'vacuna' });
      }
    });

    // 2. Salud — tratamientos activos y enfermedades
    if (saludStats.tratamientosActivos > 0) {
      criticas.push({ texto: `${saludStats.tratamientosActivos} tratamiento${saludStats.tratamientosActivos > 1 ? 's' : ''} activo${saludStats.tratamientosActivos > 1 ? 's' : ''}`, tipo: 'salud' });
    }

    // 3. Alimentación — stock bajo y sin registro hoy
    if (alimentacionStats.alimentosBajoStock > 0) {
      criticas.push({ texto: `${alimentacionStats.alimentosBajoStock} alimento${alimentacionStats.alimentosBajoStock > 1 ? 's' : ''} con stock bajo`, tipo: 'alimentacion' });
    }
    if (alimentacionStats.totalAlimentos > 0 && alimentacionStats.registrosHoy === 0) {
      proximas.push({ texto: 'Sin registro de alimentación hoy', tipo: 'alimentacion' });
    }

    // 4. Calendario — eventos próximos (vacunas, combates, tratamientos)
    eventos.forEach(ev => {
      if (!ev.fecha) return;
      const fecha = new Date(ev.fecha);
      const diffDias = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias >= 0 && diffDias <= 2 && ev.tipo === 'combate') {
        criticas.push({ texto: `Combate ${diffDias === 0 ? 'hoy' : 'en ' + diffDias + ' día' + (diffDias > 1 ? 's' : '')}: ${ev.ave_codigo || ''}`, tipo: 'combate' });
      } else if (diffDias > 2 && diffDias <= 7 && ev.tipo === 'combate') {
        proximas.push({ texto: `Combate en ${diffDias} días: ${ev.ave_codigo || ''}`, tipo: 'combate' });
      }
    });

    // 5. Aves — sin peso registrado
    const sinPeso = aves.filter(a => a.estado === 'activo' && !a.peso_actual);
    if (sinPeso.length > 0) {
      proximas.push({ texto: `${sinPeso.length} ave${sinPeso.length > 1 ? 's' : ''} sin peso registrado`, tipo: 'ave' });
    }

    return { criticas, proximas };
  }, [aves, proximasVacunas, saludStats, alimentacionStats, eventos]);

  const bellColor = alertas.criticas.length > 0
    ? '#EF4444'    // Rojo
    : alertas.proximas.length > 0
      ? '#F59E0B'  // Ámbar
      : '#10B981'; // Verde

  const totalAlertas = alertas.criticas.length + alertas.proximas.length;

  const requireAuth = (action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      Alert.alert(
        'Crea tu cuenta gratis',
        'Registrate y obtiene 15 dias Premium gratis para usar todas las funciones de GenesisPro.',
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Crear Cuenta', onPress: () => router.push('/register') },
        ]
      );
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const handleJoinEvento = async () => {
    const code = codigoEvento.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Error', 'Ingresa un codigo de acceso valido');
      return;
    }
    setJoiningEvento(true);
    try {
      const res = await api.getEventoByCodigo(code);
      if (res.success && res.data?.id) {
        // Store referral context for tracking (empresario who created the event)
        if (res.data.usuario_id) {
          api.setReferralContext(res.data.usuario_id, res.data.id);
        }
        setCodigoEvento('');
        router.push(`/palenque/live?eventoId=${res.data.id}&code=${code}`);
      } else {
        Alert.alert('No encontrado', 'No se encontro ningun evento con ese codigo');
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('finalizó') || msg.includes('cancelado')) {
        Alert.alert('Evento no disponible', msg);
      } else {
        Alert.alert('Error', 'No se pudo buscar el evento. Verifica el codigo e intenta de nuevo.');
      }
    } finally {
      setJoiningEvento(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.nombre || `Visitante`}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { borderWidth: 1.5, borderColor: bellColor }]}
            onPress={() => setAlertasVisible(true)}
          >
            <Bell size={22} color={bellColor} />
            {totalAlertas > 0 && (
              <View style={[styles.notifDot, { backgroundColor: bellColor }]}>
                <Text style={styles.notifDotText}>{totalAlertas > 9 ? '9+' : totalAlertas}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Stats - solo para galleros */}
        {!isEmpresario && (
          <View style={styles.heroStats}>
            <View style={styles.heroStatMain}>
              <Text style={styles.heroNumber}>{avesActivas}</Text>
              <Text style={styles.heroLabel}>Aves Activas</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatSide}>
              <View style={styles.heroMiniStat}>
                <View style={[styles.miniDot, { backgroundColor: COLORS.male }]} />
                <Text style={styles.heroMiniNumber}>{machos}</Text>
                <Text style={styles.heroMiniLabel}>Machos</Text>
              </View>
              <View style={styles.heroMiniStat}>
                <View style={[styles.miniDot, { backgroundColor: COLORS.female }]} />
                <Text style={styles.heroMiniNumber}>{hembras}</Text>
                <Text style={styles.heroMiniLabel}>Hembras</Text>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Offline sync banner */}
        {pendingSync > 0 && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 12, gap: 8 }}
            onPress={() => { api.processSyncQueue(); }}
            activeOpacity={0.7}
          >
            <CloudOff size={16} color="#92400E" />
            <Text style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' }}>
              {pendingSync} cambio{pendingSync > 1 ? 's' : ''} pendiente{pendingSync > 1 ? 's' : ''} de sincronizar
            </Text>
            <Text style={{ fontSize: 11, color: '#B45309' }}>Reintentar</Text>
          </TouchableOpacity>
        )}

        {/* Unirse a evento como espectador */}
        {!isEmpresario && (
          <View style={[styles.joinEventCard, SHADOWS.sm]}>
            <View style={styles.joinEventHeader}>
              <Ticket size={18} color={COLORS.secondary} />
              <Text style={styles.joinEventTitle}>Entrar a Evento</Text>
            </View>
            <View style={styles.joinEventRow}>
              <TextInput
                style={styles.joinEventInput}
                placeholder="CODIGO DE ACCESO"
                placeholderTextColor={COLORS.placeholder}
                value={codigoEvento}
                onChangeText={setCodigoEvento}
                autoCapitalize="characters"
                maxLength={8}
              />
              <TouchableOpacity
                style={styles.joinEventButton}
                onPress={handleJoinEvento}
                disabled={joiningEvento}
              >
                <Text style={styles.joinEventButtonText}>
                  {joiningEvento ? '...' : 'Entrar'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.joinEventHint}>
              Ingresa el codigo que te compartio el organizador del evento
            </Text>
          </View>
        )}

        {/* Evento en curso banner */}
        {eventoActivo && (
          <TouchableOpacity
            style={[styles.eventoBanner, SHADOWS.md]}
            activeOpacity={0.8}
            onPress={() => router.push(`/palenque/${eventoActivo.id}`)}
          >
            <LinearGradient
              colors={[COLORS.accent, '#4F46E5']}
              style={styles.eventoBannerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.eventoBannerLeft}>
                <View style={styles.eventoBannerLive}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>EN VIVO</Text>
                </View>
                <Text style={styles.eventoBannerTitle} numberOfLines={1}>
                  {eventoActivo.nombre}
                </Text>
                <Text style={styles.eventoBannerSub}>
                  Pelea {eventoActivo.pelea_actual || 0} de {eventoActivo.total_peleas}
                </Text>
              </View>
              <ChevronRight size={22} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* KPI Cards - solo para galleros */}
        {!isEmpresario && (
          <View style={styles.kpiContainer}>
            <View style={styles.kpiRow}>
              <KPICard
                title="Combates"
                value={stats.total.toString()}
                subtitle={`${stats.porcentajeVictorias}% victorias`}
                icon={<Swords size={18} color={COLORS.primary} />}
                color={COLORS.primary}
              />
              <KPICard
                title="Victorias"
                value={stats.victorias.toString()}
                subtitle={`de ${stats.total}`}
                icon={<Trophy size={18} color={COLORS.secondary} />}
                color={COLORS.secondary}
              />
            </View>
            <View style={styles.kpiRow}>
              <KPICard
                title="Balance"
                value={`$${stats.roi >= 0 ? '+' : ''}${stats.roi.toLocaleString()}`}
                subtitle="Total neto"
                icon={<DollarSign size={18} color={stats.roi >= 0 ? COLORS.success : COLORS.error} />}
                color={stats.roi >= 0 ? COLORS.success : COLORS.error}
              />
              <KPICard
                title="Salud"
                value={saludStats.vacunasPendientes.toString()}
                subtitle="vacunas pendientes"
                icon={<Heart size={18} color={COLORS.error} />}
                color={COLORS.error}
              />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>ACCIONES RAPIDAS</Text>
        <View style={styles.quickActions}>
          {!isEmpresario && (
            <>
              <QuickAction
                icon={<Plus size={22} color={COLORS.textLight} />}
                label="Nueva Ave"
                colors={[COLORS.primary, COLORS.primaryDark]}
                onPress={() => requireAuth(() => router.push('/ave/new'))}
              />
              <QuickAction
                icon={<Swords size={22} color={COLORS.textLight} />}
                label="Combate"
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                onPress={() => requireAuth(() => router.push('/combate/new'))}
              />
              <QuickAction
                icon={<Heart size={22} color={COLORS.textLight} />}
                label="Salud"
                colors={['#EC4899', '#DB2777']}
                onPress={() => router.push('/salud')}
              />
            </>
          )}
          <QuickAction
            icon={<Trophy size={22} color={COLORS.textLight} />}
            label="Palenque"
            colors={[COLORS.accent, '#4F46E5']}
            onPress={() => router.push('/palenque')}
          />
        </View>

        {/* Win Rate Ring - solo galleros */}
        {!isEmpresario && stats.total > 0 && (
          <>
            <Text style={styles.sectionLabel}>RENDIMIENTO</Text>
            <View style={[styles.performanceCard, SHADOWS.md]}>
              <View style={styles.perfLeft}>
                <View style={styles.ringContainer}>
                  <View style={[styles.ring, { borderColor: COLORS.primary }]}>
                    <Text style={styles.ringValue}>{stats.porcentajeVictorias}%</Text>
                    <Text style={styles.ringLabel}>Win Rate</Text>
                  </View>
                </View>
              </View>
              <View style={styles.perfRight}>
                <PerfStat
                  label="Victorias"
                  value={stats.victorias}
                  total={stats.total}
                  color={COLORS.victory}
                />
                <PerfStat
                  label="Derrotas"
                  value={stats.derrotas}
                  total={stats.total}
                  color={COLORS.defeat}
                />
                <PerfStat
                  label="Empates"
                  value={stats.empates}
                  total={stats.total}
                  color={COLORS.draw}
                />
              </View>
            </View>
          </>
        )}

        {/* Alerts - solo galleros */}
        {!isEmpresario && proximasVacunas.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ALERTAS</Text>
            <TouchableOpacity
              style={[styles.alertCard, SHADOWS.sm]}
              onPress={() => router.push('/salud')}
            >
              <View style={styles.alertIcon}>
                <AlertTriangle size={20} color={COLORS.warning} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {proximasVacunas.length} vacuna{proximasVacunas.length > 1 ? 's' : ''} próxima{proximasVacunas.length > 1 ? 's' : ''}
                </Text>
                <Text style={styles.alertSubtitle}>Toca para ver el calendario de salud</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Recent Fights - solo galleros */}
        {!isEmpresario && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ÚLTIMOS COMBATES</Text>
          {combates.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/combates')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>
        )}
        {!isEmpresario && (combates.length === 0 ? (
          <View style={[styles.emptyCard, SHADOWS.sm]}>
            <Swords size={32} color={COLORS.textDisabled} />
            <Text style={styles.emptyText}>Sin combates registrados</Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => router.push('/combate/new')}
            >
              <Text style={styles.emptyActionText}>Registrar primero</Text>
            </TouchableOpacity>
          </View>
        ) : (
          combates.slice(0, 4).map((combate, index) => (
            <View key={combate.id} style={[styles.combateRow, SHADOWS.sm]}>
              <View style={[
                styles.combateStatus,
                {
                  backgroundColor: combate.resultado === 'victoria'
                    ? COLORS.victory
                    : combate.resultado === 'derrota'
                    ? COLORS.defeat
                    : COLORS.draw
                }
              ]} />
              <View style={styles.combateBody}>
                <Text style={styles.combatePlace}>{combate.ubicacion}</Text>
                <Text style={styles.combateDate}>
                  {combate.fecha ? new Date(combate.fecha).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : 'Sin fecha'}
                </Text>
              </View>
              <View style={[
                styles.combateResultBadge,
                {
                  backgroundColor: combate.resultado === 'victoria'
                    ? COLORS.victory + '18'
                    : combate.resultado === 'derrota'
                    ? COLORS.defeat + '18'
                    : COLORS.draw + '18'
                }
              ]}>
                <Text style={[
                  styles.combateResultText,
                  {
                    color: combate.resultado === 'victoria'
                      ? COLORS.victory
                      : combate.resultado === 'derrota'
                      ? COLORS.defeat
                      : COLORS.draw
                  }
                ]}>
                  {combate.resultado === 'victoria' ? 'V' : combate.resultado === 'derrota' ? 'D' : 'E'}
                </Text>
              </View>
            </View>
          ))
        ))}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Modal de alertas */}
      <Modal visible={alertasVisible} animationType="slide" transparent>
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContent}>
            <View style={styles.alertModalHeader}>
              <Bell size={20} color={bellColor} />
              <Text style={styles.alertModalTitle}>Estado de tu Gallera</Text>
              <TouchableOpacity onPress={() => setAlertasVisible(false)}>
                <Text style={styles.alertModalClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.alertModalScroll} showsVerticalScrollIndicator={false}>
              {alertas.criticas.length > 0 && (
                <View style={styles.alertSection}>
                  <View style={[styles.alertSectionHeader, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                    <AlertTriangle size={14} color="#EF4444" />
                    <Text style={[styles.alertSectionTitle, { color: '#EF4444' }]}>
                      Atención Urgente ({alertas.criticas.length})
                    </Text>
                  </View>
                  {alertas.criticas.map((a, i) => (
                    <View key={`c-${i}`} style={styles.alertItem}>
                      <View style={[styles.alertDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.alertItemText}>{a.texto}</Text>
                    </View>
                  ))}
                </View>
              )}

              {alertas.proximas.length > 0 && (
                <View style={styles.alertSection}>
                  <View style={[styles.alertSectionHeader, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                    <Calendar size={14} color="#F59E0B" />
                    <Text style={[styles.alertSectionTitle, { color: '#F59E0B' }]}>
                      Próximamente ({alertas.proximas.length})
                    </Text>
                  </View>
                  {alertas.proximas.map((a, i) => (
                    <View key={`p-${i}`} style={styles.alertItem}>
                      <View style={[styles.alertDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.alertItemText}>{a.texto}</Text>
                    </View>
                  ))}
                </View>
              )}

              {totalAlertas === 0 && (
                <View style={styles.alertEmpty}>
                  <Bell size={40} color="#10B981" />
                  <Text style={styles.alertEmptyTitle}>Todo en orden</Text>
                  <Text style={styles.alertEmptyText}>No hay alertas pendientes. Tu gallera está al día.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function KPICard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <View style={[styles.kpiCard, SHADOWS.md]}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
          {icon}
        </View>
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSubtitle}>{subtitle}</Text>
    </View>
  );
}

function QuickAction({ icon, label, colors, onPress }: {
  icon: React.ReactNode;
  label: string;
  colors: [string, string, ...string[]];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionItem} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={colors} style={styles.quickActionGradient}>
        {icon}
      </LinearGradient>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PerfStat({ label, value, total, color }: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.perfStatRow}>
      <View style={styles.perfStatLabel}>
        <View style={[styles.perfDot, { backgroundColor: color }]} />
        <Text style={styles.perfStatText}>{label}</Text>
      </View>
      <Text style={styles.perfStatValue}>{value}</Text>
      <View style={styles.perfBarBg}>
        <View style={[styles.perfBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  greeting: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.backgroundDark,
  },
  notifDotText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  heroStatMain: {
    alignItems: 'center',
    flex: 1,
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 52,
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: SPACING.lg,
  },
  heroStatSide: {
    flex: 1,
    gap: SPACING.md,
  },
  heroMiniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroMiniNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  heroMiniLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  content: {
    flex: 1,
    marginTop: -SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  eventoBanner: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  eventoBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  eventoBannerLeft: { flex: 1 },
  eventoBannerLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11, fontWeight: '800',
    color: '#EF4444', letterSpacing: 1,
  },
  eventoBannerTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.textLight,
  },
  eventoBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  kpiContainer: {
    marginBottom: SPACING.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  kpiSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  performanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  perfLeft: {
    marginRight: SPACING.lg,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
  },
  ringValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ringLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  perfRight: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.md,
  },
  perfStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  perfStatLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 80,
  },
  perfDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  perfStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  perfStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    width: 24,
    textAlign: 'right',
  },
  perfBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  perfBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warning + '25',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  combateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  combateStatus: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  combateBody: {
    flex: 1,
  },
  combatePlace: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  combateDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  combateResultBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  combateResultText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyAction: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  joinEventCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary + '25',
  },
  joinEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  joinEventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  joinEventRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  joinEventInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  joinEventButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinEventButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  joinEventHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // Alert Modal
  alertModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  alertModalContent: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  alertModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  alertModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  alertModalClose: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  alertModalScroll: {
    padding: SPACING.lg,
  },
  alertSection: {
    marginBottom: SPACING.lg,
  },
  alertSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  alertSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  alertEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  alertEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  alertEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
