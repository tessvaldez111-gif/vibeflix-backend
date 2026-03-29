// ===== Swipe Video Item (single video card for TikTok-style player) =====
// Enhanced: Playback speed, danmaku, ad reward, comments, episode selector
import React, { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Share, Platform, TextInput, Alert,
} from 'react-native';
import Video, { VideoRef, ResizeMode, OnLoadData, OnProgressData } from 'react-native-video';
import { getMediaUrl } from '../../services/api';
import { adRewardService, commentService } from '../../services/comment.service';
import { formatDuration, formatNumber } from '../../utils/format';
import { COLORS } from '../../utils/constants';
import { usePlayerStore, PLAYBACK_SPEEDS, type PlaybackSpeed } from '../../stores/playerStore';
import { useWalletStore } from '../../stores/walletStore';
import DanmakuOverlay from './DanmakuOverlay';
import SpeedSelector from './SpeedSelector';
import AdRewardModal from './AdRewardModal';
import CommentPanel from './CommentPanel';
import EpisodeSelector from './EpisodeSelector';
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
  screenWidth: W,
  screenHeight: H,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  // Controls visible on tap, but right-side buttons always visible
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showAdReward, setShowAdReward] = useState(false);
  const [danmakuInput, setDanmakuInput] = useState('');
  // Local danmaku list for this episode (loaded from backend + user-sent)
  const [localDanmakuList, setLocalDanmakuList] = useState<any[]>([]);
  // Trigger danmaku overlay refresh when user sends a new danmaku
  const [danmakuRefresh, setDanmakuRefresh] = useState(0);
  // Track if video decoder is ready to prevent audio bleed
  const [decoderReady, setDecoderReady] = useState(false);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track previous active state to detect transitions
  const prevActiveRef = useRef(false);
  // Delay play timer to ensure old video audio stops before new one starts
  const playDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPoints = useWalletStore(state => state.loadPoints);

  const {
    playbackSpeed,
    danmakuEnabled,
    danmakuOpacity,
    setPlaybackSpeed,
    setDanmakuEnabled,
  } = usePlayerStore();

  // Memoize video URI
  const videoUri = useMemo(() => data.video_path ? getMediaUrl(data.video_path) : '', [data.video_path]);

  // Use videoUri + index as key: ensures Video fully remounts on EVERY index change,
  // even when swiping back to a previously visited episode (same videoUri).
  // This completely destroys the old audio decoder and prevents audio bleed / frozen frame.
  const activeVideoKey = `${videoUri}__${index}`;
  const progressPercent = duration > 0 ? ((isSeeking ? seekPosition : currentTime) / duration) * 100 : 0;

  // Auto-hide only the top title bar after 4s
  useEffect(() => {
    if (isPlaying && !isLoading && !hasError) {
      controlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
    }
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [isPlaying, isLoading, hasError]);

  // Play/pause based on isActive - FIXED: prevent audio bleed when swiping
  useEffect(() => {
    if (isActive) {
      // Becoming active: reset state but DON'T start playing immediately
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);
      setHasError(false);
      setLocalDanmakuList([]);
      setDecoderReady(false);

      // Clear any pending play timer
      if (playDelayTimer.current) {
        clearTimeout(playDelayTimer.current);
        playDelayTimer.current = null;
      }

      // Delay play start to ensure previous video's audio decoder is fully released.
      // ExoPlayer needs time to tear down the old instance before creating a new one.
      playDelayTimer.current = setTimeout(() => {
        setIsPlaying(true);
      }, 300);
    } else {
      // Becoming inactive: STOP immediately and cancel any pending play
      if (playDelayTimer.current) {
        clearTimeout(playDelayTimer.current);
        playDelayTimer.current = null;
      }
      setIsPlaying(false);
      setDecoderReady(false);
    }
    prevActiveRef.current = isActive;

    return () => {
      if (playDelayTimer.current) {
        clearTimeout(playDelayTimer.current);
        playDelayTimer.current = null;
      }
    };
  }, [isActive]);

  // Load danmaku from backend when episode becomes active
  useEffect(() => {
    if (!isActive || !data.drama_id || !data.id) return;
    let cancelled = false;
    commentService.getDanmaku(data.drama_id, data.id).then(list => {
      if (!cancelled && Array.isArray(list)) {
        setLocalDanmakuList(list);
      }
    }).catch(() => {
      // Silently fail - danmaku is optional
    });
    return () => { cancelled = true; };
  }, [isActive, data.drama_id, data.id]);

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
    // Mark decoder as ready - video frames will now render
    setDecoderReady(true);
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
    // Only auto-hide top bar, bottom bar & right actions stay
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
    // Add to local list for instant display
    setLocalDanmakuList(prev => [...prev, newDanmaku]);
    // Force danmaku overlay to re-evaluate immediately
    setDanmakuRefresh(prev => prev + 1);
    // Also send to backend (include time so server stores it correctly)
    commentService.sendDanmaku(data.drama_id, data.id, danmakuInput.trim(), '#FFFFFF', 0, currentTime).catch(() => {});
    setDanmakuInput('');
  }, [danmakuInput, data.drama_id, data.id, currentTime]);

  const progressWidth = Math.max(0, W - 28);
  // Update getSeekText to use W properly
  const seekTextX = doubleTapXRef.current;

  // Seek indicator text
  const getSeekText = () => {
    if (seekTextX > W * 0.6) return '\u25B6\u25B6 +10s';
    return '\u25C0\u25C0 -10s';
  };

  return (
    <View style={{ width: W, height: H, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />

      {/* Video */}
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
            useNativeControls={false}
            repeat={false}
            paused={!isActive || !isPlaying || !decoderReady}
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
          danmakuList={localDanmakuList}
          currentTime={currentTime}
          enabled={danmakuEnabled}
          opacity={danmakuOpacity}
          refreshTrigger={danmakuRefresh}
          screenWidth={W}
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

      {/* ===== Right side actions (always visible) ===== */}
      {!hasError && (
        <View style={[styles.rightActions, { bottom: H * 0.28 }]}>
          <ActionIcon icon={isLiked ? '\u{2764}\u{FE0F}' : '\u{1F90D}'} label={formatNumber(likeCount)} active={isLiked} onPress={() => onToggleLike(data.drama_id)} />
          <ActionIcon icon={isFavorited ? '\u{2B50}' : '\u{2606}'} label={formatNumber(collectCount)} active={isFavorited} onPress={() => onToggleFavorite(data.drama_id)} />
          <ActionIcon icon={'\u{1F4AC}'} label={formatNumber(commentCount)} active={false} onPress={() => { setShowComments(true); setIsPlaying(false); }} />
          <ActionIcon icon={danmakuEnabled ? '\u{1F5E3}\u{FE0F}' : '\u{1F507}'} label={danmakuEnabled ? '弹幕开' : '弹幕关'} active={danmakuEnabled} onPress={() => {
            setDanmakuEnabled(!danmakuEnabled);
          }} />
        </View>
      )}

      {/* ===== Bottom bar (Hongguo style: progress + action row) ===== */}
      {!hasError && (
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

          {/* Bottom action row: title, controls, share */}
          <View style={styles.bottomActionRow}>
            {/* Left: drama info + episode indicator */}
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomDramaTitle} numberOfLines={1}>{data.drama_title || ''}</Text>
              <Text style={styles.bottomEpText}>EP.{data.episode_number}/{data.episode_count || totalEpisodes}</Text>
            </View>

            {/* Right: action buttons */}
            <View style={styles.bottomBtns}>
              <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowEpisodes(true)} activeOpacity={0.7}>
                <Text style={styles.bottomBtnIcon}>{'\u2630'}</Text>
                <Text style={styles.bottomBtnLabel}>{'\u9009\u96C6'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowSpeedSelector(true)} activeOpacity={0.7}>
                <Text style={styles.bottomBtnIcon}>{playbackSpeed === 1 ? '\u25B6' : `${playbackSpeed}x`}</Text>
                <Text style={styles.bottomBtnLabel}>{'\u901F\u5EA6'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowAdReward(true)} activeOpacity={0.7}>
                <Text style={[styles.bottomBtnIcon, styles.adBtnIcon]}>{'\u2605'}</Text>
                <Text style={[styles.bottomBtnLabel, styles.adBtnLabel]}>{'\u514D\u8D39'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomBtn} onPress={handleShare} activeOpacity={0.7}>
                <Text style={styles.bottomBtnIcon}>{'\u21C4'}</Text>
                <Text style={styles.bottomBtnLabel}>{'\u5206\u4EAB'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Danmaku input (always visible) */}
          <View style={styles.danmakuInputRow}>
            <TextInput
              style={styles.danmakuInput}
              placeholder="发个弹幕..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={danmakuInput}
              onChangeText={setDanmakuInput}
              maxLength={50}
              onSubmitEditing={handleSendDanmaku}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.danmakuSendBtn} onPress={handleSendDanmaku} activeOpacity={0.7}>
              <Text style={styles.danmakuSendText}>{'\u53D1\u9001'}</Text>
            </TouchableOpacity>
          </View>
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
        onClaimed={async (points) => {
          try {
            const result = await adRewardService.claimReward(data.drama_id, data.id);
            Alert.alert('奖励领取成功!', `+${result.points} 积分已到账! 余额: ${result.balance}`);
            // Refresh wallet to update points balance
            loadPoints();
          } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to claim reward';
            Alert.alert('领取失败', msg);
          }
          setShowAdReward(false);
        }}
      />

      {/* Comment panel */}
      <CommentPanel
        visible={showComments}
        dramaId={data.drama_id}
        episodeId={data.id}
        onClose={() => {
          setShowComments(false);
          setIsPlaying(true);
        }}
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
  centerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },

  // Top
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, paddingHorizontal: 12 },
  epBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,71,87,0.85)' },
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

  // Right actions (Hongguo style) - bottom set dynamically via inline style
  rightActions: { position: 'absolute', right: 10, alignItems: 'center' },
  actionBtn: { alignItems: 'center', marginBottom: 20 },
  actionIcon: { fontSize: 30, color: '#FFF' },
  actionIconActive: { color: COLORS.primaryLight },
  actionLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  actionLabelActive: { color: COLORS.primaryLight },

  // Bottom bar (Hongguo style: progress + action row)
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 8 : 24,
  },
  bottomActionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 14, paddingRight: 10, marginTop: 4,
  },
  bottomInfo: { flex: 1, marginRight: 10 },
  bottomDramaTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  bottomEpText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  bottomBtns: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  bottomBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
  },
  bottomBtnIcon: { fontSize: 20, color: '#FFF' },
  bottomBtnLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: 1 },
  adBtnIcon: { color: COLORS.gold },
  adBtnLabel: { color: COLORS.gold },

  // Progress bar
  progressTrack: { height: 24, justifyContent: 'center', position: 'relative', marginLeft: 14, marginRight: 14 },
  progressFill: { height: 3, borderRadius: 1.5, backgroundColor: COLORS.primaryLight, position: 'absolute', left: 0, top: 10.5 },
  progressThumb: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FFF', marginLeft: -7, top: 5,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  progressTouchArea: { height: 24 },

  // Danmaku input
  danmakuInputRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8, gap: 8,
  },
  danmakuInput: {
    flex: 1, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16, color: '#FFF', fontSize: 14,
  },
  danmakuSendBtn: {
    paddingHorizontal: 16, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  danmakuSendText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});

export default SwipeVideoItem;
