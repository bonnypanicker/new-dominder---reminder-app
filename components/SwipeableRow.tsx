import React, { useState, useRef, useEffect } from 'react';
import { Text, StyleSheet, View, Dimensions, Platform } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  LinearTransition,
  SlideOutLeft,
  SlideOutRight,
  FadeInDown,
  Easing
} from 'react-native-reanimated';
import { Material3Colors } from '@/constants/colors';
import { Reminder } from '@/types/reminder';

const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

// Animation timing constants
const EXIT_ANIMATION_DURATION = 200; // Must match exit animation duration
const LAYOUT_ANIMATION_DURATION = 300; // Must match layout transition duration

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  swipeableRefs?: React.MutableRefObject<Map<string, Swipeable>>;
  simultaneousHandlers?: React.RefObject<any>;
}

export default function SwipeableRow({ 
  children, 
  reminder, 
  onSwipeRight, 
  onSwipeLeft,
  swipeableRefs,
  simultaneousHandlers
}: SwipeableRowProps) {
  // Track which direction the card is being removed
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const swipeRef = useRef<Swipeable | null>(null);
  const removalTimeoutRef = useRef<number | null>(null);

  // Register/unregister this swipeable in the refs map
  useEffect(() => {
    if (swipeableRefs && swipeRef.current) {
      swipeableRefs.current.set(reminder.id, swipeRef.current);
    }
    return () => {
      if (swipeableRefs) {
        swipeableRefs.current.delete(reminder.id);
      }
      if (removalTimeoutRef.current) {
        clearTimeout(removalTimeoutRef.current);
      }
    };
  }, [reminder.id, swipeableRefs]);

  // Execute data removal with proper timing
  const executeDelete = (direction: 'left' | 'right') => {
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
        style={styles.rightAction}
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
        style={styles.leftAction}
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

  // Optimized layout transition for smooth repositioning of other cards
  const layoutTransition = LinearTransition
    .duration(300)
    .easing(Easing.bezier(0.25, 0.1, 0.25, 1));

  // Directional exit animation based on swipe direction
  const exitAnimation = swipeDirection === 'left' 
    ? SlideOutLeft.duration(200).easing(Easing.bezier(0.4, 0, 0.2, 1))
    : SlideOutRight.duration(200).easing(Easing.bezier(0.4, 0, 0.2, 1));

  // Smooth entering animation for new cards
  const enterAnimation = FadeInDown.duration(250).easing(Easing.bezier(0.25, 0.1, 0.25, 1));

  return (
    <Animated.View 
      layout={Platform.OS !== 'web' ? layoutTransition : undefined}
      entering={Platform.OS !== 'web' ? enterAnimation : undefined}
      exiting={Platform.OS !== 'web' && isRemoving ? exitAnimation : undefined}
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
          // Close all other open swipeables to ensure only one is open at a time
          if (swipeableRefs) {
            swipeableRefs.current.forEach((ref, id) => {
              if (id !== reminder.id) {
                ref?.close();
              }
            });
          }
        }}
        onSwipeableOpen={(direction) => {
           if (isRemoving) return;
           
           // Set direction for exit animation
           setSwipeDirection(direction);
           setIsRemoving(true);
           
           // Haptic feedback
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
           
           // Close the swipeable immediately
           swipeRef.current?.close();
           
           // Platform-specific timing:
           // - Web: No exit animation, execute immediately
           // - Native: Wait for exit animation to complete before removing data
           if (Platform.OS === 'web') {
             // Web doesn't use exit animations, remove immediately
             executeDelete(direction);
           } else {
             // Native: Delay data removal until after exit animation completes
             removalTimeoutRef.current = setTimeout(() => {
               executeDelete(direction);
             }, EXIT_ANIMATION_DURATION);
           }
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
    overflow: 'visible',
  },
  rightAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'flex-end',    // ✅ Changed from 'flex-start' to 'flex-end' to position icon on right
    paddingRight: 16,          // ✅ Align with card content padding
    flex: 1,                   // ✅ Fill full row width behind the card
  },
  leftAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'flex-start',  // ✅ Changed from 'flex-end' to 'flex-start' to position icon on left
    paddingLeft: 16,           // ✅ Align with card content padding
    flex: 1,                   // ✅ Fill full row width behind the card
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



