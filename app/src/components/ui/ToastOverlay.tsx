// ===== Toast Overlay Component (iOS) =====
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS } from '../../utils/constants';
import { rf, rw } from '../../utils/responsive';

interface ToastOverlayProps {
  visible: boolean;
  message: string;
  type?: 'default' | 'success' | 'error';
}

export const ToastOverlay: React.FC<ToastOverlayProps> = ({ visible, message, type = 'default' }) => {
  const { width: windowWidth } = useWindowDimensions();

  if (!visible) return null;

  const bgColor = type === 'error' ? COLORS.error
    : type === 'success' ? COLORS.success
    : COLORS.surface;

  const borderColor = type === 'error' ? '#B3261E'
    : type === 'success' ? '#2E7D32'
    : COLORS.outline;

  return (
    <View style={[styles.container, { top: rw(8) }]} pointerEvents="none">
      <View style={[styles.toast, { backgroundColor: bgColor, borderColor, width: windowWidth * 0.8 }]}>
        <Text style={styles.text} numberOfLines={2}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  text: {
    color: '#FFF',
    fontSize: rf(14),
    textAlign: 'center',
  },
});
