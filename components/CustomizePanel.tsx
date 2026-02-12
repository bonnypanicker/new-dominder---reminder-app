import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Keyboard as RNKeyboard, StyleProp, ViewStyle } from 'react-native';
import { RepeatType, EveryUnit } from '@/types/reminder';
import { DAYS_OF_WEEK } from '@/constants/reminders';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/theme-provider';
import { useSettings, WeekStartDay } from '@/hooks/settings-store';

const CalendarIcon = (props: any) => <Feather name="calendar" {...props} />;
const ChevronRight = (props: any) => <Feather name="chevron-right" {...props} />;

type UntilType = 'none' | 'endsAt' | 'count';

interface CustomizePanelProps {
  repeatType: RepeatType;
  repeatDays: number[];
  onRepeatTypeChange: (type: RepeatType) => void;
  onRepeatDaysChange: (days: number[]) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenTime?: () => void;
  displayTime: string;
  use24HourFormat: boolean;
  everyValue?: number;
  everyUnit?: EveryUnit;
  onEveryChange?: (value: number, unit: EveryUnit) => void;
  // Until props
  untilType?: UntilType;
  untilDate?: string;
  untilCount?: number;
  untilTime?: string;
  untilIsAM?: boolean;
  onUntilTypeChange?: (type: UntilType) => void;
  onUntilDateChange?: (date: string) => void;
  onUntilCountChange?: (count: number) => void;
  // Open time picker specifically for "Ends" flow
  onOpenUntilTime?: () => void;
  // Expose close function
  onDropdownStateChange?: (hasOpenDropdown: boolean) => void;
  // Scale factor for responsive sizing on small screens
  scaleFactor?: number;
  isLandscape?: boolean;
  // Multi-select props
  multiSelectEnabled?: boolean;
  onMultiSelectEnabledChange?: (enabled: boolean) => void;
  multiSelectDates?: string[];
  onMultiSelectDatesChange?: (dates: string[]) => void;
  multiSelectDays?: number[];
  onMultiSelectDaysChange?: (days: number[]) => void;
  // Callback for Set Time button in calendar
  onSetTime?: () => void;
  windowEndTime?: string;
  windowEndIsAM?: boolean;
}

export default function CustomizePanel({
  repeatType,
  repeatDays,
  onRepeatTypeChange,
  onRepeatDaysChange,
  selectedDate,
  onDateChange,
  onOpenTime,
  displayTime,
  use24HourFormat,
  everyValue,
  everyUnit,
  onEveryChange,
  untilType,
  untilDate,
  untilCount,
  untilTime,
  untilIsAM,
  onUntilTypeChange,
  onUntilDateChange,
  onUntilCountChange,
  onOpenUntilTime,
  onDropdownStateChange,
  scaleFactor = 1,
  isLandscape = false,
  // New props
  multiSelectEnabled,
  onMultiSelectEnabledChange,
  multiSelectDates,
  onMultiSelectDatesChange,
  multiSelectDays,
  onMultiSelectDaysChange,
  onSetTime,
  windowEndTime,
  windowEndIsAM,
}: CustomizePanelProps) {
  const containerRef = useRef<View>(null);
  const dateAnchorRef = useRef<View>(null);
  const unitAnchorRef = useRef<View>(null);
  const untilAnchorRef = useRef<View>(null);
  const { data: settings } = useSettings();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const weekStartDay: WeekStartDay = (settings?.weekStartDay ?? 0) as WeekStartDay;

  const rotateArray = <T,>(arr: T[], start: number): T[] => {
    const s = ((start % arr.length) + arr.length) % arr.length;
    return [...arr.slice(s), ...arr.slice(0, s)];
  };

  const rotatedDaysOfWeek = useMemo(() => {
    return rotateArray(DAYS_OF_WEEK, weekStartDay);
  }, [weekStartDay]);

  // Local state for inline dropdowns
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownAnchor, setDropdownAnchor] = useState<AnchorRect | null>(null);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitDropdownAnchor, setUnitDropdownAnchor] = useState<AnchorRect | null>(null);
  const repeatOptions: { value: RepeatType; label: string }[] = [
    { value: 'none', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'every', label: 'Every' },
  ];

  React.useEffect(() => {
    if (repeatType === 'daily' && repeatDays.length === 0) {
      onRepeatDaysChange([0, 1, 2, 3, 4, 5, 6]);
    }
  }, [repeatType, repeatDays.length, onRepeatDaysChange]);

  // Close dropdowns when keyboard state changes
  useEffect(() => {
    const keyboardDidHideListener = RNKeyboard.addListener('keyboardDidHide', () => {
      setDropdownOpen(false);
      setUnitDropdownOpen(false);
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const [calendarOpen, setCalendarOpen] = useState<boolean>(false);
  const [monthlyCalendarOpen, setMonthlyCalendarOpen] = useState<boolean>(false);
  const [monthlyDate, setMonthlyDate] = useState<number>(() => {
    const now = new Date();
    return now.getDate();
  });

  // Sync monthlyDate with selectedDate when it changes
  useEffect(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length >= 3) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d) && d >= 1 && d <= 31) {
          setMonthlyDate(d);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [selectedDate]);
  const [yearlyCalendarOpen, setYearlyCalendarOpen] = useState<boolean>(false);
  const [untilCalendarOpen, setUntilCalendarOpen] = useState<boolean>(false);
  const [untilCountModalOpen, setUntilCountModalOpen] = useState<boolean>(false);

  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const formattedSelectedDateNoYear = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[dt.getMonth()]} ${dt.getDate()}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const formattedUntilDate = useMemo(() => {
    try {
      if (!untilDate) return 'Pick date';
      const [y, m, d] = untilDate.split('-').map(Number);
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
    } catch {
      return untilDate ?? 'Pick date';
    }
  }, [untilDate]);

  const formattedUntilTime = useMemo(() => {
    if (!untilTime || typeof untilIsAM === 'undefined') return '';
    const [hoursStr, minutesStr] = untilTime.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (use24HourFormat) {
      let hour24 = hours;
      if (!untilIsAM && hours !== 12) hour24 = hours + 12;
      else if (untilIsAM && hours === 12) hour24 = 0;
      return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${untilIsAM ? 'AM' : 'PM'}`;
  }, [untilTime, untilIsAM, use24HourFormat]);

  const untilValueLabel = useMemo(() => {
    if (untilType === 'endsAt') {
      const withTime = repeatType === 'every' && (everyUnit === 'minutes' || everyUnit === 'hours');
      const dateText = (repeatType === 'every' && multiSelectEnabled) ? 'Multi' : formattedUntilDate;
      return withTime ? `${dateText} • ${formattedUntilTime}` : dateText;
    }
    if (untilType === 'count') {
      const count = untilCount ?? 1;
      const unit = count === 1 ? 'Occurrence' : 'Occurrences';
      return `After ${count} ${unit}`;
    }
    return undefined;
  }, [untilType, formattedUntilDate, untilCount, repeatType, everyUnit, formattedUntilTime, multiSelectEnabled]);

  const toggleDay = (day: number) => {
    if (repeatDays.includes(day)) {
      onRepeatDaysChange(repeatDays.filter(d => d !== day));
    } else {
      onRepeatDaysChange([...repeatDays, day]);
    }
  };

  const setToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
    const unit = everyUnit ?? 'hours';
    const shouldOpenTime = repeatType === 'none' || (repeatType === 'every' && (unit === 'minutes' || unit === 'hours'));
    if (shouldOpenTime) {
      onOpenTime?.();
    }
  };

  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
    const unit = everyUnit ?? 'hours';
    const shouldOpenTime = repeatType === 'none' || (repeatType === 'every' && (unit === 'minutes' || unit === 'hours'));
    if (shouldOpenTime) {
      onOpenTime?.();
    }
  };

  const handleDropdownOpen = (coords: AnchorRect) => {
    setDropdownAnchor(coords);
    setDropdownOpen(true);
  };

  const handleUnitDropdownOpen = (coords: AnchorRect) => {
    setUnitDropdownAnchor(coords);
    setUnitDropdownOpen(true);
  };

  const [untilDropdownOpen, setUntilDropdownOpen] = useState(false);
  const [untilDropdownAnchor, setUntilDropdownAnchor] = useState<AnchorRect | null>(null);
  const handleUntilDropdownOpen = (coords: AnchorRect) => {
    setUntilDropdownAnchor(coords);
    setUntilDropdownOpen(true);
  };

  // Close all dropdowns function
  const closeAllDropdowns = React.useCallback(() => {
    setDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUntilDropdownOpen(false);
  }, []);

  // Expose dropdown state to parent
  React.useEffect(() => {
    const hasOpenDropdown = dropdownOpen || unitDropdownOpen || untilDropdownOpen;
    onDropdownStateChange?.(hasOpenDropdown);
  }, [dropdownOpen, unitDropdownOpen, untilDropdownOpen, onDropdownStateChange]);

  // Expose closeAllDropdowns via ref (using React.useImperativeHandle pattern)
  React.useEffect(() => {
    if (onDropdownStateChange) {
      // Store the close function on a global ref that parent can access
      (window as any).__closeCustomizePanelDropdowns = closeAllDropdowns;
    }
    return () => {
      delete (window as any).__closeCustomizePanelDropdowns;
    };
  }, [closeAllDropdowns, onDropdownStateChange]);

  const units: EveryUnit[] = ['minutes', 'hours', 'days'];

  const getUnitLabel = (unit: EveryUnit): string => {
    const labels: Record<EveryUnit, string> = {
      minutes: 'Minutes',
      hours: 'Hours',
      days: 'Days',
    };
    return labels[unit];
  };

  const getUntilLabel = (u: UntilType): string => {
    const labels: Record<UntilType, string> = {
      none: 'Never',
      endsAt: 'On date/time',
      count: 'Occurrence',
    };
    return labels[u];
  };

  return (
    <View ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled={true}
      >
        <View style={[styles.repeatOptionsContainer, { marginBottom: 8 * scaleFactor }]}>
          {repeatOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.repeatOption,
                repeatType === option.value && styles.repeatOptionSelected,
                { paddingVertical: 6 * scaleFactor }
              ]}
              onPress={() => onRepeatTypeChange(option.value)}
              testID={`repeat-${option.value}`}
            >
              <Text
                style={[
                  styles.repeatOptionText,
                  repeatType === option.value && styles.repeatOptionTextSelected,
                  { fontSize: 12 * scaleFactor }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        { (repeatType === 'none' || repeatType === 'every') && (
          <View style={[styles.dateSelectionContainer, { marginTop: 6 * scaleFactor, marginBottom: 12 * scaleFactor }, repeatType === 'every' && { marginBottom: 2 * scaleFactor }]}>
            <View style={[styles.topRow, repeatType === 'every' && { marginBottom: 8 * scaleFactor }]}>
              <Text style={[styles.topRowLabel, { fontSize: 14 * scaleFactor }]}>{repeatType === 'every' ? 'Start' : 'Date'}</Text>
              <View style={styles.menuWrapper}
              >
                <DropdownAnchor
                  ref={dateAnchorRef}
                  label={`${(repeatType === 'every' && multiSelectEnabled) ? 'Multi' : formattedSelectedDate} • ${displayTime}`}
                  open={dropdownOpen}
                  onOpen={() => { }}
                  onToggle={() => setDropdownOpen(!dropdownOpen)}
                  onMeasure={(coords) => coords && handleDropdownOpen(coords)}
                  style={{ paddingVertical: 6 * scaleFactor, paddingHorizontal: 12 * scaleFactor }}
                />

              </View>
            </View>

            {repeatType === 'every' && (
              <View style={styles.everyRow}>
                <Text style={styles.everyText}>Repeats every</Text>
                <TextInput
                  style={styles.everyInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  defaultValue={String((everyValue ?? 1))}
                  onChangeText={(txt) => {
                    const num = parseInt(txt.replace(/\D/g, '') || '0', 10);
                    onEveryChange?.(Math.min(99, Math.max(1, num)), everyUnit ?? 'hours');
                  }}
                  testID="every-value-input"
                />
                <UnitDropdownButton
                  ref={unitAnchorRef}
                  unit={everyUnit ?? 'hours'}
                  onChange={(u) => onEveryChange?.(everyValue ?? 1, u)}
                  onOpenDropdown={handleUnitDropdownOpen}
                />
              </View>
            )}
          </View>
        )}

        {repeatType === 'daily' && (
          <View style={[styles.daysContainer, { marginTop: 6 * scaleFactor, gap: 10 * scaleFactor }]}>
            <View style={[styles.dailySection, styles.dailyTimeRow]}>
              <Text style={[styles.dailySectionLabel, { fontSize: 14 * scaleFactor }]}>Time</Text>
              <View style={styles.menuWrapper}>
                <TouchableOpacity
                  style={[styles.menuButton, { paddingVertical: 6 * scaleFactor, paddingHorizontal: 12 * scaleFactor }]}
                  onPress={() => { onOpenTime?.(); }}
                  testID="daily-time-button"
                >
                  <Feather name="clock" size={16} color={colors.onSurface} />
                  <Text style={[styles.menuButtonText, { fontSize: 14 * scaleFactor }]}>{displayTime}</Text>
                  <Feather name="chevron-down" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.dailySection, styles.dailyTimeRow]}>
              <Text style={[styles.dailySectionLabel, { fontSize: 14 * scaleFactor }]}>Ends</Text>
              <View style={styles.menuWrapper}>
                <UntilTypeButton
                  ref={untilAnchorRef}
                  untilType={(untilType ?? 'none') as UntilType}
                  getLabel={getUntilLabel}
                  valueLabel={untilValueLabel}
                  onOpenDropdown={handleUntilDropdownOpen}
                />
              </View>
            </View>
            <View style={styles.dailySection}>
              <View style={[
                styles.daysRow,
                { marginHorizontal: 0, paddingHorizontal: 0 },
                isLandscape && { justifyContent: 'center' }
              ]}>
                {rotatedDaysOfWeek.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayButtonCompact,
                      repeatDays.includes(day.value) && styles.dayButtonCompactSelected,
                      { height: 40 * scaleFactor }, // Fixed height
                      isLandscape && { flex: 0, width: 40 * scaleFactor, marginHorizontal: 2 } // Fixed width in landscape to prevent stretching
                    ]}
                    onPress={() => toggleDay(day.value)}
                    testID={`weekday-${day.value}`}
                  >
                    <Text style={[
                      styles.dayButtonCompactText,
                      repeatDays.includes(day.value) && styles.dayButtonCompactTextSelected,
                      { fontSize: 14 * scaleFactor }
                    ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {repeatType === 'monthly' && (
          <View style={[styles.dateSelectionContainer, { marginTop: 6 * scaleFactor, marginBottom: 12 * scaleFactor }]}>
            <View style={styles.topRow}>
              <Text style={[styles.topRowLabel, { fontSize: 14 * scaleFactor }]}>Repeats on</Text>
              <View style={styles.menuWrapper}>
                <TouchableOpacity
                  testID="monthly-open-calendar"
                  style={[styles.menuButton, { paddingVertical: 6 * scaleFactor, paddingHorizontal: 12 * scaleFactor }]}
                  onPress={() => { setMonthlyCalendarOpen(true); }}
                >
                  <MaterialIcons name="calendar-today" size={16} color={colors.onSurface} />
                  <Text style={[styles.menuButtonText, { fontSize: 14 * scaleFactor }]}>
                    Day {monthlyDate} • {displayTime}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {repeatType === 'yearly' && (
          <View style={[styles.dateSelectionContainer, { marginTop: 6 * scaleFactor, marginBottom: 12 * scaleFactor }]}>
            <View style={styles.topRow}>
              <Text style={[styles.topRowLabel, { fontSize: 14 * scaleFactor }]}>Repeats on</Text>
              <View style={styles.menuWrapper}>
                <TouchableOpacity
                  testID="yearly-open-calendar"
                  style={[styles.menuButton, { paddingVertical: 6 * scaleFactor, paddingHorizontal: 12 * scaleFactor }]}
                  onPress={() => { setYearlyCalendarOpen(true); }}
                >
                  <MaterialIcons name="calendar-today" size={16} color={colors.onSurface} />
                  <Text style={[styles.menuButtonText, { fontSize: 14 * scaleFactor }]}>{`${formattedSelectedDateNoYear} • ${displayTime}`}</Text>
                  <Feather name="chevron-down" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {repeatType !== 'none' && repeatType !== 'daily' && (
          <View style={[styles.dateSelectionContainer, { marginTop: 0, marginBottom: 12 * scaleFactor }, repeatType === 'every' && { marginBottom: 2 * scaleFactor }]}>
            <View style={styles.topRow}>
              <Text style={[styles.topRowLabel, { fontSize: 14 * scaleFactor }]}>Ends</Text>
              <View style={styles.menuWrapper}>
                <UntilTypeButton
                  ref={untilAnchorRef}
                  untilType={(untilType ?? 'none') as UntilType}
                  getLabel={getUntilLabel}
                  valueLabel={untilValueLabel}
                  onOpenDropdown={handleUntilDropdownOpen}
                />
              </View>
            </View>
          </View>
        )}

        <CalendarModal
          visible={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          selectedDate={selectedDate}
          weekStartDay={weekStartDay}
          onSelectDate={(date) => {
            onDateChange(date);
            // Don't close modal - let user press "Set Time" or "Cancel"
          }}
          // Multi-select props - only show for 'every' repeat type
          multiSelectEnabled={repeatType === 'every' && multiSelectEnabled}
          onMultiSelectEnabledChange={repeatType === 'every' ? onMultiSelectEnabledChange : undefined}
          multiSelectDates={multiSelectDates}
          onMultiSelectDatesChange={onMultiSelectDatesChange}
          multiSelectDays={multiSelectDays}
          onMultiSelectDaysChange={onMultiSelectDaysChange}
          isEndMode={false}
          onSetTime={() => {
            setCalendarOpen(false);
            try {
              onOpenTime?.();
            } catch (e) {
              console.log('open time from Set Time button error', e);
            }
          }}
        />

        <CalendarModal
          visible={yearlyCalendarOpen}
          onClose={() => setYearlyCalendarOpen(false)}
          selectedDate={selectedDate}
          weekStartDay={weekStartDay}
          onSelectDate={(date) => {
            onDateChange(date);
            // Don't close modal - let user press "Set Time" or "Cancel"
          }}
          hideYear
          onSetTime={() => {
            setYearlyCalendarOpen(false);
            try {
              onOpenTime?.();
            } catch (e) {
              console.log('open time from Set Time button error', e);
            }
          }}
        />

        <MonthlyDateModal
          visible={monthlyCalendarOpen}
          onClose={() => setMonthlyCalendarOpen(false)}
          selectedDate={monthlyDate}
          onSelectDate={(date) => {
            setMonthlyDate(date);
            // Don't close modal - let user press "Set Time" or "Cancel"

            // Update the parent selectedDate so the correct day is used for the reminder
            try {
              const parts = selectedDate.split('-');
              if (parts.length >= 2) {
                const y = parts[0];
                const m = parts[1];
                const d = String(date).padStart(2, '0');
                onDateChange(`${y}-${m}-${d}`);
              } else {
                // Fallback if selectedDate format is unexpected, preserve current year/month
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const d = String(date).padStart(2, '0');
                onDateChange(`${y}-${m}-${d}`);
              }
            } catch (e) {
              console.log('Error updating date string for monthly selection', e);
            }
          }}
          onSetTime={() => {
            setMonthlyCalendarOpen(false);
            try {
              onOpenTime?.();
            } catch (e) {
              console.log('open time after monthly day error', e);
            }
          }}
        />
        <CalendarModal
          visible={untilCalendarOpen}
          onClose={() => setUntilCalendarOpen(false)}
          selectedDate={untilDate ?? selectedDate}
          weekStartDay={weekStartDay}
          onSelectDate={(date) => {
            onUntilDateChange?.(date);
            // Don't close modal - let user press "Set Time" or "Cancel"
          }}
          disablePast={true}
          // Pass multi-select dates for visualization only
          multiSelectEnabled={false} // Ends modal doesn't have the checkbox
          multiSelectDates={multiSelectEnabled ? multiSelectDates : undefined}
          multiSelectDays={multiSelectEnabled ? multiSelectDays : undefined}
          isEndMode={true} // Used to show read-only selected dates
          onSetTime={() => {
            setUntilCalendarOpen(false);
            onOpenUntilTime?.();
          }}
        />
      </ScrollView>

      <InlineDropdown
        visible={dropdownOpen}
        anchor={dropdownAnchor}
        onClose={() => setDropdownOpen(false)}
        onToday={() => { setToday(); setDropdownOpen(false); }}
        onTomorrow={() => { setTomorrow(); setDropdownOpen(false); }}
        onCustom={() => { setCalendarOpen(true); setDropdownOpen(false); }}
        hideTomorrow={repeatType === 'every'}
        containerRef={containerRef}
        anchorRef={dateAnchorRef}
      />

      <InlineUnitDropdown
        visible={unitDropdownOpen}
        anchor={unitDropdownAnchor}
        unit={everyUnit ?? 'hours'}
        units={units}
        getUnitLabel={getUnitLabel}
        onChange={(u) => onEveryChange?.(everyValue ?? 1, u)}
        onClose={() => setUnitDropdownOpen(false)}
        containerRef={containerRef}
        anchorRef={unitAnchorRef}
        disabledUnits={multiSelectEnabled ? ['days'] : []}
      />

      {/** Until type dropdown modal */}
      <UntilDropdownModal
        visible={untilDropdownOpen}
        anchor={untilDropdownAnchor}
        untilType={(untilType ?? 'none') as UntilType}
        options={["none", "endsAt", "count"] as UntilType[]}
        getLabel={getUntilLabel}
        onChange={(type) => {
          try {
            onUntilTypeChange?.(type);
            if (type === 'endsAt') {
              setUntilCalendarOpen(true);
            } else if (type === 'count') {
              setUntilCountModalOpen(true);
            }
          } finally {
            setUntilDropdownOpen(false);
          }
        }}
        onClose={() => setUntilDropdownOpen(false)}
        containerRef={containerRef}
        anchorRef={untilAnchorRef}
      />

      {/** Until count editing modal */}
      <UntilCountModal
        visible={untilCountModalOpen}
        onClose={() => setUntilCountModalOpen(false)}
        countValue={untilCount ?? 1}
        onSubmit={(newCount) => {
          try {
            onUntilCountChange?.(newCount);
          } finally {
            setUntilCountModalOpen(false);
          }
        }}
      />


    </View>
  );
}

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  weekStartDay?: WeekStartDay;
  onSelectDate: (date: string) => void;
  hideYear?: boolean;
  disablePast?: boolean;
  title?: string;
  // Multi-select props
  multiSelectEnabled?: boolean;
  onMultiSelectEnabledChange?: (enabled: boolean) => void;
  multiSelectDates?: string[];
  onMultiSelectDatesChange?: (dates: string[]) => void;
  multiSelectDays?: number[];
  onMultiSelectDaysChange?: (days: number[]) => void;
  isEndMode?: boolean; // If true, multiSelectDates are read-only
  onSetTime?: () => void;
}

function CalendarModal({
  visible,
  onClose,
  selectedDate,
  weekStartDay = 0,
  onSelectDate,
  hideYear = false,
  disablePast = true,
  title,
  multiSelectEnabled,
  onMultiSelectEnabledChange,
  multiSelectDates,
  onMultiSelectDatesChange,
  multiSelectDays,
  onMultiSelectDaysChange,
  isEndMode,
  onSetTime
}: CalendarModalProps) {
  const [isReady, setIsReady] = useState(false);
  const colors = useThemeColors();
  const calendarStyles = useMemo(() => createCalendarStyles(colors), [colors]);
  // Safely parse expected YYYY-MM-DD; fallback to today if malformed
  const now = new Date();
  const parts = (selectedDate || '').split('-');
  const py = parts.length > 0 ? parseInt(parts[0], 10) : NaN;
  const pm = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
  const pd = parts.length > 2 ? parseInt(parts[2], 10) : NaN;

  const initialYear = Number.isFinite(py) && py >= 1000 ? py : now.getFullYear();
  const initialMonthZero = Number.isFinite(pm) && pm >= 1 && pm <= 12 ? pm - 1 : now.getMonth();
  const initialDay = Number.isFinite(pd) && pd >= 1 && pd <= 31 ? pd : now.getDate();

  const [month, setMonth] = useState<number>(initialMonthZero);
  const [year, setYear] = useState<number>(initialYear);
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(() => {
    if (Number.isFinite(py) && py >= 1000 && Number.isFinite(pm) && pm >= 1 && pm <= 12 && Number.isFinite(pd) && pd >= 1 && pd <= 31) {
      return { year: py, month: pm - 1, day: pd };
    }
    return null;
  });

  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  const weekdayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekdayOrder = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => (weekStartDay + i) % 7);
  }, [weekStartDay]);

  const daysMatrix = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const offset = (startWeekday - weekStartDay + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: Array<Array<number | null>> = [];
    let current = 1 - offset;
    for (let w = 0; w < 6; w++) {
      const row: Array<number | null> = [];
      for (let i = 0; i < 7; i++) {
        if (current < 1 || current > daysInMonth) {
          row.push(null);
        } else {
          row.push(current);
        }
        current++;
      }
      weeks.push(row);
    }
    return weeks;
  }, [month, year, weekStartDay]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekdays = weekdayOrder.map((day) => weekdayLetters[day]);

  // Check if a date is in the past
  const isDateDisabled = (dayVal: number | null): boolean => {
    if (dayVal === null) return true;
    if (!disablePast) return false;
    const checkDate = new Date(year, month, dayVal);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Prevent navigating to past months
  const canGoPrevMonth = (): boolean => {
    if (!disablePast) return true;
    if (year > currentYear) return true;
    if (year === currentYear && month > currentMonth) return true;
    return false;
  };

  // Prevent navigating to past years
  const canGoPrevYear = (): boolean => {
    if (!disablePast) return true;
    return year > currentYear;
  };

  // Reset ready state when modal is closed
  useEffect(() => {
    if (!visible) {
      setIsReady(false);
    } else {
      // Use requestAnimationFrame with Android-specific delay
      requestAnimationFrame(() => {
        setTimeout(() => setIsReady(true), Platform.OS === 'android' ? 50 : 0);
      });
    }
  }, [visible]);

  // Early return after all hooks have been called
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onShow={() => setIsReady(true)}
    >
      <TouchableOpacity style={calendarStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[
            calendarStyles.container,
            {
              opacity: isReady ? 1 : 0,
              ...Platform.select({
                android: {
                  elevation: 24,
                  transform: [{ translateX: 0 }],
                },
              }),
            }
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {title && (
            <Text style={calendarStyles.modalTitle}>{title}</Text>
          )}
          <View style={calendarStyles.header}>
            {!hideYear ? (
              <TouchableOpacity
                onPress={() => canGoPrevYear() && setYear(prev => prev - 1)}
                style={[calendarStyles.navButton, !canGoPrevYear() && calendarStyles.navButtonDisabled]}
                testID="prev-year"
                disabled={!canGoPrevYear()}
              >
                <Feather name="chevron-left" size={16} color={canGoPrevYear() ? colors.onSurface : colors.outlineVariant} />
                <Text style={[calendarStyles.navText, !canGoPrevYear() && calendarStyles.navTextDisabled]}>Year</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 76 }} />
            )}
            <View style={calendarStyles.monthTitle}>
              <TouchableOpacity
                onPress={() => {
                  if (canGoPrevMonth()) {
                    if (month === 0) {
                      setMonth(11);
                      setYear(prev => prev - 1);
                    } else {
                      setMonth(prev => prev - 1);
                    }
                  }
                }}
                testID="prev-month"
                disabled={!canGoPrevMonth()}
              >
                <Feather name="chevron-left" size={20} color={canGoPrevMonth() ? colors.onSurface : colors.outlineVariant} />
              </TouchableOpacity>
              <Text style={calendarStyles.titleText}>{hideYear ? monthNames[month] : `${monthNames[month]} ${year}`}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (month === 11) {
                    setMonth(0);
                    setYear(prev => prev + 1);
                  } else {
                    setMonth(prev => prev + 1);
                  }
                }}
                testID="next-month"
              >
                <Feather name="chevron-right" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            {!hideYear ? (
              <TouchableOpacity
                onPress={() => setYear(prev => prev + 1)}
                style={calendarStyles.navButton}
                testID="next-year"
              >
                <Text style={calendarStyles.navText}>Year</Text>
                <Feather name="chevron-right" size={16} color={colors.onSurface} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 76 }} />
            )}
          </View>


          <View style={calendarStyles.weekdaysRow}>
            {weekdays.map((w, index) => {
              const dayValue = weekdayOrder[index];
              const isActive = multiSelectDays?.includes(dayValue);
              const hasDatesSelected = multiSelectDates && multiSelectDates.length > 0;
              const isDisabled = !multiSelectEnabled || isEndMode || hasDatesSelected;

              return (
                <TouchableOpacity
                  key={index}
                  disabled={isDisabled}
                  style={[
                    calendarStyles.weekdayCell,
                    multiSelectEnabled && !isEndMode && !hasDatesSelected && calendarStyles.weekdayCellSelectable,
                    isActive && calendarStyles.weekdayCellActive
                  ]}
                  onPress={() => {
                    if (multiSelectDays && onMultiSelectDaysChange) {
                      if (multiSelectDays.includes(dayValue)) {
                        onMultiSelectDaysChange(multiSelectDays.filter(d => d !== dayValue));
                      } else {
                        // Clear dates when selecting days (mutual exclusivity)
                        if (onMultiSelectDatesChange) {
                          onMultiSelectDatesChange([]);
                        }
                        onMultiSelectDaysChange([...multiSelectDays, dayValue]);
                      }
                    }
                  }}
                >
                  <Text style={[
                    calendarStyles.weekday,
                    isActive && calendarStyles.weekdayActive,
                    isDisabled && calendarStyles.weekdayDisabled
                  ]}>{w}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {daysMatrix.map((row, idx) => (
            <View key={idx} style={calendarStyles.weekRow}>
              {row.map((val, i) => {
                const currentDateString = val !== null
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(val).padStart(2, '0')}`
                  : null;
                const dateObj = currentDateString ? new Date(year, month, val!) : null;
                const dayDate = dateObj ? new Date(year, month, val!) : null;

                // Check if dates should be disabled in End mode when multi-select is active
                const hasMultiSelectDates = (multiSelectDates && multiSelectDates.length > 0) || (multiSelectDays && multiSelectDays.length > 0);

                // Visual distinction for read-only (End mode) - check this first
                const isReadOnlySelected = Boolean(isEndMode && (
                  (currentDateString && multiSelectDates?.includes(currentDateString)) ||
                  (dayDate && multiSelectDays?.includes(dayDate.getDay()))
                ));

                // Disable interaction in End mode when multi-select is active, but NOT for read-only selected dates
                const isDisabledInEndMode = isEndMode && hasMultiSelectDates && !isReadOnlySelected;
                const isDisabled = isDateDisabled(val) || isDisabledInEndMode;

                // Determine selection state
                const isSelected = isDateDisabled(val) ? false : (
                  // Check if this is the primary selected date
                  (currentDateString === selectedDate) ||
                  // In multi-select start mode, verify if in array or matches weekday
                  (multiSelectEnabled && !isEndMode && (
                    (currentDateString && multiSelectDates?.includes(currentDateString)) ||
                    (dayDate && multiSelectDays?.includes(dayDate.getDay()))
                  )) ||
                  // In End mode, visualize selected dates (read only)
                  (isEndMode && currentDateString && multiSelectDates?.includes(currentDateString)) ||
                  (isEndMode && dayDate && multiSelectDays?.includes(dayDate.getDay()))
                );

                // Check if this is today (for ring indicator only, not selection)
                const isToday = val !== null && year === currentYear && month === currentMonth && val === currentDate;

                // Auto-selected by weekday (for ring indicator)
                const isAutoSelectedByWeekday = multiSelectEnabled && !isEndMode && dayDate && multiSelectDays?.includes(dayDate.getDay()) && !multiSelectDates?.includes(currentDateString!);

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      calendarStyles.dayCell,
                      isSelected && calendarStyles.dayCellSelected,
                      isReadOnlySelected && calendarStyles.dayCellReadOnly,
                      isAutoSelectedByWeekday && calendarStyles.dayCellAutoSelected,
                      isToday && !isSelected && calendarStyles.dayCellToday,
                      isDisabled && !isReadOnlySelected && calendarStyles.dayCellDisabled
                    ]}
                    disabled={isDisabled || isReadOnlySelected}
                    onPress={() => {
                      if (val && currentDateString && !isDisabled && !isReadOnlySelected) {
                        if (multiSelectEnabled && !isEndMode) {
                          // Update primary selected date for reference/scrolling?
                          // Actually, let's toggle in array
                          if (multiSelectDates && onMultiSelectDatesChange) {
                            if (multiSelectDates.includes(currentDateString)) {
                              onMultiSelectDatesChange(multiSelectDates.filter(d => d !== currentDateString));
                            } else {
                              // Clear days when selecting dates (mutual exclusivity)
                              if (onMultiSelectDaysChange) {
                                onMultiSelectDaysChange([]);
                              }
                              onMultiSelectDatesChange([...multiSelectDates, currentDateString]);
                            }
                          }
                          // Also update last selected date as primary for reference
                          // onSelectDate(currentDateString); // Don't call this as it might close modal if we didn't decouple it fully?
                          // Logic for CalendarModal wrapper says: if (!multiSelectEnabled) setCalendarOpen(false);
                          // So calling onSelectDate IS safe if multiSelectEnabled is true!
                          onSelectDate(currentDateString);
                        } else if (!isEndMode || !hasMultiSelectDates) {
                          // Normal mode or End mode without multi-select (picking single date)
                          // Only allow selection if NOT in End mode with multi-select dates
                          onSelectDate(currentDateString);
                        }
                      }
                    }}
                    testID={`day-${val ?? 'null'}`}
                  >
                    <Text style={[
                      calendarStyles.dayText,
                      isSelected && calendarStyles.dayTextSelected,
                      isReadOnlySelected && calendarStyles.dayTextReadOnly,
                      isToday && !isSelected && calendarStyles.dayTextToday,
                      isDisabled && !isReadOnlySelected && calendarStyles.dayTextDisabled
                    ]}>
                      {val ?? ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Footer for Multi-Select Mode */}
          {(multiSelectEnabled === true || isEndMode) && (
            <View style={calendarStyles.footerMultiSelect}>
              {/* Multi-select Checkbox (Start Mode Only) */}
              {!isEndMode && onMultiSelectEnabledChange ? (
                <TouchableOpacity
                  style={calendarStyles.multiSelectCheckbox}
                  onPress={() => onMultiSelectEnabledChange(!multiSelectEnabled)}
                >
                  <View style={calendarStyles.checkboxChecked}>
                    <Feather name="check" size={14} color={colors.onPrimary} />
                  </View>
                  <Text style={calendarStyles.multiSelectLabel}>Multi-select</Text>
                </TouchableOpacity>
              ) : (
                <View /> // Spacer if End mode or if no callback
              )}

              {/* Right Side Buttons */}
              <View style={calendarStyles.footerButtons}>
                {onSetTime && (
                  <TouchableOpacity onPress={onSetTime} style={calendarStyles.footerBtn}>
                    <Text style={calendarStyles.footerBtnTextPrimary}>Set Time</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={calendarStyles.footerBtn}>
                  <Text style={calendarStyles.footerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Show Multi-select option if NOT enabled (to enable it) */}
          {(multiSelectEnabled === false && !isEndMode && onMultiSelectEnabledChange) && (
            <View style={calendarStyles.footerMultiSelect}>
              <TouchableOpacity
                style={calendarStyles.multiSelectCheckbox}
                onPress={() => onMultiSelectEnabledChange(true)}
              >
                <View style={calendarStyles.checkboxUnchecked} />
                <Text style={calendarStyles.multiSelectLabel}>Multi-select</Text>
              </TouchableOpacity>

              <View style={calendarStyles.footerButtons}>
                {onSetTime && (
                  <TouchableOpacity onPress={onSetTime} style={calendarStyles.footerBtn}>
                    <Text style={calendarStyles.footerBtnTextPrimary}>Set Time</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={calendarStyles.footerBtn} onPress={onClose} testID="calendar-cancel">
                  <Text style={calendarStyles.footerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Default Footer if Multi-select props are missing (backward compatibility) */}
          {multiSelectEnabled === undefined && (
            <View style={calendarStyles.footerMultiSelect}>
              <View /> {/* Spacer for alignment */}
              <View style={calendarStyles.footerButtons}>
                {onSetTime && (
                  <TouchableOpacity onPress={onSetTime} style={calendarStyles.footerBtn}>
                    <Text style={calendarStyles.footerBtnTextPrimary}>Set Time</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={calendarStyles.footerBtn} onPress={onClose} testID="calendar-cancel">
                  <Text style={calendarStyles.footerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Catch-all Footer: Show Set Time button if provided but no other footer matched */}
          {multiSelectEnabled === false && !isEndMode && !onMultiSelectEnabledChange && onSetTime && (
            <View style={calendarStyles.footerMultiSelect}>
              <View /> {/* Spacer for alignment */}
              <View style={calendarStyles.footerButtons}>
                <TouchableOpacity onPress={onSetTime} style={calendarStyles.footerBtn}>
                  <Text style={calendarStyles.footerBtnTextPrimary}>Set Time</Text>
                </TouchableOpacity>
                <TouchableOpacity style={calendarStyles.footerBtn} onPress={onClose} testID="calendar-cancel">
                  <Text style={calendarStyles.footerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const UnitDropdownButton = React.forwardRef<View, { unit: EveryUnit; onChange: (unit: EveryUnit) => void; onOpenDropdown: (coords: AnchorRect) => void }>(
  ({ unit, onChange, onOpenDropdown }, ref) => {
    const colors = useThemeColors();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const getUnitLabel = (u: EveryUnit) => {
      return u.charAt(0).toUpperCase() + u.slice(1);
    };

    const measureButton = () => {
      try {
        (ref as any)?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
          onOpenDropdown({ x, y, width, height });
        });
      } catch (e) {
        console.log('measure error', e);
      }
    };

    return (
      <TouchableOpacity
        ref={ref as any}
        style={styles.unitButton}
        onPress={measureButton}
        testID="every-unit-button"
      >
        <Text style={styles.unitButtonText}>{getUnitLabel(unit)}</Text>
        <Feather name="chevron-down" size={14} color={colors.onSurface} />
      </TouchableOpacity>
    );
  }
);
UnitDropdownButton.displayName = 'UnitDropdownButton';

const UntilTypeButton = React.forwardRef<View, { untilType: UntilType; getLabel: (u: UntilType) => string; valueLabel?: string; onOpenDropdown: (coords: AnchorRect) => void }>(
  ({ untilType, getLabel, valueLabel, onOpenDropdown }, ref) => {
    const colors = useThemeColors();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const measureButton = () => {
      try {
        (ref as any)?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
          onOpenDropdown({ x, y, width, height });
        });
      } catch (e) {
        console.log('measure error', e);
      }
    };

    const label = getLabel(untilType);
    // For count type, show only the valueLabel (e.g., "After 2 Occurrences") without the label prefix
    const displayText = valueLabel && untilType !== 'none' ? valueLabel : label;

    const handlePress = () => {
      // Always open the dropdown on tap
      measureButton();
    };

    return (
      <TouchableOpacity
        ref={ref as any}
        style={styles.unitButton}
        onPress={handlePress}
        testID="until-type-button"
      >
        <Text style={styles.unitButtonText}>{displayText}</Text>
        <Feather name="chevron-down" size={14} color={colors.onSurface} />
      </TouchableOpacity>
    );
  }
);
UntilTypeButton.displayName = 'UntilTypeButton';

interface UnitDropdownModalProps {
  visible: boolean;
  anchor: AnchorRect | null;
  unit: EveryUnit;
  units: EveryUnit[];
  getUnitLabel: (u: EveryUnit) => string;
  onChange: (unit: EveryUnit) => void;
  onClose: () => void;
}

function UnitDropdownModal({ visible, anchor, unit, units, getUnitLabel, onChange, onClose }: UnitDropdownModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsPositioned(false);
    } else if (anchor) {
      requestAnimationFrame(() => {
        if (Platform.OS === 'android') {
          setTimeout(() => setIsPositioned(true), 50);
        } else {
          setIsPositioned(true);
        }
      });
    }
  }, [visible, anchor]);

  if (!visible || !anchor) return null;

  const { width: winW, height: winH } = require('react-native').Dimensions.get('window');

  // Calculate dropdown dimensions
  const dropdownWidth = 140;
  const itemHeight = 44;
  const dropdownHeight = units.length * itemHeight + 16;

  // Additional null check before accessing anchor properties
  if (!anchor || typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
    typeof anchor.width !== 'number' || typeof anchor.height !== 'number') {
    return null;
  }

  // Position calculation
  // Place dropdown below button with 8px gap
  const preferredTop = anchor.y + anchor.height + 8;

  // Center align with trigger button
  const preferredLeft = anchor.x + (anchor.width / 2) - (dropdownWidth / 2);

  // Boundary checks with 16px padding from screen edges
  const top = Math.max(16, Math.min(preferredTop, winH - dropdownHeight - 16));
  const left = Math.max(16, Math.min(preferredLeft, winW - dropdownWidth - 16));

  // If dropdown would go below screen, position it above the button
  const shouldFlipUp = preferredTop + dropdownHeight > winH - 16;
  const finalTop = shouldFlipUp ? anchor.y - dropdownHeight - 8 : top;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setIsPositioned(true)}
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop overlay */}
        <TouchableOpacity
          style={styles.unitOverlayAbsolute}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Dropdown content */}
        <View
          style={[
            styles.unitDropdownModalAbsolute,
            {
              top: finalTop,
              left,
              width: dropdownWidth,
              opacity: isPositioned ? 1 : 0,
              ...(Platform.OS === 'android' && {
                transform: [{ translateX: 0 }],
              }),
            },
          ]}
        >
          {units.map(u => (
            <TouchableOpacity
              key={u}
              style={[
                styles.unitDropdownItem,
                unit === u && styles.unitDropdownItemSelected
              ]}
              onPress={() => {
                onChange(u);
                onClose();
              }}
              testID={`unit-${u}`}
            >
              <Text style={[
                styles.unitDropdownItemText,
                unit === u && styles.unitDropdownItemTextSelected
              ]}>
                {getUnitLabel(u)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 4,
    overflow: 'visible',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 0,
    height: 0,
  },
  dateSelectionContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 30,
    overflow: 'visible',
  },
  topRowLabel: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '600',
  },
  menuWrapper: {
    position: 'relative',
    flex: 1,
    alignItems: 'flex-end',
    zIndex: 20,
    overflow: 'visible',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  menuButtonText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
    zIndex: 9999,
    overflow: 'hidden',
    minWidth: 220,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.onSurface,
  },
  repeatOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    marginBottom: 8,
    zIndex: 1,
    minHeight: 40,
  },
  repeatOption: {
    flex: 1,
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  repeatOptionText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  repeatOptionTextSelected: {
    color: colors.onPrimary,
  },
  daysContainer: {
    marginTop: 6,
    gap: 2,
  },
  dailySection: {
    gap: 2,
  },
  dailyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailySectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
  },
  everyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    zIndex: 100,
    position: 'relative',
  },
  everyText: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '600',
  },
  everyInput: {
    width: 40,
    height: 32,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 6,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  unitButtonText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  unitButtonSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unitButtonTextSelected: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  unitDropdown: {
    position: 'absolute',
    top: 38,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
    zIndex: 9999,
    overflow: 'hidden',
    minWidth: 160,
  },
  unitOverlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999998,
  },
  unitDropdownModalAbsolute: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    paddingVertical: 4,
    zIndex: 999999,
  },
  unitDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 8,
  },
  unitDropdownItemSelected: {
    backgroundColor: colors.surface,
  },
  unitDropdownItemText: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '500',
  },
  unitDropdownItemTextSelected: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  dayButtonCompact: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0, // Allow shrinking
  },
  dayButtonCompactSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonCompactText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '700',
  },
  dayButtonCompactTextSelected: {
    color: colors.onPrimary,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  timeButtonText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  // Inline dropdown styles
  inlineDropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
  },
  inlineDropdownContent: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'visible',
  },
  inlineDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    minHeight: 32,
  },
  inlineDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineDropdownItemText: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '500',
  },
  inlineDropdownDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  inlineUnitDropdownContent: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    paddingVertical: 2,
  },
  inlineUnitDropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 2,
    marginVertical: 1,
    borderRadius: 6,
  },
  inlineUnitDropdownItemSelected: {
    backgroundColor: colors.surface,
  },
  inlineUnitDropdownItemText: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '500',
  },
  inlineUnitDropdownItemTextSelected: {
    color: colors.onSurface,
    fontWeight: '600',
  },
});

interface MonthlyDateModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: number;
  onSelectDate: (date: number) => void;
  onSetTime?: () => void;
}

function MonthlyDateModal({ visible, onClose, selectedDate, onSelectDate, onSetTime }: MonthlyDateModalProps) {
  const [showMonthlyPopup, setShowMonthlyPopup] = useState<boolean>(false);
  const [pendingDate, setPendingDate] = useState<number | null>(null);
  const [touchedDate, setTouchedDate] = useState<number | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const colors = useThemeColors();
  const monthlyStyles = useMemo(() => createMonthlyStyles(colors), [colors]);

  const daysGrid = useMemo(() => {
    const days: number[] = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i);
    }
    return days;
  }, []);

  const handleDateSelect = (day: number) => {
    if (day >= 29 && day <= 31) {
      setPendingDate(day);
      setShowMonthlyPopup(true);
    } else {
      onSelectDate(day);
    }
  };

  const handleMonthlyOption = (option: 'skip' | 'lastDay') => {
    if (pendingDate) {
      // For now, we'll just select the date and handle the logic in the reminder engine
      // The option can be stored as additional metadata if needed
      onSelectDate(pendingDate);
      setShowMonthlyPopup(false);
      setPendingDate(null);
    }
  };

  useEffect(() => {
    if (!visible) {
      setIsReady(false);
      return;
    }

    requestAnimationFrame(() => {
      setTimeout(() => setIsReady(true), Platform.OS === 'android' ? 50 : 0);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        onShow={() => setIsReady(true)}
      >
        <TouchableOpacity style={monthlyStyles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity
            style={[
              monthlyStyles.container,
              {
                opacity: isReady ? 1 : 0,
                ...Platform.select({
                  android: {
                    elevation: 24,
                    transform: [{ translateX: 0 }],
                  },
                }),
              }
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={monthlyStyles.title}>Select Day of Month</Text>
            <View style={monthlyStyles.daysGrid}>
              {daysGrid.map((day) => {
                const isSelected = day === selectedDate;
                const isTouched = day === touchedDate;
                const today = new Date().getDate();
                const isToday = day === today;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      monthlyStyles.dayCell,
                      isSelected && monthlyStyles.dayCellSelected,
                      isToday && !isSelected && monthlyStyles.dayCellToday,
                      isTouched && !isSelected && monthlyStyles.dayCellTouched
                    ]}
                    onPressIn={() => setTouchedDate(day)}
                    onPressOut={() => setTouchedDate(null)}
                    onPress={() => {
                      setTouchedDate(null);
                      handleDateSelect(day);
                    }}
                    testID={`monthly-day-${day}`}
                  >
                    <Text style={[
                      monthlyStyles.dayText,
                      isSelected && monthlyStyles.dayTextSelected,
                      isToday && !isSelected && monthlyStyles.dayTextToday,
                      isTouched && !isSelected && monthlyStyles.dayTextTouched
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={monthlyStyles.footer}>
              <View /> {/* Spacer for alignment */}
              <View style={monthlyStyles.footerButtons}>
                {onSetTime && (
                  <TouchableOpacity onPress={onSetTime} style={monthlyStyles.footerBtn}>
                    <Text style={monthlyStyles.footerBtnTextPrimary}>Set Time</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={monthlyStyles.footerBtn} onPress={onClose} testID="monthly-cancel">
                  <Text style={monthlyStyles.footerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <MonthlyOptionsPopup
        visible={showMonthlyPopup}
        selectedDate={pendingDate}
        onClose={() => {
          setShowMonthlyPopup(false);
          setPendingDate(null);
        }}
        onSelectOption={handleMonthlyOption}
      />
    </>
  );
}

interface MonthlyOptionsPopupProps {
  visible: boolean;
  selectedDate: number | null;
  onClose: () => void;
  onSelectOption: (option: 'skip' | 'lastDay') => void;
}

function MonthlyOptionsPopup({ visible, selectedDate, onClose, onSelectOption }: MonthlyOptionsPopupProps) {
  const [isReady, setIsReady] = useState<boolean>(false);
  const colors = useThemeColors();
  const monthlyPopupStyles = useMemo(() => createMonthlyPopupStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) {
      setIsReady(false);
      return;
    }

    requestAnimationFrame(() => {
      setTimeout(() => setIsReady(true), Platform.OS === 'android' ? 50 : 0);
    });
  }, [visible]);

  if (!visible || !selectedDate) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onShow={() => setIsReady(true)}
    >
      <TouchableOpacity style={monthlyPopupStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[
            monthlyPopupStyles.container,
            {
              opacity: isReady ? 1 : 0,
              ...Platform.select({
                android: {
                  elevation: 24,
                  transform: [{ translateX: 0 }],
                },
              }),
            }
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={monthlyPopupStyles.header}>
            <Feather name="alert-triangle" size={24} color={colors.warning} />
            <Text style={monthlyPopupStyles.title}>Monthly Reminder Options</Text>
          </View>

          <Text style={monthlyPopupStyles.description}>
            You selected day {selectedDate}. Some months don&apos;t have this date. How would you like to handle this?
          </Text>

          <View style={monthlyPopupStyles.optionsContainer}>
            <TouchableOpacity
              style={monthlyPopupStyles.optionButton}
              onPress={() => onSelectOption('skip')}
              testID="monthly-option-skip"
            >
              <Text style={monthlyPopupStyles.optionTitle}>Only remind if date exists</Text>
              <Text style={monthlyPopupStyles.optionDescription}>
                Skip reminder for months that don&apos;t have day {selectedDate}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={monthlyPopupStyles.optionButton}
              onPress={() => onSelectOption('lastDay')}
              testID="monthly-option-lastday"
            >
              <Text style={monthlyPopupStyles.optionTitle}>Remind on last day of month</Text>
              <Text style={monthlyPopupStyles.optionDescription}>
                If day {selectedDate} doesn&apos;t exist, remind on the last day of that month
              </Text>
            </TouchableOpacity>
          </View>

          <View style={monthlyPopupStyles.footer}>
            <TouchableOpacity style={monthlyPopupStyles.cancelButton} onPress={onClose} testID="monthly-popup-cancel">
              <Text style={monthlyPopupStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createMonthlyPopupStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceVariant,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '500',
  },
});

const createMonthlyStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  dayCellTouched: {
    backgroundColor: colors.primary,
    transform: [{ scale: 0.95 }],
  },
  dayText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: colors.onPrimary,
  },
  dayTextToday: {
    color: colors.tertiary,
    fontWeight: '700',
  },
  dayTextTouched: {
    color: colors.onPrimary,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  footerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerBtnText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
  footerBtnTextPrimary: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

const createCalendarStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 12,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
    flexShrink: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexShrink: 0,
  },
  navText: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '500',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navTextDisabled: {
    color: colors.outlineVariant,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayCell: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayCellSelectable: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 6,
  },
  weekdayCellActive: {
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  weekday: {
    width: 36,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  weekdayActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  weekdayDisabled: {
    color: colors.outlineVariant,
    opacity: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellReadOnly: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  dayCellAutoSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: colors.onPrimary,
  },
  dayTextReadOnly: {
    color: colors.primary,
  },
  dayTextToday: {
    color: colors.tertiary,
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: colors.outlineVariant,
  },
  footerMultiSelect: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    paddingTop: 12,
  },
  multiSelectCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  multiSelectLabel: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '500',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  footerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerBtnText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
  footerBtnTextPrimary: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

interface AnchorRect { x: number; y: number; width: number; height: number }

interface DropdownAnchorProps {
  label: string;
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onMeasure: (rect: AnchorRect | null) => void;
  style?: StyleProp<ViewStyle>;
}

const DropdownAnchor = React.forwardRef<View, DropdownAnchorProps>(({ label, open, onOpen, onToggle, onMeasure, style }, ref) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const measureNow = () => {
    try {
      (ref as any)?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        onMeasure({ x, y, width, height });
      });
    } catch (e) {
      console.log('measure error', e);
      onMeasure(null);
    }
  };

  return (
    <TouchableOpacity
      ref={ref as any}
      testID="date-menu-button"
      style={[styles.menuButton, style]}
      onPress={() => {
        if (!open) measureNow();
        onToggle();
      }}
      onLayout={() => {
        if (open) measureNow();
      }}
    >
      <MaterialIcons name="calendar-today" size={16} color={colors.onSurface} />
      <Text style={styles.menuButtonText}>{label}</Text>
      <Feather name="chevron-down" size={16} color={colors.onSurface} />
    </TouchableOpacity>
  );
});
DropdownAnchor.displayName = 'DropdownAnchor';

// New inline dropdown components that don't use Modal
interface InlineDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchor: AnchorRect | null | undefined;
  onToday: () => void;
  onTomorrow: () => void;
  onCustom: () => void;
  hideTomorrow?: boolean;
  containerRef?: React.RefObject<View | null>;
  anchorRef?: React.RefObject<View | null>;
}

function InlineDropdown({ visible, onClose, anchor, onToday, onTomorrow, onCustom, hideTomorrow = false, containerRef, anchorRef }: InlineDropdownProps) {
  // Calculate dropdown dimensions
  const dropdownWidth = 220;
  const dropdownHeight = hideTomorrow ? 120 : 180;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // State for opacity control to prevent flashing
  const [isPositioned, setIsPositioned] = React.useState(false);

  // Measure container to bound positioning within it
  const [containerOffset, setContainerOffset] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);
  React.useEffect(() => {
    try {
      containerRef?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        setContainerOffset({ x, y, width, height });
      });
    } catch { }
  }, [visible, containerRef]);
  const containerX = containerOffset?.x ?? 0;
  const containerY = containerOffset?.y ?? 0;
  const containerW = containerOffset?.width ?? 300;

  const { width: winW, height: winH } = require('react-native').Dimensions.get('window');
  const isPortrait = winH >= winW;
  const rightMarginPortrait = 12;

  // Compute anchor-relative position using ref when available; fallback to provided anchor rect
  const [computedPos, setComputedPos] = React.useState<{ top: number; left: number } | null>(null);
  React.useEffect(() => {
    if (!visible) {
      setIsPositioned(false);
      return;
    }

    let cancelled = false;

    const fallbackFromAnchorRect = () => {
      if (!anchor || typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
        typeof anchor.width !== 'number' || typeof anchor.height !== 'number') return;
      // Position directly below anchor with 4px gap
      const preferredTop = (anchor.y - containerY) + anchor.height + 4;
      // Align dropdown's right edge with anchor's right edge
      const preferredLeft = (anchor.x - containerX) + anchor.width - dropdownWidth;
      const top = Math.max(4, preferredTop);
      const left = Math.max(4, Math.min(preferredLeft, containerW - dropdownWidth - 4));
      if (!cancelled) {
        setComputedPos({ top, left });
        // Use requestAnimationFrame and small delay for Android
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (!cancelled) setIsPositioned(true);
          }, Platform.OS === 'android' ? 50 : 0);
        });
      }
    };

    if (anchorRef?.current && containerRef?.current && (anchorRef.current as any).measureLayout) {
      try {
        (anchorRef.current as any).measureLayout(
          containerRef.current,
          (left: number, top: number, width: number, height: number) => {
            // Position directly below anchor with 4px gap
            const preferredTop = top + height + 4;
            // Align dropdown's right edge with anchor's right edge
            const preferredLeft = left + width - dropdownWidth;
            const topBounded = Math.max(4, preferredTop);
            const leftBounded = Math.max(4, Math.min(preferredLeft, containerW - dropdownWidth - 4));
            if (!cancelled) {
              setComputedPos({ top: topBounded, left: leftBounded });
              // Use requestAnimationFrame and small delay for Android
              requestAnimationFrame(() => {
                setTimeout(() => {
                  if (!cancelled) setIsPositioned(true);
                }, Platform.OS === 'android' ? 50 : 0);
              });
            }
          },
          () => fallbackFromAnchorRect()
        );
      } catch {
        fallbackFromAnchorRect();
      }
    } else {
      fallbackFromAnchorRect();
    }

    return () => { cancelled = true; };
  }, [visible, anchorRef, containerRef, containerX, containerY, containerW, anchor, hideTomorrow]);

  const top = computedPos?.top ?? (anchor && typeof anchor.y === 'number' && typeof anchor.height === 'number' ? Math.max(4, (anchor.y - containerY) + anchor.height + 4) : 4);
  const left = computedPos?.left ?? (anchor && typeof anchor.x === 'number' && typeof anchor.width === 'number' ? Math.max(4, Math.min((anchor.x - containerX) + anchor.width - dropdownWidth, containerW - dropdownWidth - 4)) : containerW - dropdownWidth - 4);

  // Early return after all hooks have been called
  if (!visible || (!anchorRef && !anchor)) return null;

  return (
    <>
      {/* Backdrop overlay within container */}
      <TouchableOpacity
        style={[
          styles.inlineDropdownOverlay,
          { zIndex: 999998 }
        ]}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Dropdown content */}
      <View
        style={[
          styles.inlineDropdownContent,
          {
            top,
            left,
            width: dropdownWidth,
            zIndex: 999999,
            opacity: isPositioned ? 1 : 0,
            ...Platform.select({
              android: {
                // Force GPU rendering for smoother animations
                transform: [{ translateX: 0 }],
              },
            }),
          },
        ]}
      >
        <TouchableOpacity
          testID="menu-today"
          style={styles.inlineDropdownItem}
          onPress={onToday}
        >
          <View style={styles.inlineDropdownItemLeft}>
            <Feather name="clock" size={16} color={colors.onSurface} />
            <Text style={styles.inlineDropdownItemText}>Today</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        {!hideTomorrow && (
          <>
            <View style={styles.inlineDropdownDivider} />
            <TouchableOpacity
              testID="menu-tomorrow"
              style={styles.inlineDropdownItem}
              onPress={onTomorrow}
            >
              <View style={styles.inlineDropdownItemLeft}>
                <Feather name="clock" size={16} color={colors.onSurface} />
                <Text style={styles.inlineDropdownItemText}>Tomorrow</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </>
        )}
        <View style={styles.inlineDropdownDivider} />
        <TouchableOpacity
          testID="menu-custom"
          style={styles.inlineDropdownItem}
          onPress={onCustom}
        >
          <View style={styles.inlineDropdownItemLeft}>
            <MaterialIcons name="calendar-today" size={16} color={colors.onSurface} />
            <Text style={styles.inlineDropdownItemText}>Custom date…</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </>
  );
}

interface InlineUnitDropdownProps {
  visible: boolean;
  anchor: AnchorRect | null;
  unit: EveryUnit;
  units: EveryUnit[];
  getUnitLabel: (u: EveryUnit) => string;
  onChange: (unit: EveryUnit) => void;
  onClose: () => void;
  containerRef?: React.RefObject<View | null>;
  anchorRef?: React.RefObject<View | null>;
  disabledUnits?: EveryUnit[];
}

function InlineUnitDropdown({ visible, anchor, unit, units, getUnitLabel, onChange, onClose, containerRef, anchorRef, disabledUnits = [] }: InlineUnitDropdownProps) {
  // Calculate dropdown dimensions
  const dropdownWidth = 140;
  const itemHeight = 44;
  const dropdownHeight = units.length * itemHeight + 16;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Add positioning state for opacity control
  const [isPositioned, setIsPositioned] = React.useState(false);

  // Measure container position to convert anchor coordinates
  const [containerOffset, setContainerOffset] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);
  React.useEffect(() => {
    try {
      containerRef?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        setContainerOffset({ x, y, width, height });
      });
    } catch { }
  }, [visible, containerRef]);
  const containerX = containerOffset?.x ?? 0;
  const containerY = containerOffset?.y ?? 0;
  const containerW = containerOffset?.width ?? 300;

  // Compute anchor-relative position using ref when available; fallback to provided anchor rect
  const [computedPos, setComputedPos] = React.useState<{ top: number; left: number } | null>(null);
  React.useEffect(() => {
    if (!visible) {
      setIsPositioned(false);
      return;
    }

    let cancelled = false;

    const fallbackFromAnchorRect = () => {
      if (!anchor || typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
        typeof anchor.width !== 'number' || typeof anchor.height !== 'number') return;
      // Position directly below anchor with 4px gap
      const preferredTop = (anchor.y - containerY) + anchor.height + 4;
      // Align dropdown's right edge with anchor's right edge
      const preferredLeft = (anchor.x - containerX) + anchor.width - dropdownWidth;
      const top = Math.max(4, preferredTop);
      const left = Math.max(4, Math.min(preferredLeft, containerW - dropdownWidth - 4));
      if (!cancelled) {
        setComputedPos({ top, left });

        // Use requestAnimationFrame with Android delay for smooth positioning
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (!cancelled) {
              setIsPositioned(true);
            }
          }, Platform.OS === 'android' ? 50 : 0);
        });
      }
    };

    if (anchorRef?.current && containerRef?.current && (anchorRef.current as any).measureLayout) {
      try {
        (anchorRef.current as any).measureLayout(
          containerRef.current,
          (left: number, top: number, width: number, height: number) => {
            // Position directly below anchor with 4px gap
            const preferredTop = top + height + 4;
            // Align dropdown's right edge with anchor's right edge
            const preferredLeft = left + width - dropdownWidth;
            const topBounded = Math.max(4, preferredTop);
            const leftBounded = Math.max(4, Math.min(preferredLeft, containerW - dropdownWidth - 4));
            if (!cancelled) {
              setComputedPos({ top: topBounded, left: leftBounded });

              // Use requestAnimationFrame with Android delay for smooth positioning
              requestAnimationFrame(() => {
                setTimeout(() => {
                  if (!cancelled) {
                    setIsPositioned(true);
                  }
                }, Platform.OS === 'android' ? 50 : 0);
              });
            }
          },
          () => fallbackFromAnchorRect()
        );
      } catch {
        fallbackFromAnchorRect();
      }
    } else {
      fallbackFromAnchorRect();
    }

    return () => { cancelled = true; };
  }, [visible, anchorRef, containerRef, anchor, containerOffset, containerX, containerY, containerW]);

  const top = computedPos?.top ?? (anchor && typeof anchor.y === 'number' && typeof anchor.height === 'number' ? Math.max(4, (anchor.y - containerY) + anchor.height + 4) : 4);
  const left = computedPos?.left ?? (anchor && typeof anchor.x === 'number' && typeof anchor.width === 'number' ? Math.max(4, Math.min((anchor.x - containerX) + anchor.width - dropdownWidth, containerW - dropdownWidth - 4)) : containerW - dropdownWidth - 4);

  // Early return after all hooks have been called
  if (!visible || !anchor) return null;

  return (
    <>
      {/* Backdrop overlay within container */}
      <TouchableOpacity
        style={[
          styles.inlineDropdownOverlay,
          { zIndex: 999998 }
        ]}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Dropdown content */}
      <View
        style={[
          styles.inlineUnitDropdownContent,
          {
            top,
            left,
            width: dropdownWidth,
            zIndex: 999999,
            opacity: isPositioned ? 1 : 0, // Hide until positioned
          },
          // Android-specific styling for smoother animations
          Platform.OS === 'android' && {
            transform: [{ translateX: 0 }],
          },
        ]}
      >
        {units.map(u => {
          const isDisabled = disabledUnits.includes(u);
          return (
            <TouchableOpacity
              key={u}
              style={[
                styles.inlineUnitDropdownItem,
                unit === u && styles.inlineUnitDropdownItemSelected,
                isDisabled && { opacity: 0.5 }
              ]}
              onPress={() => {
                if (isDisabled) return;
                onChange(u);
                onClose();
              }}
              testID={`unit-${u}`}
              disabled={isDisabled}
            >
              <Text style={[
                styles.inlineUnitDropdownItemText,
                unit === u && styles.inlineUnitDropdownItemTextSelected
              ]}>
                {getUnitLabel(u)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  );
}

interface UntilDropdownModalProps {
  visible: boolean;
  anchor: AnchorRect | null;
  untilType: UntilType;
  options: UntilType[];
  getLabel: (u: UntilType) => string;
  onChange: (type: UntilType) => void;
  onClose: () => void;
  containerRef?: React.RefObject<View | null>;
  anchorRef?: React.RefObject<View | null>;
}

function UntilDropdownModal({ visible, anchor, untilType, options, getLabel, onChange, onClose, containerRef, anchorRef }: UntilDropdownModalProps) {
  const dropdownWidth = 180;
  const itemHeight = 44;
  const dropdownHeight = options.length * itemHeight + 12;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isPositioned, setIsPositioned] = React.useState(false);
  const [containerOffset, setContainerOffset] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);
  React.useEffect(() => {
    try {
      containerRef?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        setContainerOffset({ x, y, width, height });
      });
    } catch { }
  }, [visible, containerRef]);
  const containerX = containerOffset?.x ?? 0;
  const containerY = containerOffset?.y ?? 0;
  const containerW = containerOffset?.width ?? 300;

  const [computedPos, setComputedPos] = React.useState<{ top: number; left: number } | null>(null);
  React.useEffect(() => {
    if (!visible) {
      setIsPositioned(false);
      return;
    }
    let cancelled = false;

    const fallbackFromAnchorRect = () => {
      if (!anchor || typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
        typeof anchor.width !== 'number' || typeof anchor.height !== 'number') return;
      // Position directly below anchor with 4px gap
      const preferredTop = (anchor.y - containerY) + anchor.height + 4;
      // Align dropdown's right edge with anchor's right edge
      const preferredLeft = (anchor.x - containerX) + anchor.width - dropdownWidth;
      const top = Math.max(4, preferredTop);
      const left = Math.max(4, Math.min(preferredLeft, containerW - dropdownWidth - 4));
      if (!cancelled) {
        setComputedPos({ top, left });
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (!cancelled) setIsPositioned(true);
          }, Platform.OS === 'android' ? 50 : 0);
        });
      }
    };

    if (anchorRef?.current && containerRef?.current && (anchorRef.current as any).measureLayout) {
      try {
        (anchorRef.current as any).measureLayout(
          containerRef.current,
          (left: number, top: number, width: number, height: number) => {
            // Position directly below anchor with 4px gap
            const preferredTop = top + height + 4;
            // Align dropdown's right edge with anchor's right edge
            const preferredLeft = left + width - dropdownWidth;
            const topBounded = Math.max(4, preferredTop);
            const leftBounded = Math.max(4, Math.min(preferredLeft, containerW - dropdownWidth - 4));
            if (!cancelled) {
              setComputedPos({ top: topBounded, left: leftBounded });
              requestAnimationFrame(() => {
                setTimeout(() => {
                  if (!cancelled) setIsPositioned(true);
                }, Platform.OS === 'android' ? 50 : 0);
              });
            }
          },
          () => fallbackFromAnchorRect()
        );
      } catch {
        fallbackFromAnchorRect();
      }
    } else {
      fallbackFromAnchorRect();
    }

    return () => { cancelled = true; };
  }, [visible, anchorRef, containerRef, containerX, containerY, containerW, anchor]);

  const top = computedPos?.top ?? (anchor && typeof anchor.y === 'number' && typeof anchor.height === 'number' ? Math.max(4, (anchor.y - containerY) + anchor.height + 4) : 4);
  const left = computedPos?.left ?? (anchor && typeof anchor.x === 'number' && typeof anchor.width === 'number' ? Math.max(4, Math.min((anchor.x - containerX) + anchor.width - dropdownWidth, containerW - dropdownWidth - 4)) : containerW - dropdownWidth - 4);

  if (!visible || (!anchorRef && !anchor)) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.inlineDropdownOverlay, { zIndex: 999998 }]}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          styles.inlineUnitDropdownContent,
          {
            top,
            left,
            width: dropdownWidth,
            zIndex: 999999,
            opacity: isPositioned ? 1 : 0,
            ...Platform.select({
              android: { transform: [{ translateX: 0 }] },
            }),
          },
        ]}
      >
        {options.map((opt) => {
          const selected = opt === untilType;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.inlineUnitDropdownItem, selected && styles.inlineUnitDropdownItemSelected]}
              onPress={() => onChange(opt)}
            >
              <Text style={[styles.inlineUnitDropdownItemText, selected && styles.inlineUnitDropdownItemTextSelected]}>
                {getLabel(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

interface UntilCountModalProps {
  visible: boolean;
  onClose: () => void;
  countValue: number;
  onSubmit: (count: number) => void;
}

function UntilCountModal({ visible, onClose, countValue, onSubmit }: UntilCountModalProps) {
  const [temp, setTemp] = useState<string>(String(countValue));
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dropdownModalStyles = useMemo(() => createDropdownModalStyles(colors), [colors]);
  const calendarStyles = useMemo(() => createCalendarStyles(colors), [colors]);

  useEffect(() => {
    if (visible) setTemp(String(countValue));
  }, [visible, countValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[dropdownModalStyles.overlayAbsolute, { justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity activeOpacity={1} style={{
          width: 260,
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: 16,
          padding: 12,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.24,
          shadowRadius: 20,
          elevation: 24,
        }}
          onPress={() => { /* keep modal open */ }}>
          <Text style={[styles.everyText, { marginBottom: 8 }]}>Occurrences</Text>
          <TextInput
            style={[styles.everyInput, { textAlign: 'center' }]}
            keyboardType="number-pad"
            maxLength={3}
            value={temp}
            onChangeText={(txt) => {
              // Allow clearing while editing; clamp only on submit
              const sanitized = txt.replace(/\D/g, '');
              setTemp(sanitized);
            }}
            testID="until-count-modal-input"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
            <TouchableOpacity style={calendarStyles.footerBtn} onPress={onClose} testID="until-count-cancel">
              <Text style={calendarStyles.footerBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[calendarStyles.footerBtn, { marginLeft: 8 }]}
              onPress={() => {
                const val = parseInt(temp || '0', 10);
                onSubmit(Math.min(999, Math.max(1, val)));
              }}
              testID="until-count-done"
            >
              <Text style={calendarStyles.footerBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  anchor: AnchorRect | null | undefined;
  onToday: () => void;
  onTomorrow: () => void;
  onCustom: () => void;
  hideTomorrow?: boolean;
}

function DropdownModal({ visible, onClose, anchor, onToday, onTomorrow, onCustom, hideTomorrow = false }: DropdownModalProps) {
  const [layout, setLayout] = React.useState<{ width: number; height: number } | null>(null);
  const colors = useThemeColors();
  const dropdownModalStyles = useMemo(() => createDropdownModalStyles(colors), [colors]);

  // Early return after all hooks have been called
  if (!visible || !anchor) return null;

  // Additional null check before accessing anchor properties
  if (typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
    typeof anchor.width !== 'number' || typeof anchor.height !== 'number') {
    return null;
  }

  const { width: winW, height: winH } = require('react-native').Dimensions.get('window');

  // Calculate dropdown dimensions
  const dropdownWidth = 220;
  const dropdownHeight = hideTomorrow ? 120 : 180;

  // Position calculation
  // Place dropdown below button with 8px gap
  const preferredTop = anchor.y + anchor.height + 8;

  // Align to right edge of trigger button
  const preferredLeft = anchor.x + anchor.width - dropdownWidth;

  // Boundary checks with 16px padding from screen edges
  const top = Math.max(16, Math.min(preferredTop, winH - dropdownHeight - 16));
  const left = Math.max(16, Math.min(preferredLeft, winW - dropdownWidth - 16));

  // If dropdown would go below screen, position it above the button
  const shouldFlipUp = preferredTop + dropdownHeight > winH - 16;
  const finalTop = shouldFlipUp ? anchor.y - dropdownHeight - 8 : top;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        {/* Full-screen backdrop */}
        <TouchableOpacity
          style={dropdownModalStyles.overlayAbsolute}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Dropdown content with measured layout */}
        <View
          style={[
            dropdownModalStyles.dropdownAbsolute,
            {
              top: finalTop,
              left,
              width: dropdownWidth,
            },
          ]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setLayout({ width, height });
          }}
        >
          <TouchableOpacity
            testID="menu-today"
            style={dropdownModalStyles.itemRow}
            onPress={onToday}
          >
            <View style={dropdownModalStyles.itemLeft}>
              <Feather name="clock" size={16} color={colors.primary} />
              <Text style={dropdownModalStyles.itemText}>Today</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          {!hideTomorrow && (
            <>
              <View style={dropdownModalStyles.divider} />
              <TouchableOpacity
                testID="menu-tomorrow"
                style={dropdownModalStyles.itemRow}
                onPress={onTomorrow}
              >
                <View style={dropdownModalStyles.itemLeft}>
                  <Feather name="clock" size={16} color={colors.primary} />
                  <Text style={dropdownModalStyles.itemText}>Tomorrow</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </>
          )}
          <View style={dropdownModalStyles.divider} />
          <TouchableOpacity
            testID="menu-custom"
            style={dropdownModalStyles.itemRow}
            onPress={onCustom}
          >
            <View style={dropdownModalStyles.itemLeft}>
              <CalendarIcon size={16} color={colors.primary} />
              <Text style={dropdownModalStyles.itemText}>Custom date…</Text>
            </View>
            <ChevronRight size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createDropdownModalStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999998,
  },
  dropdownAbsolute: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    zIndex: 999999,
    // Ensure dropdown is never clipped
    overflow: 'visible',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginHorizontal: 8,
    marginVertical: 4,
  },
});

// Export components for use in parent
export { DropdownModal, UnitDropdownModal, InlineDropdown, InlineUnitDropdown, CalendarModal, type AnchorRect };
