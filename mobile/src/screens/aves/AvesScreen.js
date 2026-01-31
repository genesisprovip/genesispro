import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avesAPI } from '../../services/api';

const COLORS = {
  primary: '#1a472a',
  background: '#f5f5f5',
  white: '#ffffff',
  gray: '#666666',
  lightGray: '#e0e0e0',
  male: '#2196F3',
  female: '#E91E63',
};

const AveCard = ({ ave, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(ave)}>
    <View style={[styles.sexIndicator, { backgroundColor: ave.sexo === 'M' ? COLORS.male : COLORS.female }]} />
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <Text style={styles.codigo}>{ave.codigo_identidad}</Text>
        <View style={[styles.estadoBadge, { backgroundColor: ave.estado === 'activo' ? '#28a745' : '#6c757d' }]}>
          <Text style={styles.estadoText}>{ave.estado}</Text>
        </View>
      </View>
      <Text style={styles.linea}>{ave.linea_genetica || 'Sin línea'}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.info}>
          <Ionicons name="color-palette-outline" size={14} color={COLORS.gray} /> {ave.color || 'N/A'}
        </Text>
        {ave.peso_actual && (
          <Text style={styles.info}>
            <Ionicons name="fitness-outline" size={14} color={COLORS.gray} /> {ave.peso_actual}g
          </Text>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={24} color={COLORS.lightGray} />
  </TouchableOpacity>
);

const AvesScreen = ({ navigation }) => {
  const [aves, setAves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos'); // todos, M, H
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadAves = async (pageNum = 1, isRefresh = false) => {
    try {
      const params = {
        page: pageNum,
        limit: 20,
        ...(filter !== 'todos' && { sexo: filter }),
        ...(search && { search }),
      };

      const response = await avesAPI.list(params);
      const newAves = response.data.data?.aves || [];
      const pagination = response.data.data?.pagination;

      if (isRefresh || pageNum === 1) {
        setAves(newAves);
      } else {
        setAves((prev) => [...prev, ...newAves]);
      }

      setHasMore(pagination?.page < pagination?.totalPages);
    } catch (error) {
      console.error('Error loading aves:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAves(1, true);
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadAves(1, true);
  }, [filter]);

  const onEndReached = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadAves(nextPage);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadAves(1, true);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="leaf-outline" size={64} color={COLORS.lightGray} />
      <Text style={styles.emptyText}>No hay aves registradas</Text>
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>Agregar primera ave</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {['todos', 'M', 'H'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'todos' ? 'Todos' : f === 'M' ? 'Machos' : 'Hembras'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={aves}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AveCard
              ave={item}
              onPress={(ave) => navigation.navigate('AveDetail', { aveId: ave.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} />
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.gray,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sexIndicator: {
    width: 4,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  codigo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  estadoText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  linea: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  info: {
    fontSize: 12,
    color: COLORS.gray,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default AvesScreen;
