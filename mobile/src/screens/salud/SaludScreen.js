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
import { saludAPI } from '../../services/api';

const COLORS = {
  primary: '#1a472a',
  background: '#f5f5f5',
  white: '#ffffff',
  gray: '#666666',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
};

const AlertCard = ({ alert }) => {
  const prioridadColors = {
    urgente: COLORS.danger,
    alta: COLORS.warning,
    normal: COLORS.info,
  };

  const iconMap = {
    vacuna: 'medical',
    desparasitacion: 'fitness',
    tratamiento: 'bandage',
  };

  return (
    <View style={[styles.alertCard, { borderLeftColor: prioridadColors[alert.prioridad] }]}>
      <View style={[styles.iconContainer, { backgroundColor: prioridadColors[alert.prioridad] + '20' }]}>
        <Ionicons
          name={iconMap[alert.tipo_alerta] || 'alert-circle'}
          size={24}
          color={prioridadColors[alert.prioridad]}
        />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{alert.descripcion}</Text>
        <Text style={styles.alertSubtitle}>{alert.codigo_identidad}</Text>
        <View style={styles.alertFooter}>
          <Text style={[styles.diasText, { color: prioridadColors[alert.prioridad] }]}>
            {alert.dias_restantes <= 0 ? 'Vencido' : `${alert.dias_restantes} días restantes`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const SaludScreen = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [diasAnticipacion, setDiasAnticipacion] = useState(14);

  const loadData = async () => {
    try {
      const response = await saludAPI.getAlertas(diasAnticipacion);
      setAlertas(response.data.data || []);
    } catch (error) {
      console.error('Error loading alertas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [diasAnticipacion]);

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

  const urgentes = alertas.filter((a) => a.prioridad === 'urgente');
  const altas = alertas.filter((a) => a.prioridad === 'alta');
  const normales = alertas.filter((a) => a.prioridad === 'normal');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas de Salud</Text>
        <Text style={styles.headerSubtitle}>Próximos {diasAnticipacion} días</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: COLORS.danger + '20' }]}>
          <Text style={[styles.statNumber, { color: COLORS.danger }]}>{urgentes.length}</Text>
          <Text style={styles.statLabel}>Urgentes</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: COLORS.warning + '20' }]}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{altas.length}</Text>
          <Text style={styles.statLabel}>Alta</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: COLORS.info + '20' }]}>
          <Text style={[styles.statNumber, { color: COLORS.info }]}>{normales.length}</Text>
          <Text style={styles.statLabel}>Normal</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="medical" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Vacunas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="fitness" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Desparasitar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="bandage" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Tratamiento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="clipboard" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Consulta</Text>
        </TouchableOpacity>
      </View>

      {alertas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
          <Text style={styles.emptyText}>No hay alertas pendientes</Text>
          <Text style={styles.emptySubtext}>Todo en orden con tus aves</Text>
        </View>
      ) : (
        <View style={styles.alertsList}>
          {alertas.map((alert, index) => (
            <AlertCard key={index} alert={alert} />
          ))}
        </View>
      )}
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
    backgroundColor: COLORS.white,
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 1,
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  alertsList: {
    padding: 16,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  alertSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  alertFooter: {
    marginTop: 8,
  },
  diasText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
});

export default SaludScreen;
