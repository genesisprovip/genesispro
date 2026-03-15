import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Send,
  Sparkles,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '@/constants/theme';

const API_URL = 'https://api.genesispro.vip/api/v1';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  data?: any;
  type?: string;
  suggestions?: string[];
}

const SUGGESTION_CHIPS = [
  { label: 'Mi resumen general', emoji: '\uD83D\uDCCA' },
  { label: 'Mi l\u00EDnea m\u00E1s ganadora', emoji: '\uD83C\uDFC6' },
  { label: 'Mis aves activas', emoji: '\uD83D\uDC13' },
  { label: 'Vacunas pendientes', emoji: '\uD83D\uDC8A' },
  { label: 'Mi plan actual', emoji: '\uD83D\uDCCB' },
  { label: '\u00BFQu\u00E9 puedes hacer?', emoji: '\u2753' },
];

// Bouncing dots loading indicator
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.loadingDotsRow}>
      <View style={styles.assistantAvatar}>
        <Text style={styles.avatarLetter}>G</Text>
      </View>
      <View style={styles.loadingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.loadingDot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

// Estado badge color
function getEstadoColor(estado: string): string {
  const map: Record<string, string> = {
    activo: COLORS.success,
    activa: COLORS.success,
    baja: COLORS.error,
    muerto: COLORS.error,
    muerta: COLORS.error,
    vendido: COLORS.secondary,
    vendida: COLORS.secondary,
    reservado: COLORS.accent,
    reservada: COLORS.accent,
    retirado: COLORS.textSecondary,
    retirada: COLORS.textSecondary,
  };
  return map[estado?.toLowerCase()] || COLORS.textSecondary;
}

// Bird card renderer
function BirdCard({ bird }: { bird: any }) {
  return (
    <View style={styles.birdCard}>
      <View style={styles.birdCardHeader}>
        <Text style={styles.birdName}>{bird.nombre || bird.codigo_identidad || 'Sin nombre'}</Text>
        {bird.estado && (
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(bird.estado) + '20' }]}>
            <Text style={[styles.estadoText, { color: getEstadoColor(bird.estado) }]}>
              {bird.estado}
            </Text>
          </View>
        )}
      </View>
      {bird.codigo_identidad && (
        <Text style={styles.birdDetail}>C\u00F3digo: {bird.codigo_identidad}</Text>
      )}
      {bird.linea_genetica && (
        <Text style={styles.birdDetail}>L\u00EDnea: {bird.linea_genetica}</Text>
      )}
      {bird.sexo && (
        <Text style={styles.birdDetail}>Sexo: {bird.sexo === 'macho' ? '\u2642 Macho' : '\u2640 Hembra'}</Text>
      )}
      {bird.peso_actual && (
        <Text style={styles.birdDetail}>Peso: {bird.peso_actual}g</Text>
      )}
      {bird.anillo_pata && (
        <Text style={styles.birdDetail}>Anillo pata: {bird.anillo_pata}</Text>
      )}
      {bird.anillo_nariz && (
        <Text style={styles.birdDetail}>Anillo nariz: {bird.anillo_nariz}</Text>
      )}
      {(bird.victorias !== undefined || bird.derrotas !== undefined) && (
        <View style={styles.recordRow}>
          <Text style={[styles.recordStat, { color: COLORS.victory }]}>
            {bird.victorias || 0}V
          </Text>
          <Text style={[styles.recordStat, { color: COLORS.defeat }]}>
            {bird.derrotas || 0}D
          </Text>
          <Text style={[styles.recordStat, { color: COLORS.draw }]}>
            {bird.empates || 0}E
          </Text>
        </View>
      )}
    </View>
  );
}

// Bird list renderer
function BirdList({ birds }: { birds: any[] }) {
  return (
    <View>
      {birds.map((bird: any, idx: number) => (
        <View key={bird.id || idx} style={styles.birdMiniCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.birdMiniName}>
              {bird.nombre || bird.codigo_identidad || 'Sin nombre'}
            </Text>
            <Text style={styles.birdMiniInfo}>
              {[bird.linea_genetica, bird.sexo, bird.peso_actual ? `${bird.peso_actual}g` : null]
                .filter(Boolean)
                .join(' \u2022 ')}
            </Text>
          </View>
          {bird.estado && (
            <View style={[styles.estadoBadgeMini, { backgroundColor: getEstadoColor(bird.estado) + '20' }]}>
              <Text style={[styles.estadoTextMini, { color: getEstadoColor(bird.estado) }]}>
                {bird.estado}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// Stats renderer
function StatsGrid({ stats }: { stats: any }) {
  const entries = Object.entries(stats || {});
  return (
    <View style={styles.statsGrid}>
      {entries.map(([key, value]) => (
        <View key={key} style={styles.statItem}>
          <Text style={styles.statNumber}>{String(value)}</Text>
          <Text style={styles.statLabel}>{key}</Text>
        </View>
      ))}
    </View>
  );
}

// Plan renderer
function PlanCard({ plan }: { plan: any }) {
  const used = plan.usage?.aves || 0;
  const max = plan.limits?.maxAves || 0;
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;

  return (
    <View style={styles.planCard}>
      <Text style={styles.planName}>{plan.plan || plan.nombre || 'B\u00E1sico'}</Text>
      {max > 0 && (
        <View style={styles.usageSection}>
          <Text style={styles.usageLabel}>Aves: {used} / {max}</Text>
          <View style={styles.usageBarBg}>
            <View style={[styles.usageBarFill, { width: `${pct}%` }]} />
          </View>
        </View>
      )}
      {plan.features && (
        <View style={{ marginTop: SPACING.sm }}>
          {plan.features.map((f: string, i: number) => (
            <Text key={i} style={styles.featureText}>\u2713 {f}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Help list renderer
function HelpList({ capabilities }: { capabilities: string[] }) {
  return (
    <View>
      {capabilities.map((cap: string, i: number) => (
        <Text key={i} style={styles.helpItem}>\u2022 {cap}</Text>
      ))}
    </View>
  );
}

// Combates renderer
function CombatesList({ combates }: { combates: any[] }) {
  return (
    <View>
      {combates.map((c: any, idx: number) => (
        <View key={c.id || idx} style={styles.combateCard}>
          <View style={styles.combateHeader}>
            <Text style={styles.combateDate}>
              {c.fecha ? new Date(c.fecha).toLocaleDateString('es-MX') : 'Sin fecha'}
            </Text>
            <View style={[
              styles.resultBadge,
              {
                backgroundColor:
                  c.resultado === 'victoria' ? COLORS.victory + '20' :
                  c.resultado === 'derrota' ? COLORS.defeat + '20' :
                  COLORS.draw + '20',
              },
            ]}>
              <Text style={[
                styles.resultText,
                {
                  color:
                    c.resultado === 'victoria' ? COLORS.victory :
                    c.resultado === 'derrota' ? COLORS.defeat :
                    COLORS.draw,
                },
              ]}>
                {c.resultado || 'N/A'}
              </Text>
            </View>
          </View>
          {c.ubicacion && <Text style={styles.combateDetail}>Lugar: {c.ubicacion}</Text>}
          {c.oponente_codigo && <Text style={styles.combateDetail}>Oponente: {c.oponente_codigo}</Text>}
          {c.peso_combate && <Text style={styles.combateDetail}>Peso: {c.peso_combate}g</Text>}
        </View>
      ))}
    </View>
  );
}

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();
    scrollToBottom();

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/assistant/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim() }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: result.data.content || result.data.message || result.data.respuesta || '',
          isUser: false,
          timestamp: new Date(),
          data: result.data,
          type: result.data.type || 'text',
          suggestions: result.data.suggestions,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: result.error?.message || result.error || 'No pude procesar tu consulta. Int\u00E9ntalo de nuevo.',
          isUser: false,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message === 'Network request failed'
          ? 'Sin conexi\u00F3n a internet. Verifica tu red e int\u00E9ntalo de nuevo.'
          : 'Error al comunicarse con el servidor. Int\u00E9ntalo de nuevo.',
        isUser: false,
        timestamp: new Date(),
        type: 'text',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const renderAssistantContent = (message: Message) => {
    const { type, data, text } = message;

    switch (type) {
      case 'bird_card':
        return (
          <View>
            {text ? <Text style={styles.assistantText}>{text}</Text> : null}
            {data?.items?.[0] && <BirdCard bird={data.items[0]} />}
          </View>
        );

      case 'bird_list':
        return (
          <View>
            {text ? <Text style={styles.assistantText}>{text}</Text> : null}
            {data?.items && <BirdList birds={data.items} />}
          </View>
        );

      case 'stats':
        return (
          <View>
            {text ? <Text style={styles.assistantText}>{text}</Text> : null}
            {data?.stats && <StatsGrid stats={data.stats} />}
          </View>
        );

      case 'plan':
        return (
          <View>
            {text ? <Text style={styles.assistantText}>{text}</Text> : null}
            {data && <PlanCard plan={data} />}
          </View>
        );

      case 'help':
        return (
          <View>
            {text ? <Text style={styles.assistantText}>{text}</Text> : null}
            {data?.capabilities && <HelpList capabilities={data.capabilities} />}
          </View>
        );

      case 'combates':
        return (
          <View>
            {text ? <Text style={styles.assistantText}>{text}</Text> : null}
            {data?.items && <CombatesList combates={data.items} />}
          </View>
        );

      default:
        return <Text style={styles.assistantText}>{text || data?.content || ''}</Text>;
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <View style={styles.userMessageRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantMessageRow}>
        <View style={styles.assistantAvatar}>
          <Text style={styles.avatarLetter}>G</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.assistantBubble}>
            {renderAssistantContent(item)}
          </View>
          {item.suggestions && item.suggestions.length > 0 && (
            <FlatList
              horizontal
              data={item.suggestions}
              keyExtractor={(s, i) => `sug-${item.id}-${i}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
              renderItem={({ item: suggestion }) => (
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionChipText}>{suggestion}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyLogo}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.emptyLogoGradient}
        >
          <Sparkles size={32} color={COLORS.textLight} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>\u00BFEn qu\u00E9 te puedo ayudar?</Text>
      <Text style={styles.emptySubtitle}>
        Consulta informaci\u00F3n sobre tus aves, combates, salud y m\u00E1s
      </Text>
      <View style={styles.suggestionsGrid}>
        {SUGGESTION_CHIPS.map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.suggestionGridChip}
            onPress={() => sendMessage(chip.label)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionGridEmoji}>{chip.emoji}</Text>
            <Text style={styles.suggestionGridText}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.gradientDark, COLORS.gradientDarkEnd]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Asistente GenesisPro</Text>
        </View>
        <View style={styles.headerIcon}>
          <Sparkles size={20} color={COLORS.primaryLight} />
        </View>
      </LinearGradient>

      {/* Chat area */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListFooterComponent={isLoading ? <LoadingDots /> : null}
          />
        )}

        {/* Input area */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Pregunta sobre tus aves..."
              placeholderTextColor={COLORS.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="default"
              onSubmitEditing={() => sendMessage(inputText)}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              <Send size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chat
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },

  // User message
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: SPACING.md,
  },
  userBubble: {
    maxWidth: '78%',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...SHADOWS.sm,
  },
  userText: {
    color: COLORS.textLight,
    fontSize: 15,
    lineHeight: 21,
  },

  // Assistant message
  assistantMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  avatarLetter: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  assistantBubble: {
    maxWidth: '90%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assistantText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },

  // Suggestions inline
  suggestionsRow: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  suggestionChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    marginRight: SPACING.sm,
  },
  suggestionChipText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyLogo: {
    marginBottom: SPACING.lg,
  },
  emptyLogoGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    width: '100%',
  },
  suggestionGridChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
    width: '47%',
  },
  suggestionGridEmoji: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  suggestionGridText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },

  // Input area
  inputArea: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm + 2 : SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },

  // Loading dots
  loadingDotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  loadingBubble: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },

  // Bird card
  birdCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  birdCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  birdName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  estadoBadge: {
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  birdDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  recordRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  recordStat: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Bird list mini
  birdMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  birdMiniName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  birdMiniInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  estadoBadgeMini: {
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  estadoTextMini: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  statItem: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  // Plan
  planCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'capitalize',
    marginBottom: SPACING.xs,
  },
  usageSection: {
    marginTop: SPACING.xs,
  },
  usageLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  usageBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Help
  helpItem: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginTop: 2,
  },

  // Combates
  combateCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  combateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  combateDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  resultBadge: {
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  combateDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
