import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Alert, Modal, TextInput, Dimensions, InteractionManager, Keyboard as RNKeyboard, Platform, PanResponder, StatusBar, KeyboardAvoidingView, Animated, LayoutChangeEvent, FlatList, NativeModules } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReminders, useUpdateReminder, useAddReminder, useDeleteReminder, useBulkDeleteReminders, useBulkUpdateReminders, usePermanentlyDeleteReminder, useRestoreReminder } from '@/hooks/reminder-store';
import { useSettings } from '@/hooks/settings-store';
import { calculateNextReminderDate } from '@/services/reminder-utils';
import { CHANNEL_IDS } from '@/services/channels';
import { PRIORITY_COLORS } from '@/constants/reminders';
import { Material3Colors } from '@/constants/colors';
import { Reminder, Priority, RepeatType, EveryUnit } from '@/types/reminder';
import PrioritySelector from '@/components/PrioritySelector';
import CustomizePanel, { CalendarModal } from '@/components/CustomizePanel';
import { showToast } from '@/utils/toast';
import SwipeableRow from '@/components/SwipeableRow';
import OnboardingFlow from '@/components/OnboardingFlow';

// Icon components (declared after all imports to satisfy import/first)
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
const HelpCircle = (props: any) => <Feather name="help-circle" {...props} />;
const Keyboard = (props: any) => <MaterialIcons name="keyboard" {...props} />;
const Speaker = (props: any) => <Feather name="volume-2" {...props} />;

// Debounce helper to batch rapid updates and prevent flickering
let updateTimeoutId: ReturnType<typeof setTimeout> | null = null;

const ONBOARDING_STORAGE_KEY = 'dominder_onboarding_completed';

const debouncedUpdate = (callback: () => void, delay: number = 50) => {
  if (updateTimeoutId) {
    clearTimeout(updateTimeoutId);
  }
  updateTimeoutId = setTimeout(() => {
    callback();
    updateTimeoutId = null;
  }, delay);
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
  const insets = useSafeAreaInsets();
  const { data: reminders = [], isLoading } = useReminders();
  const { data: settings } = useSettings();
  const use24HourFormat = settings?.use24HourFormat ?? false;
  const weekStartDay = settings?.weekStartDay ?? 0;
  const weekdayOrder = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => (weekStartDay + i) % 7);
  }, [weekStartDay]);
  const weekdayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const bulkDeleteReminders = useBulkDeleteReminders();
  const bulkUpdateReminders = useBulkUpdateReminders();
  const permanentlyDeleteReminder = usePermanentlyDeleteReminder();
  const restoreReminder = useRestoreReminder();
  const [showCreatePopup, setShowCreatePopup] = useState<boolean>(false);
  const [draftReminderId, setDraftReminderId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'deleted'>('active');

  // Multi-select state
  const [multiSelectEnabled, setMultiSelectEnabled] = useState<boolean>(false);
  const [multiSelectDates, setMultiSelectDates] = useState<string[]>([]);
  const [multiSelectDays, setMultiSelectDays] = useState<number[]>([]);

  // Tab animation state
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number, width: number }>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const handleTabLayout = useCallback((tab: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts(prev => {
      if (prev[tab]?.x === x && prev[tab]?.width === width) return prev;
      return { ...prev, [tab]: { x, width } };
    });
  }, []);

  useEffect(() => {
    const layout = tabLayouts[activeTab];
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: layout.x,
          useNativeDriver: false,
          friction: 8,
          tension: 50,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          friction: 8,
          tension: 50,
        }),
      ]).start();
    }
  }, [activeTab, tabLayouts]);

  const contentScrollRef = useRef<FlashList<any>>(null);
  const swipeableRefs = useRef<Map<string, any>>(new Map());
  // Toast state removed - now using native Android toast
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    const defaultTime = calculateDefaultTime();
    return defaultTime.time;
  });
  const [isAM, setIsAM] = useState<boolean>(() => {
    const defaultTime = calculateDefaultTime();
    return defaultTime.isAM;
  });
  // Separate state for "Ends" time selection
  const [untilTime, setUntilTime] = useState<string>(() => {
    const defaultTime = calculateDefaultTime();
    return defaultTime.time;
  });
  const [untilIsAM, setUntilIsAM] = useState<boolean>(() => {
    const defaultTime = calculateDefaultTime();
    return defaultTime.isAM;
  });
  const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);
  // Track which time we are editing in the shared TimeSelector
  const [timeSelectorContext, setTimeSelectorContext] = useState<'start' | 'until'>('start');
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

  // Until controls for repeating reminders
  const [untilType, setUntilType] = useState<'none' | 'endsAt' | 'count'>('none');
  const [untilDate, setUntilDate] = useState<string>('');
  const [untilCount, setUntilCount] = useState<number>(1);

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [pauseUntilCalendarVisible, setPauseUntilCalendarVisible] = useState<boolean>(false);
  const [pauseUntilReminder, setPauseUntilReminder] = useState<Reminder | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  // Use ref to always access latest selection mode state
  const isSelectionModeRef = React.useRef<boolean>(false);
  // Prevent the immediate onPress firing right after onLongPress
  const suppressNextPressRef = React.useRef<boolean>(false);
  // Track if any deletion is in progress to prevent extraData updates
  const isDeletingRef = React.useRef<boolean>(false);
  // Timestamp for extraData - updates only during selection mode to trigger re-renders
  const [selectionTimestamp, setSelectionTimestamp] = React.useState<number | null>(null);

  // Sync ref with state and manage selection timestamp
  React.useEffect(() => {
    isSelectionModeRef.current = isSelectionMode;
    console.log('[Selection] Mode changed:', isSelectionMode, 'Selected count:', selectedReminders.size);
    // Update timestamp when entering selection mode or when selections change during selection mode
    // BUT only if not currently deleting
    if (isSelectionMode && !isDeletingRef.current) {
      setSelectionTimestamp(Date.now());
    } else if (!isSelectionMode) {
      setSelectionTimestamp(null);
    }
  }, [isSelectionMode, selectedReminders.size]);

  const [selectionTab, setSelectionTab] = useState<'active' | 'completed' | 'deleted' | null>(null);

  const [historyPopupVisible, setHistoryPopupVisible] = useState(false);
  const [historyPopupData, setHistoryPopupData] = useState<string[]>([]);

  const [multiDatesPopupVisible, setMultiDatesPopupVisible] = useState(false);
  const [multiDatesPopupData, setMultiDatesPopupData] = useState<string[]>([]);
  const [multiDatesPopupTitle, setMultiDatesPopupTitle] = useState('');

  const openMultiDatesPopup = useCallback((dates: string[], title: string) => {
    const sorted = [...dates].sort((a, b) => a.localeCompare(b));
    setMultiDatesPopupData(sorted);
    setMultiDatesPopupTitle(title);
    setMultiDatesPopupVisible(true);
  }, []);

  const openHistoryPopup = useCallback((history: string[]) => {
    // Sort history by date descending
    const sorted = [...history].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    setHistoryPopupData(sorted);
    setHistoryPopupVisible(true);
  }, []);

  const addReminder = useAddReminder();

  const scrollToTab = useCallback((tab: 'active' | 'completed' | 'deleted') => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!alive) return;
        if (stored !== 'true') {
          setShowOnboarding(true);
        }
      } catch {
        if (!alive) return;
        setShowOnboarding(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch { }
    setShowOnboarding(false);
  }, []);

  const openOnboardingPreview = useCallback(() => {
    setShowCreatePopup(false);
    setShowOnboarding(true);
  }, []);







  const activeReminders = React.useMemo(() => {
    const sortMode = settings?.sortMode ?? 'creation';
    const active = reminders.filter(r => r.isActive && !r.isCompleted && !r.isExpired && !r.isDeleted);

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
  }, [reminders, settings?.sortMode]);
  const completedReminders = React.useMemo(() => {
    const completed = reminders.filter(r => r.isCompleted && !r.isDeleted);
    // Sort by when they were completed (using lastTriggeredAt or createdAt as fallback)
    return completed.sort((a, b) => {
      const dateA = a.lastTriggeredAt ? new Date(a.lastTriggeredAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.lastTriggeredAt ? new Date(b.lastTriggeredAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA; // Most recently completed first
    });
  }, [reminders]);

  const deletedReminders = React.useMemo(() => {
    const deleted = reminders.filter(r => r.isDeleted);
    // Sort by creation date (most recently created first)
    return deleted.sort((a, b) => {
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      return createdB - createdA; // Most recently created first
    });
  }, [reminders]);

  // Use useMemo to derive current list without causing re-renders
  const currentList = React.useMemo(() => {
    switch (activeTab) {
      case 'active':
        return activeReminders;
      case 'completed':
        return completedReminders;
      case 'deleted':
        return deletedReminders;
      default:
        return activeReminders;
    }
  }, [activeTab, activeReminders, completedReminders, deletedReminders]);

  const completeReminder = useCallback((reminder: Reminder) => {
    if (reminder.repeatType === 'none') {
      // For non-repeating reminders, mark as completed
      updateReminder.mutate({
        ...reminder,
        isCompleted: true,
        lastTriggeredAt: new Date().toISOString(),
      });
    } else {
      // For repeating reminders:
      // 1. Calculate next date
      const nextDate = calculateNextReminderDate(reminder);
      const hasEndCondition = reminder.untilType === 'count' || reminder.untilType === 'endsAt';
      const historyId = `${reminder.id}_hist`;
      const completionTime = new Date().toISOString();

      if (!nextDate && hasEndCondition) {
        // Final occurrence: Merge existing history + current time, delete history item, mark main as completed
        const existingHistory = reminders.find(r => r.id === historyId);
        const historyTimes = existingHistory?.completionHistory || [];

        // Add current completion time for the final occurrence
        historyTimes.push(completionTime);

        if (existingHistory) {
          // Permanently delete the history item so it doesn't show in Deleted tab
          permanentlyDeleteReminder.mutate(existingHistory.id);
        }

        updateReminder.mutate({
          ...reminder,
          isCompleted: true,
          isActive: false,
          lastTriggeredAt: completionTime,
          completionHistory: historyTimes,
          nextReminderDate: undefined,
          snoozeUntil: undefined,
        });
      } else {
        // Intermediate occurrence: Update/Create history item
        const existingHistory = reminders.find(r => r.id === historyId);

        if (existingHistory) {
          updateReminder.mutate({
            ...existingHistory,
            lastTriggeredAt: completionTime,
            completionHistory: [...(existingHistory.completionHistory || []), completionTime],
            title: reminder.title,
            priority: reminder.priority
          });
        } else {
          addReminder.mutate({
            ...reminder,
            id: historyId,
            parentId: reminder.id,
            isCompleted: true, // Shows in completed tab
            isActive: false,
            // Keep repeatType for UI (badge)
            snoozeUntil: undefined,
            wasSnoozed: undefined,
            lastTriggeredAt: completionTime,
            completionHistory: [completionTime],
            createdAt: new Date().toISOString(),
            nextReminderDate: undefined,
            notificationId: undefined
          });
        }

        // Schedule next occurrence on main reminder
        updateReminder.mutate({
          ...reminder,
          nextReminderDate: nextDate?.toISOString(),
          lastTriggeredAt: completionTime,
          snoozeUntil: undefined,
        });
      }
    }
  }, [updateReminder, addReminder, permanentlyDeleteReminder, reminders]);

  // Complete all occurrences (used for swipe action)
  const completeAllOccurrences = useCallback((reminder: Reminder) => {
    // For repeating reminders, this is a "Stop Series" action.
    // Merge existing history, but do NOT add current time (as per user request "no time updation required").
    // Mark main reminder as completed (Final).

    if (reminder.repeatType !== 'none') {
      const historyId = `${reminder.id}_hist`;
      const existingHistory = reminders.find(r => r.id === historyId);
      const historyTimes = existingHistory?.completionHistory || [];

      if (existingHistory) {
        // Permanently delete the history item so it doesn't show in Deleted tab
        permanentlyDeleteReminder.mutate(existingHistory.id);
      }

      updateReminder.mutate({
        ...reminder,
        isCompleted: true,
        isActive: false,
        completionHistory: historyTimes,
        // Keep lastTriggeredAt as is (or update? user said no time updation required).
        // Let's keep it as is.
        snoozeUntil: undefined,
        nextReminderDate: undefined,
      });
    } else {
      updateReminder.mutate({
        ...reminder,
        isCompleted: true,
        lastTriggeredAt: new Date().toISOString(),
      });
    }
  }, [updateReminder, permanentlyDeleteReminder, reminders]);

  const pauseReminder = useCallback((reminder: Reminder) => {
    // When resuming (isPaused is currently true), clear pauseUntilDate
    const updates = reminder.isPaused
      ? { isPaused: false, pauseUntilDate: undefined }
      : { isPaused: true };
    updateReminder.mutate({ ...reminder, ...updates });
  }, [updateReminder]);

  const handlePauseUntilDate = useCallback((date: string) => {
    if (!pauseUntilReminder) return;

    // Validate against end date if exists
    if (pauseUntilReminder.untilType === 'endsAt' && pauseUntilReminder.untilDate) {
      const selectedDate = new Date(date);
      const endDate = new Date(pauseUntilReminder.untilDate);
      selectedDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (selectedDate > endDate) {
        showToast('Pause date cannot be after the end date');
        setPauseUntilCalendarVisible(false);
        setPauseUntilReminder(null);
        return;
      }
    }

    // Set pause until date and mark as paused
    updateReminder.mutate({
      ...pauseUntilReminder,
      isPaused: true,
      pauseUntilDate: date
    });

    setPauseUntilCalendarVisible(false);
    setPauseUntilReminder(null);
  }, [pauseUntilReminder, updateReminder]);

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
          [{
            text: 'OK', onPress: () => {
              updateReminder.mutate({
                ...reminder,
                isCompleted: false,
                isActive: true,
                isPaused: false,
              });
            }
          }]
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
    setDraftReminderId(reminder.id);
    setTitle(reminder.title);
    setPriority(reminder.priority);
    setRepeatType(reminder.repeatType);
    setRepeatDays(reminder.repeatDays ?? []);
    setEveryValue(reminder.everyInterval?.value ?? 1);
    setEveryUnit(reminder.everyInterval?.unit ?? 'hours');
    setSelectedDate(reminder.date);

    // Multi-select fields
    setMultiSelectEnabled(reminder.multiSelectEnabled ?? false);
    const sortedDates = [...(reminder.multiSelectDates ?? [])].sort((a, b) => a.localeCompare(b));
    setMultiSelectDates(sortedDates);
    setMultiSelectDays(reminder.multiSelectDays ?? []);

    // Prefill Until fields
    setUntilType((reminder.untilType ?? 'none') as 'none' | 'endsAt' | 'count');
    setUntilDate(reminder.untilDate ?? '');
    setUntilCount(reminder.untilCount ?? 1);

    const { hh, mm, isAM } = to12h(reminder.time);
    setSelectedTime(`${hh}:${mm}`);
    setIsAM(isAM);

    // Prefill Until time if present OR windowEndTime if multi-select
    if (reminder.multiSelectEnabled && reminder.windowEndTime) {
      const u = to12h(reminder.windowEndTime);
      setUntilTime(`${u.hh}:${u.mm}`);
      setUntilIsAM(u.isAM);
    } else if (reminder.untilTime) {
      const u = to12h(reminder.untilTime);
      setUntilTime(`${u.hh}:${u.mm}`);
      setUntilIsAM(u.isAM);
    } else {
      const def = calculateDefaultTime();
      setUntilTime(def.time);
      setUntilIsAM(def.isAM);
    }
    setShowCreatePopup(true);
  }, [to12h]);

  const handleDelete = useCallback((reminder: Reminder) => {
    // Mark deletion in progress to prevent extraData updates that would interrupt animation
    isDeletingRef.current = true;

    // Find associated history items (children) to delete as well
    const childrenToDelete = reminders.filter(r => r.parentId === reminder.id).map(r => r.id);
    const idsToDelete = [reminder.id, ...childrenToDelete];

    // Allow extraData updates again after animation completes (typically 600ms)
    setTimeout(() => {
      isDeletingRef.current = false;
    }, 650);

    // Use bulk delete to remove parent + all history children
    bulkDeleteReminders.mutate(idsToDelete);
  }, [bulkDeleteReminders, reminders]);

  const handlePermanentDelete = useCallback((reminder: Reminder) => {
    // Mark deletion in progress to prevent extraData updates that would interrupt animation
    isDeletingRef.current = true;
    setTimeout(() => {
      isDeletingRef.current = false;
    }, 650);
    permanentlyDeleteReminder.mutate(reminder.id);
  }, [permanentlyDeleteReminder]);

  const handleRestore = useCallback((reminder: Reminder) => {
    restoreReminder.mutate(reminder.id);
  }, [restoreReminder]);

  const handleLongPress = useCallback((reminderId: string, tab: 'active' | 'completed' | 'deleted') => {
    console.log('[Selection] Long press on:', reminderId, 'Current mode:', isSelectionModeRef.current);
    // Suppress the subsequent onPress triggered after a long press
    suppressNextPressRef.current = true;
    if (!isSelectionModeRef.current) {
      console.log('[Selection] Entering selection mode');
      isSelectionModeRef.current = true;
      setIsSelectionMode(true);
      setSelectionTab(tab);
      setSelectedReminders(new Set([reminderId]));
    }
  }, []);

  const handleCardPress = useCallback((reminder: Reminder) => {
    console.log('[Selection] Card press:', reminder.id, 'Mode:', isSelectionModeRef.current, 'Suppress:', suppressNextPressRef.current);
    // Ignore the press that follows a long-press
    if (suppressNextPressRef.current) {
      console.log('[Selection] Suppressing press after long press');
      suppressNextPressRef.current = false;
      return;
    }
    // Use ref to get latest selection mode state
    if (isSelectionModeRef.current) {
      console.log('[Selection] Toggling selection for:', reminder.id);
      setSelectedReminders(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(reminder.id)) {
          newSelected.delete(reminder.id);
          console.log('[Selection] Deselected:', reminder.id);
        } else {
          newSelected.add(reminder.id);
          console.log('[Selection] Selected:', reminder.id);
        }
        if (newSelected.size === 0) {
          console.log('[Selection] No cards selected, exiting selection mode');
          isSelectionModeRef.current = false;
          setIsSelectionMode(false);
        }
        return newSelected;
      });
    } else {
      console.log('[Selection] Opening edit for:', reminder.id);
      openEdit(reminder);
    }
  }, [openEdit]);

  const exitSelectionMode = useCallback(() => {
    isSelectionModeRef.current = false;
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
        : new Set(deletedReminders.map(r => r.id));

    const allSelected = ids.size === selectedReminders.size && Array.from(ids).every(id => selectedReminders.has(id));

    if (allSelected) {
      isSelectionModeRef.current = false;
      setSelectedReminders(new Set());
      setIsSelectionMode(false);
      setSelectionTab(null);
    } else {
      isSelectionModeRef.current = true;
      setSelectedReminders(ids);
      setIsSelectionMode(true);
      setSelectionTab(scope);
    }
  }, [selectionTab, activeTab, activeReminders, completedReminders, deletedReminders, selectedReminders]);

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
    if (use24HourFormat) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, [use24HourFormat]);

  const formatTimeFromDate = useCallback((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (use24HourFormat) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, [use24HourFormat]);

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


  const ReminderCard = memo(({
    reminder,
    listType,
    isSelected,
    isSelectionMode: selectionMode,
    use24HourFormat
  }: {
    reminder: Reminder;
    listType: 'active' | 'completed' | 'deleted';
    isSelected: boolean;
    isSelectionMode: boolean;
    use24HourFormat: boolean;
  }) => {
    const isActive = !reminder.isCompleted && !reminder.isExpired;
    const isExpired = reminder.isExpired;
    // Build formatted "Ends" label (Until)
    const endsLabel: string | null = (() => {
      if (!reminder.repeatType || reminder.repeatType === 'none') return null;
      const type = reminder.untilType ?? 'none';
      if (type === 'none') return null;
      if (type === 'count') {
        const count = reminder.untilCount ?? 0;
        const unit = count === 1 ? 'occurrence' : 'occurrences';
        return `Ends after ${count} ${unit}`;
      }
      if (type === 'endsAt' && reminder.untilDate) {
        try {
          const [y, m, d] = reminder.untilDate.split('-').map(Number);
          const dt = new Date(y, (m || 1) - 1, d || 1);
          const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const showTime = reminder.repeatType === 'every' && (reminder.everyInterval?.unit === 'minutes' || reminder.everyInterval?.unit === 'hours');
          if (showTime) {
            const timeStr = formatTime(reminder.untilTime ?? reminder.time);
            return `Ends on ${dateStr} at ${timeStr}`;
          }
          return `Ends on ${dateStr}`;
        } catch {
          return null;
        }
      }
      return null;
    })();



    const isDeleted = listType === 'deleted';
    const isCompletedOrDeleted = listType === 'completed' || listType === 'deleted';

    // Minimized single-line layout for completed and deleted
    if (isCompletedOrDeleted) {
      return (
        <SwipeableRow
          reminder={reminder}
          swipeableRefs={swipeableRefs}
          simultaneousHandlers={contentScrollRef}
          onSwipeRight={!selectionMode ? () => handlePermanentDelete(reminder) : undefined}
          onSwipeLeft={!selectionMode ? () => handlePermanentDelete(reminder) : undefined}
          isSelectionMode={selectionMode}
          leftActionType="delete"
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleCardPress(reminder)}
            onLongPress={() => handleLongPress(reminder.id, listType)}
            delayLongPress={200}
            style={[
              styles.reminderCardCompact,
              isSelected && styles.selectedCard
            ]}
            testID={`reminder-card-${reminder.id}`}
          >
            <View style={styles.reminderContentCompact}>
              <View style={styles.reminderLeftCompact}>
                {selectionMode && (
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
                <View style={[styles.priorityBarCompact, { backgroundColor: PRIORITY_COLORS[reminder.priority] }]} />
                <Text style={styles.reminderTitleCompact} numberOfLines={1} ellipsizeMode="tail">
                  {reminder.title}
                </Text>
                <Text style={styles.compactSeparator}>•</Text>
                <Text style={styles.reminderTimeCompact}>
                  {(() => {
                    // For completed history items, use lastTriggeredAt for accurate trigger time
                    if (reminder.lastTriggeredAt && (listType === 'completed' || listType === 'deleted')) {
                      const triggerDate = new Date(reminder.lastTriggeredAt);
                      return formatTimeFromDate(triggerDate);
                    }
                    return formatTime(reminder.time);
                  })()}
                </Text>
                {/* Show date for all reminders - use next occurrence for daily */}
                <>
                  <Text style={styles.compactSeparator}>•</Text>
                  <Text style={styles.reminderDateCompact} numberOfLines={1}>
                    {(() => {
                      // For completed/deleted history items, use lastTriggeredAt for accurate date
                      if (reminder.lastTriggeredAt && (listType === 'completed' || listType === 'deleted')) {
                        const triggerDate = new Date(reminder.lastTriggeredAt);
                        return triggerDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                      if (reminder.repeatType === 'daily') {
                        // For daily reminders, show next occurrence date
                        const getNextDate = () => {
                          if (reminder.snoozeUntil) return new Date(reminder.snoozeUntil);
                          if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                          const calc = calculateNextReminderDate(reminder);
                          return calc ?? null;
                        };
                        const nextDate = getNextDate();
                        if (nextDate) {
                          return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      }
                      // For other reminders, show the stored date
                      const [year, month, day] = reminder.date.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    })()}
                  </Text>
                </>

                {/* Repeat Badge (Once, Daily, Monthly, Yearly, Every) */}
                {reminder.repeatType && (
                  <>
                    <Text style={styles.compactSeparator}>•</Text>
                    <View style={[styles.repeatBadge, { paddingVertical: 1, paddingHorizontal: 6, minHeight: 0 }]}>
                      <Text style={[styles.repeatBadgeText, { fontSize: 11 }]}>
                        {formatRepeatType(reminder.repeatType, reminder.everyInterval)}
                      </Text>
                    </View>
                  </>
                )}

                {/* Interval Text for 'Every' (1m, 2h, 1d) */}
                {reminder.repeatType === 'every' && reminder.everyInterval && (
                  <>
                    <Text style={styles.compactSeparator}>•</Text>
                    <Text style={{ fontSize: 11, color: Material3Colors.light.onSurfaceVariant, fontWeight: '600' }}>
                      {reminder.everyInterval.value}
                      {reminder.everyInterval.unit === 'minutes' ? 'm' : reminder.everyInterval.unit === 'hours' ? 'h' : 'd'}
                    </Text>
                  </>
                )}
              </View>
              {/* Counter Badge for Completion History */}
              {(reminder.completionHistory && reminder.completionHistory.length > 0) && (
                <TouchableOpacity
                  style={[
                    styles.historyBadge,
                    !reminder.id.endsWith('_hist') && styles.historyBadgeFinal
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    openHistoryPopup(reminder.completionHistory!);
                  }}
                >
                  <Text style={[
                    styles.historyBadgeText,
                    !reminder.id.endsWith('_hist') && styles.historyBadgeTextFinal
                  ]}>
                    {reminder.completionHistory.length}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </SwipeableRow>
      );
    }

    // Full layout for active reminders
    return (
      <SwipeableRow
        reminder={reminder}
        swipeableRefs={swipeableRefs}
        simultaneousHandlers={contentScrollRef}
        onSwipeRight={!selectionMode ? (isDeleted ? () => handlePermanentDelete(reminder) : () => handleDelete(reminder)) : undefined}
        onSwipeLeft={!selectionMode && !isDeleted ? (isActive ? () => completeAllOccurrences(reminder) : undefined) : (isDeleted ? () => handlePermanentDelete(reminder) : undefined)}
        isSelectionMode={selectionMode}
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
              {selectionMode && (
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
                  {(reminder.repeatType === 'weekly' || reminder.repeatType === 'custom') && endsLabel && (
                    <Text style={styles.reminderNextOccurrence}>{endsLabel}</Text>
                  )}
                  {reminder.repeatType === 'daily' && !reminder.isCompleted && (
                    <>
                      <View style={styles.nextOccurrenceContainer}>
                        <Clock size={14} color={Material3Colors.light.primary} />
                        <Text style={styles.reminderNextOccurrenceLarge}>
                          {(() => {
                            const hasEndCondition = reminder.untilType === 'count' || reminder.untilType === 'endsAt';
                            const getNextDate = () => {
                              if (reminder.snoozeUntil) return new Date(reminder.snoozeUntil);
                              if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                              const calc = calculateNextReminderDate(reminder);
                              return calc ?? null;
                            };
                            const nextDate = getNextDate();

                            if (reminder.snoozeUntil) {
                              const timeStr = formatTime(new Date(reminder.snoozeUntil).toTimeString().slice(0, 5));
                              return `Snoozed until: ${timeStr}`;
                            }

                            // If no next date and has end condition, the reminder has ended
                            if (!nextDate && hasEndCondition) {
                              const lastDate = (() => {
                                if (reminder.lastTriggeredAt) return new Date(reminder.lastTriggeredAt);
                                if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                                const [year, month, day] = reminder.date.split('-').map(Number);
                                const [hours, minutes] = reminder.time.split(':').map(Number);
                                return new Date(year, month - 1, day, hours, minutes);
                              })();
                              const dateStr = lastDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              });
                              const timeStr = formatTime(lastDate.toTimeString().slice(0, 5));
                              return `Ended: ${dateStr} at ${timeStr}`;
                            }

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
                      {endsLabel && (
                        <Text style={styles.reminderNextOccurrence}>{endsLabel}</Text>
                      )}
                      <View style={styles.dailyDaysContainer}>
                        {weekdayOrder.map((day) => {
                          const selectedDays = (reminder.repeatDays && reminder.repeatDays.length > 0) ? reminder.repeatDays : [0, 1, 2, 3, 4, 5, 6];
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
                                {weekdayLetters[day]}
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
                          const hasEndCondition = reminder.untilType === 'count' || reminder.untilType === 'endsAt';
                          const getNextDate = () => {
                            if (reminder.snoozeUntil) return new Date(reminder.snoozeUntil);
                            if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                            const calc = calculateNextReminderDate(reminder);
                            return calc ?? null;
                          };
                          const nextDate = getNextDate();

                          if (reminder.snoozeUntil) {
                            const timeStr = formatTime(new Date(reminder.snoozeUntil).toTimeString().slice(0, 5));
                            return `Snoozed until: ${timeStr}`;
                          }

                          // If no next date and has end condition, the reminder has ended - show last occurrence
                          if (!nextDate && hasEndCondition) {
                            // Get last occurrence date
                            const lastDate = (() => {
                              if (reminder.lastTriggeredAt) return new Date(reminder.lastTriggeredAt);
                              if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                              // Fall back to original date/time
                              const [year, month, day] = reminder.date.split('-').map(Number);
                              const [hours, minutes] = reminder.time.split(':').map(Number);
                              return new Date(year, month - 1, day, hours, minutes);
                            })();
                            const timeStr = formatTime(lastDate.toTimeString().slice(0, 5));

                            // Multi-mode: show only time
                            if (reminder.repeatType === 'every' && reminder.multiSelectEnabled) {
                              return `Ended: ${timeStr}`;
                            }

                            const dateStr = lastDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            });
                            return `Ended: ${dateStr} at ${timeStr}`;
                          }

                          if (!nextDate) return 'Calculating...';

                          const timeStr = formatTime(nextDate.toTimeString().slice(0, 5));
                          const dateStr = nextDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });

                          // Always show date and time for all reminders
                          return `${dateStr} at ${timeStr}`;
                        })()}
                      </Text>
                    </View>
                  )}
                  {(reminder.repeatType === 'monthly' || reminder.repeatType === 'yearly') && endsLabel && (
                    <Text style={styles.reminderNextOccurrence}>{endsLabel}</Text>
                  )}

                  {/* Show explicit repeat frequency text and Ends in one line for Every reminders */}
                  {reminder.repeatType === 'every' && !reminder.isCompleted && (
                    <Text style={styles.reminderNextOccurrence}>
                      {(() => {
                        const value = reminder.everyInterval?.value ?? 1;
                        const unit = reminder.everyInterval?.unit ?? 'hours';
                        const unitLabel = value === 1 ? unit.replace(/s$/, '') : unit;
                        const repeatText = `Repeats every ${value} ${unitLabel}`;

                        // Multi-mode: show only time for ends label
                        if (reminder.multiSelectEnabled && reminder.untilType === 'endsAt' && reminder.untilTime) {
                          const endsTimeOnly = formatTime(reminder.untilTime);
                          return `${repeatText} · Ends at ${endsTimeOnly}`;
                        }

                        return endsLabel ? `${repeatText} · ${endsLabel}` : repeatText;
                      })()}
                    </Text>
                  )}


                  {/* Multi-select: Show selected days or dates */}
                  {reminder.repeatType === 'every' && reminder.multiSelectEnabled && (
                    <>
                      {/* Show day discs when days are selected */}
                      {reminder.multiSelectDays && reminder.multiSelectDays.length > 0 && (
                        <View style={styles.dailyDaysContainer}>
                          {weekdayOrder.map((day) => {
                            const dayActive = reminder.multiSelectDays!.includes(day);
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
                                  {weekdayLetters[day]}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      {/* Show selected dates when individual dates are selected */}
                      {reminder.multiSelectDates && reminder.multiSelectDates.length > 0 && (
                        <TouchableOpacity onPress={() => openMultiDatesPopup(reminder.multiSelectDates!, reminder.title)}>
                          <Text style={styles.selectedDatesText}>
                            {(() => {
                              const formatDate = (dateStr: string) => {
                                const [year, month, day] = dateStr.split('-').map(Number);
                                const date = new Date(year, month - 1, day);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              };

                              const dates = [...(reminder.multiSelectDates ?? [])].sort((a, b) => a.localeCompare(b));
                              if (dates.length <= 3) {
                                return dates.map(formatDate).join(', ');
                              }

                              // Show first 3, then +N with background
                              const displayDates = dates.slice(0, 3).map(formatDate).join(', ');
                              return (
                                <>
                                  {displayDates}{' '}
                                  <Text style={styles.selectedDatesMoreText}>+{dates.length - 3}</Text>
                                </>
                              );
                            })()}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
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
                      {/* 1b. Multi badge (for Every with multiSelectEnabled) */}
                      {reminder.repeatType === 'every' && reminder.multiSelectEnabled && (
                        <View style={[styles.repeatBadge, styles.multiBadge]}>
                          <Text style={styles.repeatBadgeText}>Multi</Text>
                        </View>
                      )}
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

                  {/* Show pause until date for Daily reminders with pauseUntilDate */}
                  {reminder.repeatType === 'daily' && reminder.pauseUntilDate && (
                    <Text style={styles.snoozeUntilText}>
                      Paused until {formatDate(reminder.pauseUntilDate)}
                    </Text>
                  )}

                  {/* Show next reminder date for Weekly and Custom reminders (not for completed or daily) */}
                  {(reminder.repeatType === 'weekly' || reminder.repeatType === 'custom') && !reminder.snoozeUntil && !reminder.isCompleted && (
                    <Text style={styles.nextReminderText}>
                      {(() => {
                        const hasEndCondition = reminder.untilType === 'count' || reminder.untilType === 'endsAt';
                        const getNextDate = () => {
                          if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                          const calc = calculateNextReminderDate(reminder);
                          return calc ?? null;
                        };
                        const nextDate = getNextDate();

                        // If no next date and has end condition, the reminder has ended - show last occurrence
                        if (!nextDate && hasEndCondition) {
                          const lastDate = (() => {
                            if (reminder.lastTriggeredAt) return new Date(reminder.lastTriggeredAt);
                            if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
                            // Fall back to original date/time
                            const [year, month, day] = reminder.date.split('-').map(Number);
                            const [hours, minutes] = reminder.time.split(':').map(Number);
                            return new Date(year, month - 1, day, hours, minutes);
                          })();
                          return `Ended: ${formatDate(lastDate.toISOString())}`;
                        }

                        if (!nextDate) return 'Next: Calculating...';

                        return `Next: ${formatDate(nextDate.toISOString())}`;
                      })()}
                    </Text>
                  )}
                </View>

                {/* Removed expired badge - no longer using expired tab */}
              </View>
            </View>

            {/* Action buttons */}
            {isActive && !isDeleted && (
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
                        // Pause the reminder
                        pauseReminder(reminder);
                        // For Daily reminders, show toast to guide users to long press feature
                        if (reminder.repeatType === 'daily') {
                          showToast('Long press to pause until');
                        }
                      }}
                      onLongPress={(e) => {
                        e.stopPropagation();
                        // Only show calendar for Daily reminders
                        if (reminder.repeatType === 'daily') {
                          setPauseUntilReminder(reminder);
                          setPauseUntilCalendarVisible(true);
                        }
                      }}
                      delayLongPress={300}
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
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  }, (prevProps, nextProps) => {
    // ID change always means different card
    if (prevProps.reminder.id !== nextProps.reminder.id) return false;
    if (prevProps.listType !== nextProps.listType) return false;

    // Check external state dependencies
    if (prevProps.isSelected !== nextProps.isSelected) return false;
    if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;
    if (prevProps.use24HourFormat !== nextProps.use24HourFormat) return false;

    const prev = prevProps.reminder;
    const next = nextProps.reminder;

    // Check ALL fields that affect visual rendering to prevent flickering
    const areDaysEqual = prev.repeatDays?.length === next.repeatDays?.length &&
      (prev.repeatDays?.every((day, i) => day === next.repeatDays?.[i]) ?? true);
    const isEveryIntervalEqual = prev.everyInterval?.value === next.everyInterval?.value &&
      prev.everyInterval?.unit === next.everyInterval?.unit;

    return prev.title === next.title &&
      prev.time === next.time &&
      prev.date === next.date &&
      prev.priority === next.priority &&
      prev.isActive === next.isActive &&
      prev.isPaused === next.isPaused &&
      prev.isCompleted === next.isCompleted &&
      prev.isExpired === next.isExpired &&
      prev.repeatType === next.repeatType &&
      prev.nextReminderDate === next.nextReminderDate &&
      prev.snoozeUntil === next.snoozeUntil &&
      prev.lastTriggeredAt === next.lastTriggeredAt &&
      prev.untilType === next.untilType &&
      prev.untilDate === next.untilDate &&
      prev.untilCount === next.untilCount &&
      areDaysEqual &&
      isEveryIntervalEqual;
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
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Clock size={48} color={Material3Colors.light.primary} />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} enabled={false}>
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.title}>DoMinder</Text>
            <View style={styles.headerActions}>
              {Platform.OS === 'web' && (
                <TouchableOpacity style={styles.settingsButton} onPress={openOnboardingPreview}>
                  <HelpCircle size={20} color={Material3Colors.light.onSurfaceVariant} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings' as any)}>
                <Settings size={20} color={Material3Colors.light.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Metro/Windows Phone 8 Style Tabs */}
          <View style={styles.metroTabContainer}>
            <View style={styles.metroTabContent}>
              <TouchableOpacity
                style={styles.metroTab}
                onPress={() => scrollToTab('active')}
                activeOpacity={0.7}
                onLayout={(e) => handleTabLayout('active', e)}
              >
                <Text style={[styles.metroTabText, activeTab === 'active' && styles.metroTabTextActive]}>
                  active reminders
                </Text>
                <Text style={[styles.metroTabCount, activeTab === 'active' && styles.metroTabCountActive]}>
                  {activeReminders.length}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metroTab}
                onPress={() => scrollToTab('completed')}
                activeOpacity={0.7}
                onLayout={(e) => handleTabLayout('completed', e)}
              >
                <Text style={[styles.metroTabText, activeTab === 'completed' && styles.metroTabTextActive]}>
                  completed
                </Text>
                <Text style={[styles.metroTabCount, activeTab === 'completed' && styles.metroTabCountActive]}>
                  {completedReminders.length}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metroTab}
                onPress={() => scrollToTab('deleted')}
                activeOpacity={0.7}
                onLayout={(e) => handleTabLayout('deleted', e)}
              >
                <Text style={[styles.metroTabText, activeTab === 'deleted' && styles.metroTabTextActive]}>
                  deleted
                </Text>
                <Text style={[styles.metroTabCount, activeTab === 'deleted' && styles.metroTabCountActive]}>
                  {deletedReminders.length}
                </Text>
              </TouchableOpacity>

              <Animated.View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: indicatorX,
                  width: indicatorWidth,
                  height: 3,
                  backgroundColor: Material3Colors.light.primary,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            </View>
            <View style={styles.metroTabDivider} />
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
                  const scope: 'active' | 'completed' | 'deleted' = selectionTab ?? activeTab;
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
          <FlashList
            ref={contentScrollRef}
            data={currentList}
            renderItem={({ item }) => (
              <ReminderCard
                reminder={item}
                listType={activeTab}
                isSelected={selectedReminders.has(item.id)}
                isSelectionMode={isSelectionMode}
                use24HourFormat={use24HourFormat}
              />
            )}
            extraData={selectionTimestamp}
            estimatedItemSize={120}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!showCreatePopup && !showOnboarding}
            ItemSeparatorComponent={() => null}
            contentContainerStyle={{
              paddingBottom: 100,
              paddingTop: 4,
              paddingHorizontal: 0,
            }}
            drawDistance={Platform.OS === 'android' ? 500 : 250}
            removeClippedSubviews={false}
            overrideItemLayout={(layout, item) => {
              if (Platform.OS === 'android') {
                layout.size = layout.size || 120;
              }
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                {activeTab === 'active' ? (
                  <>
                    <Clock size={64} color={Material3Colors.light.outline} />
                    <Text style={styles.emptyTitle}>No Active Reminders</Text>
                    <Text style={styles.emptyDescription}>
                      Tap (+) button to create a reminder
                    </Text>
                  </>
                ) : activeTab === 'completed' ? (
                  <>
                    <CheckCircle size={64} color={Material3Colors.light.outline} />
                    <Text style={styles.emptyTitle}>No Completed Reminders</Text>
                    <Text style={styles.emptyDescription}>
                      Completed reminders will appear here
                    </Text>
                  </>
                ) : (
                  <>
                    <Trash2 size={64} color={Material3Colors.light.outline} />
                    <Text style={styles.emptyTitle}>No Deleted Reminders</Text>
                    <Text style={styles.emptyDescription}>
                      Deleted reminders will appear here
                    </Text>
                  </>
                )}
              </View>
            }
            bounces={true}
            bouncesZoom={false}
            alwaysBounceVertical={true}
            overScrollMode="always"
          />

          <Modal
            visible={historyPopupVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setHistoryPopupVisible(false)}
          >
            <Pressable style={styles.historyPopupOverlay} onPress={() => setHistoryPopupVisible(false)}>
              <View style={styles.historyPopupContent} onStartShouldSetResponder={() => true}>
                <Text style={styles.historyPopupTitle}>History</Text>
                <FlatList
                  data={historyPopupData}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const d = new Date(item);
                    return (
                      <View style={styles.historyPopupItem}>
                        <Text style={styles.historyPopupItemText}>
                          {d.toLocaleDateString()} at {formatTime(d.toTimeString().slice(0, 5))}
                        </Text>
                      </View>
                    );
                  }}
                  style={styles.historyPopupList}
                  showsVerticalScrollIndicator={true}
                />
                <TouchableOpacity style={styles.closeHistoryButton} onPress={() => setHistoryPopupVisible(false)}>
                  <Text style={styles.closeHistoryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          <Modal
            visible={multiDatesPopupVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMultiDatesPopupVisible(false)}
          >
            <Pressable style={styles.historyPopupOverlay} onPress={() => setMultiDatesPopupVisible(false)}>
              <View style={styles.historyPopupContent} onStartShouldSetResponder={() => true}>
                <Text style={styles.historyPopupTitle}>Selected Dates</Text>
                <Text style={[styles.historyPopupTitle, { fontSize: 14, fontWeight: 'normal', marginBottom: 16 }]}>{multiDatesPopupTitle}</Text>
                <FlatList
                  data={multiDatesPopupData}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const [y, m, d] = item.split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    const dateStr = dt.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    return (
                      <View style={styles.historyPopupItem}>
                        <Text style={styles.historyPopupItemText}>
                          {dateStr}
                        </Text>
                      </View>
                    );
                  }}
                  style={styles.historyPopupList}
                  showsVerticalScrollIndicator={true}
                />
                <TouchableOpacity style={styles.closeHistoryButton} onPress={() => setMultiDatesPopupVisible(false)}>
                  <Text style={styles.closeHistoryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          <CreateReminderPopup
            visible={showCreatePopup}
            onClose={() => {
              setShowCreatePopup(false);
              setDraftReminderId(null);
            }}
            title={title}
            onTitleChange={setTitle}
            selectedTime={selectedTime}
            isAM={isAM}
            untilTime={untilTime}
            untilIsAM={untilIsAM}
            use24HourFormat={use24HourFormat}
            priority={priority}
            onPriorityChange={setPriority}
            repeatType={repeatType}
            onRepeatTypeChange={setRepeatType}
            repeatDays={repeatDays}
            onRepeatDaysChange={setRepeatDays}
            reminderId={editingReminder?.id ?? draftReminderId}
            everyValue={everyValue}
            everyUnit={everyUnit}
            onEveryChange={(value, unit) => {
              setEveryValue(value);
              setEveryUnit(unit);
            }}
            onTimeSelect={() => { setTimeSelectorContext('start'); setShowTimeSelector(true); }}
            onTimeChange={(time, ampm) => {
              setSelectedTime(time);
              setIsAM(ampm);
            }}
            onUntilTimeChange={(time, ampm) => {
              setUntilTime(time);
              setUntilIsAM(ampm);
            }}
            showTimeSelector={showTimeSelector}
            onCloseTimeSelector={() => setShowTimeSelector(false)}
            timeSelectorContext={timeSelectorContext}
            // Until props
            untilType={untilType}
            untilDate={untilDate}
            untilCount={untilCount}
            onUntilTypeChange={(type) => {
              setUntilType(type);
              // Set a default until date when switching to endsAt without one
              if (type === 'endsAt' && !untilDate) {
                const d = new Date();
                d.setMonth(d.getMonth() + 1);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                setUntilDate(`${yyyy}-${mm}-${dd}`);
              }
            }}
            onUntilDateChange={setUntilDate}
            onUntilCountChange={(count) => setUntilCount(Math.min(999, Math.max(1, count)))}

            onOpenUntilTime={() => { setTimeSelectorContext('until'); setShowTimeSelector(true); }}
            // Multi-select props
            multiSelectEnabled={multiSelectEnabled}
            onMultiSelectEnabledChange={setMultiSelectEnabled}
            multiSelectDates={multiSelectDates}
            onMultiSelectDatesChange={(dates) => {
              const sorted = [...dates].sort((a, b) => a.localeCompare(b));
              setMultiSelectDates(sorted);
            }}
            multiSelectDays={multiSelectDays}
            onMultiSelectDaysChange={setMultiSelectDays}
            onConfirm={() => {
              if (!title.trim()) {
                showToast('Please enter your reminder');
                return;
              }

              // Validate until date constraints
              if (repeatType !== 'none' && untilType === 'endsAt' && untilDate) {
                try {
                  const startDateTime = new Date(selectedDate);
                  startDateTime.setHours(0, 0, 0, 0);
                  const endDateTime = new Date(untilDate);
                  endDateTime.setHours(0, 0, 0, 0);
                  if (endDateTime < startDateTime) {
                    showToast('End date cannot be before start date');
                    return;
                  }
                } catch (_) {
                  // If parsing fails, let existing flows handle errors
                }
              }

              const [timeHours, timeMinutes] = selectedTime.split(':').map(Number);
              let finalHours = timeHours;
              if (!isAM && timeHours !== 12) {
                finalHours = timeHours + 12;
              } else if (isAM && timeHours === 12) {
                finalHours = 0;
              }
              const finalTime = `${finalHours.toString().padStart(2, '0')}:${timeMinutes.toString().padStart(2, '0')}`;

              // If endsAt with minutes/hours, validate end time after start time
              if (repeatType !== 'none' && untilType === 'endsAt' && untilDate) {
                const [uHours, uMinutes] = (untilTime || `${timeHours}:${timeMinutes}`).split(':').map(Number);
                let finalUHours = uHours;
                if (!untilIsAM && uHours !== 12) {
                  finalUHours = uHours + 12;
                } else if (untilIsAM && uHours === 12) {
                  finalUHours = 0;
                }
                const startDateTimeFull = new Date(selectedDate);
                const endDateTimeFull = new Date(untilDate);
                startDateTimeFull.setHours(finalHours, timeMinutes, 0, 0);
                endDateTimeFull.setHours(finalUHours, uMinutes, 0, 0);
                const withTime = repeatType === 'every' && (everyUnit === 'minutes' || everyUnit === 'hours');
                if (withTime && endDateTimeFull <= startDateTimeFull) {
                  showToast('End time must be after start time');
                  return;
                }

                // Additional validation: ensure the end window is at least one full interval
                if (repeatType === 'every' && untilType === 'endsAt') {
                  if (everyUnit === 'minutes' || everyUnit === 'hours') {
                    const intervalMs = everyUnit === 'minutes'
                      ? everyValue * 60 * 1000
                      : everyValue * 60 * 60 * 1000;
                    const diffMs = endDateTimeFull.getTime() - startDateTimeFull.getTime();
                    if (diffMs < intervalMs) {
                      showToast(`End date/time must be at least ${everyValue} ${everyUnit} after start for 'Every' repeats`);
                      return;
                    }
                  } else if (everyUnit === 'days') {
                    const startDay = new Date(selectedDate);
                    const endDay = new Date(untilDate);
                    startDay.setHours(0, 0, 0, 0);
                    endDay.setHours(0, 0, 0, 0);
                    const diffDays = Math.floor((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
                    if (diffDays < everyValue) {
                      showToast(`End date must be at least ${everyValue} day(s) after start for 'Every' repeats`);
                      return;
                    }
                  }
                }
              }

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
                  showToast('Please select a future time');
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
                  // Until fields
                  untilType: repeatType === 'none' ? undefined : untilType,
                  untilDate: repeatType === 'none' ? undefined : (untilType === 'endsAt' ? untilDate : undefined),
                  untilCount: repeatType === 'none' ? undefined : (untilType === 'count' ? untilCount : undefined),
                  untilTime: (repeatType !== 'none' && untilType === 'endsAt' && untilDate)
                    ? (() => {
                      const [uHours, uMinutes] = untilTime.split(':').map(Number);
                      let finalUHours = uHours;
                      if (!untilIsAM && uHours !== 12) finalUHours = uHours + 12;
                      else if (untilIsAM && uHours === 12) finalUHours = 0;
                      return `${finalUHours.toString().padStart(2, '0')}:${uMinutes.toString().padStart(2, '0')}`;
                    })()
                    : undefined,
                  untilIsAM: (repeatType !== 'none' && untilType === 'endsAt' && untilDate) ? untilIsAM : undefined,
                  // Preserve occurrence count when editing
                  occurrenceCount: repeatType === 'none' ? undefined : (editingReminder.occurrenceCount ?? 0),
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

                    // Auto-scroll to show the updated reminder
                    // For edited reminders, scroll to top since they might have moved position
                    setTimeout(() => {
                      if (activeTab === 'active') {
                        contentScrollRef.current?.scrollToOffset({ offset: 0, animated: true });
                      }
                    }, 200); // Small delay to ensure the list has updated

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

              const reminderId = draftReminderId ?? Date.now().toString();
              const newReminder: Reminder = {
                id: reminderId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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
                // Until fields
                untilType: repeatType === 'none' ? undefined : untilType,
                untilDate: repeatType === 'none' ? undefined : (untilType === 'endsAt' ? untilDate : undefined),
                untilCount: repeatType === 'none' ? undefined : (untilType === 'count' ? untilCount : undefined),
                untilTime: (repeatType !== 'none' && untilType === 'endsAt' && untilDate)
                  ? (() => {
                    const [uHours, uMinutes] = untilTime.split(':').map(Number);
                    let finalUHours = uHours;
                    if (!untilIsAM && uHours !== 12) finalUHours = uHours + 12;
                    else if (untilIsAM && uHours === 12) finalUHours = 0;
                    return `${finalUHours.toString().padStart(2, '0')}:${uMinutes.toString().padStart(2, '0')}`;
                  })()
                  : undefined,
                untilIsAM: (repeatType !== 'none' && untilType === 'endsAt' && untilDate) ? untilIsAM : undefined,
                occurrenceCount: 0,
                ringerSound: undefined,
                isCompleted: false,
                isExpired: false,

                // Multi-select fields
                multiSelectEnabled,
                multiSelectDates: multiSelectEnabled ? multiSelectDates : undefined,
                multiSelectDays: multiSelectEnabled ? multiSelectDays : undefined,
                windowEndTime: multiSelectEnabled && untilTime ? (() => {
                  const [uHours, uMinutes] = untilTime.split(':').map(Number);
                  let finalUHours = uHours;
                  if (!untilIsAM && uHours !== 12) finalUHours = uHours + 12;
                  else if (untilIsAM && uHours === 12) finalUHours = 0;
                  return `${finalUHours.toString().padStart(2, '0')}:${uMinutes.toString().padStart(2, '0')}`;
                })() : undefined,
                windowEndIsAM: multiSelectEnabled ? untilIsAM : undefined,
              };

              addReminder.mutate(newReminder, {
                onSuccess: () => {
                  // Close popup immediately
                  setShowCreatePopup(false);
                  setDraftReminderId(null);

                  // Scroll to top to show newly added reminder
                  setTimeout(() => {
                    if (activeTab === 'active' && contentScrollRef.current) {
                      contentScrollRef.current.scrollToOffset({ offset: 0, animated: true });
                    }
                  }, 100);

                  // Reset form after animation starts
                  setTimeout(() => {
                    setEditingReminder(null);
                    setTitle('');
                    const defaultPriority = settings?.defaultPriority ?? 'standard';
                    const mappedPriority: Priority = defaultPriority === 'standard' ? 'medium' :
                      defaultPriority === 'silent' ? 'low' : 'high';
                    setPriority(mappedPriority);
                    setRepeatType(settings?.defaultReminderMode ?? 'none');
                    setRepeatDays([]);
                    setEveryValue(1);
                    setEveryUnit('hours');
                    // Reset Until fields
                    setUntilType('none');
                    setUntilDate('');
                    setUntilCount(1);
                    const defaultTime = calculateDefaultTime();
                    setSelectedTime(defaultTime.time);
                    setIsAM(defaultTime.isAM);
                    const d = new Date();
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setSelectedDate(`${yyyy}-${mm}-${dd}`);
                    // Reset multi-select
                    setMultiSelectEnabled(false);
                    setMultiSelectDates([]);
                    setMultiSelectDays([]);
                  }, 150);
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

        </SafeAreaView>
      </KeyboardAvoidingView>

      {!isSelectionMode && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.createAlarmButton}
            onPress={() => {
              setEditingReminder(null);
              setDraftReminderId(Date.now().toString());
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
              setMultiSelectEnabled(false);
              setMultiSelectDates([]);
              setMultiSelectDays([]);
              setShowCreatePopup(true);
            }}
            testID="fab-create-reminder"
            accessibilityLabel="fab-create-reminder"
          >
            <Plus size={32} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Calendar modal for pause-until-date selection */}
      <CalendarModal
        visible={pauseUntilCalendarVisible}
        onClose={() => {
          setPauseUntilCalendarVisible(false);
          setPauseUntilReminder(null);
        }}
        selectedDate={selectedDate}
        weekStartDay={weekStartDay}
        onSelectDate={handlePauseUntilDate}
        disablePast={true}
        hideYear={false}
        title="Pause Until"
      />
      <OnboardingFlow visible={showOnboarding} onSkip={completeOnboarding} onComplete={completeOnboarding} />
    </>
  );
}

type PopupMode = 'create' | 'edit';

interface CreateReminderPopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (title: string) => void;
  reminderId?: string | null;
  selectedTime: string;
  isAM: boolean;
  untilTime: string;
  untilIsAM: boolean;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  repeatType: RepeatType;
  onRepeatTypeChange: (repeatType: RepeatType) => void;
  repeatDays: number[];
  onRepeatDaysChange: (days: number[]) => void;
  onTimeSelect: () => void;
  onTimeChange: (time: string, isAM: boolean) => void;
  onUntilTimeChange: (time: string, isAM: boolean) => void;
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
  timeSelectorContext: 'start' | 'until';
  use24HourFormat: boolean;
  // Until props
  untilType: 'none' | 'endsAt' | 'count';
  untilDate: string;
  untilCount: number;
  onUntilTypeChange: (type: 'none' | 'endsAt' | 'count') => void;
  onUntilDateChange: (date: string) => void;
  onUntilCountChange: (count: number) => void;
  onOpenUntilTime: () => void;

  // Multi-select props
  multiSelectEnabled: boolean;
  onMultiSelectEnabledChange: (enabled: boolean) => void;
  multiSelectDates: string[];
  onMultiSelectDatesChange: (dates: string[]) => void;
  multiSelectDays: number[];
  onMultiSelectDaysChange: (days: number[]) => void;
}

function CreateReminderPopup({
  visible,
  onClose,
  title,
  onTitleChange,
  reminderId,
  selectedTime,
  isAM,
  untilTime,
  untilIsAM,
  priority,
  onPriorityChange,
  repeatType,
  onRepeatTypeChange,
  repeatDays,
  onRepeatDaysChange,
  onTimeSelect,
  onTimeChange,
  onUntilTimeChange,
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
  timeSelectorContext,
  use24HourFormat,
  // Until props
  untilType,
  untilDate,
  untilCount,
  onUntilTypeChange,
  onUntilDateChange,
  onUntilCountChange,
  onOpenUntilTime,

  multiSelectEnabled,
  onMultiSelectEnabledChange,
  multiSelectDates,
  onMultiSelectDatesChange,
  multiSelectDays,
  onMultiSelectDaysChange,
}: CreateReminderPopupProps) {
  const [popupHeight, setPopupHeight] = useState<number>(480);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [isReady, setIsReady] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const shouldAutoFocusOnCreate = false;
  const { AlarmModule } = NativeModules as any;
  const enableRingerToneSelector = !!(((Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra)?.enableRingerToneSelector);
  const [selectedToneUri, setSelectedToneUri] = useState<string | null>(null);
  const [defaultToneUri, setDefaultToneUri] = useState<string | null>(null);
  const showSpeaker = enableRingerToneSelector && Platform.OS === 'android' && priority === 'high' && !!reminderId;



  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    const { width, height } = Dimensions.get('screen');
    return width > height;
  });

  useEffect(() => {
    const updateHeight = () => {
      // Use screen height so the keyboard doesn't shrink the popup and push buttons up
      const winH = Dimensions.get('screen').height;
      const winW = Dimensions.get('screen').width;
      const isLand = winW > winH;
      setIsLandscape(isLand);

      const paddingVertical = 48;
      const target = 430;
      const computed = Math.min(target, Math.max(340, winH - paddingVertical));
      setPopupHeight(computed);

      if (isLand) {
        // In landscape, don't scale down to fit height, allow scrolling
        setScaleFactor(1);
      } else {
        // Calculate scale factor for small screens
        // Base height threshold: 850px to trigger scaling sooner on modern phones
        // Scale down everything proportionally on smaller screens to prevent scrolling
        const baseHeight = 850;
        const baseWidth = 400;

        const heightScale = winH < baseHeight ? winH / baseHeight : 1;
        const widthScale = winW < baseWidth ? winW / baseWidth : 1;

        // Use the smaller of the two scales to ensure fit
        const scale = Math.min(heightScale, widthScale, 1);

        // Allow scaling down to 0.6 to prevent scrolling
        setScaleFactor(Math.max(0.6, scale));
      }
    };
    updateHeight();
    const sub = Dimensions.addEventListener('change', updateHeight);
    return () => {
      sub?.remove();
    };
  }, []);

  const formatTime = (time: string, isAm: boolean) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (use24HourFormat) {
      let hour24 = hours;
      if (!isAm && hours !== 12) hour24 = hours + 12;
      else if (isAm && hours === 12) hour24 = 0;
      return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${isAm ? 'AM' : 'PM'}`;
  };

  useEffect(() => {
    if (visible) {
      setIsReady(false);
      // Use a single requestAnimationFrame + setTimeout for reliable opacity control
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsReady(true);
          // Auto-focus disabled to prevent keyboard from opening automatically
          // if (mode === 'create' && shouldAutoFocusOnCreate) {
          //   InteractionManager.runAfterInteractions(() => {
          //     titleInputRef.current?.focus();
          //   });
          // }
        }, Platform.OS === 'android' ? 80 : 120);
      });
    } else {
      setIsReady(false);
    }
  }, [visible, mode, shouldAutoFocusOnCreate]);

  useEffect(() => {
    if (!showSpeaker || !reminderId) {
      setSelectedToneUri(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        if (AlarmModule?.getDefaultAlarmUri) {
          const uri = await AlarmModule.getDefaultAlarmUri();
          if (active) setDefaultToneUri(uri ?? null);
        }
        if (AlarmModule?.getRingerModeReminderTone) {
          const stored = await AlarmModule.getRingerModeReminderTone(reminderId);
          if (active) setSelectedToneUri(stored ?? null);
        }
      } catch (e) {
        console.log('[CreateReminderPopup] Failed to load reminder tone', e);
      }
    })();
    return () => {
      active = false;
    };
  }, [showSpeaker, reminderId, AlarmModule]);

  // Create scaled styles for small screens
  const scaledStyles = useMemo(() => ({
    popup: {
      ...createPopupStyles.popup,
      borderRadius: 16 * scaleFactor,
      padding: 16 * scaleFactor,
      paddingBottom: 16 * scaleFactor,
    },
    section: {
      ...createPopupStyles.section,
      marginBottom: 6 * scaleFactor,
    },
    titleInput: {
      ...createPopupStyles.titleInput,
      borderRadius: 8 * scaleFactor,
      padding: 8 * scaleFactor,
      fontSize: 16 * scaleFactor,
    },
    buttonContainer: {
      ...createPopupStyles.buttonContainer,
      marginTop: 6 * scaleFactor,
      paddingTop: 6 * scaleFactor,
    },
    cancelButton: {
      ...createPopupStyles.cancelButton,
      paddingHorizontal: 16 * scaleFactor,
      paddingVertical: 6 * scaleFactor,
    },
    createButton: {
      ...createPopupStyles.createButton,
      paddingHorizontal: 16 * scaleFactor,
      paddingVertical: 6 * scaleFactor,
      borderRadius: 6 * scaleFactor,
    },
    cancelButtonText: {
      ...createPopupStyles.cancelButtonText,
      fontSize: 14 * scaleFactor,
    },
    createButtonText: {
      ...createPopupStyles.createButtonText,
      fontSize: 14 * scaleFactor,
    },
    customizeContent: {
      ...createPopupStyles.customizeContent,
      marginBottom: 6 * scaleFactor,
    },
    rightButtons: {
      ...createPopupStyles.rightButtons,
      gap: 8 * scaleFactor,
    },
    leftButtonSlot: {
      ...createPopupStyles.leftButtonSlot,
      width: 32 * scaleFactor,
      height: 32 * scaleFactor,
    },
    ringerToneButton: {
      ...createPopupStyles.ringerToneButton,
      width: 24 * scaleFactor,
      height: 24 * scaleFactor,
      borderRadius: 12 * scaleFactor,
    },
    ringerToneDot: {
      ...createPopupStyles.ringerToneDot,
      width: 4 * scaleFactor,
      height: 4 * scaleFactor,
      borderRadius: 2 * scaleFactor,
    },
  }), [scaleFactor]);

  const isCustomTone = !!selectedToneUri && !!defaultToneUri && selectedToneUri !== defaultToneUri;

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
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
            style={[
              scaledStyles.popup,
              {
                opacity: isReady ? 1 : 0,
                maxHeight: '85%',
                minHeight: isLandscape ? undefined : popupHeight
              }
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 4, flexGrow: isLandscape ? 1 : 0 }}
              style={{ flexShrink: 1 }}
              keyboardDismissMode="none"
              keyboardShouldPersistTaps="always"
              scrollEnabled={true}
            >
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  // Close any open dropdowns when tapping blank space
                  if ((window as any).__closeCustomizePanelDropdowns) {
                    (window as any).__closeCustomizePanelDropdowns();
                  }
                }}
              >
                <View
                  style={createPopupStyles.mainContent}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={() => {
                    // Close dropdowns when tapping in this area
                    if ((window as any).__closeCustomizePanelDropdowns) {
                      (window as any).__closeCustomizePanelDropdowns();
                    }
                  }}
                >
                  <Pressable onPress={(e) => {
                    e.stopPropagation();
                    // Also close dropdowns when tapping inside this area
                    if ((window as any).__closeCustomizePanelDropdowns) {
                      (window as any).__closeCustomizePanelDropdowns();
                    }
                  }}>
                    <View style={scaledStyles.section}>
                      <TextInput
                        ref={titleInputRef}
                        style={scaledStyles.titleInput}
                        placeholder="Enter reminder"
                        placeholderTextColor="#9CA3AF"
                        value={title}
                        onChangeText={onTitleChange}
                        onFocus={() => {
                          // Close any open dropdowns when focusing title input
                          if ((window as any).__closeCustomizePanelDropdowns) {
                            (window as any).__closeCustomizePanelDropdowns();
                          }
                        }}
                        onSubmitEditing={() => {
                          RNKeyboard.dismiss();
                          titleInputRef.current?.blur();
                        }}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        maxLength={100}
                        testID="title-input"
                      />
                    </View>

                    <View style={[scaledStyles.customizeContent, repeatType === 'every' && { marginBottom: 2 * scaleFactor }]}>
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
                        use24HourFormat={use24HourFormat}
                        everyValue={everyValue}
                        everyUnit={everyUnit}
                        onEveryChange={onEveryChange}
                        // Until props
                        untilTime={untilTime}
                        untilIsAM={untilIsAM}
                        untilType={untilType}
                        untilDate={untilDate}
                        untilCount={untilCount}
                        onUntilTypeChange={onUntilTypeChange}
                        onUntilDateChange={onUntilDateChange}
                        onUntilCountChange={onUntilCountChange}
                        onOpenUntilTime={onOpenUntilTime}
                        onDropdownStateChange={() => { }}
                        scaleFactor={scaleFactor}
                        isLandscape={isLandscape}
                        // Multi-select
                        multiSelectEnabled={multiSelectEnabled}
                        onMultiSelectEnabledChange={onMultiSelectEnabledChange}
                        multiSelectDates={multiSelectDates}
                        onMultiSelectDatesChange={onMultiSelectDatesChange}
                        multiSelectDays={multiSelectDays}
                        onMultiSelectDaysChange={onMultiSelectDaysChange}
                        onSetTime={() => {
                          // If in Start context, open Start Time. 
                          // But CustomizePanel handles context internally for its own logic?
                          // Actually CalendarModal for start calls onSetTime.
                          // We want to differentiate between Start and End time setting?
                          // CalendarModal 'onSetTime' is generic.
                          // However, we are passing 'onSetTime' to CustomizePanel.
                          // CustomizePanel uses it for Start Context.
                          // Update: I only hooked up onSetTime in CustomizePanel.tsx for Start CalendarModal.
                          // For End CalendarModal, I mapped it to onOpenUntilTime.
                          // So this prop is mainly for Start CalendarModal "Set Time" button.
                          onTimeSelect();
                        }}
                      />
                    </View>

                    <View style={scaledStyles.section}>
                      <PrioritySelector
                        priority={priority}
                        onPriorityChange={onPriorityChange}
                      />
                    </View>
                  </Pressable>
                </View>
              </Pressable>
            </ScrollView>

            <View
              style={scaledStyles.buttonContainer}
            >
              <View style={scaledStyles.leftButtonSlot}>
                {showSpeaker && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const openPicker = AlarmModule?.openRingtonePickerForReminder ?? AlarmModule?.openRingtonePicker;
                        if (!openPicker) {
                          console.log('[CreateReminderPopup] Ringtone picker not available');
                          return;
                        }
                        const result = AlarmModule?.openRingtonePickerForReminder
                          ? await AlarmModule.openRingtonePickerForReminder(selectedToneUri ?? null)
                          : await AlarmModule.openRingtonePicker();
                        const uri: string | null = result?.uri ?? null;
                        const keyId = reminderId;
                        if (uri && keyId && AlarmModule?.setRingerModeReminderTone) {
                          await AlarmModule.setRingerModeReminderTone(keyId, uri);
                        }
                        setSelectedToneUri(uri);
                      } catch (error: any) {
                        if (error?.code !== 'CANCELLED') {
                          console.error('[CreateReminderPopup] Error selecting ringtone:', error);
                        }
                      }
                    }}
                    accessibilityLabel="ringer-tone-selector"
                    testID="ringer-tone-selector"
                    style={scaledStyles.ringerToneButton}
                  >
                    <Speaker size={14 * scaleFactor} color={Material3Colors.light.onSurfaceVariant} />
                    {isCustomTone && (
                      <View
                        style={[scaledStyles.ringerToneDot, { right: 6, top: 2, backgroundColor: Material3Colors.light.primary }]}
                        accessibilityLabel="ringer-tone-selector-dot"
                        testID="ringer-tone-selector-dot"
                        accessible
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <View style={scaledStyles.rightButtons}>
                <TouchableOpacity style={scaledStyles.cancelButton} onPress={onClose} testID="cancel-create">
                  <Text style={scaledStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[scaledStyles.createButton, isLoading && createPopupStyles.createButtonDisabled]}
                  onPress={onConfirm}
                  disabled={isLoading}
                  testID="confirm-create"
                >
                  <Text style={scaledStyles.createButtonText}>
                    {isLoading ? (mode === 'edit' ? 'Rescheduling...' : 'Creating...') : (mode === 'edit' ? 'Reschedule' : 'Create')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      <TimeSelector
        visible={showTimeSelector}
        selectedTime={timeSelectorContext === 'until' ? untilTime : selectedTime}
        isAM={timeSelectorContext === 'until' ? untilIsAM : isAM}
        use24HourFormat={use24HourFormat}
        onTimeChange={(t, am) => {
          if (timeSelectorContext === 'until') onUntilTimeChange(t, am);
          else onTimeChange(t, am);
        }}
        onClose={onCloseTimeSelector}
        selectedDate={timeSelectorContext === 'until' ? (untilDate || selectedDate) : selectedDate}
        repeatType={repeatType}
        onPastTimeError={(msg) => showToast(msg ?? 'Please select a future time')}
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
    padding: 12,
    paddingBottom: 12,
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
    flex: 1,
    zIndex: 1,
    paddingBottom: 2,
  },
  customizeContent: {
    zIndex: 20,
    overflow: 'visible',
  },
  section: {
    marginBottom: 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    zIndex: 5,
  },
  leftButtonSlot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ringerToneButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Material3Colors.light.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringerToneDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
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
  use24HourFormat: boolean;
  onTimeChange: (time: string, isAM: boolean) => void;
  onClose: () => void;
  selectedDate?: string;
  repeatType?: RepeatType;
  onPastTimeError?: (message: string) => void;
}

function TimeSelector({ visible, selectedTime, isAM, use24HourFormat, onTimeChange, onClose, selectedDate, repeatType, onPastTimeError }: TimeSelectorProps) {
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
  const [isReady, setIsReady] = useState(false);
  const displayHour = (() => {
    if (!use24HourFormat) return currentHour;
    let hour24 = currentHour;
    if (!currentAMPM && currentHour !== 12) hour24 = currentHour + 12;
    else if (currentAMPM && currentHour === 12) hour24 = 0;
    return hour24;
  })();
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
    setShowManualEntry(false);
    setManualTimeInput('');
    try {
      const [h, m] = selectedTime.split(':').map(Number);
      const hour12 = (h % 12 === 0 ? 12 : h % 12);
      const minuteValue = Number.isFinite(m) ? m : 0;
      setCurrentHour(hour12);
      setCurrentMinute(minuteValue);
      setCurrentAMPM(isAM);

      const hourStep = 360 / 12;
      const minuteStep = 360 / 60;
      const targetRotation = activeSection === 'hour'
        ? (((hour12 === 12 ? 0 : hour12) * hourStep) % 360)
        : ((minuteValue * minuteStep) % 360);
      setRotation(targetRotation);
      rotationRef.current = targetRotation;
    } catch (e) {
      console.log('sync selectedTime to dial failed', e);
    }
  }, [visible, selectedTime, isAM]); // Keep dependencies for initial sync

  // Separate effect to handle rotation ONLY when actively switching sections
  useEffect(() => {
    if (!visible || isDragging.current) return;
    if (decayAnimation.current || snapAnimation.current) return;

    const hourStep = 360 / 12;
    const minuteStep = 360 / 60;
    const targetRotation = activeSection === 'hour'
      ? (((currentHour === 12 ? 0 : currentHour) * hourStep) % 360)
      : ((currentMinute * minuteStep) % 360);

    if (Math.abs(rotationRef.current - targetRotation) > 0.1) {
      setRotation(targetRotation);
      rotationRef.current = targetRotation;
    }
  }, [visible, activeSection, currentHour, currentMinute]);

  // Opacity control to prevent flashing
  useEffect(() => {
    if (!visible) {
      setIsReady(false);
      return;
    }

    // Use requestAnimationFrame to ensure the modal is rendered before showing
    requestAnimationFrame(() => {
      // Add platform-specific delay for Android
      const delay = Platform.OS === 'android' ? 50 : 100;
      setTimeout(() => {
        setIsReady(true);
      }, delay);
    });
  }, [visible]);

  const [rotation, setRotation] = useState<number>(0);
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualTimeInput, setManualTimeInput] = useState<string>('');
  const [discSize, setDiscSize] = useState<number>(220);

  const discRef = useRef<View>(null);
  const lastAngle = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const rotationRef = useRef<number>(0);
  const isFirstMove = useRef<boolean>(false);
  const framePending = useRef<boolean>(false);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocity = useRef<number>(0);
  const lastMoveTime = useRef<number>(0);
  const decayAnimation = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapAnimation = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSwitchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedByFriction = useRef<boolean>(false);
  const lastValueUpdate = useRef<number>(0);

  const HOUR_SENSITIVITY = 1.0;
  const MINUTE_SENSITIVITY = 1.0;
  const DEADBAND_DEG = 0.35;
  const DECAY_FRICTION = 0.82;
  const MIN_DECAY_VELOCITY = 0.28;
  const VELOCITY_THRESHOLD = 0.12;
  const SNAP_THRESHOLD = 0.12;
  const SNAP_DURATION = 200;
  const VALUE_UPDATE_THROTTLE = 100;

  const maybeToggleAmPmForRotation = useCallback((prevRotation: number, nextRotation: number) => {
    if (!use24HourFormat) return;
    const prev = (prevRotation % 360 + 360) % 360;
    const next = (nextRotation % 360 + 360) % 360;
    if ((prev > 330 && next < 30) || (prev < 30 && next > 330)) {
      setCurrentAMPM((prevValue) => !prevValue);
    }
  }, [use24HourFormat]);

  const getHourFromRotation = useCallback((rotationValue: number) => {
    const hourStep = 360 / 12;
    const normalized = (rotationValue % 360 + 360) % 360;
    let hourIndex = Math.round(normalized / hourStep) % 12;
    if (use24HourFormat && hourIndex === 0 && normalized >= 360 - hourStep / 2) {
      hourIndex = 11;
    }
    return hourIndex === 0 ? 12 : hourIndex;
  }, [use24HourFormat]);

  useEffect(() => {
    return () => {
      if (decayAnimation.current) {
        clearInterval(decayAnimation.current);
        decayAnimation.current = null;
      }
      if (snapAnimation.current) {
        clearTimeout(snapAnimation.current);
        snapAnimation.current = null;
      }
      if (autoSwitchTimeout.current) {
        clearTimeout(autoSwitchTimeout.current);
        autoSwitchTimeout.current = null;
      }
    };
  }, []);

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
      isFirstMove.current = true; // ADD: Mark first move
      rotationRef.current = rotation;
      measureCenter();

      // Initialize lastAngle to current rotation, not touch position
      // This prevents jump on first move
      const currentDeg = rotationRef.current;
      lastAngle.current = currentDeg; // CHANGE: Use current rotation instead of touch position

      // Stop any ongoing animations
      if (decayAnimation.current) {
        clearInterval(decayAnimation.current);
        decayAnimation.current = null;
      }
      if (autoSwitchTimeout.current) {
        clearTimeout(autoSwitchTimeout.current);
        autoSwitchTimeout.current = null;
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

      // SKIP first move to establish proper baseline
      if (isFirstMove.current) {
        isFirstMove.current = false;
        lastAngle.current = degrees; // Set baseline to actual touch position
        lastMoveTime.current = currentTime;
        return; // Skip this move, no rotation applied
      }

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

      // Apply delta to current rotation to avoid jumping to touch
      const prevRotation = rotationRef.current;
      rotationRef.current = (rotationRef.current + delta + 360) % 360;
      const r = rotationRef.current % 360;
      if (activeSection === 'hour') {
        maybeToggleAmPmForRotation(prevRotation, rotationRef.current);
      }
      setRotation(r);

      if (!framePending.current) {
        framePending.current = true;
        requestAnimationFrame(() => {
          framePending.current = false;
          const currentRotation = rotationRef.current % 360;
          if (activeSection === 'hour') {
            const newHour = getHourFromRotation(currentRotation);
            if (newHour !== currentHour) {
              setCurrentHour(newHour);
            }
          } else {
            const minuteStep = 360 / 60;
            const minuteIndex = Math.round(currentRotation / minuteStep) % 60;
            if (minuteIndex !== currentMinute) {
              setCurrentMinute(minuteIndex);
            }
          }
        });
      }
    },
    onPanResponderRelease: () => {
      isDragging.current = false;

      // Snap to nearest value if velocity is very low (likely a finger slip)
      if (Math.abs(velocity.current) < SNAP_THRESHOLD) {
        // Snap to nearest position
        const r = rotationRef.current % 360;
        if (activeSection === 'hour') {
          const hourStep = 360 / 12;
          const snappedRotation = Math.round(r / hourStep) * hourStep;

          const prevRotation = rotationRef.current;
          rotationRef.current = snappedRotation;
          if (activeSection === 'hour') {
            maybeToggleAmPmForRotation(prevRotation, rotationRef.current);
          }
          setRotation(snappedRotation);
          const newHour = getHourFromRotation(snappedRotation);
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
        } else {
          const minuteStep = 360 / 60;
          const snappedRotation = Math.round(r / minuteStep) * minuteStep;

          // Update rotation immediately
          rotationRef.current = snappedRotation;
          setRotation(snappedRotation);
          const minuteIndex = Math.round(snappedRotation / minuteStep) % 60;
          setCurrentMinute(minuteIndex);
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
                const snappedRotation = Math.round(r / hourStep) * hourStep;
                rotationRef.current = snappedRotation;
                setRotation(snappedRotation);
                const newHour = getHourFromRotation(snappedRotation);
                setCurrentHour(newHour);
              } else {
                const minuteStep = 360 / 60;
                const snappedRotation = Math.round(r / minuteStep) * minuteStep;
                rotationRef.current = snappedRotation;
                setRotation(snappedRotation);
                const minuteIndex = Math.round(snappedRotation / minuteStep) % 60;
                setCurrentMinute(minuteIndex);
              }
              return;
            }

            const prevRotation = rotationRef.current;
            rotationRef.current = (rotationRef.current + currentVelocity + 360) % 360;
            const r = rotationRef.current % 360;
            if (activeSection === 'hour') {
              maybeToggleAmPmForRotation(prevRotation, rotationRef.current);
            }
            setRotation(r);

            // Only update values every 6 frames (approximately every 100ms) to reduce jitter
            frameCount++;
            if (frameCount % 6 === 0) {
              if (activeSection === 'hour') {
                const newHour = getHourFromRotation(r);
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
      clearTimeout(snapAnimation.current);
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
      onShow={() => setIsReady(true)}
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
          style={[
            timeSelectorStyles.container,
            isLandscape && timeSelectorStyles.containerLandscape,
            {
              opacity: isReady ? 1 : 0,
              ...(Platform.OS === 'android' && {
                elevation: isReady ? 10 : 0
              })
            }
          ]}
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
                          if (use24HourFormat) {
                            setCurrentAMPM(inputHour < 12);
                          }
                          setShowManualEntry(false);
                          setManualTimeInput('');
                          const hourStep = 360 / 12;
                          const minuteStep = 360 / 60;
                          const targetRotation = activeSection === 'hour'
                            ? (((hour12 === 12 ? 0 : hour12) * hourStep) % 360)
                            : ((inputMinute * minuteStep) % 360);
                          rotationRef.current = targetRotation;
                          setRotation(targetRotation);
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
                            const hourStep = 360 / 12;
                            const minuteStep = 360 / 60;
                            const targetRotation = activeSection === 'hour'
                              ? (((hour12 === 12 ? 0 : hour12) * hourStep) % 360)
                              : ((inputMinute * minuteStep) % 360);
                            rotationRef.current = targetRotation;
                            setRotation(targetRotation);
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
                          {displayHour.toString().padStart(2, '0')}
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

                {!use24HourFormat && (
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
                )}

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
                        if (use24HourFormat) {
                          setCurrentAMPM(inputHour < 12);
                        }
                        setShowManualEntry(false);
                        setManualTimeInput('');
                        const hourStep = 360 / 12;
                        const minuteStep = 360 / 60;
                        const targetRotation = activeSection === 'hour'
                          ? (((hour12 === 12 ? 0 : hour12) * hourStep) % 360)
                          : ((inputMinute * minuteStep) % 360);
                        rotationRef.current = targetRotation;
                        setRotation(targetRotation);
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
                          if (use24HourFormat) {
                            setCurrentAMPM(inputHour < 12);
                          }
                          setShowManualEntry(false);
                          setManualTimeInput('');
                          const hourStep = 360 / 12;
                          const minuteStep = 360 / 60;
                          const targetRotation = activeSection === 'hour'
                            ? (((hour12 === 12 ? 0 : hour12) * hourStep) % 360)
                            : ((inputMinute * minuteStep) % 360);
                          rotationRef.current = targetRotation;
                          setRotation(targetRotation);
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
                        {displayHour.toString().padStart(2, '0')}
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

              {!use24HourFormat && (
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
              )}

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



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Material3Colors.light.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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

  metroTabContainer: {
    backgroundColor: Material3Colors.light.surface,
  },
  metroTabContent: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 10,
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metroTab: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metroTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Material3Colors.light.onSurfaceVariant,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  metroTabTextActive: {
    fontSize: 17,
    fontWeight: '300',
    color: Material3Colors.light.primary,
    opacity: 1,
    letterSpacing: 0,
  },
  metroTabCount: {
    fontSize: 9,
    fontWeight: '600',
    color: Material3Colors.light.onSurfaceVariant,
    marginLeft: 1,
    marginTop: -2,
    opacity: 0.7,
  },
  metroTabCountActive: {
    color: Material3Colors.light.primary,
    fontSize: 10,
    marginTop: -3,
    opacity: 1,
  },
  metroTabDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Material3Colors.light.outlineVariant,
    opacity: 0.7,
  },


  content: {
    flex: 1,
    paddingHorizontal: 36,  // ✅ Keep containers consistent with list padding
    paddingVertical: 16,
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
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
    marginHorizontal: 20,
    marginVertical: 2,
    // ✅ Android GPU optimizations
    elevation: 0.5,  // Minimal elevation
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 0.3 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    // Allow swipeable content to draw beyond card bounds
    overflow: 'visible',
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  reminderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  multiBadge: {
    backgroundColor: Material3Colors.light.secondaryContainer,
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
    fontSize: 12,
    color: Material3Colors.light.primary,
    fontWeight: '600',
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
  selectedDatesText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
    marginTop: 4,
  },
  selectedDatesMoreText: {
    fontSize: 12,
    color: '#374151', // Gray-700
    fontWeight: '700',
    backgroundColor: '#F3F4F6', // Gray-100
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  restoreButton: {
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
    gap: 4,
    marginTop: 4,
    flexWrap: 'nowrap',
  },

  dailyTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },

  // Compact card styles for completed and deleted reminders
  reminderCardCompact: {
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
    marginHorizontal: 20,
    marginVertical: 2,
    elevation: 0.5,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    overflow: 'visible',
  },
  reminderContentCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reminderLeftCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2, // Reduced gap
    minWidth: 0, // Allow flex shrinking
  },
  priorityBarCompact: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
    flexShrink: 0,
  },
  reminderTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
    flexShrink: 1,
    minWidth: 0,
  },
  compactSeparator: {
    fontSize: 12,
    color: Material3Colors.light.outline,
    marginHorizontal: 0,
    flexShrink: 0,
  },
  reminderTimeCompact: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '500',
    flexShrink: 0,
  },
  reminderDateCompact: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '500',
    flexShrink: 0,
  },
  repeatBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
    flexShrink: 0,
  },
  repeatBadgeTextCompact: {
    fontSize: 10,
    color: Material3Colors.light.primary,
    fontWeight: '600',
  },
  everyDurationCompact: {
    fontSize: 11,
    color: Material3Colors.light.onSurfaceVariant,
    fontWeight: '600',
    marginLeft: 4,
    flexShrink: 0,
  },
  // History Badge Styles
  historyBadge: {
    marginLeft: 'auto', // Push to right
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Material3Colors.light.surfaceContainer,
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadgeFinal: {
    backgroundColor: 'transparent',
    borderColor: '#4CAF50', // Green Ring
    borderWidth: 1.5,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
  },
  historyBadgeTextFinal: {
    color: '#4CAF50',
  },
  // Popup Styles
  historyPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyPopupContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
    elevation: 4,
  },
  historyPopupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Material3Colors.light.onSurface,
    textAlign: 'center',
  },
  historyPopupList: {
    width: '100%',
    flexShrink: 1,
  },
  historyPopupItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Material3Colors.light.outlineVariant,
  },
  historyPopupItemText: {
    fontSize: 16,
    color: Material3Colors.light.onSurface,
    textAlign: 'center',
  },
  closeHistoryButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: Material3Colors.light.surfaceContainer,
    borderRadius: 20,
    alignItems: 'center',
  },
  closeHistoryButtonText: {
    fontWeight: '600',
    color: Material3Colors.light.primary,
  },
});
