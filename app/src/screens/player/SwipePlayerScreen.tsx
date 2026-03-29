// ===== Swipe Player Screen (TikTok-style vertical scrolling) =====
// Enhanced: Episode switching, playback speed, danmaku, ad reward, comments
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useWindowDimensions,
  ActivityIndicator, StatusBar, Platform, FlatList, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDramaStore, usePlayerStore, useAuthStore } from '../../stores';
import { dramaService } from '../../services/drama.service';
import { interactionService } from '../../services/interaction.service';
import { commentService } from '../../services/comment.service';
import { getMediaUrl } from '../../services/api';
import { COLORS } from '../../utils/constants';
import SwipeVideoItem, { type SwipeEpisodeData } from '../../components/player/SwipeVideoItem';
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

  // Dynamic dimensions - auto-adapts to screen rotation, foldable screens, different resolutions
  const { height: SCREEN_H, width: SCREEN_W } = useWindowDimensions();

  const flatListRef = useRef<FlatList>(null);
  const { isAuthenticated } = useAuthStore();
  const { setProgress, saveProgress, clearPlayer, setDanmakuList } = usePlayerStore();

  const [episodes, setEpisodes] = useState<SwipeEpisodeData[]>([]);
  const [currentEpisodes, setCurrentEpisodes] = useState<Episode[]>([]); // for episode selector
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [likedDramas, setLikedDramas] = useState<Set<number>>(new Set());
  const [favoritedDramas, setFavoritedDramas] = useState<Set<number>>(new Set());
  const [dramaStats, setDramaStats] = useState<Record<number, { like_count: number; collect_count: number; comment_count: number; share_count: number }>>({});

  const loadedDramaIds = useRef<Set<number>>(new Set());
  const dramaQueue = useRef<number[]>([]);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Load danmaku for first episode
      const startEp = drama.episodes[startIdx];
      if (startEp) {
        commentService.getDanmaku(dramaId, startEp.id).then(setDanmakuList).catch(() => {});
      }

      // Pre-fetch more dramas
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

  // Auto save
  useEffect(() => {
    saveTimer.current = setInterval(() => saveProgress(), 10000);
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
      saveProgress();
      clearPlayer();
    };
  }, [saveProgress, clearPlayer]);

  // Preload next drama
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
      // Also update the current episodes list for the episode selector
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
      // Episode from different drama, navigate there
      const { setEpisode } = usePlayerStore.getState();
      setEpisode(episode, episode.drama_id);
      saveProgress();
      // Navigate to a new drama's episodes
      navigation.replace('SwipePlayer' as never, { dramaId: episode.drama_id, startEpisodeId: episode.id });
    }
  }, [episodes, saveProgress, navigation]);

  const onViewableItemsChanged = useRef(({ viewableItems, changed }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (typeof idx === 'number' && idx !== currentIndex && !isSwipingRef.current) {
        setCurrentIndex(idx);
      }
    }
  }).current;

  // Debounce swipe to prevent rapid consecutive scrolls
  const isSwipingRef = useRef(false);
  const swipeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViewableChange = useRef(({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0) return;
    const idx = viewableItems[0].index;
    if (typeof idx !== 'number' || idx === currentIndex) return;

    // Debounce: ignore rapid index changes
    if (isSwipingRef.current) return;
    isSwipingRef.current = true;
    if (swipeDebounceRef.current) clearTimeout(swipeDebounceRef.current);
    swipeDebounceRef.current = setTimeout(() => {
      isSwipingRef.current = false;
    }, 400);

    setCurrentIndex(idx);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70, minimumViewTime: 200 }).current;

  const toggleLike = useCallback(async (dramaId: number) => {
    if (!isAuthenticated || !dramaId) return;
    try {
      const isLiked = likedDramas.has(dramaId);
      if (isLiked) {
        await interactionService.removeFavorite(dramaId, 'like');
        setLikedDramas(prev => { const s = new Set(prev); s.delete(dramaId); return s; });
        setDramaStats(prev => ({
          ...prev,
          [dramaId]: { ...prev[dramaId], like_count: Math.max(0, (prev[dramaId]?.like_count || 0) - 1) },
        }));
      } else {
        await interactionService.addFavorite(dramaId, 'like');
        setLikedDramas(prev => new Set([...prev, dramaId]));
        setDramaStats(prev => ({
          ...prev,
          [dramaId]: { ...prev[dramaId], like_count: (prev[dramaId]?.like_count || 0) + 1 },
        }));
      }
    } catch (_) {}
  }, [isAuthenticated, likedDramas]);

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

  const loadDramaStats = useCallback(async (dramaId: number) => {
    if (dramaStats[dramaId]) return;
    try {
      const stats = await interactionService.getDramaStats(dramaId);
      setDramaStats(prev => ({ ...prev, [dramaId]: stats }));
    } catch (_) {}
  }, [dramaStats]);

  const handleShare = useCallback(async (dramaId: number) => {
    try {
      await interactionService.share(dramaId);
      setDramaStats(prev => ({
        ...prev,
        [dramaId]: {
          ...prev[dramaId],
          like_count: prev[dramaId]?.like_count || 0,
          collect_count: prev[dramaId]?.collect_count || 0,
          comment_count: prev[dramaId]?.comment_count || 0,
          share_count: (prev[dramaId]?.share_count || 0) + 1,
        },
      }));
    } catch (_) {}
  }, [dramaStats]);

  const goBack = useCallback(() => {
    saveProgress();
    clearPlayer();
    try { navigation.goBack(); } catch (_) {}
  }, [navigation, saveProgress, clearPlayer]);

  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: SCREEN_H, offset: SCREEN_H * index, index,
  }), [SCREEN_H]);

  const renderItem = useCallback(({ item, index }: { item: SwipeEpisodeData; index: number }) => {
    const stats = dramaStats[item.drama_id] || {};
    return (
      <SwipeVideoItem
        data={item}
        isActive={index === currentIndex}
        onToggleLike={toggleLike}
        onToggleFavorite={toggleFavorite}
        onShare={handleShare}
        isLiked={likedDramas.has(item.drama_id)}
        isFavorited={favoritedDramas.has(item.drama_id)}
        likeCount={stats.like_count || 0}
        collectCount={stats.collect_count || 0}
        commentCount={stats.comment_count || 0}
        shareCount={stats.share_count || 0}
        onVideoEnd={index === currentIndex ? handleVideoEnd : () => {}}
        onProgressUpdate={() => {}}
        onSwitchEpisode={handleSwitchEpisode}
        index={index}
        totalEpisodes={episodes.length}
        episodes={currentEpisodes}
        screenWidth={SCREEN_W}
        screenHeight={SCREEN_H}
      />
    );
  }, [currentIndex, likedDramas, favoritedDramas, dramaStats, handleVideoEnd, toggleLike, toggleFavorite, handleShare, episodes.length, currentEpisodes, handleSwitchEpisode, SCREEN_W, SCREEN_H]);

  const keyExtractor = useCallback((item: SwipeEpisodeData) => `ep-${item.id}`, []);

  if (isLoading && episodes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.errorText}>Failed to load</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadInitialDrama(initialDramaId)} activeOpacity={0.7}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.retryBtn, styles.retryBtnMargin]} onPress={goBack} activeOpacity={0.7}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <FlatList
        ref={flatListRef}
        data={episodes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        vertical
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={handleViewableChange}
        disableIntervalMomentum={true}
        windowSize={3}
        maxToRenderPerBatch={1}
        initialNumToRender={1}
        removeClippedSubviews={false}
        onEndReached={() => {
          if (episodes.length - currentIndex <= 3) loadNextDrama();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <View style={{ height: SCREEN_H, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
          </View>
        }
      />

      {/* Top-left back button */}
      <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
        <Text style={styles.backIcon}>{'\u276E'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 12 },
  errorText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  retryBtnMargin: { marginTop: 10 },
  retryText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  backBtn: {
    position: 'absolute', top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 4 : 54,
    left: 12, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  backIcon: { color: '#FFF', fontSize: 18, fontWeight: '600' },
});
