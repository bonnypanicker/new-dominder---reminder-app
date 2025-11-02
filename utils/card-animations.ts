import { Layout, Easing, withTiming, withSpring, SharedValue } from 'react-native-reanimated';

// Spring presets tuned for snappy, 60fps UI-thread animations
export const springFast = {
  damping: 20,
  stiffness: 300,
  mass: 0.9,
  overshootClamping: false,
  restSpeedThreshold: 0.001,
  restDisplacementThreshold: 0.001,
};

export const springSoft = {
  damping: 18,
  stiffness: 220,
  mass: 1,
};

// Compute a bounded bounce translation based on overscroll amount
export function computeBounce(overscroll: number, max = 24): number {
  'worklet';
  const magnitude = Math.min(Math.abs(overscroll) * 0.45, max);
  return Math.sign(overscroll) * magnitude;
}

// Animate a SharedValue to a target using spring config
export function springTo(shared: SharedValue<number>, to = 0, config = springFast) {
  'worklet';
  shared.value = withSpring(to, config);
}

// Animate a SharedValue to a target using timing + easing
export function fillTo(shared: SharedValue<number>, to = 1, duration = 280) {
  'worklet';
  shared.value = withTiming(to, { duration, easing: Easing.out(Easing.cubic) });
}

// Layout animation preset for seamless item removal/collapse
export const removalLayout = Layout.springify().damping(20).stiffness(160).duration(200);

