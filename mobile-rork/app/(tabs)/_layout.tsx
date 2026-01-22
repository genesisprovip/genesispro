import { Tabs } from "expo-router";
import { Home, Bird, Swords, TrendingUp, Menu } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="aves"
        options={{
          title: "Aves",
          tabBarIcon: ({ color, size }) => (
            <Bird size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="combates"
        options={{
          title: "Combates",
          tabBarIcon: ({ color, size }) => (
            <Swords size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Más",
          tabBarIcon: ({ color, size }) => (
            <Menu size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    height: Platform.OS === 'ios' ? 85 : 65,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});
