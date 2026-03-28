// ===== Profile Tab (我的) — Hongguo-inspired =====
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useWalletStore } from '../../stores';
import { COLORS, SPACING } from '../../utils/constants';
import { formatNumber } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

export const ProfileTab: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { points } = useWalletStore();

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

  const menuSections = [
    {
      items: [
        {
          icon: 'time-outline',
          iconColor: '#4FC3F7',
          label: t('watch_history'),
          screen: 'WatchHistory',
        },
        {
          icon: 'heart-outline',
          iconColor: '#FF6B81',
          label: t('my_favorites'),
          screen: 'Favorites',
        },
      ],
    },
    {
      items: [
        {
          icon: 'notifications-outline',
          iconColor: '#FFA502',
          label: t('messages') || 'Messages',
          screen: null,
        },
        {
          icon: 'download-outline',
          iconColor: '#2ED573',
          label: t('offline_cache') || 'Offline Cache',
          screen: null,
        },
      ],
    },
    {
      items: [
        {
          icon: 'help-circle-outline',
          iconColor: '#A29BFE',
          label: t('help_feedback') || 'Help & Feedback',
          screen: null,
        },
        {
          icon: 'cog-outline',
          iconColor: '#999',
          label: t('settings'),
          screen: 'Settings',
        },
      ],
    },
  ];

  const onLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user.avatar || undefined }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{user.nickname || user.username}</Text>
            <Text style={styles.username}>@{user.username}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="create-outline" size={20} color={COLORS.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{points ? formatNumber(points.balance) : '0'}</Text>
            <Text style={styles.statLabel}>{t('points')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>{t('watch_history') || 'History'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>{t('my_favorites') || 'Favorites'}</Text>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.menuSection}>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => item.screen && navigation.navigate(item.screen as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: item.iconColor + '22' }]}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>{t('sign_out')}</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>DramaFlix v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  welcomeText: { color: COLORS.onSurface, fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  loginHint: { color: COLORS.onSurfaceVariant, fontSize: 15, textAlign: 'center', maxWidth: 250, marginBottom: SPACING.lg },
  signinBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  signinBtnText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '600' },

  // Profile header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nickname: {
    color: COLORS.onSurface,
    fontSize: 20,
    fontWeight: '700',
  },
  username: {
    color: COLORS.onSurfaceVariant,
    fontSize: 13,
    marginTop: 2,
  },
  editBtn: {
    padding: SPACING.sm,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.outline,
    marginVertical: 4,
  },

  // Menu sections
  menuSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 12,
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
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuLabel: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 15,
  },

  // Logout
  logoutBtn: {
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    paddingBottom: SPACING.xl,
  },
});
