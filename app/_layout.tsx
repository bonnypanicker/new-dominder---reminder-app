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

import { useRouter } from 'expo-router';
import { setAlarmLaunchOrigin } from '../services/alarm-context';

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const initial = await notifee.getInitialNotification();

        // Cold start from full-screen (locked/killed): go straight to /alarm
        if (initial?.notification?.android?.fullScreenAction) {
          setAlarmLaunchOrigin('fullscreen');
          router.replace('/alarm');
          return;
        }

        // If app was launched/tapped from notification body in unlocked state
        if (initial?.pressAction?.id === 'open_alarm') {
          setAlarmLaunchOrigin('bodytap');
          router.replace('/alarm');
          return;
        }
      } catch (e) { console.log('initial notif error', e); }
    })();

    // Also handle foreground taps while app is running
    const unsub = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        if (type !== notifee.EventType.PRESS) return;
        if (detail?.pressAction?.id === 'open_alarm') {
          setAlarmLaunchOrigin('inapp');
          router.push('/alarm');
        }
      } catch (e) { console.log('fg notif error', e); }
    });

    return () => { try { unsub && unsub(); } catch {} };
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