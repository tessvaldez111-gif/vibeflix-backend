// ===== Drama Card Component =====
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../services/api';
import { interactionService } from '../../services/interaction.service';
import { COLORS, GENRE_COLORS } from '../../utils/constants';
import { formatNumber } from '../../utils/format';
import { scale, rf } from '../../utils/responsive';
import type { Drama } from '../../types';

interface Props {
  drama: Drama;
}

export const DramaCard: React.FC<Props> = ({ drama }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const coverUrl = getMediaUrl(drama.cover_image);
  const [isFavorited, setIsFavorited] = useState(false);

  const onPress = () => {
    (navigation.navigate as any)('SwipePlayer', { dramaId: drama.id });
  };

  const onLongPress = () => {
    (navigation.navigate as any)('DramaDetail', { dramaId: drama.id });
  };

  const handleFavorite = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    try {
      if (isFavorited) {
        await interactionService.removeFavorite(drama.id, 'favorite');
        setIsFavorited(false);
      } else {
        await interactionService.addFavorite(drama.id, 'favorite');
        setIsFavorited(true);
      }
    } catch (_) {}
  }, [drama.id, isFavorited]);

  const genreColor = GENRE_COLORS[drama.genre.toLowerCase()] || COLORS.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
      <Image
        source={{ uri: coverUrl }}
        style={styles.cover}
        defaultSource={require('../../../assets/icon.png')}
      />
      <View style={[styles.genreBadge, { backgroundColor: genreColor }]}>
        <Text style={styles.genreText}>{drama.genre}</Text>
      </View>
      <TouchableOpacity
        style={styles.favBtn}
        onPress={handleFavorite}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.favIcon, isFavorited && styles.favIconActive]}>{isFavorited ? '\u2605' : '\u2606'}</Text>
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{drama.title}</Text>
        <Text style={styles.meta}>
          {drama.episode_count} {t('ep_abbr')} · {formatNumber(drama.view_count)} {t('views_abbr')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: scale(10),
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  cover: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: COLORS.secondaryContainer,
  },
  genreBadge: {
    position: 'absolute',
    top: scale(6),
    left: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  genreText: { color: '#FFF', fontSize: rf(10), fontWeight: '600' },
  favBtn: {
    position: 'absolute',
    top: scale(6),
    right: scale(6),
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favIcon: { fontSize: rf(16), color: '#FFF' },
  favIconActive: { color: COLORS.gold },
  info: { padding: scale(6) },
  title: { color: COLORS.onSurface, fontSize: rf(13), fontWeight: '500' },
  meta: { color: COLORS.onSurfaceVariant, fontSize: rf(11), marginTop: scale(2) },
});
