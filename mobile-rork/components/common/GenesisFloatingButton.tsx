import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MessageCircle, X, Send } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

// Local knowledge base for quick answers
const KB: { patterns: string[]; answer: string }[] = [
  { patterns: ['registrar ave', 'registro ave', 'como registro', 'agregar gallo', 'agregar ave'],
    answer: 'Para registrar un ave, ve a la pestana "Aves" y toca el boton "+". Llena codigo de identidad, sexo, fecha de nacimiento y demas datos.' },
  { patterns: ['vacuna', 'salud', 'tratamiento', 'desparasit'],
    answer: 'En la pestana "Mas" selecciona "Salud". Ahi puedes registrar vacunas, tratamientos, desparasitaciones y revisiones.' },
  { patterns: ['combate', 'pelea', 'registrar combate'],
    answer: 'Ve a "Combates" y toca "+". Selecciona el gallo, fecha, lugar, resultado y peso. Si el ave murio puedes marcarlo ahi mismo.' },
  { patterns: ['evento', 'palenque', 'crear evento'],
    answer: 'En "Mas" > "Eventos/Palenque" puedes crear eventos. Necesitas ser Empresario para organizar eventos con streaming.' },
  { patterns: ['suscri', 'plan', 'premium', 'basico', 'pago'],
    answer: 'Ve a "Mas" > "Suscripcion" para ver los planes: Basico ($299), Pro ($599) y Premium ($999) MXN mensuales.' },
  { patterns: ['alimenta', 'dieta', 'comida', 'alimento'],
    answer: 'En "Mas" > "Alimentacion" puedes manejar inventario de alimentos, registrar comidas y crear dietas.' },
  { patterns: ['contraseña', 'password', 'olvide', 'recuperar'],
    answer: 'En la pantalla de login toca "Olvidaste tu contrasena?". Recibiras un codigo de 6 digitos por correo.' },
  { patterns: ['calendario', 'fecha', 'agenda'],
    answer: 'En "Mas" > "Calendario" ves todas tus actividades: nacimientos, eventos, combates y citas de salud.' },
  { patterns: ['genealogi', 'pedigree', 'padre', 'madre', 'arbol'],
    answer: 'Al registrar un ave puedes asignar padre y madre. En el detalle del ave veras el arbol genealogico y puedes descargar el pedigree en PDF.' },
  { patterns: ['streaming', 'transmitir', 'en vivo', 'camara'],
    answer: 'Solo usuarios Empresario Premium pueden transmitir. Desde el dashboard de empresario, inicia la transmision en el evento activo.' },
  { patterns: ['reglamento', 'regla'],
    answer: 'El organizador del evento puede subir un reglamento. Consultalo desde el detalle del evento en la seccion de palenque.' },
  { patterns: ['formula', 'dosis', 'receta'],
    answer: 'En la seccion de Salud puedes crear formulas personalizadas con multiples ingredientes (nombre, cantidad, unidad).' },
];

function searchKB(query: string): string | null {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const entry of KB) {
    if (entry.patterns.some(p => q.includes(p))) {
      return entry.answer;
    }
  }
  return null;
}

export default function GenesisFloatingButton() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Draggable position
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - 70, y: SCREEN_H - 200 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const handleSend = async () => {
    const q = input.trim();
    if (!q) return;

    const userMsg: Message = { role: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Try local KB first
    const kbAnswer = searchKB(q);
    if (kbAnswer) {
      setMessages(prev => [...prev, { role: 'assistant', text: kbAnswer }]);
      return;
    }

    // Fallback: show helpful message since no AI endpoint for general users
    setLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'No tengo una respuesta especifica para eso. Intenta preguntar sobre: registrar aves, vacunas, combates, alimentacion, eventos, planes o suscripciones. Para soporte directo escribe a soporte@genesispro.vip',
      }]);
      setLoading(false);
    }, 500);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating draggable button */}
      <Animated.View
        style={[styles.fab, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {
            if (messages.length === 0) {
              setMessages([{
                role: 'assistant',
                text: 'Hola! Soy Genesis, tu asistente. Preguntame lo que necesites sobre la app.',
              }]);
            }
            setVisible(true);
          }}
          activeOpacity={0.8}
        >
          <MessageCircle size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View>
                <Text style={styles.chatTitle}>Genesis</Text>
                <Text style={styles.chatSubtitle}>Asistente GenesisPro</Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <X size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messagesArea}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.userText : styles.assistantText,
                  ]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
              {loading && (
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              )}
            </ScrollView>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
                {['Como registro un ave?', 'Como funciona la salud?', 'Planes disponibles'].map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => { setInput(s); }}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Input */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.chatInput}
                placeholder="Escribe tu pregunta..."
                placeholderTextColor={COLORS.textSecondary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || loading}
              >
                <Send size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 999,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    height: '75%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  chatSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  bubble: {
    maxWidth: '85%',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: COLORS.text,
  },
  suggestions: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  suggestionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginRight: SPACING.sm,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
