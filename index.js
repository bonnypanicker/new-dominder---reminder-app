import "expo-router/entry";
let notifee;
try {
  notifee = require('@notifee/react-native').default;
} catch (e) {
  console.log('[index] notifee unavailable', e?.message ?? e);
}

import { AppRegistry } from 'react-native';

function calculateNextReminderDate(reminder, fromDate = new Date()) {
  const timeParts = reminder.time.split(':');
  const hh = parseInt(timeParts[0] || '0', 10);
  const mm = parseInt(timeParts[1] || '0', 10);

  const setTime = (d) => {
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  switch (reminder.repeatType) {
    case 'none':
      return null;
    case 'daily': {
      const selected = (reminder.repeatDays && reminder.repeatDays.length > 0)
        ? reminder.repeatDays
        : [0,1,2,3,4,5,6];
      for (let add = 1; add < 8; add++) {
        const check = setTime(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + add));
        if (selected.includes(check.getDay())) return check;
      }
      return null;
    }
    case 'monthly': {
      const dateParts = reminder.date.split('-');
      const day = parseInt(dateParts[2] || '1', 10);
      const desiredDay = reminder.monthlyDay ?? day;
      
      const year = fromDate.getFullYear();
      const monthIndex = fromDate.getMonth();
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const todayTargetDay = Math.min(desiredDay, lastDay);
      const candidateThisMonth = new Date(year, monthIndex, todayTargetDay);
      candidateThisMonth.setHours(hh, mm, 0, 0);

      if (candidateThisMonth > fromDate) {
        return candidateThisMonth;
      }

      const nextMonthIndex = monthIndex + 1;
      const nextYear = year + Math.floor(nextMonthIndex / 12);
      const realNextMonthIndex = nextMonthIndex % 12;
      const nextLastDay = new Date(nextYear, realNextMonthIndex + 1, 0).getDate();
      const nextMonthTargetDay = Math.min(desiredDay, nextLastDay);
      const candidateNextMonth = new Date(nextYear, realNextMonthIndex, nextMonthTargetDay);
      candidateNextMonth.setHours(hh, mm, 0, 0);

      return candidateNextMonth;
    }
    case 'yearly': {
      const dateParts = reminder.date.split('-');
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      const target = setTime(new Date(fromDate.getFullYear() + 1, month - 1, day));
      return target;
    }
    case 'every': {
      const interval = reminder.everyInterval;
      if (!interval || !interval.value || interval.value <= 0) return null;
      const baseStart = new Date(reminder.date);
      baseStart.setHours(hh, mm, 0, 0);
      if (fromDate <= baseStart) return baseStart;
      const addMs = interval.unit === 'minutes' ? interval.value * 60 * 1000 : interval.unit === 'hours' ? interval.value * 60 * 60 * 1000 : interval.value * 24 * 60 * 60 * 1000;
      const diff = fromDate.getTime() - baseStart.getTime();
      const steps = Math.floor(diff / addMs) + 1;
      return new Date(baseStart.getTime() + steps * addMs);
    }
    case 'weekly':
    case 'custom': {
      const selected = reminder.repeatDays ?? [];
      if (selected.length === 0) return null;
      for (let add = 1; add < 370; add++) {
        const check = setTime(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + add));
        if (selected.includes(check.getDay())) return check;
      }
      return null;
    }
    default:
      return null;
  }
}

async function scheduleNotification(reminder) {
  if (!notifee) return null;
  
  try {
    const now = new Date();
    let triggerDate = null;

    if (reminder.snoozeUntil) {
      const snoozeDate = new Date(reminder.snoozeUntil);
      if (snoozeDate > now) {
        triggerDate = snoozeDate;
      }
    }

    if (!triggerDate && reminder.repeatType !== 'none' && reminder.nextReminderDate) {
      const nextDate = new Date(reminder.nextReminderDate);
      if (nextDate > now) {
        triggerDate = nextDate;
      }
    }

    if (!triggerDate) {
      const dateParts = reminder.date.split('-');
      const year = parseInt(dateParts[0] || '0', 10);
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      const timeParts = reminder.time.split(':');
      const hh = parseInt(timeParts[0] || '0', 10);
      const mm = parseInt(timeParts[1] || '0', 10);
      
      triggerDate = new Date(year, month - 1, day, hh, mm, 0, 0);
      
      if (reminder.repeatType === 'none' && triggerDate <= now) {
        return null;
      }
    }

    if (!triggerDate || triggerDate <= now) {
      return null;
    }

    const channelId = reminder.priority === 'high' ? 'ringer_v3' : reminder.priority === 'medium' ? 'standard_v3' : 'silent_v3';
    const notificationId = await notifee.createTriggerNotification(
      {
        title: reminder.title,
        body: reminder.description,
        android: {
          channelId,
          ongoing: reminder.priority === 'medium',
          autoCancel: reminder.priority !== 'medium',
          actions: [
            { title: 'Done', pressAction: { id: 'done' } },
            { title: 'Snooze 5m', pressAction: { id: 'snooze' } },
          ],
          pressAction: { id: 'default' },
          asForegroundService: false,
        },
        data: { reminderId: reminder.id },
      },
      {
        type: 0,
        timestamp: triggerDate.getTime(),
        alarmManager: { allowWhileIdle: true },
      }
    );
    console.log('[scheduleNotification] Scheduled notification:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[scheduleNotification] Error:', error);
    return null;
  }
}

if (notifee && typeof notifee.onBackgroundEvent === 'function') {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[onBackgroundEvent] type:', type, 'detail:', detail);
    try {
      const { notification, pressAction } = detail ?? {};
      if (!notification) return;

      const reminderId = notification?.data?.reminderId;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      if (type === 1 && pressAction) {
        const stored = await AsyncStorage.getItem('dominder_reminders');
        const list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((r) => r.id === reminderId);
        if (idx !== -1) {
          const reminder = list[idx];
          const nowIso = new Date().toISOString();
          const now = new Date();
          
          await notifee.cancelNotification(notification.id);
          
          if (pressAction.id === 'snooze') {
            console.log('[onBackgroundEvent] Snoozing reminder:', reminderId);
            list[idx] = {
              ...reminder,
              snoozeUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              isExpired: false,
              lastTriggeredAt: reminder.lastTriggeredAt ?? nowIso,
              notificationId: undefined,
            };
            await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
            
            const newNotificationId = await scheduleNotification(list[idx]);
            if (newNotificationId) {
              list[idx].notificationId = newNotificationId;
              await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
            }
          } else if (pressAction.id === 'done') {
            console.log('[onBackgroundEvent] Marking reminder as done:', reminderId);
            if (reminder.repeatType === 'none') {
              list[idx] = {
                ...reminder,
                isCompleted: true,
                snoozeUntil: undefined,
                lastTriggeredAt: reminder.lastTriggeredAt ?? nowIso,
                notificationId: undefined,
              };
            } else {
              const nextDate = calculateNextReminderDate(reminder, now);
              console.log('[onBackgroundEvent] Calculated next date for repeating reminder:', nextDate?.toISOString());
              list[idx] = {
                ...reminder,
                snoozeUntil: undefined,
                lastTriggeredAt: nowIso,
                nextReminderDate: nextDate ? nextDate.toISOString() : undefined,
                notificationId: undefined,
              };
              await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
              
              const newNotificationId = await scheduleNotification(list[idx]);
              if (newNotificationId) {
                list[idx].notificationId = newNotificationId;
                await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
              }
            }
          }
          await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
          console.log('[onBackgroundEvent] Updated reminder in storage');
        }
      }
    } catch (err) {
      console.log('[index] backgroundEvent error', err);
    }
  });
}

function HeadlessCheck() {
  return null;
}

AppRegistry.registerComponent('main', () => HeadlessCheck);