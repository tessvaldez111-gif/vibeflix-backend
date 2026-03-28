// ===== Settings Screen =====
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores';
import { COLORS, SPACING } from '../../utils/constants';
import { SUPPORTED_LANGUAGES, saveLanguage } from '../../i18n';
import i18n from '../../i18n';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout, user } = useAuthStore();
  const { t } = useTranslation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const onLogout = async () => {
    Alert.alert(
      t('logout'),
      t('logout_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  };

  const currentLang = i18n.language?.substring(0, 2) || 'en';
  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);

  const onChangeLanguage = async (langCode: string) => {
    await saveLanguage(langCode);
    i18n.changeLanguage(langCode);
    setLangMenuOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => setLangMenuOpen(!langMenuOpen)}
          >
            <Text style={styles.infoLabel}>{t('language')}</Text>
            <View style={styles.langValueRow}>
              <Text style={styles.infoValue}>{currentLangInfo?.nativeName || 'English'}</Text>
              <Ionicons
                name={langMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>

          {langMenuOpen && (
            <View style={styles.langMenu}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langItem,
                    currentLang === lang.code && styles.langItemActive,
                  ]}
                  onPress={() => onChangeLanguage(lang.code)}
                >
                  <Text style={[
                    styles.langItemText,
                    currentLang === lang.code && styles.langItemTextActive,
                  ]}>
                    {lang.nativeName}
                  </Text>
                  {currentLang === lang.code && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primaryLight} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account_info').toUpperCase()}</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('username')}</Text>
            <Text style={styles.infoValue}>{user?.username}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('nickname')}</Text>
            <Text style={styles.infoValue}>{user?.nickname || '—'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('role')}</Text>
            <Text style={styles.infoValue}>{user?.role || 'user'}</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('app_version')}</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t('platform')}</Text>
            <Text style={styles.infoValue}>{Platform.OS}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: { color: COLORS.onSurface, fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  section: { marginHorizontal: SPACING.md, marginTop: SPACING.md },
  sectionTitle: { color: COLORS.onSurfaceVariant, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: SPACING.sm },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outline,
  },
  infoLabel: { color: COLORS.onSurfaceVariant, fontSize: 15 },
  infoValue: { color: COLORS.onSurface, fontSize: 15, fontWeight: '500' },
  langValueRow: { flexDirection: 'row', alignItems: 'center' },
  langChevron: { marginLeft: 6 },
  langMenu: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outline,
  },
  langItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  langItemText: {
    color: COLORS.onSurface,
    fontSize: 15,
  },
  langItemTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
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
