// ===== Ad Reward Modal =====
// Simulates watching an ad and grants points reward
import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, ActivityIndicator } from 'react-native';
import { COLORS } from '../../utils/constants';
import { scale, rf } from '../../utils/responsive';

interface Props {
  visible: boolean;
  dramaId: number;
  episodeId: number;
  rewardPoints: number;
  onClose: () => void;
  onClaimed: (points: number) => void;
}

const AD_DURATION = 5; // seconds (simulated ad)

const AdRewardModal: React.FC<Props> = memo(({ visible, dramaId, episodeId, rewardPoints, onClose, onClaimed }) => {
  const [phase, setPhase] = useState<'idle' | 'watching' | 'claimable'>('idle');
  const [countdown, setCountdown] = useState(AD_DURATION);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  // Reset on open
  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setCountdown(AD_DURATION);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [visible]);

  // Start countdown when watching
  const startWatching = () => {
    setPhase('watching');
    setCountdown(AD_DURATION);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setPhase('claimable');
          // Animate claim button
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
          // Shine animation
          Animated.loop(
            Animated.timing(shineAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
          ).start();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClaim = () => {
    if (phase !== 'claimable') return;
    onClaimed(rewardPoints);
    setPhase('idle');
    scaleAnim.setValue(0.8);
    shineAnim.setValue(0);
  };

  const handleClose = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPhase('idle');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>X</Text>
          </TouchableOpacity>

          {phase === 'idle' && (
            <>
              <View style={styles.iconBox}>
                <Text style={styles.iconEmoji}>{'\u{1F4E6}'}</Text>
              </View>
              <Text style={styles.title}>Watch Ad for Reward</Text>
              <Text style={styles.subtitle}>
                Watch a short ad to earn{' '}
                <Text style={styles.pointsHighlight}>+{rewardPoints} points</Text>
              </Text>
              <Text style={styles.hint}>Points can be used to unlock premium episodes</Text>
              <TouchableOpacity style={styles.watchBtn} onPress={startWatching} activeOpacity={0.8}>
                <Text style={styles.watchBtnText}>Watch Ad ({AD_DURATION}s)</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === 'watching' && (
            <View style={styles.adContainer}>
              <View style={styles.adBox}>
                <Text style={styles.adLabel}>ADVERTISEMENT</Text>
                <Text style={styles.adFakeContent}>
                  {'\u{1F3AC}'} DramaFlix Premium{'\u{1F3AC}'}
                </Text>
                <Text style={styles.adFakeSub}>Unlock unlimited episodes today!</Text>
              </View>
              <View style={styles.countdownRing}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
              <Text style={styles.waitText}>Please wait...</Text>
            </View>
          )}

          {phase === 'claimable' && (
            <>
              <Animated.View style={[styles.claimBox, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.claimEmoji}>{'\u{1F389}'}</Text>
                <Text style={styles.claimTitle}>Ad Complete!</Text>
                <Text style={styles.claimPoints}>+{rewardPoints} Points</Text>
                <TouchableOpacity style={styles.claimBtn} onPress={handleClaim} activeOpacity={0.8}>
                  <Text style={styles.claimBtnText}>Claim Reward</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    maxWidth: scale(320),
    backgroundColor: '#1E1C28',
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  closeBtn: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: '#FFF', fontSize: rf(14), fontWeight: '600' },
  iconBox: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(103,80,164,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  iconEmoji: { fontSize: rf(32) },
  title: { color: '#FFF', fontSize: rf(20), fontWeight: '700', marginBottom: scale(8) },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: rf(14), textAlign: 'center', marginBottom: scale(4) },
  pointsHighlight: { color: COLORS.gold, fontWeight: '700' },
  hint: { color: 'rgba(255,255,255,0.4)', fontSize: rf(12), marginBottom: scale(20) },
  watchBtn: {
    width: '100%',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  watchBtnText: { color: '#FFF', fontSize: rf(16), fontWeight: '600' },
  // Ad watching phase
  adContainer: { alignItems: 'center', width: '100%' },
  adBox: {
    width: '100%',
    height: scale(140),
    borderRadius: scale(12),
    backgroundColor: 'rgba(103,80,164,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103,80,164,0.3)',
    marginBottom: scale(16),
  },
  adLabel: { color: 'rgba(255,255,255,0.3)', fontSize: rf(10), fontWeight: '700', letterSpacing: 2, marginBottom: scale(8) },
  adFakeContent: { color: '#FFF', fontSize: rf(18), fontWeight: '700' },
  adFakeSub: { color: 'rgba(255,255,255,0.5)', fontSize: rf(13), marginTop: scale(4) },
  countdownRing: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    borderWidth: scale(3),
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(8),
  },
  countdownText: { color: '#FFF', fontSize: rf(24), fontWeight: '700' },
  waitText: { color: 'rgba(255,255,255,0.5)', fontSize: rf(13), marginTop: scale(8) },
  // Claim phase
  claimBox: { alignItems: 'center', width: '100%' },
  claimEmoji: { fontSize: rf(40), marginBottom: scale(8) },
  claimTitle: { color: '#FFF', fontSize: rf(22), fontWeight: '700', marginBottom: scale(4) },
  claimPoints: { color: COLORS.gold, fontSize: rf(28), fontWeight: '800', marginBottom: scale(20) },
  claimBtn: {
    width: '100%',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  claimBtnText: { color: '#FFF', fontSize: rf(16), fontWeight: '700' },
});

export default AdRewardModal;
