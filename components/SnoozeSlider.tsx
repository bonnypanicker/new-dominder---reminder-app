import React, { useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { SNOOZE_OPTIONS } from '@/constants/reminders';

interface SnoozeSliderProps {
  onSnooze: (minutes: number) => void;
  onCancel: () => void;
}

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 80;
const BUTTON_SIZE = 60;

export default function SnoozeSlider({ onSnooze, onCancel }: SnoozeSliderProps) {
  const [dragPosition, setDragPosition] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(5);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newPosition = Math.max(0, Math.min(SLIDER_WIDTH - BUTTON_SIZE, gestureState.dx));
      setDragPosition(newPosition);
      
      const progress = newPosition / (SLIDER_WIDTH - BUTTON_SIZE);
      const minutes = Math.round(progress * 30) + 5; // 5-35 minutes range
      setSelectedMinutes(minutes);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        onSnooze(selectedMinutes);
      } else {
        setDragPosition(0);
        setSelectedMinutes(5);
      }
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Drag to Snooze</Text>
      <Text style={styles.minutesText}>{selectedMinutes} minutes</Text>
      
      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <Text style={styles.sliderLabel}>Snooze</Text>
        </View>
        <View
          style={[styles.sliderButton, { left: dragPosition }]}
          {...panResponder.panHandlers}
        >
          <Text style={styles.buttonText}>⏰</Text>
        </View>
      </View>
      
      <View style={styles.quickOptions}>
        <Text style={styles.quickOptionsTitle}>Quick Options:</Text>
        <View style={styles.quickOptionsContainer}>
          {SNOOZE_OPTIONS.map((option) => (
            <Text
              key={option.minutes}
              style={[
                styles.quickOption,
                selectedMinutes === option.minutes && styles.quickOptionSelected
              ]}
              onPress={() => onSnooze(option.minutes)}
            >
              {option.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  minutesText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 30,
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: BUTTON_SIZE,
    position: 'relative',
    marginBottom: 30,
  },
  sliderTrack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    paddingLeft: 20,
  },
  sliderLabel: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  sliderButton: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: '#1E3A8A',
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 24,
  },
  quickOptions: {
    alignItems: 'center',
  },
  quickOptionsTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  quickOptionSelected: {
    backgroundColor: '#1E3A8A',
    color: 'white',
  },
});