// ===== Explore Tab (with pagination) =====
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useDramaStore } from '../../stores';
import { DramaCard } from '../../components/drama/DramaCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, SPACING } from '../../utils/constants';
import { useDebounce } from '../../hooks';
import type { Drama } from '../../types';

export const ExploreTab: React.FC = () => {
  const {
    searchResults, genres, isLoadingDramas, isLoadingMore, searchHasMore,
    searchDramas, clearSearch, loadMoreSearch, loadHomeData, homeHasMore, loadMoreHome,
  } = useDramaStore();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 400);

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
      <Text style={styles.title}>Explore</Text>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by title or genre..."
        placeholderTextColor={COLORS.onSurfaceVariant}
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {/* Genre Tags — hide while loading */}
      {genres.length > 0 && (
        <View style={styles.genresRow}>
          <TouchableOpacity
            style={[styles.genreChip, !selectedGenre && styles.genreChipActive]}
            onPress={() => onGenrePress(null)}
          >
            <Text style={styles.genreChipText}>All</Text>
          </TouchableOpacity>
          {genres.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[styles.genreChip, selectedGenre === genre && styles.genreChipActive]}
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
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No dramas found'}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  searchInput: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    color: COLORS.onSurface,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  genresRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  genreChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreChipText: { color: COLORS.onSurface, fontSize: 13 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 80 },
  footer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.sm },
  emptyText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 16,
  },
});
