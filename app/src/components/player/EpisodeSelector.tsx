// ===== Episode Selector (Bottom Sheet) =====
import React, { memo, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Animated, Dimensions } from 'react-native';
import { COLORS, SPACING } from '../../utils/constants';
import type { Episode } from '../../types';

const { width: W } = Dimensions.get('window');
const NUM_COLS = 5;

interface Props {
  visible: boolean;
  episodes: Episode[];
  currentEpisodeId: number;
  onSelect: (episode: Episode) => void;
  onClose: () => void;
}

const EpisodeSelector: React.FC<Props> = memo(({ visible, episodes, currentEpisodeId, onSelect, onClose }) => {
  const slideAnim = useRef(new Animated.Value(500)).current;

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
        style={[styles.epBtn, isCurrent && styles.epBtnCurrent]}
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
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
});

const EP_SIZE = (W - SPACING.md * 2 - (NUM_COLS - 1) * 10) / NUM_COLS;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#1E1C28',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
    paddingHorizontal: SPACING.md,
    paddingBottom: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  list: {
    maxHeight: 300,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },
  epBtn: {
    width: EP_SIZE,
    height: EP_SIZE,
    borderRadius: 10,
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
    fontSize: 15,
    fontWeight: '600',
  },
  epNumCurrent: {
    color: '#FFF',
  },
  lockSmall: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    fontSize: 9,
  },
});

export default EpisodeSelector;
