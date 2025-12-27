import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, PanResponder, NativeModules } from 'react-native';
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
  // Track the source of the last interaction to determine animation style
  const lastInteraction = useRef<'gesture' | 'programmatic'>('programmatic');

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

  // Back button handler is handled via Modal's onRequestClose for effective Android interception
  // We do not use BackHandler.addEventListener here because the Modal swallows the event.

  // Pan responder for swipe gestures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Activate pan responder if horizontal swipe is detected
          return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
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

          if (newIndex !== index) {
            // Index changed: Delegating animation to useEffect
            lastInteraction.current = 'gesture';
            setIndex(newIndex);
          } else {
            // Index didn't change: Manually snap back
            Animated.spring(translateX, {
              toValue: -index * winW,
              friction: 8,
              tension: 40,
              useNativeDriver: Platform.OS !== 'web',
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          // Snap back on interruption
          Animated.spring(translateX, {
            toValue: -index * winW,
            friction: 8,
            tension: 40,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        },
      }),
    [index, winW, panels.length, translateX]
  );

  // Unified animation handler driven by index changes
  useEffect(() => {
    const toValue = -index * winW;

    if (lastInteraction.current === 'gesture') {
      Animated.spring(translateX, {
        toValue,
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }

    // Reset interaction type default
    lastInteraction.current = 'programmatic';
  }, [index, translateX, winW]);

  const isLast = index === panels.length - 1;

  const handleNext = () => {
    if (isLast) return;
    lastInteraction.current = 'programmatic';
    setIndex((v) => Math.min(panels.length - 1, v + 1));
  };

  const handleSkip = () => {
    lastInteraction.current = 'programmatic';
    onSkip();
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {
        // Handle Android hardware back button
        if (index > 0) {
          // Go back to previous slide
          lastInteraction.current = 'programmatic';
          setIndex((i) => i - 1);
        } else {
          // Minimize the app on first slide (standard Android behavior)
          if (Platform.OS === 'android') {
            NativeModules.AlarmModule?.minimize();
          }
        }
      }}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.background }]}>
        <View style={[styles.shell, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
          <Animated.View
            style={[styles.track, { width: winW * panels.length, transform: [{ translateX }] }]}
            {...panResponder.panHandlers}
          >
            {panels.map((p) => (
              <View key={p.key} style={[styles.panel, { width: winW }]}>
                <View style={styles.illustrationWrap}>{p.render()}</View>
                <Text style={[styles.title, { color: colors.onSurface }]}>{p.title}</Text>
                {p.key === 'modes' ? (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <View style={{ width: '100%', maxWidth: 340, paddingHorizontal: 12 }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, textAlign: 'left', lineHeight: 22 }]}>
                        <Text style={{ fontWeight: '700' }}>Standard Mode</Text> – Regular notification alerts{'\n\n'}
                        <Text style={{ fontWeight: '700' }}>Silent Mode</Text> – Gentle notifications without sound{'\n\n'}
                        <Text style={{ fontWeight: '700' }}>Ringer Mode</Text> – Full-screen reminder with loud alert so you can't miss it
                      </Text>
                    </View>
                  </View>
                ) : p.key === 'flex' ? (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <View style={{ width: '100%', maxWidth: 340, paddingHorizontal: 12 }}>
                      <Text style={[styles.body, { color: colors.onSurfaceVariant, textAlign: 'left', lineHeight: 22 }]}>
                        Pause, repeat, and manage reminders exactly the way you need.{'\n\n'}
                        <Text style={{ fontWeight: '700' }}>Pause</Text> – Pause daily reminders. Long-press the button to pause until a selected date. Auto-resumes later.{'\n\n'}
                        <Text style={{ fontWeight: '700' }}>Repeat</Text> – Daily, Monthly, Yearly, or custom recurring schedules.{'\n\n'}
                        <Text style={{ fontWeight: '700' }}>Occurrence</Text> – Optional setting to repeat reminders by count instead of an end date/time.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 12 }}>
                    <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>{p.body}</Text>
                  </View>
                )}
              </View>
            ))}
          </Animated.View>

          <View style={styles.bottomSection}>
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

            {isLast ? (
              <Pressable
                onPress={handleComplete}
                style={({ pressed }) => [
                  styles.getStarted,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <Text style={[styles.getStartedText, { color: colors.onPrimary }]}>Get Started</Text>
              </Pressable>
            ) : (
              <View style={styles.navigationRow}>
                <TouchableOpacity
                  onPress={handleSkip}
                  style={styles.navBtn}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Text style={[styles.navText, { color: colors.onSurfaceVariant }]}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNext}
                  style={styles.navBtn}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Text style={[styles.navText, { color: colors.primary }]}>Next</Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: 24,
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
  bottomSection: {
    minHeight: 120,
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 50,
  },
  navBtn: {
    paddingHorizontal: 8,
    minWidth: 60,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  getStarted: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginHorizontal: 'auto',
    maxWidth: 320,
    alignSelf: 'center',
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

