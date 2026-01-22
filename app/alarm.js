import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, BackHandler, NativeModules } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import notifee from '@notifee/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { getAlarmLaunchOrigin, clearAlarmLaunchOrigin } from '../services/alarm-context';
const { AlarmModule } = NativeModules;
export default function AlarmScreen() {
    useKeepAwake();
    const router = useRouter();
    const params = useLocalSearchParams();
    const [reminderId, setReminderId] = useState(null);
    const [title, setTitle] = useState('Reminder');
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, []);
    useEffect(() => {
        (async () => {
            try {
                console.log('[AlarmScreen] Initializing, params:', params);
                let foundReminderId = null;
                let foundTitle = 'Reminder';
                if (params.reminderId && typeof params.reminderId === 'string') {
                    foundReminderId = params.reminderId;
                    foundTitle = (params.title && typeof params.title === 'string') ? params.title : 'Reminder';
                    console.log('[AlarmScreen] Got reminder from params:', foundReminderId);
                }
                else {
                    const initial = await notifee.getInitialNotification();
                    console.log('[AlarmScreen] Initial notification:', initial);
                    if (initial?.notification?.data?.reminderId) {
                        foundReminderId = initial.notification.data.reminderId;
                        foundTitle = initial.notification.title ?? 'Reminder';
                        console.log('[AlarmScreen] Got reminder from initial notification:', foundReminderId);
                    }
                }
                setReminderId(foundReminderId);
                setTitle(foundTitle);
                console.log('[AlarmScreen] Set reminderId:', foundReminderId, 'title:', foundTitle);
            }
            catch (e) {
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
        }
        catch (e) {
            console.error('[AlarmScreen] Error cancelling notification:', e);
        }
        if (origin === 'fullscreen' || origin === 'bodytap') {
            console.log('[AlarmScreen] Exiting app for fullscreen/bodytap origin');
            try {
                router.dismissAll?.();
            }
            catch { }
            setTimeout(() => {
                try {
                    AlarmModule.finishAffinity();
                }
                catch (e) {
                    console.error('[AlarmScreen] Exit error:', e);
                }
            }, 10);
            return;
        }
        console.log('[AlarmScreen] Going back for in-app origin');
        try {
            router.back();
        }
        catch (e) {
            console.error('[AlarmScreen] Back error:', e);
        }
    }, [router, reminderId]);
    const done = useCallback(async () => {
        console.log('[AlarmScreen] Done pressed for reminder:', reminderId);
        try {
            if (reminderId) {
                const svc = require('../services/reminder-scheduler');
                // Native alarm UI -> increment occurrence and schedule next
                await svc.markReminderDone(reminderId, true);
            }
        }
        catch (e) {
            console.error('[AlarmScreen] Done error:', e);
        }
        await closePerOrigin();
    }, [reminderId, closePerOrigin]);
    const snooze = (m) => async () => {
        console.log('[AlarmScreen] Snooze pressed for', m, 'minutes, reminder:', reminderId);
        try {
            if (reminderId) {
                const svc = require('../services/reminder-scheduler');
                await svc.rescheduleReminderById(reminderId, m);
            }
        }
        catch (e) {
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
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(getCurrentTime());
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    return (_jsxs(View, { style: {
            flex: 1,
            backgroundColor: '#1C1B1F',
            paddingHorizontal: 24,
            paddingTop: 48,
            paddingBottom: 32
        }, children: [_jsx(View, { style: { alignItems: 'center', marginBottom: 16 }, children: _jsx(Text, { style: {
                        color: '#D0BCFF',
                        fontSize: 14,
                        fontWeight: '500',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase'
                    }, children: "Reminder" }) }), _jsx(View, { style: { alignItems: 'center', marginBottom: 48 }, children: _jsx(Text, { style: {
                        color: '#E6E1E5',
                        fontSize: 28,
                        fontWeight: '400',
                        textAlign: 'center',
                        lineHeight: 36
                    }, children: title }) }), _jsx(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 48 }, children: _jsx(Text, { style: {
                        color: '#D0BCFF',
                        fontSize: 72,
                        fontWeight: '300',
                        letterSpacing: -2
                    }, children: currentTime }) }), _jsxs(View, { style: { marginBottom: 24 }, children: [_jsx(Text, { style: {
                            color: '#CAC4D0',
                            fontSize: 12,
                            fontWeight: '500',
                            textAlign: 'center',
                            marginBottom: 16,
                            letterSpacing: 0.5
                        }, children: "SNOOZE FOR" }), _jsx(View, { style: { flexDirection: 'row', justifyContent: 'center', gap: 12 }, children: [5, 10, 15, 30].map(m => (_jsx(Pressable, { onPress: snooze(m), style: ({ pressed }) => ({
                                paddingVertical: 12,
                                paddingHorizontal: 20,
                                borderRadius: 20,
                                backgroundColor: pressed ? '#3E3742' : '#2B2930',
                                borderWidth: 1,
                                borderColor: '#49454F',
                                minWidth: 70,
                                alignItems: 'center'
                            }), children: _jsxs(Text, { style: {
                                    color: '#D0BCFF',
                                    fontSize: 14,
                                    fontWeight: '500'
                                }, children: [m, "m"] }) }, m))) })] }), _jsx(Pressable, { onPress: done, style: ({ pressed }) => ({
                    paddingVertical: 20,
                    borderRadius: 28,
                    backgroundColor: pressed ? '#7F56D9' : '#6750A4',
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4
                }), children: _jsx(Text, { style: {
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '600',
                        textAlign: 'center',
                        letterSpacing: 0.5
                    }, children: "Done" }) })] }));
}
