// ===== Drama Detail Screen =====
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDramaStore, usePlayerStore, useAuthStore, useWalletStore } from '../../stores';
import { interactionService, paymentService } from '../../services';
import { getMediaUrl } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../hooks';
import { COLORS, SPACING } from '../../utils/constants';
import { formatDuration, formatNumber } from '../../utils/format';
import type { Episode } from '../../types';

type RouteParams = { dramaId: number };

export const DramaDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { dramaId } = route.params as RouteParams;
  const { currentDrama, isLoadingDetail, loadDramaDetail } = useDramaStore();
  const { isAuthenticated } = useAuthStore();
  const { points, loadPoints } = useWalletStore();
  const toast = useToast();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ episode: Episode } | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (currentDrama?.id !== dramaId) {
      loadDramaDetail(dramaId);
    }
  }, [dramaId]);

  useEffect(() => {
    if (isAuthenticated && dramaId) {
      interactionService.checkFavorite(dramaId, 'favorite').then(setIsFavorited).catch(() => {});
      interactionService.checkFavorite(dramaId, 'like').then(setIsLiked).catch(() => {});
      loadPoints();
    }
  }, [isAuthenticated, dramaId]);

  const onPlayEpisode = (episode: Episode) => {
    if (!episode.is_free && episode.points_cost > 0) {
      if (!isAuthenticated) {
        navigation.navigate('Login' as never);
        return;
      }
      setPurchaseModal({ episode });
      return;
    }
    navigateToPlayer(episode);
  };

  const navigateToPlayer = (episode: Episode) => {
    const { setEpisode } = usePlayerStore.getState();
    setEpisode(episode, dramaId);
    navigation.navigate('Player' as never, {
      dramaId,
      episodeId: episode.id,
      videoPath: episode.video_path,
    } as never);
  };

  const onConfirmPurchase = async () => {
    if (!purchaseModal) return;
    const { episode } = purchaseModal;
    const cost = episode.points_cost;
    const balance = points?.balance ?? 0;

    if (balance < cost) {
      setPurchaseModal(null);
      Alert.alert(
        t('insufficient_points'),
        t('insufficient_msg', { cost, balance }),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('recharge'), onPress: () => navigation.navigate('WalletTab' as never) },
        ],
      );
      return;
    }

    setIsPurchasing(true);
    try {
      await paymentService.purchaseEpisode(dramaId, episode.id, cost);
      await loadPoints();
      await loadDramaDetail(dramaId);
      setPurchaseModal(null);
      toast.success(t('unlocked', { cost }));
      navigateToPlayer(episode);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || t('purchase_failed');
      toast.error(msg);
    } finally {
      setIsPurchasing(false);
    }
  };

  const onToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login' as never);
      return;
    }
    try {
      if (isFavorited) {
        await interactionService.removeFavorite(dramaId, 'favorite');
      } else {
        await interactionService.addFavorite(dramaId, 'favorite');
      }
      setIsFavorited(!isFavorited);
      toast.show(isFavorited ? t('removed_favorite') : t('added_favorite'));
    } catch {
      // Error handling
    }
  };

  const onToggleLike = async () => {
    if (!isAuthenticated) return;
    try {
      if (isLiked) {
        await interactionService.removeFavorite(dramaId, 'like');
      } else {
        await interactionService.addFavorite(dramaId, 'like');
      }
      setIsLiked(!isLiked);
      toast.show(isLiked ? t('unliked') : t('liked'));
    } catch {
      // Error handling
    }
  };

  const renderEpisode = ({ item }: { item: Episode }) => {
    const isLocked = !item.is_free && item.points_cost > 0;

    return (
      <TouchableOpacity
        style={styles.episodeCard}
        onPress={() => onPlayEpisode(item)}
      >
        <View style={[styles.episodeNumber, isLocked && styles.episodeNumberLocked]}>
          <Text style={styles.episodeNumberText}>{item.episode_number}</Text>
          {isLocked && <Text style={styles.lockIconSmall}>🔒</Text>}
        </View>
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeTitle}>{item.title || t('episode_title', { num: item.episode_number })}</Text>
          {item.duration > 0 && (
            <Text style={styles.episodeDuration}>{formatDuration(item.duration)}</Text>
          )}
        </View>
        {isLocked && (
          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={() => onPlayEpisode(item)}
          >
            <Text style={styles.unlockText}>{t('pts_cost', { count: item.points_cost })}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoadingDetail || !currentDrama) {
    return <LoadingSpinner />;
  }

  const coverUrl = getMediaUrl(currentDrama.cover_image);

  return (
    <ScrollView style={styles.container}>
      {/* Cover Image */}
      <Image source={{ uri: coverUrl }} style={styles.cover} />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title}>{currentDrama.title}</Text>
        <View style={styles.tags}>
          <Text style={[styles.tag, styles.genreTag]}>{currentDrama.genre}</Text>
          <Text style={[styles.tag, currentDrama.status === 'completed' ? styles.tagGreen : styles.tagBlue]}>
            {currentDrama.status === 'completed' ? t('completed') : t('ongoing')}
          </Text>
          <Text style={styles.tag}>{t('episode_count', { count: currentDrama.episode_count })}</Text>
        </View>
        <Text style={styles.stats}>
          {formatNumber(currentDrama.view_count)} {t('views')}
          {'  ·  '}
          {formatNumber(currentDrama.collect_count)} {t('favorites')}
        </Text>
        <Text style={styles.description}>{currentDrama.description}</Text>
      </View>

      {/* Points Balance Hint */}
      {isAuthenticated && (
        <View style={styles.pointsHint}>
          <Text style={styles.pointsHintText}>
            {t('your_points', { count: points ? formatNumber(points.balance) : '---' })}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onToggleFavorite}>
          <Text style={styles.actionIcon}>{isFavorited ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionLabel}>{t('favorite')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onToggleLike}>
          <Text style={styles.actionIcon}>{isLiked ? '👍' : '👍🏻'}</Text>
          <Text style={styles.actionLabel}>{t('like')}</Text>
        </TouchableOpacity>
      </View>

      {/* Episode List */}
      <Text style={styles.sectionTitle}>{t('episodes')}</Text>
      <FlatList
        data={currentDrama.episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => `ep-${item.id}`}
        scrollEnabled={false}
        contentContainerStyle={styles.episodeList}
      />

      <View style={{ height: 40 }} />

      {/* Purchase Confirmation Modal */}
      <Modal visible={!!purchaseModal} transparent animationType="fade" onRequestClose={() => setPurchaseModal(null)}>
        <View style={styles.purchaseOverlay}>
          <View style={styles.purchaseCard}>
            <Text style={styles.purchaseTitle}>{t('unlock_episode')}</Text>
            {purchaseModal && (
              <>
                <Text style={styles.purchaseEpName}>
                  {t('episode_title', { num: purchaseModal.episode.episode_number })} — {purchaseModal.episode.title || ''}
                </Text>
                <View style={styles.purchaseCostRow}>
                  <Text style={styles.purchaseCostLabel}>{t('cost')}</Text>
                  <Text style={styles.purchaseCostValue}>{t('points_count', { count: purchaseModal.episode.points_cost })}</Text>
                </View>
                <View style={styles.purchaseCostRow}>
                  <Text style={styles.purchaseCostLabel}>{t('your_balance')}</Text>
                  <Text style={[
                    styles.purchaseCostValue,
                    (points?.balance ?? 0) < purchaseModal.episode.points_cost && styles.insufficientBalance,
                  ]}>
                    {points ? formatNumber(points.balance) : '---'} {t('points')}
                  </Text>
                </View>
                {(points?.balance ?? 0) < purchaseModal.episode.points_cost && (
                  <Text style={styles.purchaseHint}>
                    {t('insufficient_hint')}
                  </Text>
                )}
              </>
            )}
            <View style={styles.purchaseActions}>
              <TouchableOpacity style={styles.purchaseCancelBtn} onPress={() => setPurchaseModal(null)}>
                <Text style={styles.purchaseCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.purchaseConfirmBtn,
                  purchaseModal && (points?.balance ?? 0) < purchaseModal.episode.points_cost && styles.purchaseConfirmDisabled,
                ]}
                onPress={onConfirmPurchase}
                disabled={
                  isPurchasing ||
                  (purchaseModal !== null && (points?.balance ?? 0) < purchaseModal.episode.points_cost)
                }
              >
                {isPurchasing ? (
                  <Text style={styles.purchaseConfirmText}>{t('processing')}</Text>
                ) : (
                  <Text style={styles.purchaseConfirmText}>{t('unlock')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  cover: { width: '100%', height: 240, backgroundColor: COLORS.surface },
  info: { padding: SPACING.md },
  title: { color: COLORS.onSurface, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    overflow: 'hidden',
  },
  genreTag: { backgroundColor: COLORS.primary },
  tagGreen: { backgroundColor: '#2E7D32' },
  tagBlue: { backgroundColor: '#1565C0' },
  stats: { color: COLORS.onSurfaceVariant, fontSize: 14, marginBottom: 12 },
  description: { color: COLORS.onSurfaceVariant, fontSize: 15, lineHeight: 22 },
  pointsHint: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryContainer,
  },
  pointsHintText: { color: COLORS.primaryLight, fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  actionIcon: { fontSize: 24 },
  actionLabel: { color: COLORS.onSurfaceVariant, fontSize: 13, marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  episodeList: { paddingBottom: SPACING.md },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: 8,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  episodeNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  episodeNumberLocked: { backgroundColor: COLORS.outline },
  episodeNumberText: { color: COLORS.primaryLight, fontSize: 16, fontWeight: 'bold' },
  lockIconSmall: { fontSize: 10, position: 'absolute', bottom: -2, right: -2 },
  episodeInfo: { flex: 1 },
  episodeTitle: { color: COLORS.onSurface, fontSize: 15, fontWeight: '500' },
  episodeDuration: { color: COLORS.onSurfaceVariant, fontSize: 13, marginTop: 2 },
  unlockBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.gold,
  },
  unlockText: { color: '#000', fontSize: 12, fontWeight: '600' },
  purchaseOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseCard: {
    width: '85%',
    maxWidth: 340,
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  purchaseTitle: { color: COLORS.onSurface, fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.md },
  purchaseEpName: { color: COLORS.onSurfaceVariant, fontSize: 15, marginBottom: SPACING.md },
  purchaseCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  purchaseCostLabel: { color: COLORS.onSurfaceVariant, fontSize: 15 },
  purchaseCostValue: { color: COLORS.onSurface, fontSize: 15, fontWeight: '600' },
  insufficientBalance: { color: COLORS.error },
  purchaseHint: { color: COLORS.error, fontSize: 13, marginBottom: SPACING.md },
  purchaseActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  purchaseCancelBtn: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
  },
  purchaseCancelText: { color: COLORS.onSurface, fontSize: 15, fontWeight: '600' },
  purchaseConfirmBtn: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  purchaseConfirmDisabled: { opacity: 0.5 },
  purchaseConfirmText: { color: COLORS.onPrimary, fontSize: 15, fontWeight: '600' },
});
