import React, { useRef, useCallback, useState, memo } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Reminder } from '@/types/reminder';
import { useRenderTracking, animationConflictDetector, performanceMonitor } from '@/utils/debugUtils';

const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  swipeableRefs?: React.MutableRefObject<Map<string, any>>;
  simultaneousHandlers?: React.RefObject<any>;
  isSelectionMode?: boolean;
}

const SwipeableRow = memo(function SwipeableRow({ 
  children,
  reminder,
  onSwipeRight,
  onSwipeLeft,
  swipeableRefs,
  isSelectionMode = false
}: SwipeableRowProps) {
  // Debug: Track renders
  useRenderTracking('SwipeableRow', { reminderId: reminder.id });

  const swipeableRef = useRef<Swipeable>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [cardHeight, setCardHeight] = useState(120);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const heightAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasLayoutMeasured = useRef(false);

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
    
    // Debug: Track animation start
    performanceMonitor.start(`SwipeAnimation-${reminder.id}`);
    
    // Debug: Register animations to detect conflicts
    const nodeId = `swipeable-${reminder.id}`;
    animationConflictDetector.registerAnimation(nodeId, 'slideAnim', true);
    animationConflictDetector.registerAnimation(nodeId, 'fadeAnim', true);
    animationConflictDetector.registerAnimation(nodeId, 'scaleAnim', true);
    animationConflictDetector.registerAnimation(nodeId + '-height', 'heightAnim', false);
    
    // Haptic feedback for action confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const screenWidth = Dimensions.get('window').width;
    const targetX = direction === 'right' ? screenWidth : -screenWidth;
    
    // Platform-specific animation timing
    const slideDuration = Platform.OS === 'android' ? 300 : 350;
    const heightDuration = Platform.OS === 'android' ? 250 : 350;
    const heightDelay = Platform.OS === 'android' ? 50 : 0;
    
    // Set removing state after a brief delay on Android to prevent flash
    if (Platform.OS === 'android') {
      setTimeout(() => setIsRemoving(true), 16);
    } else {
      setIsRemoving(true);
    }
    
    // Animate card sliding off screen with action fade-out
    Animated.parallel([
      // Slide card off screen
      Animated.timing(slideAnim, {
        toValue: targetX,
        duration: slideDuration,
        useNativeDriver: true,
      }),
      // Fade out the card
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: slideDuration,
        useNativeDriver: true,
      }),
      // Scale down slightly for depth effect
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: slideDuration,
        useNativeDriver: true,
      }),
      // Collapse height with delay for smooth card repositioning
      Animated.sequence([
        Animated.delay(heightDelay),
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: heightDuration,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      // Debug: Track animation end
      performanceMonitor.end(`SwipeAnimation-${reminder.id}`);
      
      // Debug: Unregister animations
      const nodeId = `swipeable-${reminder.id}`;
      animationConflictDetector.unregisterAnimation(nodeId, 'slideAnim');
      animationConflictDetector.unregisterAnimation(nodeId, 'fadeAnim');
      animationConflictDetector.unregisterAnimation(nodeId, 'scaleAnim');
      animationConflictDetector.unregisterAnimation(nodeId + '-height', 'heightAnim');
      
      // Execute the action after animation completes
      if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      } else if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      }
    });
  }, [isRemoving, slideAnim, fadeAnim, scaleAnim, heightAnim, onSwipeRight, onSwipeLeft, reminder.id]);

  return (
    <Animated.View
      style={{
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
        if (height > 0 && !isRemoving && !hasLayoutMeasured.current) {
          setCardHeight(height);
          hasLayoutMeasured.current = true;
        }
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateX: slideAnim }, { scaleY: scaleAnim }],
          opacity: fadeAnim,
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
        enabled={!isRemoving && !isSelectionMode}
        activeOffsetX={[-15, 15]}
        failOffsetY={[-10, 10]}
      >
          <View style={styles.cardContainer}>
            {children}
          </View>
        </Swipeable>
      </Animated.View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Optimize re-renders - only update if reminder changes
  return (
    prevProps.reminder.id === nextProps.reminder.id &&
    prevProps.reminder.isCompleted === nextProps.reminder.isCompleted &&
    prevProps.reminder.title === nextProps.reminder.title &&
    prevProps.onSwipeRight === nextProps.onSwipeRight &&
    prevProps.onSwipeLeft === nextProps.onSwipeLeft &&
    prevProps.isSelectionMode === nextProps.isSelectionMode
  );
});

export default SwipeableRow;

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
    marginLeft: 1,
    marginRight: 20,
  },
  leftAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginRight: 1,
    marginLeft: 20,
  },
  actionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
