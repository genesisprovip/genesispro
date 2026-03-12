import { Tabs } from "expo-router";
import { Home, Bird, Swords, TrendingUp, Menu, Radio } from "lucide-react-native";
import React, { useEffect } from "react";
import { Platform, StyleSheet, BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const { user } = useAuth();
  const isEmpresario = !!user?.plan_empresario;

  // Prevent Android back button from exiting to welcome/login screens
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back behavior (exiting tabs)
      return true;
    });
    return () => backHandler.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: 54 + bottomPadding,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Home size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="aves"
        options={{
          title: "Aves",
          tabBarIcon: ({ color, size }) => (
            <Bird size={22} color={color} />
          ),
          ...(isEmpresario ? { href: null } : {}),
        }}
      />
      <Tabs.Screen
        name="combates"
        options={{
          title: "Combates",
          tabBarIcon: ({ color, size }) => (
            <Swords size={22} color={color} />
          ),
          ...(isEmpresario ? { href: null } : {}),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Estadísticas",
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={22} color={color} />
          ),
          ...(isEmpresario ? { href: null } : {}),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Más",
          tabBarIcon: ({ color, size }) => (
            <Menu size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabBarItem: {
    gap: 2,
  },
});
