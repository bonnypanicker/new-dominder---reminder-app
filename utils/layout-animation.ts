import { Platform, LayoutAnimation } from 'react-native';

/**
 * Configures layout animation for smooth transitions.
 * On web, this is a no-op since LayoutAnimation is not supported.
 * On native platforms, it enables smooth layout transitions.
 */
export const configureLayoutAnimation = () => {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
  // On web, do nothing - CSS transitions should handle animations
};