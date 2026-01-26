
# Snooze (Full‑Screen Intent – Ringer Mode) Not Scheduling When App Is Closed

## Observed Behavior
- Snooze (e.g., 5 minutes) from a **full‑screen intent** works only if the app is opened later.
- When the app is **closed/killed**, the snoozed reminder is **not scheduled immediately**.
- The reminder gets scheduled **only when the app is reopened**.

## Root Cause (Single Word Summary)
**JS‑dependent scheduling**

## Detailed Cause
- The snooze action from the full‑screen intent triggers logic that relies on the **JavaScript runtime / React Native layer**.
- When the app is closed or killed, the JS engine is **not running**, so:
  - Snooze scheduling logic does not execute.
  - The new alarm is not registered with the system.
- When the app is opened again, JS initializes, pending snooze logic runs, and the reminder finally gets scheduled.
- This indicates the snooze path is **not handled fully in native background‑safe code**.

## Why It Affects Full‑Screen Intent (Ringer Mode)
- Full‑screen intent is delivered by the system correctly.
- However, the **snooze action handler** depends on app process / JS availability.
- In killed state, no background‑safe scheduler (AlarmManager / WorkManager) is invoked.

## Correct Fix Direction
- Move snooze scheduling to **native code only**:
  - Schedule snoozed alarms directly via **AlarmManager** (or WorkManager for API 31+ reliability).
  - Do not rely on JS callbacks or app lifecycle events.
- Ensure snooze scheduling runs even when:
  - App is in background
  - App is force‑closed
  - App process is dead

## Key Android Concepts Involved
- Full‑screen intent ✔️
- AlarmManager / exact alarms ✔️
- Process death handling ✔️
- JS bridge ❌ (for snooze scheduling)

## Conclusion
The issue is **not a notification bug**.
It is a **lifecycle + architecture issue** where snooze scheduling depends on the app being open.
