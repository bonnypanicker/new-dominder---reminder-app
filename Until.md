
## Overview
Add an \"Until\" option to repeating reminders that allows users to specify when a repeating reminder should stop. This feature adds three options:
- **None** (default): Reminder repeats indefinitely
- **Ends at**: Reminder stops after a specific date and time
- **Count**: Reminder stops after a specific number of occurrences

## UI/UX Requirements
- Show ONLY for repeating reminders (daily, weekly, monthly, yearly, every)
- Place in popup border area, left side of Cancel/Create buttons
- Must NOT increase popup window size
- Must NOT require scrolling
- Compact horizontal layout (~44px height)
- Match existing Material3 design system

---

## Step 1: Update Type Definitions

### File: `types/reminder.ts`

**Add these new fields to the `Reminder` interface (after line 32):**

```typescript
export interface Reminder {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string;
  priority: Priority;
  isActive: boolean;
  isPaused?: boolean;
  repeatType: RepeatType;
  repeatDays?: number[];
  customDates?: string[];
  monthlyDay?: number;
  everyInterval?: { value: number; unit: EveryUnit };
  isCompleted: boolean;
  isExpired?: boolean;
  snoozeUntil?: string;
  createdAt: string;
  lastTriggeredAt?: string;
  nextReminderDate?: string;
  notificationId?: string;
  ringerSound?: string;
  
  // ✅ ADD THESE NEW FIELDS:
  untilType?: 'none' | 'endsAt' | 'count';  // How the reminder should end
  untilDate?: string;                         // ISO date-time string for 'endsAt' option
  untilCount?: number;                        // Total occurrences for 'count' option
  occurrenceCount?: number;                   // Current occurrence count (tracked)
  
  // Internal flags to prevent infinite loops
  snoozeClearing?: boolean;
  notificationUpdating?: boolean;
  wasSnoozed?: boolean;
}
```

---

## Step 2: Update CustomizePanel Component

### File: `components/CustomizePanel.tsx`

**A. Add new props to interface (around line 12-24):**

```typescript
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
  
  // ✅ ADD THESE NEW PROPS:
  untilType?: 'none' | 'endsAt' | 'count';
  untilDate?: string;
  untilCount?: number;
  onUntilTypeChange?: (type: 'none' | 'endsAt' | 'count') => void;
  onUntilDateChange?: (date: string) => void;
  onUntilCountChange?: (count: number) => void;
  onOpenUntilTime?: () => void;
}
```

**B. Update function signature (around line 26-38):**

```typescript
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
  // ✅ ADD THESE:
  untilType = 'none',
  untilDate,
  untilCount = 1,
  onUntilTypeChange,
  onUntilDateChange,
  onUntilCountChange,
  onOpenUntilTime,
}: CustomizePanelProps) {
```

**C. Add state for Until dropdowns and calendar (after line 46):**

```typescript
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitDropdownAnchor, setUnitDropdownAnchor] = useState<AnchorRect | null>(null);
  
  // ✅ ADD THESE STATES:
  const [untilDropdownOpen, setUntilDropdownOpen] = useState(false);
  const [untilDropdownAnchor, setUntilDropdownAnchor] = useState<AnchorRect | null>(null);
  const [untilCalendarOpen, setUntilCalendarOpen] = useState(false);
  const untilAnchorRef = useRef<View>(null);
  
  const repeatOptions: { value: RepeatType; label: string }[] = [
```

**D. Add Until section UI (insert after line 307, before the closing ScrollView at line 361):**

```typescript
      )}

      {/* ✅ ADD \"UNTIL\" SECTION HERE - Only show for repeating reminders */}
      {repeatType !== 'none' && (
        <View style={styles.untilSection}>
          <Text style={styles.untilLabel}>Until</Text>
          <View style={styles.untilControls}>
            {/* Until Type Dropdown */}
            <TouchableOpacity
              ref={untilAnchorRef as any}
              style={styles.untilTypeButton}
              onPress={() => {
                try {
                  (untilAnchorRef as any)?.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
                    setUntilDropdownAnchor({ x, y, width, height });
                    setUntilDropdownOpen(true);
                  });
                } catch (e) {
                  console.log('measure error', e);
                }
              }}
              testID=\"until-type-button\"
            >
              <Text style={styles.untilTypeButtonText}>
                {untilType === 'none' ? 'None' : untilType === 'endsAt' ? 'Ends at' : 'Count'}
              </Text>
              <Feather name=\"chevron-down\" size={14} color=\"#111827\" />
            </TouchableOpacity>

            {/* Show date picker when \"Ends at\" is selected */}
            {untilType === 'endsAt' && (
              <TouchableOpacity
                style={styles.untilDateButton}
                onPress={() => setUntilCalendarOpen(true)}
                testID=\"until-date-button\"
              >
                <MaterialIcons name=\"calendar-today\" size={14} color=\"#111827\" />
                <Text style={styles.untilDateText}>
                  {untilDate ? (() => {
                    const date = new Date(untilDate);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                  })() : 'Select date'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Show count input when \"Count\" is selected */}
            {untilType === 'count' && (
              <TextInput
                style={styles.untilCountInput}
                keyboardType=\"number-pad\"
                maxLength={3}
                value={String(untilCount ?? 1)}
                onChangeText={(txt) => {
                  const num = parseInt(txt.replace(/\D/g, '') || '1', 10);
                  onUntilCountChange?.(Math.min(999, Math.max(1, num)));
                }}
                testID=\"until-count-input\"
              />
            )}
          </View>
        </View>
      )}

      <CalendarModal
```

**E. Add Until Type Dropdown Modal (before the last closing View tag at line ~388):**

```typescript
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

      {/* ✅ ADD UNTIL TYPE DROPDOWN */}
      <UntilTypeDropdown
        visible={untilDropdownOpen}
        anchor={untilDropdownAnchor}
        untilType={untilType}
        onSelect={(type) => {
          onUntilTypeChange?.(type);
          setUntilDropdownOpen(false);
        }}
        onClose={() => setUntilDropdownOpen(false)}
      />

      {/* ✅ ADD UNTIL CALENDAR MODAL */}
      <CalendarModal
        visible={untilCalendarOpen}
        onClose={() => setUntilCalendarOpen(false)}
        selectedDate={untilDate || selectedDate}
        onSelectDate={(date) => {
          onUntilDateChange?.(date);
          setUntilCalendarOpen(false);
          onOpenUntilTime?.();
        }}
      />

    </View>
  );
}
```

**F. Add new styles (add to styles object around line 1146):**

```typescript
  inlineUnitDropdownItemTextSelected: {
    color: Material3Colors.light.primary,
    fontWeight: '600',
  },
  // ✅ ADD THESE NEW STYLES:
  untilSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  untilLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  untilControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  untilTypeButton: {
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
  untilTypeButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '500',
  },
  untilDateButton: {
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
  untilDateText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '500',
  },
  untilCountInput: {
    width: 50,
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
    fontSize: 14,
  },
});
```

**G. Add UntilTypeDropdown component (add before the last export around line 2115):**

```typescript
// ✅ ADD THIS NEW COMPONENT
interface UntilTypeDropdownProps {
  visible: boolean;
  anchor: AnchorRect | null;
  untilType: 'none' | 'endsAt' | 'count';
  onSelect: (type: 'none' | 'endsAt' | 'count') => void;
  onClose: () => void;
}

function UntilTypeDropdown({ visible, anchor, untilType, onSelect, onClose }: UntilTypeDropdownProps) {
  const [isPositioned, setIsPositioned] = useState(false);
  const options: Array<{ value: 'none' | 'endsAt' | 'count'; label: string }> = [
    { value: 'none', label: 'None' },
    { value: 'endsAt', label: 'Ends at' },
    { value: 'count', label: 'Count' },
  ];

  useEffect(() => {
    if (!visible) {
      setIsPositioned(false);
    } else if (anchor) {
      requestAnimationFrame(() => {
        setTimeout(() => setIsPositioned(true), Platform.OS === 'android' ? 50 : 0);
      });
    }
  }, [visible, anchor]);

  if (!visible || !anchor) return null;

  const { width: winW, height: winH } = require('react-native').Dimensions.get('window');
  const dropdownWidth = 140;
  const itemHeight = 44;
  const dropdownHeight = options.length * itemHeight + 16;

  const preferredTop = anchor.y + anchor.height + 8;
  const preferredLeft = anchor.x + (anchor.width / 2) - (dropdownWidth / 2);
  const top = Math.max(16, Math.min(preferredTop, winH - dropdownHeight - 16));
  const left = Math.max(16, Math.min(preferredLeft, winW - dropdownWidth - 16));

  return (
    <Modal
      visible={visible}
      transparent
      animationType=\"fade\"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity 
          style={styles.unitOverlayAbsolute} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View
          style={[
            styles.unitDropdownModalAbsolute,
            {
              top,
              left,
              width: dropdownWidth,
              opacity: isPositioned ? 1 : 0,
              ...(Platform.OS === 'android' && {
                elevation: 24,
                transform: [{ translateX: 0 }],
              }),
            },
          ]}
        >
          {options.map(opt => (
            <TouchableOpacity 
              key={opt.value} 
              style={[
                styles.unitDropdownItem,
                untilType === opt.value && styles.unitDropdownItemSelected
              ]} 
              onPress={() => onSelect(opt.value)}
              testID={`until-type-${opt.value}`}
            >
              <Text style={[
                styles.unitDropdownItemText,
                untilType === opt.value && styles.unitDropdownItemTextSelected
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

interface DropdownModalProps {
```

---

## Step 3: Update Main App Component

### File: `app/index.tsx`

**A. Add state variables (after line 125):**

```typescript
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // ✅ ADD THESE NEW STATES:
  const [untilType, setUntilType] = useState<'none' | 'endsAt' | 'count'>('none');
  const [untilDate, setUntilDate] = useState<string>('');
  const [untilCount, setUntilCount] = useState<number>(1);
  const [showUntilTimeSelector, setShowUntilTimeSelector] = useState<boolean>(false);
  const [selectedUntilTime, setSelectedUntilTime] = useState<string>('11:59');
  const [isUntilAM, setIsUntilAM] = useState<boolean>(false); // Default to PM

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
```

**B. Update openEdit callback (around line 332-346):**

```typescript
  const openEdit = useCallback((reminder: Reminder) => {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setPriority(reminder.priority);
    setRepeatType(reminder.repeatType);
    setRepeatDays(reminder.repeatDays ?? []);
    setEveryValue(reminder.everyInterval?.value ?? 1);
    setEveryUnit(reminder.everyInterval?.unit ?? 'hours');
    setSelectedDate(reminder.date);

    // ✅ ADD UNTIL FIELDS:
    setUntilType(reminder.untilType ?? 'none');
    setUntilDate(reminder.untilDate ?? '');
    setUntilCount(reminder.untilCount ?? 1);

    const { hh, mm, isAM } = to12h(reminder.time);
    setSelectedTime(`${hh}:${mm}`);
    setIsAM(isAM);
    setShowCreatePopup(true);
  }, [to12h]);
```

**C. Update FAB create button handler (around line 1064-1083):**

```typescript
            onPress={() => {
              setEditingReminder(null);
              setTitle('');
              const defaultPriority = settings?.defaultPriority ?? 'standard';
              const mappedPriority: Priority = defaultPriority === 'standard' ? 'medium' : defaultPriority === 'silent' ? 'low' : 'high';
              setPriority(mappedPriority);
              setRepeatType(settings?.defaultReminderMode ?? 'none');
              setRepeatDays([]);
              setEveryValue(1);
              setEveryUnit('hours');
              
              // ✅ ADD UNTIL RESETS:
              setUntilType('none');
              setUntilDate('');
              setUntilCount(1);
              
              const defaultTime = calculateDefaultTime();
              setSelectedTime(defaultTime.time);
              setIsAM(defaultTime.isAM);
              const now = new Date();
              const yyyy = now.getFullYear();
              const mm = String(now.getMonth() + 1).padStart(2, '0');
              const dd = String(now.getDate()).padStart(2, '0');
              setSelectedDate(`${yyyy}-${mm}-${dd}`);
              setShowCreatePopup(true);
            }}
```

**D. Update CreateReminderPopup props (around line 1091-1104):**

```typescript
      <CreateReminderPopup
        visible={showCreatePopup}
        onClose={() => setShowCreatePopup(false)}
        title={title}
        onTitleChange={setTitle}
        selectedTime={selectedTime}
        isAM={isAM}
        priority={priority}
        onPriorityChange={setPriority}
        showCustomize={false}
        onShowCustomizeChange={() => {}}
        repeatType={repeatType}
        onRepeatTypeChange={setRepeatType}
        repeatDays={repeatDays}
        onRepeatDaysChange={setRepeatDays}
        everyValue={everyValue}
        everyUnit={everyUnit}
        onEveryChange={(value, unit) => {
          setEveryValue(value);
          setEveryUnit(unit);
        }}
        
        // ✅ ADD UNTIL PROPS:
        untilType={untilType}
        untilDate={untilDate}
        untilCount={untilCount}
        onUntilTypeChange={(type) => {
          setUntilType(type);
          // Reset date/count when changing type
          if (type === 'endsAt' && !untilDate) {
            // Set default to 1 month from now
            const oneMonthLater = new Date();
            oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
            const yyyy = oneMonthLater.getFullYear();
            const mm = String(oneMonthLater.getMonth() + 1).padStart(2, '0');
            const dd = String(oneMonthLater.getDate()).padStart(2, '0');
            setUntilDate(`${yyyy}-${mm}-${dd}`);
          }
        }}
        onUntilDateChange={setUntilDate}
        onUntilCountChange={setUntilCount}
        onOpenUntilTime={() => setShowUntilTimeSelector(true)}
        
        onTimeSelect={() => setShowTimeSelector(true)}
        onTimeChange={(time, ampm) => {
          setSelectedTime(time);
          setIsAM(ampm);
        }}
        showTimeSelector={showTimeSelector}
        onCloseTimeSelector={() => setShowTimeSelector(false)}
        onShowToast={showToast}
        onConfirm={() => {
```

**E. Add validation for Until in onConfirm (around line 1120-1150):**

```typescript
        onConfirm={() => {
          if (!title.trim()) {
            showToast('Please enter your reminder', 'error');
            return;
          }

          // ✅ ADD UNTIL VALIDATION:
          if (repeatType !== 'none' && untilType === 'endsAt') {
            if (!untilDate) {
              showToast('Please select an end date', 'error');
              return;
            }
            // Validate that until date is after start date
            const startDateTime = new Date(selectedDate);
            const endDateTime = new Date(untilDate);
            if (endDateTime <= startDateTime) {
              showToast('End date must be after start date', 'error');
              return;
            }
          }

          if (repeatType !== 'none' && untilType === 'count') {
            if (!untilCount || untilCount < 1) {
              showToast('Count must be at least 1', 'error');
              return;
            }
          }

          const [timeHours, timeMinutes] = selectedTime.split(':').map(Number);
```

**F. Update reminder creation with Until fields (around line 1175-1193):**

```typescript
          if (editingReminder) {
            // ... existing validation code ...
            
            const updated: Reminder = {
              ...editingReminder,
              title: title.trim(),
              time: finalTime,
              date: selectedDate,
              priority,
              repeatType,
              repeatDays: (repeatType === 'weekly' || repeatType === 'custom' || repeatType === 'daily') ? repeatDays : undefined,
              monthlyDay: repeatType === 'monthly' ? Number(selectedDate.split('-')[2] ?? '1') : undefined,
              everyInterval: repeatType === 'every' ? { value: everyValue, unit: everyUnit } : undefined,
              
              // ✅ ADD UNTIL FIELDS:
              untilType: repeatType !== 'none' ? untilType : 'none',
              untilDate: repeatType !== 'none' && untilType === 'endsAt' ? untilDate : undefined,
              untilCount: repeatType !== 'none' && untilType === 'count' ? untilCount : undefined,
              occurrenceCount: repeatType !== 'none' && untilType === 'count' ? (editingReminder.occurrenceCount ?? 0) : undefined,
              
              ringerSound: undefined,
              isCompleted: false,
              isActive: true,
              isPaused: false,
              isExpired: false,
              snoozeUntil: undefined,
              nextReminderDate: undefined,
              notificationId: undefined,
            };
```

**G. Update new reminder creation (around line 1235-1252):**

```typescript
          const newReminder: Reminder = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            title: title.trim(),
            description: '',
            time: finalTime,
            date: selectedDate,
            priority,
            isActive: true,
            isPaused: false,
            repeatType,
            repeatDays: (repeatType === 'weekly' || repeatType === 'custom' || repeatType === 'daily') ? repeatDays : undefined,
            monthlyDay: repeatType === 'monthly' ? Number(selectedDate.split('-')[2] ?? '1') : undefined,
            everyInterval: repeatType === 'every' ? { value: everyValue, unit: everyUnit } : undefined,
            
            // ✅ ADD UNTIL FIELDS:
            untilType: repeatType !== 'none' ? untilType : 'none',
            untilDate: repeatType !== 'none' && untilType === 'endsAt' ? untilDate : undefined,
            untilCount: repeatType !== 'none' && untilType === 'count' ? untilCount : undefined,
            occurrenceCount: repeatType !== 'none' && untilType === 'count' ? 0 : undefined,
            
            ringerSound: undefined,
            isCompleted: false,
            isExpired: false,
          };
```

**H. Update form reset after successful creation (around line 1272-1291):**

```typescript
              setTimeout(() => {
                setEditingReminder(null);
                setTitle('');
                const defaultPriority = settings?.defaultPriority ?? 'standard';
                const mappedPriority: Priority = defaultPriority === 'standard' ? 'medium' : 
                                                defaultPriority === 'silent' ? 'low' : 'high';
                setPriority(mappedPriority);
                setRepeatType(settings?.defaultReminderMode ?? 'none');
                setRepeatDays([]);
                setEveryValue(1);
                setEveryUnit('hours');
                
                // ✅ ADD UNTIL RESETS:
                setUntilType('none');
                setUntilDate('');
                setUntilCount(1);
                
                const defaultTime = calculateDefaultTime();
                setSelectedTime(defaultTime.time);
                setIsAM(defaultTime.isAM);
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                setSelectedDate(`${yyyy}-${mm}-${dd}`);
              }, 150);
```

**I. Update CreateReminderPopupProps interface (around line 1319-1347):**

```typescript
interface CreateReminderPopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (title: string) => void;
  selectedTime: string;
  isAM: boolean;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  showCustomize: boolean;
  onShowCustomizeChange: (show: boolean) => void;
  repeatType: RepeatType;
  onRepeatTypeChange: (repeatType: RepeatType) => void;
  repeatDays: number[];
  onRepeatDaysChange: (days: number[]) => void;
  onTimeSelect: () => void;
  onTimeChange: (time: string, isAM: boolean) => void;
  showTimeSelector: boolean;
  onCloseTimeSelector: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  mode: PopupMode;
  everyValue: number;
  everyUnit: EveryUnit;
  onEveryChange: (value: number, unit: EveryUnit) => void;
  onShowToast: (message: string, type?: 'info' | 'error' | 'success') => void;
  
  // ✅ ADD UNTIL PROPS:
  untilType: 'none' | 'endsAt' | 'count';
  untilDate: string;
  untilCount: number;
  onUntilTypeChange: (type: 'none' | 'endsAt' | 'count') => void;
  onUntilDateChange: (date: string) => void;
  onUntilCountChange: (count: number) => void;
  onOpenUntilTime: () => void;
}
```

**J. Update CreateReminderPopup function signature (around line 1349-1377):**

```typescript
function CreateReminderPopup({
  visible,
  onClose,
  title,
  onTitleChange,
  selectedTime,
  isAM,
  priority,
  onPriorityChange,
  showCustomize,
  onShowCustomizeChange,
  repeatType,
  onRepeatTypeChange,
  repeatDays,
  onRepeatDaysChange,
  onTimeSelect,
  onTimeChange,
  showTimeSelector,
  onCloseTimeSelector,
  onConfirm,
  isLoading,
  selectedDate,
  onDateChange,
  mode,
  everyValue,
  everyUnit,
  onEveryChange,
  onShowToast,
  // ✅ ADD UNTIL PARAMS:
  untilType,
  untilDate,
  untilCount,
  onUntilTypeChange,
  onUntilDateChange,
  onUntilCountChange,
  onOpenUntilTime,
}: CreateReminderPopupProps) {
```

**K. Pass Until props to CustomizePanel (around line 1481-1498):**

```typescript
              <View style={[createPopupStyles.customizeContent, { marginBottom: 6 }]}> 
                <CustomizePanel
                  repeatType={repeatType}
                  repeatDays={repeatDays}
                  onRepeatTypeChange={onRepeatTypeChange}
                  onRepeatDaysChange={onRepeatDaysChange}
                  selectedDate={selectedDate}
                  onDateChange={(date) => {
                    onDateChange(date);
                  }}
                  onOpenTime={() => { onTimeSelect(); }}
                  displayTime={`${formatTime(selectedTime, isAM)}`}
                  everyValue={everyValue}
                  everyUnit={everyUnit}
                  onEveryChange={onEveryChange}
                  
                  {/* ✅ ADD UNTIL PROPS: */}
                  untilType={untilType}
                  untilDate={untilDate}
                  untilCount={untilCount}
                  onUntilTypeChange={onUntilTypeChange}
                  onUntilDateChange={onUntilDateChange}
                  onUntilCountChange={onUntilCountChange}
                  onOpenUntilTime={onOpenUntilTime}
                />
              </View>
```

---

## Step 4: Update Reminder Engine Logic

### File: `hooks/reminder-engine.tsx`

**Find the function that handles reminder triggering and add Until checks:**

Search for where reminders are marked as completed or rescheduled. Add logic like:

```typescript
// ✅ ADD THIS LOGIC when a reminder triggers:

// Check if reminder has reached its end condition
const shouldEndReminder = (reminder: Reminder): boolean => {
  if (reminder.untilType === 'endsAt' && reminder.untilDate) {
    const now = new Date();
    const endDate = new Date(reminder.untilDate);
    if (now >= endDate) {
      return true; // Reminder has passed its end date
    }
  }
  
  if (reminder.untilType === 'count' && reminder.untilCount) {
    const currentCount = reminder.occurrenceCount ?? 0;
    if (currentCount >= reminder.untilCount) {
      return true; // Reminder has reached occurrence limit
    }
  }
  
  return false;
};

// When reminder triggers:
const handleReminderTrigger = (reminder: Reminder) => {
  // Increment occurrence count if using count-based until
  const newOccurrenceCount = reminder.untilType === 'count' 
    ? (reminder.occurrenceCount ?? 0) + 1 
    : reminder.occurrenceCount;
  
  // Check if reminder should end
  if (shouldEndReminder({ ...reminder, occurrenceCount: newOccurrenceCount })) {
    // Mark as completed - no more occurrences
    updateReminder({
      ...reminder,
      isCompleted: true,
      occurrenceCount: newOccurrenceCount,
    });
    return;
  }
  
  // Otherwise, schedule next occurrence
  const nextDate = calculateNextReminderDate(reminder);
  
  // Check if next date exceeds until date
  if (reminder.untilType === 'endsAt' && reminder.untilDate && nextDate) {
    const endDate = new Date(reminder.untilDate);
    if (nextDate > endDate) {
      // This would be the last occurrence
      updateReminder({
        ...reminder,
        isCompleted: true,
        occurrenceCount: newOccurrenceCount,
      });
      return;
    }
  }
  
  // Schedule next occurrence
  updateReminder({
    ...reminder,
    nextReminderDate: nextDate?.toISOString(),
    lastTriggeredAt: new Date().toISOString(),
    occurrenceCount: newOccurrenceCount,
  });
};
```

---

## Step 5: Update Reminder Scheduling Logic

### File: `services/reminder-scheduler.ts`

**Add Until validation before scheduling:**

```typescript
// ✅ ADD THIS FUNCTION:
const shouldScheduleNextOccurrence = (reminder: Reminder, nextDate: Date): boolean => {
  // Check endsAt condition
  if (reminder.untilType === 'endsAt' && reminder.untilDate) {
    const endDate = new Date(reminder.untilDate);
    if (nextDate > endDate) {
      return false; // Next date exceeds end date
    }
  }
  
  // Check count condition
  if (reminder.untilType === 'count' && reminder.untilCount) {
    const currentCount = reminder.occurrenceCount ?? 0;
    if (currentCount >= reminder.untilCount) {
      return false; // Reached occurrence limit
    }
  }
  
  return true;
};

// Use in your scheduling logic:
const scheduleReminder = async (reminder: Reminder) => {
  const nextDate = calculateNextReminderDate(reminder);
  
  if (!nextDate) {
    return; // No valid next date
  }
  
  // ✅ ADD THIS CHECK:
  if (!shouldScheduleNextOccurrence(reminder, nextDate)) {
    // Mark as completed if shouldn't schedule
    await updateReminder({
      ...reminder,
      isCompleted: true,
    });
    return;
  }
  
  // Continue with normal scheduling...
};
```

---

## Step 6: Update Reminder Utils

### File: `services/reminder-utils.ts`

**Update calculateNextReminderDate to respect Until conditions:**

```typescript
export const calculateNextReminderDate = (reminder: Reminder): Date | null => {
  // ... existing calculation logic ...
  
  let nextDate = /* your existing calculation */;
  
  if (!nextDate) return null;
  
  // ✅ ADD UNTIL CHECKS:
  // Check if next date exceeds endsAt
  if (reminder.untilType === 'endsAt' && reminder.untilDate) {
    const endDate = new Date(reminder.untilDate);
    if (nextDate > endDate) {
      return null; // No more occurrences
    }
  }
  
  // Check if count limit reached
  if (reminder.untilType === 'count' && reminder.untilCount) {
    const currentCount = reminder.occurrenceCount ?? 0;
    if (currentCount >= reminder.untilCount) {
      return null; // No more occurrences
    }
  }
  
  return nextDate;
};
```

---

## Testing Checklist

### UI Testing
- [ ] \"Until\" section only shows for repeating reminders (daily, weekly, monthly, yearly, every)
- [ ] \"Until\" section does NOT show for \"Once\" reminders
- [ ] Popup size remains the same (no scrolling needed)
- [ ] \"Until\" section fits in available space above Cancel/Create buttons
- [ ] Dropdown shows all 3 options: None, Ends at, Count
- [ ] Date picker appears when \"Ends at\" is selected
- [ ] Number input appears when \"Count\" is selected
- [ ] Styles match existing Material3 design

### Functional Testing
- [ ] Creating a reminder with \"Until: None\" works (repeats indefinitely)
- [ ] Creating a reminder with \"Until: Ends at\" stops after the specified date
- [ ] Creating a reminder with \"Until: Count\" stops after N occurrences
- [ ] Editing a reminder preserves Until settings
- [ ] Validation: End date must be after start date
- [ ] Validation: Count must be between 1-999
- [ ] Switching repeat type from repeating to \"Once\" clears Until settings
- [ ] occurrenceCount increments correctly on each trigger

### Edge Cases
- [ ] Daily reminder with \"Ends at\" tomorrow stops after tomorrow
- [ ] Weekly reminder with \"Count: 2\" triggers exactly twice
- [ ] Monthly reminder with \"Ends at\" in 6 months stops at month 6
- [ ] Editing a reminder that has already triggered 3 times maintains count
- [ ] Changing \"Until: Count\" to \"Until: None\" allows infinite repeats again
- [ ] Date picker can't select dates before start date
- [ ] Count input rejects values < 1 or > 999

---

## Common Issues & Solutions

### Issue 1: Popup becomes too tall and requires scrolling
**Solution:** Reduce padding/margins in untilSection. Current design uses 12px top margin, 8px bottom margin, and horizontal layout to minimize vertical space.

### Issue 2: Until section appears for \"Once\" reminders
**Solution:** Ensure the conditional `{repeatType !== 'none' && (...)}` wraps the entire Until section.

### Issue 3: occurrenceCount not incrementing
**Solution:** Make sure to increment in the reminder-engine.tsx when handling reminder triggers, and persist the updated value via updateReminder.

### Issue 4: Reminders not stopping at Until date/count
**Solution:** Double-check the shouldEndReminder and shouldScheduleNextOccurrence functions are being called in the right places.

---

## Visual Reference

Based on the screenshot, the \"Until\" section should:
- Be positioned in the red square area (above Cancel/Create buttons)
- Use horizontal layout to save vertical space
- Match the existing gray button style (#F3F4F6 background)
- Use small font sizes (13-14px) to stay compact
- Align left with \"Until\" label, controls align right

---

## Summary

This implementation adds a complete \"Until\" feature that:
1. ✅ Works for all repeating reminder types
2. ✅ Offers 3 options: None, Ends at, Count
3. ✅ Fits in existing popup without size changes
4. ✅ Validates input properly
5. ✅ Integrates with reminder scheduling logic
6. ✅ Maintains occurrence count for count-based limits
7. ✅ Stops reminders when Until condition is met

The UI is compact, matches Material3 design, and doesn't require scrolling.
"
