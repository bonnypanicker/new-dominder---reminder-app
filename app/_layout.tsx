import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import notifee, { EventType } from '@notifee/react-native';
import { Stack, router, useRootNavigationState, useRouter } from "expo-router";
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

function RootLayoutNav({ reminderId, priority }: { reminderId?: string, priority?: string }) {
  const router = useRouter();
  const isNavigationReady = useRootNavigationState()?.key !== undefined;

  useEffect(() => {
    if (isNavigationReady) {
      console.log(`[Dominder-Debug] App launched with props. Priority: ${priority}, Reminder ID: ${reminderId}`);
      if (priority === 'high' && reminderId) {
        console.log('[Dominder-Debug] High priority prop detected, navigating to alarm screen.');
        router.replace(`/alarm?reminderId=${reminderId}`);
      }
    }
  }, [isNavigationReady, router, reminderId, priority]);

  useEffect(() => {
    // This effect handles foreground events (e.g., user presses a notification while app is open)
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('[Dominder-Debug] Foreground event:', type, 'pressAction:', detail?.pressAction?.id);

      if (type === EventType.DELIVERED) {
        const { notification } = detail;
        if (notification?.data?.priority === 'high' && notification.id) {
          await notifee.cancelNotification(notification.id);
          const newNotification = { ...notification };
          delete newNotification.android?.fullScreenAction;
          await notifee.displayNotification(newNotification);
        }
      } else if (type === EventType.PRESS) {
        const { notification } = detail;
        const reminderId = notification?.data?.reminderId;
        const priority = notification?.data?.priority;

        if (priority === 'high' && reminderId) {
          console.log('[Dominder-Debug] High priority notification pressed in foreground, navigating to alarm screen.');
          router.push(`/alarm?reminderId=${reminderId}`);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);


  useEffect(() => {
    // This effect initializes app-wide services like channels and permissions
    const setupServices = async () => {
      await ensureBaseChannels();
      await requestInteractive();
    };
    setupServices();
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

function AppContent(props: { reminderId?: string, priority?: string }) {
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
            <RootLayoutNav {...props} />
          </ReminderEngineProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default function RootLayout(props: any) {
  // Fallback to hide splash screen after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent {...props} />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});