import React, { useState, useEffect } from 'react';
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
import { finanzasAPI } from '../../services/api';

const COLORS = {
  primary: '#1a472a',
  background: '#f5f5f5',
  white: '#ffffff',
  gray: '#666666',
  success: '#28a745',
  danger: '#dc3545',
};

const FinanzasScreen = () => {
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        finanzasAPI.getDashboard(),
        finanzasAPI.getStats('mes'),
      ]);
      setDashboard(dashboardRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading finanzas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const balance = parseFloat(dashboard?.balance || stats?.balance || 0);
  const ingresos = parseFloat(dashboard?.total_ingresos || stats?.ingresos || 0);
  const egresos = parseFloat(dashboard?.total_egresos || stats?.egresos || 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Balance Total</Text>
        <Text style={[styles.balanceValue, { color: balance >= 0 ? COLORS.success : COLORS.danger }]}>
          ${balance.toLocaleString()}
        </Text>
        <View style={styles.balanceDetails}>
          <View style={styles.balanceItem}>
            <Ionicons name="arrow-up-circle" size={20} color={COLORS.success} />
            <Text style={styles.balanceItemLabel}>Ingresos</Text>
            <Text style={[styles.balanceItemValue, { color: COLORS.success }]}>
              ${ingresos.toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Ionicons name="arrow-down-circle" size={20} color={COLORS.danger} />
            <Text style={styles.balanceItemLabel}>Egresos</Text>
            <Text style={[styles.balanceItemValue, { color: COLORS.danger }]}>
              ${egresos.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.success + '20' }]}>
          <Ionicons name="add-circle" size={32} color={COLORS.success} />
          <Text style={[styles.actionText, { color: COLORS.success }]}>Ingreso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.danger + '20' }]}>
          <Ionicons name="remove-circle" size={32} color={COLORS.danger} />
          <Text style={[styles.actionText, { color: COLORS.danger }]}>Egreso</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumen del Mes</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.num_ingresos || 0}</Text>
            <Text style={styles.statLabel}>Ingresos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.num_egresos || 0}</Text>
            <Text style={styles.statLabel}>Egresos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total_transacciones || 0}</Text>
            <Text style={styles.statLabel}>Total Trans.</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.aves_con_movimientos || 0}</Text>
            <Text style={styles.statLabel}>Aves</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Acciones</Text>
        </View>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="list" size={24} color={COLORS.primary} />
          <Text style={styles.menuText}>Ver Transacciones</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="pie-chart" size={24} color={COLORS.primary} />
          <Text style={styles.menuText}>Por Categoría</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="trending-up" size={24} color={COLORS.primary} />
          <Text style={styles.menuText}>ROI por Ave</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="calendar" size={24} color={COLORS.primary} />
          <Text style={styles.menuText}>Resumen Mensual</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>
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
  balanceCard: {
    backgroundColor: COLORS.primary,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  balanceDetails: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  balanceItemLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  balanceItemValue: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  actionText: {
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.primary,
  },
});

export default FinanzasScreen;
