// ===== Swipe Video Item (TikTok-style immersive video card) =====
// v1.3.0: Double-tap like heart animation, long-press seek, gesture-driven swipe
//         with audio fade, progress indicator, bounce-back, instant destroy on switch
import React, { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Share, Platform, TextInput, Alert,
  Animated, PanResponder, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video, { VideoRef, ResizeMode, OnLoadData, OnProgressData } from 'react-native-video';
import { getMediaUrl } from '../../services/api';
import { adRewardService, commentService } from '../../services/comment.service';
import { formatDuration, formatNumber } from '../../utils/format';
import { COLORS } from '../../utils/constants';
import { scale, rf } from '../../utils/responsive';
import { usePlayerStore, PLAYBACK_SPEEDS, type PlaybackSpeed } from '../../stores/playerStore';
import { useWalletStore } from '../../stores/walletStore';
import { useTranslation } from 'react-i18next';
import DanmakuOverlay from './DanmakuOverlay';
import SpeedSelector from './SpeedSelector';
import AdRewardModal from './AdRewardModal';
import CommentPanel from './CommentPanel';
import EpisodeSelector from './EpisodeSelector';
import VideoPlayManager from '../../services/VideoPlayManager';
import type { Episode, SwipeEpisodeData as SwipeData } from '../../types';

// Re-export the interface for compatibility
export type SwipeEpisodeData = SwipeData;

interface Props {
  data: SwipeData;
  isActive: boolean;
  onToggleLike: (dramaId: number) => void;
  onToggleFavorite: (dramaId: number) => void;
  onShare?: (dramaId: number) => void;
  isLiked: boolean;
  isFavorited: boolean;
  likeCount: number;
  collectCount: number;
  commentCount: number;
  shareCount: number;
  onVideoEnd: () => void;
  onProgressUpdate: (progress: number, duration: number) => void;
  onSwitchEpisode: (episode: Episode) => void;
  index: number;
  totalEpisodes: number;
  episodes: Episode[];
  screenWidth: number;
  screenHeight: number;
  // Gesture-driven swipe callbacks
  onSwipeGestureStart?: () => void;
  onSwipeGestureEnd?: (completed: boolean) => void;
  onSwipeProgress?: (offsetY: number) => void;
  isGestureActive?: boolean;
}

// Floating heart animation component
const FloatingHeart: React.FC<{ x: number; y: number; onComplete: () => void }> = memo(({ x, y, onComplete }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scaleVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleVal.setValue(0);
    translateY.setValue(0);
    opacity.setValue(1);

    Animated.sequence([
      Animated.spring(scaleVal, { toValue: 1.2, useNativeDriver: true, friction: 3 }),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 30,
        top: y - 30,
        width: 60,
        height: 60,
        transform: [{ translateY }, { scale: scaleVal }],
        opacity,
        zIndex: 200,
      }}
    >
      <Text style={{ fontSize: 50, color: '#FF4757' }}>{'\u{2764}\u{FE0F}'}</Text>
    </Animated.View>
  );
});

// Swipe progress indicator bar
const SwipeIndicator: React.FC<{ direction: 'up' | 'down'; progress: number }> = memo(({ direction, progress }) => {
  const animatedVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedVal, {
      toValue: progress,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.swipeIndicator, direction === 'up' ? styles.swipeIndicatorUp : styles.swipeIndicatorDown]}>
      <Animated.View style={[styles.swipeIndicatorFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
      <Text style={styles.swipeIndicatorText}>
        {direction === 'up' ? '\u2191' : '\u2193'}
      </Text>
    </View>
  );
});

// Seek feedback overlay
const SeekFeedback: React.FC<{ type: 'forward' | 'backward'; visible: boolean; label: string }> = memo(({ type, visible, label }) => {
  if (!visible) return null;
  return (
    <View style={styles.seekOverlay}>
      <View style={styles.seekCircle}>
        <Text style={styles.seekIcon}>{type === 'forward' ? '\u25B6\u25B6' : '\u25C0\u25C0'}</Text>
        <Text style={styles.seekLabel}>{label}</Text>
      </View>
    </View>
  );
});

const SwipeVideoItem: React.FC<Props> = memo(({
  data,
  isActive,
  onToggleLike,
  onToggleFavorite,
  onShare,
  isLiked,
  isFavorited,
  likeCount,
  collectCount,
  commentCount,
  shareCount,
  onVideoEnd,
  onProgressUpdate,
  onSwitchEpisode,
  index,
  totalEpisodes,
  episodes,
  screenWidth: W,
  screenHeight: H,
  onSwipeGestureStart,
  onSwipeGestureEnd,
  onSwipeProgress,
  isGestureActive = false,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showAdReward, setShowAdReward] = useState(false);
  const [showDanmakuInput, setShowDanmakuInput] = useState(false);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [localDanmakuList, setLocalDanmakuList] = useState<any[]>([]);
  const [danmakuRefresh, setDanmakuRefresh] = useState(0);
  const [decoderReady, setDecoderReady] = useState(false);
  const insets = useSafeAreaInsets();

  // Double-tap like animation state
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const heartsIdRef = useRef(0);

  // Long-press seek state
  const [longPressSeek, setLongPressSeek] = useState<'forward' | 'backward' | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedPlayStateRef = useRef(false);
  const longPressTimeRef = useRef(0); // Track seek position via ref to avoid closure bug

  // Swipe gesture progress
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);

  // Audio volume (animated via ref for real-time control)
  const volumeRef = useRef(1);
  const [videoVolume, setVideoVolume] = useState(1);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t } = useTranslation();
  const loadPoints = useWalletStore(state => state.loadPoints);

  const {
    playbackSpeed,
    danmakuEnabled,
    danmakuOpacity,
    setPlaybackSpeed,
    setDanmakuEnabled,
  } = usePlayerStore();

  const videoUri = useMemo(() => data.video_path ? getMediaUrl(data.video_path) : '', [data.video_path]);

  // Key includes index — forces FULL remount every time this item becomes active,
  // ensuring a fresh ExoPlayer/PlayerView instance (no SurfaceView reuse)
  const activeVideoKey = `player__${videoUri}__${index}`;
  const progressPercent = duration > 0 ? ((isSeeking ? seekPosition : currentTime) / duration) * 100 : 0;

  // Auto-hide controls after 4s
  useEffect(() => {
    if (isPlaying && !isLoading && !hasError) {
      controlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
    }
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [isPlaying, isLoading, hasError]);

  // ===== CORE LIFECYCLE: activate → destroy old → wait → create new → play =====
  // =====                deactivate → pause → destroy → unbind =====
  useEffect(() => {
    if (isActive) {
      // --- ENTERING ACTIVE ---
      // Step 1: Force-destroy the previous player (prevents Surface leak)
      VideoPlayManager.forceDestroy();

      // Step 2: Reset ALL state to clean slate
      setIsLoading(true);
      setHasError(false);
      setDecoderReady(false);
      setCurrentTime(0);
      setShowDanmakuInput(false);
      setLongPressSeek(null);
      setVideoVolume(1);
      if (longPressTimer.current) { clearInterval(longPressTimer.current); longPressTimer.current = null; }
      if (loadTimeoutTimer.current) { clearTimeout(loadTimeoutTimer.current); loadTimeoutTimer.current = null; }
      if (errorRetryTimer.current) { clearTimeout(errorRetryTimer.current); errorRetryTimer.current = null; }
      if (playDelayTimer.current) { clearTimeout(playDelayTimer.current); playDelayTimer.current = null; }
      videoRef.current = null; // clear ref — new instance will be created by mount

      // Step 3: Wait for ExoPlayer to release resources (CRITICAL — prevents black screen)
      playDelayTimer.current = setTimeout(() => {
        setIsPlaying(true);

        // Step 4: Start load timeout protection (5s — if still loading, retry)
        loadTimeoutTimer.current = setTimeout(() => {
          // If still loading after 5s, force retry
          setIsLoading(false);
          setHasError(false);
          setDecoderReady(false);
          // Small delay then retry
          errorRetryTimer.current = setTimeout(() => {
            setIsLoading(true);
            setIsPlaying(true);
          }, 300);
        }, 5000);
      }, 400); // 400ms delay — enough for ExoPlayer surface release
    } else {
      // --- LEAVING ACTIVE ---
      // Cancel all pending timers
      if (playDelayTimer.current) { clearTimeout(playDelayTimer.current); playDelayTimer.current = null; }
      if (loadTimeoutTimer.current) { clearTimeout(loadTimeoutTimer.current); loadTimeoutTimer.current = null; }
      if (errorRetryTimer.current) { clearTimeout(errorRetryTimer.current); errorRetryTimer.current = null; }

      // Pause immediately
      setIsPlaying(false);
      setDecoderReady(false);
      setShowDanmakuInput(false);
      setLongPressSeek(null);
      setVideoVolume(0);
      if (longPressTimer.current) { clearInterval(longPressTimer.current); longPressTimer.current = null; }

      // Release from global manager — unbinds + stops + seeks(0) the player
      VideoPlayManager.releaseCurrent();
      videoRef.current = null; // release reference
    }

    return () => {
      if (playDelayTimer.current) { clearTimeout(playDelayTimer.current); playDelayTimer.current = null; }
      if (loadTimeoutTimer.current) { clearTimeout(loadTimeoutTimer.current); loadTimeoutTimer.current = null; }
      if (errorRetryTimer.current) { clearTimeout(errorRetryTimer.current); errorRetryTimer.current = null; }
    };
  }, [isActive]);

  // When gesture is active (user is swiping), pause globally via VideoPlayManager
  useEffect(() => {
    if (isGestureActive && isActive) {
      savedPlayStateRef.current = isPlaying;
      VideoPlayManager.pauseAll(); // Global pause — prevents audio bleed
      setIsPlaying(false);
      setVideoVolume(0);
    } else if (!isGestureActive && isActive) {
      setVideoVolume(1);
      if (savedPlayStateRef.current) {
        setIsPlaying(true);
      }
    }
  }, [isGestureActive, isActive]);

  // Load danmaku from backend when episode becomes active
  useEffect(() => {
    if (!isActive || !data.drama_id || !data.id) return;
    let cancelled = false;
    commentService.getDanmaku(data.drama_id, data.id).then(list => {
      if (!cancelled && Array.isArray(list)) {
        setLocalDanmakuList(list);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isActive, data.drama_id, data.id]);

  // Seek when playback speed changes
  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.seek(0); // Trigger rate update via seek reset
      // Rate change is handled by the `rate` prop directly
    }
  }, [playbackSpeed, isActive]);

  // ===== Double-tap like: 300ms window =====
  const lastTapRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLoad = useCallback((d: OnLoadData) => {
    console.log(`[SwipeVideoItem] onLoad ep=${data.episode_number}`);
    setIsLoading(false);
    setHasError(false);
    setDuration(d.duration);
    setDecoderReady(true);
    // Clear load timeout — video loaded successfully
    if (loadTimeoutTimer.current) { clearTimeout(loadTimeoutTimer.current); loadTimeoutTimer.current = null; }
    if (errorRetryTimer.current) { clearTimeout(errorRetryTimer.current); errorRetryTimer.current = null; }
    // Bind to global manager when decoder is ready
    if (videoRef.current) {
      VideoPlayManager.bindPlayer(videoRef.current);
    }
  }, [data.episode_number]);

  const lastProgressRef = useRef(0);
  const handleProgress = useCallback((d: OnProgressData) => {
    const now = Date.now();
    if (now - lastProgressRef.current < 1000) return;
    lastProgressRef.current = now;
    if (!isSeeking) setCurrentTime(d.currentTime);
    const dur = d.playableDuration || duration;
    if (dur > 0) setDuration(dur);
    onProgressUpdate(d.currentTime, dur);
  }, [isSeeking, duration, onProgressUpdate]);

  const handleError = useCallback(() => {
    console.log(`[SwipeVideoItem] onError ep=${data.episode_number}, auto-retry in 600ms`);
    setIsLoading(false);
    setHasError(true);
    // Auto-retry after 600ms — silently recover without user intervention
    if (errorRetryTimer.current) { clearTimeout(errorRetryTimer.current); }
    errorRetryTimer.current = setTimeout(() => {
      console.log(`[SwipeVideoItem] auto-retrying ep=${data.episode_number}`);
      // Full reset: destroy old player instance, clear state, try again
      VideoPlayManager.forceDestroy();
      setHasError(false);
      setDecoderReady(false);
      setCurrentTime(0);
      setIsLoading(true);
      // Small delay to let ExoPlayer fully release before remounting
      setTimeout(() => {
        setIsPlaying(true);
      }, 200);
    }, 600);
  }, [data.episode_number]);

  const showControlsFn = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (isPlaying && !isLoading && !hasError) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [isPlaying, isLoading, hasError]);

  const togglePlayPause = useCallback(() => {
    showControlsFn();
    setIsPlaying(prev => !prev);
  }, [showControlsFn]);

  // Handle single/double tap
  // Double-tap: always add like (cumulative, never decrease)
  const handleTap = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected — always trigger like (cumulative only)
      if (tapTimeoutRef.current) { clearTimeout(tapTimeoutRef.current); tapTimeoutRef.current = null; }
      const heartId = ++heartsIdRef.current;
      setHearts(prev => [...prev, { id: heartId, x, y }]);
      // Always call onToggleLike to increment (never toggle off)
      onToggleLike(data.drama_id);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      lastTapPosRef.current = { x, y };
      // Wait to see if it becomes a double tap
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        // Single tap — toggle play/pause
        togglePlayPause();
      }, 300);
    }
  }, [togglePlayPause, onToggleLike, data.drama_id]);

  const removeHeart = useCallback((id: number) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  // ===== Long-press seek =====
  const handleLongPressStart = useCallback((x: number) => {
    if (!isActive || isLoading || hasError) return;
    savedPlayStateRef.current = isPlaying;
    setIsPlaying(false);

    const type = x < W * 0.3 ? 'backward' : x > W * 0.7 ? 'forward' : null;
    if (!type) return; // Middle area — no long press seek

    setLongPressSeek(type);
    // Immediately seek once
    const seekAmount = 5;
    longPressTimeRef.current = currentTime;
    if (type === 'forward') {
      const newPos = Math.min(duration, longPressTimeRef.current + seekAmount);
      videoRef.current?.seek(newPos);
      setCurrentTime(newPos);
      longPressTimeRef.current = newPos;
    } else {
      const newPos = Math.max(0, longPressTimeRef.current - seekAmount);
      videoRef.current?.seek(newPos);
      setCurrentTime(newPos);
      longPressTimeRef.current = newPos;
    }
    // Continue seeking while held — use ref to avoid closure bug
    longPressTimer.current = setInterval(() => {
      if (type === 'forward') {
        const newPos = Math.min(duration, longPressTimeRef.current + seekAmount);
        videoRef.current?.seek(newPos);
        setCurrentTime(newPos);
        longPressTimeRef.current = newPos;
      } else {
        const newPos = Math.max(0, longPressTimeRef.current - seekAmount);
        videoRef.current?.seek(newPos);
        setCurrentTime(newPos);
        longPressTimeRef.current = newPos;
      }
    }, 200);
  }, [isActive, isLoading, hasError, isPlaying, W, duration, currentTime]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) { clearInterval(longPressTimer.current); longPressTimer.current = null; }
    setLongPressSeek(null);
    if (savedPlayStateRef.current && isActive) {
      setIsPlaying(true);
    }
  }, [isActive]);

  const handleSeekStart = useCallback((pos: number) => {
    setSeekPosition(pos);
    setIsSeeking(true);
    showControlsFn();
  }, [showControlsFn]);

  const handleSeekEnd = useCallback((pos: number) => {
    setSeekPosition(pos);
    setCurrentTime(pos);
    setIsSeeking(false);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: data.drama_title || 'DramaFlix',
        message: `Watch "${data.drama_title || 'a drama'}" Ep.${data.episode_number} on DramaFlix! http://43.159.62.11`,
      });
      onShare?.(data.drama_id);
    } catch (_) {}
  }, [data.drama_id, data.drama_title, data.episode_number, onShare]);

  const retryPlay = useCallback(() => {
    // Full destroy + reset before retrying
    VideoPlayManager.forceDestroy();
    setHasError(false);
    setIsLoading(true);
    setDecoderReady(false);
    setCurrentTime(0);
    // Wait a frame for ExoPlayer to release, then retry
    setTimeout(() => {
      setIsPlaying(true);
    }, 200);
  }, []);

  const statusBarPadTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0);
  const bottomSafePad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? scale(8) : 20);

  const handleSendDanmaku = useCallback(() => {
    if (!danmakuInput.trim()) return;
    const newDanmaku = {
      id: -Date.now(),
      drama_id: data.drama_id,
      episode_id: data.id,
      user_id: 0,
      content: danmakuInput.trim(),
      time: currentTime,
      color: '#FFFFFF',
      position: 0,
      created_at: new Date().toISOString(),
    };
    setLocalDanmakuList(prev => [...prev, newDanmaku]);
    setDanmakuRefresh(prev => prev + 1);
    commentService.sendDanmaku(data.drama_id, data.id, danmakuInput.trim(), '#FFFFFF', 0, currentTime).catch(() => {});
    setDanmakuInput('');
    setShowDanmakuInput(false);
  }, [danmakuInput, data.drama_id, data.id, currentTime]);

  const progressWidth = Math.max(0, W - scale(28));

  // Video is paused when: user paused, decoder not ready, or gesture active
  const videoPaused = !isPlaying || !decoderReady;
  // Video is muted when: gesture is in progress
  const videoMuted = isGestureActive;

  // When controls auto-hide, collapse danmaku input to prevent blocking
  useEffect(() => {
    if (!controlsVisible) {
      setShowDanmakuInput(false);
    }
  }, [controlsVisible]);

  // Component unmount: full cleanup — release all timers and global player
  useEffect(() => {
    return () => {
      // Release global player on unmount
      VideoPlayManager.forceDestroy();
      // Clear ALL timers
      if (controlsTimer.current) { clearTimeout(controlsTimer.current); controlsTimer.current = null; }
      if (playDelayTimer.current) { clearTimeout(playDelayTimer.current); playDelayTimer.current = null; }
      if (loadTimeoutTimer.current) { clearTimeout(loadTimeoutTimer.current); loadTimeoutTimer.current = null; }
      if (errorRetryTimer.current) { clearTimeout(errorRetryTimer.current); errorRetryTimer.current = null; }
      if (longPressTimer.current) { clearInterval(longPressTimer.current); longPressTimer.current = null; }
    };
  }, []);

  // ===== Vertical swipe PanResponder for gesture-driven transition =====
  const panResponder = useMemo(() => {
    const SWIPE_THRESHOLD = 50;
    let startY = 0;
    let direction: 'up' | 'down' | null = null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical gestures with sufficient movement
        return Math.abs(gestureState.dy) > 15 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderGrant: (evt, gestureState) => {
        startY = gestureState.dy;
        direction = gestureState.dy < 0 ? 'up' : 'down';
        onSwipeGestureStart?.();
        setSwipeDirection(direction);
        setSwipeProgress(0);
        // Immediately pause and mute during gesture
        savedPlayStateRef.current = isPlaying;
        setIsPlaying(false);
        setVideoVolume(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const dy = gestureState.dy;
        const absDy = Math.abs(dy);
        const progress = Math.min(absDy / H, 1);
        setSwipeProgress(progress);
        // Fade audio out based on progress (handled by volume state)
        const newVolume = Math.max(0, 1 - progress * 2);
        setVideoVolume(newVolume);
        onSwipeProgress?.(dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const dy = gestureState.dy;
        const absDy = Math.abs(dy);
        const velocity = gestureState.vy;
        const completed = absDy > SWIPE_THRESHOLD || Math.abs(velocity) > 150;

        if (completed) {
          onSwipeGestureEnd?.(true);
        } else {
          // Bounce back — restore playback
          onSwipeGestureEnd?.(false);
          setVideoVolume(1);
          if (savedPlayStateRef.current && isActive) {
            setIsPlaying(true);
          }
        }
        setSwipeProgress(0);
        setSwipeDirection(null);
      },
      onPanResponderTerminate: () => {
        // Gesture interrupted — restore
        onSwipeGestureEnd?.(false);
        setVideoVolume(1);
        if (savedPlayStateRef.current && isActive) {
          setIsPlaying(true);
        }
        setSwipeProgress(0);
        setSwipeDirection(null);
      },
    });
  }, [H, isPlaying, isActive, onSwipeGestureStart, onSwipeGestureEnd, onSwipeProgress]);

  return (
    <View style={{ width: W, height: H, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />

      {/* ===== MAIN PLAYBACK INSTANCE ===== */}
      {/* Mount ONLY when active (key forces full remount = fresh ExoPlayer) */}
      {/* Unmount when inactive = pause + unbind Surface + destroy player */}
      {isActive ? (
      <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, overflow: 'hidden' }}>
        {videoUri ? (
          <Video
            key={activeVideoKey}
            ref={videoRef}
            source={{ uri: videoUri }}
            style={{ width: W, height: H }}
            resizeMode={ResizeMode.CONTAIN}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onEnd={onVideoEnd}
            onError={handleError}
            controls={false}
            repeat={false}
            paused={!isPlaying || !decoderReady}
            muted={isGestureActive}
            volume={isGestureActive ? 0 : videoVolume}
            posterResizeMode={ResizeMode.CONTAIN}
            allowsExternalPlayback={false}
            playInBackground={false}
            playWhenInactive={false}
            progressUpdateInterval={1000}
            rate={playbackSpeed}
            bufferConfig={{
              minBufferMs: 15000,
              maxBufferMs: 50000,
              bufferForPlaybackMs: 2500,
              bufferForPlaybackAfterRebufferMs: 5000,
            }}
          />
        ) : (
          <View style={styles.centerOverlay}>
            <Text style={styles.errorText}>{t('no_video')}</Text>
          </View>
        )}
      </View>
      ) : (
      <View style={[styles.centerOverlay, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
      </View>
      )}

      {/* ===== UI Overlays ===== */}
      <>

      {/* Danmaku overlay */}
      {isActive && (
        <DanmakuOverlay
          danmakuList={localDanmakuList}
          currentTime={currentTime}
          enabled={danmakuEnabled}
          opacity={danmakuOpacity}
          refreshTrigger={danmakuRefresh}
          screenWidth={W}
          screenHeight={H}
        />
      )}

      {/* Loading */}
      {isLoading && !hasError && isActive && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color={COLORS.primaryLight} />
        </View>
      )}

      {/* Error */}
      {hasError && !isLoading && (
        <View style={styles.centerOverlay}>
          <Text style={styles.errorText}>{t('playback_error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryPlay} activeOpacity={0.7}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===== Interactive touch area (double-tap like, long-press seek, single-tap pause) ===== */}
      {isActive && !isLoading && !hasError && (
        <View
          style={StyleSheet.absoluteFill}
          {...panResponder.panHandlers}
        >
          {/* Left zone (30%): long-press to rewind */}
          <TouchableOpacity
            style={[styles.touchZone, styles.touchZoneLeft]}
            activeOpacity={1}
            onPress={(e) => handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            onLongPress={(e) => handleLongPressStart(0)}
            onPressOut={handleLongPressEnd}
            delayLongPress={200}
          />
          {/* Center zone (40%): tap to play/pause only */}
          <TouchableOpacity
            style={styles.touchZoneCenter}
            activeOpacity={1}
            onPress={(e) => handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          />
          {/* Right zone (30%): long-press to fast-forward */}
          <TouchableOpacity
            style={[styles.touchZone, styles.touchZoneRight]}
            activeOpacity={1}
            onPress={(e) => handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            onLongPress={(e) => handleLongPressStart(W)}
            onPressOut={handleLongPressEnd}
            delayLongPress={200}
          />
        </View>
      )}

      {/* ===== Floating hearts from double-tap ===== */}
      {hearts.map(h => (
        <FloatingHeart key={h.id} x={h.x} y={h.y} onComplete={() => removeHeart(h.id)} />
      ))}

      {/* ===== Seek feedback overlay (long-press) ===== */}
      {longPressSeek && (
        <SeekFeedback type={longPressSeek} visible={true} label={longPressSeek === 'forward' ? t('seek_forward') : t('seek_backward')} />
      )}

      {/* ===== Swipe progress indicator ===== */}
      {swipeDirection && swipeProgress > 0.05 && (
        <SwipeIndicator direction={swipeDirection} progress={swipeProgress} />
      )}

      {/* ===== Top bar ===== */}
      {controlsVisible && !hasError && (
        <View style={styles.topFade}>
          <View style={[styles.topBar, { paddingTop: statusBarPadTop }]}>
            <View style={styles.epBadge}>
              <Text style={styles.epBadgeText}>EP.{data.episode_number}</Text>
            </View>
            <View style={styles.titleBox}>
              <Text style={styles.dramaTitle} numberOfLines={1}>{data.drama_title || ''}</Text>
              {data.title ? (
                <Text style={styles.epTitle} numberOfLines={1}>{data.title}</Text>
              ) : null}
            </View>
            <View style={styles.topRight}>
              {data.is_free === 0 && data.points_cost > 0 && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockText}>{data.points_cost} pts</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Play/Pause center */}
      {!isLoading && !isPlaying && !hasError && isActive && !longPressSeek && (
        <TouchableOpacity style={styles.playBtnCenter} onPress={togglePlayPause} activeOpacity={0.8}>
          <Text style={styles.playIconCenter}>{'\u25B6'}</Text>
        </TouchableOpacity>
      )}

      {/* ===== Right side actions ===== */}
      {!hasError && (
        <View style={[styles.rightActions, { bottom: H * 0.30 }]}>
          <ActionIcon icon={isLiked ? '\u{2764}\u{FE0F}' : '\u{1F90D}'} label={formatNumber(likeCount)} active={isLiked} onPress={() => onToggleLike(data.drama_id)} />
          <ActionIcon icon={isFavorited ? '\u{2B50}' : '\u{2606}'} label={formatNumber(collectCount)} active={isFavorited} onPress={() => onToggleFavorite(data.drama_id)} />
          <ActionIcon icon={'\u{1F4AC}'} label={formatNumber(commentCount)} active={false} onPress={() => { setShowComments(true); setIsPlaying(false); }} />
          <ActionIcon icon={danmakuEnabled ? '\u{1F5E3}\u{FE0F}' : '\u{1F507}'} label={danmakuEnabled ? t('danmaku_on') : t('danmaku_off')} active={danmakuEnabled} onPress={() => setDanmakuEnabled(!danmakuEnabled)} />
        </View>
      )}

      {/* ===== Bottom bar ===== */}
      {!hasError && (
        <View style={[styles.bottomBar, { paddingBottom: bottomSafePad }]}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
            <TouchableOpacity
              style={[styles.progressTouchArea, { width: progressWidth }]}
              onPress={(e: any) => {
                try {
                  const lx = e.nativeEvent.locationX;
                  const pos = Math.max(0, Math.min(lx / progressWidth, 1)) * duration;
                  handleSeekEnd(pos);
                } catch (_) {}
              }}
              activeOpacity={1}
            />
          </View>

          {/* Bottom action row: info + buttons — always fully visible */}
          <View style={styles.bottomActionRow}>
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomDramaTitle} numberOfLines={1}>{data.drama_title || ''}</Text>
              <Text style={styles.bottomEpText}>EP.{data.episode_number}/{data.episode_count || totalEpisodes}</Text>
            </View>
            <View style={styles.bottomBtns}>
              <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowEpisodes(true)} activeOpacity={0.7}>
                <Text style={styles.bottomBtnIcon}>{'\u2630'}</Text>
                <Text style={styles.bottomBtnLabel}>{t('episodes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowSpeedSelector(true)} activeOpacity={0.7}>
                <Text style={styles.bottomBtnIcon}>{playbackSpeed === 1 ? '\u25B6' : `${playbackSpeed}x`}</Text>
                <Text style={styles.bottomBtnLabel}>{t('speed')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowAdReward(true)} activeOpacity={0.7}>
                <Text style={[styles.bottomBtnIcon, styles.adBtnIcon]}>{'\u2605'}</Text>
                <Text style={[styles.bottomBtnLabel, styles.adBtnLabel]}>{t('free')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomBtn} onPress={handleShare} activeOpacity={0.7}>
                <Text style={styles.bottomBtnIcon}>{'\u21C4'}</Text>
                <Text style={styles.bottomBtnLabel}>{t('share')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Danmaku input — only shown when user taps to expand */}
          {showDanmakuInput && (
            <View style={styles.danmakuInputRow}>
              <TextInput
                style={styles.danmakuInput}
                placeholder={t('send_danmaku_hint')}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={danmakuInput}
                onChangeText={setDanmakuInput}
                maxLength={50}
                autoFocus
                onSubmitEditing={handleSendDanmaku}
                returnKeyType="send"
                onBlur={() => setShowDanmakuInput(false)}
              />
              <TouchableOpacity style={styles.danmakuSendBtn} onPress={handleSendDanmaku} activeOpacity={0.7}>
                <Text style={styles.danmakuSendText}>{t('send')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ===== Modals ===== */}
      <SpeedSelector
        visible={showSpeedSelector}
        currentSpeed={playbackSpeed}
        onSelect={setPlaybackSpeed}
        onClose={() => setShowSpeedSelector(false)}
      />

      <AdRewardModal
        visible={showAdReward}
        dramaId={data.drama_id}
        episodeId={data.id}
        rewardPoints={20}
        onClose={() => setShowAdReward(false)}
        onClaimed={async (points) => {
          try {
            const result = await adRewardService.claimReward(data.drama_id, data.id);
            Alert.alert(t('reward_claimed'), `+${result.points} ${t('points')}\n${t('reward_balance', { balance: result.balance })}`);
            loadPoints();
          } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to claim reward';
            Alert.alert(t('claim_failed'), msg);
          }
          setShowAdReward(false);
        }}
      />

      <CommentPanel
        visible={showComments}
        dramaId={data.drama_id}
        episodeId={data.id}
        onClose={() => {
          setShowComments(false);
          setIsPlaying(true);
        }}
      />

      <EpisodeSelector
        visible={showEpisodes}
        episodes={episodes}
        currentEpisodeId={data.id}
        onSelect={onSwitchEpisode}
        onClose={() => setShowEpisodes(false)}
      />

      </>
    </View>
  );
});

// ===== Small Action Button =====
const ActionIcon: React.FC<{ icon: string; label: string; active: boolean; onPress: () => void }> = memo(
  ({ icon, label, active, onPress }) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.actionIcon, active ? styles.actionIconActive : null]}>{icon}</Text>
      <Text style={[styles.actionLabel, active ? styles.actionLabelActive : null]}>{label}</Text>
    </TouchableOpacity>
  )
);

const styles = StyleSheet.create({
  centerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },

  // Touch zones for double-tap like / long-press seek
  touchZone: { flex: 1, justifyContent: 'center' },
  touchZoneLeft: { width: '30%' },
  touchZoneCenter: { width: '40%', position: 'absolute', left: '30%', top: 0, bottom: 0 },
  touchZoneRight: { width: '30%', position: 'absolute', right: 0, top: 0, bottom: 0 },

  // Seek feedback overlay
  seekOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 150,
  },
  seekCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekIcon: { color: '#FFF', fontSize: rf(24) },
  seekLabel: { color: '#FFF', fontSize: rf(12), marginTop: scale(4) },

  // Swipe progress indicator
  swipeIndicator: {
    position: 'absolute',
    left: scale(40),
    right: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    zIndex: 180,
  },
  swipeIndicatorUp: { top: scale(60) },
  swipeIndicatorDown: { bottom: scale(120) },
  swipeIndicatorFill: {
    height: '100%',
    borderRadius: scale(2),
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  swipeIndicatorText: {
    position: 'absolute',
    right: -scale(20),
    top: -scale(8),
    color: '#FFF',
    fontSize: rf(12),
  },

  // Top
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: scale(10), paddingHorizontal: scale(12) },
  epBadge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(12), backgroundColor: 'rgba(255,71,87,0.85)' },
  epBadgeText: { color: '#FFF', fontSize: rf(13), fontWeight: '700' },
  titleBox: { flex: 1, marginLeft: scale(10) },
  dramaTitle: { color: '#FFF', fontSize: rf(16), fontWeight: '700' },
  epTitle: { color: 'rgba(255,255,255,0.7)', fontSize: rf(13), marginTop: scale(2) },
  topRight: { alignItems: 'flex-end' },
  lockBadge: { paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(8), backgroundColor: 'rgba(255,184,0,0.85)' },
  lockText: { color: '#000', fontSize: rf(11), fontWeight: '700' },

  // Play center
  playBtnCenter: { position: 'absolute', width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  playIconCenter: { color: '#FFF', fontSize: rf(28), marginLeft: scale(4) },

  // Error
  errorText: { color: 'rgba(255,255,255,0.7)', fontSize: rf(16), marginBottom: scale(16) },
  retryBtn: { paddingHorizontal: scale(24), paddingVertical: scale(10), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.2)' },
  retryText: { color: '#FFF', fontSize: rf(15), fontWeight: '600' },

  // Right actions
  rightActions: { position: 'absolute', right: scale(10), alignItems: 'center' },
  actionBtn: { alignItems: 'center', marginBottom: scale(20) },
  actionIcon: { fontSize: rf(28), color: '#FFF' },
  actionIconActive: { color: COLORS.primaryLight },
  actionLabel: { color: 'rgba(255,255,255,0.85)', fontSize: rf(11), fontWeight: '600', marginTop: scale(4) },
  actionLabelActive: { color: COLORS.primaryLight },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: scale(8),
  },
  bottomActionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: scale(12), paddingRight: scale(8), marginTop: scale(4),
  },
  bottomInfo: { flex: 1, marginRight: scale(8) },
  bottomDramaTitle: { color: '#FFF', fontSize: rf(14), fontWeight: '700' },
  bottomEpText: { color: 'rgba(255,255,255,0.6)', fontSize: rf(12), marginTop: scale(2) },
  bottomBtns: { flexDirection: 'row', gap: scale(6), alignItems: 'center' },
  bottomBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: scale(10), paddingVertical: scale(6),
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: scale(14),
  },
  bottomBtnIcon: { fontSize: rf(18), color: '#FFF' },
  bottomBtnLabel: { fontSize: rf(10), color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: scale(1) },
  adBtnIcon: { color: COLORS.gold },
  adBtnLabel: { color: COLORS.gold },

  // Progress bar
  progressTrack: { height: scale(24), justifyContent: 'center', position: 'relative', marginLeft: scale(12), marginRight: scale(12) },
  progressFill: { height: scale(3), borderRadius: scale(1.5), backgroundColor: COLORS.primaryLight, position: 'absolute', left: 0, top: scale(10.5) },
  progressThumb: {
    position: 'absolute', width: scale(14), height: scale(14), borderRadius: scale(7),
    backgroundColor: '#FFF', marginLeft: -scale(7), top: scale(5),
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  progressTouchArea: { height: scale(24) },

  // Danmaku input — only visible when expanded
  danmakuInputRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: scale(12), marginTop: scale(8), gap: scale(8),
  },
  danmakuInput: {
    flex: 1, height: scale(36), borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: scale(16), color: '#FFF', fontSize: rf(14),
  },
  danmakuSendBtn: {
    paddingHorizontal: scale(16), height: scale(36), borderRadius: scale(18),
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  danmakuSendText: { color: '#FFF', fontSize: rf(14), fontWeight: '600' },
});

export default SwipeVideoItem;
