// ===== Follow Tab (追剧) =====
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, SPACING } from '../../utils/constants';
import type { Drama } from '../../types';

// Simple in-memory store for followed dramas (uses local favorites API)
interface FollowItem {
  drama_id: number;
  drama_title: string;
  drama_cover: string;
  drama_genre: string;
  episode_count: number;
  status: string;
  last_episode: number;
  updated_at: string;
}

export const FollowTab: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [follows, setFollows] = useState<FollowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFollows = useCallback(async () => {
    setIsLoading(true);
    try {
      // We'll load from watch history (which contains drama info)
      // In a real app this would be a dedicated "follow/subscribe" API
      // For now we use the interaction service's favorites
      const { default: api } = await import('../../services/api');
      const token = await import('../../stores/authStore').then(s => s.useAuthStore.getState().token);
      if (!token) {
        setFollows([]);
        setIsLoading(false);
        return;
      }
      const res = await fetch(`${api.API_BASE_URL}/api/users/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items: FollowItem[] = (data.favorites || data || []).map((d: any) => ({
          drama_id: d.drama_id || d.id,
          drama_title: d.drama_title || d.title,
          drama_cover: d.drama_cover || d.cover_image,
          drama_genre: d.genre || '',
          episode_count: d.episode_count || 0,
          status: d.status || '',
          last_episode: d.last_episode || 0,
          updated_at: d.updated_at || '',
        }));
        setFollows(items);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollows();
  }, []);

  const onPressDrama = (item: FollowItem) => {
    (navigation.navigate as any)('DramaDetail', { dramaId: item.drama_id });
  };

  const renderItem = ({ item }: { item: FollowItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPressDrama(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: getMediaUrl(item.drama_cover) }}
        style={styles.cover}
        defaultSource={require('../../../assets/icon.png')}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.drama_title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.genre}>{item.drama_genre}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{item.episode_count} {t('ep_abbr')}</Text>
        </View>
        <Text style={styles.status}>
          {item.status === 'completed' ? t('status_completed') : t('status_ongoing')}
        </Text>
      </View>
      <TouchableOpacity style={styles.continueBtn}>
        <Text style={styles.continueBtnText}>{t('continue_watch')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tab_follow')}</Text>

      {follows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📺</Text>
          <Text style={styles.emptyTitle}>{t('no_follow_title')}</Text>
          <Text style={styles.emptyHint}>{t('no_follow_hint')}</Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('TheaterTab' as never)}
          >
            <Text style={styles.exploreBtnText}>{t('go_explore')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={follows}
          renderItem={renderItem}
          keyExtractor={(item) => `follow-${item.drama_id}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cover: {
    width: 70,
    height: 94,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryContainer,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  genre: {
    color: COLORS.primaryLight,
    fontSize: 12,
  },
  dot: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    marginHorizontal: 4,
  },
  meta: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  status: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  continueBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  continueBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  emptyHint: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 250,
    marginBottom: SPACING.lg,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  exploreBtnText: {
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
