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

SplashScreen.preventAutoHideAsync();
const rootQueryClient = new QueryClient();

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
  const queryClient = useQueryClient();
  const router = useRouter();

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
    
    (async () => {
      try {
        const initial = await notifee.getInitialNotification();
        console.log('[RootLayout] Initial notification:', initial);

        if (initial?.notification) {
          const reminderId = initial.notification.data?.reminderId as string;
          const priority = initial.notification.data?.priority as string;
          const isFullScreenAlarm = initial.notification.data?.isFullScreenAlarm as string;
          const title = (initial.notification.data?.title as string) || initial.notification.title || 'Reminder';
          const route = initial.notification.data?.route as string;
          
          console.log('[RootLayout] Initial notification data:', { 
            reminderId, 
            priority, 
            isFullScreenAlarm,
            title,
            route,
            pressAction: initial.pressAction?.id,
            hasFullScreenAction: !!initial.notification.android?.fullScreenAction
          });
          
          const isRinger = priority === 'high' || isFullScreenAlarm === 'true';
          
          if (isFullScreenAlarm === 'true' && (!initial.pressAction || initial.pressAction.id === 'alarm_fullscreen')) {
            console.log('[RootLayout] Full-screen alarm detected - app launched from locked screen');
            setAlarmLaunchOrigin('fullscreen');
            console.log('[RootLayout] Navigating to alarm screen');
            setTimeout(() => {
              router.replace(`/alarm?reminderId=${reminderId}&title=${encodeURIComponent(title)}`);
            }, 100);
            return;
          }

          if (initial.pressAction?.id === 'open_alarm' && isRinger) {
            console.log('[RootLayout] Body tap detected for ringer');
            setAlarmLaunchOrigin('bodytap');
            setTimeout(() => {
              router.replace(`/alarm?reminderId=${reminderId}&title=${encodeURIComponent(title)}`);
            }, 100);
            return;
          }
          
          if (initial.pressAction?.id === 'default' || (!isRinger && initial.pressAction)) {
            console.log('[RootLayout] Body tap detected for standard/silent');
            router.replace('/');
            return;
          }
          
          if (route === 'alarm' && isRinger) {
            console.log('[RootLayout] Routing to alarm screen based on route data');
            setAlarmLaunchOrigin('fullscreen');
            setTimeout(() => {
              router.replace(`/alarm?reminderId=${reminderId}&title=${encodeURIComponent(title)}`);
            }, 100);
            return;
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
          
          console.log('[RootLayout] Notification pressed:', { reminderId, priority, isRinger });
          
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
          console.log('[RootLayout] Action pressed:', { action: pressAction.id, reminderId });
          
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
        unsub && unsub(); 
      } catch {} 
    };
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
    <QueryClientProvider client={rootQueryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
