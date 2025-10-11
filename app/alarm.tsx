import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import notifee from '@notifee/react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useReminders, useUpdateReminder } from '@/hooks/reminder-store';
import { Reminder } from '@/types/reminder';
import { calculateNextReminderDate } from '@/services/reminder-utils';

export default function AlarmScreen() {
  const router = useRouter();
  const { reminderId, fromNotif, fromForeground } = useLocalSearchParams<{ reminderId: string; fromNotif?: string, fromForeground?: string }>();
  const { data: reminders = [] } = useReminders();
  const { mutateAsync: updateReminder } = useUpdateReminder();

  const [reminder, setReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (reminders.length > 0 && reminderId) {
      const found = reminders.find(r => r.id === reminderId);
      setReminder(found || null);
    }
  }, [reminders, reminderId]);

  useEffect(() => {
    const cancelNotificationOnOpen = async () => {
      if (reminderId) {
        try {
          console.log(`[Dominder-Debug] Alarm screen opened for reminder ${reminderId}, cancelling notification`);
          const notificationId = `reminder_${reminderId}`;
          await notifee.cancelNotification(notificationId);
          
          const displayed = await notifee.getDisplayedNotifications();
          const targetNotification = displayed.find((n: any) => n.notification?.data?.reminderId === reminderId);
          if (targetNotification?.notification?.id) {
            await notifee.cancelNotification(targetNotification.notification.id);
            console.log(`[Dominder-Debug] Cancelled displayed notification ${targetNotification.notification.id}`);
          }
        } catch (e) {
          console.error('[Dominder-Debug] Error cancelling notification on alarm screen open:', e);
        }
      }
    };
    
    cancelNotificationOnOpen();
  }, [reminderId]);

  const handleDismiss = useCallback(async () => {
    try {
      console.log(`[Dominder-Debug] Dismissing alarm for reminder ${reminderId}`);
      const notificationId = `reminder_${reminderId}`;
      await notifee.cancelNotification(notificationId);
      
      const displayed = await notifee.getDisplayedNotifications();
      const targetNotification = displayed.find((n: any) => n.notification?.data?.reminderId === reminderId);
      if (targetNotification?.notification?.id) {
        await notifee.cancelNotification(targetNotification.notification.id);
        console.log(`[Dominder-Debug] Cancelled displayed notification ${targetNotification.notification.id}`);
      }
    } catch (e) {
      console.error('[Dominder-Debug] Error cancelling notifications:', e);
    }
    
    if (fromNotif === '1' && fromForeground !== '1') {
      BackHandler.exitApp();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [reminderId, router, fromNotif, fromForeground]);

  const done = useCallback(async () => {
    if (reminder) {
      console.log(`[Dominder-Debug] Marking reminder ${reminder.id} as done from alarm screen`);
      const now = new Date();
      
      if (reminder.repeatType === 'none') {
        await updateReminder({ 
          ...reminder, 
          isCompleted: true, 
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: now.toISOString()
        });
      } else {
        const nextDate = calculateNextReminderDate(reminder, now);
        console.log(`[Dominder-Debug] Updating repeating reminder ${reminder.id}, next date: ${nextDate?.toISOString()}`);
        await updateReminder({ 
          ...reminder, 
          lastTriggeredAt: now.toISOString(),
          nextReminderDate: nextDate ? nextDate.toISOString() : undefined,
          snoozeUntil: undefined,
          wasSnoozed: undefined
        });
      }
    }
    await handleDismiss();
  }, [reminder, updateReminder, handleDismiss]);

  const snooze = useCallback(async (minutes: number) => {
    if (reminder) {
      console.log(`[Dominder-Debug] Snoozing reminder ${reminder.id} for ${minutes} minutes from alarm screen, repeatType: ${reminder.repeatType}`);
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      const now = new Date();
      
      await updateReminder({ 
        ...reminder, 
        snoozeUntil,
        lastTriggeredAt: now.toISOString(),
        isExpired: false,
        wasSnoozed: true
      });
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
