// ===== Login Screen =====
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, SPACING } from '../../utils/constants';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      <View style={styles.inner}>
        <Text style={styles.logo}>{t('app_name')}</Text>
        <Text style={styles.subtitle}>{t('login_to_continue')}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder={t('username')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder={t('password')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={onLogin}>
            <Text style={styles.loginBtnText}>{t('sign_in')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onRegister}>
          <Text style={styles.registerLink}>{t('no_account')} {t('sign_up')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.xl },
  logo: { fontSize: 36, fontWeight: 'bold', color: COLORS.primaryLight, textAlign: 'center', marginBottom: 4 },
  subtitle: { color: COLORS.onSurfaceVariant, fontSize: 16, textAlign: 'center', marginBottom: SPACING.xl },
  error: { color: COLORS.error, fontSize: 14, textAlign: 'center', marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.onSurface,
    fontSize: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  loginBtnText: { color: COLORS.onPrimary, fontSize: 17, fontWeight: '600' },
  registerLink: { color: COLORS.primaryLight, fontSize: 15, textAlign: 'center', marginTop: SPACING.lg },
});
