import React, { useRef, useCallback, useMemo, useState, useEffect, memo } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Reminder } from '@/types/reminder';
import { useRenderTracking, animationConflictDetector, performanceMonitor } from '@/utils/debugUtils';
import { useThemeColors } from '@/hooks/theme-provider';
import { showToast } from '@/utils/toast';

const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => unknown | Promise<unknown>;
  onSwipeLeft?: () => unknown | Promise<unknown>;
  swipeableRefs?: React.MutableRefObject<Map<string, any>>;
  simultaneousHandlers?: React.RefObject<any>;
  isSelectionMode?: boolean;
  leftActionType?: 'complete' | 'delete';
}

const SwipeableRowContent = memo(function SwipeableRowContent({
  children,
  reminder,
  onSwipeRight,
  onSwipeLeft,
  swipeableRefs,
  isSelectionMode = false,
  leftActionType = 'complete'
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
  const removingRef = useRef(false);
  const mountedRef = useRef(true);
  const removalAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      removalAnimation.current?.stop();
    };
  }, []);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Register this swipeable
  const setRef = useCallback((ref: Swipeable | null) => {
    swipeableRef.current = ref;
    if (ref && swipeableRefs) {
      swipeableRefs.current.set(reminder.id, ref);
    } else {
      swipeableRefs?.current.delete(reminder.id);
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
        <Trash2 size={24} color={colors.onError} />
        <Text style={[styles.actionText, styles.actionTextDelete]}>Delete</Text>
      </Animated.View>
    );
  }, [onSwipeRight, colors.onError, styles]);

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
      <Animated.View style={[
        styles.leftAction,
        leftActionType === 'delete' && styles.leftActionDelete,
        { transform: [{ translateX }, { scale }], opacity }
      ]}>
        {leftActionType === 'delete' ? (
          <Trash2 size={24} color={colors.onError} />
        ) : (
          <CheckCircle size={24} color={colors.onSuccess} />
        )}
        <Text style={[
          styles.actionText,
          leftActionType === 'delete' ? styles.actionTextDelete : styles.actionTextComplete
        ]}>
          {leftActionType === 'delete' ? 'Delete' : 'Complete'}
        </Text>
      </Animated.View>
    );
  }, [onSwipeLeft, leftActionType, colors.onError, colors.onSuccess, styles]);

  // Close other swipeables when this one opens
  const handleSwipeableWillOpen = useCallback(() => {
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
    const action = direction === 'right' ? onSwipeRight : onSwipeLeft;
    if (removingRef.current || !action) return;
    removingRef.current = true;
    setIsRemoving(true);
    
    // Debug: Track animation start
    performanceMonitor.start(`SwipeAnimation-${reminder.id}`);
    
    // Debug: Register animations to detect conflicts
    const nodeId = `swipeable-${reminder.id}`;
    animationConflictDetector.registerAnimation(nodeId, 'slideAnim', true);
    animationConflictDetector.registerAnimation(nodeId, 'fadeAnim', true);
    animationConflictDetector.registerAnimation(nodeId, 'scaleAnim', true);
    animationConflictDetector.registerAnimation(nodeId + '-height', 'heightAnim', false);
    
    // Haptic feedback for action confirmation
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
    const screenWidth = Dimensions.get('window').width;
    const targetX = direction === 'right' ? screenWidth : -screenWidth;
    
    // Platform-specific animation timing - increased speed
    const slideDuration = Platform.OS === 'android' ? 200 : 250;
    const heightDuration = Platform.OS === 'android' ? 180 : 250;
    const heightDelay = Platform.OS === 'android' ? 30 : 0;
    
    // Animate card sliding off screen with action fade-out
    const animation = Animated.parallel([
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
    ]);
    removalAnimation.current = animation;
    animation.start(async ({ finished }) => {
      // Debug: Track animation end
      performanceMonitor.end(`SwipeAnimation-${reminder.id}`);
      
      // Debug: Unregister animations
      const nodeId = `swipeable-${reminder.id}`;
      animationConflictDetector.unregisterAnimation(nodeId, 'slideAnim');
      animationConflictDetector.unregisterAnimation(nodeId, 'fadeAnim');
      animationConflictDetector.unregisterAnimation(nodeId, 'scaleAnim');
      animationConflictDetector.unregisterAnimation(nodeId + '-height', 'heightAnim');
      
      if (!finished || !mountedRef.current) return;
      try {
        await action();
      } catch {
        if (mountedRef.current) {
          slideAnim.setValue(0);
          fadeAnim.setValue(1);
          heightAnim.setValue(1);
          scaleAnim.setValue(1);
          removingRef.current = false;
          setIsRemoving(false);
          swipeableRef.current?.reset();
        }
        showToast('Could not save the reminder change. Please try again.');
      }
    });
  }, [slideAnim, fadeAnim, scaleAnim, heightAnim, onSwipeRight, onSwipeLeft, reminder.id]);

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
        ...(!isRemoving && {
          overflow: 'visible',
        }),
        marginBottom: isRemoving ? heightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 5],
        }) : 5,
      }}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        if (height > 0 && !removingRef.current) {
          setCardHeight(height);
        }
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateX: slideAnim }, { scaleY: scaleAnim }],
          opacity: fadeAnim,
          overflow: 'visible',
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
});

// FlashList recycles cells across IDs; animation state belongs to one reminder.
const SwipeableRow = (props: SwipeableRowProps) => (
  <SwipeableRowContent key={props.reminder.id} {...props} />
);

export default SwipeableRow;

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  cardContainer: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  rightAction: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginLeft: -12,
    marginRight: 20,
    marginVertical: 2,
  },
  leftAction: {
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginRight: -12,
    marginLeft: 20,
    marginVertical: 2,
  },
  leftActionDelete: {
    backgroundColor: colors.error,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  actionTextDelete: {
    color: colors.onError,
  },
  actionTextComplete: {
    color: colors.onSuccess,
  },
});
