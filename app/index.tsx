import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, PanResponder, Animated, Dimensions, Easing, InteractionManager, Keyboard as RNKeyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Clock, Settings, PauseCircle, PlayCircle, CheckCircle, Trash2, RotateCcw, AlertCircle, X, Square, CheckSquare, Repeat, Keyboard } from 'lucide-react-native';
import { router } from 'expo-router';
import { useReminders, useUpdateReminder, useAddReminder, useDeleteReminder, useBulkDeleteReminders, useBulkUpdateReminders } from '@/hooks/reminder-store';
import { useSettings } from '@/hooks/settings-store';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { PRIORITY_COLORS } from '@/constants/reminders';
import { Material3Colors } from '@/constants/colors';
import { Reminder, Priority, RepeatType, EveryUnit } from '@/types/reminder';
import PrioritySelector from '@/components/PrioritySelector';
import CustomizePanel from '@/components/CustomizePanel';
import Toast from '@/components/Toast';

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
        // Scroll to position expired tab at the left, pushing active out
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
        const calculated = calculateNextReminderDate(reminder, new Date());
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
    if (reminder.repeatType === 'none') {
      // For non-repeating reminders, mark as completed
      updateReminder.mutate({
        ...reminder,
        isCompleted: true,
      });
    } else {
      // For repeating reminders, calculate next reminder date and keep active
      const nextDate = calculateNextReminderDate(reminder, new Date());
      updateReminder.mutate({
        ...reminder,
        nextReminderDate: nextDate?.toISOString(),
        lastTriggeredAt: new Date().toISOString(),
        snoozeUntil: undefined, // Clear any snooze
      });
    }
  }, [updateReminder]);

  const pauseReminder = useCallback((reminder: Reminder) => {
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
        const nextDate = calculateNextReminderDate(reminder, new Date());
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
                            const calc = calculateNextReminderDate(reminder, new Date());
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
                          const calc = calculateNextReminderDate(reminder, new Date());
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
        scrollEnabled={!showCreatePopup}
        keyboardShouldPersistTaps="handled"
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
            <Animated.View 
              style={[
                styles.section,
                {
                  transform: [{
                    translateY: scrollY.interpolate({
                      inputRange: [-150, -50, 0, 1],
                      outputRange: [-30, -10, 0, 0],
                      extrapolate: 'clamp'
                    })
                  }, {
                    scale: scrollY.interpolate({
                      inputRange: [-150, -50, 0, 1],
                      outputRange: [1.08, 1.03, 1, 1],
                      extrapolate: 'clamp'
                    })
                  }]
                }
              ]}
            >
              {activeReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} listType="active" />
              ))}
            </Animated.View>
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
            <Animated.View 
              style={[
                styles.section,
                {
                  transform: [{
                    translateY: scrollY.interpolate({
                      inputRange: [-150, -50, 0, 1],
                      outputRange: [-30, -10, 0, 0],
                      extrapolate: 'clamp'
                    })
                  }, {
                    scale: scrollY.interpolate({
                      inputRange: [-150, -50, 0, 1],
                      outputRange: [1.08, 1.03, 1, 1],
                      extrapolate: 'clamp'
                    })
                  }]
                }
              ]}
            >
              {completedReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} listType="completed" />
              ))}
            </Animated.View>
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
            <Animated.View 
              style={[
                styles.section,
                {
                  transform: [{
                    translateY: scrollY.interpolate({
                      inputRange: [-150, -50, 0, 1],
                      outputRange: [-30, -10, 0, 0],
                      extrapolate: 'clamp'
                    })
                  }, {
                    scale: scrollY.interpolate({
                      inputRange: [-150, -50, 0, 1],
                      outputRange: [1.08, 1.03, 1, 1],
                      extrapolate: 'clamp'
                    })
                  }]
                }
              ]}
            >
              {expiredReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} listType="expired" />
              ))}
            </Animated.View>
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

          addReminder.mutate({
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
          }, {
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
    if (visible) {
      mainContentSlide.setValue(0);
      if (mode === 'create') {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            titleInputRef.current?.focus();
          }, 50);
        });
      }
    }
  }, [visible, mainContentSlide, mode]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={createPopupStyles.overlay} 
        activeOpacity={1} 
        onPress={() => {
          RNKeyboard.dismiss();
          onClose();
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[createPopupStyles.popup, { height: popupHeight }]
        }>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
            style={{ maxHeight: '100%' }}
            keyboardShouldPersistTaps="handled"
          >
              <View style={createPopupStyles.mainContent}>
              <View style={createPopupStyles.section}>
                <TextInput
                  ref={titleInputRef}
                  style={createPopupStyles.titleInput}
                  placeholder="Enter reminder"
                  value={title}
                  onChangeText={onTitleChange}
                  maxLength={100}
                  autoFocus={mode === 'create'}
                  testID="title-input"
                />
              </View>
              
              <View style={[createPopupStyles.section, { marginBottom: 6 }]}> 
                <CustomizePanel
                  repeatType={repeatType}
                  repeatDays={repeatDays}
                  onRepeatTypeChange={onRepeatTypeChange}
                  onRepeatDaysChange={onRepeatDaysChange}
                  selectedDate={selectedDate}
                  onDateChange={(date) => {
                    onDateChange(date);
                    if (repeatType === 'none' || repeatType === 'monthly' || repeatType === 'yearly') {
                      try {
                        RNKeyboard.dismiss();
                        onTimeSelect();
                      } catch (e) {
                        console.log('open time selector error', e);
                      }
                    }
                  }}
                  onOpenTime={() => { RNKeyboard.dismiss(); onTimeSelect(); }}
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
        </TouchableOpacity>
      </TouchableOpacity>
      
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
    minHeight: 250,
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
  }, [visible, activeSection, currentHour, currentMinute]); // Remove currentHour and currentMinute to prevent jitter
  const [rotation, setRotation] = useState<number>(0);
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualTimeInput, setManualTimeInput] = useState<string>('');
  const [discSize] = useState<number>(220);
  
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
  
  const HOUR_SENSITIVITY = 1.0;
  const MINUTE_SENSITIVITY = 1.0;
  const DEADBAND_DEG = 1.5;
  const DECAY_FRICTION = 0.85;
  const MIN_DECAY_VELOCITY = 0.3;
  const VELOCITY_THRESHOLD = 0.15; // Minimum velocity to trigger momentum
  const SNAP_THRESHOLD = 0.08; // Below this velocity, snap to nearest value
  const SNAP_DURATION = 200; // Duration of snap animation in ms
  
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
  
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt, gestureState) => {
      isDragging.current = true;
      rotationRef.current = rotation;
      measureCenter();
      
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
      
      const px = (evt.nativeEvent as any)?.pageX ?? (gestureState as any).moveX ?? 0;
      const py = (evt.nativeEvent as any)?.pageY ?? (gestureState as any).moveY ?? 0;
      const cx = centerRef.current.x;
      const cy = centerRef.current.y;
      const angle = Math.atan2(py - cy, px - cx);
      const degrees = (angle * 180 / Math.PI + 90 + 360) % 360;
      lastAngle.current = degrees;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (!isDragging.current) return;
      const currentTime = Date.now();
      const px = (gestureState as any).moveX ?? (evt.nativeEvent as any)?.pageX ?? 0;
      const py = (gestureState as any).moveY ?? (evt.nativeEvent as any)?.pageY ?? 0;
      const cx = centerRef.current.x;
      const cy = centerRef.current.y;
      const angle = Math.atan2(py - cy, px - cx);
      const degrees = (angle * 180 / Math.PI + 90 + 360) % 360;
      let delta = degrees - lastAngle.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
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
      rotationRef.current = (rotationRef.current + delta + 360) % 360;
      lastAngle.current = degrees;
      // Update rotation immediately for smooth dragging
      const r = rotationRef.current % 360;
      setRotation(r);
      
      // Debounce value updates to prevent jitter
      if (!framePending.current) {
        framePending.current = true;
        requestAnimationFrame(() => {
          const currentR = rotationRef.current % 360;
          if (activeSection === 'hour') {
            const hourStep = 360 / 12;
            const hourIndex = Math.round(currentR / hourStep) % 12;
            const newHour = hourIndex === 0 ? 12 : hourIndex;
            if (newHour !== currentHour) {
              setCurrentHour(newHour);
            }
          } else {
            const minuteStep = 360 / 60;
            const minuteIndex = Math.round(currentR / minuteStep) % 60;
            if (minuteIndex !== currentMinute) {
              setCurrentMinute(minuteIndex);
            }
          }
          framePending.current = false;
        });
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
          
          decayAnimation.current = setInterval(() => {
            if (Math.abs(currentVelocity) < MIN_DECAY_VELOCITY) {
              if (decayAnimation.current) {
                clearInterval(decayAnimation.current);
                decayAnimation.current = null;
              }
              stoppedByFriction.current = true;
              return;
            }
            
            rotationRef.current = (rotationRef.current + currentVelocity + 360) % 360;
            const r = rotationRef.current % 360;
            setRotation(r);
            
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
      const isMajor = activeSection === 'hour' || i % 5 === 0;
      const tickLength = isMajor ? 12 : 6;
      const tickWidth = isMajor ? 2 : 1;
      const x = radius * Math.sin(angle * Math.PI / 180);
      const y = -radius * Math.cos(angle * Math.PI / 180);
      
      const labelValue = activeSection === 'hour' ? (i === 0 ? 12 : i) : i;
      const labelRadius = radius - 24;
      const labelX = labelRadius * Math.sin(angle * Math.PI / 180);
      const labelY = -labelRadius * Math.cos(angle * Math.PI / 180);
      
      const isSelected = activeSection === 'hour'
        ? labelValue === currentHour
        : labelValue === currentMinute;
      
      ticks.push(
        <View
          key={`tick-${i}`}
          style={{
            position: 'absolute',
            left: discSize / 2 - tickWidth / 2 + x,
            top: discSize / 2 - tickLength / 2 + y,
            width: tickWidth,
            height: tickLength,
            backgroundColor: isSelected ? Material3Colors.light.primary : '#BDBDBD',
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      );
      
      if (isMajor) {
        ticks.push(
          <Text
            key={`label-${i}`}
            style={{
              position: 'absolute',
              left: discSize / 2 - 15 + labelX,
              top: discSize / 2 - 15 + labelY,
              width: 30,
              height: 30,
              textAlign: 'center',
              lineHeight: 30,
              fontSize: 16,
              fontWeight: isSelected ? 'bold' : 'normal',
              color: isSelected ? Material3Colors.light.primary : '#616161',
            }}
          >
            {labelValue}
          </Text>
        );
      }
    }
    return ticks;
  };
  
  const handRotation = rotation;
  const handLength = activeSection === 'hour' ? discSize / 2 * 0.6 : discSize / 2 * 0.8;
  
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={timeSelectorStyles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[timeSelectorStyles.container, isLandscape && timeSelectorStyles.containerLandscape]}
        >
          <View style={timeSelectorStyles.header}>
            <Text style={timeSelectorStyles.headerText}>Select Time</Text>
          </View>
          
          <View style={[timeSelectorStyles.content, isLandscape && timeSelectorStyles.contentLandscape]}>
            <View style={timeSelectorStyles.displayContainer}>
              <TouchableOpacity onPress={() => handleSectionPress('hour')}> 
                <Text style={[timeSelectorStyles.timeText, activeSection === 'hour' && timeSelectorStyles.activeTimeText]}>
                  {currentHour.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
              <Text style={timeSelectorStyles.separator}>:</Text>
              <TouchableOpacity onPress={() => handleSectionPress('minute')}> 
                <Text style={[timeSelectorStyles.timeText, activeSection === 'minute' && timeSelectorStyles.activeTimeText]}>
                  {currentMinute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
              <View style={timeSelectorStyles.ampmContainer}>
                <TouchableOpacity onPress={() => setCurrentAMPM(true)}>
                  <Text style={[timeSelectorStyles.ampmText, currentAMPM && timeSelectorStyles.activeAmPmText]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCurrentAMPM(false)}>
                  <Text style={[timeSelectorStyles.ampmText, !currentAMPM && timeSelectorStyles.activeAmPmText]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {!showManualEntry ? (
              <View 
                ref={discRef}
                style={[timeSelectorStyles.disc, { width: discSize, height: discSize }]}
                {...panResponder.panHandlers}
                onLayout={measureCenter}
              >
                {renderTickMarks()}
                <View style={[timeSelectorStyles.hand, { height: handLength, transform: [{ rotate: `${handRotation}deg` }] }]} />
                <View style={timeSelectorStyles.centerDot} />
              </View>
            ) : (
              <View style={timeSelectorStyles.manualInputContainer}>
                <TextInput
                  style={timeSelectorStyles.manualInput}
                  placeholder="HH:MM"
                  keyboardType="numeric"
                  value={manualTimeInput}
                  onChangeText={setManualTimeInput}
                  maxLength={5}
                  autoFocus
                />
              </View>
            )}
          </View>
          
          <View style={timeSelectorStyles.footer}>
            <TouchableOpacity onPress={() => setShowManualEntry(!showManualEntry)}>
              <Keyboard size={24} color={Material3Colors.light.primary} />
            </TouchableOpacity>
            <View style={timeSelectorStyles.footerActions}>
              <TouchableOpacity style={timeSelectorStyles.button} onPress={onClose}>
                <Text style={timeSelectorStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={timeSelectorStyles.button} onPress={handleConfirm}>
                <Text style={timeSelectorStyles.buttonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

TimeSelector.displayName = 'TimeSelector';

const timeSelectorStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  containerLandscape: {
    flexDirection: 'row',
    width: '90%',
    maxWidth: 500,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  contentLandscape: {
    flex: 1,
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#BDBDBD',
    paddingHorizontal: 8,
  },
  activeTimeText: {
    color: Material3Colors.light.primary,
    fontWeight: '400',
  },
  separator: {
    fontSize: 48,
    fontWeight: '300',
    color: '#BDBDBD',
  },
  ampmContainer: {
    marginLeft: 16,
  },
  ampmText: {
    fontSize: 18,
    color: '#BDBDBD',
    paddingVertical: 4,
  },
  activeAmPmText: {
    color: Material3Colors.light.primary,
    fontWeight: '600',
  },
  disc: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  hand: {
    position: 'absolute',
    bottom: '50%',
    left: '50%',
    width: 2,
    backgroundColor: Material3Colors.light.primary,
    transformOrigin: 'bottom center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Material3Colors.light.primary,
    position: 'absolute',
  },
  manualInputContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualInput: {
    fontSize: 48,
    fontWeight: '300',
    textAlign: 'center',
    width: 200,
    borderBottomWidth: 2,
    borderBottomColor: Material3Colors.light.primary,
  },
footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    padding: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Material3Colors.light.primary,
  },
});

interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}

const SwipeableRow: React.FC<SwipeableRowProps> = ({ children, reminder, onSwipeRight, onSwipeLeft }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [cardWidth, setCardWidth] = useState(Dimensions.get('window').width);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only set responder if swiping horizontally
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: pan.x, dy: pan.y }
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        const SWIPE_THRESHOLD = cardWidth * 0.3;
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swiped right
          onSwipeRight?.();
          Animated.timing(pan, {
            toValue: { x: cardWidth, y: 0 },
            duration: 200,
            useNativeDriver: false
          }).start(() => pan.setValue({ x: 0, y: 0 }));
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swiped left
          onSwipeLeft?.();
          Animated.timing(pan, {
            toValue: { x: -cardWidth, y: 0 },
            duration: 200,
            useNativeDriver: false
          }).start(() => pan.setValue({ x: 0, y: 0 }));
        } else {
          // Didn't meet threshold, spring back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false
          }).start();
        }
      },
    })
  ).current;

  const onLayout = (event: any) => {
    setCardWidth(event.nativeEvent.layout.width);
  };

  const cardOpacity = pan.x.interpolate({
    inputRange: [-cardWidth, 0, cardWidth],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp'
  });

  return (
    <View onLayout={onLayout}>
      <Animated.View
        style={{
          transform: [{ translateX: pan.x }],
          opacity: cardOpacity
        }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

SwipeableRow.displayName = 'SwipeableRow';

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
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Material3Colors.light.onBackground,
  },
  settingsButton: {
    padding: 8,
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  tabScrollView: {
    flexGrow: 0,
  },
  tabScrollContent: {
    alignItems: 'flex-start',
  },
  tabHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: Material3Colors.light.surfaceContainer,
  },
  activeTabHeader: {
    backgroundColor: Material3Colors.light.primary,
  },
  tabHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Material3Colors.light.onSurfaceVariant,
  },
  activeTabHeaderText: {
    color: Material3Colors.light.onPrimary,
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Material3Colors.light.onSurfaceVariant,
    backgroundColor: Material3Colors.light.surfaceContainerHigh,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    textAlign: 'center',
  },
  activeTabCount: {
    color: Material3Colors.light.primary,
    backgroundColor: Material3Colors.light.onPrimary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: Material3Colors.light.onSurface,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Material3Colors.light.onSurface,
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: Material3Colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
  reminderCard: {
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
  },
  selectedCard: {
    borderColor: Material3Colors.light.primary,
    borderWidth: 2,
  },
  reminderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
  },
  selectionCheckbox: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBar: {
    width: 6,
  },
  reminderInfo: {
    padding: 12,
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
    marginBottom: 4,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reminderTime: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
  },
  metaSeparator: {
    color: Material3Colors.light.onSurfaceVariant,
    paddingHorizontal: 2,
  },
  repeatBadge: {
    backgroundColor: Material3Colors.light.secondaryContainer,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  repeatBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: Material3Colors.light.onSecondaryContainer,
  },
  reminderDetails: {
    marginTop: 4,
  },
  nextOccurrenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderNextOccurrenceLarge: {
    fontSize: 12,
    fontWeight: '500',
    color: Material3Colors.light.primary,
  },
  reminderDays: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
  },
dailyTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
dailyDaysContainer: {
    flexDirection: 'row',
    gap: 4,
  },
dailyDayDisc: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Material3Colors.light.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Material3Colors.light.outline,
  },
dailyDayDiscActive: {
    backgroundColor: Material3Colors.light.primary,
    borderColor: Material3Colors.light.primary,
  },
dailyDayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Material3Colors.light.onSurfaceVariant,
  },
dailyDayTextActive: {
    color: Material3Colors.light.onPrimary,
  },
repeatBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
repeatBadgeBottom: {},
snoozedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Material3Colors.light.tertiaryContainer,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
snoozedTextInline: {
    fontSize: 10,
    fontWeight: '500',
    color: Material3Colors.light.onTertiaryContainer,
  },
pausedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Material3Colors.light.surfaceContainerHigh,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
pausedTextInline: {
    fontSize: 10,
    fontWeight: '500',
    color: Material3Colors.light.onSurfaceVariant,
  },
snoozeUntilText: {
    fontSize: 12,
    color: Material3Colors.light.tertiary,
    marginTop: 4,
  },
nextReminderText: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    marginTop: 4,
  },
expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
expiredText: {
    fontSize: 12,
    color: Material3Colors.light.error,
    fontWeight: '500',
  },
reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
resumeButton: {
    padding: 8,
  },
pauseButton: {
    padding: 8,
  },
doneButton: {
    padding: 8,
    backgroundColor: Material3Colors.light.primary,
    borderRadius: 99,
    marginLeft: 8,
  },
reassignButton: {
    padding: 8,
  },
bottomContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 10,
  },
createAlarmButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Material3Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Material3Colors.light.surfaceContainerHigh,
    borderBottomWidth: 1,
    borderBottomColor: Material3Colors.light.outlineVariant,
  },
closeSelectionButton: {
    padding: 8,
    marginRight: 16,
  },
selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
    flex: 1,
  },
selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
selectionActionButton: {
    padding: 8,
  },
});