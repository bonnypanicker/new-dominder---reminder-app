import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReminders, useUpdateReminder } from '@/hooks/reminder-store';
import { AlarmClock, CheckCircle } from 'lucide-react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Audio } from 'expo-av';
import { calculateNextReminderDate } from '@/hooks/reminder-engine';
import { RINGER_SOUNDS, RingerSound } from '@/constants/ringerSounds';
import { useSettings } from '@/hooks/settings-store';

export default function AlarmScreen() {
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  const { data: reminders = [] } = useReminders();
  const { data: settings } = useSettings();
  const updateReminder = useUpdateReminder();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const reminder = reminders.find((r: any) => r.id === reminderId);

  const startAnimations = useCallback(() => {
    // Pulse animation for the alarm icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim, slideAnim, glowAnim]);

  const playAlarmSound = useCallback(async () => {
    if (Platform.OS === 'web' || !reminder) return;

    try {
      // For high priority reminders, use the sound from settings
      let selectedSound = 'default';
      if (reminder.priority === 'high' && settings?.highPriorityRingerSound) {
        selectedSound = settings.highPriorityRingerSound;
      } else if (reminder.ringerSound) {
        selectedSound = reminder.ringerSound;
      }
      
      const soundConfig = RINGER_SOUNDS.find((s: RingerSound) => s.id === selectedSound) || RINGER_SOUNDS[0];
      
      console.log('Playing alarm sound:', selectedSound, soundConfig.url);
      
      // Configure audio for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: soundConfig.url },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      setSound(newSound);
    } catch (error) {
      console.error('Failed to play alarm sound:', error);
    }
  }, [reminder, settings]);

  useEffect(() => {
    // Lock screen orientation to portrait
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(error => {
        console.error('Failed to lock screen orientation:', error);
      });
    }

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Start animations
    startAnimations();

    // Play alarm sound
    playAlarmSound();

    return () => {
      clearInterval(timeInterval);
      // Unlock screen orientation
      if (Platform.OS !== 'web') {
        ScreenOrientation.unlockAsync().catch(error => {
          console.error('Failed to unlock screen orientation:', error);
        });
      }
    };
  }, [startAnimations, playAlarmSound]);
  
  // Separate cleanup for sound to avoid dependency loop
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);



  const stopAlarmSound = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.error('Failed to stop alarm sound:', error);
      } finally {
        setSound(null);
      }
    }
  };

  const handleDone = async () => {
    await stopAlarmSound();
    if (reminder) {
      if (reminder.repeatType === 'none') {
        // For "Once" reminders, mark as completed
        updateReminder.mutate({ 
          ...reminder, 
          isCompleted: true, 
          lastTriggeredAt: new Date().toISOString(),
          snoozeUntil: undefined
        });
      } else {
        // For repeating reminders, calculate next occurrence and update
        const nextDate = calculateNextReminderDate(reminder, new Date());
        updateReminder.mutate({ 
          ...reminder, 
          lastTriggeredAt: new Date().toISOString(),
          nextReminderDate: nextDate?.toISOString(),
          snoozeUntil: undefined
        });
      }
    }
    router.back();
  };

  const handleSnooze = async (minutes: number) => {
    await stopAlarmSound();
    if (reminder) {
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      updateReminder.mutate({ 
        ...reminder, 
        snoozeUntil,
        lastTriggeredAt: new Date().toISOString()
      });
    }
    router.back();
  };

  const handleDismiss = async () => {
    await stopAlarmSound();
    router.back();
  };

  if (!reminder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Reminder not found</Text>
          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.15)'],
  });

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            styles.glowBackground,
            { backgroundColor: glowColor },
          ]}
        />
        
        <Animated.View
          style={[
            styles.content,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: slideAnim,
            },
          ]}
        >
          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Alarm Icon */}
          <Animated.View
            style={[
              styles.alarmIconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <AlarmClock size={100} color="#FFF" />
          </Animated.View>

          {/* Reminder Details */}
          <View style={styles.reminderContainer}>
            <Text style={styles.reminderTitle}>{reminder.title}</Text>
            {reminder.description && (
              <Text style={styles.reminderDescription}>
                {reminder.description}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Snooze Options */}
            <View style={styles.snoozeContainer}>
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={() => handleSnooze(5)}
              >
                <Text style={styles.snoozeButtonText}>5m</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={() => handleSnooze(10)}
              >
                <Text style={styles.snoozeButtonText}>10m</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={() => handleSnooze(15)}
              >
                <Text style={styles.snoozeButtonText}>15m</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={() => handleSnooze(30)}
              >
                <Text style={styles.snoozeButtonText}>30m</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={() => handleSnooze(60)}
              >
                <Text style={styles.snoozeButtonText}>1hr</Text>
              </TouchableOpacity>
            </View>

            {/* Main Actions */}
            <View style={styles.mainActionsContainer}>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
              >
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleDone}
              >
                <CheckCircle size={22} color="#000" />
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glowBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  timeContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  timeText: {
    fontSize: 64,
    fontWeight: '200',
    color: '#FFF',
    letterSpacing: -2,
  },
  dateText: {
    fontSize: 18,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 8,
  },
  alarmIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
    padding: 30,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  reminderContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reminderTitle: {
    fontSize: 26,
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  reminderDescription: {
    fontSize: 17,
    color: '#FFF',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  snoozeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 10,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  snoozeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 60,
  },
  snoozeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  mainActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  dismissButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
});