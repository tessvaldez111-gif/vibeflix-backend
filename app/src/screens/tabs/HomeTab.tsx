// ===== Home Tab — Feed Style (Hongguo-inspired) =====
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDramaStore } from '../../stores';
import { getMediaUrl } from '../../services/api';
import { COLORS, SPACING } from '../../utils/constants';
import { formatNumber } from '../../utils/format';
import type { Drama } from '../../types';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const HomeTab: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const {
    recentDramas, genres, isLoadingDramas, isLoadingMore, homeHasMore,
    loadHomeData, loadMoreHome,
  } = useDramaStore();

  useEffect(() => {
    loadHomeData();
  }, []);

  const onLoadMore = useCallback(() => {
    if (isLoadingDramas || isLoadingMore) return;
    loadMoreHome();
  }, [loadMoreHome, isLoadingDramas, isLoadingMore]);

  const onSearchPress = () => {
    navigation.navigate('TheaterTab' as never);
  };

  const onPressDrama = (drama: Drama) => {
    (navigation.navigate as any)('SwipePlayer', { dramaId: drama.id });
  };

  const renderItem = ({ item, index }: { item: Drama; index: number }) => (
    <TouchableOpacity
      style={styles.feedCard}
      activeOpacity={0.95}
      onPress={() => onPressDrama(item)}
    >
      {/* Full-screen cover */}
      <Image
        source={{ uri: getMediaUrl(item.cover_image) }}
        style={styles.cover}
        defaultSource={require('../../../assets/icon.png')}
      />

      {/* Gradient overlay */}
      <View style={styles.gradient} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onSearchPress} style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.onSurfaceVariant} />
          <Text style={styles.searchText}>{t('search_placeholder')}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.dramaTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.genreTag}>{item.genre}</Text>
          <Text style={styles.metaText}>
            {item.episode_count} {t('ep_abbr')} · {formatNumber(item.view_count)} {t('views_abbr')}
          </Text>
        </View>
        {/* Action buttons (right side) */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onPressDrama(item)}>
            <Ionicons name="heart-outline" size={22} color="#FFF" />
            <Text style={styles.actionText}>{formatNumber(item.collect_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={22} color="#FFF" />
            <Text style={styles.actionText}>{formatNumber(item.like_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Play indicator */}
      <View style={styles.playIndicator}>
        <Ionicons name="play" size={14} color="#FFF" />
      </View>

      {/* Episode count badge */}
      <View style={styles.epBadge}>
        <Text style={styles.epBadgeText}>{item.episode_count} {t('ep_abbr')}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!homeHasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.onSurface} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Status bar spacer */}
      <View style={styles.statusSpacer} />

      {isLoadingDramas ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={recentDramas}
          renderItem={renderItem}
          keyExtractor={(item) => `feed-${item.id}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('no_dramas')}</Text>
            </View>
          }
          getItemLayout={(data, index) => ({
            length: SCREEN_H,
            offset: SCREEN_H * index,
            index,
          })}
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
  statusSpacer: {
    height: 44,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Feed card (full-screen)
  feedCard: {
    width: SCREEN_W,
    height: SCREEN_H - 44, // minus status spacer
    position: 'relative',
    backgroundColor: '#000',
  },
  cover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: 'transparent',
    // Use opacity-based gradient since LinearGradient may not be available
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 8,
    left: SPACING.md,
    right: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  searchText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  // Bottom info
  bottomInfo: {
    position: 'absolute',
    bottom: 20,
    left: SPACING.md,
    right: 70,
  },
  dramaTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreTag: {
    backgroundColor: COLORS.primary,
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  // Action buttons (right column)
  actionRow: {
    position: 'absolute',
    bottom: 20,
    right: SPACING.md,
    gap: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  // Play indicator
  playIndicator: {
    position: 'absolute',
    top: '45%',
    left: '45%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Episode badge
  epBadge: {
    position: 'absolute',
    top: '45%',
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  epBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  // Misc
  footer: {
    paddingVertical: SPACING.lg,
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
