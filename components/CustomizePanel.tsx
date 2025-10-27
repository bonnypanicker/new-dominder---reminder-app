import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Keyboard as RNKeyboard } from 'react-native';
import { RepeatType, EveryUnit } from '@/types/reminder';
import { DAYS_OF_WEEK } from '@/constants/reminders';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Material3Colors } from '@/constants/colors';

interface CustomizePanelProps {
  repeatType: RepeatType;
  repeatDays: number[];
  onRepeatTypeChange: (type: RepeatType) => void;
  onRepeatDaysChange: (days: number[]) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenTime?: () => void;
  displayTime: string;
  everyValue?: number;
  everyUnit?: EveryUnit;
  onEveryChange?: (value: number, unit: EveryUnit) => void;
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
  everyValue,
  everyUnit,
  onEveryChange,
}: CustomizePanelProps) {
  const containerRef = useRef<View>(null);
  const dateAnchorRef = useRef<View>(null);
  const unitAnchorRef = useRef<View>(null);
  
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
  const [yearlyCalendarOpen, setYearlyCalendarOpen] = useState<boolean>(false);

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
    onOpenTime?.();
  };

  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
    onOpenTime?.();
  };

  const handleDropdownOpen = (coords: AnchorRect) => {
    setDropdownAnchor(coords);
    setDropdownOpen(true);
  };

  const handleUnitDropdownOpen = (coords: AnchorRect) => {
    setUnitDropdownAnchor(coords);
    setUnitDropdownOpen(true);
  };



  const units: EveryUnit[] = ['minutes', 'hours', 'days'];
  
  const getUnitLabel = (unit: EveryUnit): string => {
    const labels: Record<EveryUnit, string> = {
      minutes: 'Minutes',
      hours: 'Hours',
      days: 'Days',
      weeks: 'Weeks',
      months: 'Months',
      years: 'Years',
    };
    return labels[unit];
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
      <View style={styles.repeatOptionsContainer}>
        {repeatOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.repeatOption,
              repeatType === option.value && styles.repeatOptionSelected
            ]}
            onPress={() => onRepeatTypeChange(option.value)}
            testID={`repeat-${option.value}`}
          >
            <Text style={[
              styles.repeatOptionText,
              repeatType === option.value && styles.repeatOptionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(repeatType === 'none' || repeatType === 'every') && (
        <View style={styles.dateSelectionContainer}>
          <View style={[styles.topRow, repeatType === 'every' && { marginBottom: 8 }]}>
            <Text style={styles.topRowLabel}>{repeatType === 'every' ? 'Start' : 'Date'}</Text>
            <View style={styles.menuWrapper}
              >
              <DropdownAnchor
                ref={dateAnchorRef}
                label={`${formattedSelectedDate} • ${displayTime}`}
                open={dropdownOpen}
                onOpen={() => {}}
                onToggle={() => setDropdownOpen(!dropdownOpen)}
                onMeasure={(coords) => coords && handleDropdownOpen(coords)}
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
        <View style={styles.daysContainer}>
          <View style={[styles.dailySection, styles.dailyTimeRow]}>
            <Text style={styles.dailySectionLabel}>Time</Text>
            <View style={styles.menuWrapper}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => { onOpenTime?.(); }}
                testID="daily-time-button"
              >
                <Feather name="clock" size={16} color="#111827" />
                <Text style={styles.menuButtonText}>{displayTime}</Text>
                <Feather name="chevron-down" size={16} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.dailySection}>
            <Text style={styles.dailySectionLabel}>Days</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButtonCompact,
                    repeatDays.includes(day.value) && styles.dayButtonCompactSelected
                  ]}
                  onPress={() => toggleDay(day.value)}
                  testID={`weekday-${day.value}`}
                >
                  <Text style={[
                    styles.dayButtonCompactText,
                    repeatDays.includes(day.value) && styles.dayButtonCompactTextSelected
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
        <View style={styles.dateSelectionContainer}>
          <View style={styles.topRow}>
            <Text style={styles.topRowLabel}>Repeat on</Text>
            <View style={styles.menuWrapper}>
              <TouchableOpacity
                testID="monthly-open-calendar"
                style={styles.menuButton}
                onPress={() => { setMonthlyCalendarOpen(true); }}
              >
                <MaterialIcons name="calendar-today" size={16} color="#111827" />
                <Text style={styles.menuButtonText}>
                  Day {monthlyDate} • {displayTime}
                </Text>
                <Feather name="chevron-down" size={16} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {repeatType === 'yearly' && (
        <View style={styles.dateSelectionContainer}>
          <View style={styles.topRow}>
            <Text style={styles.topRowLabel}>Repeat on</Text>
            <View style={styles.menuWrapper}>
              <TouchableOpacity
                testID="yearly-open-calendar"
                style={styles.menuButton}
                onPress={() => { setYearlyCalendarOpen(true); }}
              >
                <MaterialIcons name="calendar-today" size={16} color="#111827" />
                <Text style={styles.menuButtonText}>{`${formattedSelectedDateNoYear} • ${displayTime}`}</Text>
                <Feather name="chevron-down" size={16} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <CalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          onDateChange(date);
          setCalendarOpen(false);
          // Keep keyboard as-is on date selection; opening time will handle focus
          if (repeatType === 'every' || repeatType === 'none') {
            try {
              onOpenTime?.();
            } catch (e) {
              console.log('open time after calendar date selection error', e);
            }
          }
        }}
      />

      <CalendarModal
        visible={yearlyCalendarOpen}
        onClose={() => setYearlyCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          onDateChange(date);
          setYearlyCalendarOpen(false);
          // Don't dismiss keyboard when selecting date
          // Only dismiss when opening time picker
          try {
            onOpenTime?.();
          } catch (e) {
            console.log('open time after yearly date error', e);
          }
        }}
        hideYear
      />

      <MonthlyDateModal
        visible={monthlyCalendarOpen}
        onClose={() => setMonthlyCalendarOpen(false)}
        selectedDate={monthlyDate}
        onSelectDate={(date) => {
          setMonthlyDate(date);
          setMonthlyCalendarOpen(false);
          // Don't dismiss keyboard when selecting date
          // Only dismiss when opening time picker
          try {
            onOpenTime?.();
          } catch (e) {
            console.log('open time after monthly day error', e);
          }
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
      />


    </View>
  );
}

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  hideYear?: boolean;
}

function CalendarModal({ visible, onClose, selectedDate, onSelectDate, hideYear = false }: CalendarModalProps) {
  const [isReady, setIsReady] = useState(false);
  const [y, m, d] = selectedDate.split('-').map(Number);
  const [month, setMonth] = useState<number>(() => {
    const now = new Date();
    return (m ?? now.getMonth() + 1) - 1;
  });
  const [year, setYear] = useState<number>(() => {
    const now = new Date();
    return y ?? now.getFullYear();
  });
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(() => {
    if (y && m && d) {
      return { year: y, month: (m ?? 1) - 1, day: d };
    }
    return null;
  });
  
  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  const daysMatrix = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: Array<Array<number | null>> = [];
    let current = 1 - startWeekday;
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
  }, [month, year]);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Check if a date is in the past
  const isDateDisabled = (dayVal: number | null): boolean => {
    if (dayVal === null) return true;
    const checkDate = new Date(year, month, dayVal);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };
  
  // Prevent navigating to past months
  const canGoPrevMonth = (): boolean => {
    if (year > currentYear) return true;
    if (year === currentYear && month > currentMonth) return true;
    return false;
  };
  
  // Prevent navigating to past years
  const canGoPrevYear = (): boolean => {
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
                  transform: [{ translateZ: 0 }],
                },
              }),
            }
          ]} 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          <View style={calendarStyles.header}>
            {!hideYear ? (
              <TouchableOpacity
                onPress={() => canGoPrevYear() && setYear(prev => prev - 1)}
                style={[calendarStyles.navButton, !canGoPrevYear() && calendarStyles.navButtonDisabled]}
                testID="prev-year"
                disabled={!canGoPrevYear()}
              >
                <Feather name="chevron-left" size={16} color={canGoPrevYear() ? "#111827" : "#D1D5DB"} />
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
                <Feather name="chevron-left" size={20} color={canGoPrevMonth() ? "#111827" : "#D1D5DB"} />
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
                <Feather name="chevron-right" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            {!hideYear ? (
              <TouchableOpacity
                onPress={() => setYear(prev => prev + 1)}
                style={calendarStyles.navButton}
                testID="next-year"
              >
                <Text style={calendarStyles.navText}>Year</Text>
                <Feather name="chevron-right" size={16} color="#111827" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 76 }} />
            )}
          </View>

          <View style={calendarStyles.weekdaysRow}>
            {weekdays.map((w, index) => (
              <Text key={`weekday-${index}`} style={calendarStyles.weekday}>{w}</Text>
            ))}
          </View>

          {daysMatrix.map((row, idx) => (
            <View key={idx} style={calendarStyles.weekRow}>
              {row.map((val, i) => {
                const isSelected = val !== null && selectedDay !== null && 
                                 year === selectedDay.year && month === selectedDay.month && val === selectedDay.day;
                const isToday = val !== null && year === currentYear && month === currentMonth && val === currentDate;
                const isDisabled = isDateDisabled(val);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      calendarStyles.dayCell, 
                      isSelected && calendarStyles.dayCellSelected,
                      isToday && !isSelected && calendarStyles.dayCellToday,
                      isDisabled && calendarStyles.dayCellDisabled
                    ]}
                    disabled={isDisabled}
                    onPressIn={() => {
                      if (val !== null && !isDisabled) {
                        // Update selection immediately on touch
                        setSelectedDay({ year, month, day: val });
                      }
                    }}
                    onPress={() => {
                      if (val === null || isDisabled) return;
                      const mm = String(month + 1).padStart(2, '0');
                      const dd = String(val).padStart(2, '0');
                      onSelectDate(`${year}-${mm}-${dd}`);
                    }}
                    testID={`day-${val ?? 'null'}`}
                  >
                    <Text style={[
                      calendarStyles.dayText, 
                      isSelected && calendarStyles.dayTextSelected,
                      isToday && !isSelected && calendarStyles.dayTextToday,
                      isDisabled && calendarStyles.dayTextDisabled
                    ]}>
                      {val ?? ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={calendarStyles.footer}>
            <TouchableOpacity style={calendarStyles.footerBtn} onPress={onClose} testID="calendar-cancel">
              <Text style={calendarStyles.footerBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const UnitDropdownButton = React.forwardRef<View, { unit: EveryUnit; onChange: (unit: EveryUnit) => void; onOpenDropdown: (coords: AnchorRect) => void }>(
  ({ unit, onChange, onOpenDropdown }, ref) => {
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
        <Feather name="chevron-down" size={14} color="#111827" />
      </TouchableOpacity>
    );
  }
);
UnitDropdownButton.displayName = 'UnitDropdownButton';

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
                elevation: 24,
                transform: [{ translateZ: 0 }],
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 4,
    overflow: 'visible',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 0,
    height: 0,
  },
  dateSelectionContainer: {
    marginTop: 16,
    marginBottom: 16,
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
    color: '#374151',
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
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
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
    color: '#111827',
  },
  repeatOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 8,
    zIndex: 1,
    minHeight: 40,
  },
  repeatOption: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOptionSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  repeatOptionText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  repeatOptionTextSelected: {
    color: 'white',
  },
  daysContainer: {
    marginTop: 8,
    gap: 16,
  },
  dailySection: {
    gap: 8,
  },
  dailyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailySectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  everyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    zIndex: 100,
    position: 'relative',
  },
  everyText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  everyInput: {
    width: 40,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 6,
    color: '#000000',
    fontWeight: 'bold',
  },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unitButtonText: {
    color: '#111827',
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
    backgroundColor: '#1E3A8A',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  unitButtonTextSelected: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  unitDropdown: {
    position: 'absolute',
    top: 38,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
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
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 24,
    overflow: 'hidden',
    paddingVertical: 4,
    zIndex: 999999,
  },
  unitDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 8,
  },
  unitDropdownItemSelected: {
    backgroundColor: Material3Colors.light.primaryContainer,
  },
  unitDropdownItemText: {
    fontSize: 14,
    color: Material3Colors.light.onSurface,
    fontWeight: '500',
  },
  unitDropdownItemTextSelected: {
    color: Material3Colors.light.primary,
    fontWeight: '600',
  },
  dayButtonCompact: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  dayButtonCompactSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  dayButtonCompactText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  dayButtonCompactTextSelected: {
    color: 'white',
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  timeButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  // Inline dropdown styles
  inlineDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  inlineDropdownContent: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible',
  },
  inlineDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  inlineDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineDropdownItemText: {
    fontSize: 14,
    color: Material3Colors.light.onSurface,
    fontWeight: '500',
  },
  inlineDropdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  inlineUnitDropdownContent: {
    position: 'absolute',
    backgroundColor: Material3Colors.light.primaryContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Material3Colors.light.primary,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 24,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  inlineUnitDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 8,
  },
  inlineUnitDropdownItemSelected: {
    backgroundColor: Material3Colors.light.primaryContainer,
  },
  inlineUnitDropdownItemText: {
    fontSize: 14,
    color: Material3Colors.light.onSurface,
    fontWeight: '500',
  },
  inlineUnitDropdownItemTextSelected: {
    color: Material3Colors.light.primary,
    fontWeight: '600',
  },
});

interface MonthlyDateModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: number;
  onSelectDate: (date: number) => void;
}

function MonthlyDateModal({ visible, onClose, selectedDate, onSelectDate }: MonthlyDateModalProps) {
  const [showMonthlyPopup, setShowMonthlyPopup] = useState<boolean>(false);
  const [pendingDate, setPendingDate] = useState<number | null>(null);
  const [touchedDate, setTouchedDate] = useState<number | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

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
                    transform: [{ translateZ: 0 }],
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
              <TouchableOpacity style={monthlyStyles.footerBtn} onPress={onClose} testID="monthly-cancel">
                <Text style={monthlyStyles.footerBtnText}>Cancel</Text>
              </TouchableOpacity>
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
                  transform: [{ translateZ: 0 }],
                },
              }),
            }
          ]} 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          <View style={monthlyPopupStyles.header}>
            <Feather name="alert-triangle" size={24} color="#F59E0B" />
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

const monthlyPopupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
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
    color: '#111827',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

const monthlyStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayCellSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  dayCellToday: {
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  dayCellTouched: {
    backgroundColor: '#1E3A8A',
    transform: [{ scale: 0.95 }],
  },
  dayText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: 'white',
  },
  dayTextToday: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  dayTextTouched: {
    color: 'white',
  },
  footer: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  footerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerBtnText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '600',
  },
});

const actionSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemRowFirst: {
    marginTop: 4,
  },
  itemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  itemTextSelected: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E3A8A',
  },
});

const calendarStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
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
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexShrink: 0,
  },
  navText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navTextDisabled: {
    color: '#D1D5DB',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekday: {
    width: 36,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#1E3A8A',
  },
  dayCellToday: {
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: 'white',
  },
  dayTextToday: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#D1D5DB',
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
    color: '#1E3A8A',
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
}

const DropdownAnchor = React.forwardRef<View, DropdownAnchorProps>(({ label, open, onOpen, onToggle, onMeasure }, ref) => {
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
      style={styles.menuButton}
      onPress={() => {
        if (!open) measureNow();
        onToggle();
      }}
      onLayout={() => {
        if (open) measureNow();
      }}
    >
      <MaterialIcons name="calendar-today" size={16} color="#111827" />
      <Text style={styles.menuButtonText}>{label}</Text>
      <Feather name="chevron-down" size={16} color="#111827" />
    </TouchableOpacity>
  );
});

// New inline dropdown components that don't use Modal
interface InlineDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchor: AnchorRect | null | undefined;
  onToday: () => void;
  onTomorrow: () => void;
  onCustom: () => void;
  hideTomorrow?: boolean;
  containerRef?: React.RefObject<View>;
  anchorRef?: React.RefObject<View>;
}

function InlineDropdown({ visible, onClose, anchor, onToday, onTomorrow, onCustom, hideTomorrow = false, containerRef, anchorRef }: InlineDropdownProps) {
  if (!visible || (!anchorRef && !anchor)) return null;
  
  // Calculate dropdown dimensions
  const dropdownWidth = 220;
  const dropdownHeight = hideTomorrow ? 120 : 180;
  
  // State for opacity control to prevent flashing
  const [isPositioned, setIsPositioned] = React.useState(false);
  
  // Measure container to bound positioning within it
  const [containerOffset, setContainerOffset] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);
  React.useEffect(() => {
    try {
      containerRef?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        setContainerOffset({ x, y, width, height });
      });
    } catch {}
  }, [visible, containerRef?.current]);
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
      if (!anchor) return;
      const preferredTop = (anchor.y - containerY) + anchor.height + 8;
      // Align dropdown's right edge with anchor's right edge
      const preferredLeft = (anchor.x - containerX) + anchor.width - dropdownWidth;
      const top = Math.max(8, preferredTop);
      const left = Math.max(8, Math.min(preferredLeft, containerW - dropdownWidth - 8));
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
            const preferredTop = top + height + 8;
            // Align dropdown's right edge with anchor's right edge
            const preferredLeft = left + width - dropdownWidth;
            const topBounded = Math.max(8, preferredTop);
            const leftBounded = Math.max(8, Math.min(preferredLeft, containerW - dropdownWidth - 8));
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
  }, [visible, anchorRef?.current, containerRef?.current, containerX, containerY, containerW, anchor, hideTomorrow]);

  const top = computedPos?.top ?? (anchor ? Math.max(8, (anchor.y - containerY) + anchor.height + 8) : 8);
  // Force align near right border of the container (easy way)
  const left = Math.max(8, containerW - dropdownWidth - (Platform.OS === 'android' ? 24 : 8));

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
                elevation: 24,
                // Force GPU rendering for smoother animations
                transform: [{ translateZ: 0 }],
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
            <Feather name="clock" size={16} color="#111827" />
            <Text style={styles.inlineDropdownItemText}>Today</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#6B7280" />
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
                <Feather name="clock" size={16} color="#111827" />
                <Text style={styles.inlineDropdownItemText}>Tomorrow</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#6B7280" />
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
            <MaterialIcons name="calendar-today" size={16} color="#111827" />
            <Text style={styles.inlineDropdownItemText}>Custom date…</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#6B7280" />
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
  containerRef?: React.RefObject<View>;
  anchorRef?: React.RefObject<View>;
}

function InlineUnitDropdown({ visible, anchor, unit, units, getUnitLabel, onChange, onClose, containerRef, anchorRef }: InlineUnitDropdownProps) {
  if (!visible || !anchor) return null;
  
  // Calculate dropdown dimensions
  const dropdownWidth = 140;
  const itemHeight = 44;
  const dropdownHeight = units.length * itemHeight + 16;
  
  // Add positioning state for opacity control
  const [isPositioned, setIsPositioned] = React.useState(false);
  
  // Measure container position to convert anchor coordinates
  const [containerOffset, setContainerOffset] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);
  React.useEffect(() => {
    try {
      containerRef?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        setContainerOffset({ x, y, width, height });
      });
    } catch {}
  }, [visible]);
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
      const preferredTop = (anchor.y - containerY) + anchor.height + 8;
      const preferredLeft = (anchor.x - containerX) + (anchor.width / 2) - (dropdownWidth / 2);
      const top = Math.max(8, preferredTop);
      const left = Math.max(8, Math.min(preferredLeft, containerW - dropdownWidth - 8));
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
            const preferredTop = top + height + 8;
            const preferredLeft = left + (width / 2) - (dropdownWidth / 2);
            const topBounded = Math.max(8, preferredTop);
            const leftBounded = Math.max(8, Math.min(preferredLeft, containerW - dropdownWidth - 8));
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
  }, [visible, anchorRef, containerRef, anchor, containerOffset]);

  const top = computedPos?.top ?? Math.max(8, (anchor.y - containerY) + anchor.height + 8);
  const left = computedPos?.left ?? Math.max(8, Math.min((anchor.x - containerX) + (anchor.width / 2) - (dropdownWidth / 2), containerW - dropdownWidth - 8));

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
            elevation: 24,
            transform: [{ translateZ: 0 }],
          },
        ]}
      >
        {units.map(u => (
          <TouchableOpacity 
            key={u} 
            style={[
              styles.inlineUnitDropdownItem,
              unit === u && styles.inlineUnitDropdownItemSelected
            ]} 
            onPress={() => { 
              onChange(u); 
              onClose(); 
            }} 
            testID={`unit-${u}`}
          >
            <Text style={[
              styles.inlineUnitDropdownItemText,
              unit === u && styles.inlineUnitDropdownItemTextSelected
            ]}>
              {getUnitLabel(u)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
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
  
  if (!visible || !anchor) return null;
  
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
            <Feather name="clock" size={16} color={Material3Colors.light.primary} />
            <Text style={dropdownModalStyles.itemText}>Today</Text>
          </View>
          <Feather name="chevron-right" size={16} color={Material3Colors.light.onSurfaceVariant} />
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
                <Feather name="clock" size={16} color={Material3Colors.light.primary} />
                <Text style={dropdownModalStyles.itemText}>Tomorrow</Text>
              </View>
              <Feather name="chevron-right" size={16} color={Material3Colors.light.onSurfaceVariant} />
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
            <CalendarIcon size={16} color={Material3Colors.light.primary} />
            <Text style={dropdownModalStyles.itemText}>Custom date…</Text>
          </View>
          <ChevronRight size={16} color={Material3Colors.light.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
      </View>
    </Modal>
  );
}

const dropdownModalStyles = StyleSheet.create({
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
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 24,
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
    zIndex: 999999,
    // Ensure dropdown is never clipped
    overflow: 'visible',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    fontSize: 14,
    color: Material3Colors.light.onSurface,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Material3Colors.light.surfaceVariant,
    marginHorizontal: 8,
    marginVertical: 4,
  },
});

// Export components for use in parent
export { DropdownModal, UnitDropdownModal, InlineDropdown, InlineUnitDropdown, type AnchorRect };
