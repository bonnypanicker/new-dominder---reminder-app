import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, PanResponder, NativeModules, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/theme-provider';
export default function OnboardingFlow({ visible, onSkip, onComplete }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { width: winW } = useWindowDimensions();
    const [index, setIndex] = useState(0);
    const translateX = useRef(new Animated.Value(0)).current;
    // Track the source of the last interaction to determine animation style
    const lastInteraction = useRef('programmatic');
    const panels = useMemo(() => [
        {
            key: 'fast',
            title: 'Quick-Set Reminders',
            body: 'Experience a smarter way to schedule reminders.',
            render: () => (_jsx(Image, { source: require('../assets/images/undraw_completed-tasks_1j9z.png'), style: { width: 240, height: 400 }, resizeMode: "contain" })),
        },
        {
            key: 'modes',
            title: 'Smart Notification Modes',
            body: 'Standard Mode – Regular notification alerts\nSilent Mode – Gentle notifications without sound\nRinger Mode – Full-screen reminder with loud alert so you can’t miss it',
            render: () => (_jsx(Image, { source: require('../assets/images/modes_A3.png'), style: { width: 300, height: 180 }, resizeMode: "contain" })),
        },
        {
            key: 'flex',
            title: 'Flexible Reminder Management',
            body: 'Pause, repeat, and manage reminders exactly the way you need.\n\nPause – Pause daily reminders. Long-press the button to pause until a selected date. Auto-resumes later.\n\nRepeat – Daily, Monthly, Yearly, or custom recurring schedules.\n\nOccurrence – Optional setting to repeat reminders by count instead of an end date/time.',
            render: () => (_jsx(Image, { source: require('../assets/images/flexible_management_v2.png'), style: { width: 300, height: 300 }, resizeMode: "contain" })),
        }
    ], [colors.onSurface, colors.outlineVariant, colors.primary, colors.surfaceVariant]);
    useEffect(() => {
        if (!visible)
            return;
        setIndex(0);
        translateX.setValue(0);
    }, [visible, translateX]);
    // Handle Android back button/gesture using BackHandler for better compatibility
    // with predictive back gestures (android:enableOnBackInvokedCallback="true")
    const handleBackPress = useCallback(() => {
        if (!visible)
            return false;
        if (index > 0) {
            // Go back to previous slide
            lastInteraction.current = 'programmatic';
            setIndex((i) => i - 1);
            return true; // Prevent default back behavior
        }
        else {
            // On first slide, minimize the app (standard Android behavior)
            if (Platform.OS === 'android') {
                NativeModules.AlarmModule?.minimize();
                return true; // Prevent default back behavior (we handled it)
            }
            return false;
        }
    }, [visible, index]);
    useEffect(() => {
        if (!visible || Platform.OS !== 'android')
            return;
        // Add BackHandler listener with high priority
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => {
            backHandler.remove();
        };
    }, [visible, handleBackPress]);
    // Pan responder for swipe gestures
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            // Activate pan responder if horizontal swipe is detected
            return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        },
        onPanResponderGrant: () => {
            // Stop any ongoing animation
            translateX.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
            // Update position based on gesture
            const newValue = -index * winW + gestureState.dx;
            translateX.setValue(newValue);
        },
        onPanResponderRelease: (_, gestureState) => {
            const threshold = winW * 0.25; // 25% of screen width
            const velocity = gestureState.vx;
            // Determine direction based on velocity or distance
            let newIndex = index;
            if (velocity < -0.5 || (velocity <= 0 && gestureState.dx < -threshold)) {
                // Swipe left - go to next panel
                newIndex = Math.min(panels.length - 1, index + 1);
            }
            else if (velocity > 0.5 || (velocity >= 0 && gestureState.dx > threshold)) {
                // Swipe right - go to previous panel
                newIndex = Math.max(0, index - 1);
            }
            if (newIndex !== index) {
                // Index changed: Delegating animation to useEffect
                lastInteraction.current = 'gesture';
                setIndex(newIndex);
            }
            else {
                // Index didn't change: Manually snap back
                Animated.spring(translateX, {
                    toValue: -index * winW,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: Platform.OS !== 'web',
                }).start();
            }
        },
        onPanResponderTerminate: () => {
            // Snap back on interruption
            Animated.spring(translateX, {
                toValue: -index * winW,
                friction: 8,
                tension: 40,
                useNativeDriver: Platform.OS !== 'web',
            }).start();
        },
    }), [index, winW, panels.length, translateX]);
    // Unified animation handler driven by index changes
    useEffect(() => {
        const toValue = -index * winW;
        if (lastInteraction.current === 'gesture') {
            Animated.spring(translateX, {
                toValue,
                friction: 8,
                tension: 40,
                useNativeDriver: Platform.OS !== 'web',
            }).start();
        }
        else {
            Animated.timing(translateX, {
                toValue,
                duration: 380,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: Platform.OS !== 'web',
            }).start();
        }
        // Reset interaction type default
        lastInteraction.current = 'programmatic';
    }, [index, translateX, winW]);
    const isLast = index === panels.length - 1;
    const handleNext = () => {
        if (isLast)
            return;
        lastInteraction.current = 'programmatic';
        setIndex((v) => Math.min(panels.length - 1, v + 1));
    };
    const handleSkip = () => {
        lastInteraction.current = 'programmatic';
        onSkip();
    };
    const handleComplete = () => {
        onComplete();
    };
    return (_jsx(Modal, { visible: visible, animationType: "fade", transparent: false, statusBarTranslucent: true, onRequestClose: handleBackPress, children: _jsx(View, { style: [styles.backdrop, { backgroundColor: colors.background }], children: _jsxs(View, { style: [styles.shell, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }], children: [_jsx(Animated.View, { style: [styles.track, { width: winW * panels.length, transform: [{ translateX }] }], ...panResponder.panHandlers, children: panels.map((p) => (_jsxs(View, { style: [styles.panel, { width: winW }], children: [_jsx(View, { style: styles.illustrationWrap, children: p.render() }), _jsx(Text, { style: [styles.title, { color: colors.onSurface }], children: p.title }), p.key === 'modes' ? (_jsx(View, { style: { width: '100%', alignItems: 'center' }, children: _jsxs(View, { style: { width: '100%', maxWidth: 340, paddingHorizontal: 12 }, children: [_jsx(Text, { style: [styles.body, { color: colors.onSurfaceVariant, marginBottom: 20 }], children: "Tailor your notification experience. Select the perfect alert level for your reminders to ensure you stay focused without missing a beat." }), _jsxs(View, { style: { gap: 12, marginTop: 8 }, children: [_jsxs(View, { style: { backgroundColor: colors.surfaceVariant + '40', borderRadius: 12, padding: 16 }, children: [_jsx(Text, { style: { color: colors.onSurface, fontWeight: '700', fontSize: 15, marginBottom: 4 }, children: "Standard Mode" }), _jsx(Text, { style: { color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 18 }, children: "Regular notification alerts" })] }), _jsxs(View, { style: { backgroundColor: colors.surfaceVariant + '40', borderRadius: 12, padding: 16 }, children: [_jsx(Text, { style: { color: colors.onSurface, fontWeight: '700', fontSize: 15, marginBottom: 4 }, children: "Silent Mode" }), _jsx(Text, { style: { color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 18 }, children: "Gentle notifications without sound" })] }), _jsxs(View, { style: { backgroundColor: colors.surfaceVariant + '40', borderRadius: 12, padding: 16 }, children: [_jsx(Text, { style: { color: colors.onSurface, fontWeight: '700', fontSize: 15, marginBottom: 4 }, children: "Ringer Mode" }), _jsx(Text, { style: { color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 18 }, children: "Full-screen reminder with loud alert so you can't miss it" })] })] })] }) })) : p.key === 'flex' ? (_jsx(View, { style: { width: '100%', alignItems: 'center' }, children: _jsx(View, { style: { width: '100%', maxWidth: 340, paddingHorizontal: 12 }, children: _jsxs(Text, { style: [styles.body, { color: colors.onSurfaceVariant, textAlign: 'left', lineHeight: 22 }], children: ["Pause, repeat, and manage reminders exactly the way you need.", '\n\n', _jsx(Text, { style: { fontWeight: '700' }, children: "Pause" }), " \u2013 Pause daily reminders. Long-press the button to pause until a selected date. Auto-resumes later.", '\n\n', _jsx(Text, { style: { fontWeight: '700' }, children: "Repeat" }), " \u2013 Daily, Monthly, Yearly, or custom recurring schedules.", '\n\n', _jsx(Text, { style: { fontWeight: '700' }, children: "Occurrence" }), " \u2013 Optional setting to repeat reminders by count instead of an end date/time.", '\n\n', _jsx(Text, { style: { fontWeight: '700' }, children: "Multi-Select" }), " \u2013 Set reminders for multiple specific dates or weekdays at once."] }) }) })) : (_jsx(View, { style: { width: '100%', alignItems: 'center', paddingHorizontal: 12 }, children: _jsx(Text, { style: [styles.body, { color: colors.onSurfaceVariant }], children: p.body }) }))] }, p.key))) }), _jsxs(View, { style: styles.bottomSection, children: [_jsx(View, { style: styles.dots, children: panels.map((p, i) => (_jsx(View, { style: [
                                        styles.dot,
                                        {
                                            backgroundColor: i === index ? colors.primary : colors.outlineVariant,
                                            opacity: i === index ? 1 : 0.35,
                                            transform: [{ scale: i === index ? 1.1 : 1 }],
                                        },
                                    ] }, p.key))) }), isLast ? (_jsx(Pressable, { onPress: handleComplete, style: ({ pressed }) => [
                                    styles.getStarted,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: pressed ? 0.92 : 1,
                                    },
                                ], children: _jsx(Text, { style: [styles.getStartedText, { color: colors.onPrimary }], children: "Get Started" }) })) : (_jsxs(View, { style: styles.navigationRow, children: [_jsx(TouchableOpacity, { onPress: handleSkip, style: styles.navBtn, hitSlop: { top: 15, bottom: 15, left: 15, right: 15 }, children: _jsx(Text, { style: [styles.navText, { color: colors.onSurfaceVariant }], children: "Skip" }) }), _jsx(TouchableOpacity, { onPress: handleNext, style: styles.navBtn, hitSlop: { top: 15, bottom: 15, left: 15, right: 15 }, children: _jsx(Text, { style: [styles.navText, { color: colors.primary }], children: "Next" }) })] }))] })] }) }) }));
}
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
    },
    shell: {
        flex: 1,
        paddingHorizontal: 16,
    },
    track: {
        flexDirection: 'row',
        flex: 1,
    },
    panel: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    illustrationWrap: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
        maxHeight: 240,
        marginBottom: 24,
        flexShrink: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    body: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.9,
        maxWidth: 340,
    },
    bottomSection: {
        minHeight: 120,
        justifyContent: 'flex-end',
        paddingBottom: 24,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 8,
    },
    navigationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        height: 50,
    },
    navBtn: {
        paddingHorizontal: 8,
        minWidth: 60,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    navText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    getStarted: {
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginHorizontal: 'auto',
        maxWidth: 320,
        alignSelf: 'center',
    },
    getStartedText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
