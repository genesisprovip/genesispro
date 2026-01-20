# GenesisPro - Prompt para Rork (Desarrollo Frontend)

## Información del Proyecto

**Nombre:** GenesisPro  
**Tipo:** Aplicación móvil multiplataforma (iOS + Android)  
**Framework:** React Native con Expo  
**Desarrollador Frontend:** Rork  
**Desarrollador Backend:** Claude Code  
**Fecha:** Enero 2025

---

## OBJETIVO PRINCIPAL

Desarrollar la aplicación móvil **GenesisPro** utilizando React Native + Expo. Esta app permite a criadores de aves gestionar genealogía, combates, salud, finanzas y más de forma profesional con una interfaz moderna y funcional.

**Documento de referencia completo:** `GenesisPro_Documentacion_Tecnica_Completa.md`

---

## TABLA DE CONTENIDOS

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Arquitectura de la App](#2-arquitectura-de-la-app)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Diseño UI/UX](#4-diseño-uiux)
5. [Navegación](#5-navegación)
6. [Pantallas Principales](#6-pantallas-principales)
7. [Componentes Reutilizables](#7-componentes-reutilizables)
8. [Integración con API](#8-integración-con-api)
9. [Gestión de Estado](#9-gestión-de-estado)
10. [Modo Offline](#10-modo-offline)
11. [Notificaciones Push](#11-notificaciones-push)
12. [Plan de Desarrollo por Fases](#12-plan-de-desarrollo-por-fases)
13. [Configuración Inicial](#13-configuración-inicial)
14. [Comandos Útiles](#14-comandos-útiles)

---

## 1. STACK TECNOLÓGICO

### 1.1 Core

```yaml
Framework: React Native 0.73+
Plataforma: Expo SDK 50+
Lenguaje: JavaScript (ES6+)
Build Tool: Expo CLI
```

### 1.2 Navegación

```yaml
Librería: React Navigation 6+
Tipos: Stack, Bottom Tabs, Drawer (opcional)
Deep Linking: Habilitado para QR codes
```

### 1.3 UI/Componentes

```yaml
UI Library: React Native Paper 5.11+
Iconos: React Native Paper Icons (Material Design)
Alternativa: NativeBase (si prefieres)
Fonts: System defaults + Roboto
```

### 1.4 Estado y Data Fetching

```yaml
HTTP Client: Axios 1.6+
Data Fetching: @tanstack/react-query 5.14+
Estado Local: React Context API
Formularios: react-hook-form 7.49+
Validación: Yup (opcional)
```

### 1.5 Funcionalidades Específicas

```yaml
Gráficas: Victory Native 37+ / react-native-chart-kit
Calendario: react-native-calendars 1.1302+
Cámara/Fotos: expo-image-picker 14.7+
QR Scanner: expo-barcode-scanner 12.9+
QR Generator: react-native-qrcode-svg 6.3+
Notificaciones: expo-notifications 0.27+
Storage Offline: @react-native-async-storage/async-storage 1.21+
File System: expo-file-system 16.0+
```

### 1.6 Testing

```yaml
Testing Framework: Jest 29+
Component Testing: @testing-library/react-native 12.4+
```

---

## 2. ARQUITECTURA DE LA APP

### 2.1 Flujo General

```
┌─────────────────────────────────────────┐
│         SPLASH SCREEN                    │
│  - Logo GenesisPro                       │
│  - Verificar autenticación               │
└────────────┬────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │ ¿Autenticado?│
      └──────┬───────┘
             │
        ┌────┴────┐
        │         │
     NO │         │ SÍ
        ▼         ▼
   ┌────────┐  ┌──────────────┐
   │ AUTH   │  │ MAIN APP     │
   │ STACK  │  │ (TAB NAV)    │
   └────────┘  └──────────────┘
   │           │
   ├─ Login   ├─ Home (Dashboard)
   ├─ Register├─ Aves (Lista/Gestión)
   └─ Forgot  ├─ Combates
              ├─ Analytics
              └─ Más (Profile/Settings)
```

### 2.2 Arquitectura de Capas

```
┌───────────────────────────────────────────┐
│         PRESENTATION LAYER                 │
│  Screens, Components, Navigation           │
└──────────────┬────────────────────────────┘
               │
┌──────────────▼────────────────────────────┐
│         BUSINESS LOGIC LAYER               │
│  Hooks, Context, State Management          │
└──────────────┬────────────────────────────┘
               │
┌──────────────▼────────────────────────────┐
│         DATA LAYER                         │
│  Services, API Calls, AsyncStorage         │
└──────────────┬────────────────────────────┘
               │
┌──────────────▼────────────────────────────┐
│         BACKEND API                        │
│  REST API (Node.js + Express)              │
└───────────────────────────────────────────┘
```

---

## 3. ESTRUCTURA DEL PROYECTO

```
genesispro-mobile/
├── src/
│   ├── screens/                    # Pantallas principales
│   │   ├── Auth/
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   ├── ForgotPasswordScreen.js
│   │   │   └── OnboardingScreen.js
│   │   ├── Home/
│   │   │   ├── HomeScreen.js          # Dashboard principal
│   │   │   └── NotificationsScreen.js
│   │   ├── Aves/
│   │   │   ├── AvesListScreen.js      # Lista de aves
│   │   │   ├── AveDetailScreen.js     # Detalle del ave
│   │   │   ├── AveFormScreen.js       # Crear/Editar ave
│   │   │   ├── GenealogyScreen.js     # Árbol genealógico
│   │   │   ├── PhotoGalleryScreen.js  # Galería fotos
│   │   │   └── QRScannerScreen.js     # Escanear QR
│   │   ├── Combates/
│   │   │   ├── CombatesListScreen.js
│   │   │   ├── CombateDetailScreen.js
│   │   │   ├── CombateFormScreen.js
│   │   │   └── EstadisticasScreen.js
│   │   ├── Salud/
│   │   │   ├── SaludDashboardScreen.js
│   │   │   ├── VacunasScreen.js
│   │   │   ├── TratamientosScreen.js
│   │   │   └── CalendarioSaludScreen.js
│   │   ├── Finanzas/
│   │   │   ├── FinanzasDashboardScreen.js
│   │   │   ├── TransaccionesScreen.js
│   │   │   └── ReportesScreen.js
│   │   ├── Alimentacion/
│   │   │   ├── AlimentacionScreen.js
│   │   │   └── InventarioScreen.js
│   │   ├── Calendario/
│   │   │   ├── CalendarioScreen.js
│   │   │   └── EventoFormScreen.js
│   │   ├── Analytics/
│   │   │   ├── DashboardScreen.js
│   │   │   ├── RendimientoScreen.js
│   │   │   └── ComparativaScreen.js
│   │   ├── Suscripcion/
│   │   │   ├── PlanesScreen.js
│   │   │   ├── SuscripcionScreen.js
│   │   │   └── PaywallScreen.js
│   │   └── Profile/
│   │       ├── ProfileScreen.js
│   │       ├── SettingsScreen.js
│   │       └── HelpScreen.js
│   │
│   ├── components/                 # Componentes reutilizables
│   │   ├── common/
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   ├── Card.js
│   │   │   ├── Header.js
│   │   │   ├── Loading.js
│   │   │   ├── EmptyState.js
│   │   │   ├── ErrorState.js
│   │   │   ├── SearchBar.js
│   │   │   ├── FilterChips.js
│   │   │   └── Avatar.js
│   │   ├── aves/
│   │   │   ├── AveCard.js
│   │   │   ├── AveListItem.js
│   │   │   ├── GenealogyTree.js
│   │   │   ├── PhotoCarousel.js
│   │   │   ├── QRCodeDisplay.js
│   │   │   └── StatsCard.js
│   │   ├── combates/
│   │   │   ├── CombateCard.js
│   │   │   ├── ResultBadge.js
│   │   │   └── EstadisticasWidget.js
│   │   ├── charts/
│   │   │   ├── LineChart.js
│   │   │   ├── BarChart.js
│   │   │   ├── PieChart.js
│   │   │   └── ProgressRing.js
│   │   └── forms/
│   │       ├── FormInput.js
│   │       ├── FormSelect.js
│   │       ├── FormDatePicker.js
│   │       └── FormImagePicker.js
│   │
│   ├── navigation/                 # Configuración de navegación
│   │   ├── AppNavigator.js        # Navegador principal
│   │   ├── AuthNavigator.js       # Stack de autenticación
│   │   ├── MainTabNavigator.js    # Bottom tabs
│   │   └── linking.js             # Deep linking config
│   │
│   ├── services/                   # Servicios y API
│   │   ├── api.js                 # Configuración Axios
│   │   ├── authService.js
│   │   ├── avesService.js
│   │   ├── combatesService.js
│   │   ├── saludService.js
│   │   ├── finanzasService.js
│   │   ├── analyticsService.js
│   │   └── storageService.js      # AsyncStorage helpers
│   │
│   ├── hooks/                      # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useAves.js
│   │   ├── useCombates.js
│   │   ├── useOfflineSync.js
│   │   ├── useNotifications.js
│   │   ├── usePlanLimits.js
│   │   └── useImagePicker.js
│   │
│   ├── context/                    # Context providers
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   ├── OfflineContext.js
│   │   └── NotificationContext.js
│   │
│   ├── utils/                      # Utilidades
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   ├── dateUtils.js
│   │   └── errorHandler.js
│   │
│   ├── constants/                  # Constantes
│   │   ├── colors.js              # Paleta de colores
│   │   ├── theme.js               # Tema de la app
│   │   ├── api.js                 # URLs y endpoints
│   │   ├── strings.js             # Textos en español
│   │   └── dimensions.js          # Tamaños y espaciados
│   │
│   └── assets/                     # Assets locales (si no en /assets)
│
├── assets/                         # Assets globales
│   ├── images/
│   │   ├── logo.png
│   │   ├── logo-white.png
│   │   ├── splash.png
│   │   ├── onboarding/
│   │   │   ├── onboarding1.png
│   │   │   ├── onboarding2.png
│   │   │   └── onboarding3.png
│   │   └── placeholders/
│   │       ├── avatar-placeholder.png
│   │       └── image-placeholder.png
│   ├── icons/
│   │   ├── icon.png               # App icon
│   │   └── adaptive-icon.png
│   └── fonts/ (opcional)
│
├── App.js                          # Punto de entrada
├── app.json                        # Configuración Expo
├── babel.config.js
├── package.json
├── .gitignore
└── README.md
```

---

## 4. DISEÑO UI/UX

### 4.1 Paleta de Colores (Tema Claro)

```javascript
// src/constants/colors.js

export const COLORS = {
  // Colores primarios
  primary: '#2E7D32',        // Verde oscuro (inspirado en naturaleza/aves)
  primaryLight: '#4CAF50',   // Verde medio
  primaryDark: '#1B5E20',    // Verde muy oscuro
  
  // Colores secundarios
  secondary: '#FF6B35',      // Naranja (energía, combates)
  secondaryLight: '#FF8A5B',
  secondaryDark: '#D84315',
  
  // Colores de éxito/error/warning
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Tonos de gris
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  text: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  
  border: '#E0E0E0',
  divider: '#EEEEEE',
  
  // Estados
  disabled: '#BDBDBD',
  placeholder: '#9E9E9E',
  
  // Gradientes
  gradientStart: '#2E7D32',
  gradientEnd: '#1B5E20',
};

export const DARK_COLORS = {
  // Tema oscuro (Fase 2)
  primary: '#4CAF50',
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2C2C2C',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  // ... resto de colores para dark mode
};
```

### 4.2 Tipografía

```javascript
// src/constants/theme.js

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
};
```

### 4.3 Espaciado y Dimensiones

```javascript
// src/constants/dimensions.js

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

export const SIZES = {
  avatarSmall: 40,
  avatarMedium: 64,
  avatarLarge: 80,
  
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
  
  buttonHeight: 48,
  inputHeight: 56,
  
  headerHeight: 56,
  tabBarHeight: 60,
};
```

### 4.4 Principios de Diseño

**Consistencia:**
- Usar componentes de React Native Paper para mantener consistencia
- Seguir Material Design guidelines
- Reutilizar componentes comunes

**Accesibilidad:**
- Tamaños de texto legibles (mínimo 14px)
- Contraste adecuado (WCAG 2.1 AA)
- Touch targets de mínimo 44x44px
- Labels accesibles en todos los campos

**Feedback Visual:**
- Loading states para todas las operaciones asíncronas
- Error states claros y accionables
- Success confirmations
- Animaciones sutiles (evitar exceso)

**Responsive:**
- Adaptar a diferentes tamaños de pantalla
- Considerar tablets (aunque no prioritario)
- Landscape mode para gráficas

---

## 5. NAVEGACIÓN

### 5.1 Estructura de Navegación

```javascript
// src/navigation/AppNavigator.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import SplashScreen from '../screens/SplashScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <SplashScreen />;
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 5.2 Auth Stack

```javascript
// src/navigation/AuthNavigator.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="Onboarding"
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
```

### 5.3 Main Tab Navigator

```javascript
// src/navigation/MainTabNavigator.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

// Stacks para cada tab
import HomeStack from './stacks/HomeStack';
import AvesStack from './stacks/AvesStack';
import CombatesStack from './stacks/CombatesStack';
import AnalyticsStack from './stacks/AnalyticsStack';
import MoreStack from './stacks/MoreStack';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'AvesTab':
              iconName = focused ? 'bird' : 'bird';
              break;
            case 'CombatesTab':
              iconName = focused ? 'sword-cross' : 'sword-cross';
              break;
            case 'AnalyticsTab':
              iconName = focused ? 'chart-line' : 'chart-line';
              break;
            case 'MoreTab':
              iconName = focused ? 'menu' : 'menu';
              break;
          }
          
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack} 
        options={{ title: 'Inicio' }}
      />
      <Tab.Screen 
        name="AvesTab" 
        component={AvesStack} 
        options={{ title: 'Aves' }}
      />
      <Tab.Screen 
        name="CombatesTab" 
        component={CombatesStack} 
        options={{ title: 'Combates' }}
      />
      <Tab.Screen 
        name="AnalyticsTab" 
        component={AnalyticsStack} 
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="MoreTab" 
        component={MoreStack} 
        options={{ title: 'Más' }}
      />
    </Tab.Navigator>
  );
}
```

### 5.4 Ejemplo de Stack (Aves)

```javascript
// src/navigation/stacks/AvesStack.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AvesListScreen from '../../screens/Aves/AvesListScreen';
import AveDetailScreen from '../../screens/Aves/AveDetailScreen';
import AveFormScreen from '../../screens/Aves/AveFormScreen';
import GenealogyScreen from '../../screens/Aves/GenealogyScreen';
import PhotoGalleryScreen from '../../screens/Aves/PhotoGalleryScreen';
import QRScannerScreen from '../../screens/Aves/QRScannerScreen';

const Stack = createStackNavigator();

export default function AvesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="AvesList" 
        component={AvesListScreen} 
        options={{ title: 'Mis Aves' }}
      />
      <Stack.Screen 
        name="AveDetail" 
        component={AveDetailScreen} 
        options={{ title: 'Detalle del Ave' }}
      />
      <Stack.Screen 
        name="AveForm" 
        component={AveFormScreen} 
        options={({ route }) => ({ 
          title: route.params?.aveId ? 'Editar Ave' : 'Crear Ave' 
        })}
      />
      <Stack.Screen 
        name="Genealogy" 
        component={GenealogyScreen} 
        options={{ title: 'Árbol Genealógico' }}
      />
      <Stack.Screen 
        name="PhotoGallery" 
        component={PhotoGalleryScreen} 
        options={{ title: 'Galería de Fotos' }}
      />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen} 
        options={{ title: 'Escanear QR' }}
      />
    </Stack.Navigator>
  );
}
```

---

## 6. PANTALLAS PRINCIPALES

### 6.1 Splash Screen

```javascript
// src/screens/SplashScreen.js

import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { COLORS } from '../constants/colors';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator 
        size="large" 
        color={COLORS.primary} 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  loader: {
    marginTop: 24,
  },
});
```

### 6.2 Login Screen

```javascript
// src/screens/Auth/LoginScreen.js

import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, SPACING } from '../../constants';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login, isLoading } = useAuth();
  
  const handleLogin = async () => {
    // Validación básica
    const newErrors = {};
    if (!email) newErrors.email = 'El email es requerido';
    if (!password) newErrors.password = 'La contraseña es requerida';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      await login(email, password);
    } catch (error) {
      setErrors({ general: error.message });
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Image 
          source={require('../../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text variant="headlineMedium" style={styles.title}>
          Bienvenido a GenesisPro
        </Text>
        
        <Text variant="bodyMedium" style={styles.subtitle}>
          Gestiona tus aves de forma profesional
        </Text>
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.email}>
          {errors.email}
        </HelperText>
        
        <TextInput
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon 
              icon={showPassword ? 'eye-off' : 'eye'} 
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          error={!!errors.password}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.password}>
          {errors.password}
        </HelperText>
        
        {errors.general && (
          <HelperText type="error" visible={true} style={styles.errorGeneral}>
            {errors.general}
          </HelperText>
        )}
        
        <Button 
          mode="contained" 
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Iniciar Sesión
        </Button>
        
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotButton}
        >
          ¿Olvidaste tu contraseña?
        </Button>
        
        <View style={styles.registerContainer}>
          <Text variant="bodyMedium">¿No tienes cuenta? </Text>
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('Register')}
            compact
          >
            Regístrate
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
    color: COLORS.text,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: SPACING.xl,
    color: COLORS.textSecondary,
  },
  input: {
    marginBottom: SPACING.xs,
  },
  button: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  forgotButton: {
    marginTop: SPACING.sm,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  errorGeneral: {
    textAlign: 'center',
  },
});
```

### 6.3 Home Screen (Dashboard)

```javascript
// src/screens/Home/HomeScreen.js

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, FAB } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING } from '../../constants';
import { getDashboardData } from '../../services/analyticsService';
import StatsCard from '../../components/common/StatsCard';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';

export default function HomeScreen({ navigation }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
  });
  
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header con saludo */}
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Title>¡Hola, {data?.user?.nombre}! 👋</Title>
            <Paragraph>Aquí está el resumen de tu operación</Paragraph>
          </Card.Content>
        </Card>
        
        {/* KPIs principales */}
        <View style={styles.statsGrid}>
          <StatsCard 
            title="Aves Activas"
            value={data?.stats?.totalAves || 0}
            icon="bird"
            color={COLORS.primary}
          />
          <StatsCard 
            title="Combates (Mes)"
            value={data?.stats?.combatesMes || 0}
            icon="sword-cross"
            color={COLORS.secondary}
          />
          <StatsCard 
            title="% Victorias"
            value={`${data?.stats?.porcentajeVictorias || 0}%`}
            icon="trophy"
            color={COLORS.success}
          />
          <StatsCard 
            title="ROI Global"
            value={`$${data?.stats?.roiGlobal || 0}`}
            icon="currency-usd"
            color={COLORS.info}
          />
        </View>
        
        {/* Alertas y recordatorios */}
        {data?.alertas?.length > 0 && (
          <Card style={styles.alertasCard}>
            <Card.Content>
              <Title>Alertas Pendientes</Title>
              {data.alertas.map((alerta, index) => (
                <View key={index} style={styles.alertaItem}>
                  <Paragraph>• {alerta.mensaje}</Paragraph>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
        
        {/* Próximos eventos */}
        {data?.proximosEventos?.length > 0 && (
          <Card style={styles.eventosCard}>
            <Card.Content>
              <Title>Próximos Eventos</Title>
              {data.proximosEventos.map((evento, index) => (
                <View key={index} style={styles.eventoItem}>
                  <Paragraph>{evento.titulo} - {evento.fecha}</Paragraph>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      
      {/* FAB para crear ave */}
      <FAB
        icon="plus"
        label="Nueva Ave"
        style={styles.fab}
        onPress={() => navigation.navigate('AvesTab', { screen: 'AveForm' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    padding: SPACING.md,
  },
  welcomeCard: {
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  alertasCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.warning + '20',
  },
  alertaItem: {
    marginTop: SPACING.xs,
  },
  eventosCard: {
    marginBottom: SPACING.md,
  },
  eventoItem: {
    marginTop: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
});
```

### 6.4 Aves List Screen

```javascript
// src/screens/Aves/AvesListScreen.js

import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Searchbar, FAB, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING } from '../../constants';
import { getAves } from '../../services/avesService';
import AveCard from '../../components/aves/AveCard';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';

export default function AvesListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  
  const { data: aves, isLoading, refetch } = useQuery({
    queryKey: ['aves'],
    queryFn: getAves,
  });
  
  // Filtrar aves
  const filteredAves = aves?.filter(ave => {
    const matchesSearch = ave.codigo_identidad.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ave.color?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'todos' ||
                          (selectedFilter === 'machos' && ave.sexo === 'M') ||
                          (selectedFilter === 'hembras' && ave.sexo === 'H') ||
                          (selectedFilter === 'venta' && ave.disponible_venta);
    
    return matchesSearch && matchesFilter;
  });
  
  if (isLoading) return <Loading />;
  
  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Buscar aves..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filtersContainer}>
          <Chip 
            selected={selectedFilter === 'todos'}
            onPress={() => setSelectedFilter('todos')}
            style={styles.chip}
          >
            Todos
          </Chip>
          <Chip 
            selected={selectedFilter === 'machos'}
            onPress={() => setSelectedFilter('machos')}
            style={styles.chip}
          >
            Machos
          </Chip>
          <Chip 
            selected={selectedFilter === 'hembras'}
            onPress={() => setSelectedFilter('hembras')}
            style={styles.chip}
          >
            Hembras
          </Chip>
          <Chip 
            selected={selectedFilter === 'venta'}
            onPress={() => setSelectedFilter('venta')}
            style={styles.chip}
          >
            En Venta
          </Chip>
        </View>
      </View>
      
      <FlatList
        data={filteredAves}
        renderItem={({ item }) => (
          <AveCard 
            ave={item} 
            onPress={() => navigation.navigate('AveDetail', { aveId: item.id })}
          />
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="bird"
            title="No hay aves"
            message="Crea tu primera ave para comenzar"
          />
        }
        refreshing={isLoading}
        onRefresh={refetch}
      />
      
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AveForm')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  searchbar: {
    marginBottom: SPACING.sm,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  listContent: {
    padding: SPACING.md,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
});
```

### 6.5 Ave Detail Screen

**Nota:** Por brevedad, incluyo la estructura básica. Implementar pestañas para:
- Información general
- Fotos
- Genealogía
- Combates (si es macho)
- Salud
- Mediciones

```javascript
// src/screens/Aves/AveDetailScreen.js

import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Divider } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getAveById } from '../../services/avesService';
import { COLORS, SPACING } from '../../constants';
import Loading from '../../components/common/Loading';

export default function AveDetailScreen({ route, navigation }) {
  const { aveId } = route.params;
  
  const { data: ave, isLoading } = useQuery({
    queryKey: ['ave', aveId],
    queryFn: () => getAveById(aveId),
  });
  
  if (isLoading) return <Loading />;
  
  return (
    <ScrollView style={styles.container}>
      {/* Foto principal */}
      <Image 
        source={{ uri: ave.foto_principal || 'placeholder' }} 
        style={styles.mainImage}
      />
      
      {/* Info básica */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title>{ave.codigo_identidad}</Title>
          <View style={styles.chipContainer}>
            <Chip icon="gender-male-female">{ave.sexo === 'M' ? 'Macho' : 'Hembra'}</Chip>
            <Chip icon="palette">{ave.color}</Chip>
            <Chip icon="dna">{ave.linea_genetica}</Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <Paragraph>Nacimiento: {new Date(ave.fecha_nacimiento).toLocaleDateString()}</Paragraph>
          <Paragraph>Peso nacimiento: {ave.peso_nacimiento} kg</Paragraph>
          <Paragraph>Peso 3 meses: {ave.peso_3meses} kg</Paragraph>
        </Card.Content>
      </Card>
      
      {/* Botones de acción */}
      <View style={styles.actionsContainer}>
        <Button 
          mode="contained" 
          icon="camera"
          onPress={() => navigation.navigate('PhotoGallery', { aveId })}
          style={styles.actionButton}
        >
          Ver Fotos
        </Button>
        
        <Button 
          mode="contained" 
          icon="family-tree"
          onPress={() => navigation.navigate('Genealogy', { aveId })}
          style={styles.actionButton}
        >
          Genealogía
        </Button>
        
        <Button 
          mode="contained" 
          icon="qrcode"
          onPress={() => {/* Mostrar QR */}}
          style={styles.actionButton}
        >
          Ver QR
        </Button>
      </View>
      
      {/* Más secciones... */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainImage: {
    width: '100%',
    height: 250,
    backgroundColor: COLORS.divider,
  },
  infoCard: {
    margin: SPACING.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  divider: {
    marginVertical: SPACING.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
});
```

---

## 7. COMPONENTES REUTILIZABLES

### 7.1 AveCard Component

```javascript
// src/components/aves/AveCard.js

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Chip } from 'react-native-paper';
import { COLORS, SPACING } from '../../constants';

export default function AveCard({ ave, onPress }) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <Image 
          source={{ uri: ave.foto_principal || 'placeholder' }}
          style={styles.image}
        />
        
        <View style={styles.info}>
          <Title style={styles.title}>{ave.codigo_identidad}</Title>
          
          <View style={styles.chips}>
            <Chip 
              icon="gender-male-female" 
              compact 
              style={styles.chip}
            >
              {ave.sexo === 'M' ? 'Macho' : 'Hembra'}
            </Chip>
            
            {ave.color && (
              <Chip compact style={styles.chip}>
                {ave.color}
              </Chip>
            )}
          </View>
          
          <Paragraph style={styles.date}>
            {new Date(ave.fecha_nacimiento).toLocaleDateString()}
          </Paragraph>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.divider,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 18,
    marginBottom: SPACING.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chip: {
    height: 24,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
```

### 7.2 StatsCard Component

```javascript
// src/components/common/StatsCard.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants';

export default function StatsCard({ title, value, icon, color = COLORS.primary }) {
  return (
    <Card style={[styles.card, { borderLeftColor: color }]}>
      <Card.Content style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={icon} size={32} color={color} />
        </View>
        
        <View style={styles.textContainer}>
          <Title style={styles.value}>{value}</Title>
          <Paragraph style={styles.title}>{title}</Paragraph>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  title: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
```

### 7.3 Loading Component

```javascript
// src/components/common/Loading.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { COLORS } from '../../constants';

export default function Loading({ message = 'Cargando...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    marginTop: 16,
    color: COLORS.textSecondary,
  },
});
```

### 7.4 EmptyState Component

```javascript
// src/components/common/EmptyState.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants';

export default function EmptyState({ icon, title, message }) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons 
        name={icon} 
        size={64} 
        color={COLORS.textDisabled} 
      />
      <Text variant="titleLarge" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.text,
  },
  message: {
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
});
```

---

## 8. INTEGRACIÓN CON API

### 8.1 Configuración de Axios

```javascript
// src/services/api.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__ 
  ? 'http://localhost:3000/api/v1'  // Desarrollo
  : 'https://api.genesispro.com/api/v1';  // Producción

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado - logout
      await AsyncStorage.removeItem('token');
      // Navegar a login (implementar con navigation ref)
    }
    
    const message = error.response?.data?.error || 'Error de conexión';
    return Promise.reject(new Error(message));
  }
);

export default api;
```

### 8.2 Auth Service

```javascript
// src/services/authService.js

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  },
  
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    await AsyncStorage.setItem('token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  },
  
  async logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await api.post('/auth/logout');
  },
  
  async getCurrentUser() {
    const userJson = await AsyncStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },
  
  async forgotPassword(email) {
    return await api.post('/auth/forgot-password', { email });
  },
};
```

### 8.3 Aves Service

```javascript
// src/services/avesService.js

import api from './api';

export const getAves = async () => {
  const response = await api.get('/aves');
  return response.data;
};

export const getAveById = async (id) => {
  const response = await api.get(`/aves/${id}`);
  return response.data;
};

export const createAve = async (aveData) => {
  const response = await api.post('/aves', aveData);
  return response.data;
};

export const updateAve = async (id, aveData) => {
  const response = await api.put(`/aves/${id}`, aveData);
  return response.data;
};

export const deleteAve = async (id) => {
  const response = await api.delete(`/aves/${id}`);
  return response.data;
};

export const uploadAvePhoto = async (aveId, photoUri) => {
  const formData = new FormData();
  formData.append('foto', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });
  
  const response = await api.post(`/aves/${aveId}/fotos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};
```

---

## 9. GESTIÓN DE ESTADO

### 9.1 Auth Context

```javascript
// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadUser();
  }, []);
  
  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    return data;
  };
  
  const register = async (userData) => {
    const data = await authService.register(userData);
    setUser(data.user);
    return data;
  };
  
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 9.2 React Query Setup

```javascript
// App.js

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
```

---

## 10. MODO OFFLINE

### 10.1 Offline Context

```javascript
// src/context/OfflineContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [pendingActions, setPendingActions] = useState([]);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      if (state.isConnected) {
        syncPendingActions();
      }
    });
    
    loadPendingActions();
    
    return () => unsubscribe();
  }, []);
  
  const loadPendingActions = async () => {
    const actions = await AsyncStorage.getItem('pendingActions');
    if (actions) {
      setPendingActions(JSON.parse(actions));
    }
  };
  
  const addPendingAction = async (action) => {
    const newActions = [...pendingActions, action];
    setPendingActions(newActions);
    await AsyncStorage.setItem('pendingActions', JSON.stringify(newActions));
  };
  
  const syncPendingActions = async () => {
    // Implementar lógica de sincronización
    for (const action of pendingActions) {
      try {
        // Ejecutar acción pendiente
        await executeAction(action);
      } catch (error) {
        console.error('Error syncing action:', error);
      }
    }
    
    setPendingActions([]);
    await AsyncStorage.removeItem('pendingActions');
  };
  
  const executeAction = async (action) => {
    // Implementar según tipo de acción
  };
  
  return (
    <OfflineContext.Provider value={{ 
      isConnected, 
      pendingActions, 
      addPendingAction 
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
```

---

## 11. NOTIFICACIONES PUSH

### 11.1 Configuración de Notificaciones

```javascript
// src/services/notificationService.js

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  async registerForPushNotifications() {
    let token;
    
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }
    
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    return token;
  },
  
  async scheduleLocalNotification(title, body, date) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: date,
    });
  },
};
```

---

## 12. PLAN DE DESARROLLO POR FASES

### FASE 1: Setup y Autenticación (Semana 1)

**Tareas:**
1. ✅ Crear proyecto con Expo
2. ✅ Configurar estructura de carpetas
3. ✅ Instalar dependencias
4. ✅ Configurar navegación básica
5. ✅ Implementar Login screen
6. ✅ Implementar Register screen
7. ✅ Configurar Auth Context
8. ✅ Integrar con API de auth
9. ✅ Implementar AsyncStorage
10. ✅ Testing manual

**Entregables:**
- Login/Registro funcional
- Navegación Auth ↔ Main
- Token guardado localmente

---

### FASE 2: Dashboard y Lista de Aves (Semana 2)

**Tareas:**
1. ✅ Home screen con dashboard
2. ✅ Aves list screen
3. ✅ AveCard component
4. ✅ Búsqueda y filtros
5. ✅ Integración con React Query
6. ✅ Pull to refresh
7. ✅ Estados de loading/error/empty
8. ✅ FAB para crear ave

**Entregables:**
- Dashboard operativo
- Lista de aves funcional
- Filtros funcionando

---

### FASE 3: Crear/Editar Ave + Fotos (Semana 3)

**Tareas:**
1. ✅ AveFormScreen (crear/editar)
2. ✅ React Hook Form setup
3. ✅ Validaciones de formulario
4. ✅ expo-image-picker integración
5. ✅ Upload de fotos
6. ✅ Galería de fotos
7. ✅ Foto principal destacada
8. ✅ AveDetailScreen básico

**Entregables:**
- Crear ave funcional
- Upload de fotos operativo
- Editar ave funcional

---

### FASE 4: Genealogía y Combates (Semana 4-5)

**Tareas:**
1. ✅ Selector de padres (dropdown con búsqueda)
2. ✅ Componente GenealogyTree
3. ✅ Visualización de árbol (react-native-svg)
4. ✅ CombatesListScreen
5. ✅ CombateFormScreen
6. ✅ Estadísticas de combate
7. ✅ Gráficas con Victory Native

**Entregables:**
- Árbol genealógico visual
- Registro de combates operativo
- Estadísticas básicas

---

### FASE 5: QR, Analytics y Planes (Semana 6-7)

**Tareas:**
1. ✅ Generación de QR
2. ✅ Scanner de QR
3. ✅ Analytics dashboard
4. ✅ Gráficas avanzadas
5. ✅ Pantalla de planes
6. ✅ Paywall screens
7. ✅ Integración Stripe (web view)
8. ✅ Plan limits en frontend

**Entregables:**
- QR funcional
- Analytics operativo
- Suscripciones funcionando

---

### FASE 6: Salud, Finanzas, Calendario (Semana 8-9)

**Tareas:**
1. ✅ Módulos de salud
2. ✅ Dashboard financiero
3. ✅ Calendario con react-native-calendars
4. ✅ Notificaciones push setup
5. ✅ Recordatorios locales

**Entregables:**
- Gestión de salud completa
- Finanzas operativas
- Calendario funcional

---

### FASE 7: Offline Mode y Optimización (Semana 10)

**Tareas:**
1. ✅ AsyncStorage para caché
2. ✅ Cola de sincronización
3. ✅ Indicadores de offline
4. ✅ Optimización de imágenes
5. ✅ Lazy loading
6. ✅ Performance optimization

**Entregables:**
- Modo offline funcional
- App optimizada

---

### FASE 8: Testing y Polish (Semana 11)

**Tareas:**
1. ✅ Testing manual completo
2. ✅ Corrección de bugs
3. ✅ UI/UX polish
4. ✅ Splash screen
5. ✅ App icon
6. ✅ Onboarding screens

**Entregables:**
- App estable
- UX pulido
- Lista para deploy

---

## 13. CONFIGURACIÓN INICIAL

### 13.1 Crear Proyecto

```bash
# Crear proyecto Expo
npx create-expo-app genesispro-mobile --template blank

cd genesispro-mobile

# Instalar dependencias core
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# UI Library
npm install react-native-paper

# Data fetching y formularios
npm install axios @tanstack/react-query react-hook-form

# Funcionalidades específicas
npx expo install expo-image-picker expo-barcode-scanner expo-notifications
npx expo install @react-native-async-storage/async-storage expo-file-system

npm install react-native-qrcode-svg react-native-calendars
npm install victory-native react-native-chart-kit

# Testing
npm install --save-dev jest @testing-library/react-native
```

### 13.2 Configurar app.json

```json
{
  "expo": {
    "name": "GenesisPro",
    "slug": "genesispro",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icons/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2E7D32"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.genesispro.app",
      "buildNumber": "1.0.0"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icons/adaptive-icon.png",
        "backgroundColor": "#2E7D32"
      },
      "package": "com.genesispro.app",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/icons/favicon.png"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icons/notification-icon.png",
          "color": "#2E7D32"
        }
      ]
    ]
  }
}
```

### 13.3 Configurar .env

```env
API_URL=http://localhost:3000/api/v1
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 14. COMANDOS ÚTILES

```bash
# Desarrollo
npm start                    # Iniciar Expo
npm run android             # Android emulator
npm run ios                 # iOS simulator
npm run web                 # Web browser

# Testing
npm test                    # Run tests
npm run test:watch         # Watch mode

# Build
expo build:android         # Build Android
expo build:ios            # Build iOS
eas build --platform all  # Usando EAS Build

# Publicar
expo publish              # Publicar a Expo
eas submit               # Submit a stores
```

---

## CONCLUSIÓN Y PRÓXIMOS PASOS

Este prompt proporciona toda la información necesaria para comenzar el desarrollo del frontend de GenesisPro.

**Próximos pasos recomendados:**

1. ✅ Configurar proyecto inicial
2. ✅ Implementar autenticación (Fase 1)
3. ✅ Crear dashboard y lista de aves (Fase 2)
4. ✅ Continuar según plan de fases
5. ✅ Iterar con feedback del backend

**Recursos importantes:**
- Documentación técnica completa: `GenesisPro_Documentacion_Tecnica_Completa.md`
- React Native Paper: https://callstack.github.io/react-native-paper/
- React Navigation: https://reactnavigation.org/
- React Query: https://tanstack.com/query/latest
- Expo: https://docs.expo.dev/

---

**Desarrollado para:** Rork  
**Proyecto:** GenesisPro Mobile  
**Framework:** React Native + Expo  
**Fecha:** Enero 2025  
**Versión:** 1.0.0

---

## NOTAS FINALES

- **Priorizar MVP:** Enfocarse en funcionalidades core primero
- **Iterar rápido:** Validar con usuarios reales cuanto antes
- **Código limpio:** Componentes reutilizables y bien organizados
- **Performance:** Optimizar desde el principio
- **UX primero:** La app debe ser intuitiva y rápida

¡Éxito con el desarrollo! 🚀
