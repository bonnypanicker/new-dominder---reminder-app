import React, { useState, useRef } from 'react';
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
  
  // ✅ Reanimated 3 shared values (kept, but no manual removal slide)
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // ✅ State to track if card is being removed
  const [isRemoving, setIsRemoving] = useState(false);

  // ✅ Keep a ref to the Swipeable so we can close it before removing
  const swipeRef = useRef<Swipeable | null>(null);

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

  // ✅ Execute data removal only (let exiting animation handle visuals)
  const executeDelete = (direction: 'left' | 'right') => {
    // Trigger data removal; row will unmount and use exiting FadeOut
    if (direction === 'right' && onSwipeRight) {
      onSwipeRight();
    } else if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft();
    }
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
      // Drop row-level layout animation to avoid conflicts with FlashList
      // layout={Platform.OS === 'android' ? Layout.springify().damping(15).stiffness(300) : undefined}
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
        ref={swipeRef}
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
           
           // ✅ Close the swipe first to avoid horizontal offset during removal
           swipeRef.current?.close();
           // Schedule data removal on the next frame for smoother coordination
           requestAnimationFrame(() => executeDelete(direction));
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



