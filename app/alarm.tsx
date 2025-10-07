import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import notifee from '@notifee/react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useReminders, useUpdateReminder } from '@/hooks/reminder-store';
import { Reminder } from '@/types/reminder';

export default function AlarmScreen() {
  const router = useRouter();
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  const { data: reminders = [] } = useReminders();
  const { mutate: updateReminder } = useUpdateReminder();

  const [reminder, setReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    // Disable hardware back button on the alarm screen
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (reminders.length > 0 && reminderId) {
      const found = reminders.find(r => r.id === reminderId);
      setReminder(found || null);
    }
  }, [reminders, reminderId]);

  const handleDismiss = useCallback(async () => {
    try {
      // It's safer to cancel all notifications as we might not know the specific ID
      // that triggered the full-screen intent, especially on older Android versions.
      await notifee.cancelAllNotifications();
    } catch (e) {
      console.error('Error cancelling notifications:', e);
    }
    // Navigate back or to home screen
    if (router.canGoBack()) {
      router.back();
    } else {
      BackHandler.exitApp();
    }
  }, [router]);

  const done = useCallback(async () => {
    if (reminder) {
      updateReminder({ ...reminder, isCompleted: true, snoozeUntil: undefined });
    }
    await handleDismiss();
  }, [reminder, updateReminder, handleDismiss]);

  const snooze = useCallback(async (minutes: number) => {
    if (reminder) {
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      updateReminder({ ...reminder, snoozeUntil });
    }
    await handleDismiss();
  }, [reminder, updateReminder, handleDismiss]);

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1B1F', padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: 'white', fontSize: 22, opacity: 0.8, textAlign: 'center' }}>Alarm</Text>
      <Text style={{ color: 'white', fontSize: 34, textAlign: 'center', marginTop: 8, fontWeight: 'bold' }}>
        {reminder?.title ?? 'Reminder'}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 48 }}>
        {[5, 10, 15, 30].map(m => (
          <Pressable key={m} onPress={() => snooze(m)}
            style={{ paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#4A4458', margin: 6 }}>
            <Text style={{ color: 'white', fontSize: 18 }}>Snooze {m}m</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={done} style={{ marginTop: 24, padding: 18, borderRadius: 18, backgroundColor: '#6750A4' }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>Done</Text>
      </Pressable>
    </View>
  );
}
