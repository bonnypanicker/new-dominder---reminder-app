import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Keyboard as RNKeyboard } from 'react-native';
import { RepeatType, EveryUnit } from '@/types/reminder';
import { DAYS_OF_WEEK } from '@/constants/reminders';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react-native';
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
      setMenuOpen(false);
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
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
  };

  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
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
            <View style={styles.menuWrapper}>
              <DropdownAnchor
                label={`${formattedSelectedDate} • ${displayTime}`}
                open={menuOpen}
                onOpen={() => setMenuOpen(true)}
                onToggle={() => { setMenuOpen(v => !v); }}
                onMeasure={(coords) => setAnchor(coords)}
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
              <UnitDropdown
                unit={everyUnit ?? 'hours'}
                onChange={(unit) => onEveryChange?.(everyValue ?? 1, unit)}
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
                <Clock size={16} color="#111827" />
                <Text style={styles.menuButtonText}>{displayTime}</Text>
                <ChevronDown size={16} color="#111827" />
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
                <CalendarIcon size={16} color="#111827" />
                <Text style={styles.menuButtonText}>
                  Day {monthlyDate} • {displayTime}
                </Text>
                <ChevronDown size={16} color="#111827" />
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
                <CalendarIcon size={16} color="#111827" />
                <Text style={styles.menuButtonText}>{`${formattedSelectedDateNoYear} • ${displayTime}`}</Text>
                <ChevronDown size={16} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {menuOpen && (
        <DropdownModal
          onClose={() => setMenuOpen(false)}
          anchor={anchor}
          onToday={() => {
            setToday();
            setMenuOpen(false);
            // Trigger time picker for 'every' and 'none' repeat types
            if (repeatType === 'every' || repeatType === 'none') {
              try {
                onOpenTime?.();
              } catch (e) {
                console.log('open time after today selection error', e);
              }
            }
          }}
          onTomorrow={() => {
            setTomorrow();
            setMenuOpen(false);
            // Trigger time picker for 'none' repeat type (once reminders)
            if (repeatType === 'none') {
              try {
                onOpenTime?.();
              } catch (e) {
                console.log('open time after tomorrow selection error', e);
              }
            }
          }}
          onCustom={() => {
            setMenuOpen(false);
            setCalendarOpen(true);
          }}
          hideTomorrow={repeatType === 'every'}
        />
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

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} presentationStyle="overFullScreen" statusBarTranslucent>
      <TouchableOpacity style={calendarStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={calendarStyles.container} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={calendarStyles.header}>
            {!hideYear ? (
              <TouchableOpacity
                onPress={() => canGoPrevYear() && setYear(prev => prev - 1)}
                style={[calendarStyles.navButton, !canGoPrevYear() && calendarStyles.navButtonDisabled]}
                testID="prev-year"
                disabled={!canGoPrevYear()}
              >
                <ChevronLeft size={16} color={canGoPrevYear() ? "#111827" : "#D1D5DB"} />
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
                <ChevronLeft size={20} color={canGoPrevMonth() ? "#111827" : "#D1D5DB"} />
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
                <ChevronRight size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            {!hideYear ? (
              <TouchableOpacity
                onPress={() => setYear(prev => prev + 1)}
                style={calendarStyles.navButton}
                testID="next-year"
              >
                <Text style={calendarStyles.navText}>Year</Text>
                <ChevronRight size={16} color="#111827" />
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

function UnitDropdown({ unit, onChange }: { unit: EveryUnit; onChange: (unit: EveryUnit) => void }) {
  const [open, setOpen] = useState<boolean>(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const buttonRef = useRef<View | null>(null);
  const units: EveryUnit[] = ['minutes', 'hours', 'days'];
  
  const getUnitLabel = (u: EveryUnit) => {
    return u.charAt(0).toUpperCase() + u.slice(1);
  };
  
  const measureButton = () => {
    try {
      buttonRef.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        setAnchor({ x, y, width, height });
      });
    } catch (e) {
      console.log('measure error', e);
      setAnchor(null);
    }
  };
  
  const handleOpen = () => {
    measureButton();
    setOpen(true);
  };
  
  return (
    <View style={{ position: 'relative', zIndex: 1000 }}>
      <TouchableOpacity
        ref={buttonRef as any}
        style={styles.unitButton}
        onPress={handleOpen}
        testID="every-unit-button"
      >
        <Text style={styles.unitButtonText}>{getUnitLabel(unit)}</Text>
        <ChevronDown size={14} color="#111827" />
      </TouchableOpacity>
      {open && (
        <UnitDropdownModal
          visible={open}
          anchor={anchor}
          unit={unit}
          units={units}
          getUnitLabel={getUnitLabel}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </View>
  );
}

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
  const { width: winW, height: winH } = require('react-native').Dimensions.get('window');
  const estimatedWidth = 140;
  const estimatedHeight = 140;

  // Position dropdown below the button
  const rawTop = (anchor?.y ?? 100) + (anchor?.height ?? 0) + 4;
  const rawLeft = (anchor?.x ?? 0) + ((anchor?.width ?? 0) / 2) - (estimatedWidth / 2);

  // Ensure dropdown stays within screen bounds
  const top = Math.min(Math.max(8, rawTop), winH - estimatedHeight - 8);
  const left = Math.min(Math.max(8, rawLeft), winW - estimatedWidth - 8);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} presentationStyle="overFullScreen" statusBarTranslucent>
      <TouchableOpacity 
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity
          style={[
            styles.unitDropdownModal,
            {
              position: 'absolute',
              top,
              left,
              minWidth: estimatedWidth,
            },
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
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
        </TouchableOpacity>
      </TouchableOpacity>
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
  unitDropdownModal: {
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    paddingVertical: 4,
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

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={monthlyStyles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity style={monthlyStyles.container} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
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
  if (!visible || !selectedDate) return null;

  return (
<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} presentationStyle="overFullScreen" statusBarTranslucent>
      <TouchableOpacity style={monthlyPopupStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={monthlyPopupStyles.container} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={monthlyPopupStyles.header}>
            <AlertTriangle size={24} color="#F59E0B" />
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

function DropdownAnchor({ label, open, onOpen, onToggle, onMeasure }: DropdownAnchorProps) {
  const ref = useRef<View | null>(null);

  const measureNow = () => {
    try {
      ref.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
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
      <CalendarIcon size={16} color="#111827" />
      <Text style={styles.menuButtonText}>{label}</Text>
      <ChevronDown size={16} color="#111827" />
    </TouchableOpacity>
  );
}

interface DropdownModalProps {
  onClose: () => void;
  anchor: AnchorRect | null | undefined;
  onToday: () => void;
  onTomorrow: () => void;
  onCustom: () => void;
  hideTomorrow?: boolean;
}

function DropdownModal({ onClose, anchor, onToday, onTomorrow, onCustom, hideTomorrow = false }: DropdownModalProps) {
  const { width: winW, height: winH } = require('react-native').Dimensions.get('window');
  const estimatedWidth = 220;
  const estimatedHeight = hideTomorrow ? 120 : 180;

  const rawTop = (anchor?.y ?? 100) + (anchor?.height ?? 0) + 6;
  const rawLeft = (anchor?.x ?? 0);

  const top = Math.min(Math.max(8, rawTop), winH - estimatedHeight - 8);
  const left = Math.min(Math.max(8, rawLeft), winW - estimatedWidth - 8);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={dropdownModalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[
            dropdownModalStyles.dropdown,
            {
              top,
              left,
            },
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity
            testID="menu-today"
            style={dropdownModalStyles.itemRow}
            onPress={onToday}
          >
            <View style={dropdownModalStyles.itemLeft}>
              <Clock size={16} color={Material3Colors.light.primary} />
              <Text style={dropdownModalStyles.itemText}>Today</Text>
            </View>
            <ChevronRight size={16} color={Material3Colors.light.onSurfaceVariant} />
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
                  <Clock size={16} color={Material3Colors.light.primary} />
                  <Text style={dropdownModalStyles.itemText}>Tomorrow</Text>
                </View>
                <ChevronRight size={16} color={Material3Colors.light.onSurfaceVariant} />
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
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const dropdownModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: Material3Colors.light.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: Material3Colors.light.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    minWidth: 200,
    borderWidth: 1,
    borderColor: Material3Colors.light.outlineVariant,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'transparent',
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
  },
});