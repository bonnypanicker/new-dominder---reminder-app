# Debug Utilities Documentation

## Overview

This debug utility suite helps catch UI glitches, rendering issues, animation conflicts, and performance problems in the React Native app.

## Features

### 1. **Render Tracking**
- Detects excessive re-renders
- Measures render performance
- Warns on slow renders (>16ms for 60fps)

### 2. **Animation Conflict Detection**
- Detects mixed `useNativeDriver` animations on same node
- Prevents the crash: "Attempting to run JS driven animation on animated node that has been moved to 'native'"

### 3. **Layout Conflict Detection**
- Detects layout thrashing (many layout updates in short time)
- Warns on invalid layout dimensions
- Tracks layout update frequency

### 4. **State Mismatch Detection**
- Tracks state changes over time
- Compares expected vs actual state
- Maintains state history

### 5. **Performance Monitoring**
- Measures operation duration
- Tracks average, min, max times
- Warns on slow operations (>100ms)

## Usage

### Basic Usage

```typescript
import { useRenderTracking, performanceMonitor } from '@/utils/debugUtils';

function MyComponent() {
  // Track renders automatically
  useRenderTracking('MyComponent', { someProp: 'value' });

  // Track performance
  performanceMonitor.start('MyOperation');
  // ... do something
  performanceMonitor.end('MyOperation');

  return <View>...</View>;
}
```

### Animation Conflict Detection

```typescript
import { animationConflictDetector } from '@/utils/debugUtils';

// Register animations
animationConflictDetector.registerAnimation('node-1', 'slideAnim', true);  // Native
animationConflictDetector.registerAnimation('node-1', 'fadeAnim', true);   // Native
animationConflictDetector.registerAnimation('node-2', 'heightAnim', false); // JS

// Clean up when done
animationConflictDetector.unregisterAnimation('node-1', 'slideAnim');
```

### Layout Tracking

```typescript
import { layoutConflictDetector } from '@/utils/debugUtils';

<View
  onLayout={(e) => {
    const { width, height, x, y } = e.nativeEvent.layout;
    layoutConflictDetector.trackLayout('MyComponent', { width, height, x, y });
  }}
>
  {children}
</View>
```

### State Tracking

```typescript
import { stateMismatchDetector } from '@/utils/debugUtils';

// Track state changes
stateMismatchDetector.trackState('MyComponent', currentState, 'after-update');

// Compare state
stateMismatchDetector.compareState(
  'MyComponent',
  expectedState,
  actualState,
  'State mismatch after action'
);
```

## Global Access (Dev Mode Only)

In development mode, debug utilities are available globally:

```javascript
// In React Native Debugger or Chrome DevTools console
global.debugUtils.renderTracker.getStats('SwipeableRow');
global.debugUtils.performanceMonitor.getMetrics();
global.debugUtils.logSummary();
global.debugUtils.reset();
```

## Configuration

Edit `DEBUG_CONFIG` in `utils/debugUtils.ts`:

```typescript
export const DEBUG_CONFIG = {
  ENABLE_RENDER_TRACKING: __DEV__,
  ENABLE_ANIMATION_DEBUG: __DEV__,
  ENABLE_LAYOUT_DEBUG: __DEV__,
  ENABLE_PERFORMANCE_MONITORING: __DEV__,
  ENABLE_STATE_TRACKING: __DEV__,
  
  SLOW_RENDER_THRESHOLD: 16,       // ms
  VERY_SLOW_RENDER_THRESHOLD: 32,  // ms
  
  DETECT_LAYOUT_CONFLICTS: __DEV__,
  DETECT_ANIMATION_CONFLICTS: __DEV__,
};
```

## Common Issues Fixed

### 1. Animation Crash
**Error:** "Attempting to run JS driven animation on animated node..."

**Solution:** Separate native and JS animations into different containers
```typescript
// ❌ Bad - Mixed on same node
<Animated.View style={{ 
  transform: [{ translateX }],  // useNativeDriver: true
  height: heightAnim             // useNativeDriver: false
}}>

// ✅ Good - Separated
<Animated.View style={{ height: heightAnim }}>
  <Animated.View style={{ transform: [{ translateX }] }}>
    ...
  </Animated.View>
</Animated.View>
```

### 2. Excessive Re-renders
**Symptom:** Component renders many times

**Detection:** `[EXCESSIVE RENDERS] MyComponent has rendered 50 times!`

**Solution:** Check props/state changes, use `React.memo()`, optimize callbacks

### 3. Layout Thrashing
**Symptom:** Janky animations, poor performance

**Detection:** `[LAYOUT THRASHING] MyComponent has 15 layout updates in last second!`

**Solution:** Batch layout changes, use `LayoutAnimation`, avoid state updates during animation

### 4. Slow Renders
**Symptom:** App feels sluggish

**Detection:** `[SLOW RENDER] MyComponent took 45ms to render`

**Solution:** Profile component, split into smaller components, use virtualization

## Console Output Examples

### Render Tracking
```
[Render Count] SwipeableRow: 5 renders
[Render Warning] SwipeableRow took 18ms
[SLOW RENDER] SwipeableRow took 35ms to render (threshold: 32ms)
[EXCESSIVE RENDERS] SwipeableRow has rendered 50 times!
```

### Animation Conflicts
```
[ANIMATION CONFLICT] Node swipeable-123 has mixed useNativeDriver animations!
Animations:
  slideAnim: native
  fadeAnim: native
  heightAnim: JS
```

### Layout Issues
```
[LAYOUT THRASHING] Card-123 has 12 layout updates in last second!
[INVALID LAYOUT] Card-123 has invalid dimensions: {width: 0, height: -10}
```

### Performance
```
[SLOW OPERATION] SwipeAnimation-123 took 450ms
```

## API Reference

### RenderTracker
- `trackRender(componentName, props?)` - Track a render
- `getStats(componentName?)` - Get render statistics
- `reset()` - Clear tracking data
- `logSummary()` - Print summary to console

### AnimationConflictDetector
- `registerAnimation(nodeId, name, useNativeDriver)` - Register animation
- `unregisterAnimation(nodeId, name)` - Unregister animation
- `reset()` - Clear all tracking

### LayoutConflictDetector
- `trackLayout(componentId, layout)` - Track layout update
- `reset()` - Clear tracking data

### StateMismatchDetector
- `trackState(componentId, state, label?)` - Track state change
- `compareState(componentId, expected, actual, message?)` - Compare states
- `getHistory(componentId)` - Get state history
- `reset()` - Clear history

### PerformanceMonitor
- `start(label)` - Start timer
- `end(label)` - End timer and record
- `getMetrics(label?)` - Get performance metrics
- `reset()` - Clear all metrics
- `logSummary()` - Print summary

## Best Practices

1. **Always clean up**: Unregister animations, clear trackers when components unmount
2. **Use descriptive labels**: Makes debugging easier
3. **Check console regularly**: Debug utilities output useful warnings
4. **Profile in production mode**: Some issues only appear in release builds
5. **Use global access**: Quick debugging in dev tools

## Troubleshooting

### Debug utils not working?
1. Ensure `__DEV__` is true (development mode)
2. Check `DEBUG_CONFIG` flags
3. Import utilities correctly

### Too much console output?
1. Disable specific trackers in `DEBUG_CONFIG`
2. Increase thresholds
3. Use `reset()` to clear historical data

### Performance impact?
- Debug utilities only run in `__DEV__` mode
- Production builds have zero overhead
- Safe to leave in codebase

## Examples

See `components/SwipeableRow.tsx` for a complete example of using all debug utilities.
