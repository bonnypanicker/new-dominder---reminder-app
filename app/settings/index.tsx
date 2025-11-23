import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Linking, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Material3Colors } from '@/constants/colors';
import { useSettings, useUpdateSettings } from '@/hooks/settings-store';
import { RepeatType } from '@/types/reminder';

const { AlarmModule } = NativeModules;

export default function SettingsScreen() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  // Modals replaced by routes
  const [currentRingtone, setCurrentRingtone] = useState<string>('Default Alarm');
  const [expandedSection, setExpandedSection] = useState<string | null>('notifications');

  // Load current ringtone on mount
  useEffect(() => {
    const loadRingtone = async () => {
      if (Platform.OS === 'android' && AlarmModule?.getAlarmRingtone) {
        try {
          const result = await AlarmModule.getAlarmRingtone();
          if (result?.title) {
            setCurrentRingtone(result.title);
          }
        } catch (error) {
          console.log('Error loading ringtone:', error);
        }
      }
    };
    loadRingtone();
  }, []);

  if (isLoading || !settings) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="settings-back">
            <Feather name="arrow-left" size={24} color={Material3Colors.light.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getRepeatModeLabel = (mode: RepeatType): string => {
    switch (mode) {
      case 'none': return 'Once';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      case 'every': return 'Every';
      case 'custom': return 'Custom';
      default: return 'Once';
    }
  };

  const getPriorityLabel = (priority: 'standard' | 'silent' | 'ringer'): string => {
    switch (priority) {
      case 'standard': return 'Standard';
      case 'silent': return 'Silent';
      case 'ringer': return 'High Priority';
      default: return 'Standard';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="settings-back">
          <Feather name="arrow-left" size={24} color={Material3Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'notifications' ? null : 'notifications')}
          testID="section-notifications"
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <Feather name="bell" size={20} color={Material3Colors.light.primary} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Notifications</Text>
          </View>
          <Feather 
            name="chevron-right"
            size={20} 
            color={Material3Colors.light.onSurfaceVariant}
            style={[styles.chevron, expandedSection === 'notifications' && styles.chevronExpanded]}
          />
        </TouchableOpacity>
        
        {expandedSection === 'notifications' && (
          <View style={styles.sectionContent}>
            <View style={styles.toggleGroup}>
              <TouchableOpacity 
                style={styles.toggleItem}
                onPress={() => updateSettings.mutate({ notificationsEnabled: !settings.notificationsEnabled })}
                testID="toggle-notifications"
              >
                <Feather name="bell" size={20} color={settings.notificationsEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant} />
                <Text style={[styles.toggleLabel, settings.notificationsEnabled && styles.toggleLabelActive]}>Notifications</Text>
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(value) => updateSettings.mutate({ notificationsEnabled: value })}
                  trackColor={{ 
                    false: Material3Colors.light.surfaceVariant, 
                    true: Material3Colors.light.primaryContainer 
                  }}
                  thumbColor={settings.notificationsEnabled ? Material3Colors.light.primary : Material3Colors.light.outline}
                  style={styles.toggleSwitch}
                />
              </TouchableOpacity>

              <View style={styles.toggleDivider} />

              <TouchableOpacity 
                style={styles.toggleItem}
                onPress={() => updateSettings.mutate({ soundEnabled: !settings.soundEnabled })}
                testID="toggle-sound"
              >
                <Feather name="volume-2" size={20} color={settings.soundEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant} />
                <Text style={[styles.toggleLabel, settings.soundEnabled && styles.toggleLabelActive]}>Ringer Sound</Text>
                <Switch
                  value={settings.soundEnabled}
                  onValueChange={(value) => updateSettings.mutate({ soundEnabled: value })}
                  trackColor={{ 
                    false: Material3Colors.light.surfaceVariant, 
                    true: Material3Colors.light.primaryContainer 
                  }}
                  thumbColor={settings.soundEnabled ? Material3Colors.light.primary : Material3Colors.light.outline}
                  style={styles.toggleSwitch}
                />
              </TouchableOpacity>

              <View style={styles.toggleDivider} />

              <TouchableOpacity 
                style={styles.toggleItem}
                onPress={() => updateSettings.mutate({ vibrationEnabled: !settings.vibrationEnabled })}
                testID="toggle-vibration"
              >
                <Feather name="smartphone" size={20} color={settings.vibrationEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant} />
                <Text style={[styles.toggleLabel, settings.vibrationEnabled && styles.toggleLabelActive]}>Ringer Vibration</Text>
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={(value) => updateSettings.mutate({ vibrationEnabled: value })}
                  trackColor={{ 
                    false: Material3Colors.light.surfaceVariant, 
                    true: Material3Colors.light.primaryContainer 
                  }}
                  thumbColor={settings.vibrationEnabled ? Material3Colors.light.primary : Material3Colors.light.outline}
                  style={styles.toggleSwitch}
                />
              </TouchableOpacity>
            </View>

            {Platform.OS === 'android' && (
              <TouchableOpacity 
                style={styles.ringtoneCard}
                onPress={async () => {
                  if (!AlarmModule?.openRingtonePicker) {
                    console.log('AlarmModule.openRingtonePicker not available');
                    return;
                  }
                  try {
                    const result = await AlarmModule.openRingtonePicker();
                    if (result?.title) {
                      setCurrentRingtone(result.title);
                    }
                  } catch (error: any) {
                    if (error?.code !== 'CANCELLED') {
                      console.error('Error selecting ringtone:', error);
                    }
                  }
                }}
                testID="ringtone-picker"
              >
                <View style={styles.ringtoneIcon}>
                  <Feather name="volume-2" size={20} color={Material3Colors.light.primary} />
                </View>
                <View style={styles.ringtoneContent}>
                  <Text style={styles.ringtoneTitle}>Ringer Mode Tone</Text>
                  <Text style={styles.ringtoneValue}>{currentRingtone}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={Material3Colors.light.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'preferences' ? null : 'preferences')}
          testID="section-preferences"
        >
          <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <Feather name="alert-circle" size={20} color={Material3Colors.light.primary} />
              </View>
              <Text style={styles.sectionHeaderTitle}>Preferences</Text>
            </View>
            <Feather 
              name="chevron-right"
              size={20} 
              color={Material3Colors.light.onSurfaceVariant}
              style={[styles.chevron, expandedSection === 'preferences' && styles.chevronExpanded]}
            />
        </TouchableOpacity>
        {expandedSection === 'preferences' && (
          <View style={styles.sectionContent}>
            <TouchableOpacity 
              style={styles.preferenceCard}
              onPress={() => router.push('/settings/defaults')}
              testID="open-defaults"
            >
              <View style={styles.preferenceIcon}>
                <Feather name="alert-circle" size={20} color={Material3Colors.light.primary} />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Reminder Defaults</Text>
                <Text style={styles.preferenceValue}>
                  {getRepeatModeLabel(settings.defaultReminderMode)} • {getPriorityLabel(settings.defaultPriority)}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={Material3Colors.light.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceCard}
              onPress={() => {
                const next = settings.sortMode === 'creation' ? 'upcoming' : 'creation';
                updateSettings.mutate({ sortMode: next });
              }}
              testID="toggle-sort-mode"
            >
              <View style={styles.preferenceIcon}>
                <Feather name="clock" size={20} color={Material3Colors.light.primary} />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Sort Order</Text>
                <Text style={styles.preferenceValue}>
                  {settings.sortMode === 'creation' ? 'Newest First' : 'Upcoming First'}
                </Text>
              </View>
              <View style={styles.sortToggle}>
                <Text style={styles.sortToggleText}>
                  {settings.sortMode === 'creation' ? 'Date' : 'Time'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'about' ? null : 'about')}
          testID="section-about"
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <Feather name="file-text" size={20} color={Material3Colors.light.primary} />
            </View>
            <Text style={styles.sectionHeaderTitle}>About</Text>
          </View>
          <Feather 
            name="chevron-right"
            size={20} 
            color={Material3Colors.light.onSurfaceVariant}
            style={[styles.chevron, expandedSection === 'about' && styles.chevronExpanded]}
          />
        </TouchableOpacity>
        
        {expandedSection === 'about' && (
          <View style={styles.sectionContent}>
            <View style={styles.aboutCard}>
              <View style={styles.aboutHeader}>
                <Text style={styles.aboutAppName}>DoMinder</Text>
                <Text style={styles.aboutVersion}>v1.0.0</Text>
              </View>
              <View style={styles.aboutDivider} />
              <TouchableOpacity
                style={styles.feedbackButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Linking.openURL('mailto:feedback@dominder.app');
                  }
                }}
                testID="send-feedback"
              >
                <Text style={styles.feedbackButtonText}>Send Feedback</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.licensesButton}
                onPress={() => router.push('/settings/licenses')}
                testID="open-licenses"
              >
                <Feather name="file-text" size={16} color={Material3Colors.light.primary} />
                <Text style={styles.licensesButtonText}>Open Source Licenses</Text>
                <Feather name="chevron-right" size={16} color={Material3Colors.light.primary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.licensesButton, { marginTop: 10 }]}
                onPress={() => router.push('/settings/privacy')}
                testID="open-privacy"
              >
                <Feather name="file-text" size={16} color={Material3Colors.light.primary} />
                <Text style={styles.licensesButtonText}>Privacy Policy</Text>
                <Feather name="chevron-right" size={16} color={Material3Colors.light.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    paddingTop: 32,
    paddingBottom: 20,
    backgroundColor: Material3Colors.light.surface,
    elevation: 2,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    color: Material3Colors.light.onSurface,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Material3Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Material3Colors.light.surfaceVariant,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Material3Colors.light.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Material3Colors.light.onSurface,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  sectionContent: {
    padding: 20,
    backgroundColor: Material3Colors.light.surfaceContainerLowest,
  },
  toggleGroup: {
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 16,
    padding: 4,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    marginLeft: 12,
    color: Material3Colors.light.onSurfaceVariant,
  },
  toggleLabelActive: {
    color: Material3Colors.light.onSurface,
    fontWeight: '500',
  },
  toggleSwitch: {
    transform: [{ scale: 0.9 }],
  },
  toggleDivider: {
    height: 1,
    backgroundColor: Material3Colors.light.surfaceVariant,
    marginHorizontal: 12,
  },
  preferenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  preferenceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Material3Colors.light.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Material3Colors.light.onSurface,
    marginBottom: 2,
  },
  preferenceValue: {
    fontSize: 13,
    color: Material3Colors.light.onSurfaceVariant,
  },
  sortToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Material3Colors.light.primaryContainer,
    borderRadius: 12,
  },
  sortToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Material3Colors.light.primary,
  },
  aboutCard: {
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
  },
  aboutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutAppName: {
    fontSize: 20,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
  },
  aboutVersion: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    backgroundColor: Material3Colors.light.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: Material3Colors.light.surfaceVariant,
    marginBottom: 16,
  },
  feedbackButton: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  feedbackButtonText: {
    fontSize: 14,
    color: Material3Colors.light.primary,
    textDecorationLine: 'underline',
  },
  licensesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.primaryContainer,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  licensesButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Material3Colors.light.primary,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Material3Colors.light.onSurfaceVariant,
  },
  ringtoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  ringtoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Material3Colors.light.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ringtoneContent: {
    flex: 1,
  },
  ringtoneTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Material3Colors.light.onSurface,
    marginBottom: 2,
  },
  ringtoneValue: {
    fontSize: 13,
    color: Material3Colors.light.primary,
    marginBottom: 4,
  },
  ringtoneHint: {
    fontSize: 11,
    color: Material3Colors.light.onSurfaceVariant,
    fontStyle: 'italic',
  },
});
