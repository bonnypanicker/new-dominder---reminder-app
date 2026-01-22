import { Easing, withTiming, withSpring } from 'react-native-reanimated';
// Spring presets tuned for snappy, 60fps UI-thread animations
export const springFast = {
    damping: 22,
    stiffness: 400,
    mass: 0.8,
    overshootClamping: false,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
};
export const springSoft = {
    damping: 20,
    stiffness: 280,
    mass: 0.9,
};
// Compute a bounded bounce translation based on overscroll amount
export function computeBounce(overscroll, max = 24) {
    'worklet';
    const magnitude = Math.min(Math.abs(overscroll) * 0.45, max);
    return Math.sign(overscroll) * magnitude;
}
// Animate a SharedValue to a target using spring config
export function springTo(shared, to = 0, config = springFast) {
    'worklet';
    shared.value = withSpring(to, config);
}
// Animate a SharedValue to a target using timing + easing
export function fillTo(shared, to = 1, duration = 180) {
    'worklet';
    shared.value = withTiming(to, { duration, easing: Easing.out(Easing.cubic) });
}
