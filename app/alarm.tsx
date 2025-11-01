import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, BackHandler, NativeModules, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import notifee from '@notifee/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { getAlarmLaunchOrigin, clearAlarmLaunchOrigin } from '../services/alarm-context';
import { Bell, Clock, Check, Moon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as reminderScheduler from '../services/reminder-scheduler';

const { AlarmModule } = NativeModules;

export default function AlarmScreen() {
  useKeepAwake();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
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
        try { AlarmModule.finishAffinity(); } 
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
        await reminderScheduler.markReminderDone(reminderId);
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
        await reminderScheduler.rescheduleReminderById(reminderId, m);
      }
    } catch (e) { 
      console.error('[AlarmScreen] Snooze error:', e); 
    }
    await closePerOrigin();
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, pulseAnim]);

  return (
    <Animated.View style={{ 
      flex: 1, 
      backgroundColor: '#0B0E14',
      opacity: fadeAnim
    }}>
      {/* Background gradient effect */}
      <View style={{
        position: 'absolute',
        top: -100,
        left: -100,
        right: -100,
        height: 400,
        backgroundColor: '#6750A4',
        opacity: 0.12,
        borderRadius: 400,
      }} />
      <View style={{
        position: 'absolute',
        bottom: -150,
        left: -50,
        right: -50,
        height: 300,
        backgroundColor: '#D0BCFF',
        opacity: 0.08,
        borderRadius: 300,
      }} />

      <View style={{ 
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: Math.max(60, insets.top + 20),
        paddingBottom: Math.max(40, insets.bottom + 20)
      }}>
        {/* Header with icon */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Animated.View style={{ 
            transform: [{ scale: pulseAnim }],
            backgroundColor: '#2B2930',
            borderRadius: 32,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#49454F'
          }}>
            <Bell size={40} color="#D0BCFF" strokeWidth={1.5} />
          </Animated.View>
          <Text style={{ 
            color: '#CAC4D0', 
            fontSize: 13, 
            fontWeight: '500',
            letterSpacing: 1.2,
            textTransform: 'uppercase'
          }}>Reminder</Text>
        </View>

        {/* Reminder Title */}
        <View style={{ 
          alignItems: 'center', 
          marginBottom: 48,
          paddingHorizontal: 16
        }}>
          <Text style={{ 
            color: '#E6E1E5', 
            fontSize: 26, 
            fontWeight: '400',
            textAlign: 'center',
            lineHeight: 34,
            letterSpacing: 0.3
          }}>{title}</Text>
        </View>

        {/* Center Time Display with decorative elements */}
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          marginBottom: 56
        }}>
          <View style={{
            backgroundColor: '#1D1B20',
            borderRadius: 24,
            paddingVertical: 32,
            paddingHorizontal: 48,
            borderWidth: 1,
            borderColor: '#36343B',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 6
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Clock size={20} color="#938F99" strokeWidth={2} style={{ marginRight: 8 }} />
              <Text style={{ 
                color: '#938F99', 
                fontSize: 12, 
                fontWeight: '500',
                letterSpacing: 0.8,
                textTransform: 'uppercase'
              }}>Current Time</Text>
            </View>
            <Text style={{ 
              color: '#D0BCFF', 
              fontSize: 56, 
              fontWeight: '300',
              letterSpacing: -1,
              textAlign: 'center'
            }}>{currentTime}</Text>
          </View>
        </View>

        {/* Snooze Buttons */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Moon size={16} color="#938F99" strokeWidth={2} style={{ marginRight: 8 }} />
            <Text style={{ 
              color: '#938F99', 
              fontSize: 12, 
              fontWeight: '500',
              letterSpacing: 0.8,
              textTransform: 'uppercase'
            }}>Snooze For</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            {[5, 10, 15, 30].map(m => (
              <Pressable 
                key={m} 
                onPress={snooze(m)}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  paddingHorizontal: 22,
                  borderRadius: 24,
                  backgroundColor: pressed ? '#36343B' : '#2B2930',
                  borderWidth: 1.5,
                  borderColor: pressed ? '#6750A4' : '#49454F',
                  minWidth: 75,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: pressed ? 0.3 : 0.2,
                  shadowRadius: 4,
                  elevation: pressed ? 4 : 2,
                  transform: [{ scale: pressed ? 0.96 : 1 }]
                })}>
                <Text style={{ 
                  color: '#D0BCFF', 
                  fontSize: 15,
                  fontWeight: '600',
                  letterSpacing: 0.3
                }}>{m}</Text>
                <Text style={{ 
                  color: '#938F99', 
                  fontSize: 11,
                  fontWeight: '500',
                  marginTop: 2
                }}>min</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Done Button */}
        <Pressable 
          onPress={done} 
          style={({ pressed }) => ({
            paddingVertical: 22,
            borderRadius: 32,
            backgroundColor: pressed ? '#7F5DC0' : '#6750A4',
            elevation: 6,
            shadowColor: '#6750A4',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: pressed ? '#9378D9' : 'transparent',
            transform: [{ scale: pressed ? 0.98 : 1 }]
          })}>
          <Check size={22} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: 17, 
            fontWeight: '600', 
            letterSpacing: 0.6
          }}>Mark as Done</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}