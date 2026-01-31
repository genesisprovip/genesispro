import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avesAPI, combatesAPI, finanzasAPI } from '../../services/api';

const COLORS = {
  primary: '#1a472a',
  background: '#f5f5f5',
  white: '#ffffff',
  gray: '#666666',
  male: '#2196F3',
  female: '#E91E63',
  success: '#28a745',
  danger: '#dc3545',
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color={COLORS.gray} />
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

const AveDetailScreen = ({ route }) => {
  const { aveId } = route.params;
  const [ave, setAve] = useState(null);
  const [stats, setStats] = useState(null);
  const [roi, setRoi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [aveId]);

  const loadData = async () => {
    try {
      const [aveRes, statsRes, roiRes] = await Promise.all([
        avesAPI.getById(aveId),
        combatesAPI.getStats(aveId).catch(() => null),
        finanzasAPI.getRoiAve(aveId).catch(() => null),
      ]);

      setAve(aveRes.data.data);
      setStats(statsRes?.data?.data || null);
      setRoi(roiRes?.data?.data?.roi || null);
    } catch (error) {
      console.error('Error loading ave:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!ave) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Ave no encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.sexBadge, { backgroundColor: ave.sexo === 'M' ? COLORS.male : COLORS.female }]}>
          <Ionicons name={ave.sexo === 'M' ? 'male' : 'female'} size={24} color={COLORS.white} />
        </View>
        <Text style={styles.codigo}>{ave.codigo_identidad}</Text>
        <View style={[styles.estadoBadge, { backgroundColor: ave.estado === 'activo' ? COLORS.success : '#6c757d' }]}>
          <Text style={styles.estadoText}>{ave.estado}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información General</Text>
        <View style={styles.card}>
          <InfoRow icon="color-palette" label="Color" value={ave.color} />
          <InfoRow icon="git-branch" label="Línea Genética" value={ave.linea_genetica} />
          <InfoRow icon="calendar" label="Fecha Nacimiento" value={ave.fecha_nacimiento?.split('T')[0]} />
          <InfoRow icon="fitness" label="Peso Actual" value={ave.peso_actual ? `${ave.peso_actual}g` : null} />
          <InfoRow icon="layers" label="Generación" value={ave.generacion} />
        </View>
      </View>

      {ave.sexo === 'M' && stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estadísticas de Combate</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.total_combates || 0}</Text>
              <Text style={styles.statLabel}>Combates</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#28a74520' }]}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.victorias || 0}</Text>
              <Text style={styles.statLabel}>Victorias</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#dc354520' }]}>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>{stats.derrotas || 0}</Text>
              <Text style={styles.statLabel}>Derrotas</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.porcentaje_victorias || 0}%</Text>
              <Text style={styles.statLabel}>Efectividad</Text>
            </View>
          </View>
        </View>
      )}

      {roi && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ROI Financiero</Text>
          <View style={styles.card}>
            <View style={styles.roiRow}>
              <Text style={styles.roiLabel}>Ingresos:</Text>
              <Text style={[styles.roiValue, { color: COLORS.success }]}>
                ${roi.total_ingresos?.toLocaleString() || 0}
              </Text>
            </View>
            <View style={styles.roiRow}>
              <Text style={styles.roiLabel}>Egresos:</Text>
              <Text style={[styles.roiValue, { color: COLORS.danger }]}>
                ${roi.total_egresos?.toLocaleString() || 0}
              </Text>
            </View>
            <View style={[styles.roiRow, styles.roiTotal]}>
              <Text style={styles.roiLabel}>Ganancia Neta:</Text>
              <Text style={[styles.roiValue, { color: roi.ganancia_neta >= 0 ? COLORS.success : COLORS.danger }]}>
                ${roi.ganancia_neta?.toLocaleString() || 0}
              </Text>
            </View>
            <View style={styles.roiRow}>
              <Text style={styles.roiLabel}>ROI:</Text>
              <Text style={[styles.roiValue, { color: roi.roi_porcentaje >= 0 ? COLORS.success : COLORS.danger }]}>
                {roi.roi_porcentaje || 0}%
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="git-network-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Genealogía</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="medkit-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Salud</Text>
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
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
  },
  sexBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  codigo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  estadoBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  estadoText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    marginLeft: 12,
    color: COLORS.gray,
    width: 120,
  },
  infoValue: {
    flex: 1,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  roiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  roiTotal: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 12,
  },
  roiLabel: {
    color: COLORS.gray,
  },
  roiValue: {
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  actionText: {
    marginTop: 4,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default AveDetailScreen;
