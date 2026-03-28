// ===== Swipe Video Item (single video card for TikTok-style player) =====
// Enhanced: Playback speed, danmaku, ad reward, comments, episode selector
import React, { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator, StatusBar, Share, Platform, TextInput, Alert,
} from 'react-native';
import Video, { VideoRef, ResizeMode, OnLoadData, OnProgressData } from 'react-native-video';
import { getMediaUrl } from '../../services/api';
import { formatDuration, formatNumber } from '../../utils/format';
import { COLORS } from '../../utils/constants';
import { usePlayerStore, PLAYBACK_SPEEDS, type PlaybackSpeed } from '../../stores/playerStore';
import DanmakuOverlay from './DanmakuOverlay';
import SpeedSelector from './SpeedSelector';
import AdRewardModal from './AdRewardModal';
import CommentPanel from './CommentPanel';
import EpisodeSelector from './EpisodeSelector';
import type { Episode, SwipeEpisodeData as SwipeData } from '../../types';

const { width: W, height: H } = Dimensions.get('window');

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
}

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
  const [danmakuInput, setDanmakuInput] = useState('');
  const [showDanmakuInput, setShowDanmakuInput] = useState(false);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    playbackSpeed,
    danmakuEnabled,
    danmakuList,
    danmakuOpacity,
    setPlaybackSpeed,
    setDanmakuEnabled,
    setDanmakuList,
  } = usePlayerStore();

  // Memoize video URI
  const videoUri = useMemo(() => data.video_path ? getMediaUrl(data.video_path) : '', [data.video_path]);
  const progressPercent = duration > 0 ? ((isSeeking ? seekPosition : currentTime) / duration) * 100 : 0;
  const displayTime = isSeeking ? seekPosition : currentTime;

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && !isLoading && !hasError) {
      controlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
        setShowDanmakuInput(false);
      }, 4000);
    }
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [isPlaying, isLoading, hasError]);

  // Play/pause based on isActive
  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => setIsPlaying(true), 150);
      return () => clearTimeout(t);
    } else {
      setIsPlaying(false);
    }
  }, [isActive]);

  // Seek when playback speed changes
  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.setNativeProps?.({ rate: playbackSpeed });
    }
  }, [playbackSpeed, isActive]);

  // Double-tap to seek
  const lastTapRef = useRef(0);
  const doubleTapXRef = useRef(W / 2);

  const handleLoad = useCallback((d: OnLoadData) => {
    setIsLoading(false);
    setHasError(false);
    setDuration(d.duration);
  }, []);

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
    setIsLoading(false);
    setHasError(true);
  }, []);

  const showControlsFn = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (isPlaying && !isLoading && !hasError) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [isPlaying, isLoading, hasError]);

  const togglePlayPause = useCallback(() => {
    const now = Date.now();
    const x = doubleTapXRef.current;
    if (now - lastTapRef.current < 300) {
      // Double tap - seek
      const seekAmount = 10;
      if (x < W * 0.4) {
        // Seek backward
        const newPos = Math.max(0, (isSeeking ? seekPosition : currentTime) - seekAmount);
        videoRef.current?.seek(newPos);
        setSeekPosition(newPos);
        setIsSeeking(true);
        setTimeout(() => setIsSeeking(false), 300);
      } else if (x > W * 0.6) {
        // Seek forward
        const newPos = Math.min(duration, (isSeeking ? seekPosition : currentTime) + seekAmount);
        videoRef.current?.seek(newPos);
        setSeekPosition(newPos);
        setIsSeeking(true);
        setTimeout(() => setIsSeeking(false), 300);
      }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    showControlsFn();
    setIsPlaying(prev => !prev);
  }, [isSeeking, seekPosition, currentTime, duration, showControlsFn]);

  const handleDoubleTapArea = useCallback((x: number) => {
    doubleTapXRef.current = x;
  }, []);

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
    setHasError(false);
    setIsLoading(true);
    setIsPlaying(true);
  }, []);

  const statusBarPadTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 50;

  const handleSendDanmaku = useCallback(() => {
    if (!danmakuInput.trim()) return;
    // Add locally for instant display
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
    usePlayerStore.getState().setDanmakuList([...usePlayerStore.getState().danmakuList, newDanmaku]);
    setDanmakuInput('');
    setShowDanmakuInput(false);
  }, [danmakuInput, data.drama_id, data.id, currentTime]);

  const progressWidth = Math.max(0, W - 32);

  // Seek indicator text
  const getSeekText = () => {
    if (x > W * 0.6) return '\u25B6\u25B6 +10s';
    return '\u25C0\u25C0 -10s';
  };
  const x = doubleTapXRef.current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />

      {/* Video */}
      <View style={styles.videoWrapper}>
        {videoUri ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onEnd={onVideoEnd}
            onError={handleError}
            useNativeControls={false}
            repeat={false}
            paused={!isActive || !isPlaying}
            posterResizeMode={ResizeMode.CONTAIN}
            allowsExternalPlayback={false}
            playInBackground={false}
            progressUpdateInterval={1000}
            rate={playbackSpeed}
            bufferConfig={{
              minBufferMs: 15000,
              maxBufferMs: 50000,
              bufferForPlaybackMs: 2500,
              bufferForPlaybackAfterRebufferMs: 5000,
            }}
            controls={false}
          />
        ) : (
          <View style={styles.centerOverlay}>
            <Text style={styles.errorText}>No video</Text>
          </View>
        )}
      </View>

      {/* Danmaku overlay */}
      {isActive && (
        <DanmakuOverlay
          danmakuList={danmakuList}
          currentTime={currentTime}
          enabled={danmakuEnabled}
          opacity={danmakuOpacity}
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
          <Text style={styles.errorText}>Playback Error</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryPlay} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tap to play/pause (with double-tap seek) */}
      {isActive && !isLoading && !hasError && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={(e) => {
            handleDoubleTapArea(e.nativeEvent.locationX);
            togglePlayPause();
          }}
        />
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
      {!isLoading && !isPlaying && !hasError && isActive && (
        <TouchableOpacity style={styles.playBtnCenter} onPress={togglePlayPause} activeOpacity={0.8}>
          <Text style={styles.playIconCenter}>{'\u25B6'}</Text>
        </TouchableOpacity>
      )}

      {/* ===== Right side actions ===== */}
      {controlsVisible && !hasError && (
        <View style={styles.rightActions}>
          <View style={styles.dramaCover}>
            <Text style={styles.dramaCoverEmoji}>{'\u{1F3AC}'}</Text>
          </View>
          <Text style={styles.dramaCoverLabel}>{data.episode_count || totalEpisodes} eps</Text>

          <View style={styles.actionSpacing} />
          <ActionIcon icon={isLiked ? '\u2764' : '\u2661'} label={formatNumber(likeCount)} active={isLiked} onPress={() => onToggleLike(data.drama_id)} />
          <ActionIcon icon={isFavorited ? '\u2605' : '\u2606'} label={formatNumber(collectCount)} active={isFavorited} onPress={() => onToggleFavorite(data.drama_id)} />
          <ActionIcon icon={danmakuEnabled ? '\u{1F4AC}' : '\u{1F4AC}'} label={danmakuEnabled ? 'Danmaku' : 'Off'} active={danmakuEnabled} onPress={() => setDanmakuEnabled(!danmakuEnabled)} />
          <ActionIcon icon={'\u21AA'} label={formatNumber(shareCount)} active={false} onPress={handleShare} />
          <ActionIcon icon={'\u{1F4F9}'} label="Episodes" active={false} onPress={() => setShowEpisodes(true)} />
        </View>
      )}

      {/* ===== Bottom bar ===== */}
      {controlsVisible && !hasError && (
        <View style={styles.bottomBar}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressPercent + '%' }]} />
            <View style={[styles.progressThumb, { left: progressPercent + '%' }]} />
            <TouchableOpacity
              style={[styles.progressTouchArea, { width: progressWidth }]}
              onMove={(e: any) => {
                try {
                  const lx = e.nativeEvent.locationX;
                  const pos = Math.max(0, Math.min(lx / progressWidth, 1)) * duration;
                  handleSeekStart(pos);
                } catch (_) {}
              }}
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

          {/* Time row + controls */}
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatDuration(displayTime)}</Text>
            <View style={styles.controlBtns}>
              {/* Speed button */}
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowSpeedSelector(true)} activeOpacity={0.7}>
                <Text style={styles.ctrlText}>{playbackSpeed === 1 ? '1x' : `${playbackSpeed}x`}</Text>
              </TouchableOpacity>

              {/* Ad reward button */}
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowAdReward(true)} activeOpacity={0.7}>
                <Text style={[styles.ctrlText, styles.adBtnText]}>{'\u{1F680}'} Ad</Text>
              </TouchableOpacity>

              {/* Comment button */}
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowComments(true)} activeOpacity={0.7}>
                <Text style={styles.ctrlText}>{formatNumber(commentCount)} {'\u{1F4AC}'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.timeText}>{formatDuration(duration)}</Text>
          </View>

          {/* Episode indicator */}
          <View style={styles.epIndicator}>
            <Text style={styles.epIndicatorText}>
              {data.drama_title} {'\u00B7'} EP.{data.episode_number}/{data.episode_count || totalEpisodes}
            </Text>
          </View>

          {/* Danmaku input (inline) */}
          {showDanmakuInput && (
            <View style={styles.danmakuInputRow}>
              <TextInput
                style={styles.danmakuInput}
                placeholder="Send a danmaku..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={danmakuInput}
                onChangeText={setDanmakuInput}
                maxLength={50}
                autoFocus
                onSubmitEditing={handleSendDanmaku}
              />
              <TouchableOpacity style={styles.danmakuSendBtn} onPress={handleSendDanmaku} activeOpacity={0.7}>
                <Text style={styles.danmakuSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ===== Modals ===== */}
      {/* Speed selector */}
      <SpeedSelector
        visible={showSpeedSelector}
        currentSpeed={playbackSpeed}
        onSelect={setPlaybackSpeed}
        onClose={() => setShowSpeedSelector(false)}
      />

      {/* Ad reward modal */}
      <AdRewardModal
        visible={showAdReward}
        dramaId={data.drama_id}
        episodeId={data.id}
        rewardPoints={20}
        onClose={() => setShowAdReward(false)}
        onClaimed={() => {
          Alert.alert('Reward Claimed!', '+20 points added to your balance');
          setShowAdReward(false);
        }}
      />

      {/* Comment panel */}
      <CommentPanel
        visible={showComments}
        dramaId={data.drama_id}
        episodeId={data.id}
        onClose={() => setShowComments(false)}
      />

      {/* Episode selector */}
      <EpisodeSelector
        visible={showEpisodes}
        episodes={episodes}
        currentEpisodeId={data.id}
        onSelect={onSwitchEpisode}
        onClose={() => setShowEpisodes(false)}
      />
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
  container: { width: W, height: H, backgroundColor: '#000' },
  videoWrapper: { position: 'absolute', top: 0, left: 0, width: W, height: H, overflow: 'hidden' },
  video: { width: W, height: H },
  centerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },

  // Top
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, paddingHorizontal: 12 },
  epBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(103,80,164,0.85)' },
  epBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  titleBox: { flex: 1, marginLeft: 10 },
  dramaTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  epTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  topRight: { alignItems: 'flex-end' },
  lockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255,184,0,0.85)' },
  lockText: { color: '#000', fontSize: 11, fontWeight: '700' },

  // Play center
  playBtnCenter: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  playIconCenter: { color: '#FFF', fontSize: 28, marginLeft: 4 },

  // Error
  errorText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  retryText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Right actions
  rightActions: { position: 'absolute', right: 10, bottom: H * 0.22, alignItems: 'center' },
  dramaCover: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dramaCoverEmoji: { fontSize: 20 },
  dramaCoverLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 16 },
  actionSpacing: { height: 10 },
  actionBtn: { alignItems: 'center', marginBottom: 18 },
  actionIcon: { fontSize: 24, color: '#FFF' },
  actionIconActive: { color: COLORS.primaryLight },
  actionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '500', marginTop: 3 },
  actionLabelActive: { color: COLORS.primaryLight },

  // Bottom
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 8 : 20,
  },
  progressTrack: { height: 24, justifyContent: 'center', position: 'relative', marginLeft: 16, marginRight: 16 },
  progressFill: { height: 3, borderRadius: 1.5, backgroundColor: COLORS.primaryLight, position: 'absolute', left: 0, top: 10.5 },
  progressThumb: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FFF', marginLeft: -7, top: 5,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  progressTouchArea: { height: 24 },

  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingLeft: 16, paddingRight: 16, marginTop: -2,
  },
  timeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  controlBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ctrlBtn: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  ctrlText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  adBtnText: { color: COLORS.gold },

  epIndicator: { marginTop: 6, alignItems: 'center' },
  epIndicatorText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },

  // Danmaku input
  danmakuInputRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8, gap: 8,
  },
  danmakuInput: {
    flex: 1, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, color: '#FFF', fontSize: 13,
  },
  danmakuSendBtn: {
    paddingHorizontal: 14, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  danmakuSendText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});

export default SwipeVideoItem;
