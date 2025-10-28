import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Modal, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';
import { Material3Colors } from '@/constants/colors';

interface ToastProps {
  message: string;
  visible: boolean;
  duration?: number;
  onHide?: () => void;
  type?: 'info' | 'error' | 'success';
}

export default function Toast({ message, visible, duration = 3000, onHide, type = 'info' }: ToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-100);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log('[Toast] show');
      
      // Use requestAnimationFrame to ensure the modal is rendered before showing
      requestAnimationFrame(() => {
        // Add platform-specific delay for Android
        const delay = Platform.OS === 'android' ? 50 : 100;
        setTimeout(() => {
          setIsReady(true);
          
          opacity.value = withTiming(1, { duration: 300 });
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
        }, delay);
      });

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [visible, duration]);

  const hideToast = () => {
    console.log('[Toast] hide');
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(-100, { duration: 200 }, () => {
      runOnJS(() => onHide?.())();
    });
  };

  const backgroundColor = type === 'error' 
    ? Material3Colors.light.errorContainer
    : type === 'success'
    ? Material3Colors.light.primaryContainer
    : Material3Colors.light.surfaceVariant;

  const textColor = type === 'error'
    ? Material3Colors.light.onErrorContainer
    : type === 'success'
    ? Material3Colors.light.onPrimaryContainer
    : Material3Colors.light.onSurfaceVariant;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: isReady ? opacity.value : 0,
      transform: [{ translateY: translateY.value }],
      backgroundColor,
      ...(Platform.OS === 'android' && {
        elevation: isReady ? 24 : 0,
      })
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hideToast}
      onShow={() => setIsReady(true)}
    >
      <View style={styles.modalOverlay} pointerEvents="none" testID="toast-overlay">
        <Animated.View
          style={[styles.container, animatedStyle]}
          pointerEvents="none"
          testID="toast"
        >
          <Text style={[styles.message, { color: textColor }]}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 24,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    zIndex: 2147483647,
    alignSelf: 'center',
    maxWidth: Dimensions.get('window').width - 40,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});