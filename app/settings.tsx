import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Volume2, Vibrate, ChevronRight, Clock, AlertCircle, FileText } from 'lucide-react-native';
import { router } from 'expo-router';
import { Material3Colors } from '@/constants/colors';
import { useSettings, useUpdateSettings } from '@/hooks/settings-store';
import { RepeatType } from '@/types/reminder';

export default function SettingsScreen() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [defaultsModalVisible, setDefaultsModalVisible] = useState<boolean>(false);
  const [licensesModalVisible, setLicensesModalVisible] = useState<boolean>(false);
  const [privacyPolicyVisible, setPrivacyPolicyVisible] = useState<boolean>(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('notifications');

  if (isLoading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Material3Colors.light.onSurface} />
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
      case 'ringer': return 'Ringer';
      default: return 'Standard';
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Material3Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'notifications' ? null : 'notifications')}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <Bell size={20} color={Material3Colors.light.primary} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Notifications</Text>
          </View>
          <ChevronRight 
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
            >
              <Bell size={20} color={settings.notificationsEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant} />
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
            >
              <Volume2 size={20} color={settings.soundEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant} />
              <Text style={[styles.toggleLabel, settings.soundEnabled && styles.toggleLabelActive]}>Sound</Text>
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
            >
              <Vibrate size={20} color={settings.vibrationEnabled ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant} />
              <Text style={[styles.toggleLabel, settings.vibrationEnabled && styles.toggleLabelActive]}>Vibration</Text>
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
          </View>
        )}

        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'preferences' ? null : 'preferences')}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <AlertCircle size={20} color={Material3Colors.light.primary} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Preferences</Text>
          </View>
          <ChevronRight 
            size={20} 
            color={Material3Colors.light.onSurfaceVariant}
            style={[styles.chevron, expandedSection === 'preferences' && styles.chevronExpanded]}
          />
        </TouchableOpacity>
        
        {expandedSection === 'preferences' && (
          <View style={styles.sectionContent}>
          <TouchableOpacity 
            style={styles.preferenceCard}
            onPress={() => setDefaultsModalVisible(true)}
          >
            <View style={styles.preferenceIcon}>
              <AlertCircle size={20} color={Material3Colors.light.primary} />
            </View>
            <View style={styles.preferenceContent}>
              <Text style={styles.preferenceTitle}>Reminder Defaults</Text>
              <Text style={styles.preferenceValue}>
                {getRepeatModeLabel(settings.defaultReminderMode)} • {getPriorityLabel(settings.defaultPriority)}
              </Text>
            </View>
            <ChevronRight size={20} color={Material3Colors.light.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.preferenceCard}
            onPress={() => {
              const next = settings.sortMode === 'creation' ? 'upcoming' : 'creation';
              updateSettings.mutate({ sortMode: next });
            }}
          >
            <View style={styles.preferenceIcon}>
              <Clock size={20} color={Material3Colors.light.primary} />
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
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <FileText size={20} color={Material3Colors.light.primary} />
            </View>
            <Text style={styles.sectionHeaderTitle}>About</Text>
          </View>
          <ChevronRight 
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
            >
              <Text style={styles.feedbackButtonText}>Send Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.licensesButton}
              onPress={() => setLicensesModalVisible(true)}
              testID="open-licenses"
            >
              <FileText size={16} color={Material3Colors.light.primary} />
              <Text style={styles.licensesButtonText}>Open Source Licenses</Text>
              <ChevronRight size={16} color={Material3Colors.light.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.licensesButton, { marginTop: 10 }]}
              onPress={() => setPrivacyPolicyVisible(true)}
              testID="open-privacy"
            >
              <FileText size={16} color={Material3Colors.light.primary} />
              <Text style={styles.licensesButtonText}>Privacy Policy</Text>
              <ChevronRight size={16} color={Material3Colors.light.primary} />
            </TouchableOpacity>
          </View>
          </View>
        )}
      </ScrollView>



      <DefaultsModal
        visible={defaultsModalVisible}
        onClose={() => setDefaultsModalVisible(false)}
        selectedMode={settings.defaultReminderMode}
        selectedPriority={settings.defaultPriority}
        onSelectMode={(mode) => {
          updateSettings.mutate({ defaultReminderMode: mode });
        }}
        onSelectPriority={(priority) => {
          updateSettings.mutate({ defaultPriority: priority });
        }}
      />

      <LicensesModal
        visible={licensesModalVisible}
        onClose={() => setLicensesModalVisible(false)}
      />

      <PrivacyPolicyModal
        visible={privacyPolicyVisible}
        onClose={() => setPrivacyPolicyVisible(false)}
      />
    </SafeAreaView>
  );
}

interface DefaultsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMode: RepeatType;
  selectedPriority: 'standard' | 'silent' | 'ringer';
  onSelectMode: (mode: RepeatType) => void;
  onSelectPriority: (priority: 'standard' | 'silent' | 'ringer') => void;
}

function DefaultsModal({ visible, onClose, selectedMode, selectedPriority, onSelectMode, onSelectPriority }: DefaultsModalProps) {
  const repeatModes: { value: RepeatType; label: string }[] = [
    { value: 'none', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'every', label: 'Every' },
  ];

  const priorities: { value: 'standard' | 'silent' | 'ringer'; label: string; icon: any }[] = [
    { value: 'standard', label: 'Standard', icon: Bell },
    { value: 'silent', label: 'Silent', icon: Volume2 },
    { value: 'ringer', label: 'Ringer', icon: AlertCircle },
  ];

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={false} 
      animationType="fade" 
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Reminder Defaults</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <Text style={modalStyles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={modalStyles.defaultsList} showsVerticalScrollIndicator={false}>
          <View style={modalStyles.defaultsSection}>
            <Text style={modalStyles.defaultsSectionTitle}>Default Repeat Mode</Text>
            <View style={modalStyles.optionsGrid}>
              {repeatModes.map((mode) => {
                const isSelected = mode.value === selectedMode;
                return (
                  <TouchableOpacity
                    key={mode.value}
                    style={[modalStyles.optionChip, isSelected && modalStyles.optionChipSelected]}
                    onPress={() => onSelectMode(mode.value)}
                  >
                    <Text style={[modalStyles.optionChipText, isSelected && modalStyles.optionChipTextSelected]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={modalStyles.defaultsSection}>
            <Text style={modalStyles.defaultsSectionTitle}>Default Priority</Text>
            <View style={modalStyles.priorityOptions}>
              {priorities.map((priority) => {
                const isSelected = priority.value === selectedPriority;
                const Icon = priority.icon;
                return (
                  <TouchableOpacity
                    key={priority.value}
                    style={[modalStyles.priorityOption, isSelected && modalStyles.priorityOptionSelected]}
                    onPress={() => onSelectPriority(priority.value)}
                  >
                    <Icon size={24} color={isSelected ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant} />
                    <Text style={[modalStyles.priorityOptionText, isSelected && modalStyles.priorityOptionTextSelected]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 20,
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Material3Colors.light.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Material3Colors.light.onSurface,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Material3Colors.light.onSurfaceVariant,
    lineHeight: 20,
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
});

interface LicensesModalProps {
  visible: boolean;
  onClose: () => void;
}

function LicensesModal({ visible, onClose }: LicensesModalProps) {
  const licenses = [
    {
      name: 'React Native',
      version: '0.76.5',
      license: 'MIT',
      copyright: 'Copyright (c) Meta Platforms, Inc.',
    },
    {
      name: 'Expo',
      version: '~52.0.11',
      license: 'MIT',
      copyright: 'Copyright (c) 2015-present 650 Industries, Inc.',
    },
    {
      name: 'React',
      version: '18.3.1',
      license: 'MIT',
      copyright: 'Copyright (c) Meta Platforms, Inc.',
    },
    {
      name: 'TypeScript',
      version: '~5.7.2',
      license: 'Apache-2.0',
      copyright: 'Copyright (c) Microsoft Corporation',
    },
    {
      name: 'Expo Router',
      version: '~4.0.11',
      license: 'MIT',
      copyright: 'Copyright (c) 2015-present 650 Industries, Inc.',
    },
    {
      name: 'React Query (TanStack Query)',
      version: '^5.62.11',
      license: 'MIT',
      copyright: 'Copyright (c) TanStack',
    },
    {
      name: 'Lucide React Native',
      version: '^0.468.0',
      license: 'ISC',
      copyright: 'Copyright (c) 2020 Lucide Contributors',
    },
    {
      name: 'React Native Safe Area Context',
      version: '4.14.0',
      license: 'MIT',
      copyright: 'Copyright (c) 2019 Th3rd Wave',
    },
    {
      name: 'React Native Screens',
      version: '~4.4.0',
      license: 'MIT',
      copyright: 'Copyright (c) 2018 Software Mansion',
    },
    {
      name: 'Expo AV',
      version: '~15.0.1',
      license: 'MIT',
      copyright: 'Copyright (c) 2015-present 650 Industries, Inc.',
    },
    {
      name: 'Expo Camera',
      version: '~16.0.10',
      license: 'MIT',
      copyright: 'Copyright (c) 2015-present 650 Industries, Inc.',
    },
    {
      name: 'Expo Notifications',
      version: '~0.29.13',
      license: 'MIT',
      copyright: 'Copyright (c) 2015-present 650 Industries, Inc.',
    },
    {
      name: 'Expo Haptics',
      version: '~14.0.0',
      license: 'MIT',
      copyright: 'Copyright (c) 2015-present 650 Industries, Inc.',
    },
    {
      name: 'Async Storage',
      version: '2.1.0',
      license: 'MIT',
      copyright: 'Copyright (c) 2015-present, Facebook, Inc.',
    },
    {
      name: '@nkzw/create-context-hook',
      version: '^1.0.1',
      license: 'MIT',
      copyright: 'Copyright (c) nkzw',
    },
    {
      name: 'Date-fns',
      version: '^4.1.0',
      license: 'MIT',
      copyright: 'Copyright (c) 2021 Sasha Koss and Lesha Koss',
    },
  ];

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={false} 
      animationType="fade" 
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Open Source Licenses</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <Text style={modalStyles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={modalStyles.licensesList} showsVerticalScrollIndicator={false}>
          <View style={modalStyles.licensesIntro}>
            <Text style={modalStyles.licensesIntroText}>
              This app is built with the following open source software:
            </Text>
          </View>
          
          {licenses.map((license) => (
            <View
              key={license.name}
              style={modalStyles.licenseItem}
            >
              <View style={modalStyles.licenseHeader}>
                <Text style={modalStyles.licenseName}>{license.name}</Text>
                <Text style={modalStyles.licenseVersion}>v{license.version}</Text>
              </View>
              <Text style={modalStyles.licenseLicense}>{license.license} License</Text>
              <Text style={modalStyles.licenseCopyright}>{license.copyright}</Text>
            </View>
          ))}
          
          <View style={modalStyles.licenseFooter}>
            <Text style={modalStyles.licenseFooterTitle}>MIT License</Text>
            <Text style={modalStyles.licenseFooterText}>
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
              {"\n\n"}
              The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
              {"\n\n"}
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
            </Text>
            
            <Text style={modalStyles.licenseFooterTitle}>Apache License 2.0</Text>
            <Text style={modalStyles.licenseFooterText}>
              Licensed under the Apache License, Version 2.0 (the &quot;License&quot;); you may not use this file except in compliance with the License.
              {"\n\n"}
              Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an &quot;AS IS&quot; BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
            </Text>
            
            <Text style={modalStyles.licenseFooterTitle}>ISC License</Text>
            <Text style={modalStyles.licenseFooterText}>
              Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
              {"\n\n"}
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot; AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={false} 
      animationType="fade" 
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Privacy Policy</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton} testID="privacy-close">
            <Text style={modalStyles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={modalStyles.scroll} contentContainerStyle={modalStyles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 16, color: Material3Colors.light.onSurface, marginTop: 12, marginBottom: 8, fontWeight: '600' }}>
            Overview
          </Text>
          <Text style={{ fontSize: 14, color: Material3Colors.light.onSurfaceVariant, lineHeight: 20 }}>
            DoMinder is a local-first reminders app. Your reminders and settings are stored on your device using AsyncStorage. We do not operate a server and do not collect, sell, or share personal data.
          </Text>

          <Text style={{ fontSize: 16, color: Material3Colors.light.onSurface, marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
            Data We Store
          </Text>
          <Text style={{ fontSize: 14, color: Material3Colors.light.onSurfaceVariant, lineHeight: 20 }}>
            - Reminders you create (title, schedule, repeat rules, local flags){"\n"}
            - App settings (theme, notification preferences, sort order){"\n"}
            This data never leaves your device unless you back it up via your OS.
          </Text>

          <Text style={{ fontSize: 16, color: Material3Colors.light.onSurface, marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
            Permissions
          </Text>
          <Text style={{ fontSize: 14, color: Material3Colors.light.onSurfaceVariant, lineHeight: 20 }}>
            Notifications are used to alert you at scheduled times. Sounds and vibration are used according to your preferences. Camera, location, contacts, or other sensitive permissions are not used.
          </Text>

          <Text style={{ fontSize: 16, color: Material3Colors.light.onSurface, marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
            Third-Party Services
          </Text>
          <Text style={{ fontSize: 14, color: Material3Colors.light.onSurfaceVariant, lineHeight: 20 }}>
            The app does not integrate analytics SDKs or advertising networks. On some platforms, system services (e.g., OS notifications) may process data per their policies.
          </Text>

          <Text style={{ fontSize: 16, color: Material3Colors.light.onSurface, marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
            Data Control
          </Text>
          <Text style={{ fontSize: 14, color: Material3Colors.light.onSurfaceVariant, lineHeight: 20 }}>
            You can delete reminders individually or clear app data from your device settings to remove all stored information.
          </Text>

          <Text style={{ fontSize: 16, color: Material3Colors.light.onSurface, marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
            Contact
          </Text>
          <Text style={{ fontSize: 14, color: Material3Colors.light.onSurfaceVariant, lineHeight: 20, marginBottom: 24 }}>
            For privacy questions, please send feedback through the app.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Material3Colors.light.surface,
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
    borderBottomWidth: 1,
    borderBottomColor: Material3Colors.light.surfaceVariant,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Material3Colors.light.primaryContainer,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Material3Colors.light.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  defaultsList: {
    flex: 1,
    padding: 24,
  },
  defaultsSection: {
    marginBottom: 32,
  },
  defaultsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Material3Colors.light.onSurfaceVariant,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Material3Colors.light.surfaceVariant,
    margin: 6,
  },
  optionChipSelected: {
    backgroundColor: Material3Colors.light.primaryContainer,
    borderColor: Material3Colors.light.primary,
  },
  optionChipText: {
    fontSize: 14,
    color: Material3Colors.light.onSurfaceVariant,
  },
  optionChipTextSelected: {
    color: Material3Colors.light.primary,
    fontWeight: '500',
  },
  priorityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Material3Colors.light.surfaceVariant,
  },
  priorityOptionSelected: {
    backgroundColor: Material3Colors.light.primaryContainer,
    borderColor: Material3Colors.light.primary,
  },
  priorityOptionText: {
    fontSize: 13,
    color: Material3Colors.light.onSurfaceVariant,
    marginTop: 8,
  },
  priorityOptionTextSelected: {
    color: Material3Colors.light.primary,
    fontWeight: '500',
  },
  soundList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: Material3Colors.light.surfaceContainerLow,
  },
  soundItemSelected: {
    backgroundColor: Material3Colors.light.primaryContainer,
    borderWidth: 1,
    borderColor: Material3Colors.light.primary,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '500',
    color: Material3Colors.light.onSurface,
    marginBottom: 2,
  },
  soundNameSelected: {
    color: Material3Colors.light.primary,
  },
  soundDescription: {
    fontSize: 14,
    color: Material3Colors.light.onSurfaceVariant,
  },
  soundDescriptionSelected: {
    color: Material3Colors.light.primary,
  },
  soundActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Material3Colors.light.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonLoading: {
    opacity: 0.5,
  },
  loadingText: {
    fontSize: 12,
    color: Material3Colors.light.primary,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: Material3Colors.light.onSurfaceVariant,
  },
  licensesList: {
    flex: 1,
  },
  licensesIntro: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  licensesIntroText: {
    fontSize: 14,
    color: Material3Colors.light.onSurfaceVariant,
    lineHeight: 20,
  },
  licenseItem: {
    marginHorizontal: 24,
    marginVertical: 8,
    padding: 16,
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 12,
    elevation: 1,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  licenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
  },
  licenseVersion: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    backgroundColor: Material3Colors.light.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  licenseLicense: {
    fontSize: 14,
    fontWeight: '500',
    color: Material3Colors.light.primary,
    marginBottom: 4,
  },
  licenseCopyright: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    marginBottom: 4,
  },

  licenseFooter: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  licenseFooterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
    marginTop: 24,
    marginBottom: 12,
  },
  licenseFooterText: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    lineHeight: 18,
  },
  checkIcon: {
    marginLeft: 12,
  },
});