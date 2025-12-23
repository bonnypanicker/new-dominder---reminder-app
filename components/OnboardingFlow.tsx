import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, FlatList, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, ViewToken } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/theme-provider';

type OnboardingFlowProps = {
  visible: boolean;
  onSkip: () => void;
  onComplete: () => void;
};

const FeatureDialIllustration = ({ accent, surfaceVariant, outline }: { accent: string; surfaceVariant: string; outline: string }) => {
  const ticks = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const size = 240;
  const radius = size / 2;
  const tickRadius = radius - 10;
  const tickW = 3;
  const tickH = 10;
  const handLen = radius - 42;

  return (
    <View style={[styles.illustrationBase, { width: size, height: size, borderColor: outline, backgroundColor: surfaceVariant }]}>
      {ticks.map((i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = radius + Math.cos(a) * tickRadius - tickW / 2;
        const y = radius + Math.sin(a) * tickRadius - tickH / 2;
        return (
          <View
            key={i}
            style={[
              styles.tick,
              {
                left: x,
                top: y,
                width: tickW,
                height: tickH,
                backgroundColor: i % 3 === 0 ? accent : outline,
                opacity: i % 3 === 0 ? 0.9 : 0.35,
              },
            ]}
          />
        );
      })}
      <View style={[styles.dialInner, { borderColor: outline, backgroundColor: surfaceVariant }]} />
      <View style={[styles.hand, { backgroundColor: accent, height: handLen, top: radius - handLen, left: radius - 1, transform: [{ rotate: '-25deg' }] }]} />
      <View style={[styles.dialCenter, { backgroundColor: accent }]} />
      <View style={[styles.dialBadge, { borderColor: outline, backgroundColor: surfaceVariant }]}>
        <Feather name="clock" size={18} color={accent} />
        <Text style={[styles.dialBadgeText, { color: accent }]}>07:30</Text>
      </View>
    </View>
  );
};

const NotificationModesIllustration = ({ accent, surfaceVariant, outline, onSurface }: { accent: string; surfaceVariant: string; outline: string; onSurface: string }) => {
  const modes = useMemo(
    () => [
      { key: 'standard', label: 'Standard', icon: 'bell' as const },
      { key: 'silent', label: 'Silent', icon: 'moon' as const },
      { key: 'ringer', label: 'Ringer', icon: 'volume-2' as const },
    ],
    []
  );

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={[styles.modeRow, { backgroundColor: surfaceVariant, borderColor: outline }]}>
        {modes.map((m, idx) => (
          <View
            key={m.key}
            style={[
              styles.modeCard,
              {
                borderColor: outline,
                backgroundColor: idx === 0 ? `${accent}22` : surfaceVariant,
              },
            ]}
          >
            <Feather name={m.icon} size={18} color={idx === 0 ? accent : onSurface} />
            <Text style={[styles.modeText, { color: onSurface }]}>{m.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.modeHint, { borderColor: outline, backgroundColor: surfaceVariant }]}>
        <Feather name="check" size={16} color={accent} />
        <Text style={[styles.modeHintText, { color: onSurface }]}>Pick per reminder</Text>
      </View>
    </View>
  );
};

const FlexManagementIllustration = ({ accent, surfaceVariant, outline, onSurface }: { accent: string; surfaceVariant: string; outline: string; onSurface: string }) => {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={[styles.mgmtCard, { borderColor: outline, backgroundColor: surfaceVariant }]}>
        <View style={[styles.mgmtIconWrap, { backgroundColor: `${accent}22` }]}>
          <Feather name="pause-circle" size={22} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.mgmtTitle, { color: onSurface }]}>Pause</Text>
          <Text style={[styles.mgmtSub, { color: onSurface, opacity: 0.7 }]}>Temporarily stop alerts</Text>
        </View>
      </View>
      <View style={[styles.mgmtCard, { borderColor: outline, backgroundColor: surfaceVariant }]}>
        <View style={[styles.mgmtIconWrap, { backgroundColor: `${accent}22` }]}>
          <Feather name="repeat" size={22} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.mgmtTitle, { color: onSurface }]}>Repeat</Text>
          <Text style={[styles.mgmtSub, { color: onSurface, opacity: 0.7 }]}>Smart recurring reminders</Text>
        </View>
      </View>
    </View>
  );
};

export default function OnboardingFlow({ visible, onSkip, onComplete }: OnboardingFlowProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handle Back Button on Android
  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      BackHandler.exitApp();
      return true;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [visible]);

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
        render: () => (
          <NotificationModesIllustration
            accent={colors.primary}
            surfaceVariant={colors.surfaceVariant}
            outline={colors.outlineVariant}
            onSurface={colors.onSurface}
          />
        ),
      },
      {
        key: 'flex',
        title: 'Flexible Reminder Management',
        render: () => (
          <FlexManagementIllustration
            accent={colors.primary}
            surfaceVariant={colors.surfaceVariant}
            outline={colors.outlineVariant}
            onSurface={colors.onSurface}
          />
        ),
      }
    ],
    [colors.onSurface, colors.outlineVariant, colors.primary, colors.surfaceVariant]
  );

  const isLast = index === panels.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleComplete = () => {
    onComplete();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = ({ item: p }: { item: any }) => (
    <View key={p.key} style={[styles.panel, { width: winW }]}>
      <View style={styles.illustrationWrap}>{p.render()}</View>
      <Text style={[styles.title, { color: colors.onSurface }]}>{p.title}</Text>
      
      {p.key === 'modes' ? (
        <View style={{ width: '100%', maxWidth: 340, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left' }]}>Standard Mode</Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left' }]}>– Regular notification alerts</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left' }]}>Silent Mode</Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left' }]}>– Gentle notifications without sound</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left' }]}>Ringer Mode</Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left' }]}>– Full-screen reminder with loud alert so you can’t miss it</Text>
          </View>
        </View>
      ) : p.key === 'flex' ? (
        <View style={{ width: '100%', maxWidth: 340, marginTop: 10 }}>
          <Text style={[styles.body, { color: colors.onSurfaceVariant, marginBottom: 16 }]}>
            Pause reminders or set smart repeats for complete control.
          </Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left', fontSize: 13 }]}>Pause</Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left', fontSize: 13 }]}>– Long-press pause button to pause until a selected date. Auto-resumes afterwards.</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, fontWeight: '700', width: 120, textAlign: 'left', fontSize: 13 }]}>Repeat</Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant, flex: 1, textAlign: 'left', fontSize: 13 }]}>– Multiple repeat types: Daily, Monthly, Yearly, Every. Set recurring reminders with ease.</Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>{p.body}</Text>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={() => {}}>
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
              style={[styles.navBtn, { minWidth: 48, minHeight: 48, opacity: isLast ? 0 : 1 }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isLast}
            >
              <Text style={[styles.navText, { color: colors.primary }]}>Next</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={panels}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(item) => item.key}
            style={{ flex: 1 }}
          />

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
    paddingHorizontal: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  illustrationWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    marginBottom: 10,
    flexShrink: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    opacity: 0.9,
    maxWidth: 340,
  },
  bottom: {
    paddingTop: 12,
    alignItems: 'center',
  },
  getStarted: {
    paddingHorizontal: 28,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 220,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  illustrationBase: {
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialInner: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.7,
  },
  hand: {
    position: 'absolute',
    width: 2,
    borderRadius: 2,
  },
  dialCenter: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  tick: {
    position: 'absolute',
    borderRadius: 2,
  },
  dialBadge: {
    position: 'absolute',
    bottom: -18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  dialBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  modeRow: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeHint: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mgmtCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mgmtIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mgmtTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  mgmtSub: {
    fontSize: 13,
    marginTop: 2,
  },
});

