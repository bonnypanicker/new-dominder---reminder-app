import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import notifee from '@notifee/react-native';
import { getAlarmLaunchOrigin, clearAlarmLaunchOrigin } from '../services/alarm-context';

export default function AlarmScreen() {
  const router = useRouter();
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Reminder');

  useEffect(() => {
    // optional: block back button to prevent revealing home
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const initial = await notifee.getInitialNotification();
        setReminderId(initial?.notification?.data?.reminderId ?? null);
        setTitle(initial?.notification?.title ?? 'Reminder');
      } catch (e) { console.log('Alarm init error', e); }
    })();
  }, []);

  const closePerOrigin = useCallback(async () => {
    const origin = getAlarmLaunchOrigin();
    clearAlarmLaunchOrigin();

    // Always cancel the specific alert before closing
    try {
      if (reminderId) await notifee.cancelNotification(reminderId);
    } catch {}

    // If the app was started only for this alarm (locked/closed), finish activity entirely
    if (origin === 'fullscreen' || origin === 'bodytap') {
      // Dismiss all nav and exit to avoid flashing home
      try { router.dismissAll?.(); } catch {}
      setTimeout(() => { try { BackHandler.exitApp(); } catch {} }, 10);
      return;
    }

    // In-app path (user tapped while app is already open): just go back
    try { router.back(); } catch {}
  }, [router]);

  const done = useCallback(async () => {
    try {
      if (reminderId) {
        const svc = require('../services/reminder-scheduler');
        await svc.markReminderDone(reminderId);
      }
    } catch (e) { console.log('done error', e); }
    await closePerOrigin();
  }, [reminderId, closePerOrigin]);

  const snooze = (m: number) => async () => {
    try {
      if (reminderId) {
        const svc = require('../services/reminder-scheduler');
        await svc.rescheduleReminderById(reminderId, m);
      }
    } catch (e) { console.log('snooze error', e); }
    await closePerOrigin();
  };

  return (
    <View style={{ flex:1, backgroundColor:'black', padding:24, justifyContent:'center' }}>
      <Text style={{ color:'white', fontSize:22, opacity:0.8, textAlign:'center' }}>Alarm</Text>
      <Text style={{ color:'white', fontSize:34, textAlign:'center', marginTop:8 }}>{title}</Text>

      <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center', marginTop:28 }}>
        {[5,10,15,30].map(m => (
          <Pressable key={m} onPress={snooze(m)}
            style={{ paddingVertical:14, paddingHorizontal:18, borderRadius:16, backgroundColor:'#222', margin:6 }}>
            <Text style={{ color:'white', fontSize:18 }}>Snooze {m}m</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={done} style={{ marginTop:24, padding:18, borderRadius:18, backgroundColor:'#2e7d32' }}>
        <Text style={{ color:'white', fontSize:20, fontWeight:'700', textAlign:'center' }}>Done</Text>
      </Pressable>
    </View>
  );
}