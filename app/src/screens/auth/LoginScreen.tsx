// ===== Login Screen =====
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS } from '../../utils/constants';
import { rf, scale, getSpacing } from '../../utils/responsive';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamic spacing
  const sp = getSpacing();

  const onLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError(t('username_password_required'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || t('error_login_failed'));
    } finally {
      setLoading(false);
    }
  };

  const onRegister = () => {
    navigation.navigate('Register' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingHorizontal: sp.xl }]}>
        <Text style={styles.logo}>{t('app_name')}</Text>
        <Text style={styles.subtitle}>{t('login_to_continue')}</Text>

        {error ? <Text style={[styles.error, { marginBottom: sp.sm }]}>{error}</Text> : null}

        <TextInput
          style={[styles.input, {
            paddingHorizontal: sp.md,
            paddingVertical: sp.md,
            marginBottom: sp.md,
          }]}
          placeholder={t('username')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={[styles.input, {
            paddingHorizontal: sp.md,
            paddingVertical: sp.md,
            marginBottom: sp.md,
          }]}
          placeholder={t('password')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <TouchableOpacity style={[styles.loginBtn, { paddingVertical: sp.md, marginTop: sp.sm }]} onPress={onLogin}>
            <Text style={styles.loginBtnText}>{t('sign_in')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onRegister}>
          <Text style={[styles.registerLink, { marginTop: sp.lg }]}>{t('no_account')} {t('sign_up')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'center' },
  logo: { fontSize: rf(36), fontWeight: 'bold', color: COLORS.primaryLight, textAlign: 'center', marginBottom: scale(4) },
  subtitle: { color: COLORS.onSurfaceVariant, fontSize: rf(16), textAlign: 'center', marginBottom: scale(32) },
  error: { color: COLORS.error, fontSize: rf(14), textAlign: 'center' },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    color: COLORS.onSurface,
    fontSize: rf(16),
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: scale(12),
    alignItems: 'center',
  },
  loginBtnText: { color: COLORS.onPrimary, fontSize: rf(17), fontWeight: '600' },
  registerLink: { color: COLORS.primaryLight, fontSize: rf(15), textAlign: 'center' },
});
