import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import notifee, { EventType } from '@notifee/react-native';
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, DeviceEventEmitter } from 'react-native';
import { ReminderEngineProvider } from "@/hooks/reminder-engine";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/hooks/theme-provider";
import { useSettings } from '@/hooks/settings-store';
import { StatusBar } from "expo-status-bar";
import { setAlarmLaunchOrigin } from '../services/alarm-context';
import { ensureBaseChannels } from '@/services/channels';

// Import your reminder store to get access to the functions
import { useReminderStore } from '@/hooks/reminder-store';

SplashScreen.preventAutoHideAsync();
const rootQueryClient = new QueryClient();

// 1. Define the new listener hook
const useAlarmListeners = () => {
  // Get the functions from your Zustand store
  const { markReminderDone, rescheduleReminderById } = useReminderStore();

  useEffect(() => {
    console.log('[useAlarmListeners] Setting up native alarm event listeners...');

    const doneSubscription = DeviceEventEmitter.addListener(
      'alarmDone',
      (event: { reminderId: string }) => {
        console.log('Native alarm DONE event received for:', event.reminderId);
        if (event.reminderId) {
          markReminderDone(event.reminderId);
        }
      }
    );

    const snoozeSubscription = DeviceEventEmitter.addListener(
      'alarmSnooze',
      (event: { reminderId: string; snoozeMinutes: number }) => {
        console.log(`Native alarm SNOOZE event for ${event.reminderId}, minutes: ${event.snoozeMinutes}`);
        if (event.reminderId && event.snoozeMinutes) {
          rescheduleReminderById(event.reminderId, event.snoozeMinutes);
        }
      }
    );

    return () => {
      console.log('[useAlarmListeners] Cleaning up native alarm event listeners.');
      doneSubscription.remove();
      snoozeSubscription.remove();
    };
    // Add dependencies to re-run the effect if functions change
  }, [markReminderDone, rescheduleReminderById]);
};


function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
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
  const queryClient = useQueryClient();
  const router = useRouter();

  // 2. Call the new hook here
  useAlarmListeners();

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('remindersChanged', () => {
      console.log('[RootLayout] remindersChanged event received, invalidating queries.');
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    });
    return () => {
      subscription.remove();
    };
  }, [queryClient]);

  useEffect(() => {
    console.log('[RootLayout] Setting up notification handlers');

    // This listener for 'alarmAction' seems to be for a different, older implementation.
    // It can likely be removed once the new native screen is fully functional,
    // but we'll leave it for now to be safe.
    const alarmActionListener = DeviceEventEmitter.addListener('alarmAction', async (data) => {
      console.log('[RootLayout] Received legacy alarmAction event:', data);
      const { action, reminderId, snoozeMinutes } = data;

      if (action === 'snooze' && reminderId) {
        const { rescheduleReminderById } = require('@/services/reminder-scheduler');
        await rescheduleReminderById(reminderId, snoozeMinutes || 10);
      } else if (action === 'done' && reminderId) {
        const { markReminderDone } = require('@/services/reminder-scheduler');
        await markReminderDone(reminderId);
      }
    });

    (async () => {
      try {
        const initial = await notifee.getInitialNotification();
        console.log('[RootLayout] Initial notification:', initial);

        if (initial?.notification) {
          const reminderId = initial.notification.data?.reminderId as string;
          const priority = initial.notification.data?.priority as string;

          if (initial.pressAction?.id === 'default' && priority !== 'high') {
            console.log('[RootLayout] Body tap detected for standard/silent');
            router.replace('/');
          }
        }
      } catch (e) {
        console.error('[RootLayout] Initial notification error:', e);
      }
    })();

    const unsub = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        const { notification, pressAction } = detail || {};
        console.log('[RootLayout] Foreground event:', { type, pressAction: pressAction?.id });

        if (type === EventType.PRESS && notification) {
          const reminderId = notification.data?.reminderId as string;
          const priority = notification.data?.priority as string;
          const title = notification.title;
          const isRinger = priority === 'high';

          if (pressAction?.id === 'open_alarm' && isRinger) {
            setAlarmLaunchOrigin('inapp');
            router.push(`/alarm?reminderId=${reminderId}&title=${encodeURIComponent(title || 'Reminder')}`);
            return;
          }

          if (pressAction?.id === 'default' && !isRinger) {
            router.push('/');
            return;
          }
        }

        if (type === EventType.ACTION_PRESS && notification && pressAction) {
          const reminderId = notification.data?.reminderId as string;
          if (!reminderId) return;

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
      } catch (e) {
        console.error('[RootLayout] Foreground event error:', e);
      }
    });

    return () => {
      try {
        console.log('[RootLayout] Cleaning up notification handlers');
        alarmActionListener.remove();
        unsub && unsub();
      } catch {}
    };
  }, [router, queryClient]);

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
  return (
    <QueryClientProvider client={rootQueryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});