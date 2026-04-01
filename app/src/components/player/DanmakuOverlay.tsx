// ===== Danmaku (Bullet Comments) Overlay =====
// 弹幕统一显示在视频画面上方区域（顶部 2/5），不影响视频主体观看
import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { scale, rf } from '../../utils/responsive';
import type { Danmaku } from '../../types';

interface DanmakuItem extends Danmaku {
  _animX: Animated.Value;
  _id: string;
  _track: number; // assigned track index for vertical positioning
}

interface Props {
  danmakuList: Danmaku[];
  currentTime: number;
  enabled: boolean;
  opacity: number;
  refreshTrigger?: number;
  screenWidth?: number;
  screenHeight?: number;
}

const TRACK_HEIGHT = scale(26);
const TRACK_GAP = scale(3);
const SPEED_MS = 8000;
const COOLDOWN_MS = SPEED_MS + 2000;

const DanmakuOverlay: React.FC<Props> = memo(({
  danmakuList, currentTime, enabled, opacity,
  refreshTrigger = 0, screenWidth = 0, screenHeight = 0,
}) => {
  const W = screenWidth > 0 ? screenWidth : require('react-native').Dimensions.get('window').width;
  const H = screenHeight > 0 ? screenHeight : require('react-native').Dimensions.get('window').height;

  // 弹幕区域：从顶部开始，向下延伸至视频总高度的 2/5
  const danmakuZoneHeight = Math.floor(H * 0.4);
  // 计算可用轨道数（留顶部安全边距 scale(8)）
  const safeTop = scale(8);
  const usableHeight = danmakuZoneHeight - safeTop;
  const MAX_TRACKS = Math.max(1, Math.floor(usableHeight / (TRACK_HEIGHT + TRACK_GAP)));

  // Track occupancy: track index -> timestamp when it will be free
  // A track is "free" when the last danmaku on it has moved far enough to not overlap
  const trackFreeAt = useRef<number[]>(new Array(MAX_TRACKS).fill(0));

  const activeRef = useRef<DanmakuItem[]>([]);
  const [visibleItems, setVisibleItems] = React.useState<DanmakuItem[]>([]);
  const lastShownTime = useRef<Map<string, number>>(new Map());
  const cleanupTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProcessedTime = useRef<number>(-1);

  // Find the next available track
  const findFreeTrack = useCallback((): number => {
    const now = Date.now();
    for (let i = 0; i < MAX_TRACKS; i++) {
      if (trackFreeAt.current[i] <= now) {
        return i;
      }
    }
    // All tracks busy, use round-robin (overwrite least recently used)
    return 0;
  }, [MAX_TRACKS]);

  const getNewDanmaku = useCallback((time: number): DanmakuItem[] => {
    const now = Date.now();
    const newItems: DanmakuItem[] = [];
    for (const d of danmakuList) {
      const dId = String(d.id);
      const lastShown = lastShownTime.current.get(dId) || 0;
      if (now - lastShown < COOLDOWN_MS) continue;
      const delta = Math.abs(d.time - time);
      if (delta < 1.5) {
        lastShownTime.current.set(dId, now);
        const track = findFreeTrack();
        // Estimate how long this danmaku occupies its track
        // Based on text width: roughly (text length * char width + padding) / screen width * speed
        const textWidth = (d.content?.length || 10) * rf(15) * 0.6 + scale(24);
        const crossTime = (W + textWidth) / (W + 200) * SPEED_MS;
        trackFreeAt.current[track] = now + crossTime * 0.6; // free after 60% of crossing
        newItems.push({
          ...d,
          _animX: new Animated.Value(W),
          _id: `d-${d.id}-${Math.random().toString(36).slice(2, 6)}`,
          _track: track,
        });
      }
    }
    return newItems;
  }, [danmakuList, W, findFreeTrack]);

  const startAnimation = useCallback((item: DanmakuItem) => {
    Animated.timing(item._animX, {
      toValue: -W - 300,
      duration: SPEED_MS,
      useNativeDriver: true,
    }).start(() => {
      activeRef.current = activeRef.current.filter(a => a._id !== item._id);
      setVisibleItems([...activeRef.current]);
    });
  }, [W]);

  useEffect(() => {
    if (!enabled) {
      activeRef.current = [];
      setVisibleItems([]);
      lastProcessedTime.current = -1;
      return;
    }

    const isRefresh = refreshTrigger > 0;
    if (currentTime === lastProcessedTime.current && !isRefresh) return;
    lastProcessedTime.current = currentTime;

    const newDanmaku = getNewDanmaku(currentTime);
    if (newDanmaku.length > 0) {
      activeRef.current = [...activeRef.current, ...newDanmaku];
      newDanmaku.forEach(startAnimation);
      setVisibleItems([...activeRef.current]);
    }

    if (!cleanupTimer.current) {
      cleanupTimer.current = setInterval(() => {
        if (activeRef.current.length !== visibleItems.length) {
          setVisibleItems([...activeRef.current]);
        }
      }, 2000);
    }

    return () => {
      if (cleanupTimer.current) {
        clearInterval(cleanupTimer.current);
        cleanupTimer.current = null;
      }
    };
  }, [currentTime, enabled, getNewDanmaku, startAnimation, refreshTrigger]);

  useEffect(() => {
    lastShownTime.current.clear();
    trackFreeAt.current = new Array(MAX_TRACKS).fill(0);
    activeRef.current = [];
    setVisibleItems([]);
  }, [danmakuList.length, MAX_TRACKS]);

  if (!enabled || visibleItems.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { height: danmakuZoneHeight },
      ]}
      pointerEvents="none"
    >
      {visibleItems.map((d) => {
        const isCenter = d.position === 1;
        return (
          <Animated.View
            key={d._id}
            style={[
              styles.danmakuWrapper,
              {
                top: safeTop + d._track * (TRACK_HEIGHT + TRACK_GAP),
                transform: [{ translateX: d._animX }],
                opacity,
              },
            ]}
          >
            <Text
              style={[
                styles.danmakuText,
                isCenter && styles.danmakuTextCenter,
                { color: d.color || '#FFF' },
              ]}
            >
              {d.content}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  danmakuWrapper: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: scale(12),
  },
  danmakuText: {
    fontSize: rf(14),
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  danmakuTextCenter: {
    fontSize: rf(15),
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: scale(8),
    borderRadius: scale(4),
    overflow: 'hidden',
  },
});

export default DanmakuOverlay;
