
import { markReminderDone } from './reminder-scheduler';
import { Platform, NativeModules } from 'react-native';

// Mocks
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    AlarmModule: {
      getNativeReminderState: jest.fn(),
      updateOccurrenceCount: jest.fn(),
      clearReminderMetadata: jest.fn(),
    }
  },
  DeviceEventEmitter: { emit: jest.fn() }
}));

const mockGetReminder = jest.fn();
const mockUpdateReminder = jest.fn();
const mockCancelAll = jest.fn();
const mockSchedule = jest.fn();
const mockDelete = jest.fn(); // Add mock for permanentlyDeleteReminder

jest.mock('./reminder-service', () => ({
  getReminder: (id: string) => mockGetReminder(id),
  updateReminder: (r: any) => mockUpdateReminder(r),
  getReminders: () => Promise.resolve([]),
  permanentlyDeleteReminder: (id: string) => mockDelete(id),
  addReminder: jest.fn(), // Add addReminder
}));

jest.mock('../hooks/notification-service', () => ({
  notificationService: {
    cancelAllNotificationsForReminder: () => mockCancelAll(),
    scheduleReminderByModel: () => mockSchedule(),
  }
}));

jest.mock('../services/reminder-utils', () => ({
  calculateNextReminderDate: () => new Date('2024-01-01T12:00:00Z') // Always return a next date
}));

describe('markReminderDone - Snooze Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NativeModules.AlarmModule.getNativeReminderState as jest.Mock).mockResolvedValue(null);
  });

  test('Medium Priority (Notifee) Snooze Done -> Should Increment', async () => {
    // Setup: Reminder that was snoozed (wasSnoozed=true), Count=0
    mockGetReminder.mockResolvedValue({
      id: 'medium-rem',
      priority: 'medium',
      wasSnoozed: true,
      occurrenceCount: 0,
      repeatType: 'every',
      untilType: 'count',
      untilCount: 3,
      snoozeUntil: '2024-01-01T10:05:00Z'
    });

    // Action: JS UI calls markReminderDone(true)
    await markReminderDone('medium-rem', true);

    // Expect: Count should increment 0 -> 1
    expect(mockUpdateReminder).toHaveBeenCalledWith(expect.objectContaining({
      occurrenceCount: 1
    }));
  });

  test('High Priority (Native) Snooze Done -> Should NOT Increment (if Sync happened)', async () => {
    // Setup: Reminder was snoozed. Native Alarm fired (Count=1).
    mockGetReminder.mockResolvedValue({
      id: 'high-rem',
      priority: 'high', // Ringer
      wasSnoozed: true,
      occurrenceCount: 0,
      repeatType: 'every',
      untilType: 'count',
      untilCount: 3,
      snoozeUntil: '2024-01-01T10:05:00Z'
    });

    // Mock Native State returning incremented count (1)
    (NativeModules.AlarmModule.getNativeReminderState as jest.Mock).mockResolvedValue({
      actualTriggerCount: 1,
      occurrenceCount: 1
    });

    // Action: JS UI calls markReminderDone(true)
    await markReminderDone('high-rem', true);

    // Expect: 
    // Sync logic sets current=1.
    // If we increment, it becomes 2 (WRONG).
    // If we fix it, it stays 1.
    expect(mockUpdateReminder).toHaveBeenCalledWith(expect.objectContaining({
      occurrenceCount: 1 
    }));
  });
});
