import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import notifee from '@notifee/react-native';
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from 'react-native';
import { ReminderEngineProvider } from "@/hooks/reminder-engine";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/hooks/theme-provider";
import { useSettings } from '@/hooks/settings-store';
import { StatusBar } from "expo-status-bar";
import { setAlarmLaunchOrigin } from '../services/alarm-context';
import { ensureBaseChannels } from '@/services/channels';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function RootLayoutNav() {
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
  const router = useRouter();

  useEffect(() => {
    // This effect handles all notification-related app launching and routing.
    (async () => {
      try {
        const initial = await notifee.getInitialNotification();

        // App was cold-started by a full-screen intent (phone was locked)
        if (initial?.notification?.android?.fullScreenAction) {
          setAlarmLaunchOrigin('fullscreen');
          router.replace('/alarm');
          return;
        }

        // App was cold-started by user tapping the notification body (phone was unlocked)
        if (initial?.pressAction?.id === 'open_alarm') {
          setAlarmLaunchOrigin('bodytap');
          router.replace('/alarm');
          return;
        }
      } catch (e) { console.log('initial notif error', e); }
    })();

    // This handles taps on a notification body while the app is already open.
    const unsub = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        const { notification, pressAction } = detail || {};

        // User tapped the notification body
        if (type === notifee.EventType.PRESS && pressAction?.id === 'open_alarm') {
          setAlarmLaunchOrigin('inapp');
          router.push('/alarm');
          return;
        }

        // User tapped an action button
        if (type === notifee.EventType.ACTION_PRESS && notification && pressAction) {
          const reminderId = notification.data?.reminderId as string;
          if (!reminderId) return;

          // Always cancel the notification that was actioned
          await notifee.cancelNotification(notification.id!);

          if (pressAction.id === 'done') {
            const { markReminderDone } = require('@/services/reminder-scheduler');
            await markReminderDone(reminderId);
            return;
          }

          const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction.id);
          if (snoozeMatch) {
            const mins = parseInt(snoozeMatch[1], 10);
            const { rescheduleReminderById } = require('@/services/reminder-scheduler');
            await rescheduleReminderById(reminderId, mins);
          }
        }
      } catch (e) { console.log('fg notif error', e); }
    });

    return () => { try { unsub && unsub(); } catch {} };
  }, [router]);

  // Other setup effects
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    (async () => {
      try {
        await ensureBaseChannels();
      } catch {}
    })();
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
