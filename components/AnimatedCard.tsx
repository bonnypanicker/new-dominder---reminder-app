import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { getGestureConfig } from '@/utils/gesture-coordination';

interface AnimatedCardProps {
  children: React.ReactNode;
  isNew?: boolean; // Whether this is a newly added card
  index: number; // Position in the list for staggered animations
}

export default function AnimatedCard({ children, isNew = false, index }: AnimatedCardProps) {
  const opacity = useSharedValue(isNew ? 0 : 1);
  const translateY = useSharedValue(isNew ? 50 : 0);
  const scale = useSharedValue(isNew ? 0.95 : 1);
  
  const gestureConfig = getGestureConfig();
  
  useEffect(() => {
    if (isNew) {
      // Staggered entrance animation for new cards
      const delay = index * 50; // 50ms delay between each card
      
      setTimeout(() => {
        opacity.value = withTiming(1, {
          duration: gestureConfig.slideInDuration,
          easing: Easing.out(Easing.cubic),
        });
        
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
        
        scale.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
      }, delay);
    }
  }, [isNew, index, gestureConfig.animationDuration, opacity, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}