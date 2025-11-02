import React, { useRef, useState } from 'react';
import { Text, StyleSheet, Animated, View, Dimensions } from 'react-native';
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
  const swipeableRef = useRef<Swipeable>(null);
  
  // ✅ State to track removal animation
  const [isRemoving, setIsRemoving] = useState(false);
  const [lastSwipeDirection, setLastSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // ✅ Enhanced exit animations
  const shrinkAnimation = useRef(new Animated.Value(120)).current; // Start with card height
  const fadeAnimation = useRef(new Animated.Value(1)).current; // Fade out effect
  const scaleAnimation = useRef(new Animated.Value(1)).current; // Scale down effect
  const slideAnimation = useRef(new Animated.Value(0)).current; // Slide out effect

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
        style={[styles.rightAction, { width: SCREEN_WIDTH }]}
        onPress={() => {
          // ✅ Visual feedback only - action triggered by swipe completion
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
        style={[styles.leftAction, { width: SCREEN_WIDTH }]}
        onPress={() => {
          // ✅ Visual feedback only - action triggered by swipe completion
        }}
      >
        <Animated.View style={[styles.actionContent, { opacity, transform: [{ scale }] }]}>
          <Trash2 size={24} color="white" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </RectButton>
    );
  };

  // ✅ Render shrinking action background during removal with enhanced exit animation
  if (isRemoving && lastSwipeDirection) {
    const backgroundColor = lastSwipeDirection === 'right' ? '#4CAF50' : '#F44336';
    const icon = lastSwipeDirection === 'right' ? 
      <CheckCircle size={24} color="white" /> : 
      <Trash2 size={24} color="white" />;
    const text = lastSwipeDirection === 'right' ? 'Complete' : 'Delete';
    
    return (
      <Animated.View 
        style={[
          styles.shrinkingAction, 
          { 
            backgroundColor,
            height: shrinkAnimation,
            opacity: fadeAnimation,
            transform: [
              { scale: scaleAnimation },
              { translateX: slideAnimation }
            ]
          }
        ]}
      >
        <View style={styles.actionContent}>
          {icon}
          <Text style={styles.actionText}>{text}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={1}  // ✅ Reduced friction for smoother swipe
      leftThreshold={40}  // ✅ Lower threshold for easier swipe
      rightThreshold={40}
      renderRightActions={onSwipeRight ? renderRightActions : undefined}
      renderLeftActions={onSwipeLeft ? renderLeftActions : undefined}
      simultaneousHandlers={simultaneousHandlers}
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
      onSwipeableOpen={(direction) => {
        // ✅ Start comprehensive exit animation sequence
        setIsRemoving(true);
        setLastSwipeDirection(direction);
        
        // ✅ Determine slide direction based on swipe direction
        const slideDirection = direction === 'right' ? 100 : -100;
        
        // ✅ Start coordinated exit animations
        Animated.parallel([
          // Height shrink animation
          Animated.timing(shrinkAnimation, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false, // Height animation requires layout
          }),
          // Fade out animation
          Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          // Scale down animation
          Animated.timing(scaleAnimation, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
          // Slide out animation
          Animated.timing(slideAnimation, {
            toValue: slideDirection,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();

        // ✅ Trigger auto-scroll during exit animation for smooth gap filling
        if (onAutoScroll) {
          setTimeout(() => {
            onAutoScroll();
          }, 200); // Trigger auto-scroll early in the animation sequence
        }

        if (direction === 'right' && onSwipeRight) {
          setTimeout(() => {
            onSwipeRight();
          }, 450); // Trigger removal after animations complete
        } else if (direction === 'left' && onSwipeLeft) {
          setTimeout(() => {
            onSwipeLeft();
          }, 450); // Trigger removal after animations complete
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
    borderRadius: 8,
  },
  shrinkingAction: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
