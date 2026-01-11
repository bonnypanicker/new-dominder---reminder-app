import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Material3Colors } from '@/constants/colors';
import { useSettings, useUpdateSettings } from '@/hooks/settings-store';
import { RepeatType } from '@/types/reminder';

// Memoized repeat mode chip component
const RepeatModeChip = React.memo<{
  mode: { value: RepeatType; label: string };
  isSelected: boolean;
  onPress: (value: RepeatType) => void;
}>(({ mode, isSelected, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(mode.value);
  }, [mode.value, onPress]);

  return (
    <TouchableOpacity
      style={[styles.optionChip, isSelected && styles.optionChipSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>
        {mode.label}
      </Text>
    </TouchableOpacity>
  );
});
RepeatModeChip.displayName = 'RepeatModeChip';

// Memoized priority option component
const PriorityOption = React.memo<{
  priority: { value: 'standard' | 'silent' | 'ringer'; label: string; icon: 'bell' | 'volume-2' | 'alert-circle' };
  isSelected: boolean;
  onPress: (value: 'standard' | 'silent' | 'ringer') => void;
}>(({ priority, isSelected, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(priority.value);
  }, [priority.value, onPress]);

  const iconColor = isSelected ? Material3Colors.light.primary : Material3Colors.light.onSurfaceVariant;

  return (
    <TouchableOpacity
      style={[styles.priorityOption, isSelected && styles.priorityOptionSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Feather name={priority.icon} size={24} color={iconColor} />
      <Text style={[styles.priorityOptionText, isSelected && styles.priorityOptionTextSelected]}>
        {priority.label}
      </Text>
    </TouchableOpacity>
  );
});
PriorityOption.displayName = 'PriorityOption';

export default function DefaultsScreen() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const insets = useSafeAreaInsets();

  const repeatModes = useMemo(() => [
    { value: 'none' as RepeatType, label: 'Once' },
    { value: 'daily' as RepeatType, label: 'Daily' },
    { value: 'monthly' as RepeatType, label: 'Monthly' },
    { value: 'yearly' as RepeatType, label: 'Yearly' },
    { value: 'every' as RepeatType, label: 'Every' },
  ], []);

  const priorities = useMemo(() => [
    { value: 'standard' as const, label: 'Standard', icon: 'bell' as const },
    { value: 'silent' as const, label: 'Silent', icon: 'volume-2' as const },
    { value: 'ringer' as const, label: 'Ringer Mode', icon: 'alert-circle' as const },
  ], []);

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="defaults-back">
          <Feather name="arrow-left" size={24} color={Material3Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Reminder Defaults</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Content */}
      <ScrollView 
        style={styles.defaultsList} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Repeat Mode Section */}
        <View style={styles.defaultsSection}>
          <Text style={styles.defaultsSectionTitle}>Default Repeat Mode</Text>
          <View style={styles.optionsGrid}>
            {repeatModes.map((mode) => (
              <RepeatModeChip
                key={mode.value}
                mode={mode}
                isSelected={mode.value === settings.defaultReminderMode}
                onPress={(mode) => updateSettings.mutate({ defaultReminderMode: mode })}
              />
            ))}
          </View>
        </View>

        {/* Priority Section */}
        <View style={styles.defaultsSection}>
          <Text style={styles.defaultsSectionTitle}>Default Priority</Text>
          <View style={styles.priorityOptions}>
            {priorities.map((priority) => (
              <PriorityOption
                key={priority.value}
                priority={priority}
                isSelected={priority.value === settings.defaultPriority}
                onPress={(p) => updateSettings.mutate({ defaultPriority: p })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    paddingBottom: 20,
    backgroundColor: Material3Colors.light.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  placeholder: {
    width: 40,
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
});
