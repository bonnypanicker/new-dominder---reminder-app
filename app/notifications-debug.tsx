import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { notificationService } from '@/hooks/notification-service';
import { useThemeColors } from '@/hooks/theme-provider';

export default function NotificationsDebug() {
  const [init, setInit] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const run = async () => {
      try {
        setStatus('initializing');
        
        // Check permissions
        const permission = await notificationService.checkPermissions();
        setHasPermission(permission);
        
        if (!permission) {
          setErrors((prev) => [...prev, 'No notification permission. Requesting...']);
          const granted = await notificationService.requestPermissions();
          setHasPermission(granted);
          if (!granted) {
            setErrors((prev) => [...prev, 'Permission denied by user']);
            setStatus('permission-denied');
            return;
          }
        }
        
        const ok = await notificationService.initialize();
        setInit(ok);
        setStatus(ok ? 'initialized' : 'not-initialized');
        
        // Get scheduled notifications count
        const scheduled = await notificationService.getAllScheduledNotifications();
        setScheduledCount(scheduled.length);
      } catch (e: unknown) {
        setErrors((prev) => [...prev, String(e)]);
        setStatus('error');
      }
    };
    run();
  }, []);

  const refreshScheduled = async () => {
    try {
      const scheduled = await notificationService.getAllScheduledNotifications();
      setScheduledCount(scheduled.length);
      setStatus(`refreshed: ${scheduled.length} scheduled`);
    } catch (e: unknown) {
      setErrors((prev) => [...prev, `refresh error: ${String(e)}`]);
    }
  };

  const testImmediate = async () => {
    try {
      const now = new Date();
      const in10s = new Date(now.getTime() + 10_000);
      const id = await notificationService.scheduleNotification({
        id: 'debug-1',
        title: 'Debug Notification',
        description: 'Should fire in ~10 seconds',
        date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
        time: `${String(in10s.getHours()).padStart(2,'0')}:${String(in10s.getMinutes()).padStart(2,'0')}`,
        priority: 'medium',
        repeatType: 'none',
        isActive: true,
        isCompleted: false,
        isExpired: false,
        isPaused: false,
      } as any);
      setStatus(`scheduled:${id}`);
    } catch (e: unknown) {
      setErrors((prev) => [...prev, `schedule error: ${String(e)}`]);
    }
  };

  const testInfo = async () => {
    try {
      await notificationService.displayInfoNotification('Test Info', 'If you see this, channels work.');
    } catch (e: unknown) {
      setErrors((prev) => [...prev, `display error: ${String(e)}`]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} testID="notifications-debug">
      <Stack.Screen options={{ title: 'Notifications Debug' }} />
      <Text style={styles.h1}>Platform: {Platform.OS}</Text>
      <Text style={styles.text}>Init: {String(init)}</Text>
      <Text style={styles.text}>Permission: {String(hasPermission)}</Text>
      <Text style={styles.text}>Status: {status}</Text>
      <Text style={styles.text}>Scheduled: {scheduledCount}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={testImmediate} testID="btn-schedule-10s">
          <Text style={styles.btnText}>Schedule in 10s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={testInfo} testID="btn-info">
          <Text style={styles.btnText}>Show Info</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={refreshScheduled} testID="btn-refresh">
          <Text style={styles.btnText}>Refresh Count</Text>
        </TouchableOpacity>
      </View>
      {!!errors.length && (
        <View style={styles.errors} testID="errors">
          {errors.map((e, i) => (
            <Text key={i} style={styles.errorText}>• {e}</Text>
          ))}
        </View>
      )}
      <Text style={styles.note}>If nothing appears, verify app is a standalone build with Notifee installed and notification permissions granted in system settings. Also ensure battery optimizations are disabled for the app.</Text>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 12, backgroundColor: colors.background },
  h1: { fontSize: 18, fontWeight: '700' as const, color: colors.onSurface },
  text: { color: colors.onSurface },
  row: { flexDirection: 'row', gap: 12 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: colors.onPrimary, fontWeight: '600' as const },
  errors: { marginTop: 12, backgroundColor: colors.errorContainer, borderRadius: 8, padding: 12 },
  errorText: { color: colors.onErrorContainer },
  note: { marginTop: 16, color: colors.onSurfaceVariant },
});
