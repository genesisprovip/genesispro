import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import AvesScreen from '../screens/aves/AvesScreen';
import AveDetailScreen from '../screens/aves/AveDetailScreen';
import CombatesScreen from '../screens/combates/CombatesScreen';
import SaludScreen from '../screens/salud/SaludScreen';
import FinanzasScreen from '../screens/finanzas/FinanzasScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#C9A227',      // Golden
  secondary: '#1A1A1A',    // Dark
  accent: '#E5C762',       // Light Gold
  background: '#F8F6F0',   // Cream
  white: '#FFFFFF',
};

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Inicio':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Aves':
            iconName = focused ? 'leaf' : 'leaf-outline';
            break;
          case 'Combates':
            iconName = focused ? 'trophy' : 'trophy-outline';
            break;
          case 'Salud':
            iconName = focused ? 'medkit' : 'medkit-outline';
            break;
          case 'Finanzas':
            iconName = focused ? 'cash' : 'cash-outline';
            break;
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: { backgroundColor: COLORS.white },
      headerStyle: { backgroundColor: COLORS.secondary },
      headerTintColor: COLORS.primary,
      headerTitleStyle: { fontWeight: 'bold' },
    })}
  >
    <Tab.Screen name="Inicio" component={HomeScreen} />
    <Tab.Screen name="Aves" component={AvesScreen} />
    <Tab.Screen name="Combates" component={CombatesScreen} />
    <Tab.Screen name="Salud" component={SaludScreen} />
    <Tab.Screen name="Finanzas" component={FinanzasScreen} />
  </Tab.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.secondary },
      headerTintColor: COLORS.primary,
    }}
  >
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ title: 'Crear Cuenta' }}
    />
  </Stack.Navigator>
);

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.secondary },
      headerTintColor: COLORS.primary,
    }}
  >
    <Stack.Screen
      name="MainTabs"
      component={TabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AveDetail"
      component={AveDetailScreen}
      options={{ title: 'Detalle del Ave' }}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Mi Perfil' }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
