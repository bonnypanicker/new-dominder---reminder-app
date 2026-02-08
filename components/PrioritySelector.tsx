import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Priority } from '@/types/reminder';
import { getPriorityColor, getPriorityOnColor } from '@/constants/reminders';
import { useThemeColors } from '@/hooks/theme-provider';
import { Feather } from '@expo/vector-icons';
const Bell = (props: any) => <Feather name="bell" {...props} />;
const Moon = (props: any) => <Feather name="moon" {...props} style={[props.style, { marginLeft: 1.5 }]} />;
const Speaker = (props: any) => <Feather name="volume-2" {...props} style={[props.style, { marginLeft: 0.5 }]} />;

interface PrioritySelectorProps {
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
}

export default function PrioritySelector({ priority, onPriorityChange }: PrioritySelectorProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const priorities: { value: Priority; label: string; IconComponent: any }[] = [
    {
      value: 'medium',
      label: 'Standard',
      IconComponent: Bell,
    },
    {
      value: 'low',
      label: 'Silent',
      IconComponent: Moon,
    },
    {
      value: 'high',
      label: 'Ringer',
      IconComponent: Speaker,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reminder Mode</Text>
      <View style={styles.optionsContainer}>
        {priorities.map((item) => (
          <TouchableOpacity
            key={item.value}
            testID={`priority-option-${item.value}`}
            accessibilityLabel={`priority-option-${item.value}`}
            style={[
              styles.option,
              priority === item.value
                ? [styles.selectedOption, { borderColor: getPriorityColor(colors, item.value) }]
                : [
                  styles.unselectedOption,
                  { borderColor: colors.outlineVariant },
                ],
            ]}
            onPress={() => {
              onPriorityChange(item.value);
            }}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: getPriorityColor(colors, item.value),
                  opacity: priority === item.value ? 1 : 0.7,
                  transform: priority === item.value ? [{ scale: 1.15 }] : [{ scale: 1 }],
                },
              ]}
            >
              <item.IconComponent size={14} color={getPriorityOnColor(colors, item.value)} />
            </View>
            <Text
              style={[
                styles.optionLabel,
                priority === item.value ? styles.selectedLabel : styles.unselectedLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  option: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: colors.primaryContainer,
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 2.5,
  },
  unselectedOption: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.outline,
    opacity: 1,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontWeight: '500',
    fontSize: 11,
  },
  selectedLabel: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 12,
  },
  unselectedLabel: {
    color: colors.onSurface,
    fontWeight: '500',
    fontSize: 11,
  },
});
