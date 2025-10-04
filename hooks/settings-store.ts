import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RepeatType } from '@/types/reminder';

import { notificationService } from '@/hooks/notification-service';

const SETTINGS_STORAGE_KEY = 'dominder_settings';

export interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  sortMode: 'creation' | 'upcoming';
  defaultReminderMode: RepeatType;
  defaultPriority: 'standard' | 'silent' | 'ringer';
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  darkMode: false,
  sortMode: 'creation',
  defaultReminderMode: 'none',
  defaultPriority: 'standard',
};

export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<AppSettings> => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
        return DEFAULT_SETTINGS;
      } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
      }
    },
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<AppSettings>): Promise<AppSettings> => {
      try {
        const current = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        const currentSettings: AppSettings = current ? JSON.parse(current) as AppSettings : DEFAULT_SETTINGS;
        const updatedSettings: AppSettings = { ...currentSettings, ...updates };
        
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
        return updatedSettings;
      } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
      }
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });

      try {
        if (typeof variables.notificationsEnabled === 'boolean') {
          if (variables.notificationsEnabled === false) {
            await notificationService.cancelAllNotifications();

          } else {
            await notificationService.initialize();
          }
        }

        if (typeof variables.soundEnabled === 'boolean' || typeof variables.vibrationEnabled === 'boolean') {
          // No reschedule needed; future notifications will respect toggles.
          // Optionally clear presented notifications to apply immediately

        }
      } catch {
        console.log('Post-settings toggle side effects failed');
      }
    },
  });
};