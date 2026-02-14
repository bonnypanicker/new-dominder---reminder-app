## Bug Summary

When the system is in **dark mode** and the user switches the in-app theme from **\"System Default\"** to **\"Light\"**, the native `RingtonePickerActivity` (Ringer Mode Tone page) does not immediately reflect the light theme on the first visit. Upon going back and revisiting, the page displays correctly in light. However, when switching back to **\"System Default\"**, the app stays stuck in **light theme** even though the system is in dark mode. The theme only corrects itself after opening and closing the native page again.

---

## Root Cause

**The fundamental problem is the misuse of `AppCompatDelegate.setDefaultNightMode()` - a process-wide global static setting - in secondary native activities (`RingtonePickerActivity`, `AlarmActivity`), combined with `saveThemeMode()`/`saveThemePreference()` only writing to SharedPreferences without updating the runtime night mode.**

This creates a two-way contamination between the native Android theme system and React Native's `useColorScheme()` hook.

### Key Architecture Points

| Component | What it does |
|---|---|
| `theme-provider.tsx` | Reads `themeMode` from settings, uses `useColorScheme()` for system mode, computes `isDark` |
| `saveThemePreference(isDark)` | **Only writes** `user_theme_dark` boolean to SharedPreferences |
| `saveThemeMode(mode)` | **Only writes** `user_theme_mode` string to SharedPreferences |
| `RingtonePickerActivity.onCreate()` | Reads SharedPreferences, calls **`AppCompatDelegate.setDefaultNightMode()`** |
| `AlarmActivity.onCreate()` | Same pattern as above |
| `MainActivity.onCreate()` | Same pattern as above |
| `useColorScheme()` (React Native) | Returns current color scheme based on the **process-level** `AppCompatDelegate` configuration |

### The Core Problem

`AppCompatDelegate.setDefaultNightMode()` is a **singleton global static** that controls the night mode for the **entire application process** - not just the calling activity. When `RingtonePickerActivity` calls it, it changes the night mode for `MainActivity` (React Native host) too. This directly affects what `useColorScheme()` returns in React Native.

Meanwhile, `saveThemeMode()` and `saveThemePreference()` **only persist to SharedPreferences** - they never call `AppCompatDelegate.setDefaultNightMode()`. So between native activity creations, the process-level night mode becomes **stale** and out-of-sync with the user's preference.

---

## Detailed Bug Trace

### Step-by-step reproduction:

#### 1. Initial state: System dark mode ON, app themeMode = 'system'

- `MainActivity.onCreate()` called `AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_FOLLOW_SYSTEM)`
- `useColorScheme()` returns `'dark'` (correct - system is dark)
- `isDark = themeMode === 'system' && systemScheme === 'dark'` = **true**
- App renders dark theme. **Correct.**

#### 2. User switches from 'system' to 'light' in Settings

- `theme-provider.tsx` fires:
  - `themeMode = 'light'` -> `isDark = false` (doesn't depend on `useColorScheme()` for explicit light)
  - Calls `AlarmModule.saveThemeMode('light')` -> SharedPrefs: `user_theme_mode = 'light'`
  - Calls `AlarmModule.saveThemePreference(false)` -> SharedPrefs: `user_theme_dark = false`
- **`AppCompatDelegate` is still `MODE_NIGHT_FOLLOW_SYSTEM`** (nobody called `setDefaultNightMode()`)
- JS renders light theme. **Correct.**

#### 3. User opens Ringer Mode Tone page (RingtonePickerActivity)

```kotlin
// RingtonePickerActivity.onCreate():
val prefs = getSharedPreferences(\"DoMinderSettings\", Context.MODE_PRIVATE)
val mode = when (prefs.getString(\"user_theme_mode\", \"system\")) {
    \"light\" -> AppCompatDelegate.MODE_NIGHT_NO  // <-- Gets this
    ...
}
AppCompatDelegate.setDefaultNightMode(mode) // MODE_NIGHT_NO
```

- Reads SharedPrefs -> `user_theme_mode = 'light'`
- Calls `AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_NO)`
- **This changes the PROCESS-WIDE night mode from `MODE_NIGHT_FOLLOW_SYSTEM` to `MODE_NIGHT_NO`**
- **This poisons `useColorScheme()` in React Native to return `'light'` regardless of system setting**
- RingtonePickerActivity shows light theme. **Correct for this page.**

#### 4. User goes back to main app, switches from 'light' to 'system' in Settings

- `theme-provider.tsx` fires:
  - `themeMode = 'system'`
  - `systemScheme = useColorScheme()` -> **returns `'light'`** because `AppCompatDelegate` is still `MODE_NIGHT_NO`!
  - `isDark = themeMode === 'system' && systemScheme === 'dark'` = `'system' && 'light' === 'dark'` = **FALSE!**
  - Calls `AlarmModule.saveThemeMode('system')` -> SharedPrefs updated
  - Calls `AlarmModule.saveThemePreference(false)` -> SharedPrefs: `user_theme_dark = false` (because isDark computed as false!)
- **App stays in LIGHT theme even though system is dark!** **BUG!**

#### 5. User opens Ringer Mode Tone page again

```kotlin
// RingtonePickerActivity.onCreate():
val mode = when (prefs.getString(\"user_theme_mode\", \"system\")) {
    else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM  // <-- Gets this
}
AppCompatDelegate.setDefaultNightMode(mode) // MODE_NIGHT_FOLLOW_SYSTEM
```

- Reads SharedPrefs -> `user_theme_mode = 'system'`
- Calls `AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_FOLLOW_SYSTEM)`
- **Process mode restored to follow system -> `useColorScheme()` now returns `'dark'`**
- When going back, `isDark` recomputes correctly -> **theme fixes itself**

---

## Why Previous Fixes Failed

Previous fixes likely focused on:
1. Adjusting SharedPreferences read/write timing
2. Changing the order of `setDefaultNightMode()` vs `super.onCreate()`
3. Adding the `user_theme_mode` string alongside the legacy `user_theme_dark` boolean

None of these address the **actual problem**: `AppCompatDelegate.setDefaultNightMode()` is a process-wide call that contaminates `useColorScheme()` in React Native.

---

## The Fix

### Primary Fix: Use `delegate.localNightMode` instead of `AppCompatDelegate.setDefaultNightMode()` in secondary activities

In **`RingtonePickerActivity.kt`** and **`AlarmActivity.kt`**, replace the global call with a per-activity local call:

```kotlin
// BEFORE (process-wide - CAUSES THE BUG):
AppCompatDelegate.setDefaultNightMode(mode)

// AFTER (per-activity - ISOLATED, no process contamination):
delegate.localNightMode = mode
```

`delegate.localNightMode` sets the night mode **only for the specific activity**, without affecting the process-wide `AppCompatDelegate.getDefaultNightMode()` or the `MainActivity` configuration. This means `useColorScheme()` in React Native remains unaffected.

#### Changes in `plugins/with-alarm-module.js`:

**RingtonePickerActivity.kt** (around line ~2024-2040):
```kotlin
// REPLACE THIS:
override fun onCreate(savedInstanceState: Bundle?) {
    val prefs = getSharedPreferences(\"DoMinderSettings\", Context.MODE_PRIVATE)
    
    if (prefs.contains(\"user_theme_mode\")) {
        val mode = when (prefs.getString(\"user_theme_mode\", \"system\")) {
            \"dark\" -> AppCompatDelegate.MODE_NIGHT_YES
            \"light\" -> AppCompatDelegate.MODE_NIGHT_NO
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        AppCompatDelegate.setDefaultNightMode(mode)  // <-- PROBLEM
    } 
    else if (prefs.contains(\"user_theme_dark\")) {
        val isDark = prefs.getBoolean(\"user_theme_dark\", false)
        val mode = if (isDark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
        AppCompatDelegate.setDefaultNightMode(mode)  // <-- PROBLEM
    }
    else {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)  // <-- PROBLEM
    }
    super.onCreate(savedInstanceState)
    ...
}

// WITH THIS:
override fun onCreate(savedInstanceState: Bundle?) {
    val prefs = getSharedPreferences(\"DoMinderSettings\", Context.MODE_PRIVATE)
    
    val nightMode = if (prefs.contains(\"user_theme_mode\")) {
        when (prefs.getString(\"user_theme_mode\", \"system\")) {
            \"dark\" -> AppCompatDelegate.MODE_NIGHT_YES
            \"light\" -> AppCompatDelegate.MODE_NIGHT_NO
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
    } else if (prefs.contains(\"user_theme_dark\")) {
        val isDark = prefs.getBoolean(\"user_theme_dark\", false)
        if (isDark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
    } else {
        AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
    }
    
    delegate.localNightMode = nightMode  // <-- FIX: per-activity only
    super.onCreate(savedInstanceState)
    ...
}
```

**AlarmActivity.kt** (around line ~1298-1317): Apply the same change:
```kotlin
// REPLACE:
AppCompatDelegate.setDefaultNightMode(mode)

// WITH:
delegate.localNightMode = nightMode
```

### Secondary Fix: Update `saveThemeMode()` to sync `AppCompatDelegate` at runtime

In **AlarmModule.kt** `saveThemeMode()` method, also update the global `AppCompatDelegate` so `useColorScheme()` stays in sync when theme changes from the JS side:

```kotlin
@ReactMethod
fun saveThemeMode(mode: String, promise: Promise? = null) {
    try {
        val prefs = reactContext.getSharedPreferences(\"DoMinderSettings\", Context.MODE_PRIVATE)
        prefs.edit().putString(\"user_theme_mode\", mode).apply()
        
        // Sync process-level night mode so useColorScheme() stays accurate
        val nightMode = when (mode) {
            \"dark\" -> AppCompatDelegate.MODE_NIGHT_YES
            \"light\" -> AppCompatDelegate.MODE_NIGHT_NO
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        
        val activity = reactContext.currentActivity
        if (activity != null) {
            activity.runOnUiThread {
                AppCompatDelegate.setDefaultNightMode(nightMode)
            }
        }
        
        DebugLogger.log(\"AlarmModule: Saved theme mode: ${mode}\")
        promise?.resolve(true)
    } catch (e: Exception) {
        DebugLogger.log(\"AlarmModule: Error saving theme mode: ${e.message}\")
        promise?.reject(\"ERROR\", e.message, e)
    }
}
```

> **IMPORTANT NOTE on Secondary Fix**: Calling `AppCompatDelegate.setDefaultNightMode()` from `saveThemeMode()` may trigger `MainActivity` recreation. This is normally safe because React Native can handle activity recreation, but test this carefully. The **Primary Fix alone** (using `delegate.localNightMode` in secondary activities) is sufficient to fix the reported bug and is the safer change.

### Optional: `saveThemePreference()` cleanup

`saveThemePreference(isDark)` saves the **computed** `isDark` boolean, which can be wrong if `useColorScheme()` is already poisoned. After the primary fix, this becomes less of an issue, but for safety:

- Consider removing `saveThemePreference()` calls entirely since `saveThemeMode()` (which stores the user's actual choice: 'system'/'light'/'dark') is the source of truth
- Or at minimum, ensure native code always reads `user_theme_mode` first and only uses `user_theme_dark` as a legacy fallback (already the case)

---

## Files to Modify

| File | Change |
|---|---|
| `plugins/with-alarm-module.js` | **RingtonePickerActivity.kt**: Replace `AppCompatDelegate.setDefaultNightMode(mode)` with `delegate.localNightMode = nightMode` in `onCreate()` |
| `plugins/with-alarm-module.js` | **AlarmActivity.kt**: Replace `AppCompatDelegate.setDefaultNightMode(mode)` with `delegate.localNightMode = nightMode` in `onCreate()` |
| `plugins/with-alarm-module.js` | **AlarmModule.kt** `saveThemeMode()`: Add `AppCompatDelegate.setDefaultNightMode()` call on UI thread (optional, for extra safety) |
| `plugins/with-alarm-module.js` | **MainActivity.kt**: Keep `AppCompatDelegate.setDefaultNightMode()` as-is (this is the main activity and should set the process default) |

> **Do NOT change `MainActivity.kt`** - it should continue using `AppCompatDelegate.setDefaultNightMode()` since it's the process owner and its mode should match what `useColorScheme()` reports.

---

## After the Plugin Changes

Since these are Expo config plugins that generate native code during `npx expo prebuild`, you need to:

1. Make the changes in `plugins/with-alarm-module.js` (the Kotlin template strings)
2. Run `npx expo prebuild --clean` to regenerate the `android/` directory
3. Rebuild the app with `npx expo run:android` or `eas build`

---

## Test Scenarios

After applying the fix, verify:

| # | Scenario | Expected |
|---|---|---|
| 1 | System dark + app 'system' -> open Ringer Tone page | Dark theme on native page |
| 2 | System dark + switch to 'light' -> open Ringer Tone page | Light theme on native page (first visit) |
| 3 | From #2, go back -> switch to 'system' | App immediately shows dark (system is dark) |
| 4 | From #3, open Ringer Tone page | Dark theme on native page |
| 5 | System light + app 'system' -> switch to 'dark' -> open Ringer Tone page | Dark theme on native page |
| 6 | From #5, go back -> switch to 'system' | App immediately shows light (system is light) |
| 7 | Rapid toggle: 'system' -> 'light' -> 'dark' -> 'system' -> open Ringer Tone page | Always matches current resolved theme |
| 8 | Open AlarmActivity (high priority reminder fires) | Correct theme, doesn't contaminate main app |

---

## Why This Fix Works

- `delegate.localNightMode` is **per-activity** and does not modify the process-wide `AppCompatDelegate.getDefaultNightMode()` static field
- `useColorScheme()` in React Native reads from the `MainActivity`'s configuration, which is determined by the **process-level** `AppCompatDelegate.getDefaultNightMode()` - since secondary activities no longer modify this, it stays accurate
- The `Theme.Material3.DayNight.NoActionBar` and `Theme.RingtonePicker` (parent: `DayNight`) themes will correctly respond to `delegate.localNightMode` per-activity
- `MaterialColors.getColor()` in `RingtonePickerActivity` will resolve attributes based on the local night mode configuration
"
