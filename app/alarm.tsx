import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import notifee from '@notifee/react-native';
import { Material3Colors } from '@/constants/colors';
import { BellRing, Snooze, CheckCircle } from 'lucide-react-native';
import { rescheduleReminderById } from '@/services/reminder-scheduler';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AlarmScreen() {
  const { reminderId, title } = useLocalSearchParams();
  const [isHandlingAction, setIsHandlingAction] = useState(false);

  useEffect(() => {
    // Prevent going back from the alarm screen
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );
    return () => backHandler.remove();
  }, []);

  const handleDone = async () => {
    if (isHandlingAction) return;
    setIsHandlingAction(true);
    try {
      if (reminderId) {
        const stored = await AsyncStorage.getItem('dominder_reminders');
        const list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((r: any) => r.id === reminderId);
        if (idx !== -1) {
          const reminder = list[idx];
          if (reminder.repeatType === 'none') {
            list[idx] = { ...reminder, isCompleted: true, snoozeUntil: undefined, notificationId: undefined };
          } else {
            // For repeating reminders, just clear snooze and notification ID
            list[idx] = { ...reminder, snoozeUntil: undefined, notificationId: undefined };
          }
          await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
        }
      }
      await notifee.cancelAllNotifications();
      if (Platform.OS === 'android' && typeof notifee.cancelDisplayedNotifications === 'function') {
        await notifee.cancelDisplayedNotifications();
      }
      router.replace('/'); // Go back to home screen
    } catch (error) {
      console.error('Failed to handle done action:', error);
    } finally {
      setIsHandlingAction(false);
    }
  };

  const handleSnooze = async (minutes: number) => {
    if (isHandlingAction) return;
    setIsHandlingAction(true);
    try {
      if (reminderId) {
        await rescheduleReminderById(reminderId as string, minutes);
      }
      await notifee.cancelAllNotifications();
      if (Platform.OS === 'android' && typeof notifee.cancelDisplayedNotifications === 'function') {
        await notifee.cancelDisplayedNotifications();
      }
      router.replace('/'); // Go back to home screen
    } catch (error) {
      console.error('Failed to handle snooze action:', error);
    } finally {
      setIsHandlingAction(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <BellRing size={80} color={Material3Colors.light.primary} style={styles.icon} />
        <Text style={styles.title}>Reminder!</Text>
        <Text style={styles.reminderTitle}>{title}</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.doneButton, isHandlingAction && styles.buttonDisabled]}
            onPress={handleDone}
            disabled={isHandlingAction}
          >
            <CheckCircle size={24} color={Material3Colors.light.onPrimary} />
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>

          <View style={styles.snoozeOptions}>
            {[5, 10, 15, 30].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[styles.snoozeButton, isHandlingAction && styles.buttonDisabled]}
                onPress={() => handleSnooze(minutes)}
                disabled={isHandlingAction}
              >
                <Snooze size={20} color={Material3Colors.light.primary} />
                <Text style={styles.snoozeButtonText}>{minutes}m</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Material3Colors.light.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Material3Colors.light.onBackground,
    marginBottom: 10,
  },
  reminderTitle: {
    fontSize: 24,
    color: Material3Colors.light.onBackground,
    textAlign: 'center',
    marginBottom: 50,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 20,
    width: '80%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  doneButton: {
    backgroundColor: Material3Colors.light.primary,
  },
  buttonText: {
    color: Material3Colors.light.onPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  snoozeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
  },
  snoozeButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Material3Colors.light.outline,
  },
  snoozeButtonText: {
    color: Material3Colors.light.onSurface,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
  },
});
