import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Alert, Modal, TextInput, PanResponder, Animated, Dimensions, Easing, InteractionManager, Keyboard as RNKeyboard, LayoutAnimation, UIManager, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
const Plus = (props: any) => <Feather name="plus" {...props} />;
const Clock = (props: any) => <Feather name="clock" {...props} />;
const Settings = (props: any) => <Feather name="settings" {...props} />;
const PauseCircle = (props: any) => <Feather name="pause-circle" {...props} />;
const PlayCircle = (props: any) => <Feather name="play-circle" {...props} />;
const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;
const RotateCcw = (props: any) => <Feather name="rotate-ccw" {...props} />;
const AlertCircle = (props: any) => <Feather name="alert-circle" {...props} />;
const X = (props: any) => <Feather name="x" {...props} />;
const Square = (props: any) => <Feather name="square" {...props} />;
const CheckSquare = (props: any) => <Feather name="check-square" {...props} />;
const Repeat = (props: any) => <Feather name="repeat" {...props} />;
const Keyboard = (props: any) => <MaterialIcons name="keyboard" {...props} />;
import { router } from 'expo-router';
import { useReminders, useUpdateReminder, useAddReminder, useDeleteReminder, useBulkDeleteReminders, useBulkUpdateReminders } from '@/hooks/reminder-store';
import { useSettings } from '@/hooks/settings-store';
import { calculateNextReminderDate } from '@/services/reminder-utils';
import { CHANNEL_IDS } from '@/services/channels';
import { PRIORITY_COLORS } from '@/constants/reminders';
import { Material3Colors } from '@/constants/colors';
import { Reminder, Priority, RepeatType, EveryUnit } from '@/types/reminder';
import PrioritySelector from '@/components/PrioritySelector';
import CustomizePanel from '@/components/CustomizePanel';
import Toast from '@/components/Toast';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper to configure smooth layout animation
const configureLayoutAnimation = () => {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      200,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity
    )
  );
};

const calculateDefaultTime = () => {
  const now = new Date();
  const currentMinutes = now.getMinutes();
  
  // Round up to next multiple of 10 (minimum 10 if less than 10)
  let roundedMinutes = currentMinutes <= 10 ? 10 : Math.ceil(currentMinutes / 10) * 10;
  
  // Add 10 to the result
  roundedMinutes += 10;
  
  // Handle minute overflow
  let finalHours = now.getHours();
  let finalMinutes = roundedMinutes;
  
  if (finalMinutes >= 60) {
    finalHours += Math.floor(finalMinutes / 60);
    finalMinutes = finalMinutes % 60;
  }
  
  // Handle hour overflow (24-hour format)
  if (finalHours >= 24) {
    finalHours = finalHours % 24;
  }
  
  const hour12 = finalHours % 12 === 0 ? 12 : finalHours % 12;
  const isAM = finalHours < 12;
  
  return {
    time: `${hour12.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`,
    isAM
  };
};

export default function HomeScreen() {
  const { data: reminders = [], isLoading } = useReminders();
  const { data: settings } = useSettings();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const bulkDeleteReminders = useBulkDeleteReminders();
  const bulkUpdateReminders = useBulkUpdateReminders();
  const [showCreatePopup, setShowCreatePopup] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'expired'>('active');
  const tabScrollRef = useRef<ScrollView>(null);
  const contentScrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'info' | 'error' | 'success'>('info');
  const showToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    const defaultTime = calculateDefaultTime();
    return defaultTime.time;
  });
  const [isAM, setIsAM] = useState<boolean>(() => {
    const defaultTime = calculateDefaultTime();
    return defaultTime.isAM;
  });
  const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [everyValue, setEveryValue] = useState<number>(1);
  const [everyUnit, setEveryUnit] = useState<EveryUnit>('hours');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  const [selectionTab, setSelectionTab] = useState<'active' | 'completed' | 'expired' | null>(null);

  const addReminder = useAddReminder();

  const scrollToTab = useCallback((tab: 'active' | 'completed' | 'expired') => {
    setActiveTab(tab);
    const screenWidth = Dimensions.get('window').width;
    
    // Auto-scroll tab headers
    const tabWidth = 140; // Approximate width of each tab
    let tabScrollX = 0;
    
    switch (tab) {
      case 'active':
        tabScrollX = 0; // Left align for active
        break;
      case 'completed':
        // Scroll to push 55% of "ACTIVE REMINDERS" out of view
        tabScrollX = tabWidth * 0.55; // This will push 55% of active tab out
        break;
      case 'expired':
        // Calculate position to push "ACTIVE REMINDERS" out of view
        // We need to scroll enough so that the expired tab is fully visible
        // and the active tab is pushed out
        tabScrollX = tabWidth * 2; // This will position expired at the start, pushing active completely out
        break;
    }
    
    // Ensure we don't scroll negative
    tabScrollX = Math.max(0, tabScrollX);
    tabScrollRef.current?.scrollTo({ x: tabScrollX, animated: true });
  }, []);



  const activeReminders = React.useMemo(() => {
    const sortMode = settings?.sortMode ?? 'creation';
    const active = reminders.filter(r => r.isActive && !r.isCompleted && !r.isExpired);

    if (sortMode === 'creation') {
      return active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return active.sort((a, b) => {
      const getNextDate = (reminder: Reminder) => {
        if (reminder.snoozeUntil) return new Date(reminder.snoozeUntil);
        if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
        const calculated = calculateNextReminderDate(reminder);
        if (calculated) return calculated;
        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hours, minutes] = reminder.time.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes);
      };
      const dateA = getNextDate(a);
      const dateB = getNextDate(b);
      return dateA.getTime() - dateB.getTime();
    });
  }, [reminders, settings]);
  const completedReminders = React.useMemo(() => {
    const completed = reminders.filter(r => r.isCompleted);
    // Sort by when they were completed (using lastTriggeredAt or createdAt as fallback)
    return completed.sort((a, b) => {
      const dateA = a.lastTriggeredAt ? new Date(a.lastTriggeredAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.lastTriggeredAt ? new Date(b.lastTriggeredAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA; // Most recently completed first
    });
  }, [reminders]);
  
  const expiredReminders = React.useMemo(() => {
    const expired = reminders.filter(r => r.isExpired);
    // Sort by when they expired (most recently expired first)
    return expired.sort((a, b) => {
      // Calculate when each reminder expired
      const getExpiredTime = (reminder: Reminder) => {
        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const expiredDate = new Date(year, month - 1, day, hours, minutes);
        return expiredDate.getTime();
      };
      const expiredA = getExpiredTime(a);
      const expiredB = getExpiredTime(b);
      return expiredB - expiredA; // Most recently expired first
    });
  }, [reminders]);

  const completeReminder = useCallback((reminder: Reminder) => {
    configureLayoutAnimation();
    if (reminder.repeatType === 'none') {
      // For non-repeating reminders, mark as completed
      updateReminder.mutate({
        ...reminder,
        isCompleted: true,
      });
    } else {
      // For repeating reminders, calculate next reminder date and keep active
      const nextDate = calculateNextReminderDate(reminder);
      updateReminder.mutate({
        ...reminder,
        nextReminderDate: nextDate?.toISOString(),
        lastTriggeredAt: new Date().toISOString(),
        snoozeUntil: undefined, // Clear any snooze
      });
    }
  }, [updateReminder]);

  const pauseReminder = useCallback((reminder: Reminder) => {
    configureLayoutAnimation();
    updateReminder.mutate({ ...reminder, isPaused: !reminder.isPaused });
  }, [updateReminder]);

  const reassignReminder = useCallback((reminder: Reminder) => {
    // Check if the reminder time has passed
    const now = new Date();
    const [year, month, day] = reminder.date.split('-').map(Number);
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const reminderDateTime = new Date(year, month - 1, day);
    reminderDateTime.setHours(hours, minutes, 0, 0);
    
    // For 'once' reminders, check if the time has passed
    if (reminder.repeatType === 'none') {
      if (reminderDateTime <= now) {
        Alert.alert(
          'Past Time', 
          'This reminder\'s time has already passed. It cannot be reassigned to active reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // For daily reminders, check if today's time has passed
    if (reminder.repeatType === 'daily') {
      const todayTime = new Date();
      todayTime.setHours(hours, minutes, 0, 0);
      
      if (todayTime <= now) {
        Alert.alert(
          'Note', 
          'The time has already passed for today. This reminder will be active starting tomorrow.',
          [{ text: 'OK', onPress: () => {
            updateReminder.mutate({
              ...reminder,
              isCompleted: false,
              isActive: true,
              isPaused: false,
            });
          }}]
        );
        return;
      }
    }
    
    // For other repeat types or if time hasn't passed, reassign normally
    updateReminder.mutate({
      ...reminder,
      isCompleted: false,
      isActive: true,
      isPaused: false,
    });
  }, [updateReminder]);

  const to12h = useCallback((time24: string): { hh: string; mm: string; isAM: boolean } => {
    const [h, m] = time24.split(':').map(Number);
    const am = h < 12;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hh: hour12.toString().padStart(2, '0'), mm: m.toString().padStart(2, '0'), isAM: am };
  }, []);

  const openEdit = useCallback((reminder: Reminder) => {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setPriority(reminder.priority);
    setRepeatType(reminder.repeatType);
    setRepeatDays(reminder.repeatDays ?? []);
    setEveryValue(reminder.everyInterval?.value ?? 1);
    setEveryUnit(reminder.everyInterval?.unit ?? 'hours');
    setSelectedDate(reminder.date);

    const { hh, mm, isAM } = to12h(reminder.time);
    setSelectedTime(`${hh}:${mm}`);
    setIsAM(isAM);
    setShowCreatePopup(true);
  }, [to12h]);

  const handleDelete = useCallback((reminder: Reminder) => {
    configureLayoutAnimation();
    deleteReminder.mutate(reminder.id);
  }, [deleteReminder]);

  const handleLongPress = useCallback((reminderId: string, tab: 'active' | 'completed' | 'expired') => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectionTab(tab);
      setSelectedReminders(new Set([reminderId]));
    }
  }, [isSelectionMode]);

  const handleCardPress = useCallback((reminder: Reminder) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedReminders);
      if (newSelected.has(reminder.id)) {
        newSelected.delete(reminder.id);
      } else {
        newSelected.add(reminder.id);
      }
      setSelectedReminders(newSelected);
      
      if (newSelected.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      openEdit(reminder);
    }
  }, [isSelectionMode, selectedReminders, openEdit]);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedReminders(new Set());
    setSelectionTab(null);
  }, []);

  const selectAll = useCallback(() => {
    const scope = selectionTab ?? activeTab;
    const ids = scope === 'active'
      ? new Set(activeReminders.map(r => r.id))
      : scope === 'completed'
      ? new Set(completedReminders.map(r => r.id))
      : new Set(expiredReminders.map(r => r.id));

    const allSelected = ids.size === selectedReminders.size && Array.from(ids).every(id => selectedReminders.has(id));

    if (allSelected) {
      setSelectedReminders(new Set());
      setIsSelectionMode(false);
      setSelectionTab(null);
    } else {
      setSelectedReminders(ids);
      setIsSelectionMode(true);
      setSelectionTab(scope);
    }
  }, [selectionTab, activeTab, activeReminders, completedReminders, expiredReminders, selectedReminders]);

  const markAllAsDone = useCallback(() => {
    const selectedRemindersList = reminders.filter(r => selectedReminders.has(r.id));
    const updates = selectedRemindersList.map(reminder => {
      if (reminder.repeatType === 'none') {
        return {
          id: reminder.id,
          updates: { isCompleted: true }
        };
      } else {
        const nextDate = calculateNextReminderDate(reminder);
        return {
          id: reminder.id,
          updates: {
            nextReminderDate: nextDate?.toISOString(),
            lastTriggeredAt: new Date().toISOString(),
            snoozeUntil: undefined
          }
        };
      }
    });
    
    bulkUpdateReminders.mutate(updates);
    exitSelectionMode();
  }, [reminders, selectedReminders, bulkUpdateReminders, exitSelectionMode]);

  const deleteAll = useCallback(() => {
    if (selectedReminders.size === 0) return;
    bulkDeleteReminders.mutate(Array.from(selectedReminders));
    exitSelectionMode();
  }, [selectedReminders, bulkDeleteReminders, exitSelectionMode]);

  const pauseAll = useCallback(() => {
    const selectedRemindersList = reminders.filter(r => selectedReminders.has(r.id));
    const updates = selectedRemindersList
      .filter(reminder => !reminder.isPaused)
      .map(reminder => ({
        id: reminder.id,
        updates: { isPaused: true }
      }));
    
    if (updates.length > 0) {
      bulkUpdateReminders.mutate(updates);
    }
    exitSelectionMode();
  }, [reminders, selectedReminders, bulkUpdateReminders, exitSelectionMode]);

  const formatTime = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const formatRepeatType = useCallback((repeatType: RepeatType, everyInterval?: { value: number; unit: EveryUnit }) => {
    switch (repeatType) {
      case 'none': return 'Once';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      case 'custom': return 'Custom';
      case 'every':
        return 'Every';
      default: return 'Once';
    }
  }, []);

  const formatDays = useCallback((days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 7) return 'Every day';
    if (days.length === 0) return 'No days';
    return days.sort((a, b) => a - b).map(day => dayNames[day]).join(', ');
  }, []);

  const ReminderCard = memo(({ reminder, listType }: { reminder: Reminder; listType: 'active' | 'completed' | 'expired' }) => {
    const isActive = !reminder.isCompleted && !reminder.isExpired;
    const isExpired = reminder.isExpired;
    const isSelected = selectedReminders.has(reminder.id);
    
    return (
      <SwipeableRow 
        reminder={reminder}
        onSwipeRight={isActive && !isSelectionMode ? (reminder.repeatType === 'none' ? () => completeReminder(reminder) : () => {
          // For repeating reminders, swipe right completes entirely
          updateReminder.mutate({
            ...reminder,
            isCompleted: true,
          });
        }) : undefined} 
        onSwipeLeft={!isSelectionMode ? () => handleDelete(reminder) : undefined}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCardPress(reminder)}
          onLongPress={() => handleLongPress(reminder.id, listType)}
          delayLongPress={200}
          style={[
            styles.reminderCard,
            isSelected && styles.selectedCard
          ]}
          testID={`reminder-card-${reminder.id}`}
        >
          <View style={styles.reminderContent}>
            <View style={styles.reminderLeft}>
              {isSelectionMode && (
                <TouchableOpacity
                  style={styles.selectionCheckbox}
                  onPress={() => handleCardPress(reminder)}
                >
                  {isSelected ? (
                    <CheckSquare size={20} color={Material3Colors.light.primary} />
                  ) : (
                    <Square size={20} color={Material3Colors.light.onSurfaceVariant} />
                  )}
                </TouchableOpacity>
              )}
              <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLORS[reminder.priority] }]} />
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTitle}>{reminder.title}</Text>
                <View style={styles.reminderMeta}>
                  {/* Only show clock icon and fixed time for Weekly and Custom */}
                  {(reminder.repeatType === 'weekly' || reminder.repeatType === 'custom') && (
                    <>
                      <Clock size={14} color={Material3Colors.light.onSurfaceVariant} />
                      <Text style={styles.reminderTime}>{formatTime(reminder.time)}</Text>
                      <Text style={styles.metaSeparator}>•</Text>
                    </>
                  )}
                  {/* For Once, Monthly, Yearly, Every, Daily - move badge to bottom */}
                  {(reminder.repeatType !== 'none' && reminder.repeatType !== 'monthly' && reminder.repeatType !== 'yearly' && reminder.repeatType !== 'every' && reminder.repeatType !== 'daily') && (
                    <View style={styles.repeatBadge}>
                      <Text style={styles.repeatBadgeText}>
                        {formatRepeatType(reminder.repeatType, reminder.everyInterval)}
                      </Text>
                    </View>
                  )}

                </View>
                
                <View style={styles.reminderDetails}>
                  {/* For Once reminders - show date and time with clock icon like Monthly/Yearly */}
                  {reminder.repeatType === 'none' && !reminder.isCompleted && (
                    <View style={styles.nextOccurrenceContainer}>
                      <Clock size={14} color={Material3Colors.light.primary} />
                      <Text style={styles.reminderNextOccurrenceLarge}>
                        {(() => {
                          const [year, month, day] = reminder.date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          const dateStr = date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          });
                          const timeStr = formatTime(reminder.time);
                          return `${dateStr} at ${timeStr}`;
                        })()}
                      </Text>
                    </View>
                  )}
                  {(reminder.repeatType === 'weekly' || reminder.repeatType === 'custom') && reminder.repeatDays && reminder.repeatDays.length > 0 && (
                    <Text style={styles.reminderDays}>{formatDays(reminder.repeatDays)}</Text>
                  )}
                  {reminder.repeatType === 'daily' && (
                    <>
                      <View style={styles.dailyTimeContainer}>
                        <Clock size={14} color={Material3Colors.light.onSurfaceVariant} />
                        <Text style={styles.reminderTime}>{formatTime(reminder.time)}</Text>
                      </View>
                      <View style={styles.dailyDaysContainer}>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                          const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                          const selectedDays = (reminder.repeatDays && reminder.repeatDays.length > 0) ? reminder.repeatDays : [0,1,2,3,4,5,6];
                          const dayActive = selectedDays.includes(day);
                          return (
                            <View
                              key={day}
                              style={[
                                styles.dailyDayDisc,
                                dayActive && styles.dailyDayDiscActive
                              ]}
                            >
                              <Text style={[
                                styles.dailyDayText,
                                dayActive && styles.dailyDayTextActive
                              ]}>
                                {dayLetters[day]}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}
                  {/* For Monthly, Yearly, and Every - show next occurrence with clock icon */}
                  {(reminder.repeatType === 'monthly' || reminder.repeatType === 'yearly' || reminder.repeatType === 'every') && !reminder.isCompleted && (
                    <View style={styles.nextOccurrenceContainer}>
                      <Clock size={14} color={Material3Colors.light.primary} />
                      <Text style={styles.reminderNextOccurrenceLarge}>
                        {(() => {
                          const getNextDate = () => {
                            if (reminder.snoozeUntil) return new Date(reminder.snoozeUntil);
                            if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                            const calc = calculateNextReminderDate(reminder);
                            return calc ?? null;
                          };
                          const nextDate = getNextDate();
                          if (!nextDate) return 'Calculating...';
                          
                          const dateStr = nextDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          });
                          const timeStr = formatTime(nextDate.toTimeString().slice(0, 5));
                          return `${dateStr} at ${timeStr}`;
                        })()}
                      </Text>
                    </View>
                  )}
                  
                  {/* Show repeat badge at bottom for Once, Monthly, Yearly, Every, Daily */}
                  {(reminder.repeatType === 'none' || reminder.repeatType === 'monthly' || reminder.repeatType === 'yearly' || reminder.repeatType === 'every' || reminder.repeatType === 'daily') && (
                    <View style={styles.repeatBadgeContainer}>
                      {/* 1. Frequency badge */}
                      <View style={[styles.repeatBadge, styles.repeatBadgeBottom]}>
                        <Text style={styles.repeatBadgeText}>
                          {formatRepeatType(reminder.repeatType, reminder.everyInterval)}
                        </Text>
                      </View>
                      {/* 2. Snoozed badge (for all types) */}
                      {reminder.snoozeUntil && isActive && !reminder.isCompleted && (
                        <View style={styles.snoozedBadgeInline}>
                          <Clock size={10} color={Material3Colors.light.tertiary} />
                          <Text style={styles.snoozedTextInline}>Snoozed</Text>
                        </View>
                      )}
                      {/* 3. Paused badge (moved here from outside) */}
                      {reminder.isPaused && isActive && !reminder.isCompleted && (
                        <View style={styles.pausedBadgeInline}>
                          <PauseCircle size={10} color={Material3Colors.light.tertiary} />
                          <Text style={styles.pausedTextInline}>Paused</Text>
                        </View>
                      )}
                      {/* 4. Repeating icon (for repeating types only) */}
                      {(reminder.repeatType === 'daily' || reminder.repeatType === 'monthly' || reminder.repeatType === 'yearly' || reminder.repeatType === 'every') && (
                        <Repeat size={12} color={Material3Colors.light.primary} style={{ alignSelf: 'center' }} />
                      )}
                    </View>
                  )}
                  
                  {/* Show snooze until time if snoozed */}
                  {reminder.snoozeUntil && (
                    <Text style={styles.snoozeUntilText}>
                      Snoozed until: {formatDate(reminder.snoozeUntil)} at {formatTime(new Date(reminder.snoozeUntil).toTimeString().slice(0, 5))}
                    </Text>
                  )}
                  
                  {/* Show next reminder date for Weekly and Custom reminders (not for completed or daily) */}
                  {(reminder.repeatType === 'weekly' || reminder.repeatType === 'custom') && !reminder.snoozeUntil && !reminder.isCompleted && (
                    <Text style={styles.nextReminderText}>
                      Next: {(() => {
                        const getNextDate = () => {
                          if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                          const calc = calculateNextReminderDate(reminder);
                          return calc ?? null;
                        };
                        const nextDate = getNextDate();
                        if (!nextDate) return 'Calculating...';

                        return formatDate(nextDate.toISOString());
                      })()}
                    </Text>
                  )}
                </View>
                
                {isExpired && (
                  <View style={styles.expiredBadge}>
                    <AlertCircle size={12} color={Material3Colors.light.error} />
                    <Text style={styles.expiredText}>Expired</Text>
                  </View>
                )}
              </View>
            </View>
            
            {isActive && (
              <View style={styles.reminderRight}>
                {reminder.repeatType !== 'none' && (
                  reminder.isPaused ? (
                    <TouchableOpacity
                      style={styles.resumeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        pauseReminder(reminder);
                      }}
                      testID={`resume-button-${reminder.id}`}
                    >
                      <PlayCircle size={20} color={Material3Colors.light.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.pauseButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        pauseReminder(reminder);
                      }}
                      testID={`pause-button-${reminder.id}`}
                    >
                      <PauseCircle size={20} color="#E57373" />
                    </TouchableOpacity>
                  )
                )}
                
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    completeReminder(reminder);
                  }}
                  testID={`done-button-${reminder.id}`}
                >
                  <CheckCircle size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
            
            {!isActive && !isExpired && (
              <View style={styles.reminderRight}>
                <TouchableOpacity
                  style={styles.reassignButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    reassignReminder(reminder);
                  }}
                  testID={`reassign-button-${reminder.id}`}
                >
                  <RotateCcw size={20} color={Material3Colors.light.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  }, (prevProps, nextProps) => {
    // More strict equality check
    if (prevProps.reminder.id !== nextProps.reminder.id) return false;
    if (prevProps.listType !== nextProps.listType) return false;
    
    // Check only relevant fields that affect rendering
    const prev = prevProps.reminder;
    const next = nextProps.reminder;
    
    return prev.title === next.title &&
           prev.time === next.time &&
           prev.date === next.date &&
           prev.priority === next.priority &&
           prev.isActive === next.isActive &&
           prev.isPaused === next.isPaused &&
           prev.isCompleted === next.isCompleted &&
           prev.isExpired === next.isExpired &&
           prev.repeatType === next.repeatType;
  });
  ReminderCard.displayName = 'ReminderCard';

  useEffect(() => {
    // Reset selection when switching tabs to prevent cross-tab actions
    if (isSelectionMode && selectionTab !== null && selectionTab !== activeTab) {
      exitSelectionMode();
    }
  }, [activeTab, isSelectionMode, selectionTab, exitSelectionMode]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Clock size={48} color={Material3Colors.light.primary} />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DoMinder</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Settings size={20} color={Material3Colors.light.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Windows Phone 8 Style Tab Headers */}
      <View style={styles.tabContainer}>
        <ScrollView 
          ref={tabScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
          style={styles.tabScrollView}
        >
          <TouchableOpacity 
            style={[styles.tabHeader, activeTab === 'active' && styles.activeTabHeader]}
            onPress={() => scrollToTab('active')}
          >
            <View style={styles.tabHeaderContent}>
              <Text style={[styles.tabHeaderText, activeTab === 'active' && styles.activeTabHeaderText]}>
                ACTIVE REMINDERS
              </Text>
              <Text style={[styles.tabCount, activeTab === 'active' && styles.activeTabCount]}>
                {activeReminders.length}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabHeader, activeTab === 'completed' && styles.activeTabHeader]}
            onPress={() => scrollToTab('completed')}
          >
            <View style={styles.tabHeaderContent}>
              <Text style={[styles.tabHeaderText, activeTab === 'completed' && styles.activeTabHeaderText]}>
                COMPLETED
              </Text>
              <Text style={[styles.tabCount, activeTab === 'completed' && styles.activeTabCount]}>
                {completedReminders.length}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabHeader, activeTab === 'expired' && styles.activeTabHeader]}
            onPress={() => scrollToTab('expired')}
          >
            <View style={styles.tabHeaderContent}>
              <Text style={[styles.tabHeaderText, activeTab === 'expired' && styles.activeTabHeaderText]}>
                EXPIRED
              </Text>
              <Text style={[styles.tabCount, activeTab === 'expired' && styles.activeTabCount]}>
                {expiredReminders.length}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            style={styles.closeSelectionButton}
            onPress={exitSelectionMode}
          >
            <X size={20} color={Material3Colors.light.onSurface} />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedReminders.size} selected
          </Text>
          <View style={styles.selectionActions}>
            {(() => {
              const scope: 'active' | 'completed' | 'expired' = selectionTab ?? activeTab;
              return (
                <>
                  {scope === 'active' && (
                    <TouchableOpacity
                      style={styles.selectionActionButton}
                      onPress={markAllAsDone}
                      disabled={selectedReminders.size === 0}
                      testID="bulk-done"
                    >
                      <CheckCircle size={16} color={selectedReminders.size === 0 ? Material3Colors.light.outline : Material3Colors.light.primary} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.selectionActionButton}
                    onPress={deleteAll}
                    disabled={selectedReminders.size === 0}
                    testID="bulk-delete"
                  >
                    <Trash2 size={16} color={selectedReminders.size === 0 ? Material3Colors.light.outline : Material3Colors.light.error} />
                  </TouchableOpacity>

                  {scope === 'active' && (
                    <TouchableOpacity
                      style={styles.selectionActionButton}
                      onPress={pauseAll}
                      disabled={selectedReminders.size === 0}
                      testID="bulk-pause"
                    >
                      <PauseCircle size={16} color={selectedReminders.size === 0 ? Material3Colors.light.outline : Material3Colors.light.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.selectionActionButton}
                    onPress={selectAll}
                    testID="bulk-select-all"
                  >
                    <CheckSquare size={16} color={Material3Colors.light.primary} />
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      )}

      {/* Main Content */}
      <Animated.ScrollView 
        ref={contentScrollRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        pointerEvents={showCreatePopup ? 'none' : 'auto'}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        bounces={true}
        bouncesZoom={false}
        alwaysBounceVertical={true}
        overScrollMode="always"
        contentContainerStyle={{
          minHeight: '100%',
          paddingBottom: 20
        }}>
        {activeTab === 'active' && (
          activeReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={64} color={Material3Colors.light.outline} />
              <Text style={styles.emptyTitle}>No Active Reminders</Text>
              <Text style={styles.emptyDescription}>
                Tap the Create Alarm button to create your first reminder
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              {activeReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} listType="active" />
              ))}
            </View>
          )
        )}
        
        {activeTab === 'completed' && (
          completedReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={64} color={Material3Colors.light.outline} />
              <Text style={styles.emptyTitle}>No Completed Reminders</Text>
              <Text style={styles.emptyDescription}>
                Completed reminders will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              {completedReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} listType="completed" />
              ))}
            </View>
          )
        )}
        
        {activeTab === 'expired' && (
          expiredReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={64} color={Material3Colors.light.outline} />
              <Text style={styles.emptyTitle}>No Expired Reminders</Text>
              <Text style={styles.emptyDescription}>
                Expired reminders will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              {expiredReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} listType="expired" />
              ))}
            </View>
          )
        )}
      </Animated.ScrollView>
      
      {!isSelectionMode && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.createAlarmButton}
            onPress={() => {
              setEditingReminder(null);
              setTitle('');
              const defaultPriority = settings?.defaultPriority ?? 'standard';
              const mappedPriority: Priority = defaultPriority === 'standard' ? 'medium' : defaultPriority === 'silent' ? 'low' : 'high';
              setPriority(mappedPriority);
              setRepeatType(settings?.defaultReminderMode ?? 'none');
              setRepeatDays([]);
              setEveryValue(1);
              setEveryUnit('hours');
              const defaultTime = calculateDefaultTime();
              setSelectedTime(defaultTime.time);
              setIsAM(defaultTime.isAM);
              const now = new Date();
              const yyyy = now.getFullYear();
              const mm = String(now.getMonth() + 1).padStart(2, '0');
              const dd = String(now.getDate()).padStart(2, '0');
              setSelectedDate(`${yyyy}-${mm}-${dd}`);
              setShowCreatePopup(true);
            }}
            testID="fab-create-reminder"
          >
            <Plus size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}
      
      <CreateReminderPopup
        visible={showCreatePopup}
        onClose={() => setShowCreatePopup(false)}
        title={title}
        onTitleChange={setTitle}
        selectedTime={selectedTime}
        isAM={isAM}
        priority={priority}
        onPriorityChange={setPriority}
        showCustomize={false}
        onShowCustomizeChange={() => {}}
        repeatType={repeatType}
        onRepeatTypeChange={setRepeatType}
        repeatDays={repeatDays}
        onRepeatDaysChange={setRepeatDays}
        everyValue={everyValue}
        everyUnit={everyUnit}
        onEveryChange={(value, unit) => {
          setEveryValue(value);
          setEveryUnit(unit);
        }}
        onTimeSelect={() => setShowTimeSelector(true)}
        onTimeChange={(time, ampm) => {
          setSelectedTime(time);
          setIsAM(ampm);
        }}
        showTimeSelector={showTimeSelector}
        onCloseTimeSelector={() => setShowTimeSelector(false)}
        onShowToast={showToast}
        onConfirm={() => {
          if (!title.trim()) {
            showToast('Please enter your reminder', 'error');
            return;
          }

          const [timeHours, timeMinutes] = selectedTime.split(':').map(Number);
          let finalHours = timeHours;
          if (!isAM && timeHours !== 12) {
            finalHours = timeHours + 12;
          } else if (isAM && timeHours === 12) {
            finalHours = 0;
          }
          const finalTime = `${finalHours.toString().padStart(2, '0')}:${timeMinutes.toString().padStart(2, '0')}`;

          // Check for past time validation for 'once' reminders (both new and editing)
          if (repeatType === 'none') {
            const now = new Date();
            const [year, month, day] = selectedDate.split('-').map(Number);
            const selectedDateTime = new Date(year, month - 1, day);
            selectedDateTime.setHours(finalHours, timeMinutes, 0, 0);
            
            const isToday = now.getFullYear() === selectedDateTime.getFullYear() &&
                          now.getMonth() === selectedDateTime.getMonth() &&
                          now.getDate() === selectedDateTime.getDate();
            
            if (selectedDateTime <= now || (isToday && selectedDateTime <= now)) {
              showToast('Please select a future time', 'error');
              return;
            }
          }

          if (editingReminder) {
            // Check if editing a completed reminder and time has passed
            if (editingReminder.isCompleted) {
              const now = new Date();
              const [year, month, day] = selectedDate.split('-').map(Number);
              const selectedDateTime = new Date(year, month - 1, day);
              selectedDateTime.setHours(finalHours, timeMinutes, 0, 0);
              
              // For daily reminders, check if today's time has passed
              if (repeatType === 'daily') {
                const todayTime = new Date();
                todayTime.setHours(finalHours, timeMinutes, 0, 0);
                
                if (todayTime <= now) {
                  Alert.alert(
                    'Past Time Selected', 
                    'The selected time has already passed for today. This reminder will be active starting tomorrow.',
                    [{ text: 'OK' }]
                  );
                }
              }
            }
            
            const updated: Reminder = {
              ...editingReminder,
              title: title.trim(),
              time: finalTime,
              date: selectedDate,
              priority,
              repeatType,
              repeatDays: (repeatType === 'weekly' || repeatType === 'custom' || repeatType === 'daily') ? repeatDays : undefined,
              monthlyDay: repeatType === 'monthly' ? Number(selectedDate.split('-')[2] ?? '1') : undefined,
              everyInterval: repeatType === 'every' ? { value: everyValue, unit: everyUnit } : undefined,
              ringerSound: undefined,
              isCompleted: false,
              isActive: true,
              isPaused: false,
              isExpired: false,
              snoozeUntil: undefined, // Clear snooze when rescheduling
              nextReminderDate: undefined, // Clear cached next date to force recalculation
              notificationId: undefined, // Clear notification ID to force rescheduling
            };
            updateReminder.mutate(updated, {
              onSuccess: () => {
                setShowCreatePopup(false);
                setEditingReminder(null);
                setTitle('');
                // Map settings priority to reminder priority
                const defaultPriority = settings?.defaultPriority ?? 'standard';
                const mappedPriority: Priority = defaultPriority === 'standard' ? 'medium' : 
                                                defaultPriority === 'silent' ? 'low' : 'high';
                setPriority(mappedPriority);
                setRepeatType(settings?.defaultReminderMode ?? 'none');
                setRepeatDays([]);
                setEveryValue(1);
                setEveryUnit('hours');

                const defaultTime = calculateDefaultTime();
                setSelectedTime(defaultTime.time);
                setIsAM(defaultTime.isAM);
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                setSelectedDate(`${yyyy}-${mm}-${dd}`);
              },
              onError: (error) => {
                Alert.alert('Error', 'Failed to update reminder');
                console.error('Error updating reminder:', error);
              },
            });
            return;
          }

          const newReminder: Reminder = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            title: title.trim(),
            description: '',
            time: finalTime,
            date: selectedDate,
            priority,
            isActive: true,
            isPaused: false,
            repeatType,
            repeatDays: (repeatType === 'weekly' || repeatType === 'custom' || repeatType === 'daily') ? repeatDays : undefined,
            monthlyDay: repeatType === 'monthly' ? Number(selectedDate.split('-')[2] ?? '1') : undefined,
            everyInterval: repeatType === 'every' ? { value: everyValue, unit: everyUnit } : undefined,
            ringerSound: undefined,
            isCompleted: false,
            isExpired: false,
          };

          addReminder.mutate(newReminder, {
            onSuccess: () => {
              // Close popup immediately
              setShowCreatePopup(false);
              
              // Reset form after animation completes using InteractionManager
              InteractionManager.runAfterInteractions(() => {
                setEditingReminder(null);
                setTitle('');
                // Map settings priority to reminder priority
                const defaultPriority = settings?.defaultPriority ?? 'standard';
                const mappedPriority: Priority = defaultPriority === 'standard' ? 'medium' : 
                                                defaultPriority === 'silent' ? 'low' : 'high';
                setPriority(mappedPriority);
                setRepeatType(settings?.defaultReminderMode ?? 'none');
                setRepeatDays([]);
                setEveryValue(1);
                setEveryUnit('hours');
                const defaultTime = calculateDefaultTime();
                setSelectedTime(defaultTime.time);
                setIsAM(defaultTime.isAM);
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                setSelectedDate(`${yyyy}-${mm}-${dd}`);
              });
            },
            onError: (error) => {
              Alert.alert('Error', 'Failed to create reminder');
              console.error('Error creating reminder:', error);
            },
          });
        }}
        isLoading={addReminder.isPending || updateReminder.isPending}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        mode={editingReminder ? 'edit' : 'create'}
      />

      <Toast
        message={toastMessage}
        visible={toastVisible}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

    </SafeAreaView>
  );
}

type PopupMode = 'create' | 'edit';

interface CreateReminderPopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (title: string) => void;
  selectedTime: string;
  isAM: boolean;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  showCustomize: boolean;
  onShowCustomizeChange: (show: boolean) => void;
  repeatType: RepeatType;
  onRepeatTypeChange: (repeatType: RepeatType) => void;
  repeatDays: number[];
  onRepeatDaysChange: (days: number[]) => void;
  onTimeSelect: () => void;
  onTimeChange: (time: string, isAM: boolean) => void;
  showTimeSelector: boolean;
  onCloseTimeSelector: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  mode: PopupMode;
  everyValue: number;
  everyUnit: EveryUnit;
  onEveryChange: (value: number, unit: EveryUnit) => void;
  onShowToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

function CreateReminderPopup({
  visible,
  onClose,
  title,
  onTitleChange,
  selectedTime,
  isAM,
  priority,
  onPriorityChange,
  showCustomize,
  onShowCustomizeChange,
  repeatType,
  onRepeatTypeChange,
  repeatDays,
  onRepeatDaysChange,
  onTimeSelect,
  onTimeChange,
  showTimeSelector,
  onCloseTimeSelector,
  onConfirm,
  isLoading,
  selectedDate,
  onDateChange,
  mode,
  everyValue,
  everyUnit,
  onEveryChange,
  onShowToast,
}: CreateReminderPopupProps) {
  const { data: reminders } = useReminders();
  const [popupHeight, setPopupHeight] = useState<number>(480);
  const mainContentSlide = useRef(new Animated.Value(0)).current;
  const titleInputRef = useRef<TextInput>(null);



  useEffect(() => {
    const updateHeight = () => {
      const winH = Dimensions.get('window').height;
      const paddingVertical = 48;
      const target = 470;
      const computed = Math.min(target, Math.max(380, winH - paddingVertical));
      setPopupHeight(computed);
    };
    updateHeight();
    const sub = Dimensions.addEventListener('change', updateHeight);
    return () => {
      (sub as any)?.remove?.();
    };
  }, []);

  const formatTime = (time: string, isAm: boolean) => {
    const [hours, minutes] = time.split(':').map(Number);
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${isAm ? 'AM' : 'PM'}`;
  };

  useEffect(() => {
    if (visible && mode === 'create') {
      mainContentSlide.setValue(0);
      // Use a single requestAnimationFrame + setTimeout for reliable focus
      requestAnimationFrame(() => {
        setTimeout(() => {
          titleInputRef.current?.focus();
        }, 100);
      });
    }
  }, [visible, mode, mainContentSlide]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <Pressable 
        style={createPopupStyles.overlay} 
        onPress={() => {
          RNKeyboard.dismiss();
          onClose();
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[createPopupStyles.popup, { height: popupHeight }]}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
            style={{ maxHeight: '100%' }}
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="always"
          >
              <View style={createPopupStyles.mainContent}>
              <View style={createPopupStyles.section}>
                <TextInput
                  ref={titleInputRef}
                  style={createPopupStyles.titleInput}
                  placeholder="Enter reminder"
                  value={title}
                  onChangeText={onTitleChange}
                  blurOnSubmit={false}
                  maxLength={100}
                  testID="title-input"
                />
              </View>
              
              <View style={[createPopupStyles.customizeContent, { marginBottom: 6 }]}> 
                <CustomizePanel
                  repeatType={repeatType}
                  repeatDays={repeatDays}
                  onRepeatTypeChange={onRepeatTypeChange}
                  onRepeatDaysChange={onRepeatDaysChange}
                  selectedDate={selectedDate}
                  onDateChange={(date) => {
                    onDateChange(date);
                    // Don't dismiss keyboard on date change - only when opening time picker
                  }}
                  onOpenTime={() => { onTimeSelect(); }}
                  displayTime={`${formatTime(selectedTime, isAM)}`}
                  everyValue={everyValue}
                  everyUnit={everyUnit}
                  onEveryChange={onEveryChange}
                />
              </View>
              
              <View style={createPopupStyles.section}>
                <PrioritySelector 
                  priority={priority} 
                  onPriorityChange={onPriorityChange}

                />
              </View>
              </View>
          </ScrollView>
          
          <View style={createPopupStyles.buttonContainer}>
            <TouchableOpacity style={createPopupStyles.cancelButton} onPress={onClose} testID="cancel-create">
              <Text style={createPopupStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[createPopupStyles.createButton, isLoading && createPopupStyles.createButtonDisabled]} 
              onPress={onConfirm}
              disabled={isLoading}
              testID="confirm-create"
            >
              <Text style={createPopupStyles.createButtonText}>
                {isLoading ? (mode === 'edit' ? 'Rescheduling...' : 'Creating...') : (mode === 'edit' ? 'Reschedule' : 'Create')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
      
      <TimeSelector
        visible={showTimeSelector}
        selectedTime={selectedTime}
        isAM={isAM}
        onTimeChange={onTimeChange}
        onClose={onCloseTimeSelector}
        selectedDate={selectedDate}
        repeatType={repeatType}
        onPastTimeError={(msg) => onShowToast(msg ?? 'Please select a future time', 'error')}
      />
      

    </Modal>
  );
}

const createPopupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  popup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    elevation: 8,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
    overflow: 'visible',
  },
  mainContent: {
    zIndex: 1,
    paddingBottom: 4,
  },
  customizeContent: {
    zIndex: 20,
    overflow: 'visible',
  },
  section: {
    marginBottom: 10,
    overflow: 'visible',
    zIndex: 10,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  plusButtonWrapper: {
    zIndex: 50,
    bottom: 80,
    right: 20,
  },
  customizeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    zIndex: 5,
  },

  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Material3Colors.light.primary,
    borderRadius: 6,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Material3Colors.light.primary,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

interface TimeSelectorProps {
  visible: boolean;
  selectedTime: string;
  isAM: boolean;
  onTimeChange: (time: string, isAM: boolean) => void;
  onClose: () => void;
  selectedDate?: string;
  repeatType?: RepeatType;
  onPastTimeError?: (message: string) => void;
}

function TimeSelector({ visible, selectedTime, isAM, onTimeChange, onClose, selectedDate, repeatType, onPastTimeError }: TimeSelectorProps) {
  const [hours, minutes] = selectedTime.split(':').map(Number);
  const [currentHour, setCurrentHour] = useState<number>(() => {
    const h = Number.isFinite(hours) ? hours : 0;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return hour12;
  });
  const [currentMinute, setCurrentMinute] = useState<number>(() => {
    return Number.isFinite(minutes) ? minutes : 0;
  });
  const [currentAMPM, setCurrentAMPM] = useState<boolean>(() => {
    return isAM;
  });
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    const { width, height } = Dimensions.get('window');
    return width > height;
  });
  useEffect(() => {
    const onChange = () => {
      const { width, height } = Dimensions.get('window');
      setIsLandscape(width > height);
    };
    const sub = Dimensions.addEventListener('change', onChange);
    return () => {
      (sub as any)?.remove?.();
    };
  }, []);
  const [activeSection, setActiveSection] = useState<'hour' | 'minute'>('hour');
  useEffect(() => {
    if (!visible) return;
    // Reset to dial mode when opening the time picker
    setShowManualEntry(false);
    setManualTimeInput('');
    try {
      const [h, m] = selectedTime.split(':').map(Number);
      const hour12 = (h % 12 === 0 ? 12 : h % 12);
      setCurrentHour(hour12);
      setCurrentMinute(Number.isFinite(m) ? m : 0);
      setCurrentAMPM(isAM);
      
      // Set initial rotation based on selected time
      const hourStep = 360 / 12;
      const initialRotation = ((hour12 === 12 ? 0 : hour12) * hourStep) % 360;
      setRotation(initialRotation);
      rotationRef.current = initialRotation;
    } catch (e) {
      console.log('sync selectedTime to dial failed', e);
    }
  }, [visible, selectedTime, isAM]); // Keep dependencies for initial sync
  
  // Separate effect to handle rotation ONLY when actively switching sections
  useEffect(() => {
    if (!visible || isDragging.current) return; // Don't update if dragging
    
    const hourStep = 360 / 12;
    const minuteStep = 360 / 60;
    const targetRotation = activeSection === 'hour'
      ? (((currentHour === 12 ? 0 : currentHour) * hourStep) % 360)
      : ((currentMinute * minuteStep) % 360);
    
    // Only update if rotation actually changed
    if (Math.abs(rotationRef.current - targetRotation) > 0.1) {
      setRotation(targetRotation);
      rotationRef.current = targetRotation;
    }
  }, [visible, activeSection]); // Remove currentHour and currentMinute to prevent jitter
  const [rotation, setRotation] = useState<number>(0);
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualTimeInput, setManualTimeInput] = useState<string>('');
  const [discSize, setDiscSize] = useState<number>(220);
  
  const discRef = useRef<View>(null);
  const lastAngle = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const rotationRef = useRef<number>(0);
  const animatedRotation = useRef(new Animated.Value(0)).current;
  const framePending = useRef<boolean>(false);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocity = useRef<number>(0);
  const lastMoveTime = useRef<number>(0);
  const decayAnimation = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSwitchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedByFriction = useRef<boolean>(false);
  const snapAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const lastValueUpdate = useRef<number>(0);
  
  const HOUR_SENSITIVITY = 1.0;
  const MINUTE_SENSITIVITY = 1.0;
  const DEADBAND_DEG = 0.5; // Reduced for smoother tracking
  const DECAY_FRICTION = 0.85;
  const MIN_DECAY_VELOCITY = 0.3;
  const VELOCITY_THRESHOLD = 0.15; // Minimum velocity to trigger momentum
  const SNAP_THRESHOLD = 0.08; // Below this velocity, snap to nearest value
  const SNAP_DURATION = 200; // Duration of snap animation in ms
  const VALUE_UPDATE_THROTTLE = 100; // Throttle value updates during drag
  
  useEffect(() => {
    return () => {
      if (decayAnimation.current) {
        clearInterval(decayAnimation.current);
        decayAnimation.current = null;
      }
      if (autoSwitchTimeout.current) {
        clearTimeout(autoSwitchTimeout.current);
        autoSwitchTimeout.current = null;
      }
      if (snapAnimation.current) {
        snapAnimation.current.stop();
      }
      animatedRotation.removeAllListeners();
    };
  }, [animatedRotation]);
  
  const measureCenter = () => {
    try {
      (discRef.current as any)?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
        centerRef.current = { x: x + w / 2, y: y + h / 2 };
      });
    } catch (e) {
      console.log('measureCenter error', e);
    }
  };

  // Compute absolute angle (0..360) from finger position using pageX/pageY
  const getAngleFromEvent = (evt: any) => {
    const { pageX, pageY } = evt?.nativeEvent || {};
    const cx = centerRef.current.x || 0;
    const cy = centerRef.current.y || 0;
    const dx = (pageX ?? 0) - cx;
    const dy = (pageY ?? 0) - cy;
    const angleRad = Math.atan2(dy, dx);
    return (angleRad * 180 / Math.PI + 90 + 360) % 360;
  };

  // Return the minimal signed angular difference between two angles
  const angleDelta = (fromDeg: number, toDeg: number) => {
    let diff = toDeg - fromDeg;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  };
  
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt, gestureState) => {
      isDragging.current = true;
      rotationRef.current = rotation;
      measureCenter();

      // Initialize lastAngle based on current touch position for delta calculation
      const startDeg = getAngleFromEvent(evt);
      lastAngle.current = startDeg;
      
      // Stop any ongoing animations
      if (decayAnimation.current) {
        clearInterval(decayAnimation.current);
        decayAnimation.current = null;
      }
      if (autoSwitchTimeout.current) {
        clearTimeout(autoSwitchTimeout.current);
        autoSwitchTimeout.current = null;
      }
      if (snapAnimation.current) {
        snapAnimation.current.stop();
        snapAnimation.current = null;
      }
      velocity.current = 0;
      stoppedByFriction.current = false;
      lastMoveTime.current = Date.now();
    },
    onPanResponderMove: (evt, gestureState) => {
      if (!isDragging.current) return;
      const currentTime = Date.now();
      
      // Use absolute finger position to compute angle
      const degrees = getAngleFromEvent(evt);
      let delta = angleDelta(lastAngle.current, degrees);
      if (Math.abs(delta) < DEADBAND_DEG) return;
      
      const timeDelta = currentTime - lastMoveTime.current;
      if (timeDelta > 0 && timeDelta < 100) { // Ignore if time gap is too large (finger lift)
        const newVelocity = delta / timeDelta;
        // Apply smoothing to velocity to reduce jitter from finger slips
        velocity.current = velocity.current * 0.3 + newVelocity * 0.7;
      } else if (timeDelta >= 100) {
        // Reset velocity if there's a pause (likely finger repositioning)
        velocity.current = 0;
      }
      lastMoveTime.current = currentTime;
      
      delta *= activeSection === 'hour' ? HOUR_SENSITIVITY : MINUTE_SENSITIVITY;
      lastAngle.current = degrees;
      
      // Apply delta rotation instead of absolute positioning
      rotationRef.current = (rotationRef.current + delta + 360) % 360;
      const r = rotationRef.current;
      setRotation(r);
      
      // Throttle value updates to avoid re-renders during drag
      const now = Date.now();
      if (now - lastValueUpdate.current > VALUE_UPDATE_THROTTLE) {
        lastValueUpdate.current = now;
        
        // Calculate new value without triggering immediate state update
        if (activeSection === 'hour') {
          const hourStep = 360 / 12;
          const hourIndex = Math.round(r / hourStep) % 12;
          const newHour = hourIndex === 0 ? 12 : hourIndex;
          if (newHour !== currentHour) {
            setCurrentHour(newHour);
          }
        } else {
          const minuteStep = 360 / 60;
          const minuteIndex = Math.round(r / minuteStep) % 60;
          if (minuteIndex !== currentMinute) {
            setCurrentMinute(minuteIndex);
          }
        }
      }
    },
    onPanResponderRelease: () => {
      isDragging.current = false;
      
      // Snap to nearest value if velocity is very low (likely a finger slip)
      if (Math.abs(velocity.current) < SNAP_THRESHOLD) {
        // Cancel any existing snap animation
        if (snapAnimation.current) {
          snapAnimation.current.stop();
        }
        
        // Snap to nearest position with smooth animation
        const r = rotationRef.current % 360;
        if (activeSection === 'hour') {
          const hourStep = 360 / 12;
          const snappedRotation = Math.round(r / hourStep) * hourStep;
          
          // Animate to snapped position
          animatedRotation.setValue(r);
          snapAnimation.current = Animated.timing(animatedRotation, {
            toValue: snappedRotation,
            duration: SNAP_DURATION,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          });
          
          // Update rotation during animation
          const listener = animatedRotation.addListener(({ value }) => {
            setRotation(value);
            rotationRef.current = value;
          });
          
          snapAnimation.current.start(() => {
            animatedRotation.removeListener(listener);
            rotationRef.current = snappedRotation;
            setRotation(snappedRotation);
            const hourIndex = Math.round(snappedRotation / hourStep) % 12;
            const newHour = hourIndex === 0 ? 12 : hourIndex;
            setCurrentHour(newHour);
            
            // Auto-switch to minutes after a short delay
            if (autoSwitchTimeout.current) {
              clearTimeout(autoSwitchTimeout.current);
            }
            autoSwitchTimeout.current = setTimeout(() => {
              setActiveSection('minute');
              // Rotation will be handled by the activeSection effect
              autoSwitchTimeout.current = null;
            }, 300);
          });
        } else {
          const minuteStep = 360 / 60;
          const snappedRotation = Math.round(r / minuteStep) * minuteStep;
          
          // Animate to snapped position
          animatedRotation.setValue(r);
          snapAnimation.current = Animated.timing(animatedRotation, {
            toValue: snappedRotation,
            duration: SNAP_DURATION,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          });
          
          // Update rotation during animation
          const listener = animatedRotation.addListener(({ value }) => {
            setRotation(value);
            rotationRef.current = value;
          });
          
          snapAnimation.current.start(() => {
            animatedRotation.removeListener(listener);
            rotationRef.current = snappedRotation;
            setRotation(snappedRotation);
            const minuteIndex = Math.round(snappedRotation / minuteStep) % 60;
            setCurrentMinute(minuteIndex);
          });
        }
        velocity.current = 0;
        return;
      }
      
      // Only apply momentum if velocity is above threshold
      if (Math.abs(velocity.current) > VELOCITY_THRESHOLD) {
        const startDecay = () => {
          if (decayAnimation.current) {
            clearInterval(decayAnimation.current);
          }
          
          let currentVelocity = velocity.current * 20;
          let frameCount = 0;
          
          decayAnimation.current = setInterval(() => {
            if (Math.abs(currentVelocity) < MIN_DECAY_VELOCITY) {
              if (decayAnimation.current) {
                clearInterval(decayAnimation.current);
                decayAnimation.current = null;
              }
              stoppedByFriction.current = true;
              
              // Final value update
              const r = rotationRef.current % 360;
              if (activeSection === 'hour') {
                const hourStep = 360 / 12;
                const hourIndex = Math.round(r / hourStep) % 12;
                const newHour = hourIndex === 0 ? 12 : hourIndex;
                setCurrentHour(newHour);
              } else {
                const minuteStep = 360 / 60;
                const minuteIndex = Math.round(r / minuteStep) % 60;
                setCurrentMinute(minuteIndex);
              }
              return;
            }
            
            rotationRef.current = (rotationRef.current + currentVelocity + 360) % 360;
            const r = rotationRef.current % 360;
            setRotation(r);
            
            // Only update values every 6 frames (approximately every 100ms) to reduce jitter
            frameCount++;
            if (frameCount % 6 === 0) {
              if (activeSection === 'hour') {
                const hourStep = 360 / 12;
                const hourIndex = Math.round(r / hourStep) % 12;
                const newHour = hourIndex === 0 ? 12 : hourIndex;
                if (newHour !== currentHour) setCurrentHour(newHour);
              } else {
                const minuteStep = 360 / 60;
                const minuteIndex = Math.round(r / minuteStep) % 60;
                if (minuteIndex !== currentMinute) setCurrentMinute(minuteIndex);
              }
            }
            
            currentVelocity *= DECAY_FRICTION;
          }, 16);
        };
        
        startDecay();
      } else {
        if (activeSection === 'hour' && !stoppedByFriction.current) {
          if (autoSwitchTimeout.current) {
            clearTimeout(autoSwitchTimeout.current);
          }
          autoSwitchTimeout.current = setTimeout(() => {
            setActiveSection('minute');
            // Rotation will be handled by the activeSection effect
            autoSwitchTimeout.current = null;
          }, 300);
        }
      }
      
      velocity.current = 0;
    },
    onPanResponderTerminate: () => {
      isDragging.current = false;
      velocity.current = 0;
      if (decayAnimation.current) {
        clearInterval(decayAnimation.current);
        decayAnimation.current = null;
      }
      if (autoSwitchTimeout.current) {
        clearTimeout(autoSwitchTimeout.current);
        autoSwitchTimeout.current = null;
      }
      stoppedByFriction.current = false;
    },
  });
  
  const handleSectionPress = (section: 'hour' | 'minute') => {
    if (autoSwitchTimeout.current) {
      clearTimeout(autoSwitchTimeout.current);
      autoSwitchTimeout.current = null;
    }
    stoppedByFriction.current = false;
    
    // Cancel any ongoing animations
    if (snapAnimation.current) {
      snapAnimation.current.stop();
      snapAnimation.current = null;
    }
    if (decayAnimation.current) {
      clearInterval(decayAnimation.current);
      decayAnimation.current = null;
    }
    
    setActiveSection(section);
    
    // Use setTimeout to ensure state has updated before setting rotation
    setTimeout(() => {
      if (section === 'hour') {
        const hourStep = 360 / 12;
        const hourIndex = currentHour === 12 ? 0 : currentHour;
        const newRotation = (hourIndex * hourStep) % 360;
        rotationRef.current = newRotation;
        setRotation(newRotation);
      } else {
        const minuteStep = 360 / 60;
        const newRotation = (currentMinute * minuteStep) % 360;
        rotationRef.current = newRotation;
        setRotation(newRotation);
      }
    }, 0);
  };
  
  const handleConfirm = () => {
    // If manual entry is active, apply the manually entered time first
    if (showManualEntry && manualTimeInput.trim() !== '') {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (timeRegex.test(manualTimeInput)) {
        const [inputHour, inputMinute] = manualTimeInput.split(':').map(Number);
        let hour12 = inputHour;
        
        // Convert 24-hour to 12-hour format
        if (inputHour === 0) {
          hour12 = 12;
        } else if (inputHour > 12) {
          hour12 = inputHour - 12;
        } else if (inputHour === 12) {
          hour12 = 12;
        } else {
          hour12 = inputHour;
        }
        
        // Apply the manually entered time with current AM/PM selection
        setCurrentHour(hour12);
        setCurrentMinute(inputMinute);
        setShowManualEntry(false);
        setManualTimeInput('');
        
        // Use the manually entered values with current AM/PM state for confirmation
        const timeString = `${hour12.toString().padStart(2, '0')}:${inputMinute.toString().padStart(2, '0')}`;
        onTimeChange(timeString, currentAMPM);
        onClose();
        return;
      } else {
        Alert.alert('Invalid Time', 'Please enter time in HH:MM format (24-hour)');
        return;
      }
    }
    
    // Only validate past time for 'once' reminders and daily reminders on today
    if (selectedDate && (repeatType === 'none' || repeatType === undefined)) {
      const now = new Date();
      const [year, month, day] = selectedDate.split('-').map(Number);
      const selectedDateTime = new Date(year, month - 1, day);
      
      let hour24 = currentHour;
      if (!currentAMPM && currentHour !== 12) {
        hour24 = currentHour + 12;
      } else if (currentAMPM && currentHour === 12) {
        hour24 = 0;
      }
      
      selectedDateTime.setHours(hour24, currentMinute, 0, 0);
      
      const isToday = now.getFullYear() === selectedDateTime.getFullYear() &&
                      now.getMonth() === selectedDateTime.getMonth() &&
                      now.getDate() === selectedDateTime.getDate();
      
      if (isToday && selectedDateTime <= now) {
        onPastTimeError?.("Please select a future time");
        return;
      }
    }
    
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    onTimeChange(timeString, currentAMPM);
    onClose();
  };
  
  const renderTickMarks = () => {
    const ticks: React.ReactElement[] = [];
    const tickCount = activeSection === 'hour' ? 12 : 60;
    const tickStep = 360 / tickCount;
    const innerPadding = 14;
    const radius = Math.max(0, discSize / 2 - innerPadding);
    
    for (let i = 0; i < tickCount; i++) {
      const angle = i * tickStep;
      const isMainTick = activeSection === 'hour' ? true : i % 5 === 0;
      const tickLength = isMainTick ? 12 : 6;
      const tickWidth = isMainTick ? 2 : 1;
      
      ticks.push(
        <View
          key={i}
          style={[
            timeSelectorStyles.tickMark,
            {
              height: tickLength,
              width: tickWidth,
              backgroundColor: isMainTick ? '#374151' : '#D1D5DB',
              transform: [
                { translateX: -tickWidth / 2 },
                { translateY: -tickLength / 2 },
                { rotate: `${angle}deg` },
                { translateY: -radius },
              ],
            },
          ]}
        />
      );
    }
    return ticks;
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <TouchableOpacity 
        style={timeSelectorStyles.overlay} 
        activeOpacity={1} 
        onPress={() => {
          if (showManualEntry) {
            // If manual entry is active, confirm the time if valid
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (timeRegex.test(manualTimeInput)) {
              const [inputHour, inputMinute] = manualTimeInput.split(':').map(Number);
              let hour12 = inputHour;
              
              // Convert 24-hour to 12-hour format
              if (inputHour === 0) {
                hour12 = 12;
              } else if (inputHour > 12) {
                hour12 = inputHour - 12;
              } else if (inputHour === 12) {
                hour12 = 12;
              } else {
                hour12 = inputHour;
              }
              
              // Use current AM/PM state instead of auto-determining
              setCurrentHour(hour12);
              setCurrentMinute(inputMinute);
              setShowManualEntry(false);
              setManualTimeInput('');
            } else {
              // If invalid or empty, just close manual entry
              setShowManualEntry(false);
              setManualTimeInput('');
            }
          } else {
            onClose();
          }
        }}
      >
        <TouchableOpacity 
          style={[timeSelectorStyles.container, isLandscape && timeSelectorStyles.containerLandscape]} 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          {isLandscape ? (
            <View style={timeSelectorStyles.landscapeRow}>
              <View style={timeSelectorStyles.sidePanel}>
                <View style={timeSelectorStyles.timeDisplay}>
                  {showManualEntry ? (
                    <TouchableOpacity 
                      style={timeSelectorStyles.manualEntryContainer}
                      activeOpacity={1}
                      onPress={() => {
                        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
                        if (timeRegex.test(manualTimeInput)) {
                          const [inputHour, inputMinute] = manualTimeInput.split(':').map(Number);
                          let hour12 = inputHour;
                          if (inputHour === 0) {
                            hour12 = 12;
                          } else if (inputHour > 12) {
                            hour12 = inputHour - 12;
                          } else if (inputHour === 12) {
                            hour12 = 12;
                          } else {
                            hour12 = inputHour;
                          }
                          setCurrentHour(hour12);
                          setCurrentMinute(inputMinute);
                          setShowManualEntry(false);
                          setManualTimeInput('');
                        } else if (manualTimeInput.trim() !== '') {
                          Alert.alert('Invalid Time', 'Please enter time in HH:MM format (24-hour)');
                        }
                      }}
                    >
                      <TextInput
                        style={timeSelectorStyles.manualTimeInput}
                        value={manualTimeInput}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9:]/g, '');
                          if (cleaned.length <= 5) {
                            let formatted = cleaned;
                            if (cleaned.length === 3 && !cleaned.includes(':')) {
                              formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
                            }
                            setManualTimeInput(formatted);
                          }
                        }}
                        onSubmitEditing={() => {
                          const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
                          if (timeRegex.test(manualTimeInput)) {
                            const [inputHour, inputMinute] = manualTimeInput.split(':').map(Number);
                            let hour12 = inputHour;
                            if (inputHour === 0) {
                              hour12 = 12;
                            } else if (inputHour > 12) {
                              hour12 = inputHour - 12;
                            } else if (inputHour === 12) {
                              hour12 = 12;
                            } else {
                              hour12 = inputHour;
                            }
                            setCurrentHour(hour12);
                            setCurrentMinute(inputMinute);
                            setShowManualEntry(false);
                            setManualTimeInput('');
                          } else if (manualTimeInput.trim() !== '') {
                            Alert.alert('Invalid Time', 'Please enter time in HH:MM format (24-hour)');
                          }
                        }}
                        placeholder="HH:MM"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        maxLength={5}
                        autoFocus
                        selectTextOnFocus
                        testID="manual-time-input"
                      />
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          timeSelectorStyles.timeSection,
                          activeSection === 'hour' && timeSelectorStyles.activeSectionLeft
                        ]}
                        onPress={() => handleSectionPress('hour')}
                      >
                        <Text style={[
                          timeSelectorStyles.timeSectionText,
                          activeSection === 'hour' && timeSelectorStyles.activeTimeSectionText
                        ]}>
                          {currentHour.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                      <Text style={timeSelectorStyles.timeSeparator}>:</Text>
                      <TouchableOpacity
                        style={[
                          timeSelectorStyles.timeSection,
                          activeSection === 'minute' && timeSelectorStyles.activeSectionRight
                        ]}
                        onPress={() => handleSectionPress('minute')}
                      >
                        <Text style={[
                          timeSelectorStyles.timeSectionText,
                          activeSection === 'minute' && timeSelectorStyles.activeTimeSectionText
                        ]}>
                          {currentMinute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={timeSelectorStyles.ampmContainer}>
                  <TouchableOpacity
                    style={[
                      timeSelectorStyles.ampmButton,
                      currentAMPM && timeSelectorStyles.selectedAMPM
                    ]}
                    onPress={() => setCurrentAMPM(true)}
                  >
                    <Text style={[
                      timeSelectorStyles.ampmText,
                      currentAMPM && timeSelectorStyles.selectedAMPMText
                    ]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      timeSelectorStyles.ampmButton,
                      !currentAMPM && timeSelectorStyles.selectedAMPM
                    ]}
                    onPress={() => setCurrentAMPM(false)}
                  >
                    <Text style={[
                      timeSelectorStyles.ampmText,
                      !currentAMPM && timeSelectorStyles.selectedAMPMText
                    ]}>PM</Text>
                  </TouchableOpacity>
                </View>

                <View style={timeSelectorStyles.buttonContainer}>
                  <TouchableOpacity 
                    style={timeSelectorStyles.keyboardButton} 
                    onPress={() => {
                      setShowManualEntry(true);
                      setManualTimeInput('');
                    }}
                    testID="keyboard-button"
                  >
                    <Keyboard size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <View style={timeSelectorStyles.rightButtons}>
                    <TouchableOpacity style={timeSelectorStyles.cancelButton} onPress={onClose}>
                      <Text style={timeSelectorStyles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={timeSelectorStyles.confirmButton} onPress={handleConfirm}>
                      <Text style={timeSelectorStyles.confirmButtonText}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={timeSelectorStyles.discPanel}>
                <View style={timeSelectorStyles.discContainer}>
                  <View
                    ref={discRef}
                    collapsable={false}
                    onLayout={(e) => {
                      const w = (e.nativeEvent as any).layout?.width ?? 220;
                      setDiscSize(typeof w === 'number' ? w : 220);
                    }}
                    style={timeSelectorStyles.discBackground}
                    {...panResponder.panHandlers}
                    testID="time-disc"
                  >
                    <View style={[timeSelectorStyles.handContainer, { transform: [{ rotate: `${rotation}deg` }] }]}>
                      {renderTickMarks()}
                      <View style={timeSelectorStyles.discIndicator} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={timeSelectorStyles.timeDisplay}>
                {showManualEntry ? (
                  <TouchableOpacity 
                    style={timeSelectorStyles.manualEntryContainer}
                    activeOpacity={1}
                    onPress={() => {
                      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
                      if (timeRegex.test(manualTimeInput)) {
                        const [inputHour, inputMinute] = manualTimeInput.split(':').map(Number);
                        let hour12 = inputHour;
                        if (inputHour === 0) {
                          hour12 = 12;
                        } else if (inputHour > 12) {
                          hour12 = inputHour - 12;
                        } else if (inputHour === 12) {
                          hour12 = 12;
                        } else {
                          hour12 = inputHour;
                        }
                        setCurrentHour(hour12);
                        setCurrentMinute(inputMinute);
                        setShowManualEntry(false);
                        setManualTimeInput('');
                      } else if (manualTimeInput.trim() !== '') {
                        Alert.alert('Invalid Time', 'Please enter time in HH:MM format (24-hour)');
                      }
                    }}
                  >
                    <TextInput
                      style={timeSelectorStyles.manualTimeInput}
                      value={manualTimeInput}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9:]/g, '');
                        if (cleaned.length <= 5) {
                          let formatted = cleaned;
                          if (cleaned.length === 3 && !cleaned.includes(':')) {
                            formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
                          }
                          setManualTimeInput(formatted);
                        }
                      }}
                      onSubmitEditing={() => {
                        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
                        if (timeRegex.test(manualTimeInput)) {
                          const [inputHour, inputMinute] = manualTimeInput.split(':').map(Number);
                          let hour12 = inputHour;
                          if (inputHour === 0) {
                            hour12 = 12;
                          } else if (inputHour > 12) {
                            hour12 = inputHour - 12;
                          } else if (inputHour === 12) {
                            hour12 = 12;
                          } else {
                            hour12 = inputHour;
                          }
                          setCurrentHour(hour12);
                          setCurrentMinute(inputMinute);
                          setShowManualEntry(false);
                          setManualTimeInput('');
                        } else if (manualTimeInput.trim() !== '') {
                          Alert.alert('Invalid Time', 'Please enter time in HH:MM format (24-hour)');
                        }
                      }}
                      placeholder="HH:MM"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      maxLength={5}
                      autoFocus
                      selectTextOnFocus
                      testID="manual-time-input"
                    />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        timeSelectorStyles.timeSection,
                        activeSection === 'hour' && timeSelectorStyles.activeSectionLeft
                      ]}
                      onPress={() => handleSectionPress('hour')}
                    >
                      <Text style={[
                        timeSelectorStyles.timeSectionText,
                        activeSection === 'hour' && timeSelectorStyles.activeTimeSectionText
                      ]}>
                        {currentHour.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                    <Text style={timeSelectorStyles.timeSeparator}>:</Text>
                    <TouchableOpacity
                      style={[
                        timeSelectorStyles.timeSection,
                        activeSection === 'minute' && timeSelectorStyles.activeSectionRight
                      ]}
                      onPress={() => handleSectionPress('minute')}
                    >
                      <Text style={[
                        timeSelectorStyles.timeSectionText,
                        activeSection === 'minute' && timeSelectorStyles.activeTimeSectionText
                      ]}>
                        {currentMinute.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={timeSelectorStyles.discContainer}>
                <View
                  ref={discRef}
                  collapsable={false}
                  onLayout={(e) => {
                    const w = (e.nativeEvent as any).layout?.width ?? 220;
                    setDiscSize(typeof w === 'number' ? w : 220);
                  }}
                  style={timeSelectorStyles.discBackground}
                  {...panResponder.panHandlers}
                  testID="time-disc"
                >
                  <View style={[timeSelectorStyles.handContainer, { transform: [{ rotate: `${rotation}deg` }] }]}>
                    {renderTickMarks()}
                    <View style={timeSelectorStyles.discIndicator} />
                  </View>
                </View>
              </View>

              <View style={timeSelectorStyles.ampmContainer}>
                <TouchableOpacity
                  style={[
                    timeSelectorStyles.ampmButton,
                    currentAMPM && timeSelectorStyles.selectedAMPM
                  ]}
                  onPress={() => setCurrentAMPM(true)}
                >
                  <Text style={[
                    timeSelectorStyles.ampmText,
                    currentAMPM && timeSelectorStyles.selectedAMPMText
                  ]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    timeSelectorStyles.ampmButton,
                    !currentAMPM && timeSelectorStyles.selectedAMPM
                  ]}
                  onPress={() => setCurrentAMPM(false)}
                >
                  <Text style={[
                    timeSelectorStyles.ampmText,
                    !currentAMPM && timeSelectorStyles.selectedAMPMText
                  ]}>PM</Text>
                </TouchableOpacity>
              </View>

              <View style={timeSelectorStyles.buttonContainer}>
                <TouchableOpacity 
                  style={timeSelectorStyles.keyboardButton} 
                  onPress={() => {
                    setShowManualEntry(true);
                    setManualTimeInput('');
                  }}
                  testID="keyboard-button"
                >
                  <Keyboard size={16} color="#6B7280" />
                </TouchableOpacity>
                <View style={timeSelectorStyles.rightButtons}>
                  <TouchableOpacity style={timeSelectorStyles.cancelButton} onPress={onClose}>
                    <Text style={timeSelectorStyles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={timeSelectorStyles.confirmButton} onPress={handleConfirm}>
                    <Text style={timeSelectorStyles.confirmButtonText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const timeSelectorStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  containerLandscape: {
    maxWidth: 500,
    padding: 24,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  activeSectionLeft: {
    backgroundColor: '#1E3A8A',
  },
  activeSectionRight: {
    backgroundColor: '#1E3A8A',
  },
  timeSectionText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTimeSectionText: {
    color: 'white',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '600',
    color: '#6B7280',
    marginHorizontal: 4,
  },
  discContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  landscapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidePanel: {
    width: 200,
    marginRight: 16,
  },
  discPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discBackground: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  tickMark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  rotatingDiscContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationaryPointer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  handContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discIndicator: {
    position: 'absolute',
    top: 4,
    width: 4,
    height: 18,
    backgroundColor: '#1E3A8A',
    borderRadius: 2,
  },
  ampmContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  ampmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    minWidth: 60,
    alignItems: 'center',
  },
  selectedAMPM: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedAMPMText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  keyboardButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  manualEntryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  manualTimeInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    borderRadius: 8,
    minWidth: 120,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

const SwipeableRow = memo(({ children, onSwipeLeft, onSwipeRight, reminder }: { children: React.ReactNode; onSwipeLeft?: () => void; onSwipeRight?: () => void; reminder: Reminder; }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const containerHeight = useRef(new Animated.Value(0)).current;
  const [dynamicMargin, setDynamicMargin] = useState<number>(7);
  const containerMargin = useRef(new Animated.Value(7)).current;
  const measuredHeightRef = useRef<number>(0);
  const [measured, setMeasured] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [showActions, setShowActions] = useState<boolean>(true);
  const threshold = 80;
  const isAnimating = useRef<boolean>(false);

  const reset = useCallback(() => {
    Animated.timing(translateX, { 
      toValue: 0, 
      duration: 200, 
      easing: Easing.out(Easing.ease), 
      useNativeDriver: true 
    }).start();
  }, [translateX]);

  const runRemoveSequence = useCallback((direction: 'left' | 'right') => {
    if (isRemoving || isAnimating.current) return;
    setIsRemoving(true);
    isAnimating.current = true;
    setShowActions(false);
    
    const screenW = Dimensions.get('window').width;
    const offscreen = direction === 'left' ? -Math.max(160, screenW) : Math.max(160, screenW);

    // Phase 1: Fade out and slide simultaneously (faster)
    Animated.parallel([
      Animated.timing(translateX, { 
        toValue: offscreen, 
        duration: 180, 
        easing: Easing.in(Easing.cubic), 
        useNativeDriver: true 
      }),
      Animated.timing(opacity, { 
        toValue: 0, 
        duration: 150, 
        easing: Easing.in(Easing.ease), 
        useNativeDriver: true 
      })
    ]).start(() => {
      // Phase 2: Collapse height after card is invisible (isolated)
      Animated.timing(containerHeight, { 
        toValue: 0, 
        duration: 150, 
        easing: Easing.out(Easing.ease), 
        useNativeDriver: false 
      }).start(() => {
        if (direction === 'left') {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
        isAnimating.current = false;
      });
    });
  }, [containerHeight, isRemoving, onSwipeLeft, onSwipeRight, opacity, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRemoving && !isAnimating.current,
      onMoveShouldSetPanResponder: (_, g) => !isRemoving && !isAnimating.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (isRemoving || isAnimating.current) return;
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (isRemoving || isAnimating.current) return;
        if (g.dx <= -threshold && onSwipeLeft) {
          runRemoveSequence('left');
        } else if (g.dx >= threshold && onSwipeRight) {
          runRemoveSequence('right');
        } else {
          reset();
        }
      },
      onPanResponderTerminate: () => {
        if (!isRemoving && !isAnimating.current) reset();
      },
    })
  ).current;

  const showLeftAction = !!onSwipeRight;
  const showRightAction = !!onSwipeLeft;

  return (
    <View style={swipeStyles.wrapper}>
      {showActions && (
        <View style={swipeStyles.actions} pointerEvents="none">
          {showLeftAction && (
            <View style={swipeStyles.actionLeft}>
              <View style={swipeStyles.actionPill}>
                <CheckCircle size={16} color={Material3Colors.light.primary} />
                <Text style={swipeStyles.actionText}>{reminder.repeatType === 'none' ? 'Done' : 'Complete'}</Text>
              </View>
            </View>
          )}
          {showRightAction && (
            <View style={swipeStyles.actionRight}>
              <View style={[swipeStyles.actionPill, { backgroundColor: Material3Colors.light.errorContainer }] }>
                <Trash2 size={16} color={Material3Colors.light.error} />
                <Text style={[swipeStyles.actionText, { color: Material3Colors.light.error }]}>Delete</Text>
              </View>
            </View>
          )}
        </View>
      )}
      <Animated.View
        style={{
          height: isRemoving ? containerHeight : undefined,
          marginBottom: containerMargin,
          overflow: 'hidden',
          zIndex: isRemoving ? -1 : 0,
        }}
        onLayout={(e) => {
          const h = (e.nativeEvent as any).layout?.height ?? 0;
          const numericH = typeof h === 'number' ? h : 0;
          measuredHeightRef.current = numericH;
          if (!isRemoving) {
            containerHeight.setValue(numericH);
            const baseMargin = 7;
            const heightFactor = numericH > 0 ? Math.min(1, 80 / numericH) : 1;
            const calculatedMargin = Math.max(4, Math.round(baseMargin + heightFactor * 2));
            setDynamicMargin(calculatedMargin);
            containerMargin.setValue(calculatedMargin);
          }
        }}
        testID={`row-container-${reminder.id}`}
      >
        <Animated.View style={{ transform: [{ translateX }, { scale }], opacity }} {...panResponder.panHandlers}>
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the reminder data actually changed
  return prevProps.reminder.id === nextProps.reminder.id &&
         JSON.stringify(prevProps.reminder) === JSON.stringify(nextProps.reminder) &&
         prevProps.onSwipeLeft === nextProps.onSwipeLeft &&
         prevProps.onSwipeRight === nextProps.onSwipeRight;
});

const swipeStyles = StyleSheet.create({
  wrapper: { position: 'relative' },
  actions: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  actionLeft: { alignItems: 'flex-start' },
  actionRight: { alignItems: 'flex-end' },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Material3Colors.light.primaryContainer, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  actionText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Material3Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: Material3Colors.light.surface,
    elevation: 2,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: Material3Colors.light.onSurface,
    letterSpacing: 0,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.surfaceVariant,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  createAlarmButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 6,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  tabContainer: {
    backgroundColor: Material3Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Material3Colors.light.outlineVariant,
    paddingVertical: 8,
  },
  tabScrollView: {
    flexGrow: 0,
  },
  tabScrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  tabHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 0,
    alignItems: 'center',
    minWidth: 120,
  },
  tabHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTabHeader: {
    borderBottomWidth: 3,
    borderBottomColor: Material3Colors.light.primary,
  },
  tabHeaderText: {
    fontSize: 14,
    fontWeight: '300',
    color: Material3Colors.light.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  activeTabHeaderText: {
    color: Material3Colors.light.primary,
    fontWeight: '400',
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Material3Colors.light.onSurfaceVariant,
    opacity: 0.7,
  },
  activeTabCount: {
    color: Material3Colors.light.primary,
    opacity: 1,
  },

  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Material3Colors.light.onSurfaceVariant,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '400',
    color: Material3Colors.light.onSurface,
  },
  emptyDescription: {
    fontSize: 16,
    color: Material3Colors.light.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  reminderCard: {
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
    elevation: 0,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  selectedCard: {
    backgroundColor: Material3Colors.light.surfaceContainer,
    borderWidth: 2,
    borderColor: Material3Colors.light.primary,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reminderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityBar: {
    width: 5,
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 2.5,
  },
  reminderInfo: {
    flex: 1,
    gap: 4,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
    lineHeight: 22,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderTime: {
    fontSize: 14,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '500',
  },
  metaSeparator: {
    fontSize: 14,
    color: Material3Colors.light.outline,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  repeatBadgeText: {
    fontSize: 12,
    color: Material3Colors.light.primary,
    fontWeight: '600',
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Material3Colors.light.tertiaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pausedText: {
    fontSize: 11,
    color: Material3Colors.light.onTertiaryContainer,
    fontWeight: '600',
  },
  reminderDetails: {
    marginTop: 2,
  },
  reminderDate: {
    fontSize: 13,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '500',
  },
  reminderDays: {
    fontSize: 13,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '500',
  },
  reminderNextOccurrence: {
    fontSize: 13,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 2,
  },
  nextReminderText: {
    fontSize: 12,
    color: Material3Colors.light.primary,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 4,
  },
  snoozeUntilText: {
    fontSize: 12,
    color: Material3Colors.light.tertiary,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 4,
  },
  reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pauseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Material3Colors.light.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Material3Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassignButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Material3Colors.light.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    backgroundColor: Material3Colors.light.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Material3Colors.light.errorContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  expiredText: {
    fontSize: 11,
    color: Material3Colors.light.onErrorContainer,
    fontWeight: '600',
  },
  snoozedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Material3Colors.light.tertiaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  snoozedText: {
    fontSize: 11,
    color: Material3Colors.light.onTertiaryContainer,
    fontWeight: '600',
  },
  snoozedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Material3Colors.light.tertiaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  snoozedTextInline: {
    fontSize: 11,
    color: Material3Colors.light.onTertiaryContainer,
    fontWeight: '600',
  },
  pausedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Material3Colors.light.tertiaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pausedTextInline: {
    fontSize: 11,
    color: Material3Colors.light.onTertiaryContainer,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Material3Colors.light.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: Material3Colors.light.outlineVariant,
  },
  closeSelectionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
    flex: 1,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectionActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.surface,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Material3Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectionCheckbox: {
    marginRight: 8,
    padding: 4,
  },
  dailyDaysContainer: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  dailyDayDisc: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Material3Colors.light.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyDayDiscActive: {
    backgroundColor: '#C8D57A',
  },
  dailyDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: Material3Colors.light.onSurfaceVariant,
  },
  dailyDayTextActive: {
    color: Material3Colors.light.primary,
  },
  nextOccurrenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reminderNextOccurrenceLarge: {
    fontSize: 14,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '500',
  },
  repeatBadgeBottom: {
    alignSelf: 'flex-start',
  },
  repeatBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
    flexWrap: 'nowrap',
  },

  dailyTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
});
