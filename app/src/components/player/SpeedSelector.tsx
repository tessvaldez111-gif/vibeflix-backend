// ===== Playback Speed Selector =====
import React, { memo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '../../stores/playerStore';
import { COLORS } from '../../utils/constants';
import { scale, rf } from '../../utils/responsive';

interface Props {
  currentSpeed: PlaybackSpeed;
  onSelect: (speed: PlaybackSpeed) => void;
  visible: boolean;
  onClose: () => void;
}

const SpeedSelector: React.FC<Props> = memo(({ currentSpeed, onSelect, visible, onClose }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
      <Animated.View style={[styles.container, { opacity }]} pointerEvents="box-none">
        <Text style={styles.title}>Playback Speed</Text>
        <View style={styles.grid}>
          {PLAYBACK_SPEEDS.map((speed) => (
            <TouchableOpacity
              key={speed}
              style={[styles.speedBtn, speed === currentSpeed && styles.speedBtnActive]}
              onPress={() => { onSelect(speed); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.speedText, speed === currentSpeed && styles.speedTextActive]}>
                {speed === 1 ? '1x' : `${speed}x`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'rgba(30,28,40,0.95)',
    borderRadius: scale(16),
    padding: scale(20),
    width: scale(260),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#FFF',
    fontSize: rf(15),
    fontWeight: '600',
    marginBottom: scale(16),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: scale(10),
  },
  speedBtn: {
    width: scale(70),
    height: scale(38),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedBtnActive: {
    backgroundColor: COLORS.primary,
  },
  speedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: rf(15),
    fontWeight: '600',
  },
  speedTextActive: {
    color: '#FFF',
  },
});

export default SpeedSelector;
