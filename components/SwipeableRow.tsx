import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolateColor,
  Layout,
  FadeOut,
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
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 80;

export default function SwipeableRow({ 
  children, 
  reminder, 
  onSwipeRight, 
  onSwipeLeft 
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])  // Only activate after 10px horizontal movement
    .failOffsetY([-10, 10])     // Fail if vertical movement exceeds 10px
    .onUpdate((event) => {
      // Only allow swipe if handlers are provided
      if (event.translationX > 0 && !onSwipeRight) return;
      if (event.translationX < 0 && !onSwipeLeft) return;
      
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD && onSwipeRight;
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD && onSwipeLeft;

      if (shouldSwipeRight) {
        // Animate to complete swipe right
        translateX.value = withSpring(SCREEN_WIDTH, {
          damping: 20,
          stiffness: 300,
        });
        opacity.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
        runOnJS(onSwipeRight!)();
      } else if (shouldSwipeLeft) {
        // Animate to complete swipe left
        translateX.value = withSpring(-SCREEN_WIDTH, {
          damping: 20,
          stiffness: 300,
        });
        opacity.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
        runOnJS(onSwipeLeft!)();
      } else {
        // Spring back to center
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
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
      style={styles.container}
      layout={Layout.springify().damping(20).stiffness(300)}
      exiting={FadeOut.duration(250)}
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
  },
  content: {
    backgroundColor: Material3Colors.light.surface,
    zIndex: 1,
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