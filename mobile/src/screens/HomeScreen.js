import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { avesAPI, finanzasAPI, saludAPI, combatesAPI } from '../services/api';

const COLORS = {
  primary: '#1a472a',
  secondary: '#2d5a3d',
  accent: '#4a7c59',
  background: '#f5f5f5',
  white: '#ffffff',
  gray: '#666666',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
};

const StatCard = ({ icon, title, value, color, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </TouchableOpacity>
);

const AlertCard = ({ alert }) => (
  <View style={[styles.alertCard, { borderLeftColor: alert.prioridad === 'urgente' ? COLORS.danger : COLORS.warning }]}>
    <Ionicons
      name={alert.tipo_alerta === 'vacuna' ? 'medical' : alert.tipo_alerta === 'tratamiento' ? 'bandage' : 'fitness'}
      size={20}
      color={alert.prioridad === 'urgente' ? COLORS.danger : COLORS.warning}
    />
    <View style={styles.alertContent}>
      <Text style={styles.alertTitle}>{alert.descripcion}</Text>
      <Text style={styles.alertSubtitle}>{alert.codigo_identidad} - {alert.dias_restantes} días</Text>
    </View>
  </View>
);

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalAves: 0,
    balance: 0,
    alertas: [],
    combatesStats: null,
  });

  const loadData = async () => {
    try {
      const [avesRes, finanzasRes, alertasRes, combatesRes] = await Promise.all([
        avesAPI.list({ limit: 1 }),
        finanzasAPI.getStats('mes'),
        saludAPI.getAlertas(7),
        combatesAPI.getGlobalStats(),
      ]);

      setStats({
        totalAves: avesRes.data.data?.pagination?.total || 0,
        balance: finanzasRes.data.data?.balance || 0,
        alertas: alertasRes.data.data || [],
        combatesStats: combatesRes.data.data || null,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.nombre || 'Usuario'}</Text>
          <Text style={styles.subGreeting}>Bienvenido a GenesisPro</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="leaf"
          title="Total Aves"
          value={stats.totalAves}
          color={COLORS.primary}
          onPress={() => navigation.navigate('Aves')}
        />
        <StatCard
          icon="cash"
          title="Balance"
          value={`$${stats.balance.toLocaleString()}`}
          color={stats.balance >= 0 ? COLORS.success : COLORS.danger}
          onPress={() => navigation.navigate('Finanzas')}
        />
        <StatCard
          icon="trophy"
          title="Victorias"
          value={stats.combatesStats?.total_victorias || 0}
          color={COLORS.warning}
          onPress={() => navigation.navigate('Combates')}
        />
        <StatCard
          icon="alert-circle"
          title="Alertas"
          value={stats.alertas.length}
          color={stats.alertas.length > 0 ? COLORS.danger : COLORS.info}
          onPress={() => navigation.navigate('Salud')}
        />
      </View>

      {stats.alertas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertas de Salud</Text>
          {stats.alertas.slice(0, 3).map((alert, index) => (
            <AlertCard key={index} alert={alert} />
          ))}
          {stats.alertas.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Salud')}
            >
              <Text style={styles.viewAllText}>Ver todas ({stats.alertas.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Aves')}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Nueva Ave</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Combates')}
          >
            <Ionicons name="trophy" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Registrar Combate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Finanzas')}
          >
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Nueva Transacción</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: '1.5%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  alertSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewAllText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logoutText: {
    color: COLORS.danger,
    marginLeft: 8,
    fontSize: 16,
  },
});

export default HomeScreen;
