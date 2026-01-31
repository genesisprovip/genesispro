import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { combatesAPI } from '../../services/api';

const COLORS = {
  primary: '#1a472a',
  background: '#f5f5f5',
  white: '#ffffff',
  gray: '#666666',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
};

const CombateCard = ({ combate }) => {
  const resultColors = {
    victoria: COLORS.success,
    derrota: COLORS.danger,
    empate: COLORS.warning,
  };

  return (
    <View style={styles.card}>
      <View style={[styles.resultBadge, { backgroundColor: resultColors[combate.resultado] }]}>
        <Text style={styles.resultText}>{combate.resultado?.toUpperCase()}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.codigo}>{combate.ave?.codigo_identidad || 'Ave'}</Text>
        <Text style={styles.fecha}>{combate.fecha_combate?.split('T')[0]}</Text>
        <Text style={styles.info}>
          {combate.lugar || 'Sin lugar'} • {combate.duracion_minutos || 0} min
        </Text>
      </View>
    </View>
  );
};

const CombatesScreen = () => {
  const [combates, setCombates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [combatesRes, statsRes] = await Promise.all([
        combatesAPI.list({ limit: 20 }),
        combatesAPI.getGlobalStats(),
      ]);
      setCombates(combatesRes.data.data?.combates || []);
      setStats(statsRes.data.data || null);
    } catch (error) {
      console.error('Error loading combates:', error);
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

  return (
    <View style={styles.container}>
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total_combates || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e0e0e0' }]}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.total_victorias || 0}</Text>
            <Text style={styles.statLabel}>Victorias</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>{stats.total_derrotas || 0}</Text>
            <Text style={styles.statLabel}>Derrotas</Text>
          </View>
        </View>
      )}

      <FlatList
        data={combates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CombateCard combate={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#e0e0e0" />
            <Text style={styles.emptyText}>No hay combates registrados</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  resultBadge: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 10,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  codigo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  fecha: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  info: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default CombatesScreen;
