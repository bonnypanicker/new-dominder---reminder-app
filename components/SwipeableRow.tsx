import React, { useRef } from 'react';
import { Text, StyleSheet, Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolateColor,
  interpolate,
  Easing,
  Layout,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Material3Colors } from '@/constants/colors';
import { Reminder } from '@/types/reminder';

const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  simultaneousHandlers?: React.RefObject<any>;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen width
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.4; // 40% of screen width for deletion
const ACTION_WIDTH = 80;
const DIRECTION_THRESHOLD = 1.2; // Horizontal movement must be 1.2x vertical movement

export default function SwipeableRow({ 
  children, 
  reminder, 
  onSwipeRight, 
  onSwipeLeft,
  simultaneousHandlers
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const height = useSharedValue(1);
  const scale = useSharedValue(1);
  const actionInnerScaleY = useSharedValue(1);
  
  // Track gesture state more reliably
  const gestureActive = useSharedValue(false);
  const hasTriggeredAction = useSharedValue(false);
  
  const panGesture = Gesture.Pan()
    // Improved gesture recognition for better direction detection
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .simultaneousWithExternalGesture(simultaneousHandlers)
    .onBegin(() => {
      'worklet';
      gestureActive.value = true;
      hasTriggeredAction.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      
      // Prevent interaction if action already triggered
      if (hasTriggeredAction.value) return;
      
      // Enhanced direction detection
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const isHorizontalGesture = absX > absY * DIRECTION_THRESHOLD && absX > 10;
      
      if (isHorizontalGesture) {
        // Clamp translation with friction for better feel
        const maxTranslation = SCREEN_WIDTH * 0.6;
        let clampedX = event.translationX;
        
        if (Math.abs(clampedX) > maxTranslation) {
          const excess = Math.abs(clampedX) - maxTranslation;
          const friction = Math.max(0.1, 1 - excess / (SCREEN_WIDTH * 0.2));
          clampedX = Math.sign(clampedX) * (maxTranslation + excess * friction);
        }
        
        translateX.value = clampedX;
        
        // Enhanced visual feedback based on thresholds
        const progress = Math.abs(clampedX) / DELETE_THRESHOLD;
        
        // Opacity feedback
        opacity.value = interpolate(
          Math.abs(clampedX),
          [0, DELETE_THRESHOLD],
          [1, 0.7],
          'clamp'
        );
        
        // Scale feedback for deletion threshold
        scale.value = interpolate(
          Math.abs(clampedX),
          [0, DELETE_THRESHOLD * 0.8, DELETE_THRESHOLD],
          [1, 0.98, 0.95],
          'clamp'
        );
      }
    })
    .onEnd((event) => {
      'worklet';
      
      // Prevent multiple triggers
      if (hasTriggeredAction.value) return;
      
      gestureActive.value = false;
      
      // Enhanced threshold detection
      const shouldSwipeRight = event.translationX > DELETE_THRESHOLD && onSwipeRight;
      const shouldSwipeLeft = event.translationX < -DELETE_THRESHOLD && onSwipeLeft;

      if (shouldSwipeRight || shouldSwipeLeft) {
        hasTriggeredAction.value = true;
        
        // Smooth off-screen animation with proper timing
        const targetX = shouldSwipeRight ? SCREEN_WIDTH : -SCREEN_WIDTH;
        
        translateX.value = withTiming(targetX, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
        
        opacity.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
        
        scale.value = withTiming(0.8, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        }, () => {
          // Height collapse animation after slide completes
          actionInnerScaleY.value = withTiming(0, {
            duration: 150,
            easing: Easing.out(Easing.cubic),
          });

          height.value = withTiming(0, {
            duration: 150,
            easing: Easing.out(Easing.cubic),
          }, () => {
            // Trigger callback after all animations complete
            if (shouldSwipeRight && onSwipeRight) {
              runOnJS(onSwipeRight)();
            } else if (shouldSwipeLeft && onSwipeLeft) {
              runOnJS(onSwipeLeft)();
            }
          });
        });
      } else {
        // Spring back animation with improved feel
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
        
        opacity.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
        
        scale.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
      }
    });

  // Enhanced animated styles with better interpolation
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value === 1 ? undefined : height.value,
      overflow: 'hidden',
    };
  });

  const actionInnerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleY: actionInnerScaleY.value }],
    };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const iconScale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD],
      [0.8, 1, 1.2],
      'clamp'
    );
    
    const iconOpacity = interpolate(
      translateX.value,
      [0, 20, SWIPE_THRESHOLD],
      [0, 0.8, 1],
      'clamp'
    );
    
    return {
      transform: [{ scale: iconScale }],
      opacity: iconOpacity,
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    const iconScale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0],
      [1.2, 1, 0.8],
      'clamp'
    );
    
    const iconOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -20, 0],
      [1, 0.8, 0],
      'clamp'
    );
    
    return {
      transform: [{ scale: iconScale }],
      opacity: iconOpacity,
    };
  });

  const rightActionBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      ['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.9)']
    );
    
    const backgroundOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD],
      [0, 0.7, 1],
      'clamp'
    );
    
    return {
      backgroundColor,
      opacity: backgroundOpacity,
    };
  });

  const leftActionBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      ['rgba(244, 67, 54, 0.9)', 'rgba(244, 67, 54, 0.1)']
    );
    
    const backgroundOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.3, 0],
      [1, 0.7, 0],
      'clamp'
    );
    
    return {
      backgroundColor,
      opacity: backgroundOpacity,
    };
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]} layout={Layout.duration(180)}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.cardWrapper}>
          {/* Right action (complete) */}
          {onSwipeRight && (
            <Animated.View style={[styles.rightAction, rightActionBackgroundStyle]}>
              <Animated.View style={[styles.actionInner, actionInnerAnimatedStyle]}>
                <Animated.View style={[styles.actionContent, rightActionStyle]}>
                  <CheckCircle size={24} color="white" />
                  <Text style={styles.actionText}>Complete</Text>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          )}

          {/* Left action (delete) */}
          {onSwipeLeft && (
            <Animated.View style={[styles.leftAction, leftActionBackgroundStyle]}>
              <Animated.View style={[styles.actionInner, actionInnerAnimatedStyle]}>
                <Animated.View style={[styles.actionContent, leftActionStyle]}>
                  <Trash2 size={24} color="white" />
                  <Text style={styles.actionText}>Delete</Text>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          )}

          {/* Main content */}
          <Animated.View style={[styles.card, animatedCardStyle]}>
            {children}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12, // Match the reminderCard's marginBottom
    borderRadius: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden', // Essential for clipping content within border radius
  },
  cardWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden', // This will clip all content including actions
    backgroundColor: 'transparent',
  },
  card: {
    // Remove redundant styling - let the app's reminderCard style handle appearance
    // backgroundColor: Material3Colors.light.surface,
    // borderRadius: 12,
    zIndex: 2,
    position: 'relative',
    overflow: 'hidden', // Ensure card content is clipped
  },
  rightAction: {
    position: 'absolute',
    left: 0,
    top: 0, // Align with container borders
    bottom: 0, // Align with container borders
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    zIndex: 0,
    // Remove borderRadius to match container's clipping
  },
  leftAction: {
    position: 'absolute',
    left: 0,
    top: 0, // Align with container borders
    bottom: 0, // Align with container borders
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    zIndex: 0,
    // Remove borderRadius to match container's clipping
  },
  actionInner: {
    position: 'absolute',
    left: 0, // Align with TouchableOpacity border
    right: 0, // Align with TouchableOpacity border
    top: 12, // Match card's paddingVertical for better alignment
    bottom: 12, // Match card's paddingVertical for better alignment
    borderRadius: 8, // Smaller radius for the inner strip
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
});
