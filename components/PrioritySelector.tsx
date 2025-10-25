import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Priority } from '@/types/reminder';
import { PRIORITY_COLORS } from '@/constants/reminders';
import { Material3Colors } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';
const AlertTriangle = (props: any) => <Feather name="alert-triangle" {...props} />;
const Bell = (props: any) => <Feather name="bell" {...props} />;
const Info = (props: any) => <Feather name="info" {...props} />;

interface PrioritySelectorProps {
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
}

export default function PrioritySelector({ priority, onPriorityChange }: PrioritySelectorProps) {
  const priorities: { value: Priority; label: string; IconComponent: any; description: string }[] = [
    {
      value: 'medium',
      label: 'Standard',
      IconComponent: Bell,
      description: 'Sound & Vibrate'
    },
    {
      value: 'low',
      label: 'Silent',
      IconComponent: Info,
      description: 'Quiet'
    },
    {
      value: 'high',
      label: 'Ringer',
      IconComponent: AlertTriangle,
      description: 'Rings Alarm'
    },
  ];



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reminder Mode</Text>
      <View style={styles.optionsContainer}>
        {priorities.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.option,
              priority === item.value ? [
                styles.selectedOption,
                { borderColor: PRIORITY_COLORS[item.value] }
              ] : [
                styles.unselectedOption,
                { borderColor: Material3Colors.light.outlineVariant }
              ]
            ]}
            onPress={() => onPriorityChange(item.value)}
          >
            <View style={[
              styles.iconContainer, 
              { 
                backgroundColor: PRIORITY_COLORS[item.value],
                opacity: priority === item.value ? 1 : 0.7,
                transform: priority === item.value ? [{ scale: 1.15 }] : [{ scale: 1 }]
              }
            ]}>
              <item.IconComponent size={14} color="white" />
            </View>
            <Text style={[styles.optionLabel, priority === item.value ? styles.selectedLabel : styles.unselectedLabel]}>
              {item.label}
            </Text>
            <Text style={[styles.optionDescription, priority === item.value ? styles.selectedDescription : styles.unselectedDescription]}>
              {item.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Material3Colors.light.onSurface,
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  option: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  selectedOption: {
    backgroundColor: Material3Colors.light.primaryContainer,
    elevation: 6,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 2.5,
  },
  unselectedOption: {
    backgroundColor: Material3Colors.light.surfaceVariant,
    borderColor: Material3Colors.light.outline,
    opacity: 1,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontWeight: '500',
    fontSize: 11,
  },
  selectedLabel: {
    color: Material3Colors.light.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 12,
  },
  unselectedLabel: {
    color: Material3Colors.light.onSurface,
    fontWeight: '500',
    fontSize: 11,
  },
  optionDescription: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
  selectedDescription: {
    color: Material3Colors.light.onPrimaryContainer,
    opacity: 0.9,
    fontWeight: '600',
    fontSize: 10,
  },
  unselectedDescription: {
    color: Material3Colors.light.onSurfaceVariant,
    opacity: 0.8,
    fontWeight: '400',
  },

});