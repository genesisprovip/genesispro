import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';

export default function IndexRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('has_seen_welcome').then(val => {
      setHasSeenWelcome(val === 'true');
    });
  }, []);

  // Still loading auth or welcome check
  if (isLoading || hasSeenWelcome === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundDark }}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  // Authenticated user goes straight to tabs
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  // First time user sees welcome
  if (!hasSeenWelcome) {
    return <Redirect href="/welcome" />;
  }

  // Returning non-auth user who already saw welcome goes to welcome too
  return <Redirect href="/welcome" />;
}
