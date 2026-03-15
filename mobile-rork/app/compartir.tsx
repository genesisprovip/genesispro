import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import {
  ChevronLeft,
  Camera,
  ImageIcon,
  Share2,
  Type,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - SPACING.md * 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.1;

export default function CompartirScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const viewShotRef = useRef<ViewShot>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para compartir fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleShare = async () => {
    if (!imageUri) {
      Alert.alert('Selecciona una foto', 'Elige o toma una foto para compartir.');
      return;
    }

    setIsSharing(true);
    try {
      // Capture the branded view as image
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        Alert.alert('Error', 'No se pudo generar la imagen.');
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir desde GenesisPro',
      });
    } catch (error: any) {
      if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
        // User cancelled share - not an error
        return;
      }
      Alert.alert('Error', 'No se pudo compartir. Intenta de nuevo.');
    } finally {
      setIsSharing(false);
    }
  };

  const clearImage = () => {
    setImageUri(null);
    setCaption('');
  };

  const planNames: Record<string, string> = { basico: 'Básico', pro: 'Pro', premium: 'Premium' };
  const userPlan = planNames[user?.plan || 'basico'] || '';
  const userName = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || 'Usuario';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compartir</Text>
          <View style={styles.navButton} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Source buttons */}
        {!imageUri && (
          <View style={styles.sourceSection}>
            <Text style={styles.sourceTitle}>Elige una foto para compartir</Text>
            <Text style={styles.sourceSubtitle}>
              Se agregará automáticamente la marca GenesisPro
            </Text>

            <View style={styles.sourceButtons}>
              <TouchableOpacity
                style={[styles.sourceBtn, SHADOWS.md]}
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.sourceBtnGradient}
                >
                  <Camera size={32} color={COLORS.textLight} />
                  <Text style={styles.sourceBtnText}>Tomar Foto</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sourceBtn, SHADOWS.md]}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.accent, '#4F46E5']}
                  style={styles.sourceBtnGradient}
                >
                  <ImageIcon size={32} color={COLORS.textLight} />
                  <Text style={styles.sourceBtnText}>Galería</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Preview - branded card */}
        {imageUri && (
          <>
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>Vista previa</Text>
              <TouchableOpacity onPress={clearImage} style={styles.clearBtn}>
                <X size={18} color={COLORS.error} />
                <Text style={styles.clearText}>Cambiar</Text>
              </TouchableOpacity>
            </View>

            {/* This is the view that gets captured as image */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1 }}
              style={styles.viewShotContainer}
            >
              <View style={styles.brandedCard}>
                {/* User photo */}
                <Image
                  source={{ uri: imageUri }}
                  style={styles.cardImage}
                  contentFit="cover"
                />

                {/* Caption overlay */}
                {caption.trim() !== '' && (
                  <View style={styles.captionOverlay}>
                    <Text style={styles.captionText}>{caption}</Text>
                  </View>
                )}

                {/* GenesisPro branded footer */}
                <LinearGradient
                  colors={[COLORS.backgroundDark, '#0D1321']}
                  style={styles.brandedFooter}
                >
                  <View style={styles.footerLeft}>
                    <Image
                      source={require('@/assets/images/logo.png')}
                      style={styles.footerLogo}
                      contentFit="contain"
                    />
                    <View>
                      <Text style={styles.footerBrand}>GenesisPro</Text>
                      <Text style={styles.footerTagline}>Gestión Gallística Profesional</Text>
                    </View>
                  </View>
                  <View style={styles.footerRight}>
                    <Text style={styles.footerUser}>{userName}</Text>
                    {userPlan ? (
                      <View style={styles.footerPlanBadge}>
                        <Text style={styles.footerPlanText}>{userPlan}</Text>
                      </View>
                    ) : null}
                  </View>
                </LinearGradient>
              </View>
            </ViewShot>

            {/* Caption input */}
            <View style={[styles.captionInputCard, SHADOWS.sm]}>
              <View style={styles.captionInputRow}>
                <Type size={18} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.captionInput}
                  placeholder="Agrega un mensaje (opcional)"
                  placeholderTextColor={COLORS.placeholder}
                  value={caption}
                  onChangeText={setCaption}
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                  multiline
                  maxLength={120}
                />
              </View>
              <Text style={styles.captionCount}>{caption.length}/120</Text>
            </View>

            {/* Share button */}
            <TouchableOpacity
              style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.shareGradient}
              >
                {isSharing ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <>
                    <Share2 size={20} color={COLORS.textLight} />
                    <Text style={styles.shareText}>Compartir</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.shareHint}>
              Se abrirá WhatsApp, Facebook, Instagram y más...
            </Text>

            {/* Quick action buttons */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.sourceBtn, styles.quickBtn, SHADOWS.sm]}
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <View style={styles.quickBtnInner}>
                  <Camera size={20} color={COLORS.primary} />
                  <Text style={styles.quickBtnText}>Otra foto</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sourceBtn, styles.quickBtn, SHADOWS.sm]}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <View style={styles.quickBtnInner}>
                  <ImageIcon size={20} color={COLORS.accent} />
                  <Text style={styles.quickBtnText}>Galería</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      </KeyboardAvoidingView>
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
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  // Source selection
  sourceSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  sourceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sourceSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  sourceBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  sourceBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  sourceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  // Preview
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  viewShotContainer: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  brandedCard: {
    backgroundColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  captionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  brandedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  footerLogo: {
    width: 32,
    height: 32,
  },
  footerBrand: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  footerTagline: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  footerRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  footerUser: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  footerPlanBadge: {
    backgroundColor: COLORS.primary + '25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  footerPlanText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Caption input
  captionInputCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  captionInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  captionInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
    minHeight: 40,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  captionCount: {
    fontSize: 11,
    color: COLORS.textDisabled,
    textAlign: 'right',
    marginTop: 4,
  },
  // Share
  shareButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.lg,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  shareText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  shareHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  quickBtn: {
    backgroundColor: COLORS.card,
  },
  quickBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
