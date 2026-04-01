// ===== Drama Detail Screen =====
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ScrollView, Modal, Alert, useWindowDimensions, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDramaStore, usePlayerStore, useAuthStore, useWalletStore } from '../../stores';
import { interactionService, paymentService } from '../../services';
import { getMediaUrl } from '../../services/api';
import { dramaService } from '../../services/drama.service';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../hooks';
import { COLORS } from '../../utils/constants';
import { formatDuration, formatNumber } from '../../utils/format';
import { scale, rf, rw, getSpacing } from '../../utils/responsive';
import type { Episode, Drama } from '../../types';

type RouteParams = { dramaId: number };

export const DramaDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { dramaId } = route.params as RouteParams;
  const { width: SCREEN_W } = useWindowDimensions();
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

  // Dynamic spacing
  const sp = getSpacing();

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
        style={[styles.episodeCard, { marginHorizontal: sp.md, marginBottom: scale(8), padding: sp.md }]}
        onPress={() => onPlayEpisode(item)}
      >
        <View style={[styles.episodeNumber, isLocked && styles.episodeNumberLocked, { marginRight: sp.md }]}>
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
        <Image source={{ uri: coverUrl }} style={[styles.cover, { height: rw(75) }]} />
        {/* Gradient overlay */}
        <View style={[styles.coverGradient, { height: rw(32) }]} />
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
      <View style={[styles.info, { padding: sp.md }]}>
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
            <View style={[styles.hotBarFill, { width: `${Math.min(hotScore / 5000 * 100, 100)}%` }]} />
          </View>
          <Text style={styles.hotBarText}>Popularity: {formatNumber(hotScore)}</Text>
        </View>

        <Text style={styles.description}>{currentDrama.description}</Text>
      </View>

      {/* Play All Button */}
      <TouchableOpacity style={[styles.playAllBtn, { marginHorizontal: sp.md, marginVertical: sp.sm }]} onPress={navigateToSwipePlayer} activeOpacity={0.8}>
        <Text style={styles.playAllBtnIcon}>{'\u25B6'}</Text>
        <Text style={styles.playAllBtnText}>Play All Episodes</Text>
      </TouchableOpacity>

      {/* Points Balance Hint */}
      {isAuthenticated && (
        <View style={[styles.pointsHint, { marginHorizontal: sp.md, marginBottom: sp.sm, padding: sp.sm }]}>
          <Text style={styles.pointsHintText}>
            {t('your_points', { count: points ? formatNumber(points.balance) : '---' })}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.actions, { paddingHorizontal: sp.md, marginBottom: sp.md }]}>
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
      <Text style={[styles.sectionTitle, { paddingHorizontal: sp.md, marginBottom: sp.sm }]}>
        {t('episodes')}
      </Text>
      <FlatList
        data={currentDrama.episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => `ep-${item.id}`}
        scrollEnabled={false}
        contentContainerStyle={[styles.episodeList, { paddingBottom: sp.md }]}
      />

      {/* Hot Ranking Section */}
      {popularDramas.length > 0 && (
        <View style={[styles.rankingSection, { marginTop: sp.md, paddingTop: sp.md }]}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: sp.md, marginBottom: sp.sm }]}>
            {'\u{1F525}'} {t('popular_ranking', 'Hot Ranking')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rankingScroll, { paddingLeft: sp.md, paddingRight: sp.md, paddingBottom: sp.sm }]}>
            {popularDramas.slice(0, 10).map((d, idx) => {
              const isActive = d.id === currentDrama.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.rankingCard, isActive && styles.rankingCardActive, { marginRight: scale(10) }]}
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

      <View style={{ height: scale(40) }} />

      {/* Purchase Confirmation Modal */}
      <Modal visible={!!purchaseModal} transparent animationType="fade" onRequestClose={() => setPurchaseModal(null)}>
        <View style={styles.purchaseOverlay}>
          <View style={[styles.purchaseCard, { padding: sp.lg }]}>
            <Text style={[styles.purchaseTitle, { marginBottom: sp.md }]}>{t('unlock_episode')}</Text>
            {purchaseModal && (
              <>
                <Text style={[styles.purchaseEpName, { marginBottom: sp.md }]}>
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
                  <Text style={[styles.purchaseHint, { marginBottom: sp.md }]}>
                    {t('insufficient_hint')}
                  </Text>
                )}
              </>
            )}
            <View style={[styles.purchaseActions, { marginTop: sp.md }]}>
              <TouchableOpacity style={[styles.purchaseCancelBtn, styles.purchaseBtnGap, { marginRight: sp.md, padding: sp.sm }]} onPress={() => setPurchaseModal(null)}>
                <Text style={styles.purchaseCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.purchaseConfirmBtn,
                  { padding: sp.sm },
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
  cover: { width: '100%', backgroundColor: COLORS.surface },
  coverGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'transparent',
  },
  rankBadge: {
    position: 'absolute', top: scale(16), right: scale(16),
    paddingHorizontal: scale(12), paddingVertical: scale(5),
    borderRadius: scale(14),
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rankGold: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.2)' },
  rankSilver: { borderColor: '#C0C0C0', backgroundColor: 'rgba(192,192,192,0.2)' },
  rankBronze: { borderColor: '#CD7F32', backgroundColor: 'rgba(205,127,50,0.2)' },
  rankBadgeText: { color: '#FFF', fontSize: rf(13), fontWeight: '700' },
  info: {},
  title: { color: COLORS.onSurface, fontSize: rf(24), fontWeight: 'bold', marginBottom: scale(8) },
  tags: { flexDirection: 'row', marginBottom: scale(12) },
  tag: {
    paddingHorizontal: scale(10), paddingVertical: scale(3),
    borderRadius: scale(12), backgroundColor: COLORS.surface,
    color: COLORS.onSurfaceVariant, fontSize: rf(12), overflow: 'hidden',
  },
  genreTag: { backgroundColor: COLORS.primary },
  tagGreen: { backgroundColor: '#2E7D32' },
  tagBlue: { backgroundColor: '#1565C0' },
  tagMargin: { marginLeft: scale(8) },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: COLORS.surface, marginBottom: scale(12),
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { color: COLORS.onSurface, fontSize: rf(18), fontWeight: 'bold' },
  statLabel: { color: COLORS.onSurfaceVariant, fontSize: rf(11), marginTop: scale(2) },
  statDivider: { width: 1, height: scale(32), backgroundColor: COLORS.outline },
  hotBarWrapper: { marginBottom: scale(12) },
  hotBarBg: {
    height: scale(6), borderRadius: scale(3), backgroundColor: COLORS.surface,
    overflow: 'hidden', marginBottom: scale(4),
  },
  hotBarFill: {
    height: '100%', borderRadius: scale(3),
    backgroundColor: '#FF6B35',
  },
  hotBarText: { color: COLORS.onSurfaceVariant, fontSize: rf(11) },
  description: { color: COLORS.onSurfaceVariant, fontSize: rf(15), lineHeight: scale(22) },
  playAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: scale(14), borderRadius: scale(14),
    backgroundColor: COLORS.primary,
  },
  playAllBtnIcon: { color: '#FFF', fontSize: rf(18), marginRight: scale(8) },
  playAllBtnText: { color: '#FFF', fontSize: rf(16), fontWeight: '700' },
  pointsHint: {
    borderRadius: scale(8),
    backgroundColor: COLORS.secondaryContainer,
  },
  pointsHintText: { color: COLORS.primaryLight, fontSize: rf(13), textAlign: 'center' },
  actions: { flexDirection: 'row' },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: scale(8) },
  actionIcon: { fontSize: rf(24) },
  actionLabel: { color: COLORS.onSurfaceVariant, fontSize: rf(13), marginTop: scale(2) },
  actionBtnGap: { marginRight: scale(16) },
  sectionTitle: {
    fontSize: rf(18), fontWeight: '600', color: COLORS.onSurface,
  },
  episodeList: {},
  episodeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
  },
  episodeNumber: {
    width: scale(40), height: scale(40), borderRadius: scale(20),
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  episodeNumberLocked: { backgroundColor: COLORS.outline },
  episodeNumberText: { color: COLORS.primaryLight, fontSize: rf(16), fontWeight: 'bold' },
  lockIconSmall: { fontSize: rf(10), position: 'absolute', bottom: -scale(2), right: -scale(2) },
  episodeInfo: { flex: 1 },
  episodeTitle: { color: COLORS.onSurface, fontSize: rf(15), fontWeight: '500' },
  episodeDuration: { color: COLORS.onSurfaceVariant, fontSize: rf(13), marginTop: scale(2) },
  unlockBtn: {
    paddingHorizontal: scale(10), paddingVertical: scale(5),
    borderRadius: scale(8), backgroundColor: COLORS.gold,
  },
  unlockText: { color: '#000', fontSize: rf(12), fontWeight: '600' },
  // Ranking section
  rankingSection: {
    borderTopWidth: 1, borderTopColor: COLORS.outline,
  },
  rankingScroll: {},
  rankingCard: {
    width: scale(110), borderRadius: scale(10),
    backgroundColor: COLORS.surface, overflow: 'hidden',
  },
  rankingCardActive: { borderWidth: 2, borderColor: COLORS.primary },
  rankingCover: { width: scale(110), height: scale(150), backgroundColor: COLORS.outline },
  rankingCoverOverlay: {
    position: 'absolute', top: 0, left: 0,
    width: scale(28), height: scale(28), justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderBottomRightRadius: scale(10),
  },
  rankingNumber: { color: '#FFF', fontSize: rf(13), fontWeight: 'bold' },
  rankingNumberTop: { color: '#FFD700', fontSize: rf(15) },
  rankingTitle: {
    color: COLORS.onSurface, fontSize: rf(12), fontWeight: '500',
    paddingHorizontal: scale(6), paddingTop: scale(6),
  },
  rankingTitleActive: { color: COLORS.primaryLight },
  rankingViews: {
    color: COLORS.onSurfaceVariant, fontSize: rf(10),
    paddingHorizontal: scale(6), paddingBottom: scale(6),
  },
  // Purchase Modal
  purchaseOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  purchaseCard: {
    width: '85%', maxWidth: scale(340),
    borderRadius: scale(16), backgroundColor: COLORS.surface,
  },
  purchaseTitle: { color: COLORS.onSurface, fontSize: rf(20), fontWeight: 'bold' },
  purchaseEpName: { color: COLORS.onSurfaceVariant, fontSize: rf(15) },
  purchaseCostRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8),
  },
  purchaseCostLabel: { color: COLORS.onSurfaceVariant, fontSize: rf(15) },
  purchaseCostValue: { color: COLORS.onSurface, fontSize: rf(15), fontWeight: '600' },
  insufficientBalance: { color: COLORS.error },
  purchaseHint: { color: COLORS.error, fontSize: rf(13) },
  purchaseActions: { flexDirection: 'row', width: '100%' },
  purchaseCancelBtn: {
    flex: 1, borderRadius: scale(12),
    backgroundColor: COLORS.secondaryContainer, alignItems: 'center',
  },
  purchaseCancelText: { color: COLORS.onSurface, fontSize: rf(15), fontWeight: '600' },
  purchaseConfirmBtn: {
    flex: 1, borderRadius: scale(12),
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  purchaseConfirmDisabled: { opacity: 0.5 },
  purchaseConfirmText: { color: COLORS.onPrimary, fontSize: rf(15), fontWeight: '600' },
  purchaseBtnGap: {},
});
