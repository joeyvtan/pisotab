# Debug Report — 2026-04-18

---

## Bug 1 — xhr poll error / No sync between app and dashboard

### Symptom
- Tablet shows: `● ConnectError: io.socket.engineio.client.EngineIOException: xhr poll error`
- Manually starting/ending session in dashboard has no effect on tablet

### Root Cause
Network changed. Old PC IP: `192.168.1.36`. New PC IP: `192.168.100.61`.
- Tablet Setup still has `http://192.168.1.36:4000` — host unreachable on new network
- Backend `.env` still has `mqtt://192.168.1.36:1883` — MQTT broker also unreachable
- Socket.IO connection fails immediately → all dashboard commands are never received

### Fix
- Update `.env`: `MQTT_BROKER_URL=mqtt://192.168.100.61:1883`
- Restart backend and aedes broker
- Update tablet Setup URL to `http://192.168.100.61:4000` → Save

---

## Bug 2 — Timer counts down on fresh app open without inserting coins

### Symptom
App opens directly to the active countdown timer with no session started from dashboard or coin

### Root Cause
Factory reset was incomplete OR APK was reinstalled over existing data without clearing app storage.
The local Room DB still contains a row with `status = 'active'` from previous testing session.
`MainViewModel.init` queries Room DB on startup → finds the stale active session → emits
`SessionState.Active` → UI shows timer immediately.

The backend DB confirms zero active sessions — so the stale session is local-only.
The timer counts down from whatever `time_remaining_secs` was last saved to Room DB.

This is a data integrity issue: local DB and backend DB are out of sync.

### Root Fix
On app startup, `MainViewModel.init` must validate the local session against the backend.
If backend returns 404 for the local session ID, mark it ended locally.

---

## Bug 3 — "Only alarm during active session" toggle not working correctly

### Symptom (original — fixed)
3. Alarm triggered during session was silently killed when session ended

### Root Cause (original — fixed)
`AntiTheftManager.start()` internally called `stop()` which always called `stopAlarm()`.
Every session state change silently killed any active alarm before re-registering receivers.

### Fix (applied)
Split `stop()` into `unregisterReceivers()` (cleanup only) and `stop()` (full shutdown).
`start()` calls `unregisterReceivers()` instead of `stop()`.

---

## Bug 4 — Anti-theft alarm toggle state not applied until next session state change

### Symptom
1. Toggle OFF (always alarm) → go back to main screen, no session → charger/wifi removed → **no alarm**
2. Toggle ON (session only) → go back to main screen with receivers still registered → **alarm fires with no session**
3. Alarm starts working correctly only AFTER a session is started/ended (next state change)

### Root Cause
`startOrStopAlarm(sessionActive)` is ONLY called from the state collector — it fires when
`sessionState` changes. After returning from SetupActivity with updated prefs:

- `onResume()` does NOT call `startOrStopAlarm`
- Session state has not changed (still Idle or still Active)
- State collector never re-fires → alarm state is never re-evaluated with new prefs

**Toggle OFF scenario (no session → no alarm):**
1. App starts → Idle → `startOrStopAlarm(false)` → default `sessionOnly=true` → `stop()` → no receivers
2. User opens Setup → turns session_only OFF → saves → returns
3. `onResume()` fires but does NOT re-evaluate alarm
4. State still Idle → collector silent → receivers never registered
5. Charger unplugged → no BroadcastReceiver → no alarm ✗

Alarm only works after session starts because that is the first state change that reads the new pref.

**Toggle ON scenario (no session → alarm still fires):**
1. Session was active, receivers registered, alarm working
2. User opens Setup → turns session_only ON → saves → returns
3. `onResume()` fires but does NOT call `stop()` to unregister receivers
4. Receivers remain registered → charger unplugged → alarm fires with no session ✗

### Root Fix
`onResume()` must re-evaluate alarm state using current prefs and current session state.
This ensures any pref change made in SetupActivity is applied immediately on return.

---

---

## Bug 10 — Timer auto-starts on app open; keeps restarting when admin presses Start after timer ends

### Symptom
1. App opens → timer already counting down with no session started (coin or dashboard)
2. Session expires → Insert coin screen shows correctly → admin presses Start from dashboard
   → localhost immediately shows session as "ended" → app keeps restarting the timer on every expiry

### Root Cause

**Cause A — `syncFromDb()` races against the async DB cleanup → infinite restart loop**

`TimerService.onSessionExpired()` launches cleanup on a separate `CoroutineScope(Dispatchers.IO)`:
```
CoroutineScope(Dispatchers.IO).launch {
    db.sessionDao().updateStatus(activeId, "ended")  // async — not done yet
    ...
}
startActivity(MainActivity)   // fires immediately
stopSelf()
```
`startActivity(MainActivity)` → `onResume()` → `vm.syncFromDb()` runs BEFORE the IO coroutine
has had a chance to write "ended" to the DB. `getActiveSession()` returns the old session with
`status='active', timeRemainingSecs=0` (the last value written by the timer loop).

`syncFromDb()` emits `SessionState.Active(timeRemainingSecs=0)` → `showActive(0)` →
`ACTION_START(durationSecs=0)` → `startTimer()` → `while(0 > 0)` → loop exits immediately →
`onSessionExpired()` again → `startActivity(MainActivity)` → `onResume()` → same stale DB read
→ **infinite loop**. `prefs.activeSessionId` is never cleared before this sequence, so there is
no fast synchronous signal that the session is truly over.

**Cause B — Stale `cmd:end` echo kills newly started sessions (SocketManager carries no session ID)**

Each `onSessionExpired()` iteration calls `api.endSession(activeId)`. The backend processes
`POST /api/sessions/:id/end` and **echoes `cmd:end` back to the device** (sessions.js line 136).
When the admin presses Start → new session created → `cmd:start` arrives → `vm.startSession(new)`.
Then the delayed `cmd:end` echo from the previous expiry arrives at the socket.

`SocketManager.onEndSession: (() -> Unit)?` carries **no session ID**. The handler calls
`vm.endSession()` which blindly reads `prefs.activeSessionId` (now the NEW session ID) and ends
the brand new session. Dashboard shows "ended" immediately. The app loop continues.

### Root Fix

**Fix A — Clear `prefs.activeSessionId = ""` synchronously in `onSessionExpired()` before launching MainActivity.**
Then guard `syncFromDb()` and `init` with `if (prefs.activeSessionId.isEmpty()) → Idle` so they
never restore a session whose ID has already been cleared.

**Fix B — Pass `session_id` through the full `cmd:end` chain and use `endSessionById()` in the ViewModel.**
`endSessionById()` checks the incoming ID against `prefs.activeSessionId` inside its coroutine
(serialized after any in-flight `startSession`). If IDs differ it is a stale echo → ignored.

---

## Bug 9 — Back/Home/Recents accessible on session expired screen

### Symptom
- Session ends → session expired screen (LockScreenActivity) appears
- User can press Back, Home, or swipe to Recents to leave the app
- Device is NOT locked — full navigation is accessible from the expired screen

### Root Cause

**`LockScreenActivity.onCreate()` never calls `startLockTask()`.**

`onKeyDown() = true` and `onBackPressed()` overrides only intercept **hardware key events**
at the activity level. They cannot block:
- Swipe-up gesture navigation (Android 10+)
- System navigation bar buttons (home, recents)
- Any navigation that goes through the system UI layer

Only **lock task mode** (`startLockTask()`) truly prevents all navigation by putting the device
into a restricted mode at the OS level. Without it, the session expired screen is a UI-only
overlay with no actual enforcement.

**Secondary root cause: LockScreenActivity is an unnecessary intermediary.**

The session expired screen exists solely to show "time's up" and auto-dismiss to the Idle
screen after a delay. But:
- It has no real security (no lock task mode → navigation accessible)
- The Idle screen (`MainActivity` with no active session) is what the user correctly needs
- `MainActivity.onResume()` already calls `startLockTask()` when no session is active
- The state machine already transitions to `Idle → showIdle()` correctly

Routing through `LockScreenActivity` adds an unlocked intermediary with no benefit.

### Root Fix
Remove `LockScreenActivity` from the session-end flow entirely.

`TimerService.onSessionExpired()` currently calls:
```kotlin
startActivity(Intent(this, LockScreenActivity::class.java)...)
```

Change it to bring `MainActivity` directly to the foreground:
```kotlin
startActivity(Intent(this, MainActivity::class.java).apply {
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
})
```

`MainActivity.onResume()` fires → `vm.syncFromDb()` → state = `Idle` → `showIdle()` (Insert coin
screen) + `startLockTask()` called from **foreground** MainActivity → device properly locked.

No intermediary screen. No navigation window. Correct lock is applied from the correct activity.

---

## Bug 11 — First reopen shows wrong remaining time (e.g. 49s); second reopen shows "Insert Coin to Start" while server timer still runs

### Symptom
1. Session is active (e.g. 30 minutes purchased). App is sent to background and reopened.
2. First reopen: timer shows ~49 seconds remaining instead of the correct ~30 minutes.
3. Second reopen (without ending the real session): shows "Insert Coin to Start" idle screen.
4. Backend / server still counts down the session correctly — only the app display is wrong.

### Root Cause

**Cause A — `SessionDao.getActiveSession()` has no `ORDER BY` and no ID filter**

```sql
SELECT * FROM sessions WHERE status IN ('active','paused') LIMIT 1
```

With no `ORDER BY`, the database engine returns any matching row — not necessarily the current
session. If a previous session was never properly marked "ended" in the DB (e.g. due to a crash
or an async cleanup coroutine that was cancelled), it returns that stale row with
`timeRemainingSecs = 49` (its last written value).

`syncFromDb()` and the `init` block both call `getActiveSession()` and emit
`SessionState.Active(stale session, 49)` → `showActive(49)` → `ACTION_START(durationSecs=49)` →
timer runs 49 seconds → `onSessionExpired()` → `prefs.activeSessionId = ""` → second reopen
sees empty prefs → Idle screen. The real session on the server is unaffected.

**Cause B — `showActive()` reuses stale `TimerService.currentSecs` from a previous session**

```kotlin
val displaySecs = if (TimerService.isRunning && TimerService.currentSecs > 0) TimerService.currentSecs else secs
if (TimerService.isRunning) startService(ACTION_RESUME) else startForegroundService(ACTION_START)
```

`TimerService.currentSecs` is never reset in `onDestroy()`. `TimerService.isRunning` can be
`true` even if the timer belongs to a previous session (e.g. still running in background after
process was not killed). There was no way to verify whether the running timer matches the current
session — `currentSessionId` did not exist in the companion object.

### Root Fix

**Fix A — Filter `getActiveSession()` by the known session ID via `getActiveSessionById()`**

Added `getActiveSessionById(id: String)` to `SessionDao`:
```kotlin
@Query("SELECT * FROM sessions WHERE id = :id AND status IN ('active','paused') LIMIT 1")
suspend fun getActiveSessionById(id: String): SessionEntity?
```

Also added `ORDER BY startedAt DESC` to `getActiveSession()` as a secondary safeguard.

Both `MainViewModel.init` and `syncFromDb()` now call
`db.sessionDao().getActiveSessionById(prefs.activeSessionId)` — guaranteed to return only
the exact current session, or null if it has been ended/is stale.

**Fix B — Add `currentSessionId` to `TimerService` companion object; verify before reuse**

`TimerService.currentSessionId` is set on `ACTION_START` and cleared in `onDestroy()`.

`showActive()` now checks `TimerService.currentSessionId == vm.prefs.activeSessionId` before
trusting `TimerService.currentSecs` or sending `ACTION_RESUME`. If there is a mismatch, it
falls through to `ACTION_START` with the correct `secs` from the DB — ensuring the timer always
runs from the real remaining time for the current session.

---

## Bug 12 — Second reopen shows "Insert Coin to Start" while server timer continues

### Symptom
1. Session started from dashboard. First reopen: timer synced correctly ✓
2. User backgrounds and reopens a second time → "Insert Coin to Start" (idle screen).
3. Server/dashboard timer still running — session was NOT ended on server.

### Root Cause

**Cause A — `showIdle()` sends `ACTION_END` even when fired by the initial `SessionState.Idle`**

`StateFlow._sessionState` is initialized to `SessionState.Idle`. When a new ViewModel is
created (activity destroyed and recreated, or first cold start with an active session), the
`lifecycleScope.launch { vm.sessionState.collect { ... } }` collector immediately fires with
the initial `Idle` value **before** `init` or `syncFromDb()` have had a chance to restore
`Active` state from the DB.

`showIdle()` is called → `TimerService.isRunning = false` → `startService(ACTION_END)`.

`TimerService.endSession()` then:
1. Reads `prefs.activeSessionId` (still "server_abc" — session truly active!)
2. Clears `prefs.activeSessionId = ""`
3. Marks DB `status = 'ended'` (async)
4. Calls `api.endSession("server_abc")` → FAILS silently with 401 (auth required)
5. `stopSelf()`

Then `init` coroutine runs and (despite api.getSession returning 401 too) falls back to local
DB → session entity still shows `status='active'` → emits `Active` → `showActive()` fires
→ `ACTION_START` queued with `sessionId = prefs.activeSessionId`. BUT `prefs` is now `""`
(cleared in step 2 above) — TimerService ignores `ACTION_START` with empty sessionId and
returns `START_NOT_STICKY`.

Then `syncFromDb()` runs: `prefs.activeSessionId = ""` → guard fires → emits `Idle` → screen
shows "Insert Coin to Start". Prefs is cleared. DB eventually marked ended. Server session
alive (api call failed).

**Result:** First reopen can work by coincidence of timing (C_sync runs before TimerService
processes ACTION_END, prefs still set). Second reopen consistently shows idle because by then
prefs has been cleared by the first reopen's spurious ACTION_END.

**Cause B — `POST /api/sessions/:id/end` and `GET /api/sessions/:id` require JWT auth**

The Android device sends no JWT token (Retrofit has no auth interceptor). All `api.endSession()`
calls from the device fail silently (401 caught by `catch (_: Exception) {}`). The server
session is never ended from the device side. Dashboard timer continues indefinitely.

### Root Fix

**Fix A — Guard `ACTION_END` in `showIdle()` by checking `prefs.activeSessionId`**

When `showIdle()` fires legitimately (ViewModel intentionally ended the session), `prefs` is
already cleared to `""` before `Idle` is emitted. When `showIdle()` fires spuriously (initial
`Idle` before restore), `prefs` still holds the session ID.

```kotlin
private fun showIdle() {
    screenIdle.visibility   = View.VISIBLE
    screenActive.visibility = View.GONE
    TimerService.isRunning = false
    if (vm.prefs.activeSessionId.isEmpty()) {        // Only stop timer if session is truly done
        startService(... ACTION_END)
    }
}
```

This prevents `TimerService.endSession()` from clearing prefs during the initial Idle flash,
so `init` and `syncFromDb()` can find valid prefs and correctly restore the Active state.

**Fix B — Remove `requireAuth` from device-callable backend endpoints**

`GET /api/sessions/:id` and `POST /api/sessions/:id/end` had `requireAuth` removed, matching
the existing `PATCH /api/sessions/:id/sync` pattern which is already auth-free. The device can
now successfully verify session status on app open and inform the server when a timer expires.

---

## Bug 13 — Manual session end from dashboard does not stop the timer when the customer is using another app

### Symptom
1. Session active, timer counting down.
2. Customer presses Home and uses another app (kiosk unlocked — MainActivity is backgrounded or destroyed).
3. Admin manually ends the session from the dashboard.
4. Timer does NOT stop on the device. App continues as if session is active.
5. When the app is in the foreground (timer screen visible), manual end works correctly.

### Root Cause

**`cmd:end` is delivered but the handler is null when MainActivity is not alive.**

The `cmd:end` Socket.IO event routes through this chain:

```
SocketManager.onEndSession → SyncService.onEndSession → MainActivity lambda → vm.endSessionById()
```

`SyncService.onEndSession` is a static callback set in `MainActivity.onCreate()` and cleared
in `MainActivity.onDestroy()`.

Two failure scenarios:

**Scenario A — Customer pressed Back during session (MainActivity destroyed):**
`onDestroy()` sets `SyncService.onEndSession = null`. `cmd:end` arrives →
`SyncService.onEndSession?.invoke(...)` → null → no-op. Session never ends on device.
Timer keeps running. `TimerService` is never told to stop.

**Scenario B — Socket dropped while backgrounded (Doze / OEM battery kill):**
Socket disconnects before `cmd:end` is emitted. Socket.IO does not replay missed events
on reconnect. `cmd:end` is silently lost. Heartbeat reconnects after ≤30 s but the event
is gone. Same observable result.

In both scenarios `api.endSession()` is never called by the device, so the server session
IS ended (admin did it via dashboard) but the device timer keeps counting and the screen
does not update.

### Root Fix

**Fix A — Handle `cmd:end` in `SyncService` directly, not only via MainActivity callback.**

`SyncService` is a foreground service — it is alive as long as the app process is alive,
regardless of whether `MainActivity` is alive. Moving the core cleanup into `SyncService`
eliminates the dependency on the nullable static callback.

In `SyncService.connectSocket()`, the `SocketManager.onEndSession` lambda now:
1. Runs cleanup on the SyncService IO scope (matches session ID → clears prefs, marks DB
   ended, calls `api.endSession()`, sends `TimerService.ACTION_END`).
2. THEN calls `onEndSession?.invoke(sessionId)` (the MainActivity callback, if still alive)
   for immediate UI state update.

This dual approach ensures:
- Session ends even if MainActivity is destroyed (callback null).
- If MainActivity is alive, UI still updates instantly via `vm.endSessionById()`.

**Fix B — Relax `endSessionById()` stale-echo guard for the SyncService-first race.**

SyncService's cleanup runs on an IO coroutine (async). `onEndSession?.invoke()` runs
synchronously right after the launch. There is a race: `endSessionById()` in the ViewModel
may run BEFORE the IO coroutine clears `prefs.activeSessionId`, OR AFTER.

Old guard: `if (targetSessionId.isNotEmpty() && targetSessionId != currentId) return`

If SyncService cleared prefs first, `currentId = ""`. The old guard:
`"server_abc" != "" → true → return@launch`. UI never emits Idle!

New guard adds `&& currentId.isNotEmpty()`:
- `currentId = ""` → `currentId.isNotEmpty() = false` → guard fails → falls through → emits Idle ✓
- `currentId = "other_session"` → guard fires → return (correct — stale echo) ✓
- `currentId = "server_abc"` and matches → guard fails → normal end path ✓

---

## Bug 14 — Screen does not lock / idle screen not shown when session is manually ended from dashboard while customer is using another app

### Symptom
1. Session active. Customer is using another app (kiosk unlocked, app backgrounded).
2. Admin manually ends the session from the dashboard.
3. Timer stops on device (Bug 13 fix works) but the screen does NOT return to "Insert Coin to Start" and does NOT re-lock.
4. Screen only locks/shows idle when the customer manually reopens the PisoTab app.

### Root Cause

**`startLockTask()` requires the Activity to be in the foreground. It silently fails when called from a stopped Activity.**

When `cmd:end` arrives and the app is backgrounded, the current flow is:
1. `SyncService` scope: prefs cleared, DB ended, `TimerService.ACTION_END` sent ✓
2. `onEndSession?.invoke(sessionId)` → `vm.endSessionById()` → `_sessionState = Idle`
3. `lifecycleScope` collector fires (coroutine stays active while Activity is STOPPED) →
   calls `showIdle()` and then:
   ```kotlin
   if (vm.prefs.isKioskModeEnabled) KioskManager.startLockTask(this@MainActivity)
   ```
4. `startLockTask()` is called on a stopped (backgrounded) Activity.
   Android requires the Activity to be RESUMED to enter lock task mode.
   The call throws internally → caught by `try-catch` in `KioskManager` → silently ignored.
5. No activity is brought to the foreground. Customer stays in their app.
6. Only when customer reopens PisoTab → `onResume()` → `startLockTask()` from foreground → works.

**The same scenario with `MainActivity` destroyed (customer pressed Back) is even worse:
`onEndSession` callback is null, so step 2 never runs and the idle screen is never shown at all.**

`TimerService.onSessionExpired()` already handles this correctly — it calls
`startActivity(MainActivity)` after cleanup, bringing the app to the foreground.
The `SyncService` cmd:end handler was missing this same step.

### Root Fix

**In `SyncService`'s cmd:end cleanup scope, call `startActivity(MainActivity)` after stopping
the timer — identical to what `TimerService.onSessionExpired()` does.**

```kotlin
startActivity(Intent(applicationContext, MainActivity::class.java).apply {
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
})
```

- `FLAG_ACTIVITY_NEW_TASK` — required when starting an Activity from a Service context.
- `FLAG_ACTIVITY_SINGLE_TOP` — if MainActivity is already the top activity (foreground case),
  `onNewIntent()` is delivered instead of creating a duplicate. No harm.

When MainActivity comes to the foreground:
- `onResume()` fires → `syncFromDb()` → prefs empty → `Idle` emitted → `showIdle()`.
- `onResume()` reads `sessionActive = false` → `KioskManager.startLockTask(this)` called
  **from the foreground Activity** → succeeds → device is locked. ✓

This matches the natural timer-expiry flow exactly. No new mechanism required.

---

## Bug 15 — Anti-theft alarm does not trigger while the customer is using another app (app backgrounded)

### Symptom
1. Session active. Anti-theft monitoring enabled (charger or WiFi disconnect).
2. Customer presses Home and uses another app (MainActivity backgrounded or destroyed).
3. Charger is unplugged or WiFi is disconnected.
4. No alarm sounds, no alarm banner — nothing happens.
5. If the app is in the foreground when charger is unplugged, the alarm triggers correctly.

### Root Cause

**Root Cause A — `AntiTheftManager` uses Activity context for long-lived operations.**

`start(context)` passes the Activity context directly into `watchCharger(context)` and
`watchWifi(context)`, which store it in their lambdas and use it for:
- `context.registerReceiver(chargerReceiver, filter)` — registers the BroadcastReceiver
  bound to the Activity's lifecycle. On some OEM Android builds, receivers registered with
  an Activity context stop delivering intents after `onStop()` or `onDestroy()`.
- `context.getSystemService(CONNECTIVITY_SERVICE)` — ConnectivityManager instance tied to
  Activity context. May behave incorrectly after the Activity is destroyed.
- `triggerAlarm(context, ...)` → `MediaPlayer.setDataSource(context, uri)` — on Android 10+,
  accessing a `content://` URI from a backgrounded/destroyed Activity context fails silently
  (security restriction). The `catch (_: Exception) {}` swallows the error and no sound plays.
- `context.getSystemService(AUDIO_SERVICE)` — same Activity-context issue.

**Root Cause B — `MainActivity.onDestroy()` calls `AntiTheftManager.stop(this)`.**

When the customer presses Back during a session, `onDestroy()` runs and explicitly calls
`AntiTheftManager.stop(this)` → `unregisterReceivers()` + `stopAlarm()`. Monitoring is
completely shut down. From that moment, charger/WiFi changes are silently ignored.

**Root Cause C — `SyncService` never manages alarm lifecycle.**

`AntiTheftManager.start()` / `stop()` are called exclusively from `MainActivity`. If
`MainActivity` is destroyed (Back press) or not yet created (cold process restart of
`SyncService`), there is no code that resumes monitoring. The alarm is dead until the next
`onResume()`.

### Root Fix

**Fix A — `AntiTheftManager` stores and uses `context.applicationContext` internally.**

In `start(context)`, immediately capture `appContext = context.applicationContext`. All
subsequent calls (`registerReceiver`, `getSystemService`, `setDataSource`, `MediaPlayer`) use
`appContext` — which lives for the entire process lifetime — instead of the Activity context.
This ensures receivers keep delivering intents and MediaPlayer can open audio URIs regardless
of whether any Activity is alive.

Signature changes:
- `watchCharger(context)` → `watchCharger()` (uses `appContext`)
- `watchWifi(context)` → `watchWifi()` (uses `appContext`)
- `triggerAlarm(context, reason)` → `triggerAlarm(reason)` (uses `appContext`)
- `unregisterReceivers(context)` → `unregisterReceivers()` (uses `appContext`)

**Fix B — Remove `AntiTheftManager.stop(this)` from `MainActivity.onDestroy()`.**

Monitoring must persist when the Activity is destroyed during an active session. The session
is still in progress; charger/WiFi still need to be watched. Lifecycle management is now
delegated entirely to `SyncService` (see Fix C).

**Fix C — `SyncService` manages alarm lifecycle.**

`SyncService.onCreate()` now calls `AntiTheftManager.start(this)` if the alarm should be
active at that point (no session active guard, or session is in progress). This covers process
restarts where `MainActivity` has not yet been created.

`SyncService`'s cmd:end cleanup scope now calls `AntiTheftManager.stop(applicationContext)`
after stopping the timer — ensuring monitoring is shut down at the same point session cleanup
happens, regardless of whether `MainActivity` is alive.

---

## Bug 16 — Anti-theft alarm triggers (sound plays) but the red warning banner/notification does not appear when the app is backgrounded

### Symptom
1. Session active. Customer uses another app (MainActivity backgrounded or destroyed).
2. Charger is unplugged or WiFi disconnects — alarm sound plays correctly.
3. No red warning banner is visible. No system notification appears.
4. If the app is brought back to the foreground, the banner is still not shown.
5. Only when the alarm triggers while the app is already open does the banner appear.

### Root Cause

**Root Cause A — `onAlarmTriggered` callback only updates in-app UI; it is invisible from outside the app.**

`triggerAlarm()` calls `onAlarmTriggered?.invoke(reason)`, which is wired in
`MainActivity.onCreate()` to:
```kotlin
runOnUiThread {
    alarmBanner.visibility = View.VISIBLE
    tvAlarmReason.text = reason
}
```
`alarmBanner` is a `View` inside `MainActivity`'s window. When the app is backgrounded, the
`runOnUiThread` block executes successfully and sets `View.VISIBLE` on the View — but the user
is looking at another app's window, not `MainActivity`. The update is invisible.

There is no system-level notification (Android `NotificationManager`) posted when the alarm
triggers, so no alert is surfaced outside the app window.

**Root Cause B — Alarm banner state is not restored when MainActivity returns to foreground.**

`onAlarmTriggered` fires once when the alarm first triggers. When `MainActivity` later comes
to the foreground (customer switches back, or SyncService calls `startActivity(MainActivity)`
after manual session end), `onResume()` runs but does not check `AntiTheftManager.isAlarming()`.
The callback will not fire a second time, so the banner stays `GONE` permanently even though
the alarm is still actively sounding.

### Root Fix

**Fix A — Post a system notification when alarm triggers; cancel it when alarm stops.**

`AntiTheftManager.triggerAlarm()` now calls `postAlarmNotification(ctx, reason)` using a
dedicated notification channel (`pisotab_alarm`, `IMPORTANCE_HIGH`) with:
- `PRIORITY_MAX` — surfaces as a heads-up (pop-over) notification on the lock screen and
  while using other apps, visible even when the PisoTab window is not in front.
- `setOngoing(true)` — cannot be dismissed by swiping; persists until `cancel()` is called.
- `CATEGORY_ALARM` — system treats it with alarm priority.

`AntiTheftManager.stopAlarm()` calls `NotificationManager.cancel(ALARM_NOTIF_ID)` to dismiss
the notification when the alarm is manually stopped or the session ends.

**Fix B — Restore banner state in `MainActivity.onResume()` by polling `isAlarming()`.**

After `startOrStopAlarm()` in `onResume()`, the banner is now set explicitly based on
`AntiTheftManager.isAlarming()` and `AntiTheftManager.lastAlarmReason()`:
```kotlin
if (AntiTheftManager.isAlarming()) {
    alarmBanner.visibility = View.VISIBLE
    tvAlarmReason.text     = AntiTheftManager.lastAlarmReason()
} else {
    alarmBanner.visibility = View.GONE
}
```
This covers the case where `onAlarmTriggered` fired while backgrounded and the banner update
was invisible — on the next `onResume()` the correct state is applied from ground truth.

---

## Bug 17 — Alarm system notification still not visible when app is backgrounded (charger/WiFi disconnect)

### Symptom
1. Session active, customer using another app (app backgrounded).
2. Charger is unplugged or WiFi disconnects.
3. Alarm sound plays correctly (MediaPlayer works).
4. No system notification appears — no heads-up, no lock screen alert, nothing visible.
5. When customer returns to the app, the in-app red banner does show (Bug 16 `onResume()` fix works).
6. If the app is already in the foreground, the banner shows correctly.

### Root Cause

**Root Cause A — `POST_NOTIFICATIONS` permission not declared in AndroidManifest.xml.**

On Android 13+ (API 33), `NotificationManager.notify()` is a protected operation. The OS
requires the app to hold `android.permission.POST_NOTIFICATIONS` before any non-foreground-
service notification can be posted. Without the `<uses-permission>` declaration in the
manifest, the permission can never be granted — the OS ignores it entirely.

`postAlarmNotification()` calls `NotificationManager.notify()`, which throws a
`SecurityException` on Android 13+ when the permission is absent. The outer
`catch (_: Exception) {}` swallows the exception silently — no crash, no log, no notification.

This is why `SyncService`'s running notification works: it is posted via `startForeground()`,
which is exempt from the `POST_NOTIFICATIONS` requirement. `AntiTheftManager` uses the
regular `notify()` path, which is not exempt.

**Root Cause B — `POST_NOTIFICATIONS` is a dangerous permission; manifest alone is not enough.**

Android 13+ classifies `POST_NOTIFICATIONS` as a "dangerous" permission (like camera or
contacts). The OS will not grant it automatically at install time. The app must call
`ActivityCompat.requestPermissions()` at runtime to show the system permission dialog.
Without the runtime request, the permission remains denied even with the manifest declaration,
and `notify()` continues to fail silently.

### Root Fix

**Fix A — Declare `POST_NOTIFICATIONS` in AndroidManifest.xml.**

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Required for the OS to allow the runtime grant. No-op on Android 12 and below (the permission
does not exist on those API levels — the declaration is silently ignored).

**Fix B — Request `POST_NOTIFICATIONS` at runtime in `MainActivity.onCreate()`.**

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
    ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
        != PackageManager.PERMISSION_GRANTED) {
    ActivityCompat.requestPermissions(
        this,
        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
        0
    )
}
```

`Build.VERSION_CODES.TIRAMISU` = API 33 (Android 13). The check is guarded so it is a
complete no-op on older devices — no behavior change for Android 12 and below.

If the user grants the permission, all subsequent `NotificationManager.notify()` calls
(including `postAlarmNotification()`) succeed and the heads-up alarm notification appears.
If the user denies, the alarm sound still plays — only the visual notification is suppressed.

---

## Bug 18 — Customer can navigate to Settings (WiFi, Reset, Tethering) while kiosk mode is enabled

### Symptom
1. Kiosk mode enabled. Session active — device unlocked for customer use.
2. Customer opens Settings app → navigates to WiFi, Reset options, or Tethering.
3. Customer can change WiFi network, enable mobile hotspot, or reach factory reset screen.
4. `DISALLOW_FACTORY_RESET` restriction from Bug 17 fix partially helps but does NOT prevent
   opening Settings or accessing other sensitive pages.

### Root Cause

**Root Cause A — `DISALLOW_FACTORY_RESET` only blocks one path inside Settings; the Settings app itself is not blocked.**

`addUserRestriction(DISALLOW_FACTORY_RESET)` tells the OS not to honour a factory reset
request. On some OEM ROMs this still allows the user to navigate to System → Reset options
and tap "Reset all settings" (a softer reset that is not a full wipe). More importantly,
it leaves WiFi settings, tethering settings, and all other Settings pages fully open.

**Root Cause B — `stopLockTask()` is called during active sessions to allow free device use.**

Lock task mode (kiosk) is deliberately stopped when a session becomes Active/Paused so the
customer can use other apps during their paid time. After `stopLockTask()`, the OS imposes
no restriction on which apps the customer can launch — including Settings.

There was no mechanism to block the Settings app during this unlocked window.

**Root Cause C — Quick Settings tiles bypass the Settings app restriction.**

Even if Settings were blocked at the app level, the customer can pull down the notification
shade and toggle WiFi or enable hotspot directly from Quick Settings tiles. User restrictions
(`DISALLOW_CONFIG_WIFI`, `DISALLOW_CONFIG_TETHERING`) are the only way to block these
OS-level toggles regardless of entry point.

### Root Fix

**Fix A — Suspend the Settings app via `DevicePolicyManager.setPackagesSuspended()`.**

This is the Device Owner API designed for kiosk use cases. It suspends the Settings app
OS-wide: the icon is greyed out, any launch intent (from home screen, recent apps, or
Quick Settings deep-links) shows "App suspended" and returns immediately. The customer
cannot reach any Settings page regardless of how they try.

The Settings package name is resolved at runtime via intent resolution so that
manufacturer-specific variants (Realme, Samsung, Xiaomi, etc.) are handled correctly:
```kotlin
val intent = Intent(Settings.ACTION_SETTINGS)
val info = context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
return info?.activityInfo?.packageName ?: "com.android.settings"
```

**Fix B — Add `DISALLOW_CONFIG_WIFI`, `DISALLOW_CONFIG_TETHERING`, and `DISALLOW_SAFE_BOOT` restrictions.**

Belt-and-suspenders protection against Quick Settings tile changes and safe-mode bypass:
- `DISALLOW_CONFIG_WIFI` — prevents changing WiFi network even from Quick Settings
- `DISALLOW_CONFIG_TETHERING` — prevents enabling mobile hotspot/tethering
- `DISALLOW_SAFE_BOOT` — prevents rebooting into safe mode (which would unload Device Owner and bypass all kiosk restrictions)
- `DISALLOW_FACTORY_RESET` — retained from Bug 17

All four are cleared by `enableSettings()` when the admin enters the correct PIN, and
`setPackagesSuspended(false)` restores the Settings app so the admin can configure the device.

`disableFactoryReset()`/`enableFactoryReset()` are replaced by the unified
`disableSettings()`/`enableSettings()` which cover all concerns in one call.

---

## Fixes

### Fix 1 — Update backend .env for new network
