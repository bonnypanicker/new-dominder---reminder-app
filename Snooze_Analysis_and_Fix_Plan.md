# Snooze Functionality Analysis and Fix Plan

## 1. Current State Analysis

### 1.1 Overview
The current implementation of "Ringer mode" (full-screen intent) reminders exhibits critical synchronization issues between the Native Android layer and the JavaScript layer, specifically for "Every X minute" repeating reminders.

### 1.2 Identified Issues & Root Causes

#### Issue 1: False "Missed Alarm" & Duplicate Triggers (2:01 PM firing while 2:00 PM is snoozed)
*   **Symptom**: User snoozes a 2:00 PM reminder (Every 1 min) for 5 minutes. The app triggers again at 2:01 PM, 2:02 PM, etc. Eventually, a "Missed Alarm" notification appears for the original 2:00 PM or subsequent triggers.
*   **Root Cause**:
    *   **Double Scheduling**: When `ALARM_SNOOZE` occurs, `AlarmActionBridge.kt` (Native) immediately calls `scheduleNextOccurrenceIfNeeded`. This schedules the next interval (2:01 PM) *in parallel* with the "Shadow Snooze" (2:05 PM).
    *   **JS Redundancy**: The JS layer (`rescheduleReminderById`) *also* advances the series immediately upon snoozing, reinforcing the schedule for 2:01 PM.
    *   **Missed Notification**: The "Missed Alarm" likely originates from the *backgrounded* 2:01 PM trigger (which the user ignores while thinking they snoozed) timing out after 5 minutes in `AlarmActivity`.

#### Issue 2: Incorrect "Ended" Status
*   **Symptom**: Reminder card shows "Ended" even though a snooze is pending.
*   **Root Cause**:
    *   **Premature Series Advancement**: Both Native and JS logic calculate the "Next Reminder Date" based on the *original* schedule (2:00 PM -> 2:01 PM) without considering the snooze window.
    *   If the "Until" condition is tight (e.g., 3 occurrences), the system might calculate that the series has finished based on the rapid-fire (but suppressed/ignored) triggers or the calculated "future" dates, marking the parent reminder as completed/ended before the snooze even fires.

#### Issue 3: Shadow Completion Not Recorded
*   **Symptom**: Pressing "Done" on the snoozed reminder (2:05 PM) does not increment the counter or appear in history.
*   **Root Cause**:
    *   **ID Mismatch**: The Native layer creates a shadow reminder with ID `${reminderId}_snooze`. When "Done" is pressed, the JS layer receives `alarmDone` with this shadow ID.
    *   **Lookup Failure**: `reminder-scheduler.ts` tries to find a reminder with ID `${reminderId}_snooze` in the database. It fails because only the original ID exists. The operation aborts without updating history or counters.

### 1.3 Discrepancies between Native and JS
*   **Trigger Count**: Native (`DoMinderReminderMeta`) increments `actualTriggerCount` for the *Shadow ID* when the snooze fires, but the JS side tracks the *Parent ID*. They drift apart.
*   **Next Trigger Calculation**: Native calculates next trigger in `AlarmActionBridge` completely independently of JS `calculateNextReminderDate`. Any logic mismatch (e.g., handling of snooze windows) causes desync.

## 2. Technical Specification (Plugin-Based Solution)

### 2.1 Strategy
We will modify `with-alarm-module.js` to inject updated Kotlin code and update `reminder-scheduler.ts` to handle shadow IDs correctly. **No direct Android file edits.**

### 2.2 Native Logic Changes (`AlarmActionBridge.kt`)
1.  **Suppress Next Occurrence on Snooze**:
    *   In `ALARM_SNOOZE` handler: **STOP** calling `scheduleNextOccurrenceIfNeeded` for repeating reminders.
    *   Only schedule the Shadow Snooze.
    *   This effectively "pauses" the series until the snooze is resolved.
2.  **Resume Series on Shadow Completion**:
    *   In `ALARM_DONE` handler:
        *   If the ID ends with `_snooze`:
            *   Strip suffix to get `originalId`.
            *   Call `scheduleNextOccurrenceIfNeeded(originalId)`.
            *   **CRITICAL**: Ensure the next trigger time is calculated relative to the *Snooze Completion Time* (2:05 PM) rather than the original schedule (2:00 PM), effectively shifting the series to respect the user's "silence" period.

### 2.3 JS Logic Changes (`reminder-scheduler.ts`)
1.  **Handle Shadow IDs**:
    *   In `markReminderDone`, check if `reminderId` ends with `_snooze`.
    *   If so, strip it to find the parent reminder.
2.  **Defer Series Advancement**:
    *   In `rescheduleReminderById` (Snooze):
        *   Do **not** advance the series (`nextReminderDate`) for the parent reminder yet.
        *   Set a "Snoozed State" (e.g., `pendingShadowSnoozeUntil`) to keep the UI active but waiting.
3.  **Sync Counters**:
    *   When Shadow Snooze is Done, force an increment of the parent reminder's `occurrenceCount`.

## 3. Implementation Roadmap

### Step 1: JS Layer Fixes (`services/reminder-scheduler.ts`)
*   Modify `markReminderDone` to handle `_snooze` suffix.
*   Modify `rescheduleReminderById` to prevent premature series advancement for repeating reminders.

### Step 2: Native Layer Fixes (`plugins/with-alarm-module.js`)
*   Update `AlarmActionBridge.kt` injection:
    *   Remove `scheduleNextOccurrenceIfNeeded` call inside `ALARM_SNOOZE`.
    *   Ensure `ALARM_DONE` handles `_snooze` IDs by resuming the parent series.
    *   Update `calculateNextTriggerTime` to support "Resume from Snooze" logic (using current time/snooze time as baseline).

### Step 3: UI Updates (Optional but Recommended)
*   Ensure `ReminderCard` displays "Snoozed until X" instead of "Ended" when in the `pendingShadowSnooze` state.

## 4. Testing Scenarios

| Scenario | Action | Expected Result |
| :--- | :--- | :--- |
| **Snooze Suppression** | Trigger 2:00 PM (Every 1m). Snooze 5m. | No triggers at 2:01, 2:02, 2:03, 2:04. |
| **Snooze Display** | Check Active Reminders Page. | Card shows "Snoozed until 2:05 PM". NOT "Ended". |
| **Shadow Execution** | Wait for 2:05 PM. | Full-screen alarm triggers. |
| **Shadow Completion** | Press "Done" at 2:05 PM. | History logs completion. Count increments. Series resumes (Next: 2:06 PM). |
| **Missed Notification** | Wait during snooze. | No "Missed Alarm" notification for the suppressed 2:01-2:04 intervals. |

## 5. Quality Criteria
*   **No Time Slipping**: The series resumes correctly respecting the interval *after* the snooze.
*   **No Duplicates**: Only one alarm (the shadow snooze) is active during the snooze window.
*   **Sync**: JS and Native occurrence counts match exactly after the snooze cycle.
*   **Persistence**: Killing the app during the 5-minute snooze does not lose the shadow alarm or the parent series state.

## 6. Verification Checklist
- [ ] `git status` confirms changes in `plugins/` and `services/`.
- [ ] Prebuild runs successfully (`npx expo prebuild`).
- [ ] Android Build succeeds (`npx expo run:android`).
- [ ] "Every 1 min" test passes the suppression check.
- [ ] History/Counter increments correctly after shadow snooze.
