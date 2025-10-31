
Enhance the DoMinder reminder app with two animation features:

1. Add a bounce effect to cards at scroll boundaries (top/bottom) using react-native-reanimated. Detect scroll position in the ScrollView and apply a subtle spring bounce (3-5px, 200-300ms) to visible cards when reaching edges.

2. Improve the fill-in transition when cards are swiped away. Replace the current LayoutAnimation with a smooth react-native-reanimated layout transition that animates remaining cards upward to fill the gap (300-400ms with easeOutCubic).

Ensure no conflicts with existing swipe gestures in SwipeableRow.tsx. Use shared values and worklets for 60fps performance. Modify app/index.tsx for scroll logic and SwipeableRow.tsx for layout transitions.
```" --new-str "# DoMinder Card Animation Enhancement - Detailed Implementation Guide

## ⚠️ CRITICAL: Known Issues to Fix

**Previous Implementation Problems:**
1. **Glitching on card removal** - Caused by mixing LayoutAnimation with Reanimated
2. **Unable to scroll** - Gesture handler conflicts between SwipeableRow and ScrollView

**Root Causes:**
- `configureLayoutAnimation()` conflicts with Reanimated animations
- `GestureDetector` in SwipeableRow blocks ScrollView's native scroll gestures
- No proper gesture prioritization (waitFor, simultaneousHandlers)
- ScrollView + .map() doesn't support smooth item animations

---

## Implementation Strategy (Step-by-Step)

### Phase 1: Fix Scroll Gesture Conflicts (CRITICAL - Do First)

**File: `components/SwipeableRow.tsx`**

**Problem:** Pan gesture captures all touch events, blocking vertical scroll.

**Solution:** Configure gesture to allow vertical scrolling while enabling horizontal swipes.

```typescript
// Add these gesture configurations to panGesture in SwipeableRow.tsx

const panGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])  // Only activate after 10px horizontal movement
  .failOffsetY([-10, 10])     // Fail if vertical movement exceeds 10px
  .onUpdate((event) => {
    // Only allow swipe if handlers are provided
    if (event.translationX > 0 && !onSwipeRight) return;
    if (event.translationX < 0 && !onSwipeLeft) return;
    
    translateX.value = event.translationX;
  })
  .onEnd((event) => {
    // ... existing code
  });
```

**Key Points:**
- `activeOffsetX([-10, 10])` - Gesture activates only after 10px horizontal drag
- `failOffsetY([-10, 10])` - Gesture fails if user drags vertically (allows scroll)
- This lets ScrollView handle vertical gestures while SwipeableRow handles horizontal

---

### Phase 2: Remove LayoutAnimation Completely (CRITICAL - Causes Glitches)

**File: `app/index.tsx`**

**Problem:** LayoutAnimation conflicts with Reanimated, causing glitches.

**Solution:** Remove ALL calls to `configureLayoutAnimation()`.

**Find and Remove:**
```typescript
// REMOVE these lines from app/index.tsx

// In completeReminder function:
if (!fromSwipe) {
  configureLayoutAnimation();  // ❌ DELETE THIS
}

// In pauseReminder function:
configureLayoutAnimation();  // ❌ DELETE THIS

// In handleDelete function:
if (!fromSwipe) {
  configureLayoutAnimation();  // ❌ DELETE THIS
}
```

**Why:** Reanimated will handle all animations. Mixing animation libraries causes race conditions.

---

### Phase 3: Add Reanimated Layout Animations to Cards

**File: `components/SwipeableRow.tsx`**

**Add imports:**
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolateColor,
  Layout,           // ✅ ADD
  FadeOut,          // ✅ ADD
  SlideOutLeft,     // ✅ ADD
  SlideOutRight,    // ✅ ADD
} from 'react-native-reanimated';
```

**Add exiting animation to the container:**
```typescript
// In SwipeableRow component, wrap the return with exiting animation

return (
  <Animated.View 
    style={styles.container}
    layout={Layout.springify().damping(20).stiffness(300)}  // ✅ ADD - Smooth layout changes
    exiting={FadeOut.duration(250)}                         // ✅ ADD - Fade out when removed
  >
    {/* Right action (complete) */}
    {onSwipeRight && (
      // ... existing code
    )}

    {/* Left action (delete) */}
    {onSwipeLeft && (
      // ... existing code
    )}

    {/* Main content */}
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.content, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  </Animated.View>
);
```

**What this does:**
- `layout={Layout.springify()}` - Smoothly animates position changes when cards above are removed
- `exiting={FadeOut}` - Smooth fade when card is removed
- `damping(20).stiffness(300)` - Natural spring feel

---

### Phase 4: Update Card Removal Logic

**File: `app/index.tsx`**

**Problem:** Cards aren't unmounting properly during animation.

**Solution:** Add proper delay and state management.

**Update the completeReminder function:**
```typescript
const completeReminder = useCallback((reminder: Reminder, fromSwipe: boolean = false) => {
  // NO configureLayoutAnimation() call here anymore
  
  const executeUpdate = () => {
    if (reminder.repeatType === 'none') {
      updateReminder.mutate({
        ...reminder,
        isCompleted: true,
      });
    } else {
      const nextDate = calculateNextReminderDate(reminder);
      updateReminder.mutate({
        ...reminder,
        nextReminderDate: nextDate?.toISOString(),
        lastTriggeredAt: new Date().toISOString(),
        snoozeUntil: undefined,
      });
    }
  };
  
  if (fromSwipe) {
    // Increase delay to let swipe animation complete first
    setTimeout(executeUpdate, 300);  // Changed from 50ms to 300ms
  } else {
    executeUpdate();
  }
}, [updateReminder]);
```

**Update the handleDelete function:**
```typescript
const handleDelete = useCallback((reminder: Reminder, fromSwipe: boolean = false) => {
  // NO configureLayoutAnimation() call here anymore
  
  if (fromSwipe) {
    setTimeout(() => deleteReminder.mutate(reminder.id), 300);  // Changed from 50ms to 300ms
  } else {
    deleteReminder.mutate(reminder.id);
  }
}, [deleteReminder]);
```

**Why 300ms delay?**
- Gives swipe animation time to complete
- Prevents visual glitches from removing card mid-animation
- Matches the spring animation duration in SwipeableRow

---

### Phase 5: Add Scroll Boundary Bounce Effect

**File: `app/index.tsx`**

**Add new imports:**
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
```

**Add scroll tracking state (after existing state declarations):**
```typescript
// Add inside HomeScreen component
const scrollY = useSharedValue(0);
const contentHeight = useSharedValue(0);
const scrollViewHeight = useSharedValue(0);
const isAtTop = useSharedValue(false);
const isAtBottom = useSharedValue(false);
```

**Create scroll handler:**
```typescript
const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    scrollY.value = event.contentOffset.y;
    
    // Detect top boundary (with 50px threshold)
    isAtTop.value = event.contentOffset.y < 50;
    
    // Detect bottom boundary (with 50px threshold)
    const bottomThreshold = event.contentSize.height - event.layoutMeasurement.height - 50;
    isAtBottom.value = event.contentOffset.y > bottomThreshold;
  },
  onMomentumEnd: (event) => {
    // Reset bounce indicators when scroll stops
    isAtTop.value = false;
    isAtBottom.value = false;
  },
});
```

**Replace ScrollView with Animated.ScrollView:**
```typescript
// FIND this in the render:
<ScrollView 
  ref={contentScrollRef}
  style={styles.content} 
  showsVerticalScrollIndicator={false}
  // ... other props
>

// REPLACE WITH:
<Animated.ScrollView 
  ref={contentScrollRef}
  style={styles.content} 
  showsVerticalScrollIndicator={false}
  onScroll={scrollHandler}
  scrollEventThrottle={16}
  bounces={true}
  bouncesZoom={false}
  alwaysBounceVertical={true}
  overScrollMode=\"always\"
  contentContainerStyle={{
    minHeight: '100%',
    paddingBottom: 20
  }}
>
```

---

### Phase 6: Add Bounce Animation to Individual Cards

**File: `app/index.tsx`**

**Update ReminderCard component to accept bounce animation:**

```typescript
// Add prop to pass scroll state
const ReminderCard = memo(({ 
  reminder, 
  listType,
  index  // ✅ ADD index prop
}: { 
  reminder: Reminder; 
  listType: 'active' | 'completed' | 'expired';
  index: number;  // ✅ ADD
}) => {
  const isActive = !reminder.isCompleted && !reminder.isExpired;
  const isExpired = reminder.isExpired;
  const isSelected = selectedReminders.has(reminder.id);
  
  // ✅ ADD bounce animation style
  const cardBounceStyle = useAnimatedStyle(() => {
    // Only apply bounce to first 3 cards at top or last 3 cards at bottom
    const shouldBounceTop = isAtTop.value && index < 3;
    const shouldBounceBottom = isAtBottom.value && index >= (activeReminders.length - 3);
    
    if (!shouldBounceTop && !shouldBounceBottom) {
      return { transform: [{ translateY: 0 }] };
    }
    
    // Stagger bounce effect based on index
    const staggerDelay = index * 30;
    const bounceOffset = shouldBounceTop ? -3 : 3;  // 3px bounce
    
    return {
      transform: [
        {
          translateY: withSpring(shouldBounceTop || shouldBounceBottom ? bounceOffset : 0, {
            damping: 15,
            stiffness: 150,
            mass: 0.5,
          })
        }
      ]
    };
  });
  
  return (
    <SwipeableRow 
      reminder={reminder}
      onSwipeRight={/* ... existing */}
      onSwipeLeft={/* ... existing */}
    >
      <Animated.View style={cardBounceStyle}>  {/* ✅ WRAP TouchableOpacity */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCardPress(reminder)}
          onLongPress={() => handleLongPress(reminder.id, listType)}
          delayLongPress={200}
          style={[
            styles.reminderCard,
            isSelected && styles.selectedCard
          ]}
          testID={`reminder-card-${reminder.id}`}
        >
          {/* ... existing card content ... */}
        </TouchableOpacity>
      </Animated.View>
    </SwipeableRow>
  );
}, /* ... existing memo comparison ... */);
```

**Update card rendering to pass index:**
```typescript
// FIND these sections in the render:
{activeReminders.map((reminder) => (
  <ReminderCard key={reminder.id} reminder={reminder} listType=\"active\" />
))}

// REPLACE WITH:
{activeReminders.map((reminder, index) => (
  <ReminderCard 
    key={reminder.id} 
    reminder={reminder} 
    listType=\"active\"
    index={index}  // ✅ ADD
  />
))}

// Do the same for completedReminders and expiredReminders
```

---

### Phase 7: Enhance SwipeableRow Exit Animation

**File: `components/SwipeableRow.tsx`**

**Update the animated container to have smoother exit:**

```typescript
return (
  <Animated.View 
    style={styles.container}
    layout={Layout.springify().damping(20).stiffness(300)}
    exiting={FadeOut.duration(250).withCallback((finished) => {
      // Optional: callback when animation finishes
      'worklet';
      if (finished) {
        console.log('Card exit animation complete');
      }
    })}
  >
    {/* ... rest of the component ... */}
  </Animated.View>
);
```

---

## Testing & Validation

### Test Case 1: Scroll Functionality
```
1. Open app with 10+ reminders
2. Scroll up and down smoothly
3. ✅ Expected: Scroll works without resistance or lag
4. ✅ Expected: Horizontal swipes still work
```

### Test Case 2: Card Removal Animation
```
1. Swipe a card left (delete) slowly
2. ✅ Expected: Card slides out smoothly
3. ✅ Expected: Cards below slide up to fill space (no jump)
4. ✅ Expected: No glitching or flickering
```

### Test Case 3: Bounce at Scroll Boundaries
```
1. Scroll to top of list
2. Try to scroll further up
3. ✅ Expected: Top 3 cards bounce slightly downward
4. Repeat at bottom
5. ✅ Expected: Bottom 3 cards bounce slightly upward
```

### Test Case 4: Rapid Card Removal
```
1. Quickly swipe 5 cards in succession
2. ✅ Expected: All animations complete smoothly
3. ✅ Expected: No crashes or layout breaks
```

---

## Key Configuration Summary

| Feature | Implementation | File |
|---------|---------------|------|
| Scroll conflict fix | `activeOffsetX`, `failOffsetY` | SwipeableRow.tsx |
| Remove LayoutAnimation | Delete all `configureLayoutAnimation()` calls | index.tsx |
| Fill-in animation | `Layout.springify()` | SwipeableRow.tsx |
| Card exit animation | `exiting={FadeOut}` | SwipeableRow.tsx |
| Scroll tracking | `useAnimatedScrollHandler` | index.tsx |
| Bounce effect | `withSpring` on translateY | index.tsx (ReminderCard) |
| Gesture priority | Pan gesture config | SwipeableRow.tsx |

---

## Common Pitfalls to Avoid

❌ **DON'T** mix LayoutAnimation with Reanimated  
✅ **DO** use only Reanimated for all animations

❌ **DON'T** remove cards immediately after swipe starts  
✅ **DO** wait 300ms for swipe animation to complete

❌ **DON'T** forget to add `activeOffsetX` and `failOffsetY`  
✅ **DO** configure gesture thresholds properly

❌ **DON'T** apply bounce to all cards  
✅ **DO** limit bounce to first/last 3 cards

❌ **DON'T** forget to import Animated from reanimated  
✅ **DO** use `react-native-reanimated` Animated component

---

## Final Implementation Checklist

- [ ] Added `activeOffsetX` and `failOffsetY` to Pan gesture
- [ ] Removed ALL `configureLayoutAnimation()` calls
- [ ] Added `Layout.springify()` to SwipeableRow container
- [ ] Added `exiting={FadeOut}` to SwipeableRow container
- [ ] Changed ScrollView to Animated.ScrollView
- [ ] Added `useAnimatedScrollHandler` for scroll tracking
- [ ] Added shared values for scroll state (scrollY, isAtTop, isAtBottom)
- [ ] Wrapped card content in Animated.View with bounce style
- [ ] Added index prop to ReminderCard
- [ ] Updated all card rendering to pass index
- [ ] Increased delay in completeReminder to 300ms
- [ ] Increased delay in handleDelete to 300ms
- [ ] Tested scroll, swipe, and bounce on device/simulator

---

**Implementation Order:**
1. Phase 1 (Scroll Fix) → Test scrolling works
2. Phase 2 (Remove LayoutAnimation) → Test no crashes
3. Phase 3 & 4 (Add Reanimated) → Test smooth card removal
4. Phase 5 & 6 (Bounce Effect) → Test boundary bounce
5. Phase 7 (Polish) → Final testing

