import React, { useRef } from 'react';
import { Text, StyleSheet, Animated, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
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
  const swipeableRef = useRef<Swipeable>(null);

  // Store ref for closing other swipeables
  React.useEffect(() => {
    if (swipeableRefs) {
      swipeableRefs.current.set(reminder.id, swipeableRef.current!);
      return () => {
        swipeableRefs.current.delete(reminder.id);
      };
    }
  }, [reminder.id, swipeableRefs]);

  // ✅ Right swipe action (Complete) - Native Android component
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!onSwipeRight) return null;

    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [0, 50],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <RectButton
        style={styles.rightAction}
        onPress={() => {
          swipeableRef.current?.close();
          setTimeout(() => onSwipeRight(), 50);  // Small delay for animation
        }}
      >
        <Animated.View style={[styles.actionContent, { opacity, transform: [{ scale }] }]}>
          <CheckCircle size={24} color="white" />
          <Text style={styles.actionText}>Complete</Text>
        </Animated.View>
      </RectButton>
    );
  };

  // ✅ Left swipe action (Delete) - Native Android component
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!onSwipeLeft) return null;

    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-50, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <RectButton
        style={styles.leftAction}
        onPress={() => {
          swipeableRef.current?.close();
          setTimeout(() => onSwipeLeft(), 50);  // Small delay for animation
        }}
      >
        <Animated.View style={[styles.actionContent, { opacity, transform: [{ scale }] }]}>
          <Trash2 size={24} color="white" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </RectButton>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}  // ✅ Smooth swipe feel on Android
      leftThreshold={80}
      rightThreshold={80}
      renderRightActions={onSwipeRight ? renderRightActions : undefined}
      renderLeftActions={onSwipeLeft ? renderLeftActions : undefined}
      overshootLeft={false}  // ✅ Prevents over-swipe jank on Android
      overshootRight={false}
      onSwipeableWillOpen={(direction) => {
        // Close other open swipeables (Android best practice)
        if (swipeableRefs) {
          swipeableRefs.current.forEach((swipeable, id) => {
            if (id !== reminder.id) {
              swipeable?.close();
            }
          });
        }
      }}
    >
      <View style={styles.cardContainer}>
        {children}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Material3Colors.light.surface,
    // ✅ No nested Animated.Views - flat hierarchy for Android
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