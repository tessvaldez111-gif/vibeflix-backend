// ===== Profile Tab (我的) — Hongguo-inspired =====
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useWalletStore } from '../../stores';
import { COLORS, SPACING } from '../../utils/constants';
import { formatNumber } from '../../utils/format';
import { scale, rf, getSpacing } from '../../utils/responsive';
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
          label: t('messages'),
          screen: null,
        },
        {
          icon: 'download-outline',
          iconColor: '#2ED573',
          label: t('offline_cache'),
          screen: null,
        },
      ],
    },
    {
      items: [
        {
          icon: 'help-circle-outline',
          iconColor: '#A29BFE',
          label: t('help_feedback'),
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
            <Text style={styles.statLabel}>{t('watch_history')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>{t('my_favorites')}</Text>
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
                  <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
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

const S = () => getSpacing();

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  welcomeText: { color: COLORS.onSurface, fontSize: rf(22), fontWeight: 'bold', marginBottom: scale(8) },
  loginHint: { color: COLORS.onSurfaceVariant, fontSize: rf(15), textAlign: 'center', maxWidth: scale(250), marginBottom: S().lg },
  signinBtn: {
    paddingHorizontal: scale(32),
    paddingVertical: scale(12),
    borderRadius: scale(24),
    backgroundColor: COLORS.primary,
  },
  signinBtnText: { color: COLORS.onPrimary, fontSize: rf(16), fontWeight: '600' },

  // Profile header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S().md,
    paddingTop: S().lg,
    paddingBottom: S().md,
  },
  avatar: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: COLORS.surface,
  },
  profileInfo: {
    flex: 1,
    marginLeft: S().md,
  },
  nickname: {
    color: COLORS.onSurface,
    fontSize: rf(20),
    fontWeight: '700',
  },
  username: {
    color: COLORS.onSurfaceVariant,
    fontSize: rf(13),
    marginTop: scale(2),
  },
  editBtn: {
    padding: S().sm,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: S().md,
    padding: S().md,
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    marginBottom: S().md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.onSurface,
    fontSize: rf(18),
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: rf(12),
    marginTop: scale(2),
  },
  statDivider: {
    width: scale(1),
    backgroundColor: COLORS.outline,
    marginVertical: scale(4),
  },

  // Menu sections
  menuSection: {
    marginHorizontal: S().md,
    marginBottom: S().sm,
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S().md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outline,
  },
  menuIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S().md,
  },
  menuLabel: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: rf(15),
  },

  // Logout
  logoutBtn: {
    margin: S().lg,
    padding: S().md,
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.error,
    fontSize: rf(16),
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: COLORS.onSurfaceVariant,
    fontSize: rf(12),
    paddingBottom: S().xl,
  },
});
