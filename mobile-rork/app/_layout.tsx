import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
    </Stack>
  );
}

export default function RootLayout() {
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
