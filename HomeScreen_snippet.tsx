// HomeScreen.tsx snippet - FlashList with SwipeableRow integration
import React, { useRef } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import SwipeableRow from '../components/SwipeableRow';
import ReminderCard from '../components/ReminderCard';

const HomeScreen = () => {
  // ✅ Ref to manage multiple swipeables (close others when one opens)
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleCompleteReminder = (reminder: Reminder) => {
    // Your completion logic here
    completeReminder.mutate({ reminder, fromSwipe: true });
  };

  const handleDeleteReminder = (reminder: Reminder) => {
    // Your deletion logic here  
    deleteReminder.mutate(reminder.id);
  };

  const renderReminderItem = ({ item: reminder }: { item: Reminder }) => (
    <SwipeableRow
      reminder={reminder}
      onSwipeRight={() => handleCompleteReminder(reminder)}
      onSwipeLeft={() => handleDeleteReminder(reminder)}
      swipeableRefs={swipeableRefs}
      // ✅ Optional: Add simultaneous handlers for scroll conflict resolution
      simultaneousHandlers={flashListRef}
    >
      <ReminderCard
        reminder={reminder}
        onPress={() => handleReminderPress(reminder)}
        isSelected={selectedReminders.has(reminder.id)}
        isSelectionMode={isSelectionMode}
      />
    </SwipeableRow>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={currentList}
        renderItem={renderReminderItem}
        estimatedItemSize={136}
        // ✅ CRITICAL: Use stable keys for proper recycling
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingTop: 8
        }}
        // ✅ Smooth layout animations for card removal/addition
        itemLayoutAnimation={{
          type: 'spring',
          springDamping: 0.8,
          springStiffness: 100,
        }}
        // ✅ Performance optimization
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
};

export default HomeScreen;