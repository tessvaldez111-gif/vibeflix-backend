// ===== Drama Card Component =====
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getMediaUrl } from '../../services/api';
import { COLORS, SPACING, GENRE_COLORS } from '../../utils/constants';
import { formatNumber } from '../../utils/format';
import type { Drama } from '../../types';

interface Props {
  drama: Drama;
}

export const DramaCard: React.FC<Props> = ({ drama }) => {
  const navigation = useNavigation();
  const coverUrl = getMediaUrl(drama.cover_image);

  const onPress = () => {
    navigation.navigate('DramaDetail' as never, { dramaId: drama.id } as never);
  };

  const genreColor = GENRE_COLORS[drama.genre.toLowerCase()] || COLORS.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={{ uri: coverUrl }}
        style={styles.cover}
        defaultSource={require('../../../assets/icon.png')}
      />
      <View style={[styles.genreBadge, { backgroundColor: genreColor }]}>
        <Text style={styles.genreText}>{drama.genre}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{drama.title}</Text>
        <Text style={styles.meta}>
          {drama.episode_count} ep · {formatNumber(drama.view_count)} views
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: SPACING.xs,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: COLORS.secondaryContainer,
  },
  genreBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  genreText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  info: { padding: 8 },
  title: { color: COLORS.onSurface, fontSize: 14, fontWeight: '500' },
  meta: { color: COLORS.onSurfaceVariant, fontSize: 12, marginTop: 2 },
});
