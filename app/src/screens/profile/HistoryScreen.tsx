// ===== Watch History Screen =====
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { interactionService } from '../../services';
import { getMediaUrl } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../hooks';
import { COLORS, SPACING } from '../../utils/constants';
import { formatRelativeTime, formatDuration } from '../../utils/format';
import type { WatchHistoryItem } from '../../types';

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const toast = useToast();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await interactionService.getHistory();
      setHistory(data);
    } catch {
      toast.error(t('load_history_failed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadHistory();
  };

  const onClearHistory = () => {
    Alert.alert(
      t('clear_history'),
      t('clear_history_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clear'),
          style: 'destructive',
          onPress: async () => {
            try {
              await interactionService.clearHistory();
              setHistory([]);
              toast.success(t('history_cleared'));
            } catch {
              toast.error(t('clear_history_failed'));
            }
          },
        },
      ],
    );
  };

  const onItemPress = (item: WatchHistoryItem) => {
    navigation.navigate('DramaDetail' as never, { dramaId: item.drama_id } as never);
  };

  const renderItem = ({ item }: { item: WatchHistoryItem }) => {
    const progressPercent = item.duration > 0
      ? Math.min((item.progress / item.duration) * 100, 100)
      : 0;

    return (
      <TouchableOpacity style={styles.item} onPress={() => onItemPress(item)} activeOpacity={0.8}>
        <Image
          source={{ uri: getMediaUrl(item.drama_cover) }}
          style={styles.cover}
        />
        <View style={styles.info}>
          <Text style={styles.dramaTitle} numberOfLines={1}>{item.drama_title}</Text>
          <Text style={styles.episodeInfo} numberOfLines={1}>
            Ep.{item.episode_number} {item.episode_title ? `· ${item.episode_title}` : ''}
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={[styles.progressText, styles.progressTextMargin]}>
              {formatDuration(item.progress)} / {formatDuration(item.duration)}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.updated_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('watch_history')}</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={onClearHistory}>
            <Text style={styles.clearBtn}>{t('clear')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => `hist-${item.id}`}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryLight}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyText}>{t('empty_history')}</Text>
            <Text style={styles.emptyHint}>{t('empty_history_hint')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backBtn: { color: COLORS.onSurface, fontSize: 24, width: 40 },
  title: { color: COLORS.onSurface, fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  clearBtn: { color: COLORS.error, fontSize: 14, fontWeight: '600', width: 40, textAlign: 'right' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 40 },
  item: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outline,
  },
  cover: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryContainer,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  dramaTitle: { color: COLORS.onSurface, fontSize: 15, fontWeight: '600' },
  episodeInfo: { color: COLORS.onSurfaceVariant, fontSize: 13, marginTop: 2 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressTextMargin: {
    marginLeft: 8,
  },
  progressBg: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.secondaryContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: COLORS.primaryLight,
  },
  progressText: { color: COLORS.onSurfaceVariant, fontSize: 11, width: 80 },
  timeText: { color: COLORS.onSurfaceVariant, fontSize: 11, marginTop: 2 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: COLORS.onSurface, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.onSurfaceVariant, fontSize: 13, marginTop: 4, textAlign: 'center', maxWidth: 240 },
});
