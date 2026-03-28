// ===== Danmaku (Bullet Comments) Overlay =====
import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import type { Danmaku } from '../../types';

const { width: W } = Dimensions.get('window');

interface DanmakuItem extends Danmaku {
  _animX: Animated.Value;
  _id: string;
  _position: number; // 0=top, 1=center, 2=bottom
}

interface Props {
  danmakuList: Danmaku[];
  currentTime: number;
  enabled: boolean;
  opacity: number; // 0-1
}

const TRACK_HEIGHT = 28;
const TRACK_GAP = 4;
const TOP_TRACKS = 8;
const CENTER_TRACKS = 3;
const SPEED_MS = 8000; // time for danmaku to cross screen

const DanmakuOverlay: React.FC<Props> = memo(({ danmakuList, currentTime, enabled, opacity }) => {
  const activeRef = useRef<DanmakuItem[]>([]);
  const [visibleItems, setVisibleItems] = React.useState<DanmakuItem[]>([]);
  const renderedIds = useRef<Set<string>>(new Set());
  const cleanupTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter danmaku that should appear at current time (within 1s window)
  const getNewDanmaku = useCallback((time: number): DanmakuItem[] => {
    const newItems: DanmakuItem[] = [];
    for (const d of danmakuList) {
      if (renderedIds.current.has(String(d.id))) continue;
      if (Math.abs(d.time - time) < 1.0) {
        renderedIds.current.add(String(d.id));
        newItems.push({
          ...d,
          _animX: new Animated.Value(W),
          _id: `d-${d.id}-${Math.random().toString(36).slice(2, 6)}`,
          _position: d.position || 0,
        });
      }
    }
    return newItems;
  }, [danmakuList]);

  // Start animation for a danmaku item
  const startAnimation = useCallback((item: DanmakuItem) => {
    Animated.timing(item._animX, {
      toValue: -W - 200,
      duration: SPEED_MS,
      useNativeDriver: true,
    }).start(() => {
      // Remove from active list after animation completes
      activeRef.current = activeRef.current.filter(a => a._id !== item._id);
      setVisibleItems([...activeRef.current]);
      // Do NOT delete from renderedIds — danmaku should only appear once
    });
  }, []);

  // Watch for new danmaku at current time
  useEffect(() => {
    if (!enabled) {
      // When disabled, clear everything
      activeRef.current = [];
      setVisibleItems([]);
      // Note: don't clear renderedIds so re-enabling won't replay old ones
      return;
    }

    const newDanmaku = getNewDanmaku(currentTime);
    if (newDanmaku.length > 0) {
      activeRef.current = [...activeRef.current, ...newDanmaku];
      newDanmaku.forEach(startAnimation);
      setVisibleItems([...activeRef.current]);
    }

    // Periodic cleanup to remove finished animations from visible list
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
  }, [currentTime, enabled, getNewDanmaku, startAnimation]);

  // Reset when episode changes (clear rendered IDs)
  useEffect(() => {
    renderedIds.current.clear();
    activeRef.current = [];
    setVisibleItems([]);
  }, [danmakuList.length]);

  if (!enabled || visibleItems.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top tracks */}
      <View style={styles.topArea}>
        {visibleItems
          .filter(d => d._position === 0)
          .map((d, i) => (
            <Animated.View
              key={d._id}
              style={[
                styles.danmakuWrapper,
                { top: (i % TOP_TRACKS) * (TRACK_HEIGHT + TRACK_GAP) },
                { transform: [{ translateX: d._animX }] },
                { opacity },
              ]}
            >
              <Text style={[styles.danmakuText, { color: d.color || '#FFF' }]}>{d.content}</Text>
            </Animated.View>
          ))}
      </View>

      {/* Center tracks (high priority) */}
      {visibleItems
        .filter(d => d._position === 1)
        .map((d, i) => (
          <Animated.View
            key={d._id}
            style={[
              styles.danmakuWrapperCenter,
              { top: 100 + (i % CENTER_TRACKS) * (TRACK_HEIGHT + TRACK_GAP) },
              { transform: [{ translateX: d._animX }] },
              { opacity },
            ]}
          >
            <Text style={[styles.danmakuTextCenter, { color: d.color || '#FFF' }]}>{d.content}</Text>
          </Animated.View>
        ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  topArea: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: TOP_TRACKS * (TRACK_HEIGHT + TRACK_GAP),
  },
  danmakuWrapper: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  danmakuText: {
    fontSize: 15,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  danmakuWrapperCenter: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  danmakuTextCenter: {
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default DanmakuOverlay;
