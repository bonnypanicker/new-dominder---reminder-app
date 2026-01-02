import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Reminder, RepeatType, EveryUnit } from '@/types/reminder';
import { PRIORITY_COLORS } from '@/constants/reminders';
import { Material3Colors } from '@/constants/colors';
import SwipeableRow from '@/components/SwipeableRow';
import { calculateNextReminderDate } from '@/services/reminder-utils';

// Icon components
const Clock = (props: any) => <Feather name="clock" {...props} />;
const RotateCcw = (props: any) => <Feather name="rotate-ccw" {...props} />;
const Square = (props: any) => <Feather name="square" {...props} />;
const CheckSquare = (props: any) => <Feather name="check-square" {...props} />;
const PauseCircle = (props: any) => <Feather name="pause-circle" {...props} />;
const PlayCircle = (props: any) => <Feather name="play-circle" {...props} />;
const CheckCircle = (props: any) => <Feather name="check-circle" {...props} />;
const Trash2 = (props: any) => <Feather name="trash-2" {...props} />;

// Helper functions - defined outside component for stability
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const formatRepeatType = (repeatType: RepeatType, everyInterval?: { value: number; unit: EveryUnit }): string => {
  switch (repeatType) {
    case 'none': return 'Once';
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'yearly': return 'Yearly';
    case 'custom': return 'Custom';
    case 'every': return 'Every';
    default: return 'Once';
  }
};

export interface ReminderCardProps {
  reminder: Reminder;
  listType: 'active' | 'completed' | 'deleted';
  isSelected: boolean;
  isSelectionMode: boolean;
  // Callbacks - should be stable references from parent
  onCardPress: (reminder: Reminder) => void;
  onLongPress: (reminderId: string, tab: 'active' | 'completed' | 'deleted') => void;
  onDelete: (reminder: Reminder) => void;
  onPermanentDelete: (reminder: Reminder) => void;
  onComplete: (reminder: Reminder) => void;
  onPause: (reminder: Reminder) => void;
  onRestore: (reminder: Reminder) => void;
  onReassign: (reminder: Reminder) => void;
  // Refs
  swipeableRefs: React.MutableRefObject<Map<string, any>>;
  simultaneousHandlers: React.RefObject<any>;
}

// Memoized helper to compute next date - avoids recalculation during render
const getNextDateForReminder = (reminder: Reminder): Date | null => {
  if (reminder.snoozeUntil) return new Date(reminder.snoozeUntil);
  if (reminder.nextReminderDate) return new Date(reminder.nextReminderDate);
  return calculateNextReminderDate(reminder) ?? null;
};

const ReminderCardComponent = ({
  reminder,
  listType,
  isSelected,
  isSelectionMode,
  onCardPress,
  onLongPress,
  onDelete,
  onPermanentDelete,
  onComplete,
  onPause,
  onRestore,
  onReassign,
  swipeableRefs,
  simultaneousHandlers,
}: ReminderCardProps) => {
  const isActive = !reminder.isCompleted && !reminder.isExpired;
  const isDeleted = listType === 'deleted';
  const isCompletedOrDeleted = listType === 'completed' || listType === 'deleted';

  // Memoize computed values
  const endsLabel = useMemo(() => {
    if (!reminder.repeatType || reminder.repeatType === 'none') return null;
    const type = reminder.untilType ?? 'none';
    if (type === 'none') return null;
    if (type === 'count') {
      const count = reminder.untilCount ?? 0;
      const unit = count === 1 ? 'occurrence' : 'occurrences';
      return `Ends after ${count} ${unit}`;
    }
    if (type === 'endsAt' && reminder.untilDate) {
      try {
        const [y, m, d] = reminder.untilDate.split('-').map(Number);
        const dt = new Date(y, (m || 1) - 1, d || 1);
        const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const showTime = reminder.repeatType === 'every' && (reminder.everyInterval?.unit === 'minutes' || reminder.everyInterval?.unit === 'hours');
        if (showTime) {
          const timeStr = formatTime(reminder.untilTime ?? reminder.time);
          return `Ends on ${dateStr} at ${timeStr}`;
        }
        return `Ends on ${dateStr}`;
      } catch {
        return null;
      }
    }
    return null;
  }, [reminder.repeatType, reminder.untilType, reminder.untilCount, reminder.untilDate, reminder.untilTime, reminder.time, reminder.everyInterval?.unit]);

  // Memoize next date calculation
  const nextDate = useMemo(() => getNextDateForReminder(reminder), [
    reminder.snoozeUntil,
    reminder.nextReminderDate,
    reminder.date,
    reminder.time,
    reminder.repeatType,
    reminder.repeatDays,
    reminder.everyInterval?.value,
    reminder.everyInterval?.unit,
  ]);

  // Compact layout for completed and deleted tabs
  if (isCompletedOrDeleted) {
    return (
      <SwipeableRow
        reminder={reminder}
        swipeableRefs={swipeableRefs}
        simultaneousHandlers={simultaneousHandlers}
        onSwipeRight={!isSelectionMode ? () => onPermanentDelete(reminder) : undefined}
        onSwipeLeft={!isSelectionMode ? () => onPermanentDelete(reminder) : undefined}
        isSelectionMode={isSelectionMode}
        leftActionType="delete"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onCardPress(reminder)}
          onLongPress={() => onLongPress(reminder.id, listType)}
          delayLongPress={200}
          style={[styles.reminderCardCompact, isSelected && styles.selectedCard]}
          testID={`reminder-card-${reminder.id}`}
        >
          <View style={styles.reminderContentCompact}>
            <View style={styles.reminderLeftCompact}>
              {isSelectionMode && (
                <TouchableOpacity style={styles.selectionCheckbox} onPress={() => onCardPress(reminder)}>
                  {isSelected ? (
                    <CheckSquare size={20} color={Material3Colors.light.primary} />
                  ) : (
                    <Square size={20} color={Material3Colors.light.onSurfaceVariant} />
                  )}
                </TouchableOpacity>
              )}
              <View style={[styles.priorityBarCompact, { backgroundColor: PRIORITY_COLORS[reminder.priority] }]} />
              <Text style={styles.reminderTitleCompact} numberOfLines={1} ellipsizeMode="tail">
                {reminder.title}
              </Text>
              <Text style={styles.compactSeparator}>•</Text>
              <Text style={styles.reminderTimeCompact}>{formatTime(reminder.time)}</Text>
              <Text style={styles.compactSeparator}>•</Text>
              <Text style={styles.reminderDateCompact} numberOfLines={1}>
                {(() => {
                  if (reminder.repeatType === 'daily' && nextDate) {
                    return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                  const [year, month, day] = reminder.date.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                })()}
              </Text>
              <View style={[styles.repeatBadge, styles.repeatBadgeCompact]}>
                <Text style={styles.repeatBadgeTextCompact}>
                  {formatRepeatType(reminder.repeatType, reminder.everyInterval)}
                </Text>
              </View>
              {reminder.repeatType === 'every' && reminder.everyInterval && (
                <Text style={styles.everyDurationCompact}>
                  {`${reminder.everyInterval.value}${reminder.everyInterval.unit === 'minutes' ? 'm' : reminder.everyInterval.unit === 'hours' ? 'h' : 'd'}`}
                </Text>
              )}
            </View>
            <View style={styles.reminderRight}>
              <TouchableOpacity
                style={isDeleted ? styles.restoreButton : styles.reassignButton}
                onPress={(e) => {
                  e.stopPropagation();
                  isDeleted ? onRestore(reminder) : onReassign(reminder);
                }}
                testID={isDeleted ? `restore-button-${reminder.id}` : `reassign-button-${reminder.id}`}
              >
                <RotateCcw size={18} color={Material3Colors.light.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  }


  // Full layout for active reminders
  return (
    <SwipeableRow
      reminder={reminder}
      swipeableRefs={swipeableRefs}
      simultaneousHandlers={simultaneousHandlers}
      onSwipeRight={!isSelectionMode ? () => onDelete(reminder) : undefined}
      onSwipeLeft={!isSelectionMode && isActive ? () => onComplete(reminder) : undefined}
      isSelectionMode={isSelectionMode}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onCardPress(reminder)}
        onLongPress={() => onLongPress(reminder.id, listType)}
        delayLongPress={200}
        style={[styles.reminderCard, isSelected && styles.selectedCard]}
        testID={`reminder-card-${reminder.id}`}
      >
        <View style={styles.reminderContent}>
          <View style={styles.reminderLeft}>
            {isSelectionMode && (
              <TouchableOpacity style={styles.selectionCheckbox} onPress={() => onCardPress(reminder)}>
                {isSelected ? (
                  <CheckSquare size={20} color={Material3Colors.light.primary} />
                ) : (
                  <Square size={20} color={Material3Colors.light.onSurfaceVariant} />
                )}
              </TouchableOpacity>
            )}
            <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLORS[reminder.priority] }]} />
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <View style={styles.reminderMeta}>
                {(reminder.repeatType === 'weekly' || reminder.repeatType === 'custom') && (
                  <>
                    <Clock size={14} color={Material3Colors.light.onSurfaceVariant} />
                    <Text style={styles.reminderTime}>{formatTime(reminder.time)}</Text>
                    <Text style={styles.metaSeparator}>•</Text>
                  </>
                )}
                {(reminder.repeatType !== 'none' && reminder.repeatType !== 'monthly' && reminder.repeatType !== 'yearly' && reminder.repeatType !== 'every' && reminder.repeatType !== 'daily') && (
                  <View style={styles.repeatBadge}>
                    <Text style={styles.repeatBadgeText}>
                      {formatRepeatType(reminder.repeatType, reminder.everyInterval)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.reminderDetails}>
                {/* Once reminders */}
                {reminder.repeatType === 'none' && !reminder.isCompleted && (
                  <View style={styles.nextOccurrenceContainer}>
                    <Clock size={14} color={Material3Colors.light.primary} />
                    <Text style={styles.reminderNextOccurrenceLarge}>
                      {(() => {
                        const [year, month, day] = reminder.date.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        return `${dateStr} at ${formatTime(reminder.time)}`;
                      })()}
                    </Text>
                    <View style={[styles.repeatBadge, { marginLeft: 8 }]}>
                      <Text style={styles.repeatBadgeText}>Once</Text>
                    </View>
                  </View>
                )}

                {/* Monthly/Yearly reminders */}
                {(reminder.repeatType === 'monthly' || reminder.repeatType === 'yearly') && (
                  <View style={styles.nextOccurrenceContainer}>
                    <Clock size={14} color={Material3Colors.light.primary} />
                    <Text style={styles.reminderNextOccurrenceLarge}>
                      {nextDate ? `${nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${formatTime(nextDate.toTimeString().slice(0, 5))}` : 'No next date'}
                    </Text>
                    <View style={[styles.repeatBadge, { marginLeft: 8 }]}>
                      <Text style={styles.repeatBadgeText}>{formatRepeatType(reminder.repeatType)}</Text>
                    </View>
                  </View>
                )}

                {/* Daily reminders */}
                {reminder.repeatType === 'daily' && (
                  <View style={styles.nextOccurrenceContainer}>
                    <Clock size={14} color={Material3Colors.light.primary} />
                    <Text style={styles.reminderNextOccurrenceLarge}>
                      {nextDate ? `${nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${formatTime(nextDate.toTimeString().slice(0, 5))}` : 'No next date'}
                    </Text>
                    <View style={[styles.repeatBadge, { marginLeft: 8 }]}>
                      <Text style={styles.repeatBadgeText}>Daily</Text>
                    </View>
                  </View>
                )}

                {/* Every X reminders */}
                {reminder.repeatType === 'every' && reminder.everyInterval && (
                  <View style={styles.nextOccurrenceContainer}>
                    <Clock size={14} color={Material3Colors.light.primary} />
                    <Text style={styles.reminderNextOccurrenceLarge}>
                      {nextDate ? `${nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${formatTime(nextDate.toTimeString().slice(0, 5))}` : 'No next date'}
                    </Text>
                    <View style={[styles.repeatBadge, { marginLeft: 8 }]}>
                      <Text style={styles.repeatBadgeText}>
                        {`Every ${reminder.everyInterval.value} ${reminder.everyInterval.unit}`}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Weekly/Custom days */}
                {(reminder.repeatType === 'weekly' || reminder.repeatType === 'custom') && reminder.repeatDays && reminder.repeatDays.length > 0 && (
                  <View style={styles.daysContainer}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dayBadge,
                          reminder.repeatDays?.includes(index) && styles.dayBadgeActive
                        ]}
                      >
                        <Text style={[
                          styles.dayBadgeText,
                          reminder.repeatDays?.includes(index) && styles.dayBadgeTextActive
                        ]}>
                          {day}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Ends label */}
                {endsLabel && (
                  <Text style={styles.endsLabel}>{endsLabel}</Text>
                )}

                {/* Paused indicator */}
                {reminder.isPaused && (
                  <View style={styles.pausedBadge}>
                    <PauseCircle size={12} color={Material3Colors.light.error} />
                    <Text style={styles.pausedText}>
                      {reminder.pauseUntilDate
                        ? `Paused until ${new Date(reminder.pauseUntilDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Paused'}
                    </Text>
                  </View>
                )}

                {/* Snoozed indicator */}
                {reminder.snoozeUntil && (
                  <View style={styles.snoozedBadge}>
                    <Clock size={12} color={Material3Colors.light.tertiary} />
                    <Text style={styles.snoozedText}>
                      Snoozed until {new Date(reminder.snoozeUntil).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Action buttons for active reminders */}
          {isActive && (
            <View style={styles.reminderRight}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => { e.stopPropagation(); onPause(reminder); }}
                testID={`pause-button-${reminder.id}`}
              >
                {reminder.isPaused ? (
                  <PlayCircle size={20} color={Material3Colors.light.primary} />
                ) : (
                  <PauseCircle size={20} color={Material3Colors.light.onSurfaceVariant} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => { e.stopPropagation(); onComplete(reminder); }}
                testID={`complete-button-${reminder.id}`}
              >
                <CheckCircle size={20} color={Material3Colors.light.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => { e.stopPropagation(); onDelete(reminder); }}
                testID={`delete-button-${reminder.id}`}
              >
                <Trash2 size={20} color={Material3Colors.light.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );
};


// Custom comparison function for memo
const arePropsEqual = (prevProps: ReminderCardProps, nextProps: ReminderCardProps): boolean => {
  // ID change always means different card
  if (prevProps.reminder.id !== nextProps.reminder.id) return false;
  if (prevProps.listType !== nextProps.listType) return false;

  // Check external state dependencies
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;

  const prev = prevProps.reminder;
  const next = nextProps.reminder;

  // Check ALL fields that affect visual rendering
  const areDaysEqual = prev.repeatDays?.length === next.repeatDays?.length &&
    (prev.repeatDays?.every((day, i) => day === next.repeatDays?.[i]) ?? true);
  const isEveryIntervalEqual = prev.everyInterval?.value === next.everyInterval?.value &&
    prev.everyInterval?.unit === next.everyInterval?.unit;

  return prev.title === next.title &&
    prev.time === next.time &&
    prev.date === next.date &&
    prev.priority === next.priority &&
    prev.isActive === next.isActive &&
    prev.isPaused === next.isPaused &&
    prev.isCompleted === next.isCompleted &&
    prev.isExpired === next.isExpired &&
    prev.repeatType === next.repeatType &&
    prev.nextReminderDate === next.nextReminderDate &&
    prev.snoozeUntil === next.snoozeUntil &&
    prev.lastTriggeredAt === next.lastTriggeredAt &&
    prev.untilType === next.untilType &&
    prev.untilDate === next.untilDate &&
    prev.untilCount === next.untilCount &&
    prev.pauseUntilDate === next.pauseUntilDate &&
    areDaysEqual &&
    isEveryIntervalEqual;
};

export const ReminderCard = memo(ReminderCardComponent, arePropsEqual);
ReminderCard.displayName = 'ReminderCard';

const styles = StyleSheet.create({
  reminderCard: {
    backgroundColor: Material3Colors.light.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  reminderCardCompact: {
    backgroundColor: Material3Colors.light.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedCard: {
    backgroundColor: Material3Colors.light.primaryContainer,
    borderWidth: 2,
    borderColor: Material3Colors.light.primary,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderContentCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderLeftCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  priorityBar: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  priorityBarCompact: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    marginRight: 8,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Material3Colors.light.onSurface,
    marginBottom: 4,
  },
  reminderTitleCompact: {
    fontSize: 14,
    fontWeight: '500',
    color: Material3Colors.light.onSurface,
    flexShrink: 1,
    marginRight: 4,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  reminderTime: {
    fontSize: 13,
    color: Material3Colors.light.onSurfaceVariant,
    marginLeft: 4,
  },
  reminderTimeCompact: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
  },
  reminderDateCompact: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    flexShrink: 1,
  },
  metaSeparator: {
    color: Material3Colors.light.outline,
    marginHorizontal: 4,
  },
  compactSeparator: {
    color: Material3Colors.light.outline,
    marginHorizontal: 4,
    fontSize: 12,
  },
  repeatBadge: {
    backgroundColor: Material3Colors.light.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  repeatBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  repeatBadgeText: {
    fontSize: 11,
    color: Material3Colors.light.onSecondaryContainer,
    fontWeight: '500',
  },
  repeatBadgeTextCompact: {
    fontSize: 10,
    color: Material3Colors.light.onSecondaryContainer,
    fontWeight: '500',
  },
  everyDurationCompact: {
    fontSize: 11,
    color: Material3Colors.light.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  reminderDetails: {
    marginTop: 8,
  },
  nextOccurrenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  reminderNextOccurrenceLarge: {
    fontSize: 13,
    color: Material3Colors.light.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  dayBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Material3Colors.light.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeActive: {
    backgroundColor: Material3Colors.light.primary,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Material3Colors.light.onSurfaceVariant,
  },
  dayBadgeTextActive: {
    color: Material3Colors.light.onPrimary,
  },
  endsLabel: {
    fontSize: 12,
    color: Material3Colors.light.onSurfaceVariant,
    marginTop: 4,
    fontStyle: 'italic',
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  pausedText: {
    fontSize: 12,
    color: Material3Colors.light.error,
    fontWeight: '500',
  },
  snoozedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  snoozedText: {
    fontSize: 12,
    color: Material3Colors.light.tertiary,
    fontWeight: '500',
  },
  reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  reassignButton: {
    padding: 8,
  },
  restoreButton: {
    padding: 8,
  },
  selectionCheckbox: {
    marginRight: 8,
  },
});

export default ReminderCard;
