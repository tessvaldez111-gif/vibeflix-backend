// ===== Loading Spinner Component =====
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';

interface Props {
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ size = 'large', color = COLORS.primaryLight }) => (
  <View style={styles.container}>
    <ActivityIndicator size={size} color={color} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
