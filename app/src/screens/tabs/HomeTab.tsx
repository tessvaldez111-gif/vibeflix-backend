// ===== Home Tab — Immersive Video Feed (TikTok-style) =====
// v1.3.2: Support dual layout modes (single feed / 2-col grid / 2x2 grid)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, StatusBar, Platform, useWindowDimensions, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDramaStore } from '../../stores';
import { getMediaUrl } from '../../services/api';
import { interactionService } from '../../services/interaction.service';
import { COLORS } from '../../utils/constants';
import { formatNumber } from '../../utils/format';
import { scale, rf, rh } from '../../utils/responsive';
import type { Drama } from '../../types';
import { Ionicons } from '@expo/vector-icons';

type LayoutMode = 'feed' | 'double' | 'quad';

export const HomeTab: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { height: SCREEN_H, width: SCREEN_W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    recentDramas, genres, isLoadingDramas, isLoadingMore, homeHasMore,
    loadHomeData, loadMoreHome,
  } = useDramaStore();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('double'); // default: dual-column grid
  const [refreshing, setRefreshing] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadHomeData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  }, [loadHomeData]);

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

  // Handle like from HomeTab cards — toggle state + API call
  const handleLike = useCallback((dramaId: number) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(dramaId)) {
        next.delete(dramaId);
      } else {
        next.add(dramaId);
      }
      return next;
    });
    interactionService.addFavorite(dramaId, 'like').catch(() => {});
  }, []);

  // Handle comment button - navigate to player and open comments
  const handleComment = useCallback((drama: Drama) => {
    (navigation.navigate as any)('SwipePlayer', { dramaId: drama.id, openComments: true });
  }, [navigation]);

  // Handle share
  const handleShare = useCallback(async (drama: Drama) => {
    try {
      await interactionService.share(drama.id);
    } catch (_) {}
  }, []);

  // Safe area: top padding for notch/status bar
  const safeTop = useMemo(() => {
    if (insets.top > 0) return insets.top;
    return Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  }, [insets.top]);

  // Each video card takes full screen minus tab bar (feed mode)
  const tabBarHeight = scale(50);
  const viewHeight = SCREEN_H - tabBarHeight;

  const getItemLayout = useCallback((_: any, index: number) => {
    if (layoutMode === 'feed') {
      return { length: viewHeight, offset: viewHeight * index, index };
    }
    // For grid modes, let FlatList handle layout
    return { length: 0, offset: 0, index };
  }, [viewHeight, layoutMode]);

  // ===== Grid card for double/quad mode =====
  const renderGridCard = ({ item }: { item: Drama }) => {
    const isQuad = layoutMode === 'quad';
    const cols = isQuad ? 3 : 2;
    const gap = scale(isQuad ? 8 : 12);
    const cardWidth = (SCREEN_W - scale(16) * 2 - gap * (cols - 1)) / cols;

    return (
      <TouchableOpacity
        style={[styles.gridCard, { width: cardWidth }]}
        activeOpacity={0.9}
        onPress={() => onPressDrama(item)}
      >
        <Image
          source={{ uri: getMediaUrl(item.cover_image) }}
          style={[styles.gridCover, { width: cardWidth, aspectRatio: isQuad ? 2 / 3 : 3 / 4 }]}
          defaultSource={require('../../../assets/icon.png')}
        />
        <View style={styles.gridGenreBadge}>
          <Text style={styles.gridGenreText}>{item.genre}</Text>
        </View>
        <View style={styles.gridInfo}>
          <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.gridMeta}>
            {item.episode_count} {t('ep_abbr')} · {formatNumber(item.view_count)} {t('views_abbr')}
          </Text>
        </View>
        {/* Favorite button on card */}
        <TouchableOpacity
          style={styles.gridFavBtn}
          onPress={(e) => { e.stopPropagation(); handleLike(item.id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={likedIds.has(item.id) ? 'heart' : 'heart-outline'}
            size={scale(18)}
            color={likedIds.has(item.id) ? '#FF4757' : '#FFF'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ===== Full-screen feed card =====
  const renderFeedCard = ({ item }: { item: Drama }) => (
    <TouchableOpacity
      style={[styles.feedCard, { width: SCREEN_W, height: viewHeight }]}
      activeOpacity={0.95}
      onPress={() => onPressDrama(item)}
    >
      <Image
        source={{ uri: getMediaUrl(item.cover_image) }}
        style={[styles.cover, { width: SCREEN_W, height: viewHeight }]}
        defaultSource={require('../../../assets/icon.png')}
      />
      <View style={[styles.gradient, { height: rh(45) }]} />
      <View style={styles.bottomInfo}>
        <Text style={styles.dramaTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.genreTag}>{item.genre}</Text>
          <Text style={styles.metaText}>
            {item.episode_count} {t('ep_abbr')} · {formatNumber(item.view_count)} {t('views_abbr')}
          </Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleLike(item.id); }}>
          <Ionicons name={likedIds.has(item.id) ? 'heart' : 'heart-outline'} size={scale(24)} color={likedIds.has(item.id) ? '#FF4757' : '#FFF'} />
          <Text style={[styles.actionText, likedIds.has(item.id) && styles.actionTextLiked]}>{formatNumber(item.collect_count)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleComment(item); }}>
          <Ionicons name="chatbubble-outline" size={scale(24)} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(item.like_count)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleShare(item); }}>
          <Ionicons name="share-outline" size={scale(24)} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.playIndicator}>
        <Ionicons name="play" size={scale(18)} color="#FFF" />
      </View>
      <View style={styles.epBadge}>
        <Text style={styles.epBadgeText}>{item.episode_count} {t('ep_abbr')}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = layoutMode === 'feed' ? renderFeedCard : renderGridCard;

  const renderFooter = () => {
    if (!homeHasMore) return null;
    return (
      <View style={[styles.footer, layoutMode === 'feed' ? { height: viewHeight, justifyContent: 'center' } : styles.footerGrid]}>
        <ActivityIndicator size="small" color={layoutMode === 'feed' ? 'rgba(255,255,255,0.5)' : COLORS.onSurfaceVariant} />
      </View>
    );
  };

  return (
    <View style={layoutMode === 'feed' ? styles.container : styles.containerLight}>
      {/* FIXED search bar + layout toggle */}
      <View style={[styles.fixedTopBar, { top: safeTop + scale(8) }]}>
        <TouchableOpacity onPress={onSearchPress} style={[styles.searchBar, layoutMode !== 'feed' && styles.searchBarLight]}>
          <Ionicons name="search" size={scale(16)} color={layoutMode === 'feed' ? 'rgba(255,255,255,0.5)' : COLORS.onSurfaceVariant} />
          <Text style={[styles.searchText, layoutMode !== 'feed' && styles.searchTextLight]}>{t('search_placeholder')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.layoutToggle, layoutMode !== 'feed' && styles.layoutToggleLight]}
          onPress={() => setLayoutMode(prev =>
            prev === 'feed' ? 'double' : prev === 'double' ? 'quad' : 'feed'
          )}
        >
          <Ionicons
            name={layoutMode === 'feed' ? 'grid-outline' : layoutMode === 'double' ? 'apps-outline' : 'list-outline'}
            size={scale(20)}
            color={layoutMode === 'feed' ? '#FFF' : COLORS.onSurface}
          />
        </TouchableOpacity>
      </View>

      {isLoadingDramas ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={recentDramas}
          renderItem={renderItem}
          keyExtractor={(item) => `feed-${item.id}`}
          key={layoutMode === 'feed' ? 'feed' : layoutMode === 'double' ? 'double' : 'quad'}
          numColumns={layoutMode === 'feed' ? 1 : layoutMode === 'quad' ? 3 : 2}
          columnWrapperStyle={layoutMode === 'feed' ? undefined : [styles.gridRow, { gap: layoutMode === 'quad' ? scale(8) : scale(12) }]}
          contentContainerStyle={layoutMode === 'feed' ? undefined : [styles.gridList, { paddingHorizontal: scale(16), paddingBottom: scale(80) }]}
          pagingEnabled={layoutMode === 'feed'}
          snapToInterval={layoutMode === 'feed' ? viewHeight : undefined}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          getItemLayout={layoutMode === 'feed' ? getItemLayout : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primaryLight}
              colors={[COLORS.primaryLight]}
            />
          }
          ListEmptyComponent={
            <View style={layoutMode === 'feed' ? styles.empty : styles.emptyLight}>
              <Text style={[styles.emptyText, layoutMode !== 'feed' && styles.emptyTextLight]}>{t('no_dramas')}</Text>
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
    backgroundColor: '#000',
  },
  containerLight: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Fixed search bar — overlays on top of cards
  fixedTopBar: {
    position: 'absolute',
    left: scale(16),
    right: scale(16),
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    gap: scale(8),
  },
  searchBarLight: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  searchText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: rf(14),
  },
  searchTextLight: {
    color: COLORS.onSurfaceVariant,
  },
  layoutToggle: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  layoutToggleLight: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Feed card (full screen)
  feedCard: {
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  // Bottom info — left side
  bottomInfo: {
    position: 'absolute',
    bottom: rh(12),
    left: scale(16),
    right: scale(80),
  },
  dramaTitle: {
    color: '#FFF',
    fontSize: rf(20),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: scale(8),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  genreTag: {
    backgroundColor: COLORS.primary,
    color: '#FFF',
    fontSize: rf(11),
    fontWeight: '600',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: rf(12),
  },
  // Action buttons — right edge, bottom area
  actionRow: {
    position: 'absolute',
    right: scale(10),
    bottom: rh(18),
    alignItems: 'center',
    gap: scale(22),
  },
  actionBtn: {
    alignItems: 'center',
    gap: scale(2),
  },
  actionText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: rf(11),
    fontWeight: '500',
  },
  actionTextLiked: {
    color: '#FF4757',
  },
  // Play indicator — center
  playIndicator: {
    position: 'absolute',
    top: '42%',
    left: '45%',
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Episode badge — top right
  epBadge: {
    position: 'absolute',
    top: '42%',
    right: scale(16),
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  epBadgeText: {
    color: '#FFF',
    fontSize: rf(13),
    fontWeight: '600',
  },
  // Grid card styles
  gridCard: {
    borderRadius: scale(10),
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
    marginBottom: scale(12),
  },
  gridCover: {
    backgroundColor: COLORS.secondaryContainer,
    resizeMode: 'cover',
  },
  gridGenreBadge: {
    position: 'absolute',
    top: scale(6),
    left: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    backgroundColor: COLORS.primary,
  },
  gridGenreText: {
    color: '#FFF',
    fontSize: rf(10),
    fontWeight: '600',
  },
  gridInfo: {
    padding: scale(6),
  },
  gridTitle: {
    color: COLORS.onSurface,
    fontSize: rf(13),
    fontWeight: '500',
  },
  gridMeta: {
    color: COLORS.onSurfaceVariant,
    fontSize: rf(11),
    marginTop: scale(2),
  },
  gridFavBtn: {
    position: 'absolute',
    top: scale(6),
    right: scale(6),
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: scale(12),
  },
  gridList: {
    paddingTop: scale(60),
  },
  // Misc
  footer: {
    alignItems: 'center',
  },
  footerGrid: {
    paddingVertical: scale(16),
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLight: {
    paddingVertical: scale(100),
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: rf(16),
  },
  emptyTextLight: {
    color: COLORS.onSurfaceVariant,
  },
});
