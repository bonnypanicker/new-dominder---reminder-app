import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function AlarmScreen() {
  const router = useRouter();
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Reminder');

  useEffect(() => {
    (async () => {
      try {
        const initial = await notifee.getInitialNotification();
        const data = initial?.notification?.data;
        setReminderId(data?.reminderId ?? null);
        setTitle(initial?.notification?.title ?? 'Reminder');
      } catch (e) { console.log('Alarm init error', e); }
    })();
  }, []);

  const done = useCallback(async () => {
    try {
      if (reminderId) {
        const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
        const list = JSON.parse(raw);
        const i = list.findIndex((r: any) => r.id === reminderId);
        if (i !== -1) list[i].isCompleted = true;
        await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
      }
      try { await notifee.cancelDisplayedNotifications(); } catch {}
    } finally {
      router.replace('/');
    }
  }, [reminderId, router]);

  const snooze = (m: number) => async () => {
    try {
      if (reminderId) {
        const svc = require('../services/reminder-scheduler');
        await svc.rescheduleReminderById(reminderId, m);
      }
      try { await notifee.cancelDisplayedNotifications(); } catch {}
    } finally {
      router.replace('/');
    }
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

      <Pressable onPress={done} style={{ marginTop:24, padding:18, borderRadius:18, backgroundColor:'#e53935' }}>
        <Text style={{ color:'white', fontSize:20, fontWeight:'700', textAlign:'center' }}>Done</Text>
      </Pressable>
    </View>
  );
}