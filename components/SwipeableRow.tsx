import React, { useRef, useCallback, useState } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Reminder } from '@/types/reminder';

const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  swipeableRefs?: React.MutableRefObject<Map<string, any>>;
  simultaneousHandlers?: React.RefObject<any>;
}

export default function SwipeableRow({ 
  children,
  reminder,
  onSwipeRight,
  onSwipeLeft,
  swipeableRefs
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [cardHeight, setCardHeight] = useState(120);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const heightAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Register this swipeable
  const setRef = useCallback((ref: Swipeable | null) => {
    swipeableRef.current = ref;
    if (ref && swipeableRefs) {
      swipeableRefs.current.set(reminder.id, ref);
    }
  }, [reminder.id, swipeableRefs]);

  // Right swipe action - Delete (red)
  const renderRightActions = useCallback((progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    if (!onSwipeRight) return null;

    const translateX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 0],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.rightAction, { transform: [{ translateX }, { scale }], opacity }]}>
        <Trash2 size={24} color="white" />
        <Text style={styles.actionText}>Delete</Text>
      </Animated.View>
    );
  }, [onSwipeRight]);

  // Left swipe action - Complete (green)
  const renderLeftActions = useCallback((progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    if (!onSwipeLeft) return null;

    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 0],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.leftAction, { transform: [{ translateX }, { scale }], opacity }]}>
        <CheckCircle size={24} color="white" />
        <Text style={styles.actionText}>Complete</Text>
      </Animated.View>
    );
  }, [onSwipeLeft]);

  // Close other swipeables when this one opens
  const handleSwipeableWillOpen = useCallback((direction: 'left' | 'right') => {
    if (swipeableRefs) {
      swipeableRefs.current.forEach((ref, id) => {
        if (id !== reminder.id) {
          ref?.close();
        }
      });
    }
  }, [reminder.id, swipeableRefs]);

  // Execute full swipe-away animation
  const handleSwipeableOpen = useCallback((direction: 'left' | 'right') => {
    if (isRemoving) return;
    
    setIsRemoving(true);
    
    // Haptic feedback for action confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const screenWidth = Dimensions.get('window').width;
    const targetX = direction === 'right' ? screenWidth : -screenWidth;
    
    // Animate card sliding off screen with action fade-out
    Animated.parallel([
      // Slide card off screen
      Animated.timing(slideAnim, {
        toValue: targetX,
        duration: 350,
        useNativeDriver: true,
      }),
      // Fade out the card
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      // Scale down slightly for depth effect
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 350,
        useNativeDriver: true,
      }),
      // Collapse height for smooth card repositioning
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Execute the action after animation completes
      if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      } else if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      }
    });
  }, [isRemoving, slideAnim, fadeAnim, scaleAnim, heightAnim, onSwipeRight, onSwipeLeft]);

  return (
    <Animated.View 
      style={{
        transform: [{ translateX: slideAnim }, { scaleY: scaleAnim }],
        opacity: fadeAnim,
        paddingHorizontal: 16,
        ...(isRemoving && {
          height: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, cardHeight],
          }),
          overflow: 'hidden',
        }),
        marginBottom: isRemoving ? heightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 8],
        }) : 8,
      }}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        if (height > 0 && !isRemoving) {
          setCardHeight(height);
        }
      }}
    >
      <Swipeable
        ref={setRef}
        friction={2}
        leftThreshold={80}
        rightThreshold={80}
        overshootLeft={false}
        overshootRight={false}
        renderRightActions={onSwipeRight ? renderRightActions : undefined}
        renderLeftActions={onSwipeLeft ? renderLeftActions : undefined}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        onSwipeableOpen={handleSwipeableOpen}
        enabled={!isRemoving}
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
    backgroundColor: 'transparent',
  },
  rightAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginLeft: 8,
  },
  leftAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
