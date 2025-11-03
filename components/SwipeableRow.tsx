import React, { useState } from 'react';
import { Text, StyleSheet, View, Dimensions } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Layout,
  FadeOut
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
  onAutoScroll?: () => void; // ✅ Callback to trigger auto-scroll after swipe
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
  const SCREEN_WIDTH = Dimensions.get('window').width;
  
  // ✅ Reanimated 3 shared values for smooth animations
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  
  // ✅ State to track if card is being removed
  const [isRemoving, setIsRemoving] = useState(false);

  // ✅ Animated style for smooth fade-out and slide
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }],
    };
  });

  // ✅ Function to execute delete with proper sequencing
  const executeDelete = (direction: 'left' | 'right') => {
    // 1. Start fade-out and slide animation
    opacity.value = withTiming(0, { duration: 150 });
    translateX.value = withTiming(direction === 'right' ? 100 : -100, { duration: 150 });
    
    // 2. After fade-out completes, trigger data removal
    setTimeout(() => {
      if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      } else if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      }
    }, 200); // 150ms animation + 50ms buffer
  };

  // ✅ Right swipe action (Complete) - Native Android component
  const renderRightActions = () => {
    if (!onSwipeRight) return null;

    return (
      <RectButton
        style={[styles.rightAction, { width: SCREEN_WIDTH }]}
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
        style={[styles.leftAction, { width: SCREEN_WIDTH }]}
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
      layout={Layout.springify().damping(15).stiffness(300)}
      exiting={FadeOut.duration(150)}
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
    alignItems: 'flex-start',
    paddingLeft: 20,
    width: 120,
  },
  leftAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
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
