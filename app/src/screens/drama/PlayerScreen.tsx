// ===== Video Player Screen =====
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Video, { VideoRef, ResizeMode, OnLoadData, OnProgressData } from 'react-native-video';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { usePlayerStore } from '../../stores';
import { getMediaUrl } from '../../services/api';
import { formatDuration } from '../../utils/format';
import { COLORS, AUTO_SAVE_INTERVAL, PLAYER_CONTROLS_TIMEOUT } from '../../utils/constants';
import * as ScreenOrientation from 'expo-screen-orientation';

type RouteParams = {
  dramaId: number;
  episodeId: number;
  videoPath: string;
};

export const PlayerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { dramaId, videoPath } = route.params as RouteParams;
  const videoRef = useRef<VideoRef>(null);
  const { setProgress, saveProgress, clearPlayer } = usePlayerStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Lock screen to landscape (native only)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        ScreenOrientation.unlockAsync();
      };
    }
  }, []);

  // Auto save progress every N seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTime > 0) {
        saveProgress();
      }
    }, AUTO_SAVE_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [currentTime, saveProgress]);

  // Save progress when leaving
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      saveProgress();
      clearPlayer();
    });
    return unsubscribe;
  }, [navigation, saveProgress, clearPlayer]);

  const onLoad = useCallback((data: OnLoadData) => {
    setIsLoading(false);
    setDuration(data.duration);
    setProgress(0, data.duration);
  }, [setProgress]);

  const onProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    const dur = data.duration || duration;
    setDuration(dur);
    setProgress(data.currentTime, dur);
  }, [setProgress]);

  const onEnd = useCallback(() => {
    saveProgress();
  }, [saveProgress]);

  const togglePlayPause = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
    setShowControls(true);
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  // Auto-hide controls after timeout
  useEffect(() => {
    if (!showControls || !isPlaying) return;
    const timer = setTimeout(() => {
      setShowControls(false);
    }, PLAYER_CONTROLS_TIMEOUT);
    return () => clearTimeout(timer);
  }, [showControls, isPlaying]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container} onTouchEnd={toggleControls}>
      <Video
        ref={videoRef}
        source={{ uri: getMediaUrl(videoPath) }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        onLoad={onLoad}
        onProgress={onProgress}
        onEnd={onEnd}
        onPlaybackStateChanged={(state) => {
          setIsPlaying(state.isPlaying);
          setIsLoading(state.isLoading);
        }}
        useNativeControls={false}
        onError={(e) => {
          console.error('Video error:', e);
          setIsLoading(false);
        }}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primaryLight} />
        </View>
      )}

      {/* Controls Overlay */}
      {showControls && !isLoading && (
        <View style={styles.controlsOverlay}>
          {/* Play/Pause Button */}
          <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.timeText}>{formatDuration(duration)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 40,
    color: '#FFF',
  },
  progressRow: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.primaryLight,
  },
  timeText: {
    color: '#FFF',
    fontSize: 13,
    width: 48,
  },
});
