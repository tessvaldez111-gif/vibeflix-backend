// ===== Episode Selector (Bottom Sheet) =====
import React, { memo, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Animated, useWindowDimensions } from 'react-native';
import { COLORS, SPACING } from '../../utils/constants';
import { scale, rf, rw, verticalScale } from '../../utils/responsive';
import type { Episode } from '../../types';

const NUM_COLS = 5;

interface Props {
  visible: boolean;
  episodes: Episode[];
  currentEpisodeId: number;
  onSelect: (episode: Episode) => void;
  onClose: () => void;
}

const EpisodeSelector: React.FC<Props> = memo(({ visible, episodes, currentEpisodeId, onSelect, onClose }) => {
  const { width: windowWidth } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(500)).current;

  // Dynamic episode button size based on current screen width
  const epSize = (windowWidth - SPACING.md * 2 - (NUM_COLS - 1) * scale(10)) / NUM_COLS;
  // Responsive max height for the episode list (30% of screen height)
  const listMaxHeight = verticalScale(300);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleSelect = (ep: Episode) => {
    onSelect(ep);
    onClose();
  };

  const renderItem = ({ item }: { item: Episode }) => {
    const isCurrent = item.id === currentEpisodeId;
    const isLocked = !item.is_free && item.points_cost > 0;

    return (
      <TouchableOpacity
        style={[styles.epBtn, isCurrent && styles.epBtnCurrent, { width: epSize, height: epSize }]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.epNum, isCurrent && styles.epNumCurrent]}>{item.episode_number}</Text>
        {isLocked && !isCurrent && <Text style={styles.lockSmall}>{'\u{1F512}'}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]} onStartShouldSetResponder={() => true}>
          <View style={styles.handleRow}>
            <View style={styles.handleBar} />
          </View>
          <Text style={styles.title}>Episodes ({episodes.length})</Text>
          <FlatList
            data={episodes}
            renderItem={renderItem}
            keyExtractor={item => `es-${item.id}`}
            numColumns={NUM_COLS}
            columnWrapperStyle={styles.row}
            style={[styles.list, { maxHeight: listMaxHeight }]}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#1E1C28',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '55%',
    paddingHorizontal: SPACING.md,
    paddingBottom: scale(24),
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: scale(12),
    marginBottom: scale(8),
  },
  handleBar: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: '#FFF',
    fontSize: rf(16),
    fontWeight: '700',
    marginBottom: scale(12),
  },
  list: {
    // maxHeight set dynamically via inline style
  },
  row: {
    gap: scale(10),
    marginBottom: scale(10),
  },
  epBtn: {
    borderRadius: scale(10),
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  epBtnCurrent: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  epNum: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: rf(15),
    fontWeight: '600',
  },
  epNumCurrent: {
    color: '#FFF',
  },
  lockSmall: {
    position: 'absolute',
    bottom: scale(2),
    right: scale(4),
    fontSize: rf(9),
  },
});

export default EpisodeSelector;
