const DEBUG_MODE = __DEV__; // __DEV__ is a global variable in React Native, true in development
const log = (tag, message, ...args) => {
    if (DEBUG_MODE) {
        console.log(`[DOMINDER_DEBUG][${tag}] ${message}`, ...args);
    }
};
export const debugService = {
    logNotificationScheduled: (reminderId, notificationId, triggerTime) => {
        log('NOTIF_SCHEDULE', `Reminder ${reminderId} scheduled with ID ${notificationId} for ${triggerTime.toISOString()}`);
    },
    logNotificationTriggered: (reminderId, notificationId, type) => {
        log('NOTIF_TRIGGER', `Reminder ${reminderId} triggered (Notif ID: ${notificationId}, Type: ${type})`);
    },
    logNotificationBlocked: (reminderId, reason) => {
        log('NOTIF_BLOCKED', `Reminder ${reminderId} notification blocked: ${reason}`);
    },
    logNotificationError: (context, error) => {
        log('NOTIF_ERROR', `Error in ${context}: ${error.message || error}`, error);
    },
    logAppEvent: (event, details) => {
        log('APP_EVENT', `App Event: ${event}`, details);
    },
    logReminderState: (reminderId, state) => {
        log('REMINDER_STATE', `Reminder ${reminderId} state:`, state);
    },
};
