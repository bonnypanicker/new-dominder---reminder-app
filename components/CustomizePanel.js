import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Keyboard as RNKeyboard } from 'react-native';
import { DAYS_OF_WEEK } from '@/constants/reminders';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Material3Colors } from '@/constants/colors';
const CalendarIcon = (props) => _jsx(Feather, { name: "calendar", ...props });
const ChevronRight = (props) => _jsx(Feather, { name: "chevron-right", ...props });
export default function CustomizePanel({ repeatType, repeatDays, onRepeatTypeChange, onRepeatDaysChange, selectedDate, onDateChange, onOpenTime, displayTime, everyValue, everyUnit, onEveryChange, untilType, untilDate, untilCount, untilTime, untilIsAM, onUntilTypeChange, onUntilDateChange, onUntilCountChange, onOpenUntilTime, onDropdownStateChange, scaleFactor = 1, isLandscape = false, 
// New props
multiSelectEnabled, onMultiSelectEnabledChange, multiSelectDates, onMultiSelectDatesChange, multiSelectDays, onMultiSelectDaysChange, onSetTime, windowEndTime, windowEndIsAM, }) {
    const containerRef = useRef(null);
    const dateAnchorRef = useRef(null);
    const unitAnchorRef = useRef(null);
    const untilAnchorRef = useRef(null);
    // Local state for inline dropdowns
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownAnchor, setDropdownAnchor] = useState(null);
    const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
    const [unitDropdownAnchor, setUnitDropdownAnchor] = useState(null);
    const repeatOptions = [
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
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [monthlyCalendarOpen, setMonthlyCalendarOpen] = useState(false);
    const [monthlyDate, setMonthlyDate] = useState(() => {
        const now = new Date();
        return now.getDate();
    });
    const [yearlyCalendarOpen, setYearlyCalendarOpen] = useState(false);
    const [untilCalendarOpen, setUntilCalendarOpen] = useState(false);
    const [untilCountModalOpen, setUntilCountModalOpen] = useState(false);
    const formattedSelectedDate = useMemo(() => {
        try {
            const [y, m, d] = selectedDate.split('-').map(Number);
            const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
        }
        catch {
            return selectedDate;
        }
    }, [selectedDate]);
    const formattedSelectedDateNoYear = useMemo(() => {
        try {
            const [y, m, d] = selectedDate.split('-').map(Number);
            const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[dt.getMonth()]} ${dt.getDate()}`;
        }
        catch {
            return selectedDate;
        }
    }, [selectedDate]);
    const formattedUntilDate = useMemo(() => {
        try {
            if (!untilDate)
                return 'Pick date';
            const [y, m, d] = untilDate.split('-').map(Number);
            const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
        }
        catch {
            return untilDate ?? 'Pick date';
        }
    }, [untilDate]);
    const formattedUntilTime = useMemo(() => {
        if (!untilTime || typeof untilIsAM === 'undefined')
            return '';
        const [hoursStr, minutesStr] = untilTime.split(':');
        const hours = Number(hoursStr);
        const minutes = Number(minutesStr);
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${untilIsAM ? 'AM' : 'PM'}`;
    }, [untilTime, untilIsAM]);
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
    const toggleDay = (day) => {
        if (repeatDays.includes(day)) {
            onRepeatDaysChange(repeatDays.filter(d => d !== day));
        }
        else {
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
    const handleDropdownOpen = (coords) => {
        setDropdownAnchor(coords);
        setDropdownOpen(true);
    };
    const handleUnitDropdownOpen = (coords) => {
        setUnitDropdownAnchor(coords);
        setUnitDropdownOpen(true);
    };
    const [untilDropdownOpen, setUntilDropdownOpen] = useState(false);
    const [untilDropdownAnchor, setUntilDropdownAnchor] = useState(null);
    const handleUntilDropdownOpen = (coords) => {
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
            window.__closeCustomizePanelDropdowns = closeAllDropdowns;
        }
        return () => {
            delete window.__closeCustomizePanelDropdowns;
        };
    }, [closeAllDropdowns, onDropdownStateChange]);
    const units = ['minutes', 'hours', 'days'];
    const getUnitLabel = (unit) => {
        const labels = {
            minutes: 'Minutes',
            hours: 'Hours',
            days: 'Days',
        };
        return labels[unit];
    };
    const getUntilLabel = (u) => {
        const labels = {
            none: 'Never',
            endsAt: 'On date/time',
            count: 'Occurrence',
        };
        return labels[u];
    };
    return (_jsxs(View, { ref: containerRef, style: { flex: 1, position: 'relative', overflow: 'visible' }, children: [_jsxs(ScrollView, { style: styles.container, showsVerticalScrollIndicator: false, keyboardDismissMode: "none", keyboardShouldPersistTaps: "always", nestedScrollEnabled: true, children: [_jsx(View, { style: [styles.repeatOptionsContainer, { marginBottom: 8 * scaleFactor }], children: repeatOptions.map((option) => (_jsx(TouchableOpacity, { style: [
                                styles.repeatOption,
                                repeatType === option.value && styles.repeatOptionSelected,
                                { paddingVertical: 6 * scaleFactor }
                            ], onPress: () => onRepeatTypeChange(option.value), testID: `repeat-${option.value}`, children: _jsx(Text, { style: [
                                    styles.repeatOptionText,
                                    repeatType === option.value && styles.repeatOptionTextSelected,
                                    { fontSize: 12 * scaleFactor }
                                ], numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.8, children: option.label }) }, option.value))) }), (repeatType === 'none' || repeatType === 'every') && (_jsxs(View, { style: [styles.dateSelectionContainer, { marginTop: 12 * scaleFactor, marginBottom: 12 * scaleFactor }, repeatType === 'every' && { marginBottom: 2 * scaleFactor }], children: [_jsxs(View, { style: [styles.topRow, repeatType === 'every' && { marginBottom: 2 * scaleFactor }], children: [_jsx(Text, { style: [styles.topRowLabel, { fontSize: 14 * scaleFactor }], children: repeatType === 'every' ? 'Start' : 'Date' }), _jsx(View, { style: styles.menuWrapper, children: _jsx(DropdownAnchor, { ref: dateAnchorRef, label: `${(repeatType === 'every' && multiSelectEnabled) ? 'Multi' : formattedSelectedDate} • ${displayTime}`, open: dropdownOpen, onOpen: () => { }, onToggle: () => setDropdownOpen(!dropdownOpen), onMeasure: (coords) => coords && handleDropdownOpen(coords) }) })] }), repeatType === 'every' && (_jsxs(View, { style: styles.everyRow, children: [_jsx(Text, { style: styles.everyText, children: "Repeats every" }), _jsx(TextInput, { style: styles.everyInput, keyboardType: "number-pad", maxLength: 2, defaultValue: String((everyValue ?? 1)), onChangeText: (txt) => {
                                            const num = parseInt(txt.replace(/\D/g, '') || '0', 10);
                                            onEveryChange?.(Math.min(99, Math.max(1, num)), everyUnit ?? 'hours');
                                        }, testID: "every-value-input" }), _jsx(UnitDropdownButton, { ref: unitAnchorRef, unit: everyUnit ?? 'hours', onChange: (u) => onEveryChange?.(everyValue ?? 1, u), onOpenDropdown: handleUnitDropdownOpen })] }))] })), repeatType === 'daily' && (_jsxs(View, { style: [styles.daysContainer, { marginTop: 6 * scaleFactor, gap: 2 * scaleFactor }], children: [_jsxs(View, { style: [styles.dailySection, styles.dailyTimeRow], children: [_jsx(Text, { style: [styles.dailySectionLabel, { fontSize: 14 * scaleFactor }], children: "Time" }), _jsx(View, { style: styles.menuWrapper, children: _jsxs(TouchableOpacity, { style: [styles.menuButton, { paddingVertical: 6 * scaleFactor, paddingHorizontal: 12 * scaleFactor }], onPress: () => { onOpenTime?.(); }, testID: "daily-time-button", children: [_jsx(Feather, { name: "clock", size: 16, color: "#111827" }), _jsx(Text, { style: [styles.menuButtonText, { fontSize: 14 * scaleFactor }], children: displayTime }), _jsx(Feather, { name: "chevron-down", size: 16, color: "#111827" })] }) })] }), _jsxs(View, { style: [styles.dailySection, styles.dailyTimeRow], children: [_jsx(Text, { style: [styles.dailySectionLabel, { fontSize: 14 * scaleFactor }], children: "Ends" }), _jsx(View, { style: styles.menuWrapper, children: _jsx(UntilTypeButton, { ref: untilAnchorRef, untilType: (untilType ?? 'none'), getLabel: getUntilLabel, valueLabel: untilValueLabel, onOpenDropdown: handleUntilDropdownOpen }) })] }), _jsxs(View, { style: styles.dailySection, children: [_jsx(Text, { style: [styles.dailySectionLabel, { fontSize: 14 * scaleFactor }], children: "Days" }), _jsx(View, { style: [
                                            styles.daysRow,
                                            { marginHorizontal: 0, paddingHorizontal: 0 },
                                            isLandscape && { justifyContent: 'center' }
                                        ], children: DAYS_OF_WEEK.map((day) => (_jsx(TouchableOpacity, { style: [
                                                styles.dayButtonCompact,
                                                repeatDays.includes(day.value) && styles.dayButtonCompactSelected,
                                                { height: 40 * scaleFactor }, // Fixed height
                                                isLandscape && { flex: 0, width: 40 * scaleFactor, marginHorizontal: 2 } // Fixed width in landscape to prevent stretching
                                            ], onPress: () => toggleDay(day.value), testID: `weekday-${day.value}`, children: _jsx(Text, { style: [
                                                    styles.dayButtonCompactText,
                                                    repeatDays.includes(day.value) && styles.dayButtonCompactTextSelected,
                                                    { fontSize: 14 * scaleFactor }
                                                ], children: day.label }) }, day.value))) })] })] })), repeatType === 'monthly' && (_jsx(View, { style: [styles.dateSelectionContainer, { marginTop: 12 * scaleFactor, marginBottom: 12 * scaleFactor }], children: _jsxs(View, { style: styles.topRow, children: [_jsx(Text, { style: [styles.topRowLabel, { fontSize: 14 * scaleFactor }], children: "Repeats on" }), _jsx(View, { style: styles.menuWrapper, children: _jsxs(TouchableOpacity, { testID: "monthly-open-calendar", style: [styles.menuButton, { paddingVertical: 6 * scaleFactor, paddingHorizontal: 12 * scaleFactor }], onPress: () => { setMonthlyCalendarOpen(true); }, children: [_jsx(MaterialIcons, { name: "calendar-today", size: 16, color: "#111827" }), _jsxs(Text, { style: [styles.menuButtonText, { fontSize: 14 * scaleFactor }], children: ["Day ", monthlyDate, " \u2022 ", displayTime] }), _jsx(Feather, { name: "chevron-down", size: 16, color: "#111827" })] }) })] }) })), repeatType === 'yearly' && (_jsx(View, { style: [styles.dateSelectionContainer, { marginTop: 12 * scaleFactor, marginBottom: 12 * scaleFactor }], children: _jsxs(View, { style: styles.topRow, children: [_jsx(Text, { style: [styles.topRowLabel, { fontSize: 14 * scaleFactor }], children: "Repeats on" }), _jsx(View, { style: styles.menuWrapper, children: _jsxs(TouchableOpacity, { testID: "yearly-open-calendar", style: [styles.menuButton, { paddingVertical: 6 * scaleFactor, paddingHorizontal: 12 * scaleFactor }], onPress: () => { setYearlyCalendarOpen(true); }, children: [_jsx(MaterialIcons, { name: "calendar-today", size: 16, color: "#111827" }), _jsx(Text, { style: [styles.menuButtonText, { fontSize: 14 * scaleFactor }], children: `${formattedSelectedDateNoYear} • ${displayTime}` }), _jsx(Feather, { name: "chevron-down", size: 16, color: "#111827" })] }) })] }) })), repeatType !== 'none' && repeatType !== 'daily' && (_jsx(View, { style: [styles.dateSelectionContainer, { marginTop: 0, marginBottom: 12 * scaleFactor }, repeatType === 'every' && { marginBottom: 2 * scaleFactor }], children: _jsxs(View, { style: styles.topRow, children: [_jsx(Text, { style: [styles.topRowLabel, { fontSize: 14 * scaleFactor }], children: "Ends" }), _jsx(View, { style: styles.menuWrapper, children: _jsx(UntilTypeButton, { ref: untilAnchorRef, untilType: (untilType ?? 'none'), getLabel: getUntilLabel, valueLabel: untilValueLabel, onOpenDropdown: handleUntilDropdownOpen }) })] }) })), _jsx(CalendarModal, { visible: calendarOpen, onClose: () => setCalendarOpen(false), selectedDate: selectedDate, onSelectDate: (date) => {
                            onDateChange(date);
                            // Only close if not multi-selecting
                            if (!multiSelectEnabled) {
                                setCalendarOpen(false);
                                // Keep keyboard as-is on date selection; opening time will handle focus
                                const unit = everyUnit ?? 'hours';
                                const shouldOpenTime = repeatType === 'none' || (repeatType === 'every' && (unit === 'minutes' || unit === 'hours'));
                                if (shouldOpenTime) {
                                    try {
                                        onOpenTime?.();
                                    }
                                    catch (e) {
                                        console.log('open time after calendar date selection error', e);
                                    }
                                }
                            }
                        }, 
                        // Multi-select props - only show for 'every' repeat type
                        multiSelectEnabled: repeatType === 'every' && multiSelectEnabled, onMultiSelectEnabledChange: repeatType === 'every' ? onMultiSelectEnabledChange : undefined, multiSelectDates: multiSelectDates, onMultiSelectDatesChange: onMultiSelectDatesChange, multiSelectDays: multiSelectDays, onMultiSelectDaysChange: onMultiSelectDaysChange, isEndMode: false, onSetTime: () => {
                            setCalendarOpen(false);
                            onSetTime?.(); // Actually main time input
                            // Or if user wants specific button behavior:
                            try {
                                onOpenTime?.();
                            }
                            catch (e) { }
                        } }), _jsx(CalendarModal, { visible: yearlyCalendarOpen, onClose: () => setYearlyCalendarOpen(false), selectedDate: selectedDate, onSelectDate: (date) => {
                            onDateChange(date);
                            setYearlyCalendarOpen(false);
                            // Don't dismiss keyboard when selecting date
                            // Only dismiss when opening time picker
                            try {
                                onOpenTime?.();
                            }
                            catch (e) {
                                console.log('open time after yearly date error', e);
                            }
                        }, hideYear: true }), _jsx(MonthlyDateModal, { visible: monthlyCalendarOpen, onClose: () => setMonthlyCalendarOpen(false), selectedDate: monthlyDate, onSelectDate: (date) => {
                            setMonthlyDate(date);
                            setMonthlyCalendarOpen(false);
                            // Don't dismiss keyboard when selecting date
                            // Only dismiss when opening time picker
                            try {
                                onOpenTime?.();
                            }
                            catch (e) {
                                console.log('open time after monthly day error', e);
                            }
                        } }), _jsx(CalendarModal, { visible: untilCalendarOpen, onClose: () => setUntilCalendarOpen(false), selectedDate: untilDate ?? selectedDate, onSelectDate: (date) => {
                            onUntilDateChange?.(date);
                            setUntilCalendarOpen(false);
                            // Always open time picker when a date is touched (consistent with "Set Time" button)
                            try {
                                onOpenUntilTime?.();
                            }
                            catch (e) {
                                console.log('open time after until date error', e);
                            }
                        }, disablePast: true, 
                        // Pass multi-select dates for visualization only
                        multiSelectEnabled: false, multiSelectDates: multiSelectEnabled ? multiSelectDates : undefined, multiSelectDays: multiSelectEnabled ? multiSelectDays : undefined, isEndMode: true, onSetTime: () => {
                            setUntilCalendarOpen(false);
                            onOpenUntilTime?.();
                        } })] }), _jsx(InlineDropdown, { visible: dropdownOpen, anchor: dropdownAnchor, onClose: () => setDropdownOpen(false), onToday: () => { setToday(); setDropdownOpen(false); }, onTomorrow: () => { setTomorrow(); setDropdownOpen(false); }, onCustom: () => { setCalendarOpen(true); setDropdownOpen(false); }, hideTomorrow: repeatType === 'every', containerRef: containerRef, anchorRef: dateAnchorRef }), _jsx(InlineUnitDropdown, { visible: unitDropdownOpen, anchor: unitDropdownAnchor, unit: everyUnit ?? 'hours', units: units, getUnitLabel: getUnitLabel, onChange: (u) => onEveryChange?.(everyValue ?? 1, u), onClose: () => setUnitDropdownOpen(false), containerRef: containerRef, anchorRef: unitAnchorRef, disabledUnits: multiSelectEnabled ? ['days'] : [] }), _jsx(UntilDropdownModal, { visible: untilDropdownOpen, anchor: untilDropdownAnchor, untilType: (untilType ?? 'none'), options: ["none", "endsAt", "count"], getLabel: getUntilLabel, onChange: (type) => {
                    try {
                        onUntilTypeChange?.(type);
                        if (type === 'endsAt') {
                            setUntilCalendarOpen(true);
                        }
                        else if (type === 'count') {
                            setUntilCountModalOpen(true);
                        }
                    }
                    finally {
                        setUntilDropdownOpen(false);
                    }
                }, onClose: () => setUntilDropdownOpen(false), containerRef: containerRef, anchorRef: untilAnchorRef }), _jsx(UntilCountModal, { visible: untilCountModalOpen, onClose: () => setUntilCountModalOpen(false), countValue: untilCount ?? 1, onSubmit: (newCount) => {
                    try {
                        onUntilCountChange?.(newCount);
                    }
                    finally {
                        setUntilCountModalOpen(false);
                    }
                } })] }));
}
function CalendarModal({ visible, onClose, selectedDate, onSelectDate, hideYear = false, disablePast = true, title, multiSelectEnabled, onMultiSelectEnabledChange, multiSelectDates, onMultiSelectDatesChange, multiSelectDays, onMultiSelectDaysChange, isEndMode, onSetTime }) {
    const [isReady, setIsReady] = useState(false);
    // Safely parse expected YYYY-MM-DD; fallback to today if malformed
    const now = new Date();
    const parts = (selectedDate || '').split('-');
    const py = parts.length > 0 ? parseInt(parts[0], 10) : NaN;
    const pm = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
    const pd = parts.length > 2 ? parseInt(parts[2], 10) : NaN;
    const initialYear = Number.isFinite(py) && py >= 1000 ? py : now.getFullYear();
    const initialMonthZero = Number.isFinite(pm) && pm >= 1 && pm <= 12 ? pm - 1 : now.getMonth();
    const initialDay = Number.isFinite(pd) && pd >= 1 && pd <= 31 ? pd : now.getDate();
    const [month, setMonth] = useState(initialMonthZero);
    const [year, setYear] = useState(initialYear);
    const [selectedDay, setSelectedDay] = useState(() => {
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
    const daysMatrix = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const weeks = [];
        let current = 1 - startWeekday;
        for (let w = 0; w < 6; w++) {
            const row = [];
            for (let i = 0; i < 7; i++) {
                if (current < 1 || current > daysInMonth) {
                    row.push(null);
                }
                else {
                    row.push(current);
                }
                current++;
            }
            weeks.push(row);
        }
        return weeks;
    }, [month, year]);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    // Check if a date is in the past
    const isDateDisabled = (dayVal) => {
        if (dayVal === null)
            return true;
        if (!disablePast)
            return false;
        const checkDate = new Date(year, month, dayVal);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < today;
    };
    // Prevent navigating to past months
    const canGoPrevMonth = () => {
        if (!disablePast)
            return true;
        if (year > currentYear)
            return true;
        if (year === currentYear && month > currentMonth)
            return true;
        return false;
    };
    // Prevent navigating to past years
    const canGoPrevYear = () => {
        if (!disablePast)
            return true;
        return year > currentYear;
    };
    // Reset ready state when modal is closed
    useEffect(() => {
        if (!visible) {
            setIsReady(false);
        }
        else {
            // Use requestAnimationFrame with Android-specific delay
            requestAnimationFrame(() => {
                setTimeout(() => setIsReady(true), Platform.OS === 'android' ? 50 : 0);
            });
        }
    }, [visible]);
    // Early return after all hooks have been called
    if (!visible)
        return null;
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, presentationStyle: "overFullScreen", statusBarTranslucent: true, onShow: () => setIsReady(true), children: _jsx(TouchableOpacity, { style: calendarStyles.overlay, activeOpacity: 1, onPress: onClose, children: _jsxs(TouchableOpacity, { style: [
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
                ], activeOpacity: 1, onPress: (e) => e.stopPropagation(), children: [title && (_jsx(Text, { style: calendarStyles.modalTitle, children: title })), _jsxs(View, { style: calendarStyles.header, children: [!hideYear ? (_jsxs(TouchableOpacity, { onPress: () => canGoPrevYear() && setYear(prev => prev - 1), style: [calendarStyles.navButton, !canGoPrevYear() && calendarStyles.navButtonDisabled], testID: "prev-year", disabled: !canGoPrevYear(), children: [_jsx(Feather, { name: "chevron-left", size: 16, color: canGoPrevYear() ? "#111827" : "#D1D5DB" }), _jsx(Text, { style: [calendarStyles.navText, !canGoPrevYear() && calendarStyles.navTextDisabled], children: "Year" })] })) : (_jsx(View, { style: { width: 76 } })), _jsxs(View, { style: calendarStyles.monthTitle, children: [_jsx(TouchableOpacity, { onPress: () => {
                                            if (canGoPrevMonth()) {
                                                if (month === 0) {
                                                    setMonth(11);
                                                    setYear(prev => prev - 1);
                                                }
                                                else {
                                                    setMonth(prev => prev - 1);
                                                }
                                            }
                                        }, testID: "prev-month", disabled: !canGoPrevMonth(), children: _jsx(Feather, { name: "chevron-left", size: 20, color: canGoPrevMonth() ? "#111827" : "#D1D5DB" }) }), _jsx(Text, { style: calendarStyles.titleText, children: hideYear ? monthNames[month] : `${monthNames[month]} ${year}` }), _jsx(TouchableOpacity, { onPress: () => {
                                            if (month === 11) {
                                                setMonth(0);
                                                setYear(prev => prev + 1);
                                            }
                                            else {
                                                setMonth(prev => prev + 1);
                                            }
                                        }, testID: "next-month", children: _jsx(Feather, { name: "chevron-right", size: 20, color: "#111827" }) })] }), !hideYear ? (_jsxs(TouchableOpacity, { onPress: () => setYear(prev => prev + 1), style: calendarStyles.navButton, testID: "next-year", children: [_jsx(Text, { style: calendarStyles.navText, children: "Year" }), _jsx(Feather, { name: "chevron-right", size: 16, color: "#111827" })] })) : (_jsx(View, { style: { width: 76 } }))] }), _jsx(View, { style: calendarStyles.weekdaysRow, children: weekdays.map((w, index) => {
                            const isActive = multiSelectDays?.includes(index);
                            const hasDatesSelected = multiSelectDates && multiSelectDates.length > 0;
                            const isDisabled = !multiSelectEnabled || isEndMode || hasDatesSelected;
                            return (_jsx(TouchableOpacity, { disabled: isDisabled, style: [
                                    calendarStyles.weekdayCell,
                                    multiSelectEnabled && !isEndMode && !hasDatesSelected && calendarStyles.weekdayCellSelectable,
                                    isActive && calendarStyles.weekdayCellActive
                                ], onPress: () => {
                                    if (multiSelectDays && onMultiSelectDaysChange) {
                                        if (multiSelectDays.includes(index)) {
                                            onMultiSelectDaysChange(multiSelectDays.filter(d => d !== index));
                                        }
                                        else {
                                            // Clear dates when selecting days (mutual exclusivity)
                                            if (onMultiSelectDatesChange) {
                                                onMultiSelectDatesChange([]);
                                            }
                                            onMultiSelectDaysChange([...multiSelectDays, index]);
                                        }
                                    }
                                }, children: _jsx(Text, { style: [
                                        calendarStyles.weekday,
                                        isActive && calendarStyles.weekdayActive,
                                        isDisabled && calendarStyles.weekdayDisabled
                                    ], children: w }) }, index));
                        }) }), daysMatrix.map((row, idx) => (_jsx(View, { style: calendarStyles.weekRow, children: row.map((val, i) => {
                            const currentDateString = val !== null
                                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(val).padStart(2, '0')}`
                                : null;
                            const dateObj = currentDateString ? new Date(year, month, val) : null;
                            const dayDate = dateObj ? new Date(year, month, val) : null;
                            const isDisabled = isDateDisabled(val);
                            // Determine selection state
                            const isSelected = isDateDisabled(val) ? false : (
                            // In multi-select start mode, verify if in array or matches weekday
                            (multiSelectEnabled && !isEndMode && ((currentDateString && multiSelectDates?.includes(currentDateString)) ||
                                (dayDate && multiSelectDays?.includes(dayDate.getDay())))) ||
                                // In End mode, visualize selected dates (read only)
                                (isEndMode && currentDateString && multiSelectDates?.includes(currentDateString)) ||
                                (isEndMode && dayDate && multiSelectDays?.includes(dayDate.getDay())));
                            // Check if this is today (for ring indicator only, not selection)
                            const isToday = val !== null && year === currentYear && month === currentMonth && val === currentDate;
                            // Visual distinction for read-only (End mode)
                            const isReadOnlySelected = isEndMode && ((currentDateString && multiSelectDates?.includes(currentDateString)) ||
                                (dayDate && multiSelectDays?.includes(dayDate.getDay())));
                            // Auto-selected by weekday (for ring indicator)
                            const isAutoSelectedByWeekday = multiSelectEnabled && !isEndMode && dayDate && multiSelectDays?.includes(dayDate.getDay()) && !multiSelectDates?.includes(currentDateString);
                            return (_jsx(TouchableOpacity, { style: [
                                    calendarStyles.dayCell,
                                    isSelected && calendarStyles.dayCellSelected,
                                    isReadOnlySelected && calendarStyles.dayCellReadOnly,
                                    isAutoSelectedByWeekday && calendarStyles.dayCellAutoSelected,
                                    isToday && !isSelected && calendarStyles.dayCellToday,
                                    isDisabled && calendarStyles.dayCellDisabled
                                ], disabled: isDisabled, onPress: () => {
                                    if (val && currentDateString && !isDisabled) {
                                        if (multiSelectEnabled && !isEndMode) {
                                            // Update primary selected date for reference/scrolling?
                                            // Actually, let's toggle in array
                                            if (multiSelectDates && onMultiSelectDatesChange) {
                                                if (multiSelectDates.includes(currentDateString)) {
                                                    onMultiSelectDatesChange(multiSelectDates.filter(d => d !== currentDateString));
                                                }
                                                else {
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
                                        }
                                        else {
                                            // Normal mode or End mode (picking single date)
                                            onSelectDate(currentDateString);
                                        }
                                    }
                                }, testID: `day-${val ?? 'null'}`, children: _jsx(Text, { style: [
                                        calendarStyles.dayText,
                                        isSelected && calendarStyles.dayTextSelected,
                                        isReadOnlySelected && calendarStyles.dayTextReadOnly,
                                        isToday && !isSelected && calendarStyles.dayTextToday,
                                        isDisabled && calendarStyles.dayTextDisabled
                                    ], children: val ?? '' }) }, i));
                        }) }, idx))), (multiSelectEnabled === true || isEndMode) && (_jsxs(View, { style: calendarStyles.footerMultiSelect, children: [!isEndMode && onMultiSelectEnabledChange ? (_jsxs(TouchableOpacity, { style: calendarStyles.multiSelectCheckbox, onPress: () => onMultiSelectEnabledChange(!multiSelectEnabled), children: [_jsx(View, { style: calendarStyles.checkboxChecked, children: _jsx(Feather, { name: "check", size: 14, color: "white" }) }), _jsx(Text, { style: calendarStyles.multiSelectLabel, children: "Multi-select" })] })) : (_jsx(View, {}) // Spacer if End mode or if no callback
                            ), _jsxs(View, { style: calendarStyles.footerButtons, children: [onSetTime && (_jsx(TouchableOpacity, { onPress: onSetTime, style: calendarStyles.footerBtn, children: _jsx(Text, { style: calendarStyles.footerBtnTextPrimary, children: "Set Time" }) })), _jsx(TouchableOpacity, { onPress: onClose, style: calendarStyles.footerBtn, children: _jsx(Text, { style: calendarStyles.footerBtnText, children: "Cancel" }) })] })] })), (multiSelectEnabled === false && !isEndMode && onMultiSelectEnabledChange) && (_jsxs(View, { style: calendarStyles.footerMultiSelect, children: [_jsxs(TouchableOpacity, { style: calendarStyles.multiSelectCheckbox, onPress: () => onMultiSelectEnabledChange(true), children: [_jsx(View, { style: calendarStyles.checkboxUnchecked }), _jsx(Text, { style: calendarStyles.multiSelectLabel, children: "Multi-select" })] }), _jsx(TouchableOpacity, { style: calendarStyles.footerBtn, onPress: onClose, testID: "calendar-cancel", children: _jsx(Text, { style: calendarStyles.footerBtnText, children: "Cancel" }) })] })), multiSelectEnabled === undefined && (_jsx(View, { style: calendarStyles.footer, children: _jsx(TouchableOpacity, { style: calendarStyles.footerBtn, onPress: onClose, testID: "calendar-cancel", children: _jsx(Text, { style: calendarStyles.footerBtnText, children: "Cancel" }) }) }))] }) }) }));
}
const UnitDropdownButton = React.forwardRef(({ unit, onChange, onOpenDropdown }, ref) => {
    const getUnitLabel = (u) => {
        return u.charAt(0).toUpperCase() + u.slice(1);
    };
    const measureButton = () => {
        try {
            ref?.current?.measureInWindow?.((x, y, width, height) => {
                onOpenDropdown({ x, y, width, height });
            });
        }
        catch (e) {
            console.log('measure error', e);
        }
    };
    return (_jsxs(TouchableOpacity, { ref: ref, style: styles.unitButton, onPress: measureButton, testID: "every-unit-button", children: [_jsx(Text, { style: styles.unitButtonText, children: getUnitLabel(unit) }), _jsx(Feather, { name: "chevron-down", size: 14, color: "#111827" })] }));
});
UnitDropdownButton.displayName = 'UnitDropdownButton';
const UntilTypeButton = React.forwardRef(({ untilType, getLabel, valueLabel, onOpenDropdown }, ref) => {
    const measureButton = () => {
        try {
            ref?.current?.measureInWindow?.((x, y, width, height) => {
                onOpenDropdown({ x, y, width, height });
            });
        }
        catch (e) {
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
    return (_jsxs(TouchableOpacity, { ref: ref, style: styles.unitButton, onPress: handlePress, testID: "until-type-button", children: [_jsx(Text, { style: styles.unitButtonText, children: displayText }), _jsx(Feather, { name: "chevron-down", size: 14, color: "#111827" })] }));
});
UntilTypeButton.displayName = 'UntilTypeButton';
function UnitDropdownModal({ visible, anchor, unit, units, getUnitLabel, onChange, onClose }) {
    const [isPositioned, setIsPositioned] = useState(false);
    useEffect(() => {
        if (!visible) {
            setIsPositioned(false);
        }
        else if (anchor) {
            requestAnimationFrame(() => {
                if (Platform.OS === 'android') {
                    setTimeout(() => setIsPositioned(true), 50);
                }
                else {
                    setIsPositioned(true);
                }
            });
        }
    }, [visible, anchor]);
    if (!visible || !anchor)
        return null;
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
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, onShow: () => setIsPositioned(true), children: _jsxs(View, { style: { flex: 1 }, children: [_jsx(TouchableOpacity, { style: styles.unitOverlayAbsolute, activeOpacity: 1, onPress: onClose }), _jsx(View, { style: [
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
                    ], children: units.map(u => (_jsx(TouchableOpacity, { style: [
                            styles.unitDropdownItem,
                            unit === u && styles.unitDropdownItemSelected
                        ], onPress: () => {
                            onChange(u);
                            onClose();
                        }, testID: `unit-${u}`, children: _jsx(Text, { style: [
                                styles.unitDropdownItemText,
                                unit === u && styles.unitDropdownItemTextSelected
                            ], children: getUnitLabel(u) }) }, u))) })] }) }));
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
        paddingVertical: 4,
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
        color: '#374151',
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
        paddingVertical: 4,
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
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
        backgroundColor: '#FFFFFF',
    },
    unitDropdownItemText: {
        fontSize: 14,
        color: Material3Colors.light.onSurface,
        fontWeight: '500',
    },
    unitDropdownItemTextSelected: {
        color: '#111827',
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
        minWidth: 0, // Allow shrinking
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
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        backgroundColor: 'transparent',
    },
    inlineDropdownContent: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 2,
        paddingHorizontal: 2,
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
        color: Material3Colors.light.onSurface,
        fontWeight: '500',
    },
    inlineDropdownDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
        marginVertical: 2,
    },
    inlineUnitDropdownContent: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
        backgroundColor: '#FFFFFF',
    },
    inlineUnitDropdownItemText: {
        fontSize: 14,
        color: Material3Colors.light.onSurface,
        fontWeight: '500',
    },
    inlineUnitDropdownItemTextSelected: {
        color: '#111827',
        fontWeight: '600',
    },
});
function MonthlyDateModal({ visible, onClose, selectedDate, onSelectDate }) {
    const [showMonthlyPopup, setShowMonthlyPopup] = useState(false);
    const [pendingDate, setPendingDate] = useState(null);
    const [touchedDate, setTouchedDate] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const daysGrid = useMemo(() => {
        const days = [];
        for (let i = 1; i <= 31; i++) {
            days.push(i);
        }
        return days;
    }, []);
    const handleDateSelect = (day) => {
        if (day >= 29 && day <= 31) {
            setPendingDate(day);
            setShowMonthlyPopup(true);
        }
        else {
            onSelectDate(day);
        }
    };
    const handleMonthlyOption = (option) => {
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
    if (!visible)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, onShow: () => setIsReady(true), children: _jsx(TouchableOpacity, { style: monthlyStyles.overlay, activeOpacity: 1, onPress: onClose, children: _jsxs(TouchableOpacity, { style: [
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
                        ], activeOpacity: 1, onPress: (e) => e.stopPropagation(), children: [_jsx(Text, { style: monthlyStyles.title, children: "Select Day of Month" }), _jsx(View, { style: monthlyStyles.daysGrid, children: daysGrid.map((day) => {
                                    const isSelected = day === selectedDate;
                                    const isTouched = day === touchedDate;
                                    const today = new Date().getDate();
                                    const isToday = day === today;
                                    return (_jsx(TouchableOpacity, { style: [
                                            monthlyStyles.dayCell,
                                            isSelected && monthlyStyles.dayCellSelected,
                                            isToday && !isSelected && monthlyStyles.dayCellToday,
                                            isTouched && !isSelected && monthlyStyles.dayCellTouched
                                        ], onPressIn: () => setTouchedDate(day), onPressOut: () => setTouchedDate(null), onPress: () => {
                                            setTouchedDate(null);
                                            handleDateSelect(day);
                                        }, testID: `monthly-day-${day}`, children: _jsx(Text, { style: [
                                                monthlyStyles.dayText,
                                                isSelected && monthlyStyles.dayTextSelected,
                                                isToday && !isSelected && monthlyStyles.dayTextToday,
                                                isTouched && !isSelected && monthlyStyles.dayTextTouched
                                            ], children: day }) }, day));
                                }) }), _jsx(View, { style: monthlyStyles.footer, children: _jsx(TouchableOpacity, { style: monthlyStyles.footerBtn, onPress: onClose, testID: "monthly-cancel", children: _jsx(Text, { style: monthlyStyles.footerBtnText, children: "Cancel" }) }) })] }) }) }), _jsx(MonthlyOptionsPopup, { visible: showMonthlyPopup, selectedDate: pendingDate, onClose: () => {
                    setShowMonthlyPopup(false);
                    setPendingDate(null);
                }, onSelectOption: handleMonthlyOption })] }));
}
function MonthlyOptionsPopup({ visible, selectedDate, onClose, onSelectOption }) {
    const [isReady, setIsReady] = useState(false);
    useEffect(() => {
        if (!visible) {
            setIsReady(false);
            return;
        }
        requestAnimationFrame(() => {
            setTimeout(() => setIsReady(true), Platform.OS === 'android' ? 50 : 0);
        });
    }, [visible]);
    if (!visible || !selectedDate)
        return null;
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, presentationStyle: "overFullScreen", statusBarTranslucent: true, onShow: () => setIsReady(true), children: _jsx(TouchableOpacity, { style: monthlyPopupStyles.overlay, activeOpacity: 1, onPress: onClose, children: _jsxs(TouchableOpacity, { style: [
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
                ], activeOpacity: 1, onPress: (e) => e.stopPropagation(), children: [_jsxs(View, { style: monthlyPopupStyles.header, children: [_jsx(Feather, { name: "alert-triangle", size: 24, color: "#F59E0B" }), _jsx(Text, { style: monthlyPopupStyles.title, children: "Monthly Reminder Options" })] }), _jsxs(Text, { style: monthlyPopupStyles.description, children: ["You selected day ", selectedDate, ". Some months don't have this date. How would you like to handle this?"] }), _jsxs(View, { style: monthlyPopupStyles.optionsContainer, children: [_jsxs(TouchableOpacity, { style: monthlyPopupStyles.optionButton, onPress: () => onSelectOption('skip'), testID: "monthly-option-skip", children: [_jsx(Text, { style: monthlyPopupStyles.optionTitle, children: "Only remind if date exists" }), _jsxs(Text, { style: monthlyPopupStyles.optionDescription, children: ["Skip reminder for months that don't have day ", selectedDate] })] }), _jsxs(TouchableOpacity, { style: monthlyPopupStyles.optionButton, onPress: () => onSelectOption('lastDay'), testID: "monthly-option-lastday", children: [_jsx(Text, { style: monthlyPopupStyles.optionTitle, children: "Remind on last day of month" }), _jsxs(Text, { style: monthlyPopupStyles.optionDescription, children: ["If day ", selectedDate, " doesn't exist, remind on the last day of that month"] })] })] }), _jsx(View, { style: monthlyPopupStyles.footer, children: _jsx(TouchableOpacity, { style: monthlyPopupStyles.cancelButton, onPress: onClose, testID: "monthly-popup-cancel", children: _jsx(Text, { style: monthlyPopupStyles.cancelButtonText, children: "Cancel" }) }) })] }) }) }));
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
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
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
    weekdayCell: {
        width: 36,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekdayCellSelectable: {
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
    },
    weekdayCellActive: {
        backgroundColor: '#4F46E5',
        borderRadius: 6,
    },
    weekday: {
        width: 36,
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
    },
    weekdayActive: {
        color: 'white',
        fontWeight: '700',
    },
    weekdayDisabled: {
        color: '#D1D5DB',
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
        backgroundColor: '#1E3A8A',
    },
    dayCellReadOnly: {
        backgroundColor: '#E0E7FF',
    },
    dayCellAutoSelected: {
        borderWidth: 2,
        borderColor: '#1E40AF',
    },
    dayCellToday: {
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
    dayTextReadOnly: {
        color: '#1E3A8A',
    },
    dayTextToday: {
        color: '#4F46E5',
        fontWeight: '700',
    },
    dayTextDisabled: {
        color: '#D1D5DB',
    },
    footerMultiSelect: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
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
        borderColor: '#4F46E5',
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxUnchecked: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        backgroundColor: 'white',
    },
    multiSelectLabel: {
        fontSize: 14,
        color: '#111827',
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
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
    footerBtnTextPrimary: {
        color: '#4F46E5',
        fontSize: 14,
        fontWeight: '600',
    },
});
const DropdownAnchor = React.forwardRef(({ label, open, onOpen, onToggle, onMeasure }, ref) => {
    const measureNow = () => {
        try {
            ref?.current?.measureInWindow?.((x, y, width, height) => {
                onMeasure({ x, y, width, height });
            });
        }
        catch (e) {
            console.log('measure error', e);
            onMeasure(null);
        }
    };
    return (_jsxs(TouchableOpacity, { ref: ref, testID: "date-menu-button", style: styles.menuButton, onPress: () => {
            if (!open)
                measureNow();
            onToggle();
        }, onLayout: () => {
            if (open)
                measureNow();
        }, children: [_jsx(MaterialIcons, { name: "calendar-today", size: 16, color: "#111827" }), _jsx(Text, { style: styles.menuButtonText, children: label }), _jsx(Feather, { name: "chevron-down", size: 16, color: "#111827" })] }));
});
DropdownAnchor.displayName = 'DropdownAnchor';
function InlineDropdown({ visible, onClose, anchor, onToday, onTomorrow, onCustom, hideTomorrow = false, containerRef, anchorRef }) {
    // Calculate dropdown dimensions
    const dropdownWidth = 220;
    const dropdownHeight = hideTomorrow ? 120 : 180;
    // State for opacity control to prevent flashing
    const [isPositioned, setIsPositioned] = React.useState(false);
    // Measure container to bound positioning within it
    const [containerOffset, setContainerOffset] = React.useState(null);
    React.useEffect(() => {
        try {
            containerRef?.current?.measureInWindow?.((x, y, width, height) => {
                setContainerOffset({ x, y, width, height });
            });
        }
        catch { }
    }, [visible, containerRef]);
    const containerX = containerOffset?.x ?? 0;
    const containerY = containerOffset?.y ?? 0;
    const containerW = containerOffset?.width ?? 300;
    const { width: winW, height: winH } = require('react-native').Dimensions.get('window');
    const isPortrait = winH >= winW;
    const rightMarginPortrait = 12;
    // Compute anchor-relative position using ref when available; fallback to provided anchor rect
    const [computedPos, setComputedPos] = React.useState(null);
    React.useEffect(() => {
        if (!visible) {
            setIsPositioned(false);
            return;
        }
        let cancelled = false;
        const fallbackFromAnchorRect = () => {
            if (!anchor || typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
                typeof anchor.width !== 'number' || typeof anchor.height !== 'number')
                return;
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
                        if (!cancelled)
                            setIsPositioned(true);
                    }, Platform.OS === 'android' ? 50 : 0);
                });
            }
        };
        if (anchorRef?.current && containerRef?.current && anchorRef.current.measureLayout) {
            try {
                anchorRef.current.measureLayout(containerRef.current, (left, top, width, height) => {
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
                                if (!cancelled)
                                    setIsPositioned(true);
                            }, Platform.OS === 'android' ? 50 : 0);
                        });
                    }
                }, () => fallbackFromAnchorRect());
            }
            catch {
                fallbackFromAnchorRect();
            }
        }
        else {
            fallbackFromAnchorRect();
        }
        return () => { cancelled = true; };
    }, [visible, anchorRef, containerRef, containerX, containerY, containerW, anchor, hideTomorrow]);
    const top = computedPos?.top ?? (anchor && typeof anchor.y === 'number' && typeof anchor.height === 'number' ? Math.max(4, (anchor.y - containerY) + anchor.height + 4) : 4);
    const left = computedPos?.left ?? (anchor && typeof anchor.x === 'number' && typeof anchor.width === 'number' ? Math.max(4, Math.min((anchor.x - containerX) + anchor.width - dropdownWidth, containerW - dropdownWidth - 4)) : containerW - dropdownWidth - 4);
    // Early return after all hooks have been called
    if (!visible || (!anchorRef && !anchor))
        return null;
    return (_jsxs(_Fragment, { children: [_jsx(TouchableOpacity, { style: [
                    styles.inlineDropdownOverlay,
                    { zIndex: 999998 }
                ], activeOpacity: 1, onPress: onClose }), _jsxs(View, { style: [
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
                ], children: [_jsxs(TouchableOpacity, { testID: "menu-today", style: styles.inlineDropdownItem, onPress: onToday, children: [_jsxs(View, { style: styles.inlineDropdownItemLeft, children: [_jsx(Feather, { name: "clock", size: 16, color: "#111827" }), _jsx(Text, { style: styles.inlineDropdownItemText, children: "Today" })] }), _jsx(Feather, { name: "chevron-right", size: 16, color: "#6B7280" })] }), !hideTomorrow && (_jsxs(_Fragment, { children: [_jsx(View, { style: styles.inlineDropdownDivider }), _jsxs(TouchableOpacity, { testID: "menu-tomorrow", style: styles.inlineDropdownItem, onPress: onTomorrow, children: [_jsxs(View, { style: styles.inlineDropdownItemLeft, children: [_jsx(Feather, { name: "clock", size: 16, color: "#111827" }), _jsx(Text, { style: styles.inlineDropdownItemText, children: "Tomorrow" })] }), _jsx(Feather, { name: "chevron-right", size: 16, color: "#6B7280" })] })] })), _jsx(View, { style: styles.inlineDropdownDivider }), _jsxs(TouchableOpacity, { testID: "menu-custom", style: styles.inlineDropdownItem, onPress: onCustom, children: [_jsxs(View, { style: styles.inlineDropdownItemLeft, children: [_jsx(MaterialIcons, { name: "calendar-today", size: 16, color: "#111827" }), _jsx(Text, { style: styles.inlineDropdownItemText, children: "Custom date\u2026" })] }), _jsx(Feather, { name: "chevron-right", size: 16, color: "#6B7280" })] })] })] }));
}
function InlineUnitDropdown({ visible, anchor, unit, units, getUnitLabel, onChange, onClose, containerRef, anchorRef, disabledUnits = [] }) {
    // Calculate dropdown dimensions
    const dropdownWidth = 140;
    const itemHeight = 44;
    const dropdownHeight = units.length * itemHeight + 16;
    // Add positioning state for opacity control
    const [isPositioned, setIsPositioned] = React.useState(false);
    // Measure container position to convert anchor coordinates
    const [containerOffset, setContainerOffset] = React.useState(null);
    React.useEffect(() => {
        try {
            containerRef?.current?.measureInWindow?.((x, y, width, height) => {
                setContainerOffset({ x, y, width, height });
            });
        }
        catch { }
    }, [visible, containerRef]);
    const containerX = containerOffset?.x ?? 0;
    const containerY = containerOffset?.y ?? 0;
    const containerW = containerOffset?.width ?? 300;
    // Compute anchor-relative position using ref when available; fallback to provided anchor rect
    const [computedPos, setComputedPos] = React.useState(null);
    React.useEffect(() => {
        if (!visible) {
            setIsPositioned(false);
            return;
        }
        let cancelled = false;
        const fallbackFromAnchorRect = () => {
            if (!anchor || typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
                typeof anchor.width !== 'number' || typeof anchor.height !== 'number')
                return;
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
        if (anchorRef?.current && containerRef?.current && anchorRef.current.measureLayout) {
            try {
                anchorRef.current.measureLayout(containerRef.current, (left, top, width, height) => {
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
                }, () => fallbackFromAnchorRect());
            }
            catch {
                fallbackFromAnchorRect();
            }
        }
        else {
            fallbackFromAnchorRect();
        }
        return () => { cancelled = true; };
    }, [visible, anchorRef, containerRef, anchor, containerOffset, containerX, containerY, containerW]);
    const top = computedPos?.top ?? (anchor && typeof anchor.y === 'number' && typeof anchor.height === 'number' ? Math.max(4, (anchor.y - containerY) + anchor.height + 4) : 4);
    const left = computedPos?.left ?? (anchor && typeof anchor.x === 'number' && typeof anchor.width === 'number' ? Math.max(4, Math.min((anchor.x - containerX) + anchor.width - dropdownWidth, containerW - dropdownWidth - 4)) : containerW - dropdownWidth - 4);
    // Early return after all hooks have been called
    if (!visible || !anchor)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx(TouchableOpacity, { style: [
                    styles.inlineDropdownOverlay,
                    { zIndex: 999998 }
                ], activeOpacity: 1, onPress: onClose }), _jsx(View, { style: [
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
                ], children: units.map(u => {
                    const isDisabled = disabledUnits.includes(u);
                    return (_jsx(TouchableOpacity, { style: [
                            styles.inlineUnitDropdownItem,
                            unit === u && styles.inlineUnitDropdownItemSelected,
                            isDisabled && { opacity: 0.5 }
                        ], onPress: () => {
                            if (isDisabled)
                                return;
                            onChange(u);
                            onClose();
                        }, testID: `unit-${u}`, disabled: isDisabled, children: _jsx(Text, { style: [
                                styles.inlineUnitDropdownItemText,
                                unit === u && styles.inlineUnitDropdownItemTextSelected
                            ], children: getUnitLabel(u) }) }, u));
                }) })] }));
}
function UntilDropdownModal({ visible, anchor, untilType, options, getLabel, onChange, onClose, containerRef, anchorRef }) {
    const dropdownWidth = 180;
    const itemHeight = 44;
    const dropdownHeight = options.length * itemHeight + 12;
    const [isPositioned, setIsPositioned] = React.useState(false);
    const [containerOffset, setContainerOffset] = React.useState(null);
    React.useEffect(() => {
        try {
            containerRef?.current?.measureInWindow?.((x, y, width, height) => {
                setContainerOffset({ x, y, width, height });
            });
        }
        catch { }
    }, [visible, containerRef]);
    const containerX = containerOffset?.x ?? 0;
    const containerY = containerOffset?.y ?? 0;
    const containerW = containerOffset?.width ?? 300;
    const [computedPos, setComputedPos] = React.useState(null);
    React.useEffect(() => {
        if (!visible) {
            setIsPositioned(false);
            return;
        }
        let cancelled = false;
        const fallbackFromAnchorRect = () => {
            if (!anchor || typeof anchor.y !== 'number' || typeof anchor.x !== 'number' ||
                typeof anchor.width !== 'number' || typeof anchor.height !== 'number')
                return;
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
                        if (!cancelled)
                            setIsPositioned(true);
                    }, Platform.OS === 'android' ? 50 : 0);
                });
            }
        };
        if (anchorRef?.current && containerRef?.current && anchorRef.current.measureLayout) {
            try {
                anchorRef.current.measureLayout(containerRef.current, (left, top, width, height) => {
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
                                if (!cancelled)
                                    setIsPositioned(true);
                            }, Platform.OS === 'android' ? 50 : 0);
                        });
                    }
                }, () => fallbackFromAnchorRect());
            }
            catch {
                fallbackFromAnchorRect();
            }
        }
        else {
            fallbackFromAnchorRect();
        }
        return () => { cancelled = true; };
    }, [visible, anchorRef, containerRef, containerX, containerY, containerW, anchor]);
    const top = computedPos?.top ?? (anchor && typeof anchor.y === 'number' && typeof anchor.height === 'number' ? Math.max(4, (anchor.y - containerY) + anchor.height + 4) : 4);
    const left = computedPos?.left ?? (anchor && typeof anchor.x === 'number' && typeof anchor.width === 'number' ? Math.max(4, Math.min((anchor.x - containerX) + anchor.width - dropdownWidth, containerW - dropdownWidth - 4)) : containerW - dropdownWidth - 4);
    if (!visible || (!anchorRef && !anchor))
        return null;
    return (_jsxs(_Fragment, { children: [_jsx(TouchableOpacity, { style: [styles.inlineDropdownOverlay, { zIndex: 999998 }], activeOpacity: 1, onPress: onClose }), _jsx(View, { style: [
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
                ], children: options.map((opt) => {
                    const selected = opt === untilType;
                    return (_jsx(TouchableOpacity, { style: [styles.inlineUnitDropdownItem, selected && styles.inlineUnitDropdownItemSelected], onPress: () => onChange(opt), children: _jsx(Text, { style: [styles.inlineUnitDropdownItemText, selected && styles.inlineUnitDropdownItemTextSelected], children: getLabel(opt) }) }, opt));
                }) })] }));
}
function UntilCountModal({ visible, onClose, countValue, onSubmit }) {
    const [temp, setTemp] = useState(String(countValue));
    useEffect(() => {
        if (visible)
            setTemp(String(countValue));
    }, [visible, countValue]);
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, children: _jsx(View, { style: [dropdownModalStyles.overlayAbsolute, { justifyContent: 'center', alignItems: 'center' }], children: _jsxs(TouchableOpacity, { activeOpacity: 1, style: {
                    width: 260,
                    backgroundColor: Material3Colors.light.surfaceContainerLow,
                    borderRadius: 16,
                    padding: 12,
                    shadowColor: Material3Colors.light.shadow,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.24,
                    shadowRadius: 20,
                    elevation: 24,
                }, onPress: () => { }, children: [_jsx(Text, { style: [styles.everyText, { marginBottom: 8 }], children: "Occurrences" }), _jsx(TextInput, { style: [styles.everyInput, { textAlign: 'center' }], keyboardType: "number-pad", maxLength: 3, value: temp, onChangeText: (txt) => {
                            // Allow clearing while editing; clamp only on submit
                            const sanitized = txt.replace(/\D/g, '');
                            setTemp(sanitized);
                        }, testID: "until-count-modal-input" }), _jsxs(View, { style: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }, children: [_jsx(TouchableOpacity, { style: calendarStyles.footerBtn, onPress: onClose, testID: "until-count-cancel", children: _jsx(Text, { style: calendarStyles.footerBtnText, children: "Cancel" }) }), _jsx(TouchableOpacity, { style: [calendarStyles.footerBtn, { marginLeft: 8 }], onPress: () => {
                                    const val = parseInt(temp || '0', 10);
                                    onSubmit(Math.min(999, Math.max(1, val)));
                                }, testID: "until-count-done", children: _jsx(Text, { style: calendarStyles.footerBtnText, children: "Done" }) })] })] }) }) }));
}
function DropdownModal({ visible, onClose, anchor, onToday, onTomorrow, onCustom, hideTomorrow = false }) {
    const [layout, setLayout] = React.useState(null);
    // Early return after all hooks have been called
    if (!visible || !anchor)
        return null;
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
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, children: _jsxs(View, { style: { flex: 1 }, children: [_jsx(TouchableOpacity, { style: dropdownModalStyles.overlayAbsolute, activeOpacity: 1, onPress: onClose }), _jsxs(View, { style: [
                        dropdownModalStyles.dropdownAbsolute,
                        {
                            top: finalTop,
                            left,
                            width: dropdownWidth,
                        },
                    ], onLayout: (e) => {
                        const { width, height } = e.nativeEvent.layout;
                        setLayout({ width, height });
                    }, children: [_jsxs(TouchableOpacity, { testID: "menu-today", style: dropdownModalStyles.itemRow, onPress: onToday, children: [_jsxs(View, { style: dropdownModalStyles.itemLeft, children: [_jsx(Feather, { name: "clock", size: 16, color: Material3Colors.light.primary }), _jsx(Text, { style: dropdownModalStyles.itemText, children: "Today" })] }), _jsx(Feather, { name: "chevron-right", size: 16, color: Material3Colors.light.onSurfaceVariant })] }), !hideTomorrow && (_jsxs(_Fragment, { children: [_jsx(View, { style: dropdownModalStyles.divider }), _jsxs(TouchableOpacity, { testID: "menu-tomorrow", style: dropdownModalStyles.itemRow, onPress: onTomorrow, children: [_jsxs(View, { style: dropdownModalStyles.itemLeft, children: [_jsx(Feather, { name: "clock", size: 16, color: Material3Colors.light.primary }), _jsx(Text, { style: dropdownModalStyles.itemText, children: "Tomorrow" })] }), _jsx(Feather, { name: "chevron-right", size: 16, color: Material3Colors.light.onSurfaceVariant })] })] })), _jsx(View, { style: dropdownModalStyles.divider }), _jsxs(TouchableOpacity, { testID: "menu-custom", style: dropdownModalStyles.itemRow, onPress: onCustom, children: [_jsxs(View, { style: dropdownModalStyles.itemLeft, children: [_jsx(CalendarIcon, { size: 16, color: Material3Colors.light.primary }), _jsx(Text, { style: dropdownModalStyles.itemText, children: "Custom date\u2026" })] }), _jsx(ChevronRight, { size: 16, color: Material3Colors.light.onSurfaceVariant })] })] })] }) }));
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
export { DropdownModal, UnitDropdownModal, InlineDropdown, InlineUnitDropdown, CalendarModal };
