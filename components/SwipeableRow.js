import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useCallback, useState, memo } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRenderTracking, animationConflictDetector, performanceMonitor } from '@/utils/debugUtils';
const CheckCircle = (props) => _jsx(Feather, { name: "check-circle", ...props });
const Trash2 = (props) => _jsx(Feather, { name: "trash-2", ...props });
const SwipeableRow = memo(function SwipeableRow({ children, reminder, onSwipeRight, onSwipeLeft, swipeableRefs, isSelectionMode = false, leftActionType = 'complete' }) {
    // Debug: Track renders
    useRenderTracking('SwipeableRow', { reminderId: reminder.id });
    const swipeableRef = useRef(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [cardHeight, setCardHeight] = useState(120);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const heightAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const hasLayoutMeasured = useRef(false);
    // Register this swipeable
    const setRef = useCallback((ref) => {
        swipeableRef.current = ref;
        if (ref && swipeableRefs) {
            swipeableRefs.current.set(reminder.id, ref);
        }
    }, [reminder.id, swipeableRefs]);
    // Right swipe action - Delete (red)
    const renderRightActions = useCallback((progress, dragX) => {
        if (!onSwipeRight)
            return null;
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
        return (_jsxs(Animated.View, { style: [styles.rightAction, { transform: [{ translateX }, { scale }], opacity }], children: [_jsx(Trash2, { size: 24, color: "white" }), _jsx(Text, { style: styles.actionText, children: "Delete" })] }));
    }, [onSwipeRight]);
    // Left swipe action - Complete (green)
    const renderLeftActions = useCallback((progress, dragX) => {
        if (!onSwipeLeft)
            return null;
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
        return (_jsxs(Animated.View, { style: [
                styles.leftAction,
                leftActionType === 'delete' && styles.leftActionDelete,
                { transform: [{ translateX }, { scale }], opacity }
            ], children: [leftActionType === 'delete' ? (_jsx(Trash2, { size: 24, color: "white" })) : (_jsx(CheckCircle, { size: 24, color: "white" })), _jsx(Text, { style: styles.actionText, children: leftActionType === 'delete' ? 'Delete' : 'Complete' })] }));
    }, [onSwipeLeft, leftActionType]);
    // Close other swipeables when this one opens
    const handleSwipeableWillOpen = useCallback((direction) => {
        if (swipeableRefs) {
            swipeableRefs.current.forEach((ref, id) => {
                if (id !== reminder.id) {
                    ref?.close();
                }
            });
        }
    }, [reminder.id, swipeableRefs]);
    // Execute full swipe-away animation
    const handleSwipeableOpen = useCallback((direction) => {
        if (isRemoving)
            return;
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
        // Platform-specific animation timing - increased speed
        const slideDuration = Platform.OS === 'android' ? 200 : 250;
        const heightDuration = Platform.OS === 'android' ? 180 : 250;
        const heightDelay = Platform.OS === 'android' ? 30 : 0;
        // Set removing state after a brief delay on Android to prevent flash
        if (Platform.OS === 'android') {
            setTimeout(() => setIsRemoving(true), 16);
        }
        else {
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
            }
            else if (direction === 'left' && onSwipeLeft) {
                onSwipeLeft();
            }
        });
    }, [isRemoving, slideAnim, fadeAnim, scaleAnim, heightAnim, onSwipeRight, onSwipeLeft, reminder.id]);
    return (_jsx(Animated.View, { style: {
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
        }, onLayout: (e) => {
            const { height } = e.nativeEvent.layout;
            if (height > 0 && !isRemoving && !hasLayoutMeasured.current) {
                setCardHeight(height);
                hasLayoutMeasured.current = true;
            }
        }, children: _jsx(Animated.View, { style: {
                transform: [{ translateX: slideAnim }, { scaleY: scaleAnim }],
                opacity: fadeAnim,
                overflow: 'visible',
            }, children: _jsx(Swipeable, { ref: setRef, friction: 2, leftThreshold: 80, rightThreshold: 80, overshootLeft: false, overshootRight: false, renderRightActions: onSwipeRight ? renderRightActions : undefined, renderLeftActions: onSwipeLeft ? renderLeftActions : undefined, onSwipeableWillOpen: handleSwipeableWillOpen, onSwipeableOpen: handleSwipeableOpen, enabled: !isRemoving && !isSelectionMode, activeOffsetX: [-15, 15], failOffsetY: [-10, 10], children: _jsx(View, { style: styles.cardContainer, children: children }) }) }) }));
}, (prevProps, nextProps) => {
    // Optimize re-renders - only update if reminder changes
    return (prevProps.reminder.id === nextProps.reminder.id &&
        prevProps.reminder.isCompleted === nextProps.reminder.isCompleted &&
        prevProps.reminder.title === nextProps.reminder.title &&
        prevProps.onSwipeRight === nextProps.onSwipeRight &&
        prevProps.onSwipeLeft === nextProps.onSwipeLeft &&
        prevProps.isSelectionMode === nextProps.isSelectionMode);
});
export default SwipeableRow;
const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: 'transparent',
        overflow: 'visible',
    },
    rightAction: {
        backgroundColor: '#F44336',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: 12,
        marginLeft: -12,
        marginRight: 20,
        marginVertical: 2,
    },
    leftAction: {
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: 12,
        marginRight: -12,
        marginLeft: 20,
        marginVertical: 2,
    },
    leftActionDelete: {
        backgroundColor: '#F44336',
    },
    actionText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
});
