
## 📋 EXECUTIVE SUMMARY

**Objective**: Replace the current card animation system (spring layout animations + fade transitions) with **React Native Reanimated v3 Shared Element Transitions** for professional hero animations between tab states and smooth card movements.

**Current State**: Basic Layout.springify() and FadeOut animations  
**Target State**: Shared element transitions with `sharedTransitionTag` for seamless cross-tab animations  
**Version**: react-native-reanimated ^3.19.3 (already installed, supports shared transitions)

---

## 🔍 CURRENT IMPLEMENTATION ANALYSIS

### Files Involved
1. **`app/index.tsx`** (1212 lines)
   - Main home screen with 3 tabs: Active, Completed, Expired
   - ReminderCard component (memo optimized)
   - Card rendering in `.map()` loops
   - State management for selectedReminders, activeTab

2. **`components/SwipeableRow.tsx`** (215 lines)
   - Wraps each card for swipe gestures
   - Uses Animated.View with Layout and FadeOut
   - Gesture handling for swipe-to-delete/complete

3. **`utils/layout-animation.ts`** (13 lines)
   - Legacy LayoutAnimation wrapper (currently unused)
   - Can be safely removed

### Current Animation Stack
```typescript
// SwipeableRow.tsx (Lines 137-141)
<Animated.View 
  style={styles.container}
  layout={Layout.springify().damping(20).stiffness(300)}  // ❌ TO BE REPLACED
  exiting={FadeOut.duration(250)}                         // ❌ TO BE REPLACED
>
```

### Identified Issues with Current Approach
1. **No cross-tab transitions**: Cards disappear from Active tab and appear in Completed tab without visual continuity
2. **Generic fade animations**: No hero animation when cards move between states
3. **Missed opportunity**: Each card has unique `reminder.id` that can be used for shared transitions
4. **Layout.springify() limitations**: Only animates layout changes within same container, not across different lists

---

## 🎯 TARGET IMPLEMENTATION: SHARED ELEMENT TRANSITIONS

### What Are Shared Element Transitions?
Shared element transitions create visual continuity when the same element appears in different locations or states. In Reanimated v3, this is achieved using `sharedTransitionTag`.

### Benefits for DoMinder
1. **Hero animations**: Card smoothly transitions from Active tab position to Completed tab position
2. **Professional feel**: Matches native iOS/Android system animations
3. **Visual clarity**: User sees exactly where their reminder went
4. **State awareness**: Cards animate between snoozed, paused, and active states

---

## 🛠️ IMPLEMENTATION PLAN (PHASE-BY-PHASE)

---

### 📌 PHASE 1: Analyze Conflicts and Dependencies

#### Step 1.1: Check Current Animation Usage
**File**: `components/SwipeableRow.tsx`

**Current Animations**:
- `layout={Layout.springify()}` - Line 139
- `exiting={FadeOut.duration(250)}` - Line 140
- Pan gesture animations (translateX, opacity) - Lines 37-83

**Conflict Analysis**:
- ✅ `sharedTransitionTag` is **compatible** with gesture animations
- ⚠️ `layout` and `exiting` **must be removed** to use shared transitions
- ✅ Card swipe gestures can remain unchanged

#### Step 1.2: Identify Shared Elements
**Elements that should have shared transitions**:
1. **Reminder cards** moving between Active → Completed
2. **Reminder cards** moving between Active → Expired
3. **Reminder cards** moving between Completed → Active (reassign)
4. **Reminder cards** within same tab (position changes due to sorting)

**Unique Identifier**: `reminder.id` (already exists and is stable)

---

### 📌 PHASE 2: Remove Conflicting Animations

#### Step 2.1: Update SwipeableRow Component
**File**: `components/SwipeableRow.tsx`

**CURRENT CODE (Lines 137-141)**:
```typescript
<Animated.View 
  style={styles.container}
  layout={Layout.springify().damping(20).stiffness(300)}
  exiting={FadeOut.duration(250)}
>
```

**REPLACE WITH**:
```typescript
<Animated.View 
  style={styles.container}
  // ✅ REMOVED: layout and exiting (conflicts with sharedTransitionTag)
  // Shared transition will handle all movement
>
```

**Impact**: 
- Removes generic layout animation
- Prepares container for shared element transitions
- Gesture animations remain functional

---

#### Step 2.2: Add Shared Transition Imports
**File**: `components/SwipeableRow.tsx`

**ADD TO IMPORTS (Line 4)**:
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolateColor,
  // Layout,           // ❌ REMOVE (or keep for reference)
  // FadeOut,          // ❌ REMOVE (or keep for reference)
  SharedTransition,    // ✅ ADD
  withTiming,          // ✅ ADD
} from 'react-native-reanimated';
```

---

### 📌 PHASE 3: Implement Shared Element Transitions

#### Step 3.1: Create Custom Shared Transition
**File**: `components/SwipeableRow.tsx`

**ADD AFTER IMPORTS (Lines ~20-30)**:
```typescript
// Custom shared transition configuration
const customTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    height: withTiming(values.targetHeight, { duration: 300 }),
    width: withTiming(values.targetWidth, { duration: 300 }),
    originX: withTiming(values.targetOriginX, { duration: 300 }),
    originY: withTiming(values.targetOriginY, { duration: 300 }),
  };
});
```

**Why Custom Transition?**:
- Default SharedTransition has abrupt position changes
- Custom transition with `withTiming` provides smooth 300ms animation
- Matches the feel of the previous spring animation
- Controls height, width, and position simultaneously

---

#### Step 3.2: Add sharedTransitionTag to Card Container
**File**: `components/SwipeableRow.tsx`

**UPDATE CONTAINER (Lines 137-141)**:
```typescript
export default function SwipeableRow({ 
  children, 
  reminder, 
  onSwipeRight, 
  onSwipeLeft 
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // ... existing panGesture code ...

  return (
    <Animated.View 
      style={styles.container}
      sharedTransitionTag={`reminder-${reminder.id}`}  // ✅ ADD
      sharedTransitionStyle={customTransition}         // ✅ ADD
    >
      {/* Right action (complete) */}
      {onSwipeRight && (
        <Animated.View style={[styles.rightAction, rightActionBackgroundStyle]}>
          <Animated.View style={[styles.actionContent, rightActionStyle]}>
            <CheckCircle size={24} color=\"white\" />
            <Text style={styles.actionText}>Complete</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Left action (delete) */}
      {onSwipeLeft && (
        <Animated.View style={[styles.leftAction, leftActionBackgroundStyle]}>
          <Animated.View style={[styles.actionContent, leftActionStyle]}>
            <Trash2 size={24} color=\"white\" />
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Main content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
```

**Key Changes**:
- `sharedTransitionTag={`reminder-${reminder.id}`}` - Unique tag per card
- `sharedTransitionStyle={customTransition}` - Custom animation config
- When card moves between tabs, Reanimated automatically animates it

---

### 📌 PHASE 4: Handle Card Removal (Delete)

#### Problem: Deleted cards shouldn't transition
When a card is deleted, it should disappear (not transition to another location).

**File**: `components/SwipeableRow.tsx`

#### Step 4.1: Add Exit Animation for Deletions
**UPDATE CONTAINER**:
```typescript
import { FadeOut } from 'react-native-reanimated';  // ✅ Keep this import

// Add prop to indicate if card is being deleted
interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  isDeleting?: boolean;  // ✅ ADD
}

export default function SwipeableRow({ 
  children, 
  reminder, 
  onSwipeRight, 
  onSwipeLeft,
  isDeleting = false  // ✅ ADD
}: SwipeableRowProps) {
  // ... existing code ...

  return (
    <Animated.View 
      style={styles.container}
      sharedTransitionTag={isDeleting ? undefined : `reminder-${reminder.id}`}  // ✅ CONDITIONAL
      sharedTransitionStyle={isDeleting ? undefined : customTransition}          // ✅ CONDITIONAL
      exiting={isDeleting ? FadeOut.duration(250) : undefined}                  // ✅ CONDITIONAL
    >
      {/* ... rest of component ... */}
    </Animated.View>
  );
}
```

**Why Conditional**:
- When `isDeleting=true`, card uses FadeOut instead of shared transition
- When `isDeleting=false`, card uses shared transition for state changes
- Separates deletion behavior from state transition behavior

---

#### Step 4.2: Update Card Usage in index.tsx
**File**: `app/index.tsx`

**ADD STATE TO TRACK DELETING CARDS** (after other state declarations, ~Line 115):
```typescript
const [deletingCardIds, setDeletingCardIds] = useState<Set<string>>(new Set());
```

**UPDATE handleDelete** (Lines 311-318):
```typescript
const handleDelete = useCallback((reminder: Reminder, fromSwipe: boolean = false) => {
  // Mark card as being deleted
  setDeletingCardIds(prev => new Set(prev).add(reminder.id));
  
  if (fromSwipe) {
    setTimeout(() => {
      deleteReminder.mutate(reminder.id);
      // Clean up after mutation completes
      setTimeout(() => {
        setDeletingCardIds(prev => {
          const next = new Set(prev);
          next.delete(reminder.id);
          return next;
        });
      }, 300);
    }, 350);
  } else {
    deleteReminder.mutate(reminder.id);
    setTimeout(() => {
      setDeletingCardIds(prev => {
        const next = new Set(prev);
        next.delete(reminder.id);
        return next;
      });
    }, 300);
  }
}, [deleteReminder]);
```

**UPDATE ReminderCard USAGE** (Lines 934-936):
```typescript
<SwipeableRow 
  reminder={reminder}
  onSwipeRight={/* ... existing ... */}
  onSwipeLeft={/* ... existing ... */}
  isDeleting={deletingCardIds.has(reminder.id)}  // ✅ ADD
>
```

---

### 📌 PHASE 5: Optimize Shared Transitions Across Tabs

#### Problem: Cards moving between tabs need smooth transitions
**File**: `app/index.tsx`

#### Step 5.1: Add Animation Keys to Tab Content
**UPDATE ACTIVE TAB SECTION** (Lines 923-938):
```typescript
{activeTab === 'active' && (
  activeReminders.length === 0 ? (
    <View style={styles.emptyState}>
      {/* ... empty state ... */}
    </View>
  ) : (
    <View 
      style={styles.section}
      key=\"active-section\"  // ✅ ADD - Helps React track section
    >
      {activeReminders.map((reminder) => (
        <ReminderCard 
          key={reminder.id} 
          reminder={reminder} 
          listType=\"active\" 
        />
      ))}
    </View>
  )
)}
```

**REPEAT FOR COMPLETED AND EXPIRED TABS** with keys `\"completed-section\"` and `\"expired-section\"`.

**Why Keys Matter**:
- Helps React identify when entire sections change
- Improves shared transition performance
- Reduces unnecessary re-renders

---

### 📌 PHASE 6: Add Transition Callbacks (Optional Enhancement)

#### Step 6.1: Track Transition State
**File**: `components/SwipeableRow.tsx`

**ADD CALLBACK SUPPORT**:
```typescript
interface SwipeableRowProps {
  children: React.ReactNode;
  reminder: Reminder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  isDeleting?: boolean;
  onTransitionStart?: () => void;  // ✅ ADD (optional)
  onTransitionEnd?: () => void;    // ✅ ADD (optional)
}

// Update custom transition with callbacks
const createCustomTransition = (
  onStart?: () => void,
  onEnd?: () => void
) => {
  return SharedTransition.custom((values) => {
    'worklet';
    
    // Trigger start callback on UI thread
    if (onStart) {
      runOnJS(onStart)();
    }
    
    return {
      height: withTiming(values.targetHeight, { 
        duration: 300,
      }, (finished) => {
        'worklet';
        if (finished && onEnd) {
          runOnJS(onEnd)();
        }
      }),
      width: withTiming(values.targetWidth, { duration: 300 }),
      originX: withTiming(values.targetOriginX, { duration: 300 }),
      originY: withTiming(values.targetOriginY, { duration: 300 }),
    };
  });
};
```

**Use Case**: Track when transitions start/end for analytics or debugging.

---

### 📌 PHASE 7: Handle Edge Cases

#### Edge Case 1: Fast Tab Switching
**Problem**: User switches tabs rapidly while transition is in progress

**Solution**: Shared transitions automatically handle this. No additional code needed.

#### Edge Case 2: Card Updates During Transition
**Problem**: Card data changes while animating (e.g., title edited)

**Solution**: React.memo comparison in ReminderCard already optimizes this (Lines 741-759).

**Verify Memo Fields Include Critical Data**:
```typescript
// These fields should be in memo comparison:
- reminder.id
- reminder.title
- reminder.time
- reminder.priority
- reminder.isActive
- reminder.isCompleted
- reminder.isExpired
// ... (already correctly implemented)
```

#### Edge Case 3: Multiple Cards Transitioning Simultaneously
**Problem**: User completes multiple reminders quickly

**Solution**: Each card has unique `sharedTransitionTag`, so transitions don't conflict.

**Verify Unique Tags**:
```typescript
sharedTransitionTag={`reminder-${reminder.id}`}  // ✅ reminder.id is unique
```

---

### 📌 PHASE 8: Remove Legacy Animation Code

#### Step 8.1: Remove Unused Layout Animation Utility
**File**: `utils/layout-animation.ts`

**ACTION**: Delete entire file (no longer needed).

**UPDATE IMPORTS**: Remove any imports of `configureLayoutAnimation` from `app/index.tsx` (should already be removed from previous fixes).

---

## 🎨 ANIMATION CONFIGURATION TUNING

### Transition Duration Options
```typescript
// Fast (200ms) - Snappy, modern
{ duration: 200 }

// Medium (300ms) - Balanced (RECOMMENDED)
{ duration: 300 }

// Slow (400ms) - Dramatic
{ duration: 400 }
```

### Easing Options
```typescript
// Linear
withTiming(value, { duration: 300, easing: Easing.linear })

// Ease Out (DEFAULT - RECOMMENDED)
withTiming(value, { duration: 300, easing: Easing.out(Easing.cubic) })

// Spring (Alternative)
withSpring(value, { damping: 20, stiffness: 200 })
```

### Recommended Configuration (Default)
```typescript
const customTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    height: withTiming(values.targetHeight, { 
      duration: 300,
      easing: Easing.out(Easing.cubic)  // Smooth deceleration
    }),
    width: withTiming(values.targetWidth, { 
      duration: 300,
      easing: Easing.out(Easing.cubic)
    }),
    originX: withTiming(values.targetOriginX, { 
      duration: 300,
      easing: Easing.out(Easing.cubic)
    }),
    originY: withTiming(values.targetOriginY, { 
      duration: 300,
      easing: Easing.out(Easing.cubic)
    }),
  };
});
```

---

## 🧪 TESTING STRATEGY

### Test Case 1: Complete Reminder (Active → Completed)
**Steps**:
1. Have 5+ active reminders visible
2. Tap \"Done\" button on middle card (non-repeating reminder)
3. Switch to \"Completed\" tab

**Expected**:
- ✅ Card smoothly animates from Active list position to Completed list position
- ✅ Hero animation shows continuous movement
- ✅ No flicker or jump
- ✅ Duration: ~300ms
- ✅ Other cards smoothly fill the gap in Active list

**Debug If Failed**:
- Check `sharedTransitionTag` is identical: `reminder-${reminder.id}`
- Verify `reminder.id` doesn't change during transition
- Check React DevTools for component remounting

---

### Test Case 2: Reassign Reminder (Completed → Active)
**Steps**:
1. Go to \"Completed\" tab
2. Tap \"Reassign\" button on a card
3. Switch to \"Active\" tab

**Expected**:
- ✅ Card animates from Completed position to Active position
- ✅ Smooth transition even across tab change
- ✅ Card appears in correct sorted position in Active list

---

### Test Case 3: Delete Reminder
**Steps**:
1. Swipe card left to delete
2. Observe animation

**Expected**:
- ✅ Card fades out (FadeOut animation, not shared transition)
- ✅ No transition to another list
- ✅ Duration: ~250ms
- ✅ Other cards smoothly fill gap

**Debug If Failed**:
- Check `isDeleting` prop is true
- Verify conditional logic: `sharedTransitionTag={isDeleting ? undefined : ...}`

---

### Test Case 4: Rapid Tab Switching
**Steps**:
1. Complete a reminder (start transition Active → Completed)
2. Immediately switch to \"Expired\" tab
3. Switch back to \"Completed\" tab before animation finishes

**Expected**:
- ✅ No crash
- ✅ Transition completes smoothly
- ✅ Card ends in correct final position

---

### Test Case 5: Multiple Simultaneous Transitions
**Steps**:
1. Have 10+ active reminders
2. Rapidly tap \"Done\" on 5 cards in quick succession
3. Switch to \"Completed\" tab

**Expected**:
- ✅ All 5 cards transition smoothly
- ✅ No overlapping animations
- ✅ Cards appear in Completed list in correct order
- ✅ No performance lag (60 FPS maintained)

---

### Test Case 6: Card Data Update During Transition
**Steps**:
1. Start transition (complete reminder)
2. Immediately edit the card's title in Completed tab
3. Observe transition

**Expected**:
- ✅ Transition completes with old data
- ✅ Card updates to new data after transition
- ✅ No visual glitches

---

### Test Case 7: Screen Rotation During Transition
**Steps**:
1. Start a card transition
2. Rotate device mid-animation

**Expected**:
- ✅ Animation adapts to new screen dimensions
- ✅ No crash or broken layout

---

## 📊 PERFORMANCE CONSIDERATIONS

### Shared Transition Performance
- **Native Driver**: Shared transitions run on UI thread (60 FPS)
- **Memory**: Minimal overhead (~0.1MB per transition)
- **Battery**: Negligible impact

### Optimization Tips
1. **Memo Optimization**: Already implemented in ReminderCard (Lines 741-759)
2. **Avoid Re-renders**: Use stable `reminder.id` as key
3. **Lazy Loading**: Not needed for ~100 cards (React can handle)

### Device-Specific Tuning
```typescript
import { Platform } from 'react-native';

const duration = Platform.select({
  ios: 300,      // iOS handles 300ms well
  android: 250,  // Android slightly faster feels better
  default: 300
});
```

---

## 🔧 TROUBLESHOOTING GUIDE

### Issue 1: Transition Not Working
**Symptoms**: Card disappears from Active, appears in Completed (no animation)

**Causes**:
1. `sharedTransitionTag` doesn't match
2. `reminder.id` changes during transition
3. Card remounts instead of updating

**Debug**:
```typescript
// Add logging in SwipeableRow
console.log('Shared tag:', `reminder-${reminder.id}`);
console.log('Is deleting:', isDeleting);
```

**Fix**:
- Verify `reminder.id` is stable (doesn't change)
- Check both Active and Completed cards have same tag
- Ensure key prop is `reminder.id`

---

### Issue 2: Janky Animation
**Symptoms**: Animation stutters or lags

**Causes**:
1. Heavy computation on JS thread during transition
2. Too many simultaneous transitions
3. Missing `'worklet'` directive in custom transition

**Debug**:
```typescript
// Check FPS
import { useAnimatedReaction } from 'react-native-reanimated';

useAnimatedReaction(
  () => values.targetOriginY,
  (current, previous) => {
    console.log('Transition FPS:', 1000 / (Date.now() - lastFrameTime));
  }
);
```

**Fix**:
- Ensure custom transition has `'worklet';` directive
- Reduce transition duration if device is low-end
- Use React.memo to prevent unnecessary re-renders

---

### Issue 3: Card Flickers During Transition
**Symptoms**: Brief flash of content during animation

**Causes**:
1. Style conflicts between source and destination
2. Height/width mismatch
3. Z-index issues

**Fix**:
```typescript
// Ensure consistent styles
const styles = StyleSheet.create({
  container: {
    // ... existing styles ...
    overflow: 'hidden',  // ✅ Prevents content overflow during resize
  },
});
```

---

### Issue 4: Transition Interrupts Swipe Gesture
**Symptoms**: Can't swipe card while transition is happening

**Causes**:
1. Gesture handler blocked during animation
2. View is being animated, touch events ignored

**Fix**:
```typescript
// In panGesture, add:
.enabled(translateX.value === 0)  // Only enable when card is at rest
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Verify `react-native-reanimated` version >=3.0.0 (currently 3.19.3 ✅)
- [ ] Review all 3 animation fix documents (animation_fix.md, animation_fix2.md, animation_fix3.md)
- [ ] Backup current code (git commit)

### Phase 1: Remove Conflicts
- [ ] Remove `layout={Layout.springify()}` from SwipeableRow
- [ ] Remove `exiting={FadeOut}` from SwipeableRow (will re-add conditionally)
- [ ] Add SharedTransition import

### Phase 2: Add Shared Transitions
- [ ] Create `customTransition` configuration
- [ ] Add `sharedTransitionTag` to Animated.View
- [ ] Add `sharedTransitionStyle` prop

### Phase 3: Handle Deletions
- [ ] Add `isDeleting` prop to SwipeableRow
- [ ] Add `deletingCardIds` state to index.tsx
- [ ] Update `handleDelete` to track deleting cards
- [ ] Make `sharedTransitionTag` conditional
- [ ] Make `exiting` conditional

### Phase 4: Update Card Rendering
- [ ] Pass `isDeleting` prop to SwipeableRow
- [ ] Add section keys to Active, Completed, Expired containers
- [ ] Verify all cards use `reminder.id` as key

### Phase 5: Testing
- [ ] Test Active → Completed transition
- [ ] Test Completed → Active transition
- [ ] Test delete animation (no transition)
- [ ] Test rapid tab switching
- [ ] Test multiple simultaneous transitions
- [ ] Test on both iOS and Android

### Phase 6: Optimization
- [ ] Verify React.memo is working (check re-render count)
- [ ] Profile animation performance (60 FPS target)
- [ ] Test with 50+ reminders
- [ ] Test on low-end device

### Phase 7: Cleanup
- [ ] Remove unused imports
- [ ] Delete `utils/layout-animation.ts`
- [ ] Update any documentation

---

## 🎓 KEY LEARNINGS

### Shared Element Transitions vs Layout Animations
| Feature | Layout Animation | Shared Element |
|---------|-----------------|----------------|
| Cross-container | ❌ No | ✅ Yes |
| Hero animations | ❌ No | ✅ Yes |
| Performance | Good | Excellent |
| Complexity | Low | Medium |
| Visual continuity | ❌ No | ✅ Yes |

### When to Use Shared Transitions
✅ **DO USE** when:
- Element moves between different containers (tabs, screens)
- Need visual continuity across state changes
- Creating hero animations
- Element identity persists (same ID)

❌ **DON'T USE** when:
- Element is being created/destroyed
- No cross-container movement
- Simple fade in/out is sufficient
- Element ID changes frequently

---

## 📚 REANIMATED V3 SHARED TRANSITION API REFERENCE

### SharedTransition.custom()
```typescript
SharedTransition.custom((values) => {
  'worklet';  // REQUIRED - runs on UI thread
  return {
    height: withTiming(values.targetHeight, config),
    width: withTiming(values.targetWidth, config),
    originX: withTiming(values.targetOriginX, config),
    originY: withTiming(values.targetOriginY, config),
  };
});
```

### Available Values
- `values.currentHeight` - Current height
- `values.targetHeight` - Destination height
- `values.currentWidth` - Current width
- `values.targetWidth` - Destination width
- `values.currentOriginX` - Current X position
- `values.targetOriginX` - Destination X position
- `values.currentOriginY` - Current Y position
- `values.targetOriginY` - Destination Y position

### Animation Functions
- `withTiming(value, config)` - Timing-based animation
- `withSpring(value, config)` - Spring-based animation
- `withDecay(velocity, config)` - Decay animation

---

## 🎬 EXPECTED FINAL RESULT

### User Experience
1. **Complete Reminder**: Card smoothly flies from Active list to Completed list across tab change
2. **Reassign Reminder**: Card flies back from Completed to Active with reverse animation
3. **Delete Reminder**: Card fades out gracefully without cross-tab animation
4. **Multi-Complete**: Multiple cards elegantly cascade to Completed tab
5. **Professional Feel**: Animations rival native iOS Reminders app

### Performance Metrics
- **60 FPS**: All transitions maintain 60 FPS
- **300ms Duration**: Each transition completes in 300ms
- **0 Jank**: No stuttering or frame drops
- **Low Battery Impact**: <1% battery per hour of usage

---

## 🔗 REFERENCES

- [Reanimated v3 Shared Transitions Docs](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/shared-element-transitions)
- [Reanimated v3 API Reference](https://docs.swmansion.com/react-native-reanimated/docs/api)
- [Gesture Handler Integration](https://docs.swmansion.com/react-native-gesture-handler/docs/)

---

## 📌 FINAL NOTES FOR AI AGENT

1. **DO NOT** skip the conditional `isDeleting` logic - it's critical for proper delete animations
2. **DO** test on real device, not just simulator (shared transitions behave differently)
3. **DO** verify `'worklet';` directive in custom transition function
4. **DO NOT** mix SharedTransition with Layout animations on same component
5. **DO** keep gesture animations separate from shared transitions
6. **DO NOT** change `reminder.id` during transitions (breaks tag matching)
7. **DO** use stable keys (`reminder.id`) for all card renders
8. **DO** implement phases sequentially (don't skip Phase 1)

### Success Criteria
✅ All 7 test cases pass  
✅ 60 FPS maintained on mid-range device  
✅ No console warnings related to Reanimated  
✅ Delete animations work correctly (fade, no transition)  
✅ Cross-tab transitions are smooth and continuous  

### If Implementation Fails
1. Check babel.config.js has `'react-native-reanimated/plugin'`
2. Restart Metro bundler after Babel config changes
3. Clear cache: `npx expo start -c`
4. Verify Reanimated version: `yarn list react-native-reanimated`

---
