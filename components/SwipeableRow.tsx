import React, { useRef } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Material3Colors } from '@/constants/colors';
import { Reminder } from '@/types/reminder';
import { getGestureConfig, isHorizontalGesture } from '@/utils/gesture-coordination';

const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ACTION_WIDTH = 80;

export default function SwipeableRow({ 
  children, 
  reminder, 
  onSwipeRight, 
  onSwipeLeft 
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const height = useSharedValue(-1); // -1 means auto-height initially
  const marginBottom = useSharedValue(12);
  const isAnimating = useRef(false);
  const hasCompleted = useRef(false);
  
  // Get platform-specific configuration
  const gestureConfig = getGestureConfig();
  const SWIPE_THRESHOLD = gestureConfig.swipeThreshold;

  const panGesture = Gesture.Pan()
    // Platform-optimized thresholds
    .activeOffsetX(gestureConfig.activeOffsetX)
    .failOffsetY(gestureConfig.failOffsetY)
    // Enable simultaneous recognition with ScrollView
    .simultaneousWithExternalGesture()
    .onUpdate((event) => {
      // Prevent interaction if already animating or completed
      if (isAnimating.current || hasCompleted.current) return;
      
      // Use platform-optimized horizontal gesture detection
      if (isHorizontalGesture(event.translationX, event.translationY)) {
        translateX.value = event.translationX;
        
        const progress = Math.abs(event.translationX) / SWIPE_THRESHOLD;
        opacity.value = Math.max(0.5, 1 - progress * 0.5);
      }
    })
    .onEnd((event) => {
      // Prevent multiple triggers
      if (isAnimating.current || hasCompleted.current) return;
      
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD && onSwipeRight;
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD && onSwipeLeft;

      if (shouldSwipeRight) {
        isAnimating.current = true;
        hasCompleted.current = true;
        
        // First phase: slide out horizontally
        translateX.value = withTiming(SCREEN_WIDTH, {
          duration: gestureConfig.animationDuration * 0.6, // 60% of total duration
        });
        opacity.value = withTiming(0, {
          duration: gestureConfig.animationDuration * 0.6,
        });
        
        // Second phase: shrink vertically after horizontal slide
        setTimeout(() => {
          height.value = withTiming(0, {
            duration: gestureConfig.animationDuration * 0.4, // 40% of total duration
          });
          marginBottom.value = withTiming(0, {
            duration: gestureConfig.animationDuration * 0.4,
          }, () => {
            // Trigger the callback after all animations complete
            runOnJS(onSwipeRight!)();
          });
        }, gestureConfig.animationDuration * 0.6);
        
      } else if (shouldSwipeLeft) {
        isAnimating.current = true;
        hasCompleted.current = true;
        
        // First phase: slide out horizontally
        translateX.value = withTiming(-SCREEN_WIDTH, {
          duration: gestureConfig.animationDuration * 0.6, // 60% of total duration
        });
        opacity.value = withTiming(0, {
          duration: gestureConfig.animationDuration * 0.6,
        });
        
        // Second phase: shrink vertically after horizontal slide
        setTimeout(() => {
          height.value = withTiming(0, {
            duration: gestureConfig.animationDuration * 0.4, // 40% of total duration
          });
          marginBottom.value = withTiming(0, {
            duration: gestureConfig.animationDuration * 0.4,
          }, () => {
            // Trigger the callback after all animations complete
            runOnJS(onSwipeLeft!)();
          });
        }, gestureConfig.animationDuration * 0.6);
      } else {
        // Reset animation with spring for natural feel
        translateX.value = withSpring(0, {
          damping: 25,
          stiffness: 350,
          mass: 0.5,
        });
        opacity.value = withSpring(1, {
          damping: 25,
          stiffness: 350,
          mass: 0.5,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value === -1 ? undefined : height.value,
      marginBottom: marginBottom.value,
      overflow: 'hidden',
    };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const scale = translateX.value > 0 ? 
      Math.min(1, Math.max(0.8, translateX.value / SWIPE_THRESHOLD)) : 0.8;
    
    return {
      transform: [{ scale }],
      opacity: translateX.value > 20 ? 1 : 0,
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    const scale = translateX.value < 0 ? 
      Math.min(1, Math.max(0.8, Math.abs(translateX.value) / SWIPE_THRESHOLD)) : 0.8;
    
    return {
      transform: [{ scale }],
      opacity: translateX.value < -20 ? 1 : 0,
    };
  });

  const rightActionBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      ['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.8)']
    );
    
    return {
      backgroundColor,
    };
  });

  const leftActionBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      ['rgba(244, 67, 54, 0.8)', 'rgba(244, 67, 54, 0.1)']
    );
    
    return {
      backgroundColor,
    };
  });

  return (
    <Animated.View 
      style={[styles.container, containerAnimatedStyle, { zIndex: 1 }]}
    >
      {/* Right action (complete) */}
      {onSwipeRight && (
        <Animated.View style={[styles.rightAction, rightActionBackgroundStyle]}>
          <Animated.View style={[styles.actionContent, rightActionStyle]}>
            <CheckCircle size={24} color="white" />
            <Text style={styles.actionText}>Complete</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Left action (delete) */}
      {onSwipeLeft && (
        <Animated.View style={[styles.leftAction, leftActionBackgroundStyle]}>
          <Animated.View style={[styles.actionContent, leftActionStyle]}>
            <Trash2 size={24} color="white" />
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Main content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: 'transparent',
    isolation: 'isolate', // Prevent ghosting on web
  },
  content: {
    backgroundColor: Material3Colors.light.surface,
    zIndex: 2,
    position: 'relative',
  },
  rightAction: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 12,
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 12,
    zIndex: 0,
  },
  leftAction: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 12,
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 12,
    zIndex: 0,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: ACTION_WIDTH,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
