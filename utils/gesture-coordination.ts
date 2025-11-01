import { Platform } from 'react-native';

/**
 * Gesture coordination utilities for managing conflicts between
 * ScrollView and SwipeableRow gestures, especially on Android
 */

export const GESTURE_CONFIG = {
  // Android-optimized thresholds
  android: {
    activeOffsetX: [-15, 15],
    failOffsetY: [-20, 20],
    horizontalDominanceRatio: 1.5,
    minimumHorizontalMovement: 10,
    swipeThreshold: 80,
    animationDuration: 200, // Increased for smoother slide-out + shrink
    slideInDuration: 300,   // Duration for slide-in animations
    slideUpDuration: 150,   // Duration for slide-up animations
  },
  // iOS/Web optimized thresholds
  default: {
    activeOffsetX: [-30, 30],
    failOffsetY: [-8, 8],
    horizontalDominanceRatio: 2.5,
    minimumHorizontalMovement: 5,
    swipeThreshold: 80,
    animationDuration: 250, // Increased for smoother slide-out + shrink
    slideInDuration: 400,   // Duration for slide-in animations
    slideUpDuration: 200,   // Duration for slide-up animations
  }
};

/**
 * Get platform-specific gesture configuration
 */
export const getGestureConfig = () => {
  return Platform.OS === 'android' ? GESTURE_CONFIG.android : GESTURE_CONFIG.default;
};

/**
 * Check if a gesture should be considered horizontal based on platform
 */
export const isHorizontalGesture = (translationX: number, translationY: number): boolean => {
  const config = getGestureConfig();
  const isHorizontal = Math.abs(translationX) > Math.abs(translationY) * config.horizontalDominanceRatio;
  const hasMinimumMovement = Math.abs(translationX) > config.minimumHorizontalMovement;
  
  return isHorizontal && hasMinimumMovement;
};

/**
 * Get platform-optimized ScrollView props
 */
export const getScrollViewProps = () => {
  if (Platform.OS === 'android') {
    return {
      removeClippedSubviews: true,
      scrollEventThrottle: 16,
      nestedScrollEnabled: true,
      // Improve gesture responsiveness on Android
      keyboardShouldPersistTaps: 'handled' as const,
      bounces: true,
      alwaysBounceVertical: true,
    };
  }
  
  return {
    keyboardShouldPersistTaps: 'handled' as const,
    bounces: true,
    alwaysBounceVertical: true,
  };
};

/**
 * Get platform-optimized animation duration for layout animations
 */
export const getLayoutAnimationDuration = (): number => {
  return getGestureConfig().animationDuration;
};