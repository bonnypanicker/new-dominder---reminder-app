

## 🛠️ THE FIX

### Strategy

Move the loading check to happen AFTER all hooks are declared, or handle loading state within the JSX return.

### Solution 1: Move Early Return After All Hooks (RECOMMENDED)

This is the cleanest solution that requires minimal code changes.

**File**: `app/index.tsx`

**FIND (Lines 82-870):**
```typescript
export default function HomeScreen() {
  const { data: reminders = [], isLoading } = useReminders();
  const { data: settings } = useSettings();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const bulkDeleteReminders = useBulkDeleteReminders();
  const bulkUpdateReminders = useBulkUpdateReminders();
  const [showCreatePopup, setShowCreatePopup] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'expired'>('active');
  // ... ALL OTHER HOOKS ...
  
  // ❌ PROBLEM: Early return after hooks
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Clock size={48} color={Material3Colors.light.primary} />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Main UI */}
    </SafeAreaView>
  );
}
```

**REPLACE WITH:**
```typescript
export default function HomeScreen() {
  const { data: reminders = [], isLoading } = useReminders();
  const { data: settings } = useSettings();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const bulkDeleteReminders = useBulkDeleteReminders();
  const bulkUpdateReminders = useBulkUpdateReminders();
  const [showCreatePopup, setShowCreatePopup] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'expired'>('active');
  // ... ALL OTHER HOOKS (keep them unchanged) ...
  
  // ✅ FIX: Single return statement with conditional JSX
  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        // Loading state UI
        <View style={styles.loadingContainer}>
          <Clock size={48} color={Material3Colors.light.primary} />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      ) : (
        // Main UI (everything that was previously in the main return)
        <>
          <View style={styles.header}>
            <Text style={styles.title}>DoMinder</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Settings size={20} color={Material3Colors.light.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Rest of your existing UI code */}
          <View style={styles.tabContainer}>
            {/* ... existing tab code ... */}
          </View>

          {/* ... all other existing components ... */}
        </>
      )}
    </SafeAreaView>
  );
}
```

---

