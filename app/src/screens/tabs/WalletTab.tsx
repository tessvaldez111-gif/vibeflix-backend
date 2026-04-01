// ===== Rewards Tab (福利) — Hongguo-inspired =====
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Linking, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWalletStore, useAuthStore } from '../../stores';
import { useToast } from '../../hooks';
import { useNavigation } from '@react-navigation/native';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS } from '../../utils/constants';
import { rf, scale, getSpacing } from '../../utils/responsive';
import { formatPrice, formatNumber } from '../../utils/format';
import { paymentService } from '../../services';
import type { RechargePackage } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export const WalletTab: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const {
    points, packages, todaySignedIn, isLoading,
    loadPoints, loadPackages, signin,
  } = useWalletStore();
  const { isAuthenticated } = useAuthStore();
  const toast = useToast();
  const [isPaying, setIsPaying] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<RechargePackage | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Dynamic spacing
  const sp = getSpacing();

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
      <View style={[styles.header, { paddingHorizontal: sp.md, paddingTop: sp.lg, paddingBottom: sp.sm }]}>
        <Text style={styles.headerTitle}>{t('tab_rewards')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Points Balance Card */}
        <View style={[styles.balanceCard, { margin: sp.md, padding: sp.lg }]}>
          <Text style={styles.balanceLabel}>{t('points_balance')}</Text>
          <Text style={styles.balanceValue}>
            {points ? formatNumber(points.balance) : '---'}
          </Text>
          <TouchableOpacity
            style={[styles.signinBtn, todaySignedIn && styles.signinBtnDone, { marginTop: sp.md }]}
            onPress={onSignin}
            disabled={todaySignedIn || isPaying}
          >
            <Ionicons
              name={todaySignedIn ? "checkmark-circle" : "calendar"}
              size={scale(18)}
              color={todaySignedIn ? COLORS.success : COLORS.onPrimary}
              style={{ marginRight: scale(6) }}
            />
            <Text style={styles.signinText}>
              {todaySignedIn ? t('signed_in_today') : t('daily_signin')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task Center */}
        <View style={[styles.section, { marginTop: sp.sm }]}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: sp.md, marginBottom: sp.sm }]}>
            <Ionicons name="list" size={scale(18)} color={COLORS.primary} />
            {'  '}{t('task_center')}
          </Text>
          <View style={[styles.taskList, { marginHorizontal: sp.md }]}>
            <View style={[styles.taskItem, { padding: sp.md }]}>
              <View style={styles.taskLeft}>
                <Ionicons name="play-circle" size={scale(24)} color={COLORS.secondary} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName} numberOfLines={1}>{t('task_watch')}</Text>
                  <Text style={styles.taskReward}>+10 {t('points')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.taskBtn} onPress={() => navigation.navigate('HomeTab' as never)} activeOpacity={0.7}>
                <Text style={styles.taskBtnText}>{t('go')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.taskItem, { padding: sp.md }]}>
              <View style={styles.taskLeft}>
                <Ionicons name="share-social" size={scale(24)} color={COLORS.secondary} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName} numberOfLines={1}>{t('task_share')}</Text>
                  <Text style={styles.taskReward}>+10 {t('points')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.taskBtn} onPress={() => navigation.navigate('HomeTab' as never)} activeOpacity={0.7}>
                <Text style={styles.taskBtnText}>{t('go')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.taskItem, { padding: sp.md }]}>
              <View style={styles.taskLeft}>
                <Ionicons name="megaphone" size={scale(24)} color={COLORS.secondary} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName} numberOfLines={1}>{t('task_ad')}</Text>
                  <Text style={styles.taskReward}>+5 {t('points')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.taskBtn} onPress={() => navigation.navigate('HomeTab' as never)} activeOpacity={0.7}>
                <Text style={styles.taskBtnText}>{t('go')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recharge Packages */}
        <View style={[styles.section, { marginTop: sp.sm }]}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: sp.md, marginBottom: sp.sm }]}>
            <Ionicons name="diamond" size={scale(18)} color={COLORS.gold} />
            {'  '}{t('recharge')}
          </Text>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <View style={[styles.packagesGrid, { paddingHorizontal: sp.md }]}>
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={`pkg-${pkg.id}`}
                  style={[styles.packageCard, { padding: sp.md }, pkg.is_hot ? styles.packageHot : undefined]}
                  onPress={() => onRecharge(pkg)}
                  disabled={isPaying}
                >
                  {pkg.is_hot && (
                    <View style={styles.hotBadge}>
                      <Text style={styles.hotText}>{t('hot')}</Text>
                    </View>
                  )}
                  <Text style={[styles.packageName, { marginBottom: scale(4) }]}>{pkg.name}</Text>
                  <Text style={styles.packagePoints}>
                    {t('points_count', { count: formatNumber(pkg.points + pkg.bonus_points) })}
                  </Text>
                  {pkg.bonus_points > 0 && (
                    <Text style={[styles.packageBonus, { marginTop: scale(2) }]}>
                      {t('bonus_count', { count: formatNumber(pkg.bonus_points) })}
                    </Text>
                  )}
                  <Text style={[styles.packagePrice, { marginTop: scale(4) }]}>{formatPrice(pkg.price)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: sp.lg }]}>
            <Text style={[styles.modalTitle, { marginBottom: sp.md }]}>{t('confirm_purchase')}</Text>
            {selectedPkg && (
              <>
                <Text style={styles.modalPkgName}>{selectedPkg.name}</Text>
                <Text style={[styles.modalPoints, { marginVertical: scale(4) }]}>
                  {t('points_count', { count: formatNumber(selectedPkg.points + selectedPkg.bonus_points) })}
                </Text>
                <Text style={[styles.modalPrice, { marginBottom: sp.md }]}>{formatPrice(selectedPkg.price)}</Text>
                <Text style={[styles.modalHint, { marginBottom: sp.lg }]}>{t('paypal_hint')}</Text>
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancelBtn, { padding: sp.sm, marginRight: sp.md }]} onPress={() => setShowConfirm(false)}>
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { padding: sp.sm }]} onPress={confirmRecharge}>
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
          <Text style={[styles.payingText, { marginTop: sp.md }]}>{t('processing_payment')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: {
    paddingBottom: scale(100),
  },
  header: {},
  headerTitle: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  loginHint: { color: COLORS.onSurfaceVariant, fontSize: rf(16) },

  // Balance card
  balanceCard: {
    borderRadius: scale(16),
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  balanceLabel: { color: COLORS.onSurfaceVariant, fontSize: rf(14), marginBottom: scale(4) },
  balanceValue: { color: COLORS.primary, fontSize: rf(48), fontWeight: 'bold' },
  signinBtn: {
    paddingHorizontal: scale(28),
    paddingVertical: scale(12),
    borderRadius: scale(24),
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signinBtnDone: { backgroundColor: COLORS.surfaceLight },
  signinText: { color: COLORS.onPrimary, fontSize: rf(15), fontWeight: '600' },

  // Section
  section: {},
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '600',
    color: COLORS.onSurface,
  },

  // Task center
  taskList: {
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outline,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flexShrink: 1,
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    color: COLORS.onSurface,
    fontSize: rf(14),
    fontWeight: '500',
  },
  taskReward: {
    color: COLORS.gold,
    fontSize: rf(11),
    marginTop: scale(2),
  },
  taskBtn: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(7),
    borderRadius: scale(16),
    backgroundColor: COLORS.primary,
    flexShrink: 0,
    minWidth: scale(52),
    alignItems: 'center',
  },
  taskBtnText: {
    color: COLORS.onPrimary,
    fontSize: rf(13),
    fontWeight: '600',
  },

  // Packages
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  packageCard: {
    width: '47%',
    margin: '1.5%',
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: 'center',
    position: 'relative',
  },
  packageHot: { borderColor: COLORS.gold },
  hotBadge: {
    position: 'absolute',
    top: -scale(6),
    right: -scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    backgroundColor: COLORS.gold,
  },
  hotText: { color: '#000', fontSize: rf(10), fontWeight: 'bold' },
  packageName: { color: COLORS.onSurface, fontSize: rf(14), fontWeight: '600' },
  packagePoints: { color: COLORS.primary, fontSize: rf(18), fontWeight: 'bold' },
  packageBonus: { color: COLORS.gold, fontSize: rf(12) },
  packagePrice: { color: COLORS.onSurfaceVariant, fontSize: rf(14) },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    maxWidth: scale(340),
    borderRadius: scale(16),
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  modalTitle: { color: COLORS.onSurface, fontSize: rf(20), fontWeight: 'bold' },
  modalPkgName: { color: COLORS.onSurface, fontSize: rf(18), fontWeight: '600' },
  modalPoints: { color: COLORS.primary, fontSize: rf(24), fontWeight: 'bold' },
  modalPrice: { color: COLORS.gold, fontSize: rf(20), fontWeight: 'bold' },
  modalHint: { color: COLORS.onSurfaceVariant, fontSize: rf(13), textAlign: 'center', lineHeight: scale(18) },
  modalActions: { flexDirection: 'row', width: '100%' },
  modalCancelBtn: {
    flex: 1,
    borderRadius: scale(12),
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
  },
  modalCancelText: { color: COLORS.onSurface, fontSize: rf(15), fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: scale(12),
    backgroundColor: '#0070BA',
    alignItems: 'center',
  },
  modalConfirmText: { color: '#FFF', fontSize: rf(15), fontWeight: '600' },
  payingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  payingText: { color: COLORS.onSurface, fontSize: rf(16) },
});
