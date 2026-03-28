// ===== Home Tab (with pagination) =====
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDramaStore } from '../../stores';
import { DramaCard } from '../../components/drama/DramaCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, SPACING } from '../../utils/constants';
import type { Drama } from '../../types';

const ITEM_THRESHOLD = 5;

export const HomeTab: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const {
    recentDramas, genres, isLoadingDramas, isLoadingMore, homeHasMore,
    loadHomeData, loadMoreHome, filterByGenre, loadMoreGenre,
  } = useDramaStore();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const onSearchPress = () => {
    navigation.navigate('ExploreTab' as never);
  };

  const onGenrePress = useCallback(async (genre: string | null) => {
    setSelectedGenre(genre);
    if (genre) {
      await filterByGenre(genre);
    } else {
      loadHomeData();
    }
  }, [filterByGenre, loadHomeData]);

  // Determine which data source to display
  const displayDramas = selectedGenre
    ? useDramaStore.getState().genreResults
    : recentDramas;
  const hasMore = selectedGenre
    ? useDramaStore.getState().genreHasMore
    : homeHasMore;

  const onLoadMore = useCallback(() => {
    if (isLoadingDramas || isLoadingMore) return;
    if (selectedGenre) {
      loadMoreGenre();
    } else {
      loadMoreHome();
    }
  }, [selectedGenre, loadMoreHome, loadMoreGenre, isLoadingDramas, isLoadingMore]);

  const renderItem = ({ item }: { item: Drama }) => (
    <DramaCard drama={item} />
  );

  const keyExtractor = (item: Drama) => `drama-${item.id}`;

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>{t('app_name')}</Text>
      </View>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder={t('search_placeholder')}
        placeholderTextColor={COLORS.onSurfaceVariant}
        editable={false}
        onPressIn={onSearchPress}
      />

      {/* Genre Tags — hide while loading */}
      {genres.length > 0 && (
        <View style={styles.genresRow}>
          <TouchableOpacity
            style={[styles.genreChip, !selectedGenre && styles.genreChipActive]}
            onPress={() => onGenrePress(null)}
          >
            <Text style={[styles.genreChipText, !selectedGenre && styles.genreChipTextActive]}>{t('all')}</Text>
          </TouchableOpacity>
          {genres.slice(0, 6).map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[styles.genreChip, styles.genreChipMargin, selectedGenre === genre && styles.genreChipActive]}
              onPress={() => onGenrePress(genre)}
            >
              <Text style={[styles.genreChipText, selectedGenre === genre && styles.genreChipTextActive]}>{genre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Drama List with Infinite Scroll */}
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
              <Text style={styles.emptyText}>{t('no_dramas')}</Text>
            </View>
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
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    letterSpacing: 1,
  },
  search: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    color: COLORS.onSurfaceVariant,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  genreChipMargin: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
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
  genreChipText: {
    color: COLORS.onSurface,
    fontSize: 13,
  },
  genreChipTextActive: {
    color: COLORS.onPrimary,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 80,
  },
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
  emptyText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 16,
  },
});
