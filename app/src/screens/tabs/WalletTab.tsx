// ===== Wallet Tab =====
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Linking, Modal, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWalletStore, useAuthStore } from '../../stores';
import { useToast } from '../../hooks';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, SPACING } from '../../utils/constants';
import { formatPrice, formatNumber } from '../../utils/format';
import { paymentService } from '../../services';
import type { RechargePackage } from '../../types';

export const WalletTab: React.FC = () => {
  const { t } = useTranslation();
  const { points, packages, todaySignedIn, isLoading, loadPoints, loadPackages, signin, resetAfterRecharge } = useWalletStore();
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

  const renderPackage = ({ item }: { item: RechargePackage }) => (
    <TouchableOpacity
      style={[styles.packageCard, item.is_hot && styles.packageHot]}
      onPress={() => onRecharge(item)}
      disabled={isPaying}
    >
      {item.is_hot && <View style={styles.hotBadge}><Text style={styles.hotText}>{t('hot')}</Text></View>}
      <Text style={styles.packageName}>{item.name}</Text>
      <Text style={styles.packagePoints}>
        {t('points_count', { count: formatNumber(item.points + item.bonus_points) })}
      </Text>
      {item.bonus_points > 0 && (
        <Text style={styles.packageBonus}>{t('bonus_count', { count: formatNumber(item.bonus_points) })}</Text>
      )}
      <Text style={styles.packagePrice}>{formatPrice(item.price)}</Text>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loginHint}>{t('login_hint_wallet')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tab_wallet')}</Text>

      {/* Points Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('points_balance')}</Text>
        <Text style={styles.balanceValue}>{points ? formatNumber(points.balance) : '---'}</Text>
        <TouchableOpacity
          style={[styles.signinBtn, todaySignedIn && styles.signinBtnDone]}
          onPress={onSignin}
          disabled={todaySignedIn || isPaying}
        >
          <Text style={styles.signinText}>
            {todaySignedIn ? t('signed_in_today') : t('daily_signin')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recharge Packages */}
      <Text style={styles.sectionTitle}>{t('recharge')}</Text>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={packages}
          renderItem={renderPackage}
          keyExtractor={(item) => `pkg-${item.id}`}
          numColumns={2}
          contentContainerStyle={styles.packagesList}
          showsVerticalScrollIndicator={false}
        />
      )}

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
          <ActivityIndicator size="large" color={COLORS.primaryLight} />
          <Text style={styles.payingText}>{t('processing_payment')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  loginHint: { color: COLORS.onSurfaceVariant, fontSize: 16 },
  balanceCard: {
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  balanceLabel: { color: COLORS.onSurfaceVariant, fontSize: 14, marginBottom: 4 },
  balanceValue: { color: COLORS.primaryLight, fontSize: 42, fontWeight: 'bold' },
  signinBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  signinBtnDone: { backgroundColor: COLORS.secondaryContainer },
  signinText: { color: COLORS.onPrimary, fontSize: 15, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  packagesList: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  packageCard: {
    flex: 1,
    margin: SPACING.xs,
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
  packagePoints: { color: COLORS.primaryLight, fontSize: 18, fontWeight: 'bold' },
  packageBonus: { color: COLORS.gold, fontSize: 12, marginTop: 2 },
  packagePrice: { color: COLORS.onSurfaceVariant, fontSize: 14, marginTop: 4 },
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
  modalPoints: { color: COLORS.primaryLight, fontSize: 24, fontWeight: 'bold', marginVertical: 4 },
  modalPrice: { color: COLORS.gold, fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.md },
  modalHint: { color: COLORS.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: SPACING.md, width: '100%' },
  modalCancelBtn: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
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
