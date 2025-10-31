import {
  withSpring,
  withTiming,
  withSequence,
  Easing,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';

/**
 * Animation configurations for card interactions
 */

// Bounce effect configuration for scroll boundaries
export const BOUNCE_CONFIG = {
  displacement: 4, // 3-5px displacement as specified
  duration: 250, // 200-300ms duration
  damping: 15,
  stiffness: 300,
};

// Fill-in transition configuration for card removal
export const FILL_IN_CONFIG = {
  duration: 350, // 300-400ms duration
  easing: Easing.out(Easing.cubic), // easeOutCubic for natural motion
};

// Spring configuration for smooth animations
export const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 1,
};

/**
 * Creates a bounce animation for cards at scroll boundaries
 * @param translateY - Shared value for vertical translation
 * @param direction - 'up' for top boundary, 'down' for bottom boundary
 * @param onComplete - Optional callback when animation completes
 */
export const createBounceAnimation = (
  translateY: SharedValue<number>,
  direction: 'up' | 'down' = 'down',
  onComplete?: () => void
) => {
  'worklet';
  
  const displacement = direction === 'up' ? -BOUNCE_CONFIG.displacement : BOUNCE_CONFIG.displacement;
  
  translateY.value = withSequence(
    withSpring(displacement, {
      damping: BOUNCE_CONFIG.damping,
      stiffness: BOUNCE_CONFIG.stiffness,
    }),
    withSpring(0, {
      damping: BOUNCE_CONFIG.damping,
      stiffness: BOUNCE_CONFIG.stiffness,
    }, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    })
  );
};

/**
 * Creates a smooth fill-in animation for remaining cards after removal
 * @param translateY - Shared value for vertical translation
 * @param opacity - Shared value for opacity
 * @param onComplete - Optional callback when animation completes
 */
export const createFillInAnimation = (
  translateY: SharedValue<number>,
  opacity: SharedValue<number>,
  onComplete?: () => void
) => {
  'worklet';
  
  // Animate the card sliding up to fill the gap
  translateY.value = withTiming(0, {
    duration: FILL_IN_CONFIG.duration,
    easing: FILL_IN_CONFIG.easing,
  });
  
  // Ensure opacity is at full visibility
  opacity.value = withTiming(1, {
    duration: FILL_IN_CONFIG.duration / 2,
    easing: FILL_IN_CONFIG.easing,
  }, (finished) => {
    if (finished && onComplete) {
      runOnJS(onComplete)();
    }
  });
};

/**
 * Creates a smooth card removal animation
 * @param translateX - Shared value for horizontal translation
 * @param opacity - Shared value for opacity
 * @param scale - Shared value for scale
 * @param direction - 'left' or 'right' for swipe direction
 * @param onComplete - Callback when animation completes
 */
export const createCardRemovalAnimation = (
  translateX: SharedValue<number>,
  opacity: SharedValue<number>,
  scale: SharedValue<number>,
  direction: 'left' | 'right',
  onComplete: () => void
) => {
  'worklet';
  
  const targetX = direction === 'right' ? 400 : -400;
  
  // Animate card sliding out
  translateX.value = withSpring(targetX, SPRING_CONFIG);
  
  // Fade out and scale down slightly
  opacity.value = withTiming(0, {
    duration: 300,
    easing: Easing.out(Easing.quad),
  });
  
  scale.value = withTiming(0.95, {
    duration: 300,
    easing: Easing.out(Easing.quad),
  }, (finished) => {
    if (finished) {
      runOnJS(onComplete)();
    }
  });
};

/**
 * Detects if scroll position is at boundary
 * @param scrollY - Current scroll position
 * @param contentHeight - Total content height
 * @param layoutHeight - Visible layout height
 * @param threshold - Threshold for boundary detection (default: 10px)
 */
export const detectScrollBoundary = (
  scrollY: number,
  contentHeight: number,
  layoutHeight: number,
  threshold: number = 10
): 'top' | 'bottom' | null => {
  'worklet';
  
  // At top boundary
  if (scrollY <= threshold) {
    return 'top';
  }
  
  // At bottom boundary
  const maxScrollY = Math.max(0, contentHeight - layoutHeight);
  if (scrollY >= maxScrollY - threshold) {
    return 'bottom';
  }
  
  return null;
};

/**
 * Throttle function for scroll events to improve performance
 * @param func - Function to throttle
 * @param delay - Throttle delay in milliseconds
 */
export const throttle = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: number | null = null;
  let lastExecTime = 0;
  
  return (...args: any[]) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};