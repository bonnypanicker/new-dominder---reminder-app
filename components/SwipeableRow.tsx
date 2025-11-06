import React, { useState } from 'react';
import { Text, StyleSheet, View, Dimensions, Platform } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Layout,
  FadeOut,
  FadeIn,
  runOnJS
} from 'react-native-reanimated';
import { Material3Colors } from '@/constants/colors';
import { Reminder } from '@/types/reminder';

const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  swipeableRefs?: React.MutableRefObject<Map<string, Swipeable>>;
  simultaneousHandlers?: React.RefObject<any>;
  onAutoScroll?: (deletedId?: string) => void; // ✅ Trigger auto-scroll after swipe with deleted id
}

export default function SwipeableRow({ 
  children, 
  reminder, 
  onSwipeRight, 
  onSwipeLeft,
  swipeableRefs,
  simultaneousHandlers,
  onAutoScroll
}: SwipeableRowProps) {
  const SCREEN_WIDTH = Dimensions.get('window').width; // retained, but actions will use container width
  
  // ✅ Reanimated 3 shared values for smooth vertical animations
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);  // Changed from translateX to translateY for vertical animation
  const scale = useSharedValue(1);       // Added scale for enhanced fade effect
  
  // ✅ State to track if card is being removed
  const [isRemoving, setIsRemoving] = useState(false);

  // ✅ Animated style for smooth vertical fade-out and slide-up
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },  // Vertical slide instead of horizontal
        { scale: scale.value }             // Scale effect for better visual feedback
      ],
    };
  });

  // ✅ Function to execute delete with vertical slide-up animation
  const executeDelete = (direction: 'left' | 'right') => {
    // 1. Start vertical fade-out and slide-up animation
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(-50, { duration: 200 });  // Slide up instead of sideways
    scale.value = withTiming(0.95, { duration: 200 });      // Slight scale down for better effect
    
    // 2. Trigger data removal immediately (no setTimeout)
    // The onAutoScroll will be handled by the exiting animation callback
    if (direction === 'right' && onSwipeRight) {
      onSwipeRight();
    } else if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft();
    }
    
    // Note: onAutoScroll is now only called in the exiting animation callback
    // This ensures it happens after the item is fully removed and animated out
  };

  // ✅ Right swipe action (Complete) - Native Android component
  const renderRightActions = () => {
    if (!onSwipeRight) return null;

    return (
      <RectButton
        style={[styles.rightAction, { width: '100%' }]}
        onPress={() => {
          // ✅ Visual feedback only - action triggered by swipe completion
        }}
      >
        <View style={styles.actionContent}>
          <CheckCircle size={24} color="white" />
          <Text style={styles.actionText}>Complete</Text>
        </View>
      </RectButton>
    );
  };

  // ✅ Left swipe action (Delete) - Native Android component
  const renderLeftActions = () => {
    if (!onSwipeLeft) return null;

    return (
      <RectButton
        style={[styles.leftAction, { width: '100%' }]}
        onPress={() => {
          // ✅ Visual feedback only - action triggered by swipe completion
        }}
      >
        <View style={styles.actionContent}>
          <Trash2 size={24} color="white" />
          <Text style={styles.actionText}>Delete</Text>
        </View>
      </RectButton>
    );
  };

  return (
    <Animated.View 
      style={[animatedStyle]}
      layout={Platform.OS === 'android' ? Layout.springify().damping(15).stiffness(300) : undefined}
      entering={Platform.OS === 'android' ? FadeIn.duration(200) : undefined}
      exiting={Platform.OS === 'android' 
        ? FadeOut.duration(200).withCallback(() => {
            // Ensure cleanup after animation completes (Android only)
            if (onAutoScroll) {
              runOnJS(onAutoScroll)(reminder.id);
            }
          })
        : undefined}
    >
      <Swipeable
        friction={1}
        leftThreshold={40}
        rightThreshold={40}
        renderRightActions={onSwipeRight ? renderRightActions : undefined}
        renderLeftActions={onSwipeLeft ? renderLeftActions : undefined}
        simultaneousHandlers={simultaneousHandlers}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableWillOpen={(direction) => {
          // Note: Without refs, we can't close other swipeables automatically
          // This would need to be handled at the parent component level
        }}
        onSwipeableOpen={(direction) => {
           // ✅ Prevent multiple triggers
           if (isRemoving) return;
           setIsRemoving(true);
           
           // ✅ Haptic feedback when delete threshold is crossed
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
           
           // ✅ Execute fade-out sequence
           executeDelete(direction);
         }}
      >
        <View style={styles.cardContainer}>
          {children}
        </View>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Material3Colors.light.surface,
    borderRadius: 8,
  },
  rightAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'flex-end',    // ✅ Changed from 'flex-start' to 'flex-end' to position icon on right
    paddingRight: 16,          // ✅ Align with card content padding
    width: 120,
  },
  leftAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'flex-start',  // ✅ Changed from 'flex-end' to 'flex-start' to position icon on left
    paddingLeft: 16,           // ✅ Align with card content padding
    width: 120,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

