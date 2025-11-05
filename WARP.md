# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project summary
- Expo + React Native app using Expo Router. Android native code is added via custom Expo config plugins under plugins/ that inject Kotlin sources and AndroidManifest entries for a full-screen alarm flow.
- Data is persisted in AsyncStorage; React Query provides data fetching/caching and invalidation.
- Notifications and alarms are handled via Notifee with a native Android AlarmModule for high-priority “ringer” alarms; JS fallbacks exist when native is unavailable.

Common commands
- Install dependencies
  ```bash path=null start=null
  npm install
  ```
- Start the app (Expo dev server with tunnel via rork wrapper)
  ```bash path=null start=null
  npm run start
  ```
- Web dev server
  ```bash path=null start=null
  npm run start-web
  ```
- Android (prebuild + run in a native project)
  ```bash path=null start=null
  npm run android
  ```
- iOS (prebuild + run; only on macOS)
  ```bash path=null start=null
  npm run ios
  ```
- Lint
  ```bash path=null start=null
  npm run lint
  ```
- Type-check (no script defined)
  ```bash path=null start=null
  npx tsc --noEmit
  ```
- EAS builds (profiles defined in eas.json)
  ```bash path=null start=null
  npx eas build -p android --profile preview
  npx eas build -p android --profile production
  ```
- Tests
  - No test runner or scripts are configured in package.json.

Architecture overview
- Routing and app shell
  - expo-router under app/: _layout.tsx wires providers (QueryClientProvider, ThemeProvider, ReminderEngineProvider, ErrorBoundary), sets up Notifee foreground handlers, device event listeners, and initial-notification processing. Screens include index.tsx (reminders list + CRUD), settings.tsx, alarm.tsx (full-screen in-app alarm UI), notifications-debug.tsx, +not-found.tsx.
- State, data, and persistence
  - hooks/reminder-store.ts exposes React Query hooks (useReminders, useAdd/Update/DeleteReminder, bulk ops) backed by services/reminder-service.ts which reads/writes AsyncStorage (key dominder_reminders) and coordinates with notificationService to cancel/reschedule when times change.
  - hooks/settings-store.ts stores user settings in AsyncStorage (key dominder_settings), with side-effects to initialize or cancel notifications via notificationService.
- Notifications, alarms, and scheduling
  - hooks/notification-service.ts is the main facade over Notifee: creates channels, schedules trigger notifications, cancels notifications, and, on Android, prefers NativeModules.AlarmModule.scheduleAlarm for high-priority alarms; falls back to Notifee when native is unavailable.
  - services/channels.ts defines and ensures channel IDs (standard-v2, silent-v2, alarm-v2).
  - services/reminder-scheduler.ts implements core actions: rescheduleReminderById (snooze) and markReminderDone, updating model state and re-scheduling next occurrences via services/reminder-utils.ts.
  - index.js registers a Notifee background event handler for action presses (done/snooze) and imports ./services/headless-task to register a headless task (RescheduleAlarms) that re-schedules reminders when the app process is restarted.
  - hooks/useCompletedAlarmSync.ts polls Android SharedPreferences via AlarmModule to reconcile “done”/“snooze” actions performed while RN wasn’t active, then applies them through reminder-scheduler and clears the pending entries.
- Native Android integration (via Expo config plugins)
  - plugins/with-alarm-module.js and plugins/with-alarm-manifest.js inject:
    - Kotlin sources (plugins/templates/android/alarm/*) including AlarmActivity and AlarmPackage/Module.
    - AndroidManifest entries: full-screen AlarmActivity, permissions (USE_FULL_SCREEN_INTENT, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM), and broadcast wiring for alarm actions.
  - plugins/with-fullscreen-alarm.js further ensures MainActivity wake flags and USE_FULL_SCREEN_INTENT permission.
  - app.json references these plugins and sets Android build properties (Kotlin 2.0.21, SDK 35). Expo prebuild or expo run:android materializes the native project and applies these modifications.
- Utilities and UI
  - services/reminder-utils.ts computes the next occurrence for repeat modes (none/daily/weekly/monthly/yearly/every/custom).
  - components/* contains UI pieces such as PrioritySelector, CustomizePanel, Toast used by app/index.tsx.
- Tooling and module resolution
  - Babel: babel-plugin-module-resolver maps '@' to project root; tsconfig.json mirrors this path alias. metro.config.js adds cjs to resolver extensions. eslint.config.js uses eslint-config-expo/flat and ignores dist/*.

Notes for contributors and agents
- High-priority “ringer” reminders prefer the native AlarmModule path (full-screen, wake-screen behavior). If you’re testing in Expo Go or web, that native path won’t be available; Notifee fallback will be used instead.
- For Android exact alarms, the app requests SCHEDULE_EXACT_ALARM via Notifee APIs and plugins; verify system permission when testing ringer alarms.
- The notifications-debug screen (app/notifications-debug.tsx) provides a basic harness for validating permission/channel/trigger behavior in a built app.
