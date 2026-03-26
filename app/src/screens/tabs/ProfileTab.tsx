// ===== Profile Tab =====
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores';
import { COLORS, SPACING } from '../../utils/constants';

export const ProfileTab: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.welcomeText}>{t('welcome')}</Text>
        <Text style={styles.loginHint}>{t('login_hint_profile')}</Text>
        <TouchableOpacity style={styles.signinBtn} onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.signinBtnText}>{t('sign_in')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menuItems = [
    { icon: 'clock-outline', label: t('watch_history'), screen: 'WatchHistory' },
    { icon: 'heart-outline', label: t('my_favorites'), screen: 'Favorites' },
    { icon: 'cog-outline', label: t('settings'), screen: 'Settings' },
  ];

  const onLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tab_profile')}</Text>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <Image
          source={{ uri: user.avatar || undefined }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.nickname}>{user.nickname || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen as never)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>{'>'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>{t('sign_out')}</Text>
      </TouchableOpacity>
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
  welcomeText: { color: COLORS.onSurface, fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  loginHint: { color: COLORS.onSurfaceVariant, fontSize: 15, textAlign: 'center', maxWidth: 250, marginBottom: SPACING.lg },
  signinBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  signinBtnText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '600' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.secondaryContainer },
  userInfo: { marginLeft: SPACING.md, flex: 1 },
  nickname: { color: COLORS.onSurface, fontSize: 20, fontWeight: '600' },
  username: { color: COLORS.onSurfaceVariant, fontSize: 14, marginTop: 2 },
  menu: {
    marginHorizontal: SPACING.md,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outline,
  },
  menuIcon: { fontSize: 20, marginRight: SPACING.md, width: 28 },
  menuLabel: { flex: 1, color: COLORS.onSurface, fontSize: 16 },
  menuArrow: { color: COLORS.onSurfaceVariant, fontSize: 16 },
  logoutBtn: {
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  logoutText: { color: COLORS.error, fontSize: 16, fontWeight: '600' },
});
