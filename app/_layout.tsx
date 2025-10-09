import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import notifee, { EventType } from '@notifee/react-native';
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from 'react-native';
import { ReminderEngineProvider } from "@/hooks/reminder-engine";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/hooks/theme-provider";
import { useSettings } from '@/hooks/settings-store';
import { StatusBar } from "expo-status-bar";


import { requestInteractive } from '@/services/permission-gate';
import { ensureBaseChannels } from '@/services/channels';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  useEffect(() => {
    // Handle both foreground and initial notification (when app opens from notification)
    const checkInitialNotification = async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification) {
          const { notification, pressAction } = initialNotification;
          console.log('[Dominder-Debug] App opened from notification:', notification?.data?.reminderId, 'pressAction:', pressAction?.id);
          
          if (notification?.data?.reminderId) {
            const reminderId = notification.data.reminderId;
            
            // Open alarm screen for all notification presses (unless it's an action button)
            if (pressAction?.id === 'alarm' || pressAction?.id === 'default' || !pressAction?.id) {
              console.log('[Dominder-Debug] Opening alarm screen from initial notification');
              router.replace(`/alarm?reminderId=${reminderId}`);
            }
          }
        }
      } catch (error) {
        console.error('[Dominder-Debug] Error checking initial notification:', error);
      }
    };

    checkInitialNotification();

    // Handle foreground events
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      console.log('[Dominder-Debug] Foreground event:', type, 'pressAction:', detail?.pressAction?.id);
      
      if (type === EventType.PRESS) {
        const { notification, pressAction } = detail;
        
        if (notification?.data?.reminderId) {
          const reminderId = notification.data.reminderId;
          
          // Open alarm screen for all notification presses (unless it's an action button)
          if (pressAction?.id === 'alarm' || pressAction?.id === 'default' || !pressAction?.id) {
            console.log('[Dominder-Debug] Opening alarm screen from foreground notification press');
            router.push(`/alarm?reminderId=${reminderId}`);
          }
        }
      }
    });

    ensureBaseChannels();
    requestInteractive();

    return unsubscribe;
  }, []);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="settings/notifications" options={{ title: 'Notification Settings' }} />
      <Stack.Screen 
        name="create-reminder" 
        options={{ 
          presentation: "modal",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="alarm" 
        options={{ 
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen name="notifications-debug" options={{ title: 'Notifications Debug' }} />

    </Stack>
  );
}

function AppContent() {
  const { isLoading } = useSettings();

  const onLayoutRootView = React.useCallback(async () => {
    if (!isLoading) {
      await SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
          <ReminderEngineProvider>
            <StatusBar hidden={true} />
            <RootLayoutNav />
          </ReminderEngineProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Fallback to hide splash screen after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});