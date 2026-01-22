import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { notificationService } from '@/hooks/notification-service';
export default function NotificationsDebug() {
    const [init, setInit] = useState(false);
    const [status, setStatus] = useState('idle');
    const [errors, setErrors] = useState([]);
    const [hasPermission, setHasPermission] = useState(false);
    const [scheduledCount, setScheduledCount] = useState(0);
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
            }
            catch (e) {
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
        }
        catch (e) {
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
                date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
                time: `${String(in10s.getHours()).padStart(2, '0')}:${String(in10s.getMinutes()).padStart(2, '0')}`,
                priority: 'medium',
                repeatType: 'none',
                isActive: true,
                isCompleted: false,
                isExpired: false,
                isPaused: false,
            });
            setStatus(`scheduled:${id}`);
        }
        catch (e) {
            setErrors((prev) => [...prev, `schedule error: ${String(e)}`]);
        }
    };
    const testInfo = async () => {
        try {
            await notificationService.displayInfoNotification('Test Info', 'If you see this, channels work.');
        }
        catch (e) {
            setErrors((prev) => [...prev, `display error: ${String(e)}`]);
        }
    };
    return (_jsxs(ScrollView, { contentContainerStyle: styles.container, testID: "notifications-debug", children: [_jsx(Stack.Screen, { options: { title: 'Notifications Debug' } }), _jsxs(Text, { style: styles.h1, children: ["Platform: ", Platform.OS] }), _jsxs(Text, { children: ["Init: ", String(init)] }), _jsxs(Text, { children: ["Permission: ", String(hasPermission)] }), _jsxs(Text, { children: ["Status: ", status] }), _jsxs(Text, { children: ["Scheduled: ", scheduledCount] }), _jsxs(View, { style: styles.row, children: [_jsx(TouchableOpacity, { style: styles.btn, onPress: testImmediate, testID: "btn-schedule-10s", children: _jsx(Text, { style: styles.btnText, children: "Schedule in 10s" }) }), _jsx(TouchableOpacity, { style: styles.btn, onPress: testInfo, testID: "btn-info", children: _jsx(Text, { style: styles.btnText, children: "Show Info" }) })] }), _jsx(View, { style: styles.row, children: _jsx(TouchableOpacity, { style: styles.btn, onPress: refreshScheduled, testID: "btn-refresh", children: _jsx(Text, { style: styles.btnText, children: "Refresh Count" }) }) }), !!errors.length && (_jsx(View, { style: styles.errors, testID: "errors", children: errors.map((e, i) => (_jsxs(Text, { style: styles.errorText, children: ["\u2022 ", e] }, i))) })), _jsx(Text, { style: styles.note, children: "If nothing appears, verify app is a standalone build with Notifee installed and notification permissions granted in system settings. Also ensure battery optimizations are disabled for the app." })] }));
}
const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
    h1: { fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 12 },
    btn: { backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: '600' },
    errors: { marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12 },
    errorText: { color: '#991B1B' },
    note: { marginTop: 16, color: '#4B5563' },
});
