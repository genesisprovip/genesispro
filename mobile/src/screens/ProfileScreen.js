import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  primary: '#1a472a',
  background: '#f5f5f5',
  white: '#ffffff',
  gray: '#666666',
  danger: '#dc3545',
};

const MenuItem = ({ icon, title, onPress, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon} size={24} color={danger ? COLORS.danger : COLORS.primary} />
    <Text style={[styles.menuText, danger && { color: COLORS.danger }]}>{title}</Text>
    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
  </TouchableOpacity>
);

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color={COLORS.white} />
        </View>
        <Text style={styles.name}>{user?.nombre} {user?.apellido}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planText}>Plan {user?.plan_actual || 'Básico'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <MenuItem icon="person-outline" title="Editar Perfil" onPress={() => {}} />
        <MenuItem icon="lock-closed-outline" title="Cambiar Contraseña" onPress={() => {}} />
        <MenuItem icon="notifications-outline" title="Notificaciones" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suscripción</Text>
        <MenuItem icon="card-outline" title="Mi Plan" onPress={() => {}} />
        <MenuItem icon="star-outline" title="Mejorar Plan" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soporte</Text>
        <MenuItem icon="help-circle-outline" title="Ayuda" onPress={() => {}} />
        <MenuItem icon="chatbubble-outline" title="Contactar Soporte" onPress={() => {}} />
        <MenuItem icon="document-text-outline" title="Términos y Condiciones" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <MenuItem icon="log-out-outline" title="Cerrar Sesión" onPress={logout} danger />
      </View>

      <Text style={styles.version}>GenesisPro v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  planBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  planText: {
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.primary,
  },
  version: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 12,
    marginVertical: 24,
  },
});

export default ProfileScreen;
