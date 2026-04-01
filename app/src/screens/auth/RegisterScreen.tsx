// ===== Register Screen =====
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores';
import { authService } from '../../services';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { COLORS } from '../../utils/constants';
import { rf, scale, getSpacing } from '../../utils/responsive';

const COUNTDOWN_SECONDS = 60;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { register } = useAuthStore();
  const { t } = useTranslation();

  // Dynamic spacing
  const sp = getSpacing();

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
      <View style={[styles.inner, { paddingHorizontal: sp.xl }]}>
        <Text style={styles.logo}>{t('app_name')}</Text>
        <Text style={styles.subtitle}>{t('register')}</Text>

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
          placeholder={t('nickname')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, {
            paddingHorizontal: sp.md,
            paddingVertical: sp.md,
            marginBottom: sp.md,
          }]}
          placeholder={t('email')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        {/* Email verification code row */}
        <View style={[styles.codeRow, { marginBottom: sp.md }]}>
          <TextInput
            style={[styles.input, styles.codeInput, {
              paddingHorizontal: sp.md,
              paddingVertical: sp.md,
              marginRight: sp.sm,
            }]}
            placeholder={t('email_code')}
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={emailCode}
            onChangeText={setEmailCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.sendCodeBtn, !canSendCode && styles.sendCodeBtnDisabled, {
              paddingHorizontal: sp.md,
              paddingVertical: sp.md,
            }]}
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

        <TextInput
          style={[styles.input, {
            paddingHorizontal: sp.md,
            paddingVertical: sp.md,
            marginBottom: sp.md,
          }]}
          placeholder={t('confirm_password')}
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <TouchableOpacity style={[styles.registerBtn, { paddingVertical: sp.md, marginTop: sp.sm }]} onPress={onRegister}>
            <Text style={styles.registerBtnText}>{t('sign_up')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.loginLink, { marginTop: sp.lg }]}>{t('has_account')} {t('sign_in')}</Text>
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
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    marginBottom: 0,
  },
  sendCodeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: scale(12),
    minHeight: scale(50),
    justifyContent: 'center',
  },
  sendCodeBtnDisabled: {
    backgroundColor: COLORS.outline,
  },
  sendCodeText: {
    color: COLORS.onPrimary,
    fontSize: rf(13),
    fontWeight: '600',
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: scale(12),
    alignItems: 'center',
  },
  registerBtnText: { color: COLORS.onPrimary, fontSize: rf(17), fontWeight: '600' },
  loginLink: { color: COLORS.primaryLight, fontSize: rf(15), textAlign: 'center' },
});
