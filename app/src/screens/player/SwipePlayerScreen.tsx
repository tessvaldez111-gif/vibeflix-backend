// ===== Swipe Player Screen (TikTok-style vertical scrolling) =====
// v1.3.0: Gesture-driven swipe with audio fade, progress indicator, instant destroy
//         SwipeVideoItem handles PanResponder internally, this screen manages state
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useWindowDimensions,
  ActivityIndicator, StatusBar, Platform, FlatList, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDramaStore, usePlayerStore, useAuthStore } from '../../stores';
import { dramaService } from '../../services/drama.service';
import { interactionService } from '../../services/interaction.service';
import { commentService } from '../../services/comment.service';
import { getMediaUrl } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../utils/constants';
import { scale, rf } from '../../utils/responsive';
import SwipeVideoItem, { type SwipeEpisodeData } from '../../components/player/SwipeVideoItem';
import VideoPlayManager from '../../services/VideoPlayManager';
import type { Episode } from '../../types';

type RouteParams = {
  dramaId: number;
  startEpisodeId?: number;
};

const toSwipeData = (ep: any, drama: any): SwipeEpisodeData => ({
  id: ep.id,
  drama_id: ep.drama_id || drama.id,
  episode_number: ep.episode_number,
  title: ep.title,
  video_path: ep.video_path,
  duration: ep.duration || 0,
  is_free: ep.is_free ?? 1,
  points_cost: ep.points_cost || 0,
  drama_title: drama.title,
  drama_genre: drama.genre,
  drama_status: drama.status,
  episode_count: drama.episode_count || drama.episodes?.length,
});

export const SwipePlayerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params || {}) as RouteParams;
  const initialDramaId = params.dramaId;
  const startEpId = params.startEpisodeId;

  const { height: SCREEN_H, width: SCREEN_W } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList>(null);
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { setProgress, saveProgress, clearPlayer, setDanmakuList } = usePlayerStore();

  const [episodes, setEpisodes] = useState<SwipeEpisodeData[]>([]);
  const [currentEpisodes, setCurrentEpisodes] = useState<Episode[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  // Track which index is currently "active" for play/mute control
  const [activeIndex, setActiveIndex] = useState(0);
  // Gesture state: which item index is being swiped
  const [swipingIndex, setSwipingIndex] = useState<number | null>(null);

  const [likedDramas, setLikedDramas] = useState<Set<number>>(new Set());
  const [favoritedDramas, setFavoritedDramas] = useState<Set<number>>(new Set());
  const [dramaStats, setDramaStats] = useState<Record<number, { like_count: number; collect_count: number; comment_count: number; share_count: number }>>({});

  const loadedDramaIds = useRef<Set<number>>(new Set());
  const dramaQueue = useRef<number[]>([]);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScrollingRef = useRef(false);
  // Track scroll momentum state — equivalent to ViewPager2.SCROLL_STATE_DRAGGING / IDLE
  const scrollStateRef = useRef<'idle' | 'dragging' | 'settling'>('idle');
  // Track the previous active index to detect page changes (equivalent to onPageSelected)
  const prevActiveIndexRef = useRef(0);

  const viewHeight = SCREEN_H;

  // Load initial drama
  const loadInitialDrama = useCallback(async (dramaId: number, episodeId?: number) => {
    setIsLoading(true);
    setIsError(false);
    try {
      const drama = await dramaService.getDramaDetail(dramaId);
      if (!drama || !drama.episodes || drama.episodes.length === 0) {
        setIsError(true);
        setIsLoading(false);
        return;
      }

      loadedDramaIds.current.add(dramaId);
      const swipeEps = drama.episodes.map(ep => toSwipeData(ep, drama));

      let startIdx = 0;
      if (episodeId) {
        const found = swipeEps.findIndex(e => e.id === episodeId);
        if (found >= 0) startIdx = found;
      }

      setEpisodes(swipeEps);
      setCurrentEpisodes(drama.episodes);
      setCurrentIndex(startIdx);
      setActiveIndex(startIdx);

      const startEp = drama.episodes[startIdx];
      if (startEp) {
        commentService.getDanmaku(dramaId, startEp.id).then(setDanmakuList).catch(() => {});
      }

      try {
        const res = await dramaService.getDramas({ page: 1, pageSize: 10 });
        dramaQueue.current = res.list.filter((d: any) => d.id !== dramaId).map((d: any) => d.id);
      } catch (_) {}

      setIsLoading(false);

      if (isAuthenticated) {
        interactionService.checkFavorite(dramaId, 'like').then(ok => {
          if (ok) setLikedDramas(prev => new Set([...prev, dramaId]));
        }).catch(() => {});
        interactionService.checkFavorite(dramaId, 'favorite').then(ok => {
          if (ok) setFavoritedDramas(prev => new Set([...prev, dramaId]));
        }).catch(() => {});
      }

      interactionService.getDramaStats(dramaId).then(stats => {
        setDramaStats(prev => ({ ...prev, [dramaId]: stats }));
      }).catch(() => {});

      dramaService.recordView(dramaId).catch(() => {});
    } catch (err) {
      console.error('Failed to load drama:', err);
      setIsError(true);
      setIsLoading(false);
    }
  }, [isAuthenticated, setDanmakuList]);

  // Load next drama
  const loadNextDrama = useCallback(async () => {
    let nextDramaId: number | null = null;
    while (dramaQueue.current.length > 0) {
      const candidate = dramaQueue.current.shift()!;
      if (!loadedDramaIds.current.has(candidate)) {
        nextDramaId = candidate;
        break;
      }
    }
    if (!nextDramaId) return;

    try {
      const drama = await dramaService.getDramaDetail(nextDramaId);
      if (!drama || !drama.episodes || drama.episodes.length === 0) return;

      loadedDramaIds.current.add(nextDramaId);
      const newEps = drama.episodes.map(ep => toSwipeData(ep, drama));
      setEpisodes(prev => [...prev, ...newEps]);

      if (isAuthenticated) {
        interactionService.checkFavorite(nextDramaId, 'like').then(ok => {
          if (ok) setLikedDramas(prev => new Set([...prev, nextDramaId]));
        }).catch(() => {});
        interactionService.checkFavorite(nextDramaId, 'favorite').then(ok => {
          if (ok) setFavoritedDramas(prev => new Set([...prev, nextDramaId]));
        }).catch(() => {});
      }

      interactionService.getDramaStats(nextDramaId).then(stats => {
        setDramaStats(prev => ({ ...prev, [nextDramaId]: stats }));
      }).catch(() => {});

      if (dramaQueue.current.length < 3) {
        const res = await dramaService.getDramas({ page: 1, pageSize: 10 });
        dramaQueue.current = res.list.filter((d: any) => !loadedDramaIds.current.has(d.id)).map((d: any) => d.id);
      }
    } catch (err) {
      console.error('Failed to load next drama:', err);
    }
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    loadInitialDrama(initialDramaId, startEpId);
  }, [initialDramaId, startEpId]);

  // Auto save + lifecycle cleanup (equivalent to onStop/onDestroy)
  useEffect(() => {
    saveTimer.current = setInterval(() => saveProgress(), 10000);
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
      // Activity.onStop equivalent
      VideoPlayManager.pauseAll();
      saveProgress();
      // Activity.onDestroy equivalent
      VideoPlayManager.releaseCurrent();
      clearPlayer();
    };
  }, [saveProgress, clearPlayer]);

  // Preload next drama when near end
  useEffect(() => {
    if (episodes.length > 0 && currentIndex >= episodes.length - 2) {
      loadNextDrama();
    }
  }, [currentIndex, episodes.length, loadNextDrama]);

  // Load danmaku when switching episodes
  const prevEpId = useRef<number | null>(null);
  const currentEpisode = episodes[currentIndex] || null;
  useEffect(() => {
    if (currentEpisode && currentEpisode.id !== prevEpId.current) {
      prevEpId.current = currentEpisode.id;
      commentService.getDanmaku(currentEpisode.drama_id, currentEpisode.id).then(setDanmakuList).catch(() => {});
      if (currentEpisode.drama_id) {
        dramaService.getDramaDetail(currentEpisode.drama_id).then(drama => {
          if (drama?.episodes) setCurrentEpisodes(drama.episodes);
        }).catch(() => {});
      }
    }
  }, [currentEpisode?.id, setDanmakuList]);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    saveProgress();
    if (currentIndex < episodes.length - 1) {
      setTimeout(() => {
        try { flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true }); } catch (_) {}
      }, 300);
    }
  }, [currentIndex, episodes.length, saveProgress]);

  // Handle progress
  const handleProgress = useCallback((progress: number, dur: number) => {
    if (currentEpisode) {
      const { setEpisode } = usePlayerStore.getState();
      setEpisode({
        id: currentEpisode.id, drama_id: currentEpisode.drama_id,
        episode_number: currentEpisode.episode_number, title: currentEpisode.title,
        video_path: currentEpisode.video_path, duration: currentEpisode.duration,
        is_free: currentEpisode.is_free, points_cost: currentEpisode.points_cost, created_at: '',
      }, currentEpisode.drama_id);
      setProgress(progress, dur);
    }
  }, [currentEpisode, setProgress]);

  // Handle episode switch from selector
  const handleSwitchEpisode = useCallback((episode: Episode) => {
    const idx = episodes.findIndex(e => e.id === episode.id);
    if (idx >= 0) {
      try { flatListRef.current?.scrollToIndex({ index: idx, animated: true }); } catch (_) {}
    } else {
      const { setEpisode } = usePlayerStore.getState();
      setEpisode(episode, episode.drama_id);
      saveProgress();
      (navigation as any).replace('SwipePlayer', { dramaId: episode.drama_id, startEpisodeId: episode.id });
    }
  }, [episodes, saveProgress, navigation]);

  // Viewable items change — equivalent to ViewPager2.onPageSelected
  // When a new page is selected, release the old player immediately
  const handleViewableChange = useRef(({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0) return;
    const idx = viewableItems[0].index;
    if (typeof idx !== 'number') return;

    // === onPageSelected: release old player ===
    if (prevActiveIndexRef.current !== idx) {
      // Page changed — destroy the previous player via global manager
      VideoPlayManager.releaseCurrent();
      prevActiveIndexRef.current = idx;
    }

    if (idx !== currentIndex && !isScrollingRef.current) {
      setCurrentIndex(idx);
      setActiveIndex(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70, minimumViewTime: 200 }).current;

  // Like is cumulative only — every call increments, never decrements
  const toggleLike = useCallback(async (dramaId: number) => {
    if (!isAuthenticated || !dramaId) return;
    try {
      await interactionService.addFavorite(dramaId, 'like');
      setLikedDramas(prev => new Set([...prev, dramaId]));
      setDramaStats(prev => ({
        ...prev,
        [dramaId]: { ...prev[dramaId], like_count: (prev[dramaId]?.like_count || 0) + 1 },
      }));
    } catch (_) {}
  }, [isAuthenticated]);

  const toggleFavorite = useCallback(async (dramaId: number) => {
    if (!isAuthenticated || !dramaId) return;
    try {
      const isFav = favoritedDramas.has(dramaId);
      if (isFav) {
        await interactionService.removeFavorite(dramaId, 'favorite');
        setFavoritedDramas(prev => { const s = new Set(prev); s.delete(dramaId); return s; });
        setDramaStats(prev => ({
          ...prev,
          [dramaId]: { ...prev[dramaId], collect_count: Math.max(0, (prev[dramaId]?.collect_count || 0) - 1) },
        }));
      } else {
        await interactionService.addFavorite(dramaId, 'favorite');
        setFavoritedDramas(prev => new Set([...prev, dramaId]));
        setDramaStats(prev => ({
          ...prev,
          [dramaId]: { ...prev[dramaId], collect_count: (prev[dramaId]?.collect_count || 0) + 1 },
        }));
      }
    } catch (_) {}
  }, [isAuthenticated, favoritedDramas]);

  const handleShare = useCallback(async (dramaId: number) => {
    try {
      await interactionService.share(dramaId);
      setDramaStats(prev => ({
        ...prev,
        [dramaId]: {
          ...prev[dramaId],
          share_count: (prev[dramaId]?.share_count || 0) + 1,
        },
      }));
    } catch (_) {}
  }, [dramaStats]);

  const goBack = useCallback(() => {
    saveProgress();
    VideoPlayManager.releaseCurrent(); // onDestroy equivalent
    clearPlayer();
    try { navigation.goBack(); } catch (_) {}
  }, [navigation, saveProgress, clearPlayer]);

  // Precise getItemLayout
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: viewHeight,
    offset: viewHeight * index,
    index,
  }), [viewHeight]);

  // ===== Gesture-driven swipe handlers =====
  // Called when SwipeVideoItem's PanResponder starts a vertical swipe
  const handleSwipeGestureStart = useCallback((itemIndex: number) => {
    isScrollingRef.current = true;
    setSwipingIndex(itemIndex);
  }, []);

  // Called when SwipeVideoItem's PanResponder ends
  const handleSwipeGestureEnd = useCallback((itemIndex: number, completed: boolean) => {
    setSwipingIndex(null);

    if (completed) {
      // Scroll FlatList to next/previous item with animation
      const nextIndex = itemIndex + 1; // SwipeVideoItem always goes forward for now
      // Direction is determined by swipe direction in SwipeVideoItem, but for FlatList we need absolute index
      // The SwipeVideoItem detects up/down via PanResponder, so we just scroll to adjacent
      const targetIndex = nextIndex >= 0 && nextIndex < episodes.length ? nextIndex : itemIndex;
      if (targetIndex !== itemIndex) {
        setCurrentIndex(targetIndex);
        setActiveIndex(targetIndex);
        setTimeout(() => {
          try { flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true }); } catch (_) {}
        }, 50);
      }
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  }, [episodes.length]);

  // Track scroll offset to determine swipe direction for gesture completion
  const scrollOffsetRef = useRef(0);
  const onScroll = useCallback((e: any) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Override gesture end with correct direction based on scroll position
  const handleSwipeGestureEndWithDirection = useCallback((itemIndex: number, direction: 'up' | 'down', completed: boolean) => {
    setSwipingIndex(null);

    if (completed) {
      let targetIndex: number;
      if (direction === 'up') {
        targetIndex = itemIndex + 1; // Next video
      } else {
        targetIndex = itemIndex - 1; // Previous video
      }
      targetIndex = Math.max(0, Math.min(targetIndex, episodes.length - 1));

      if (targetIndex !== itemIndex) {
        setCurrentIndex(targetIndex);
        setActiveIndex(targetIndex);
        setTimeout(() => {
          try { flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true }); } catch (_) {}
        }, 50);
      }
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  }, [episodes.length]);

  const renderItem = useCallback(({ item, index }: { item: SwipeEpisodeData; index: number }) => {
    const stats = dramaStats[item.drama_id] || {};
    const isActive = index === activeIndex;
    const isGestureActive = swipingIndex === index;

    return (
      <SwipeVideoItem
        data={item}
        isActive={isActive}
        onToggleLike={toggleLike}
        onToggleFavorite={toggleFavorite}
        onShare={handleShare}
        isLiked={likedDramas.has(item.drama_id)}
        isFavorited={favoritedDramas.has(item.drama_id)}
        likeCount={stats.like_count || 0}
        collectCount={stats.collect_count || 0}
        commentCount={stats.comment_count || 0}
        shareCount={stats.share_count || 0}
        onVideoEnd={isActive ? handleVideoEnd : () => {}}
        onProgressUpdate={() => {}}
        onSwitchEpisode={handleSwitchEpisode}
        index={index}
        totalEpisodes={episodes.length}
        episodes={currentEpisodes}
        screenWidth={SCREEN_W}
        screenHeight={viewHeight}
        onSwipeGestureStart={() => handleSwipeGestureStart(index)}
        onSwipeGestureEnd={(completed) => {
          // Determine direction from swipe data — we need to pass direction
          // For now, use scroll offset direction
          handleSwipeGestureEnd(index, completed);
        }}
        isGestureActive={isGestureActive}
      />
    );
  }, [activeIndex, swipingIndex, likedDramas, favoritedDramas, dramaStats, handleVideoEnd, toggleLike, toggleFavorite, handleShare, episodes.length, currentEpisodes, handleSwitchEpisode, SCREEN_W, viewHeight, handleSwipeGestureStart, handleSwipeGestureEnd]);

  const keyExtractor = useCallback((item: SwipeEpisodeData) => `ep-${item.id}`, []);

  // ===== FlatList scroll state handlers (ViewPager2 equivalents) =====

  // onScrollBeginDrag → SCROLL_STATE_DRAGGING: pause all playback globally
  const handleScrollBeginDrag = useCallback(() => {
    scrollStateRef.current = 'dragging';
    // Global pause — prevents audio bleed and frame stutter during swipe
    VideoPlayManager.pauseAll();
  }, []);

  // onMomentumScrollEnd → SCROLL_STATE_IDLE: let the new active item resume playback
  const handleMomentumScrollEnd = useCallback(() => {
    scrollStateRef.current = 'idle';
    // Playback resumes via handleViewableChange → setActiveIndex → SwipeVideoItem isActive=true
  }, []);

  if (isLoading && episodes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.errorText}>{t('load_failed')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadInitialDrama(initialDramaId)} activeOpacity={0.7}>
          <Text style={styles.retryText}>{t('retry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.retryBtn, styles.retryBtnMargin]} onPress={goBack} activeOpacity={0.7}>
          <Text style={styles.retryText}>{t('go_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <FlatList
        key={`fl-${viewHeight}-${SCREEN_W}`}
        ref={flatListRef}
        data={episodes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        snapToInterval={viewHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={handleViewableChange}
        disableIntervalMomentum={true}
        windowSize={5}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onEndReached={() => {
          if (episodes.length - currentIndex <= 3) loadNextDrama();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <View style={{ height: viewHeight, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
          </View>
        }
      />

      {/* Top-left back button */}
      <TouchableOpacity style={[styles.backBtn, { top: (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0)) + scale(4) }]} onPress={goBack} activeOpacity={0.7}>
        <Text style={styles.backIcon}>{'\u276E'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: rf(14), marginTop: scale(12) },
  errorText: { color: 'rgba(255,255,255,0.7)', fontSize: rf(16), marginBottom: scale(16) },
  retryBtn: { paddingHorizontal: scale(24), paddingVertical: scale(10), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.2)' },
  retryBtnMargin: { marginTop: scale(10) },
  retryText: { color: '#FFF', fontSize: rf(15), fontWeight: '600' },
  backBtn: {
    position: 'absolute',
    left: scale(12), width: scale(36), height: scale(36), borderRadius: scale(18),
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  backIcon: { color: '#FFF', fontSize: rf(18), fontWeight: '600' },
});
