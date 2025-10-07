const DEBUG_MODE = __DEV__; // __DEV__ is a global variable in React Native, true in development

const log = (tag: string, message: string, ...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(`[DOMINDER_DEBUG][${tag}] ${message}`, ...args);
  }
};

export const debugService = {
  logNotificationScheduled: (reminderId: string, notificationId: string, triggerTime: Date) => {
    log('NOTIF_SCHEDULE', `Reminder ${reminderId} scheduled with ID ${notificationId} for ${triggerTime.toISOString()}`);
  },
  logNotificationTriggered: (reminderId: string, notificationId: string, type: string) => {
    log('NOTIF_TRIGGER', `Reminder ${reminderId} triggered (Notif ID: ${notificationId}, Type: ${type})`);
  },
  logNotificationBlocked: (reminderId: string, reason: string) => {
    log('NOTIF_BLOCKED', `Reminder ${reminderId} notification blocked: ${reason}`);
  },
  logNotificationError: (context: string, error: any) => {
    log('NOTIF_ERROR', `Error in ${context}: ${error.message || error}`, error);
  },
  logAppEvent: (event: string, details?: any) => {
    log('APP_EVENT', `App Event: ${event}`, details);
  },
  logReminderState: (reminderId: string, state: any) => {
    log('REMINDER_STATE', `Reminder ${reminderId} state:`, state);
  },
};
