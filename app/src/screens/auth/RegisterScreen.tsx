// ===== Register Screen =====
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores';
import { authService } from '../../services';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS, SPACING } from '../../utils/constants';

const COUNTDOWN_SECONDS = 60;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { register } = useAuthStore();
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onSendCode = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('enter_email'));
      return;
    }
    setSendingCode(true);
    setError('');
    try {
      const res = await authService.sendCode({ email: email.trim() });
      if (res.devCode) {
        Alert.alert(t('dev_code_title'), t('dev_code_msg', { code: res.devCode }));
      } else {
        Alert.alert(t('success'), t('code_sent'));
      }
      startCountdown();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t('code_sent_failed');
      setError(msg);
    } finally {
      setSendingCode(false);
    }
  };

  const onRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError(t('username_password_required'));
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('enter_email'));
      return;
    }
    if (!emailCode.trim() || emailCode.trim().length !== 6) {
      setError(t('enter_code'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('password_mismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('password_too_short'));
      return;
    }
    if (username.length < 2 || username.length > 20) {
      setError(t('username_length'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await register(username, password, nickname || undefined, email.trim(), emailCode.trim());
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t('error_register_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSendCode = countdown === 0 && !sendingCode;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>{t('app_name')}</Text>
        <Text style={styles.subtitle}>{t('register')}</Text>

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
          placeholder={t('nickname')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder={t('email')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        {/* Email verification code row */}
        <View style={styles.codeRow}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder={t('email_code')}
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={emailCode}
            onChangeText={setEmailCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.sendCodeBtn, !canSendCode && styles.sendCodeBtnDisabled]}
            onPress={onSendCode}
            disabled={!canSendCode}
          >
            {sendingCode ? (
              <Text style={styles.sendCodeText}>{t('sending')}</Text>
            ) : countdown > 0 ? (
              <Text style={styles.sendCodeText}>{countdown}s</Text>
            ) : (
              <Text style={styles.sendCodeText}>{t('send_code')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('password')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder={t('confirm_password')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <TouchableOpacity style={styles.registerBtn} onPress={onRegister}>
            <Text style={styles.registerBtnText}>{t('sign_up')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.loginLink}>{t('has_account')} {t('sign_in')}</Text>
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
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  codeInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: SPACING.sm,
  },
  sendCodeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 50,
    justifyContent: 'center',
  },
  sendCodeBtnDisabled: {
    backgroundColor: COLORS.outline,
  },
  sendCodeText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  registerBtnText: { color: COLORS.onPrimary, fontSize: 17, fontWeight: '600' },
  loginLink: { color: COLORS.primaryLight, fontSize: 15, textAlign: 'center', marginTop: SPACING.lg },
});
