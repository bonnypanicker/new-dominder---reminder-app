import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import notifee from '@notifee/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { getAlarmLaunchOrigin, clearAlarmLaunchOrigin } from '../services/alarm-context';

export default function AlarmScreen() {
  useKeepAwake();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Reminder');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        console.log('[AlarmScreen] Initializing, params:', params);
        
        let foundReminderId: string | null = null;
        let foundTitle = 'Reminder';
        
        if (params.reminderId && typeof params.reminderId === 'string') {
          foundReminderId = params.reminderId;
          foundTitle = (params.title && typeof params.title === 'string') ? params.title : 'Reminder';
          console.log('[AlarmScreen] Got reminder from params:', foundReminderId);
        } else {
          const initial = await notifee.getInitialNotification();
          console.log('[AlarmScreen] Initial notification:', initial);
          
          if (initial?.notification?.data?.reminderId) {
            foundReminderId = initial.notification.data.reminderId as string;
            foundTitle = initial.notification.title ?? 'Reminder';
            console.log('[AlarmScreen] Got reminder from initial notification:', foundReminderId);
          }
        }
        
        setReminderId(foundReminderId);
        setTitle(foundTitle);
        console.log('[AlarmScreen] Set reminderId:', foundReminderId, 'title:', foundTitle);
      } catch (e) { 
        console.error('[AlarmScreen] Init error:', e); 
      }
    })();
  }, [params]);

  const closePerOrigin = useCallback(async () => {
    const origin = getAlarmLaunchOrigin();
    console.log('[AlarmScreen] Closing with origin:', origin);
    clearAlarmLaunchOrigin();

    try {
      if (reminderId) {
        await notifee.cancelNotification(`rem-${reminderId}`);
        console.log('[AlarmScreen] Cancelled notification for reminder:', reminderId);
      }
    } catch (e) {
      console.error('[AlarmScreen] Error cancelling notification:', e);
    }

    if (origin === 'fullscreen' || origin === 'bodytap') {
      console.log('[AlarmScreen] Exiting app for fullscreen/bodytap origin');
      try { router.dismissAll?.(); } catch {}
      setTimeout(() => { 
        try { BackHandler.exitApp(); } 
        catch (e) { console.error('[AlarmScreen] Exit error:', e); }
      }, 10);
      return;
    }

    console.log('[AlarmScreen] Going back for in-app origin');
    try { router.back(); } catch (e) { console.error('[AlarmScreen] Back error:', e); }
  }, [router, reminderId]);

  const done = useCallback(async () => {
    console.log('[AlarmScreen] Done pressed for reminder:', reminderId);
    try {
      if (reminderId) {
        const svc = require('../services/reminder-scheduler');
        await svc.markReminderDone(reminderId);
      }
    } catch (e) { 
      console.error('[AlarmScreen] Done error:', e); 
    }
    await closePerOrigin();
  }, [reminderId, closePerOrigin]);

  const snooze = (m: number) => async () => {
    console.log('[AlarmScreen] Snooze pressed for', m, 'minutes, reminder:', reminderId);
    try {
      if (reminderId) {
        const svc = require('../services/reminder-scheduler');
        await svc.rescheduleReminderById(reminderId, m);
      }
    } catch (e) { 
      console.error('[AlarmScreen] Snooze error:', e); 
    }
    await closePerOrigin();
  };

  return (
    <View style={{ flex:1, backgroundColor:'black', padding:24, justifyContent:'center' }}>
      <Text style={{ color:'white', fontSize:22, opacity:0.8, textAlign:'center' }}>Alarm</Text>
      <Text style={{ color:'white', fontSize:34, textAlign:'center', marginTop:8 }}>{title}</Text>
      {reminderId && (
        <Text style={{ color:'#888', fontSize:12, textAlign:'center', marginTop:4 }}>ID: {reminderId}</Text>
      )}

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