import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useKeepAwake } from "expo-keep-awake";
import { AuthProvider } from "@/context/AuthContext";
import { AvesProvider } from "@/context/AvesContext";
import { CombatesProvider } from "@/context/CombatesContext";
import { EventosProvider } from "@/context/EventosContext";
import { SaludProvider } from "@/context/SaludContext";
import { AlimentacionProvider } from "@/context/AlimentacionContext";

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

  useEffect(() => {
    SplashScreen.hideAsync();
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
