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
    let hasHandledInitial = false;

    // Handle both foreground and initial notification (when app opens from notification)
    const checkInitialNotification = async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification && !hasHandledInitial) {
          hasHandledInitial = true;
          const { notification, pressAction } = initialNotification;
          console.log('[Dominder-Debug] App opened from notification:', notification?.data?.reminderId, 'pressAction:', pressAction?.id, 'priority:', notification?.data?.priority);
          
          if (notification?.data?.reminderId) {
            const reminderId = notification.data.reminderId;
            const priority = notification.data.priority;
            
            // Only open alarm screen for "ringer" mode (high priority) reminders
            if (priority === 'high') {
              console.log('[Dominder-Debug] Opening alarm screen from initial notification (ringer mode)');
              // Use multiple attempts to ensure router is ready
              const attemptNavigation = (attempts = 0) => {
                if (attempts > 10) {
                  console.error('[Dominder-Debug] Failed to navigate to alarm screen after 10 attempts');
                  return;
                }
                try {
                  router.replace(`/alarm?reminderId=${reminderId}&fromNotif=1`);
                  console.log('[Dominder-Debug] Successfully navigated to alarm screen');
                } catch {
                  console.log(`[Dominder-Debug] Navigation attempt ${attempts + 1} failed, retrying...`);
                  setTimeout(() => attemptNavigation(attempts + 1), 200);
                }
              };
              setTimeout(() => attemptNavigation(), 300);
            } else {
              console.log('[Dominder-Debug] Standard/silent notification opened app, staying on home screen');
            }
          }
        }
      } catch (error) {
        console.error('[Dominder-Debug] Error checking initial notification:', error);
      }
    };

    // Check immediately and after delays to catch late-arriving notifications
    checkInitialNotification();
    const delayedCheck1 = setTimeout(checkInitialNotification, 500);
    const delayedCheck2 = setTimeout(checkInitialNotification, 1000);

    // Handle foreground events
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('[Dominder-Debug] Foreground event:', type, 'pressAction:', detail?.pressAction?.id);

      if (type === EventType.DELIVERED) {
        const { notification } = detail;
        if (notification?.data?.priority === 'high' && notification.id) {
          // This notification has a fullScreenAction. We need to cancel it and replace it with one that doesn't.
          await notifee.cancelNotification(notification.id);

          const newNotification = {
            ...notification,
            android: {
              ...notification.android,
              fullScreenAction: undefined,
            },
          };
          await notifee.displayNotification(newNotification);
        }
      } else if (type === EventType.PRESS) {
        const { notification } = detail;
        
        if (notification?.data?.reminderId) {
          const reminderId = notification.data.reminderId;
          const priority = notification.data.priority;
          
          // Only open alarm screen for "ringer" mode (high priority) reminders
          if (priority === 'high') {
            console.log('[Dominder-Debug] Opening alarm screen from foreground notification press (ringer mode)');
            router.replace(`/alarm?reminderId=${reminderId}&fromNotif=1&fromForeground=1`);
          } else {
            console.log('[Dominder-Debug] Standard/silent notification pressed, staying on current screen');
          }
        }
      }
    });

    const setupNotifee = async () => {
      await ensureBaseChannels();
      await requestInteractive();
    };

    setupNotifee();

    return () => {
      clearTimeout(delayedCheck1);
      clearTimeout(delayedCheck2);
      unsubscribe();
    };
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