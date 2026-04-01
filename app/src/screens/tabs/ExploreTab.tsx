// ===== Explore Tab (with pagination) =====
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useDramaStore } from '../../stores';
import { DramaCard } from '../../components/drama/DramaCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS } from '../../utils/constants';
import { rf, scale, getSpacing } from '../../utils/responsive';
import { useDebounce } from '../../hooks';
import { useTranslation } from 'react-i18next';
import type { Drama } from '../../types';

export const ExploreTab: React.FC = () => {
  const { t } = useTranslation();
  const {
    searchResults, genres, isLoadingDramas, isLoadingMore, searchHasMore,
    searchDramas, clearSearch, loadMoreSearch, loadHomeData, homeHasMore, loadMoreHome,
  } = useDramaStore();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 400);

  // Get dynamic spacing
  const sp = getSpacing();

  // Debounced search
  useEffect(() => {
    if (debouncedSearch) {
      setSelectedGenre(null);
      searchDramas(debouncedSearch);
    } else if (!selectedGenre) {
      clearSearch();
    }
  }, [debouncedSearch]);

  const onGenrePress = useCallback(async (genre: string | null) => {
    setSelectedGenre(genre);
    setSearchText('');
    if (genre) {
      await useDramaStore.getState().filterByGenre(genre);
    } else {
      clearSearch();
    }
  }, [searchDramas, clearSearch]);

  // Determine data source
  const isSearching = debouncedSearch || selectedGenre;
  const displayDramas = isSearching
    ? (debouncedSearch ? searchResults : useDramaStore.getState().genreResults)
    : useDramaStore.getState().recentDramas;
  const hasMore = isSearching
    ? (debouncedSearch ? searchHasMore : useDramaStore.getState().genreHasMore)
    : homeHasMore;

  const onLoadMore = useCallback(() => {
    if (isLoadingDramas || isLoadingMore) return;
    if (debouncedSearch) {
      loadMoreSearch();
    } else if (selectedGenre) {
      useDramaStore.getState().loadMoreGenre();
    } else {
      loadMoreHome();
    }
  }, [debouncedSearch, selectedGenre, loadMoreSearch, loadMoreHome, isLoadingDramas, isLoadingMore]);

  const renderItem = ({ item }: { item: Drama }) => (
    <DramaCard drama={item} />
  );

  const keyExtractor = (item: Drama) => `explore-${item.id}`;

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.onSurfaceVariant} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { paddingHorizontal: sp.md, paddingTop: sp.lg, paddingBottom: sp.sm }]}>
        {t('tab_theater')}
      </Text>

      {/* Search Input */}
      <TextInput
        style={[styles.searchInput, {
          marginHorizontal: sp.md,
          marginBottom: sp.md,
          paddingHorizontal: sp.md,
          paddingVertical: sp.sm,
        }]}
        placeholder={t('search_explore')}
        placeholderTextColor={COLORS.onSurfaceVariant}
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {/* Genre Tags — hide while loading */}
      {genres.length > 0 && (
        <View style={[styles.genresRow, { paddingHorizontal: sp.md, paddingBottom: sp.md }]}>
          <TouchableOpacity
            style={[styles.genreChip, !selectedGenre && styles.genreChipActive]}
            onPress={() => onGenrePress(null)}
          >
            <Text style={styles.genreChipText}>{t('all')}</Text>
          </TouchableOpacity>
          {genres.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[styles.genreChip, styles.genreChipMargin, selectedGenre === genre && styles.genreChipActive]}
              onPress={() => onGenrePress(genre)}
            >
              <Text style={styles.genreChipText}>{genre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results with Infinite Scroll */}
      {isLoadingDramas ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={displayDramas}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingHorizontal: sp.md, paddingBottom: scale(80) }]}
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? t('no_results_for', { query: debouncedSearch }) : t('no_dramas')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: {
    fontSize: rf(28),
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  searchInput: {
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    color: COLORS.onSurface,
    fontSize: rf(15),
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreChipMargin: {
    marginRight: scale(8),
    marginBottom: scale(8),
  },
  genreChip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  genreChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreChipText: { color: COLORS.onSurface, fontSize: rf(13) },
  list: {},
  row: {
    justifyContent: 'space-between',
    gap: scale(10),
  },
  footer: {
    paddingVertical: scale(16),
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: scale(100),
  },
  emptyIcon: { fontSize: rf(40), marginBottom: scale(8) },
  emptyText: {
    color: COLORS.onSurfaceVariant,
    fontSize: rf(16),
  },
});
