import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MessageCircle, Send, X, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { api } from '@/services/api';

interface ChatMessage {
  id: string;
  mensaje: string | null;
  eliminado: boolean;
  usuario_id: string;
  usuario_nombre: string;
  created_at: string;
}

interface LiveChatProps {
  eventoId: string;
}

export default function LiveChat({ eventoId }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.getChatMessages(eventoId);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (error) {
      // Silently fail on poll errors
    }
  }, [eventoId]);

  // Start polling when chat is visible
  useEffect(() => {
    if (!isVisible) return;

    fetchMessages();
    pollInterval.current = setInterval(fetchMessages, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [isVisible, fetchMessages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      const res = await api.sendChatMessage(eventoId, text);
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data]);
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error: any) {
      // If rate limited, show the message back in input
      if (error.message?.includes('Espera')) {
        setInputText(text);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const res = await api.deleteChatMessage(messageId);
      if (res.success) {
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, eliminado: true, mensaje: null } : m)
        );
      }
    } catch {
      // Ignore delete errors
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={styles.messageBubble}>
      <View style={styles.messageHeader}>
        <Text style={styles.userName}>{item.usuario_nombre}</Text>
        <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
      </View>
      {item.eliminado ? (
        <Text style={styles.deletedText}>[mensaje eliminado]</Text>
      ) : (
        <Text style={styles.messageText}>{item.mensaje}</Text>
      )}
    </View>
  );

  // Toggle button (always visible)
  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.8}
      >
        <MessageCircle size={20} color={COLORS.textLight} />
        {messages.length > 0 && (
          <View style={styles.badgeCount}>
            <Text style={styles.badgeText}>
              {messages.length > 99 ? '99+' : messages.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <MessageCircle size={16} color={COLORS.secondary} />
        <Text style={styles.headerTitle}>Chat en Vivo</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.closeBtn}>
          <X size={16} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sin mensajes aun. Se el primero!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={inputText}
          onChangeText={setInputText}
          maxLength={500}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          <Send size={16} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Toggle button
  toggleButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: '700',
  },

  // Container
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 250,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    zIndex: 10,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  messageBubble: {
    marginBottom: 4,
    paddingVertical: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  messageText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 17,
  },
  deletedText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },

  // Empty
  emptyContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 13,
    color: COLORS.textLight,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
