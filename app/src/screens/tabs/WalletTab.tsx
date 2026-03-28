// ===== Rewards Tab (福利) — Hongguo-inspired =====
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Linking, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWalletStore, useAuthStore } from '../../stores';
import { useToast } from '../../hooks';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, SPACING } from '../../utils/constants';
import { formatPrice, formatNumber } from '../../utils/format';
import { paymentService } from '../../services';
import type { RechargePackage } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export const WalletTab: React.FC = () => {
  const { t } = useTranslation();
  const {
    points, packages, todaySignedIn, isLoading,
    loadPoints, loadPackages, signin,
  } = useWalletStore();
  const { isAuthenticated } = useAuthStore();
  const toast = useToast();
  const [isPaying, setIsPaying] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<RechargePackage | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPoints();
      loadPackages();
    }
  }, [isAuthenticated]);

  const onSignin = useCallback(async () => {
    try {
      const result = await signin();
      toast.success(t('signin_bonus', { points: result.points }));
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('signin_failed');
      if (msg.includes('already') || msg.includes('Already')) {
        toast.show(t('signin_already'));
      } else {
        toast.error(msg);
      }
    }
  }, [signin, toast]);

  const onRecharge = (pkg: RechargePackage) => {
    setSelectedPkg(pkg);
    setShowConfirm(true);
  };

  const confirmRecharge = async () => {
    if (!selectedPkg) return;
    setShowConfirm(false);
    setIsPaying(true);
    try {
      const { order_no } = await paymentService.createRechargeOrder(selectedPkg.id);
      const { approveUrl } = await paymentService.createPaypalPayment(order_no);
      await Linking.openURL(approveUrl);
      toast.success(t('redirecting_paypal'));
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('payment_failed');
      toast.error(msg);
    } finally {
      setIsPaying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loginHint}>{t('login_to_continue')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('tab_rewards')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Points Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('points_balance')}</Text>
          <Text style={styles.balanceValue}>
            {points ? formatNumber(points.balance) : '---'}
          </Text>
          <TouchableOpacity
            style={[styles.signinBtn, todaySignedIn && styles.signinBtnDone]}
            onPress={onSignin}
            disabled={todaySignedIn || isPaying}
          >
            <Ionicons
              name={todaySignedIn ? "checkmark-circle" : "calendar"}
              size={18}
              color={todaySignedIn ? COLORS.success : COLORS.onPrimary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.signinText}>
              {todaySignedIn ? t('signed_in_today') : t('daily_signin')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task Center */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="list" size={18} color={COLORS.primary} />
            {'  '}{t('task_center') || 'Task Center'}
          </Text>
          <View style={styles.taskList}>
            <View style={styles.taskItem}>
              <View style={styles.taskLeft}>
                <Ionicons name="play-circle" size={24} color={COLORS.secondary} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>{t('task_watch') || 'Watch Drama'}</Text>
                  <Text style={styles.taskReward}>+10 {t('points')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.taskBtn}>
                <Text style={styles.taskBtnText}>{t('go') || 'Go'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.taskItem}>
              <View style={styles.taskLeft}>
                <Ionicons name="share-social" size={24} color={COLORS.secondary} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>{t('task_share') || 'Share Drama'}</Text>
                  <Text style={styles.taskReward}>+10 {t('points')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.taskBtn}>
                <Text style={styles.taskBtnText}>{t('go') || 'Go'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.taskItem}>
              <View style={styles.taskLeft}>
                <Ionicons name="megaphone" size={24} color={COLORS.secondary} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>{t('task_ad') || 'Watch Ad'}</Text>
                  <Text style={styles.taskReward}>+5 {t('points')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.taskBtn}>
                <Text style={styles.taskBtnText}>{t('go') || 'Go'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recharge Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="diamond" size={18} color={COLORS.gold} />
            {'  '}{t('recharge')}
          </Text>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <View style={styles.packagesGrid}>
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={`pkg-${pkg.id}`}
                  style={[styles.packageCard, pkg.is_hot && styles.packageHot]}
                  onPress={() => onRecharge(pkg)}
                  disabled={isPaying}
                >
                  {pkg.is_hot && (
                    <View style={styles.hotBadge}>
                      <Text style={styles.hotText}>{t('hot')}</Text>
                    </View>
                  )}
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePoints}>
                    {t('points_count', { count: formatNumber(pkg.points + pkg.bonus_points) })}
                  </Text>
                  {pkg.bonus_points > 0 && (
                    <Text style={styles.packageBonus}>
                      {t('bonus_count', { count: formatNumber(pkg.bonus_points) })}
                    </Text>
                  )}
                  <Text style={styles.packagePrice}>{formatPrice(pkg.price)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('confirm_purchase')}</Text>
            {selectedPkg && (
              <>
                <Text style={styles.modalPkgName}>{selectedPkg.name}</Text>
                <Text style={styles.modalPoints}>
                  {t('points_count', { count: formatNumber(selectedPkg.points + selectedPkg.bonus_points) })}
                </Text>
                <Text style={styles.modalPrice}>{formatPrice(selectedPkg.price)}</Text>
                <Text style={styles.modalHint}>{t('paypal_hint')}</Text>
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConfirm(false)}>
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmRecharge}>
                <Text style={styles.modalConfirmText}>{t('pay_with_paypal')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Loading */}
      {isPaying && (
        <View style={styles.payingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.payingText}>{t('processing_payment')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  loginHint: { color: COLORS.onSurfaceVariant, fontSize: 16 },

  // Balance card
  balanceCard: {
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  balanceLabel: { color: COLORS.onSurfaceVariant, fontSize: 14, marginBottom: 4 },
  balanceValue: { color: COLORS.primary, fontSize: 48, fontWeight: 'bold' },
  signinBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signinBtnDone: { backgroundColor: COLORS.surfaceLight },
  signinText: { color: COLORS.onPrimary, fontSize: 15, fontWeight: '600' },

  // Section
  section: {
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },

  // Task center
  taskList: {
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outline,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '500',
  },
  taskReward: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 2,
  },
  taskBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  taskBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Packages
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
  },
  packageCard: {
    width: '47%',
    margin: '1.5%',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: 'center',
    position: 'relative',
  },
  packageHot: { borderColor: COLORS.gold },
  hotBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
  },
  hotText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  packageName: { color: COLORS.onSurface, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  packagePoints: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  packageBonus: { color: COLORS.gold, fontSize: 12, marginTop: 2 },
  packagePrice: { color: COLORS.onSurfaceVariant, fontSize: 14, marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    maxWidth: 340,
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  modalTitle: { color: COLORS.onSurface, fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.md },
  modalPkgName: { color: COLORS.onSurface, fontSize: 18, fontWeight: '600' },
  modalPoints: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold', marginVertical: 4 },
  modalPrice: { color: COLORS.gold, fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.md },
  modalHint: { color: COLORS.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 18 },
  modalActions: { flexDirection: 'row', width: '100%' },
  modalCancelBtn: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  modalCancelText: { color: COLORS.onSurface, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: '#0070BA',
    alignItems: 'center',
  },
  modalConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  payingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  payingText: { color: COLORS.onSurface, fontSize: 16, marginTop: SPACING.md },
});
