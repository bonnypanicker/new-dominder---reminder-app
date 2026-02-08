import { useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Material3Colors } from '@/constants/colors';
import { useSettings } from '@/hooks/settings-store';
import * as SystemUI from 'expo-system-ui';
import { Platform, LayoutAnimation } from 'react-native';

export type ThemeColors = typeof Material3Colors.light;

export interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

export const [ThemeProvider, useTheme] = createContextHook<ThemeContextValue>(() => {
  const { data: settings } = useSettings();
  const isDark = Boolean(settings?.darkMode);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = isDark ? Material3Colors.dark : Material3Colors.light;
    return { colors, isDark };
  }, [isDark]);

  useEffect(() => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    } catch {}
  }, [isDark]);

  useEffect(() => {
    const bg = value.colors.background;
    try {
      if (Platform.OS !== 'web') {
        SystemUI.setBackgroundColorAsync(bg).catch(() => {});
      }
    } catch {}
  }, [value.colors.background]);

  return value;
});

export function useThemeColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}
