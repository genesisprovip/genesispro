import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Swords,
  Bird,
  Heart,
  DollarSign,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { useEventos, Evento } from '@/context/EventosContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CalendarioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fechasConEventos, getEventosByFecha, getEventosByMes } = useEventos();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Obtener eventos del mes actual
  const eventosDelMes = useMemo(() => {
    return getEventosByMes(year, month);
  }, [year, month, getEventosByMes]);

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [year, month]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayPress = (day: number) => {
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(fechaStr);
    setModalVisible(true);
  };

  const getDayEvents = (day: number): Evento[] => {
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return getEventosByFecha(fechaStr);
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear();
  };

  const getEventIcon = (tipo: string) => {
    switch (tipo) {
      case 'combate':
        return <Swords size={16} color={COLORS.textLight} />;
      case 'nacimiento':
        return <Bird size={16} color={COLORS.textLight} />;
      case 'vacuna':
      case 'tratamiento':
        return <Heart size={16} color={COLORS.textLight} />;
      case 'venta':
        return <DollarSign size={16} color={COLORS.textLight} />;
      default:
        return <CalendarIcon size={16} color={COLORS.textLight} />;
    }
  };

  const selectedDateEvents = selectedDate ? getEventosByFecha(selectedDate) : [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendario</Text>
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Hoy</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Navegación del mes */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MESES[month]} {year}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <ChevronRight size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Días de la semana */}
        <View style={styles.weekDaysRow}>
          {DIAS_SEMANA.map((dia, index) => (
            <View key={index} style={styles.weekDayCell}>
              <Text style={[
                styles.weekDayText,
                index === 0 && styles.sundayText
              ]}>
                {dia}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendario */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dayEvents = getDayEvents(day);
            const hasEvents = dayEvents.length > 0;
            const today = isToday(day);

            return (
              <TouchableOpacity
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  today && styles.todayCell,
                ]}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayText,
                  today && styles.todayText,
                  index % 7 === 0 && styles.sundayDayText,
                ]}>
                  {day}
                </Text>
                {hasEvents && (
                  <View style={styles.eventIndicators}>
                    {dayEvents.slice(0, 3).map((evento, i) => (
                      <View
                        key={i}
                        style={[styles.eventDot, { backgroundColor: evento.color }]}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <Text style={styles.moreEvents}>+{dayEvents.length - 3}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Leyenda */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Tipos de eventos</Text>
          <View style={styles.legendItems}>
            <LegendItem color="#4CAF50" label="Victoria" />
            <LegendItem color="#F44336" label="Derrota" />
            <LegendItem color="#2196F3" label="Nacimiento" />
            <LegendItem color="#9C27B0" label="Venta" />
          </View>
        </View>

        {/* Próximos eventos */}
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>Eventos recientes</Text>
          {Object.keys(eventosDelMes).length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>No hay eventos este mes</Text>
            </View>
          ) : (
            Object.entries(eventosDelMes)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 5)
              .map(([fecha, eventos]) => (
                <TouchableOpacity
                  key={fecha}
                  style={styles.eventGroup}
                  onPress={() => {
                    setSelectedDate(fecha);
                    setModalVisible(true);
                  }}
                >
                  <View style={styles.eventDateBadge}>
                    <Text style={styles.eventDateDay}>
                      {new Date(fecha + 'T00:00:00').getDate()}
                    </Text>
                    <Text style={styles.eventDateMonth}>
                      {MESES[new Date(fecha + 'T00:00:00').getMonth()].substring(0, 3)}
                    </Text>
                  </View>
                  <View style={styles.eventGroupContent}>
                    {eventos.map((evento, i) => (
                      <View key={i} style={styles.eventItem}>
                        <View style={[styles.eventItemDot, { backgroundColor: evento.color }]} />
                        <Text style={styles.eventItemTitle} numberOfLines={1}>
                          {evento.titulo}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <ChevronRight size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))
          )}
        </View>
      </ScrollView>

      {/* Modal de detalle del día */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedDateEvents.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <CalendarIcon size={48} color={COLORS.textDisabled} />
                  <Text style={styles.modalEmptyText}>No hay eventos este día</Text>
                </View>
              ) : (
                selectedDateEvents.map((evento, index) => (
                  <View key={index} style={styles.eventCard}>
                    <View style={[styles.eventCardIcon, { backgroundColor: evento.color }]}>
                      {getEventIcon(evento.tipo)}
                    </View>
                    <View style={styles.eventCardContent}>
                      <Text style={styles.eventCardTitle}>{evento.titulo}</Text>
                      {evento.descripcion && (
                        <Text style={styles.eventCardDescription}>{evento.descripcion}</Text>
                      )}
                      <View style={styles.eventCardMeta}>
                        <Text style={styles.eventCardType}>
                          {evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}
                        </Text>
                        {evento.ave_codigo && (
                          <Text style={styles.eventCardAve}>{evento.ave_codigo}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  todayButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.round,
  },
  todayButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sundayText: {
    color: COLORS.error,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.sm,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  todayCell: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sundayDayText: {
    color: COLORS.error,
  },
  eventIndicators: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
    alignItems: 'center',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreEvents: {
    fontSize: 8,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  legend: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  upcomingSection: {
    margin: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  eventGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  eventDateBadge: {
    width: 50,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  eventDateDay: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  eventDateMonth: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  eventGroupContent: {
    flex: 1,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  eventItemTitle: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
    flex: 1,
    marginRight: SPACING.md,
  },
  modalBody: {
    padding: SPACING.md,
  },
  modalEmpty: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalEmptyText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  eventCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  eventCardContent: {
    flex: 1,
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventCardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  eventCardMeta: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  eventCardType: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  eventCardAve: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
