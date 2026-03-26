// ===== Favorites Screen =====
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { interactionService } from '../../services';
import { DramaCard } from '../../components/drama/DramaCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../hooks';
import { COLORS, SPACING } from '../../utils/constants';
import type { Drama } from '../../types';

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation();
  const toast = useToast();
  const [favorites, setFavorites] = useState<Drama[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await interactionService.getFavorites('favorite');
      setFavorites(data);
    } catch {
      toast.error('Failed to load favorites');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadFavorites();
  };

  const renderItem = ({ item }: { item: Drama }) => (
    <DramaCard drama={item} />
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Favorites</Text>
        <Text style={styles.count}>{favorites.length}</Text>
      </View>

      {/* Grid */}
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={(item) => `fav-${item.id}`}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryLight}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptyHint}>
              Tap the heart icon on any drama to add it to your favorites
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backBtn: { color: COLORS.onSurface, fontSize: 24, width: 40 },
  title: { color: COLORS.onSurface, fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  count: { color: COLORS.onSurfaceVariant, fontSize: 14, width: 40, textAlign: 'right' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 80 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: COLORS.onSurface, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.onSurfaceVariant, fontSize: 13, marginTop: 4, textAlign: 'center', maxWidth: 260 },
});
