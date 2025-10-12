import 'expo-router/entry';
import { runRescheduleAlarms } from './services/headless-task.js';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './hooks/notification-service';

runRescheduleAlarms();

const STORAGE_KEY = 'dominder_reminders';

function calculateNextReminderDate(reminder, now) {
  if (reminder.repeatType === 'none') return null;
  
  const dateParts = reminder.date.split('-');
  const month = parseInt(dateParts[1] || '1', 10);
  const day = parseInt(dateParts[2] || '1', 10);
  
  const timeParts = reminder.time.split(':');
  const hh = parseInt(timeParts[0] || '0', 10);
  const mm = parseInt(timeParts[1] || '0', 10);
  
  const setTime = (d) => {
    d.setHours(hh, mm, 0, 0);
    return d;
  };
  
  switch (reminder.repeatType) {
    case 'daily': {
      const selected = (reminder.repeatDays && reminder.repeatDays.length > 0)
        ? reminder.repeatDays
        : [0,1,2,3,4,5,6];
      for (let add = 0; add < 8; add++) {
        const check = setTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + add));
        if (selected.includes(check.getDay()) && check > now) return check;
      }
      return null;
    }
    case 'weekly':
    case 'custom': {
      const selected = reminder.repeatDays || [];
      if (selected.length === 0) return null;
      for (let add = 0; add < 370; add++) {
        const check = setTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + add));
        if (selected.includes(check.getDay()) && check > now) return check;
      }
      return null;
    }
    case 'monthly': {
      const dayOfMonth = reminder.monthlyDay || day;
      let candidate = setTime(new Date(now.getFullYear(), now.getMonth(), dayOfMonth));
      if (candidate <= now) {
        candidate = setTime(new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth));
      }
      return candidate;
    }
    case 'yearly': {
      const target = setTime(new Date(now.getFullYear(), month - 1, day));
      if (target <= now) target.setFullYear(target.getFullYear() + 1);
      return target;
    }
    case 'every': {
      const interval = reminder.everyInterval;
      if (!interval || !interval.value || interval.value <= 0) return null;
      
      const start = new Date(reminder.date);
      start.setHours(hh, mm, 0, 0);
      if (isNaN(start.getTime())) return null;
      
      const addMs =
        interval.unit === 'minutes'
          ? interval.value * 60 * 1000
          : interval.unit === 'hours'
          ? interval.value * 60 * 60 * 1000
          : interval.value * 24 * 60 * 60 * 1000;
      
      let candidate = reminder.lastTriggeredAt ? new Date(reminder.lastTriggeredAt) : start;
      
      while (candidate.getTime() <= now.getTime()) {
        candidate = new Date(candidate.getTime() + addMs);
      }
      
      return candidate;
    }
    default:
      return null;
  }
}

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    console.log(`[Dominder-Debug] Background event: type=${type}, detail=${JSON.stringify(detail)}`);
    
    const { notification, pressAction } = detail || {};
    if (!notification) return;
    
    const reminderId = notification.data && notification.data.reminderId;
    if (typeof reminderId !== 'string') return;
    
    console.log(`[Dominder-Debug] Background event for reminder: ${reminderId}, action: ${pressAction?.id || 'dismissed'}, type: ${type}`);
    
    // Handle notification press
    if (type === EventType.PRESS) {
      const priority = notification.data && notification.data.priority;
      
      if (priority === 'high' && (pressAction?.id === 'alarm' || pressAction?.id === 'default')) {
        console.log(`[Dominder-Debug] Background: High priority notification pressed for reminder ${reminderId}`);
        // For ringer mode, the app will be brought to foreground
        // The foreground handler will route to the alarm screen
        // Don't cancel the notification here - let the alarm screen handle it
        return;
      } else if (pressAction?.id === 'default') {
        console.log(`[Dominder-Debug] Background: Standard/silent notification pressed, priority: ${priority}`);
        // For non-ringer modes, cancel the notification and let the app open to home
        try { 
          await notifee.cancelNotification(notification.id); 
          console.log(`[Dominder-Debug] Cancelled notification: ${notification.id}`);
        } catch (e) {
          console.log('[Dominder-Debug] Could not cancel notification:', e);
        }
        return;
      }
    }
    
    // For action buttons and dismissals, cancel the notification
    if (type === EventType.ACTION_PRESS || type === EventType.DISMISSED) {
      try { 
        await notifee.cancelNotification(notification.id); 
        console.log(`[Dominder-Debug] Cancelled notification: ${notification.id}`);
      } catch (e) {
        console.log('[Dominder-Debug] Could not cancel notification:', e);
      }
    } else {
      // For PRESS events that aren't handled above, return early
      return;
    }
    
    if (type !== EventType.ACTION_PRESS && type !== EventType.DISMISSED) return;
    
    const raw = (await AsyncStorage.getItem(STORAGE_KEY)) || '[]';
    const list = JSON.parse(raw);
    const i = list.findIndex((r) => r.id === reminderId);
    
    if (i === -1) {
      console.log(`[Dominder-Debug] Reminder ${reminderId} not found in storage`);
      return;
    }
    
    const reminder = list[i];
    const now = new Date();
    
    if (type === EventType.DISMISSED) {
      console.log(`[Dominder-Debug] Background: Notification dismissed for reminder ${reminderId}`);
      if (reminder.repeatType === 'none' && reminder.priority !== 'medium') {
        console.log(`[Dominder-Debug] Background: Marking "Once" reminder as expired: ${reminderId}`);
        list[i].isExpired = true;
        list[i].lastTriggeredAt = now.toISOString();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
      return;
    }
    
    if (type === EventType.ACTION_PRESS && pressAction?.id === 'done') {
      console.log(`[Dominder-Debug] Background: Handling 'Done' action for reminder ${reminderId}`);
      
      if (reminder.repeatType === 'none') {
        list[i].isCompleted = true;
        list[i].lastTriggeredAt = now.toISOString();
        delete list[i].snoozeUntil;
      } else {
        const nextDate = calculateNextReminderDate(reminder, now);
        console.log(`[Dominder-Debug] Background: Updating repeating reminder ${reminderId}, next date: ${nextDate?.toISOString()}`);
        list[i].lastTriggeredAt = now.toISOString();
        list[i].nextReminderDate = nextDate ? nextDate.toISOString() : undefined;
        delete list[i].snoozeUntil;
        
        await notificationService.cancelAllNotificationsForReminder(reminderId);
        
        if (nextDate) {
          const notificationId = await notificationService.scheduleReminderByModel(list[i]);
          if (notificationId) {
            list[i].notificationId = notificationId;
          }
        }
      }
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return;
    }
    
    const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction?.id || '');
    if (snoozeMatch) {
      const mins = parseInt(snoozeMatch[1], 10);
      console.log(`[Dominder-Debug] Background: Handling 'Snooze' action for reminder ${reminderId} for ${mins} minutes`);
      
      const snoozeUntil = new Date(Date.now() + mins * 60 * 1000).toISOString();
      list[i].snoozeUntil = snoozeUntil;
      list[i].lastTriggeredAt = now.toISOString();
      if (list[i].isExpired) {
        list[i].isExpired = false;
      }
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      
      await notificationService.cancelAllNotificationsForReminder(reminderId);
      
      const notificationId = await notificationService.scheduleReminderByModel(list[i]);
      if (notificationId) {
        list[i].notificationId = notificationId;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {
    console.log('[Dominder-Debug] Background event error:', e);
  }
});