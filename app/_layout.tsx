import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import notifee, { EventType } from '@notifee/react-native';
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, DeviceEventEmitter, Platform, View } from 'react-native';
import { ReminderEngineProvider } from "@/hooks/reminder-engine";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/hooks/theme-provider";
import { useSettings } from '@/hooks/settings-store';
import { StatusBar } from "expo-status-bar";
import { setAlarmLaunchOrigin } from '../services/alarm-context';
import { ensureBaseChannels } from '@/services/channels';
import { useCompletedAlarmSync } from '../hooks/useCompletedAlarmSync';
import { missedAlarmService } from '../services/missed-alarm-service';

// Import the functions directly from reminder-scheduler
import { markReminderDone, rescheduleReminderById } from '@/services/reminder-scheduler';

SplashScreen.preventAutoHideAsync();
const rootQueryClient = new QueryClient();

// 1. Define the new listener hook
const useAlarmListeners = () => {
  useEffect(() => {
    console.log('[useAlarmListeners] Setting up native alarm event listeners...');

    const doneSubscription = DeviceEventEmitter.addListener(
      'alarmDone',
      (event: { reminderId: string }) => {
        console.log('Native alarm DONE event received for:', event.reminderId);
        if (event.reminderId) {
          // Native alarm DONE -> increment occurrence and schedule next
          markReminderDone(event.reminderId, true);
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
  }, []); // Empty deps since functions are imported directly
};


function RootLayoutNav() {
  const isIOS = Platform.OS === 'ios';
  return (
    <Stack screenOptions={{ ...(isIOS ? { headerBackTitle: "Back" } : {}) }}>
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

  // Add this to enable SharedPreferences polling for alarm actions
  useCompletedAlarmSync();

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
        // Legacy native alarm DONE -> increment occurrence and schedule next
        await markReminderDone(reminderId, true);
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

        // Handle midnight refresh trigger
        if (type === EventType.DELIVERED && notification?.data?.type === 'midnight-refresh') {
          console.log('[RootLayout] Midnight refresh trigger received');
          // Immediately cancel the trigger notification
          if (notification?.id) {
            try { await notifee.cancelNotification(notification.id); } catch { }
          }
          const { refreshDisplayedNotifications, scheduleMidnightRefresh } = require('../services/notification-refresh-service');
          // Trigger pending check to catch any missed ringers at midnight
          const { checkAndTriggerPendingNotifications } = require('../services/startup-notification-check');
          await checkAndTriggerPendingNotifications();

          await refreshDisplayedNotifications();
          await scheduleMidnightRefresh(); // Schedule next midnight refresh
          return;
        }

        // Handle notification delivered events for automatic rescheduling (foreground)
        if (type === EventType.DELIVERED) {
          if (!notification || !notification.data) return;

          const reminderId = notification.data.reminderId;
          if (!reminderId) return;

          console.log(`[RootLayout] Foreground notification delivered for reminder ${reminderId}`);

          // Get reminder and check if it's an "every" type that needs automatic rescheduling
          const reminderService = require('../services/reminder-service');
          const reminder = await reminderService.getReminder(reminderId);

          if (!reminder) {
            console.log(`[RootLayout] Reminder ${reminderId} not found for delivered event`);
            return;
          }

          // Auto-reschedule all repeating reminder types (not just 'every')
          if (reminder.repeatType !== 'none') {
            console.log(`[RootLayout] Auto-rescheduling '${reminder.repeatType}' reminder ${reminderId} (foreground)`);

            // Increment occurrence count on delivery
            const occurred = reminder.occurrenceCount ?? 0;
            const nextOccurCount = occurred + 1;
            const forCalc = { ...reminder, occurrenceCount: nextOccurCount };
            
            console.log(`[RootLayout] Occurrence count: ${occurred} -> ${nextOccurCount}, untilType: ${reminder.untilType}, untilCount: ${reminder.untilCount}`);

            const reminderUtils = require('../services/reminder-utils');
            const nextDate = reminderUtils.calculateNextReminderDate(forCalc, new Date());

            if (nextDate) {
              // Update the reminder with the next occurrence and keep it active
              const updatedReminder = {
                ...forCalc,
                nextReminderDate: nextDate.toISOString(),
                lastTriggeredAt: new Date().toISOString(),
                snoozeUntil: undefined,
                wasSnoozed: undefined,
                isActive: true,
                isCompleted: false,
                isPaused: false,
                isExpired: false,
              };

              await reminderService.updateReminder(updatedReminder);

              // Schedule the next notification
              const notificationService = require('../hooks/notification-service');
              await notificationService.scheduleReminderByModel(updatedReminder);

              console.log(`[RootLayout] Scheduled next occurrence for ${reminderId} at ${nextDate.toISOString()} (foreground)`);
            } else {
              // No next occurrence (likely due to Until constraints).
              // This is the FINAL occurrence - mark as completed after user action.
              // But we need to persist the incremented count now.
              console.log(`[RootLayout] Final occurrence reached for ${reminderId} (foreground); count=${nextOccurCount}`);
              
              // Create a history item for this final occurrence
              const historyItem = {
                ...reminder,
                id: `${reminderId}_${Date.now()}_hist`,
                parentId: reminderId,
                isCompleted: true,
                isActive: false,
                repeatType: 'none',
                snoozeUntil: undefined,
                wasSnoozed: undefined,
                lastTriggeredAt: reminder.nextReminderDate || new Date().toISOString(),
                createdAt: new Date().toISOString(),
                nextReminderDate: undefined,
                notificationId: undefined
              };
              await reminderService.addReminder(historyItem);
              console.log(`[RootLayout] Created history item for final occurrence: ${historyItem.id}`);
              
              // Mark the main reminder as completed
              const finalOccurrenceState = {
                ...forCalc,
                nextReminderDate: undefined,
                lastTriggeredAt: new Date().toISOString(),
                snoozeUntil: undefined,
                wasSnoozed: undefined,
                isActive: false,
                isCompleted: true,
                isPaused: false,
              };
              await reminderService.updateReminder(finalOccurrenceState);
              console.log(`[RootLayout] Marked reminder ${reminderId} as completed (final occurrence)`);
            }
          }
          return;
        }

        if (type === EventType.PRESS && notification) {
          const reminderId = notification.data?.reminderId as string;
          const priority = notification.data?.priority as string;
          const title = notification.title;
          const isRinger = priority === 'high';

          if (pressAction?.id === 'open_alarm' && isRinger) {
            setAlarmLaunchOrigin('inapp');
            router.push(`/alarm?reminderId=${reminderId}&title=${encodeURIComponent(title || 'Reminder')}` as any);
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
            // Foreground notifee action DONE -> do not increment (already counted on delivery)
            await markReminderDone(reminderId, false);
            return;
          }

          // Handle dismiss action from missed notification (for "once" reminders only)
          if (pressAction.id === 'dismiss_missed') {
            console.log('[RootLayout] Dismiss missed reminder:', reminderId);
            const reminderService = require('../services/reminder-service');
            // Permanently delete the reminder (not soft delete - don't show in deleted page)
            await reminderService.permanentlyDeleteReminder(reminderId);
            console.log('[RootLayout] Reminder permanently deleted:', reminderId);
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
      } catch { }
    };
  }, [router, queryClient]);

  // Initialize missed alarm service
  useEffect(() => {
    console.log('[RootLayout] Initializing missed alarm service');
    missedAlarmService.initialize();

    return () => {
      missedAlarmService.cleanup();
    };
  }, []);

  // Initialize notification settings for native code
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const settingsStr = await AsyncStorage.getItem('dominder_settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          const { NativeModules } = require('react-native');
          const { AlarmModule } = NativeModules;
          if (AlarmModule?.saveNotificationSettings) {
            await AlarmModule.saveNotificationSettings(
              settings.soundEnabled ?? true,
              settings.vibrationEnabled ?? true,
              settings.ringerVolume ?? 40
            );
            console.log('[RootLayout] Initialized notification settings in native');
          }
        }
      } catch (e) {
        console.log('[RootLayout] Error initializing notification settings:', e);
      }
    })();
  }, []);

  // Other setup effects
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    (async () => {
      try {
        console.log('[AppStartup] Initializing notification services...');
        await ensureBaseChannels();
        // Check for pending/missed notifications on startup FIRST
        // This ensures overdue reminders are triggered immediately
        const { checkAndTriggerPendingNotifications } = require('../services/startup-notification-check');
        await checkAndTriggerPendingNotifications();
        console.log('[AppStartup] Pending notifications check completed');
        // Initialize midnight notification refresh service
        const { initializeNotificationRefresh } = require('../services/notification-refresh-service');
        await initializeNotificationRefresh();
        console.log('[AppStartup] Notification services initialized');
      } catch (error) {
        console.error('[AppStartup] Error initializing notification services:', error);
      }
    })();
    return () => clearTimeout(timer);
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (!isLoading) {
      await SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
          <ReminderEngineProvider>
            <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
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
