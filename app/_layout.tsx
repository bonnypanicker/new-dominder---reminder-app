import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import notifee, { EventType } from '@notifee/react-native';
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { StyleSheet, DeviceEventEmitter, Platform, View, NativeModules, AppState, Appearance } from 'react-native';
import { ReminderEngineProvider } from "@/hooks/reminder-engine";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/hooks/theme-provider";
import { useSettings, useUpdateSettings } from '@/hooks/settings-store';
import RatingPrompt from "@/components/RatingPrompt";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { setAlarmLaunchOrigin } from '../services/alarm-context';
import { ensureBaseChannels } from '@/services/channels';
import { Material3Colors } from '@/constants/colors';
import { useCompletedAlarmSync } from '../hooks/useCompletedAlarmSync';
import { missedAlarmService } from '../services/missed-alarm-service';

// Import the functions directly from reminder-scheduler
import { markReminderDone, rescheduleReminderById, syncSnoozeFromNative } from '@/services/reminder-scheduler';

SplashScreen.preventAutoHideAsync();
const rootQueryClient = new QueryClient();

// 1. Define the new listener hook
const AlarmModuleRef = Platform.OS === 'android' ? NativeModules.AlarmModule : null;

const useAlarmListeners = () => {
  // Track processed events to prevent double handling
  const processedEventsRef = React.useRef(new Set<string>());

  useEffect(() => {
    console.log('[useAlarmListeners] Setting up native alarm event listeners...');

    const doneSubscription = DeviceEventEmitter.addListener(
      'alarmDone',
      async (event: { reminderId: string; triggerTime?: number }) => {
        console.log('[useAlarmListeners] Native alarm DONE event received for:', event.reminderId, 'triggerTime:', event.triggerTime);
        if (event.reminderId) {
          // Deduplication: prevent handling same event twice
          const eventKey = `done_${event.reminderId}_${event.triggerTime || 'now'}`;
          if (processedEventsRef.current.has(eventKey)) {
            console.log('[useAlarmListeners] Already processed DONE event for:', eventKey);
            return;
          }
          processedEventsRef.current.add(eventKey);

          // Clear SharedPreferences IMMEDIATELY to prevent useCompletedAlarmSync
          // from double-processing this same completion
          if (AlarmModuleRef?.clearCompletedAlarm) {
            try {
              await AlarmModuleRef.clearCompletedAlarm(event.reminderId);
              console.log('[useAlarmListeners] Cleared SharedPreferences for completed:', event.reminderId);
            } catch (e) {
              console.log('[useAlarmListeners] Error clearing completed alarm:', e);
            }
          }

          // Native alarm DONE -> schedule next occurrence
          // IMPORTANT: shouldIncrementOccurrence=false because native AlarmReceiver 
          // already incremented actualTriggerCount when the alarm fired.
          // We just need to record history and schedule the next occurrence.
          await markReminderDone(event.reminderId, false, event.triggerTime);
          console.log('[useAlarmListeners] markReminderDone completed for:', event.reminderId);
        }
      }
    );

    const snoozeSubscription = DeviceEventEmitter.addListener(
      'alarmSnooze',
      async (event: { reminderId: string; snoozeMinutes: number }) => {
        console.log(`[useAlarmListeners] Native alarm SNOOZE event for ${event.reminderId}, minutes: ${event.snoozeMinutes}`);
        if (event.reminderId && event.snoozeMinutes) {
          // Deduplication: prevent handling same event twice
          const eventKey = `snooze_${event.reminderId}_${Date.now()}`;
          processedEventsRef.current.add(eventKey);

          // Clear SharedPreferences IMMEDIATELY to prevent useCompletedAlarmSync
          // from double-processing this same snooze
          if (AlarmModuleRef?.clearSnoozedAlarm) {
            try {
              await AlarmModuleRef.clearSnoozedAlarm(event.reminderId);
              console.log('[useAlarmListeners] Cleared SharedPreferences for snoozed:', event.reminderId);
            } catch (e) {
              console.log('[useAlarmListeners] Error clearing snoozed alarm:', e);
            }
          }

          await syncSnoozeFromNative(event.reminderId, event.snoozeMinutes);
          console.log('[useAlarmListeners] syncSnoozeFromNative completed for:', event.reminderId);
        }
      }
    );

    // Cleanup old processed events periodically (prevent memory leak)
    const cleanupInterval = setInterval(() => {
      if (processedEventsRef.current.size > 100) {
        processedEventsRef.current.clear();
      }
    }, 60000);

    return () => {
      console.log('[useAlarmListeners] Cleaning up native alarm event listeners.');
      doneSubscription.remove();
      snoozeSubscription.remove();
      clearInterval(cleanupInterval);
    };
  }, []); // Empty deps since functions are imported directly
};


function RootLayoutNav() {
  const isIOS = Platform.OS === 'ios';
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        ...(isIOS ? { headerBackTitle: "Back" } : {}),
        // Paint every screen's native container with the app theme background.
        // Under Android edge-to-edge (targetSdk 36) the screen container spans the
        // full window and is what shows behind the transparent status bar, so this
        // is what makes the status-bar space blend with the app background and
        // follow the selected theme (same effect as the onboarding panel backdrop).
        contentStyle: { backgroundColor: colors.background },
      }}
    >
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

/**
 * Root container that paints the app theme background over the whole window.
 *
 * Mirrors the onboarding panel's full-bleed backdrop: because Android
 * edge-to-edge (targetSdk 36) lets the window extend behind the status bar, the
 * root view is the topmost surface the status-bar space can show. Giving it the
 * themed background keeps that space seamless in both light and dark themes.
 */
function ThemedRoot({ onLayout, children }: { onLayout?: () => void; children: React.ReactNode }) {
  const { colors, isDark } = useTheme();

  // React Navigation (expo-router) paints the navigation/screen containers with
  // its OWN theme, which defaults to DarkTheme ('rgb(1, 1, 1)' — near black) and
  // follows the *system* color scheme rather than the in-app theme setting. Under
  // edge-to-edge (targetSdk 36) that container is what shows behind the
  // transparent status bar, which is why the bar stayed black/opaque and ignored
  // the in-app light/dark switch. Feeding it the app's Material 3 palette makes
  // the status-bar space blend and follow the selected theme.
  const navigationTheme = React.useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.onSurface,
        border: colors.outlineVariant,
        notification: colors.error,
      },
    };
  }, [colors, isDark]);

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: colors.background }]}
      onLayout={onLayout}
    >
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const router = useRouter();

  // App usage tracking for rating prompt
  useEffect(() => {
    if (!settings) return;

    // Track app mounting as one open, then listen for background->active
    let isTrackingDoneForThisMount = false;
    if (!isTrackingDoneForThisMount) {
      updateSettings.mutate({ appOpensCount: (settings.appOpensCount || 0) + 1 });
      isTrackingDoneForThisMount = true;
    }

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateSettings.mutate({ appOpensCount: (settings.appOpensCount || 0) + 1 });
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [settings?.hasRatedApp]); // Use small dependency to avoid loops

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

          // CRITICAL: Never resurrect a deleted or completed reminder. A foreground
          // DELIVERED event can be queued/delivered AFTER the user swiped the card
          // to fully complete the series (or deleted it). Without this guard the
          // auto-reschedule below would flip isCompleted back to false, set
          // isActive: true, and schedule the next occurrence — making the card
          // reappear in Active and re-fire (the 'every X min' bug).
          if (reminder.isDeleted || reminder.isCompleted) {
            console.log(`[RootLayout] Reminder ${reminderId} is ${reminder.isDeleted ? 'deleted' : 'completed'} - skipping auto-reschedule and cancelling leftovers`);
            try {
              const notificationService = require('../hooks/notification-service');
              await notificationService.cancelAllNotificationsForReminder(reminderId);
            } catch (e) {
              console.log(`[RootLayout] Cleanup failed for ${reminderId}:`, e);
            }
            return;
          }

          // Auto-reschedule all repeating reminder types (not just 'every')
          if (reminder.repeatType !== 'none') {
            console.log(`[RootLayout] Auto-rescheduling '${reminder.repeatType}' reminder ${reminderId} (foreground)`);

            // Store the scheduled trigger time BEFORE updating nextReminderDate
            const triggeredAt = reminder.nextReminderDate || new Date().toISOString();

            // Increment occurrence count on delivery (but do not exceed untilCount)
            const occurred = reminder.occurrenceCount ?? 0;
            const hasCountCap = reminder.untilType === 'count' && typeof reminder.untilCount === 'number';

            let nextVal = occurred + 1;

            // Fix for Multi-Select + Every: Reset count if new day
            if (reminder.multiSelectEnabled && reminder.repeatType === 'every') {
              const lastTriggerStr = reminder.lastTriggeredAt;
              if (lastTriggerStr) {
                const lastD = new Date(lastTriggerStr);
                const currD = new Date(triggeredAt);
                const isSameDay = lastD.getFullYear() === currD.getFullYear() &&
                  lastD.getMonth() === currD.getMonth() &&
                  lastD.getDate() === currD.getDate();
                if (!isSameDay) {
                  console.log('[RootLayout] Multi-select new day delivery, resetting occurrence count to 1');
                  nextVal = 1;
                }
              } else {
                // First ever trigger? (lastTriggeredAt might be null or create date).
                // If null, nextVal=1 implies 1st. Safe.
              }
            }

            const nextOccurCount = hasCountCap && nextVal > (reminder.untilCount as number)
              ? (reminder.untilCount as number)
              : nextVal;
            const forCalc = { ...reminder, occurrenceCount: nextOccurCount };

            const reminderUtils = require('../services/reminder-utils');
            const nextDate = reminderUtils.calculateNextReminderDate(forCalc, new Date());

            // Re-check freshness immediately before writing: the user may have
            // swiped to complete (or deleted) the reminder while this handler was
            // awaiting. Writing the stale snapshot would overwrite the completion
            // and resurrect the series.
            const latest = await reminderService.getReminder(reminderId);
            if (!latest || latest.isDeleted || latest.isCompleted) {
              console.log(`[RootLayout] Reminder ${reminderId} was completed/deleted during delivery processing - aborting auto-reschedule`);
              try {
                const notificationService = require('../hooks/notification-service');
                await notificationService.cancelAllNotificationsForReminder(reminderId);
              } catch (e) {
                console.log(`[RootLayout] Cleanup failed for ${reminderId}:`, e);
              }
              return;
            }

            if (nextDate) {
              // Update the reminder with the next occurrence and keep it active
              const updatedReminder = {
                ...forCalc,
                nextReminderDate: nextDate.toISOString(),
                lastTriggeredAt: triggeredAt, // Use the scheduled time, not current time
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
              // Do NOT mark completed yet to avoid cancelling the just-delivered notification.
              // Persist occurrenceCount and lastTriggeredAt; leave notification visible for user action.
              const finalOccurrenceState = {
                ...forCalc,
                nextReminderDate: undefined,
                lastTriggeredAt: triggeredAt, // Use the scheduled time, not current time
                snoozeUntil: undefined,
                wasSnoozed: undefined,
                isActive: true,
                isCompleted: false,
                isPaused: false,
              };
              await reminderService.updateReminder(finalOccurrenceState);
              console.log(`[RootLayout] Final occurrence reached for ${reminderId} (foreground); left notification visible (no further scheduling)`);
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
            // Use trigger time from notification data if available to ensure accurate history
            const triggerTime = notification.data?.triggerTime;
            const doneTimestamp = triggerTime
              ? (typeof triggerTime === 'number' ? triggerTime : parseInt(triggerTime as string, 10))
              : undefined;
            await markReminderDone(reminderId, false, doneTimestamp);
            return;
          }

          // Handle delete action from missed notification
          if (pressAction.id === 'delete_missed') {
            console.log('[RootLayout] Delete missed reminder:', reminderId);
            const reminderService = require('../services/reminder-service');
            // Use standard service method which handles:
            // 1. Soft delete in storage
            // 2. Cancellation of all notifications (scheduled, displayed, missed, native)
            // 3. Emitting change events
            await reminderService.deleteReminder(reminderId);
            console.log('[RootLayout] Reminder moved to deleted:', reminderId);
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
              settings.vibrationEnabled ?? true
            );

            // Sync ringer volume
            if (AlarmModule.saveRingerVolume) {
              await AlarmModule.saveRingerVolume(settings.ringerVolume ?? 40);
            }

            console.log('[RootLayout] Initialized notification settings & volume in native');
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
    // Themed so the status-bar space blends during startup too (this renders
    // before ThemeProvider mounts, hence the direct Appearance lookup).
    const scheme = Appearance.getColorScheme();
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: scheme === 'dark'
            ? Material3Colors.dark.background
            : Material3Colors.light.background,
        }}
      />
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ThemedRoot onLayout={onLayoutRootView}>
          <ReminderEngineProvider>
            <DynamicStatusBar />
            <RootLayoutNav />
            <RatingPrompt />
          </ReminderEngineProvider>
        </ThemedRoot>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={rootQueryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

function DynamicStatusBar() {
  const { isDark } = useTheme();
  // Edge-to-edge is native-driven (RN 0.81 flag); only icon contrast is ours.
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
