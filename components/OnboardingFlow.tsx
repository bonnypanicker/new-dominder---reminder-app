import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, PanResponder, BackHandler, NativeModules } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/theme-provider';

type OnboardingFlowProps = {
  visible: boolean;
  onSkip: () => void;
  onComplete: () => void;
};





export default function OnboardingFlow({ visible, onSkip, onComplete }: OnboardingFlowProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const panels = useMemo(
    () => [
      {
        key: 'fast',
        title: 'Quick-Set Reminders',
        body: 'Experience a smarter way to schedule reminders.',
        render: () => (
          <Image
            source={require('../assets/images/undraw_completed-tasks_1j9z.png')}
            style={{ width: 240, height: 400 }}
            resizeMode="contain"
          />
        ),
      },
      {
        key: 'modes',
        title: 'Smart Notification Modes',
        body: 'Standard Mode – Regular notification alerts\nSilent Mode – Gentle notifications without sound\nRinger Mode – Full-screen reminder with loud alert so you can’t miss it',
        render: () => (
          <Image
            source={require('../assets/images/modes_A3.png')}
            style={{ width: 300, height: 180 }}
            resizeMode="contain"
          />
        ),
      },
      {
        key: 'flex',
        title: 'Flexible Reminder Management',
        body: 'Pause, repeat, and manage reminders exactly the way you need.\n\nPause – Pause daily reminders. Long-press the button to pause until a selected date. Auto-resumes later.\n\nRepeat – Daily, Monthly, Yearly, or custom recurring schedules.\n\nOccurrence – Optional setting to repeat reminders by count instead of an end date/time.',
        render: () => (
          <Image
            source={require('../assets/images/flexible_management_v2.png')}
            style={{ width: 300, height: 300 }}
            resizeMode="contain"
          />
        ),
      }
    ],
    [colors.onSurface, colors.outlineVariant, colors.primary, colors.surfaceVariant]
  );

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    translateX.setValue(0);
  }, [visible, translateX]);

  // Back button handler to minimize app
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Minimize the app instead of closing onboarding
      if (Platform.OS === 'android') {
        NativeModules.AlarmModule?.minimize();
      }
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [visible]);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Activate pan responder if horizontal swipe is detected
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animation
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Update position based on gesture
        const newValue = -index * winW + gestureState.dx;
        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = winW * 0.25; // 25% of screen width
        const velocity = gestureState.vx;

        // Determine direction based on velocity or distance
        let newIndex = index;

        if (velocity < -0.5 || (velocity <= 0 && gestureState.dx < -threshold)) {
          // Swipe left - go to next panel
          newIndex = Math.min(panels.length - 1, index + 1);
        } else if (velocity > 0.5 || (velocity >= 0 && gestureState.dx > threshold)) {
          // Swipe right - go to previous panel
          newIndex = Math.max(0, index - 1);
        }

        setIndex(newIndex);

        // Animate to the target position
        Animated.spring(translateX, {
          toValue: -newIndex * winW,
          friction: 8,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      },
    })
  ).current;

  // Animate when index changes programmatically (via Next/Skip buttons)
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: -index * winW,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [index, translateX, winW]);

  const isLast = index === panels.length - 1;

  const handleNext = () => {
    if (isLast) return;
    setIndex((v) => Math.min(panels.length - 1, v + 1));
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.background }]}>
        <View style={[styles.shell, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={handleSkip}
              style={[styles.navBtn, { minWidth: 48, minHeight: 48 }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.navText, { color: colors.onSurfaceVariant }]}>Skip</Text>
            </TouchableOpacity>

            <View style={styles.dots}>
              {panels.map((p, i) => (
                <View
                  key={p.key}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === index ? colors.primary : colors.outlineVariant,
                      opacity: i === index ? 1 : 0.35,
                      transform: [{ scale: i === index ? 1.1 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleNext}
              disabled={isLast}
              style={[styles.navBtn, { minWidth: 48, minHeight: 48, opacity: isLast ? 0 : 1 }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.navText, { color: colors.primary }]}>Next</Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[styles.track, { width: winW * panels.length, transform: [{ translateX }] }]}
            {...panResponder.panHandlers}
          >
            {panels.map((p) => (
              <View key={p.key} style={[styles.panel, { width: winW }]}>
                <View style={styles.illustrationWrap}>{p.render()}</View>
                <Text style={[styles.title, { color: colors.onSurface }]}>{p.title}</Text>
                {p.key === 'modes' ? (
                  <View style={{ width: '100%', maxWidth: 340, paddingHorizontal: 8 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left' }]}>Standard Mode</Text>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left' }]}>– Regular notification alerts</Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left' }]}>Silent Mode</Text>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left' }]}>– Gentle notifications without sound</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left' }]}>Ringer Mode</Text>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left' }]}>– Full-screen reminder with loud alert so you can't miss it</Text>
                    </View>
                  </View>
                ) : p.key === 'flex' ? (
                  <View style={{ width: '100%', maxWidth: 340, paddingHorizontal: 8 }}>
                    <Text style={[styles.body, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
                      Pause, repeat, and manage reminders exactly the way you need.
                    </Text>
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left', fontSize: 13 }]}>Pause</Text>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left', fontSize: 13 }]}>– Pause daily reminders. Long-press the button to pause until a selected date. Auto-resumes later.</Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left', fontSize: 13 }]}>Repeat</Text>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left', fontSize: 13 }]}>– Daily, Monthly, Yearly, or custom recurring schedules.</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left', fontSize: 13 }]}>Occurrence</Text>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left', fontSize: 13 }]}>– Optional setting to repeat reminders by count instead of an end date/time.</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.body, { color: colors.onSurfaceVariant, paddingHorizontal: 8 }]}>{p.body}</Text>
                )}
              </View>
            ))}
          </Animated.View>

          <View style={styles.bottom}>
            {isLast ? (
              <Pressable
                onPress={handleComplete}
                style={({ pressed }) => [
                  styles.getStarted,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.92 : 1,
                    minHeight: 48,
                  },
                ]}
              >
                <Text style={[styles.getStartedText, { color: colors.onPrimary }]}>Get Started</Text>
              </Pressable>
            ) : (
              <View style={{ height: 48 }} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  shell: {
    flex: 1,
    paddingHorizontal: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  track: {
    flexDirection: 'row',
    flex: 1,
  },
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  illustrationWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    maxHeight: 240,
    marginBottom: 16,
    flexShrink: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
    maxWidth: 340,
  },
  bottom: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  getStarted: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 200,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

