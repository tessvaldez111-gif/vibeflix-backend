// ===== Vertical Video Player Screen (TikTok-style) =====
// Compatibility: Works across all Android versions and devices
// Fixed: Dynamic Dimensions for landscape/handheld orientation, safe area, error handling
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator, StatusBar, Share, Platform,
  SafeAreaView, I18nManager,
} from 'react-native';
import Video, { VideoRef, ResizeMode, OnLoadData, OnProgressData, OnErrorData } from 'react-native-video';
import { useRoute, useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../../stores';
import { getMediaUrl } from '../../services/api';
import { interactionService } from '../../services/interaction.service';
import { formatDuration } from '../../utils/format';
import { COLORS, AUTO_SAVE_INTERVAL } from '../../utils/constants';

type RouteParams = {
  dramaId: number;
  episodeId: number;
  videoPath: string;
  dramaTitle?: string;
  episodeTitle?: string;
};

export const PlayerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params || {}) as RouteParams;
  const dramaId = params.dramaId;
  const episodeId = params.episodeId;
  const videoPath = params.videoPath;
  const dramaTitle = params.dramaTitle || '';
  const episodeTitle = params.episodeTitle || '';

  const videoRef = useRef<VideoRef>(null);
  const { setProgress, saveProgress, clearPlayer } = usePlayerStore();

  // ===== Dynamic dimensions (react to orientation changes) =====
  const [dims, setDims] = useState(() => {
    const d = Dimensions.get('window');
    return { w: d.width, h: d.height };
  });

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window: w }) => {
      setDims({ w: w.width, h: w.height });
    });
    return () => sub.remove();
  }, []);

  const isLandscape = dims.w > dims.h;
  const SCREEN_W = dims.w;
  const SCREEN_H = dims.h;

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Force portrait orientation
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const lock = async () => {
        try {
          const ScreenOrientation = require('expo-screen-orientation');
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch (_) {
          // expo-screen-orientation not available
        }
      };
      lock();
      return () => {
        try {
          const ScreenOrientation = require('expo-screen-orientation');
          ScreenOrientation.unlockAsync().catch(() => {});
        } catch (_) {}
      };
    }
  }, []);

  // Auto-hide controls after 4 seconds of playing
  useEffect(() => {
    if (isPlaying && !isLoading && !error) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 4000);
    }
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [isPlaying, isLoading, error]);

  // Load interaction status
  useEffect(() => {
    if (dramaId) {
      interactionService.checkFavorite(dramaId, 'like').then(setIsLiked).catch(() => {});
      interactionService.checkFavorite(dramaId, 'favorite').then(setIsFavorited).catch(() => {});
    }
  }, [dramaId]);

  // Auto save progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTime > 0) saveProgress();
    }, AUTO_SAVE_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [currentTime, saveProgress]);

  // Save on leave
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      saveProgress();
      clearPlayer();
    });
    return unsub;
  }, [navigation, saveProgress, clearPlayer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (isPlaying && !isLoading && !error) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [isPlaying, isLoading, error]);

  const onLoad = useCallback((data: OnLoadData) => {
    try {
      setIsLoading(false);
      setError(null);
      setDuration(data.duration);
      setProgress(0, data.duration);
    } catch (_) {}
  }, [setProgress]);

  const onProgress = useCallback((data: OnProgressData) => {
    try {
      if (!isSeeking) {
        setCurrentTime(data.currentTime);
      }
      const dur = data.duration || duration;
      if (dur > 0) {
        setDuration(dur);
        setProgress(data.currentTime, dur);
      }
    } catch (_) {}
  }, [setProgress, isSeeking, duration]);

  const onEnd = useCallback(() => {
    try { saveProgress(); } catch (_) {}
  }, [saveProgress]);

  const onError = useCallback((e: OnErrorData) => {
    console.warn('Video playback error:', e?.error?.errorString || e?.error || JSON.stringify(e));
    setIsLoading(false);
    setError('Playback failed');
  }, []);

  const togglePlayPause = useCallback(() => {
    try {
      showControls();
      if (isPlaying) {
        videoRef.current?.pauseAsync();
      } else {
        videoRef.current?.playAsync();
      }
    } catch (_) {}
  }, [isPlaying, showControls]);

  const handleSeek = useCallback((pos: number) => {
    try {
      setSeekPosition(pos);
      setIsSeeking(true);
      showControls();
    } catch (_) {}
  }, [showControls]);

  const handleSeekRelease = useCallback((pos: number) => {
    try {
      videoRef.current?.seek(pos);
      setCurrentTime(pos);
      setIsSeeking(false);
    } catch (_) {}
  }, []);

  const toggleLike = useCallback(async () => {
    if (!dramaId) return;
    try {
      if (isLiked) {
        await interactionService.removeFavorite(dramaId, 'like');
      } else {
        await interactionService.addFavorite(dramaId, 'like');
      }
      setIsLiked(!isLiked);
    } catch (_) {}
  }, [dramaId, isLiked]);

  const toggleFavorite = useCallback(async () => {
    if (!dramaId) return;
    try {
      if (isFavorited) {
        await interactionService.removeFavorite(dramaId, 'favorite');
      } else {
        await interactionService.addFavorite(dramaId, 'favorite');
      }
      setIsFavorited(!isFavorited);
    } catch (_) {}
  }, [dramaId, isFavorited]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: dramaTitle || 'DramaFlix',
        message: dramaTitle
          ? 'Watch "' + dramaTitle + '" on DramaFlix! http://43.159.62.11/drama/' + dramaId
          : 'Check out DramaFlix! http://43.159.62.11',
      });
    } catch (_) {}
  }, [dramaTitle, dramaId]);

  const goBack = useCallback(() => {
    try { navigation.goBack(); } catch (_) {}
  }, [navigation]);

  // Retry on error
  const retryPlay = useCallback(() => {
    try {
      setError(null);
      setIsLoading(true);
      setIsPlaying(false);
      setTimeout(() => {
        videoRef.current?.seek(0);
        videoRef.current?.playAsync();
      }, 300);
    } catch (_) {}
  }, []);

  const progressPercent = duration > 0 ? ((isSeeking ? seekPosition : currentTime) / duration) * 100 : 0;
  const displayTime = isSeeking ? seekPosition : currentTime;

  // Build video source safely
  const videoUri = videoPath ? getMediaUrl(videoPath) : '';

  // Status bar padding (top safe area)
  const statusBarPadTop = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 50;

  // Landscape-specific adjustments
  const overlayOpacity = isLandscape ? 0.7 : 0.4;
  const rightActionsBottom = isLandscape ? SCREEN_H * 0.35 : SCREEN_H * 0.15;

  // Dynamic styles based on current dimensions
  const dynamicVideoWrapper = {
    width: SCREEN_W,
    height: SCREEN_H,
  };
  const dynamicVideo = {
    width: SCREEN_W,
    height: SCREEN_H,
  };
  const dynamicProgressTouchArea = {
    width: SCREEN_W - 32,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />

      {/* Video - uses dynamic dimensions */}
      <View style={[styles.videoWrapper, dynamicVideoWrapper]}>
        {videoUri ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={[styles.video, dynamicVideo]}
            resizeMode={ResizeMode.CONTAIN}
            onLoad={onLoad}
            onProgress={onProgress}
            onEnd={onEnd}
            onError={onError}
            onPlaybackStateChanged={(state: any) => {
              try {
                setIsPlaying(!!state?.isPlaying);
                setIsLoading(!!state?.isLoading);
              } catch (_) {}
            }}
            useNativeControls={false}
            repeat={false}
            paused={!isPlaying}
            // Android ExoPlayer compatibility
            posterResizeMode={ResizeMode.CONTAIN}
            allowsExternalPlayback={false}
            playInBackground={false}
            progressUpdateInterval={500}
            // TextureView for better Android compatibility (some devices crash with SurfaceView)
            textureView={true}
          />
        ) : (
          <View style={styles.centerOverlay}>
            <Text style={styles.errorText}>No video URL</Text>
          </View>
        )}
      </View>

      {/* Loading */}
      {isLoading && !error && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color={COLORS.primaryLight} />
        </View>
      )}

      {/* Error overlay */}
      {error && !isLoading && (
        <View style={styles.centerOverlay}>
          <Text style={styles.errorText}>Playback Error</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryPlay} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryBtn, styles.retryBtnMargin]} onPress={goBack} activeOpacity={0.7}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tap to play/pause overlay */}
      {!isLoading && !error && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={togglePlayPause}
        />
      )}

      {/* Top bar: Back + Title */}
      {!error && controlsVisible && (
        <View style={[styles.topFade, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}>
          <View style={[styles.topBar, { paddingTop: statusBarPadTop }]}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
              <Text style={styles.backIcon}>{I18nManager.isRTL ? '\u276F' : '\u276E'}</Text>
            </TouchableOpacity>
            {dramaTitle ? (
              <View style={styles.titleBox}>
                <Text style={styles.titleText} numberOfLines={1}>{dramaTitle}</Text>
                {episodeTitle ? (
                  <Text style={styles.episodeText} numberOfLines={1}>{episodeTitle}</Text>
                ) : null}
              </View>
            ) : null}
            <View style={styles.backBtnPlaceholder} />
          </View>
        </View>
      )}

      {/* Play/Pause center indicator */}
      {!isLoading && !isPlaying && !error && (
        <TouchableOpacity style={styles.playBtnCenter} onPress={togglePlayPause} activeOpacity={0.8}>
          <Text style={styles.playIconCenter}>{'\u25B6'}</Text>
        </TouchableOpacity>
      )}

      {/* Right side floating action buttons */}
      {!error && controlsVisible && (
        <View style={[styles.rightActions, { bottom: rightActionsBottom }]}>
          <ActionBtn icon={isLiked ? '\u2764' : '\u2661'} label="Like" active={isLiked} onPress={toggleLike} />
          <ActionBtn icon={isFavorited ? '\u2605' : '\u2606'} label="Collect" active={isFavorited} onPress={toggleFavorite} />
          <ActionBtn icon={'\u21AA'} label="Share" active={false} onPress={handleShare} />
        </View>
      )}

      {/* Bottom: Progress bar + time */}
      {!error && controlsVisible && (
        <SafeAreaView style={styles.bottomSafe}>
          <View style={[styles.bottomFade, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressPercent + '%' }]} />
              <View style={[styles.progressThumb, { left: progressPercent + '%' }]} />
              <TouchableOpacity
                style={[styles.progressTouchArea, dynamicProgressTouchArea]}
                onMove={(e: any) => {
                  try {
                    const x = e.nativeEvent.locationX;
                    const pos = Math.max(0, Math.min(x / (SCREEN_W - 32), 1)) * duration;
                    handleSeek(pos);
                  } catch (_) {}
                }}
                onPress={(e: any) => {
                  try {
                    const x = e.nativeEvent.locationX;
                    const pos = Math.max(0, Math.min(x / (SCREEN_W - 32), 1)) * duration;
                    handleSeekRelease(pos);
                  } catch (_) {}
                }}
                activeOpacity={1}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatDuration(displayTime)}</Text>
              <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

// ===== Floating Action Button Component =====
const ActionBtn: React.FC<{
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
    <Text style={[styles.actionIcon, active ? styles.actionIconActive : null]}>{icon}</Text>
    <Text style={[styles.actionLabel, active ? styles.actionLabelActive : null]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    // width/height set dynamically
  },
  video: {
    // width/height set dynamically via inline style
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== Top bar with fade =====
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  backBtnPlaceholder: {
    width: 36,
  },
  titleBox: {
    flex: 1,
    marginLeft: 10,
  },
  titleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  episodeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },

  // ===== Error =====
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retryBtnMargin: {
    marginTop: 10,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // ===== Play/Pause center =====
  playBtnCenter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  playIconCenter: {
    color: '#FFF',
    fontSize: 28,
    marginLeft: 4,
  },

  // ===== Right action buttons =====
  rightActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionIcon: {
    fontSize: 28,
    color: '#FFF',
  },
  actionIconActive: {
    color: '#FF4757',
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  actionLabelActive: {
    color: '#FF4757',
  },

  // ===== Bottom bar =====
  bottomSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomFade: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 24,
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 16,
    marginRight: 16,
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.primaryLight,
    position: 'absolute',
    left: 0,
    top: 10.5,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    marginLeft: -7,
    top: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  progressTouchArea: {
    height: 24,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 16,
    marginTop: -2,
  },
  timeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
});
