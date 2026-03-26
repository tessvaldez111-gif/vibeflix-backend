// ===== Toast Overlay Component (iOS) =====
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ToastOverlayProps {
  visible: boolean;
  message: string;
  type?: 'default' | 'success' | 'error';
}

export const ToastOverlay: React.FC<ToastOverlayProps> = ({ visible, message, type = 'default' }) => {
  if (!visible) return null;

  const bgColor = type === 'error' ? COLORS.error
    : type === 'success' ? COLORS.success
    : COLORS.surface;

  const borderColor = type === 'error' ? '#B3261E'
    : type === 'success' ? '#2E7D32'
    : COLORS.outline;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.toast, { backgroundColor: bgColor, borderColor }]}>
        <Text style={styles.text} numberOfLines={2}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
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
    width: Dimensions.get('window').width * 0.8,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
});
