import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { type EventSubscription } from "expo-modules-core";
import React, { useEffect, useRef } from "react";
import { Platform, Vibration } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useKeepAwake } from "expo-keep-awake";
import { AuthProvider } from "@/context/AuthContext";
import { AvesProvider } from "@/context/AvesContext";
import { CombatesProvider } from "@/context/CombatesContext";
import { EventosProvider } from "@/context/EventosContext";
import { SaludProvider } from "@/context/SaludContext";
import { AlimentacionProvider } from "@/context/AlimentacionContext";
import GenesisFloatingButton from "@/components/common/GenesisFloatingButton";

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    // Vibrate for fight alerts (pattern: short-pause-long-pause-short)
    if (data?.tipo === 'pelea_proxima') {
      Vibration.vibrate([0, 300, 200, 500, 200, 300]);
    } else if (data?.tipo === 'resultado_pelea') {
      Vibration.vibrate([0, 200, 100, 200]);
    }
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal'
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal'
        }}
      />
      <Stack.Screen
        name="ave/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ave/new"
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="combate/new"
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="calendario"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="salud/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="salud/new"
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="alimentacion/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="alimentacion/new"
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="salud/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="salud/formulas"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="palenque/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="palenque/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="palenque/new"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="palenque/live"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal'
        }}
      />
      <Stack.Screen
        name="empresario"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="empresario/dashboard"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="empresario/broadcast"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  // Keep screen awake across the entire app
  useKeepAwake();
  const router = useRouter();
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    SplashScreen.hideAsync();

    // Android: create high-priority notification channel for fight alerts
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('fight-alerts', {
        name: 'Alertas de Pelea',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 500, 200, 300],
        sound: 'fight_alert',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'notification',
        enableVibrate: true,
      });
    }

    // Listen for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification displayed by handler above, vibration handled there
    });

    // Handle notification tap — navigate to the relevant screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.eventoId) {
        if (data.tipo === 'pelea_proxima' || data.tipo === 'resultado_pelea') {
          router.push(`/palenque/${data.eventoId}`);
        }
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AvesProvider>
            <CombatesProvider>
              <SaludProvider>
                <AlimentacionProvider>
                  <EventosProvider>
                    <RootLayoutNav />
                    <GenesisFloatingButton />
                  </EventosProvider>
                </AlimentacionProvider>
              </SaludProvider>
            </CombatesProvider>
          </AvesProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
