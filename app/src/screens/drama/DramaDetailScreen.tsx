// ===== Drama Detail Screen =====
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ScrollView, Modal, Alert, Dimensions, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDramaStore, usePlayerStore, useAuthStore, useWalletStore } from '../../stores';
import { interactionService, paymentService } from '../../services';
import { getMediaUrl } from '../../services/api';
import { dramaService } from '../../services/drama.service';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../hooks';
import { COLORS, SPACING } from '../../utils/constants';
import { formatDuration, formatNumber } from '../../utils/format';
import type { Episode, Drama } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');
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
  const [popularDramas, setPopularDramas] = useState<Drama[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [loadingPopular, setLoadingPopular] = useState(true);

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
    interactionService.getDramaStats(dramaId).then(stats => {
      setCommentCount(stats.comment_count);
      setShareCount(stats.share_count);
    }).catch(() => {});
    // Load popular dramas for ranking section
    dramaService.getPopularDramas(10).then(list => {
      setPopularDramas(list);
      setLoadingPopular(false);
    }).catch(() => setLoadingPopular(false));
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
    (navigation.navigate as any)('SwipePlayer', { dramaId, startEpisodeId: episode.id });
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

  const handleShare = async () => {
    try {
      const result = await Share.share({
        title: currentDrama?.title || 'DramaFlix',
        message: `Watch "${currentDrama?.title || 'a drama'}" on DramaFlix! http://43.159.62.11`,
      });
      if (result.action === Share.sharedAction) {
        await interactionService.share(dramaId);
        setShareCount(prev => prev + 1);
        toast.show(t('shared', 'Shared successfully'));
      }
    } catch (_) {}
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
  const hotScore = (currentDrama.view_count || 0) + (currentDrama.like_count || 0) * 5 + (currentDrama.collect_count || 0) * 10;
  const rank = popularDramas.findIndex(d => d.id === currentDrama.id);

  const navigateToSwipePlayer = useCallback(() => {
    (navigation.navigate as any)('SwipePlayer', { dramaId });
  }, [navigation, dramaId]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Cover Image */}
      <View style={styles.coverWrapper}>
        <Image source={{ uri: coverUrl }} style={styles.cover} />
        {/* Gradient overlay */}
        <View style={styles.coverGradient} />
        {/* Rank badge */}
        {rank >= 0 && rank < 3 && (
          <View style={[styles.rankBadge, rank === 0 && styles.rankGold, rank === 1 && styles.rankSilver, rank === 2 && styles.rankBronze]}>
            <Text style={styles.rankBadgeText}>
              {rank === 0 ? '\u{1F451}' : rank === 1 ? '\u{1F948}' : '\u{1F949}'} {' '}TOP {rank + 1}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title}>{currentDrama.title}</Text>
        <View style={styles.tags}>
          <Text style={[styles.tag, styles.genreTag]}>{currentDrama.genre}</Text>
          <Text style={[styles.tag, styles.tagMargin, currentDrama.status === 'completed' ? styles.tagGreen : styles.tagBlue]}>
            {currentDrama.status === 'completed' ? t('completed') : t('ongoing')}
          </Text>
          <Text style={[styles.tag, styles.tagMargin]}>{t('episode_count', { count: currentDrama.episode_count })}</Text>
        </View>

        {/* Heat / Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(currentDrama.view_count)}</Text>
            <Text style={styles.statLabel}>{t('views')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(currentDrama.like_count)}</Text>
            <Text style={styles.statLabel}>{t('likes')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(currentDrama.collect_count)}</Text>
            <Text style={styles.statLabel}>{t('favorites')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(commentCount)}</Text>
            <Text style={styles.statLabel}>{t('comments', 'Comments')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(shareCount)}</Text>
            <Text style={styles.statLabel}>{t('shares', 'Shares')}</Text>
          </View>
        </View>

        {/* Hot bar */}
        <View style={styles.hotBarWrapper}>
          <View style={styles.hotBarBg}>
            <View style={[styles.hotBarFill, { width: Math.min(hotScore / 5000 * 100, 100) + '%' }]} />
          </View>
          <Text style={styles.hotBarText}>Popularity: {formatNumber(hotScore)}</Text>
        </View>

        <Text style={styles.description}>{currentDrama.description}</Text>
      </View>

      {/* Play All Button */}
      <TouchableOpacity style={styles.playAllBtn} onPress={navigateToSwipePlayer} activeOpacity={0.8}>
        <Text style={styles.playAllBtnIcon}>{'\u25B6'}</Text>
        <Text style={styles.playAllBtnText}>Play All Episodes</Text>
      </TouchableOpacity>

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
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGap]} onPress={onToggleFavorite}>
          <Text style={styles.actionIcon}>{isFavorited ? '\u2764' : '\u2661'}</Text>
          <Text style={styles.actionLabel}>{t('favorite')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onToggleLike}>
          <Text style={styles.actionIcon}>{isLiked ? '\u{1F44D}' : '\u{1F44D}\u{200D}\u{1F3FB}'}</Text>
          <Text style={styles.actionLabel}>{t('like')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGap]} onPress={handleShare}>
          <Text style={styles.actionIcon}>{'\u{1F4EA}'}</Text>
          <Text style={styles.actionLabel}>{t('share', 'Share')}</Text>
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

      {/* Hot Ranking Section */}
      {popularDramas.length > 0 && (
        <View style={styles.rankingSection}>
          <Text style={styles.sectionTitle}>
            {'\u{1F525}'} {t('popular_ranking', 'Hot Ranking')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rankingScroll}>
            {popularDramas.slice(0, 10).map((d, idx) => {
              const isActive = d.id === currentDrama.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.rankingCard, isActive && styles.rankingCardActive]}
                  onPress={() => {
                    if (!isActive) {
                      (navigation.navigate as any)('SwipePlayer', { dramaId: d.id });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: getMediaUrl(d.cover_image) }} style={styles.rankingCover} />
                  <View style={styles.rankingCoverOverlay}>
                    <Text style={[styles.rankingNumber, idx < 3 && styles.rankingNumberTop]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={[styles.rankingTitle, isActive && styles.rankingTitleActive]} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <Text style={styles.rankingViews}>
                    {formatNumber(d.view_count)} {t('views')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

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
              <TouchableOpacity style={[styles.purchaseCancelBtn, styles.purchaseBtnGap]} onPress={() => setPurchaseModal(null)}>
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
  coverWrapper: { position: 'relative' },
  cover: { width: '100%', height: 280, backgroundColor: COLORS.surface },
  coverGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'transparent',
  },
  rankBadge: {
    position: 'absolute', top: 16, right: 16,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rankGold: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.2)' },
  rankSilver: { borderColor: '#C0C0C0', backgroundColor: 'rgba(192,192,192,0.2)' },
  rankBronze: { borderColor: '#CD7F32', backgroundColor: 'rgba(205,127,50,0.2)' },
  rankBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  info: { padding: SPACING.md },
  title: { color: COLORS.onSurface, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  tags: { flexDirection: 'row', marginBottom: 12 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 12, backgroundColor: COLORS.surface,
    color: COLORS.onSurfaceVariant, fontSize: 12, overflow: 'hidden',
  },
  genreTag: { backgroundColor: COLORS.primary },
  tagGreen: { backgroundColor: '#2E7D32' },
  tagBlue: { backgroundColor: '#1565C0' },
  tagMargin: { marginLeft: 8 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 14, paddingHorizontal: SPACING.md,
    borderRadius: 12, backgroundColor: COLORS.surface, marginBottom: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { color: COLORS.onSurface, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.onSurfaceVariant, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.outline },
  hotBarWrapper: { marginBottom: 12 },
  hotBarBg: {
    height: 6, borderRadius: 3, backgroundColor: COLORS.surface,
    overflow: 'hidden', marginBottom: 4,
  },
  hotBarFill: {
    height: '100%', borderRadius: 3,
    backgroundColor: '#FF6B35',
  },
  hotBarText: { color: COLORS.onSurfaceVariant, fontSize: 11 },
  description: { color: COLORS.onSurfaceVariant, fontSize: 15, lineHeight: 22 },
  playAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: SPACING.md, marginVertical: SPACING.sm,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  playAllBtnIcon: { color: '#FFF', fontSize: 18, marginRight: 8 },
  playAllBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pointsHint: {
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    padding: SPACING.sm, borderRadius: 8,
    backgroundColor: COLORS.secondaryContainer,
  },
  pointsHintText: { color: COLORS.primaryLight, fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  actionIcon: { fontSize: 24 },
  actionLabel: { color: COLORS.onSurfaceVariant, fontSize: 13, marginTop: 2 },
  actionBtnGap: { marginRight: SPACING.md },
  sectionTitle: {
    fontSize: 18, fontWeight: '600', color: COLORS.onSurface,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  episodeList: { paddingBottom: SPACING.md },
  episodeCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.md, marginBottom: 8,
    padding: SPACING.md, borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  episodeNumber: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  episodeNumberLocked: { backgroundColor: COLORS.outline },
  episodeNumberText: { color: COLORS.primaryLight, fontSize: 16, fontWeight: 'bold' },
  lockIconSmall: { fontSize: 10, position: 'absolute', bottom: -2, right: -2 },
  episodeInfo: { flex: 1 },
  episodeTitle: { color: COLORS.onSurface, fontSize: 15, fontWeight: '500' },
  episodeDuration: { color: COLORS.onSurfaceVariant, fontSize: 13, marginTop: 2 },
  unlockBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: COLORS.gold,
  },
  unlockText: { color: '#000', fontSize: 12, fontWeight: '600' },
  // Ranking section
  rankingSection: {
    marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.outline,
  },
  rankingScroll: { paddingLeft: SPACING.md, paddingRight: SPACING.md, paddingBottom: SPACING.sm },
  rankingCard: {
    width: 110, marginRight: 10, borderRadius: 10,
    backgroundColor: COLORS.surface, overflow: 'hidden',
  },
  rankingCardActive: { borderWidth: 2, borderColor: COLORS.primary },
  rankingCover: { width: 110, height: 150, backgroundColor: COLORS.outline },
  rankingCoverOverlay: {
    position: 'absolute', top: 0, left: 0,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderBottomRightRadius: 10,
  },
  rankingNumber: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  rankingNumberTop: { color: '#FFD700', fontSize: 15 },
  rankingTitle: {
    color: COLORS.onSurface, fontSize: 12, fontWeight: '500',
    paddingHorizontal: 6, paddingTop: 6,
  },
  rankingTitleActive: { color: COLORS.primaryLight },
  rankingViews: {
    color: COLORS.onSurfaceVariant, fontSize: 10,
    paddingHorizontal: 6, paddingBottom: 6,
  },
  // Purchase Modal
  purchaseOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  purchaseCard: {
    width: '85%', maxWidth: 340, padding: SPACING.lg,
    borderRadius: 16, backgroundColor: COLORS.surface,
  },
  purchaseTitle: { color: COLORS.onSurface, fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.md },
  purchaseEpName: { color: COLORS.onSurfaceVariant, fontSize: 15, marginBottom: SPACING.md },
  purchaseCostRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm,
  },
  purchaseCostLabel: { color: COLORS.onSurfaceVariant, fontSize: 15 },
  purchaseCostValue: { color: COLORS.onSurface, fontSize: 15, fontWeight: '600' },
  insufficientBalance: { color: COLORS.error },
  purchaseHint: { color: COLORS.error, fontSize: 13, marginBottom: SPACING.md },
  purchaseActions: { flexDirection: 'row', marginTop: SPACING.md },
  purchaseCancelBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 12,
    backgroundColor: COLORS.secondaryContainer, alignItems: 'center',
  },
  purchaseCancelText: { color: COLORS.onSurface, fontSize: 15, fontWeight: '600' },
  purchaseConfirmBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  purchaseConfirmDisabled: { opacity: 0.5 },
  purchaseConfirmText: { color: COLORS.onPrimary, fontSize: 15, fontWeight: '600' },
  purchaseBtnGap: { marginRight: SPACING.md },
});
