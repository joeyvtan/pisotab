# JJT PisoTab — Coin-Operated Phone Rental System
## Project Plan

---

## PHASE 13 — UX Improvements, Security & Mobile (2026-04-26)

### Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Remove pricing section from landing page | ✅ Done |
| 2 | Add esptool download card + update ESP32 guide to use .bin flashing | ✅ Done |
| 3 | Strong password validation (uppercase + lowercase + number + special char) | ✅ Done |
| 4 | Change password feature in dashboard settings | ✅ Done |
| 5 | Superadmin can set any user role including superadmin | ✅ Done |
| 6 | Fix Device ID not showing after adding device | ✅ Done |
| 7 | User Guides page in dashboard sidebar (videos, docs, downloads) | ✅ Done |
| 8 | Admin PIN reset via remote config in dashboard | ✅ Done |
| 9 | Mobile-responsive dashboard (collapsible sidebar) | ✅ Done |
| 10 | PWA support (manifest + service worker) | ✅ Done |

### Design Decisions
- Password policy: min 8 chars, must include uppercase, lowercase, digit, and special character. Applied at backend (auth.js register + reset-password + users.js POST) and frontend (register, reset-password, settings change-password forms).
- Role promotion to superadmin: Only superadmin can promote others. Added `PATCH /api/users/:id/role` endpoint.
- Device ID display: Bug was frontend not refreshing device list after creation — fixed by returning full device object and refreshing list.
- User Guides page: Static page in dashboard where superadmin can store video links and document links. Downloads (APK + firmware) also listed here.
- Mobile sidebar: Converted to overlay drawer with hamburger toggle. Backdrop closes it on mobile.
- PWA: Uses next-pwa with offline support via workbox. Manifest added to /public.

---

## PHASE 12 — Production Deployment: PostgreSQL + HTTPS (2026-04-25)

### Problem Statement
The backend was built on `node:sqlite` (synchronous, file-based). Moving to production requires:
1. A scalable relational DB (PostgreSQL) while keeping SQLite for local dev.
2. HTTPS termination via Nginx + Let's Encrypt.

### Solution

**Dual-mode database adapter (`src/db/index.js`)**
- No `DATABASE_URL` → uses `node:sqlite` (dev, zero setup).
- `DATABASE_URL` set → uses `pg` (PostgreSQL pool, production).
- Unified async API: `db.get()`, `db.all()`, `db.run()`, `db.exec()`.
- `toPg()` SQL translator auto-converts SQLite dialect: `?` → `$n`, `unixepoch()` → epoch extract, `date(col,'unixepoch')` → `to_char(to_timestamp(...))`, `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`, `strftime` → `extract(hour from ...)`.

**Route/service async conversion**
All 18 route files and 4 services converted from synchronous `db.prepare().get()` pattern to `await db.get()`. No route-level SQL was changed — only the call style.

**Files changed**
- `src/db/index.js` — complete rewrite (dual-mode adapter)
- `package.json` — added `pg ^8.12.0`
- `src/index.js` — wrapped in `async main()`
- All route files: `auth`, `devices`, `sessions`, `coins`, `pricing`, `locations`, `peakRules`, `users`, `gcash`, `appSettings`, `auditLog`, `firmware`, `downloads`, `licenses`, `licensePricing`, `purchaseRequests`, `deviceConfigs`
- `src/socketHandlers.js`
- `src/services/sessionTimer.js`, `mqttBridge.js`, `peakPricing.js`, `badges.js`

**Production config**
- `.env.example` — added `DATABASE_URL` and `DB_SSL` vars
- `nginx.conf` — Nginx reverse-proxy template with SSL (Let's Encrypt), API proxy, Socket.IO upgrade, and 110 MB upload limit

### Design Decisions
- SQL dialect translation happens at the adapter layer — route files remain readable and unchanged structurally.
- `formatConfig()` in `devices.js` / `deviceConfigs.js` handles both SQLite integers (`0/1`) and PostgreSQL booleans (`true/false`) for boolean fields.
- `getCurrentMultiplier()` made async (was sync) — all callers updated.
- `emitBadges()` made async with internal error handling so callers don't need `await`.
- `sessionTimer.tick()` is async but called by `setInterval` (fire-and-forget with internal try/catch).

### Known Limitations
- `toPg()` regex is a best-effort translator. Complex nested SQL may need manual review after first production deploy.
- PostgreSQL schema migration from SQLite must be run manually (export/import or schema recreation).

---

## PHASE 11 — Remote Device Admin (2026-04-25)

### Problem Statement
All device settings (coin rates, kiosk mode, connection mode, alarm config, etc.) currently live **only** in Android SharedPreferences on the physical tablet. An admin must physically touch the device to change any setting. This phase adds the ability to remotely configure and command any registered tablet from the web dashboard.

---

### 11.1 — Architecture

```
Dashboard (Web)
  │  PATCH /api/devices/:id/config
  ▼
Backend (Node.js)
  ├── Saves config to device_configs table (applied_at = NULL)
  └── Attempts immediate socket push ──► device:{device_id} room
                                              │
                                    ┌─────────▼──────────┐
                                    │   Android Tablet    │
                                    │  (online path)      │
                                    │  applies config     │
                                    │  emits ack          │
                                    └─────────────────────┘

If device is offline:
  Device heartbeats every 30s
  Backend checks pending config (applied_at IS NULL)
  Returns pending_config in heartbeat response
  Android applies on next heartbeat cycle
```

**Principle:** Server config is **authoritative** once set by admin. Device config is always a downstream replica.

---

### 11.2 — Database

#### New Table: `device_configs`

```sql
CREATE TABLE IF NOT EXISTS device_configs (
  device_id          TEXT PRIMARY KEY REFERENCES devices(id),
  -- Connection
  connection_mode    TEXT NOT NULL DEFAULT 'esp32',
  -- Coin timer
  rate_per_min       REAL NOT NULL DEFAULT 1.0,
  secs_per_coin      INTEGER NOT NULL DEFAULT 300,
  coin_rates         TEXT NOT NULL DEFAULT '[]',
  -- Kiosk
  kiosk_mode         INTEGER NOT NULL DEFAULT 0,
  floating_timer     INTEGER NOT NULL DEFAULT 0,
  -- Deep freeze
  deep_freeze        INTEGER NOT NULL DEFAULT 0,
  deep_freeze_grace  INTEGER NOT NULL DEFAULT 30,
  -- Anti-theft
  alarm_wifi         INTEGER NOT NULL DEFAULT 0,
  alarm_charger      INTEGER NOT NULL DEFAULT 0,
  alarm_session_only INTEGER NOT NULL DEFAULT 1,
  alarm_delay_secs   INTEGER NOT NULL DEFAULT 30,
  -- Sync state
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  applied_at         INTEGER   -- NULL = pending; timestamp = device acknowledged
);
```

**Auto-seed:** When a device is registered (`POST /api/devices`), insert a default `device_configs` row.

---

### 11.3 — Backend API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/devices/:id/config` | requireAdmin (own or superadmin) | Fetch current config |
| PATCH | `/api/devices/:id/config` | requireAdmin (own or superadmin) | Update config + push to device |
| POST | `/api/devices/:id/remote-cmd` | requireAdmin (own or superadmin) | Send remote command |

**PATCH config behavior:**
1. Validate fields
2. `UPDATE device_configs SET ..., updated_at = unixepoch(), applied_at = NULL WHERE device_id = ?`
3. Attempt socket push: `io.to('device:${id}').emit('cmd:apply_config', config)`
4. Return saved config + `{ pending: true/false }` based on device socket presence

**POST remote-cmd body:** `{ cmd: 'restart_app' | 'restart_device' | 'lock_screen' }`
- Emits: `io.to('device:${id}').emit('cmd:${cmd}')`
- Returns: `{ sent: true }` if device is in socket room, `{ sent: false, queued: false }` if offline (commands are fire-and-forget, not queued)

**Heartbeat modification** (`POST /api/devices/:id/heartbeat`):
- After updating device status, check for pending config:
  ```javascript
  const cfg = db.prepare(`
    SELECT * FROM device_configs
    WHERE device_id = ? AND (applied_at IS NULL OR applied_at < updated_at)
  `).get(device_id);
  res.json({ ok: true, pending_config: cfg || null });
  ```

**Socket ack handler** (in socketHandlers):
```javascript
socket.on('ack:config_applied', ({ device_id }) => {
  db.prepare(
    'UPDATE device_configs SET applied_at = unixepoch() WHERE device_id = ?'
  ).run(device_id);
});
```

---

### 11.4 — Socket Events (New)

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `cmd:apply_config` | Server → Device | full config object | Push settings to tablet |
| `cmd:restart_app` | Server → Device | `{}` | Restart the Android app |
| `cmd:restart_device` | Server → Device | `{}` | Reboot the Android device |
| `cmd:lock_screen` | Server → Device | `{}` | Force show lock screen |
| `ack:config_applied` | Device → Server | `{ device_id }` | Device confirmed config applied |

---

### 11.5 — Dashboard UI

**DeviceCard changes:**
- Add **"⚙ Remote Admin"** button in each device card header
- Config status badge (only shown when config has been pushed):
  - `✓ Applied` (green) — `applied_at >= updated_at`
  - `● Pending` (amber) — `applied_at IS NULL OR applied_at < updated_at`

**New component: `RemoteAdminModal`**
Full-screen overlay/drawer with sections:

```
REMOTE ADMIN — [Device Name]
Status: ● Online    Config: ● Pending

── CONNECTION ──────────────────────────
  Mode: [● ESP32   ○ USB]

── COIN TIMER ──────────────────────────
  Rate (₱/min):   [________]
  Secs per coin:  [________]
  Coin Rates:
    ₱1 = [__] min  [×]
    ₱5 = [__] min  [×]
    [＋ Add Rate]

── KIOSK ───────────────────────────────
  Kiosk Mode:       [toggle]
  Floating Timer:   [toggle]

── DEEP FREEZE ─────────────────────────
  Enable:           [toggle]
  Grace Period (s): [________]

── ANTI-THEFT ──────────────────────────
  Alarm on WiFi Disconnect: [toggle]
  Alarm on Charger Unplug:  [toggle]
  During Session Only:      [toggle]
  Alarm Delay (s):  [________]

── REMOTE COMMANDS ─────────────────────
  [🔄 Restart App]  [🔌 Restart Device]
  [🔒 Lock Screen]

──────────────────────────────────────────
  [Cancel]       [Push Config to Device]
```

**State management:**
- On open: `GET /api/devices/:id/config` → populate form
- On "Push Config": `PATCH /api/devices/:id/config` → show toast ("Config pushed — awaiting device acknowledgement")
- Remote commands: `POST /api/devices/:id/remote-cmd` → show toast ("Command sent" or "Device offline — command not delivered")
- Socket event listener: on `device:status` change → refresh config status badge

---

### 11.6 — Android Changes

#### A. `SocketManager.kt` — New callbacks + ack emitter
```kotlin
var onApplyConfig:   ((JSONObject) -> Unit)? = null
var onRestartApp:    (() -> Unit)? = null
var onRestartDevice: (() -> Unit)? = null
var onLockScreen:    (() -> Unit)? = null

fun emitConfigAck(deviceId: String) {
    socket?.emit("ack:config_applied",
        JSONObject().put("device_id", deviceId))
}
```

#### B. New file: `RemoteConfigManager.kt`
```kotlin
object RemoteConfigManager {
    fun applyConfig(config: JSONObject, prefs: PrefsManager, context: Context) {
        // Apply each field if present in the JSON payload
        config.optString("connection_mode").takeIf { it.isNotEmpty() }
            ?.let { prefs.connectionMode = it }
        config.optDouble("rate_per_min", 0.0)
            .takeIf { it > 0 }?.let { prefs.timerRatePerMinute = it.toFloat() }
        config.optInt("secs_per_coin", 0)
            .takeIf { it > 0 }?.let { prefs.timerSecondsPerCoin = it }
        config.optString("coin_rates").takeIf { it.isNotEmpty() }
            ?.let { prefs.coinRates = it }
        if (config.has("kiosk_mode"))
            prefs.isKioskModeEnabled = config.getBoolean("kiosk_mode")
        if (config.has("floating_timer"))
            prefs.floatingTimerEnabled = config.getBoolean("floating_timer")
        if (config.has("deep_freeze"))
            prefs.deepFreezeEnabled = config.getBoolean("deep_freeze")
        if (config.has("deep_freeze_grace"))
            prefs.deepFreezeGracePeriodSecs = config.getInt("deep_freeze_grace")
        if (config.has("alarm_wifi"))
            prefs.alarmOnWifiDisconnect = config.getBoolean("alarm_wifi")
        if (config.has("alarm_charger"))
            prefs.alarmOnChargerDisconnect = config.getBoolean("alarm_charger")
        if (config.has("alarm_session_only"))
            prefs.alarmOnlyDuringSession = config.getBoolean("alarm_session_only")
        if (config.has("alarm_delay_secs"))
            prefs.alarmDelaySeconds = config.getInt("alarm_delay_secs")
        // Restart SyncService so new connection_mode/server settings take effect
        context.stopService(Intent(context, SyncService::class.java))
        context.startForegroundService(Intent(context, SyncService::class.java))
    }
}
```

#### C. `SyncService.kt` — Wire config callbacks + heartbeat pending_config
```kotlin
// Wire socket callbacks
SocketManager.onApplyConfig = { config ->
    RemoteConfigManager.applyConfig(config, prefs, applicationContext)
    SocketManager.emitConfigAck(prefs.deviceId)
}
SocketManager.onRestartApp = {
    val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
    }
    startActivity(intent)
}
SocketManager.onRestartDevice = {
    try { getSystemService(PowerManager::class.java)?.reboot(null) } catch (_: Exception) {}
}
SocketManager.onLockScreen = {
    startActivity(Intent(applicationContext, LockScreenActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    })
}

// In heartbeat response handling
val pendingConfig = heartbeatResponse.pendingConfig
if (pendingConfig != null) {
    RemoteConfigManager.applyConfig(pendingConfig, prefs, applicationContext)
    SocketManager.emitConfigAck(prefs.deviceId)
}
```

#### D. `ApiService.kt` — Update `HeartbeatResponse`
```kotlin
data class HeartbeatResponse(
    val ok: Boolean,
    @SerializedName("pending_config") val pendingConfig: JsonObject? = null
)
```

---

### 11.7 — Security Model

| Role | Can access config for |
|------|-----------------------|
| `superadmin` | All devices |
| `admin` | Own devices only (`devices.owner_user_id = req.user.id`) |
| `staff` | No access |

---

### 11.8 — Implementation TODOs

#### Backend
- [ ] Add `device_configs` table to schema (migration in `index.js`)
- [ ] Seed default row in `device_configs` when device is created
- [ ] Create `routes/deviceConfigs.js` (GET, PATCH, remote-cmd)
- [ ] Register route in `index.js`
- [ ] Modify heartbeat to return `pending_config` in response
- [ ] Add `ack:config_applied` socket listener (in socketHandlers)

#### Dashboard
- [ ] Add `getDeviceConfig(id)`, `updateDeviceConfig(id, data)`, `sendRemoteCmd(id, cmd)` to `api.ts`
- [ ] Create `RemoteAdminModal.tsx` component (all sections + commands)
- [ ] Add "Remote Admin" button + config status badge to `DeviceCard.tsx`

#### Android
- [ ] Add `onApplyConfig`, `onRestartApp`, `onRestartDevice`, `onLockScreen` to `SocketManager.kt`
- [ ] Add `emitConfigAck()` to `SocketManager.kt`
- [ ] Create `RemoteConfigManager.kt`
- [ ] Wire callbacks in `SyncService.kt`
- [ ] Update `HeartbeatResponse` DTO in `ApiService.kt`
- [ ] Handle `pending_config` in heartbeat response handler in `SyncService.kt`

---

### 11.9 — Design Decisions

| Decision | Rationale |
|----------|-----------|
| Server config stored in `device_configs` (not only on device) | Dashboard can show current settings without device being online; config survives app reinstall |
| Heartbeat delivers pending config (not only socket) | Ensures reliability — socket can drop, but heartbeat runs every 30s guaranteed |
| `applied_at` timestamp (not boolean) | Allows detecting stale acks if config is updated twice before device comes online |
| Remote commands are fire-and-forget (not queued) | Restart/lock are volatile actions — queuing a "restart" from 2 hours ago is dangerous; config changes are properly queued instead |
| Config ownership check mirrors device ownership | Consistent with existing RBAC — admin controls only their own devices |
| `pending_config` in heartbeat response (not a separate poll) | Zero extra network calls — config delivery is piggybacked on the existing 30s heartbeat |

---

## Android App — Phase 10 Changes (2026-04-25)

### 1. Trial Expiry Persists Through Reinstall
- **Root cause:** Each new device record had `trial_started_at = NULL`, giving a fresh trial.
- **Fix (backend `devices.js` heartbeat):** On every heartbeat, if `android_id` is present, copy `trial_started_at` from any other device record sharing that `android_id`. The physical device's trial clock follows the hardware, not the software record.

### 2. Auto-Rotate (Portrait + Landscape)
- **Fix:** Changed `android:screenOrientation="portrait"` → `android:screenOrientation="fullSensor"` for all four activities in `AndroidManifest.xml`.
- Tablet will now rotate freely based on physical sensor orientation.

### 3. Light / Dark Mode
- **Architecture:** Uses Android DayNight system (`AppCompatDelegate.setDefaultNightMode()`).
- `res/values/colors.xml` — light mode semantic color palette.
- `res/values-night/colors.xml` (new) — dark mode semantic colors (current dark palette).
- Themes updated to reference `@color/screen_bg`, `@color/toolbar_bg`, etc. instead of hardcoded hex.
- `PrefsManager.isDarkMode` — persists toggle choice (default: dark).
- `ThemeManager.applyTheme()` — calls `setDefaultNightMode()` before `setContentView()`.
- **UI toggle:** Dark Mode switch added to Appearance screen; toggling calls `activity.recreate()` immediately.

### 4. Sidebar / Hamburger Visibility
- Toolbar: added `app:theme="@style/ToolbarDarkOverlay"` — forces hamburger icon and title white even in light mode.
- Sidebar `itemTextColor` and `itemIconTint` updated to `@color/nav_item_color` (lighter `#CBD5E1` in dark, dark slate in light).
- All key layout backgrounds use `@color/` semantic refs instead of hardcoded hex.

### 5. Branding — JJT PisoTab
- `strings.xml` `app_name` → "JJT PisoTab".
- `PrefsManager.businessName` default → "JJT PisoTab".
- Appearance save/reset defaults → "JJT PisoTab".
- `nav_header_admin.xml` — replaced coin emoji with `ImageView` for `@drawable/ic_jjt_logo`.
- **Action required:** Copy your logo PNG to `apps/android/app/src/main/res/drawable/ic_jjt_logo.png`.
- License expired dialog updated to say "JJT PisoTab".

---

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                       │
│              (Next.js / React Web App)                   │
└───────────────────────┬─────────────────────────────────┘
                        │ REST + WebSocket
┌───────────────────────▼─────────────────────────────────┐
│                   CLOUD BACKEND                          │
│           (Node.js + Express + Socket.IO)                │
│              (SQLite → PostgreSQL later)                 │
└──────────┬────────────────────────┬────────────────────-┘
           │ REST/WebSocket          │ MQTT
┌──────────▼───────────┐   ┌────────▼──────────────────────┐
│  ANDROID KIOSK APP   │   │    ESP32 COINBOX FIRMWARE      │
│      (Kotlin)        │◄──│  (Arduino / ESP-IDF)           │
│  - Timer engine      │   │  - Coin pulse detection        │
│  - Kiosk lockdown    │   │  - BLE + WiFi/MQTT             │
│  - Session control   │   │  - Offline buffering           │
└──────────────────────┘   └────────────────────────────────┘
```

---

## Tech Stack
- **Android**: Kotlin, Device Owner API, WorkManager, Room DB
- **ESP32**: Arduino / ESP-IDF, MQTT, BLE
- **Backend**: Node.js, Express, Socket.IO, SQLite (dev) / PostgreSQL (prod)
- **Frontend**: Next.js 14, TailwindCSS, shadcn/ui
- **Protocols**: REST, WebSocket, MQTT (via EMQX or Mosquitto)
- **Notifications**: Telegram Bot API, Firebase FCM

---

## Development Phases

### PHASE 1 – MVP (Manual System) ✅ COMPLETE
**Goal:** Working phone rental system without coins

- [x] Project scaffolding (monorepo structure)
- [x] Backend: Node.js API server
  - [x] Device registration + management
  - [x] Session CRUD (start, pause, resume, stop)
  - [x] Pricing tiers configuration
  - [x] Session logs
  - [x] WebSocket for real-time updates
- [x] Frontend: Admin Dashboard (Next.js)
  - [x] Device list with status cards
  - [x] Start/stop/pause/resume session controls
  - [x] Add time manually
  - [x] Session log table
  - [x] Basic revenue summary
- [x] Android App (Kotlin)
  - [x] Countdown timer UI (auto-resize, handles hours)
  - [x] Lock screen overlay (session expired screen)
  - [x] Boot receiver (auto-launch on restart)
  - [x] REST API client (Retrofit)
  - [x] WebSocket real-time sync (Socket.IO)
  - [x] Local Room DB (offline-first)
  - [x] Connection status indicator
  - [x] Admin PIN dialog (long press bottom-right corner)
  - [x] Kiosk mode toggle in Setup

### PHASE 2 – Coin Integration ✅ COMPLETE
**Goal:** ESP32 coin acceptor → MQTT → backend → tablet timer

- [x] ESP32 firmware
  - [x] Coin pulse detection + debouncing (ISR)
  - [x] Coin-to-credit mapping (configurable)
  - [x] WiFi + MQTT (PubSubClient)
  - [x] Offline credit buffering (queue 50 events)
  - [x] BLE server with notify characteristic (fallback)
  - [x] WiFiManager zero-config provisioning
- [x] MQTT bridge on backend (aedes broker)
  - [x] Auto-register ESP32 device on first coin event
  - [x] Auto-start session when coin inserted with no active session
  - [x] Add time to active/paused session on coin insert
  - [x] Emit `session:started` + `session:updated` to dashboard
  - [x] Emit `cmd:add_time` to tablet socket room
- [x] Tablet responds to coin events
  - [x] Timer starts automatically on first coin
  - [x] Timer adds time immediately (running or paused)
  - [x] Lock screen dismisses on new coin session
- [ ] Android BLE coin receiver (scan for PisoTab-Coin BLE) — SKIPPED (MQTT path working)

### PHASE 3 – Security & Kiosk Lockdown ⚠️ IN PROGRESS
**Goal:** Prevent users from exiting or tampering with the kiosk

- [x] Device Owner API provisioned via ADB (`dpm set-device-owner`)
- [x] Lock task mode (full kiosk — no Back/Home/Recents escape)
- [x] Immersive fullscreen (status + nav bar hidden)
- [x] Hardware button intercept (Back/Home/Recents blocked)
- [x] Auto-launch on boot (BootReceiver + SyncService)
- [x] Kiosk re-locks on return from Setup
- [x] Admin access via long-press hidden button + PIN
- [x] Admin long-press also available on Session Expired screen
- [x] Session Expired screen auto-dismisses to Idle after 30 seconds
- [x] Anti-theft alarm (WiFi disconnect + charger unplug)
  - [x] Configurable: enable/disable per trigger type
  - [x] Configurable: alarm delay in seconds
  - [x] Configurable: alarm only during session or always
  - [x] Configurable: custom alarm sound via system ringtone picker
  - [x] Red banner shown on screen when alarm triggers
- [x] Session-aware kiosk unlock
  - [x] Device locked (lock task) when no session active — prevents unauthorized use
  - [x] Device unlocked when session becomes Active or Paused — customer can freely use device
  - [x] Device re-locked when session ends (Idle) or expires
  - [x] Hardware Back/Home/Recents only intercepted when device is locked (no session)
  - [x] TimerService foreground notification shows countdown while customer uses other apps
- [ ] Disable USB debugging via policy — BLOCKED (manufacturer override on test device)
- [x] Factory reset prevention + Settings lockdown — Settings app suspended via `setPackagesSuspended()`; `DISALLOW_CONFIG_WIFI`, `DISALLOW_CONFIG_TETHERING`, `DISALLOW_FACTORY_RESET`, `DISALLOW_SAFE_BOOT` restrictions applied; all lifted when admin enters PIN
- [ ] Encrypted comms (HTTPS, MQTT TLS) — TODO (production only)

### PHASE 4 – Notifications + Cloud Sync
- [x] Telegram bot notifications — notifier.js already had `initNotifier()`/`notify()`; wired `notify()` into mqttBridge.js (coin session start, add-time) and sessions.js (manual start, end)
- [x] Firebase FCM push notifications — firebase-admin on backend (fcm.js); Android registers token on SyncService start + token refresh; backend sends FCM on session start/end; requires google-services.json + service account JSON
- [x] Offline-first sync engine (polish) — heartbeat now carries session_id + time_remaining_secs (server patches DB every 30s when Socket.IO drops); SyncService flush loop retries sessions created offline (local_xxx IDs) and promotes them to server-assigned IDs when connectivity restores
- [x] Multi-device / multi-branch support
- [x] Role-based access (Admin, Staff)

### PHASE 5 – Advanced Features
- [ ] QR payment (GCash/PayMaya webhook) — DEFERRED (requires payment gateway account + public webhook URL)
- [x] Analytics dashboard (charts, heatmaps)
- [ ] AI usage insights
- [x] Dynamic pricing engine (peak/off-peak)
- [x] OTA firmware update for ESP32
- [x] Licensing system (device-based, trial/paid)

### PHASE 6 – Android App Complete Redesign ✅ COMPLETE
**Goal:** Replace current minimal UI with a full-featured sidebar navigation app matching commercial kiosk standards

#### A. Navigation Architecture ✅
- [x] New `AdminActivity` with `DrawerLayout` + `NavigationView` sidebar (keeps `MainActivity` as kiosk surface)
- [x] Sidebar items: Dashboard, Sessions, Earnings, Appearance, Settings, WiFi, About
- [x] Each nav item loads a Fragment via Navigation Component (`nav_admin.xml`)
- [x] Sidebar header shows business name dynamically from PrefsManager
- [x] WiFi item launches `Settings.ACTION_WIFI_SETTINGS` (no fragment)
- [x] Admin PIN dialog in MainActivity now launches AdminActivity (not SetupActivity)
- [x] SetupActivity retained for first-run (initial config when !isConfigured)

#### B. New Fragments ✅
- [x] `DashboardFragment` — stat cards: sessions today, time sold today, earnings today, timer status, battery %, total coin value, license status; auto-refresh on resume
- [x] `SessionsFragment` — RecyclerView from `GET /api/sessions`, SwipeRefreshLayout, status color-coded
- [x] `EarningsFragment` — total all-time, today, this week, this month breakdown
- [x] `AppearanceFragment` — business name, theme (orange/blue/green), portrait/landscape wallpaper picker, lock screen audio picker, save/reset
- [x] `SettingsFragment` — all settings migrated from SetupActivity; PIN change dialog; Allowed Apps navigation
- [x] `AboutFragment` — app version, device model, Android version, Device Owner status, software update check
- [x] `AllowedAppsFragment` — searchable RecyclerView of all installed launcher apps with checkboxes; save to SharedPreferences

#### C. Settings (SettingsFragment) ✅
- [x] Admin PIN change dialog (current → new → confirm, min 4 digits)
- [x] Timer Config (₱/min rate, seconds-per-coin)
- [x] Allowed Apps → navigate to AllowedAppsFragment
- [x] Connection Mode toggle (ESP32 / USB / Manual)
- [x] Deep Freeze toggle + grace period input
- [x] Kiosk Mode toggle
- [x] Anti-theft alarm settings (all migrated from SetupActivity)
- [x] Restart App (recreate()) + Restart Device (PowerManager.reboot()) with confirmation dialogs

#### D. Whitelisted Apps Enforcement ✅
- [x] `AppWhitelistManager.kt` — wraps `DevicePolicyManager.setPackagesSuspended()`
- [x] Session Active → suspend all packages NOT in whitelist (PisoTab always exempt)
- [x] Session Idle/Expired → unsuspend all packages
- [x] Non-Device-Owner: silently skipped (safe fallback)

#### E. Notification Panel Blocking ✅
- [x] Handled by existing KioskManager immersive mode + lock task mode (no new code needed)

#### F. Deep Freeze ⏳ PARTIAL
- [x] Toggle + grace period stored in PrefsManager
- [x] Countdown overlay on LockScreenActivity — shows grace period countdown in orange; replaces 30s auto-dismiss when Deep Freeze is enabled
- [x] `ActivityManager.clearApplicationUserData()` per-package wipe — fires when countdown hits 0; skipped on API < 28; PisoTab itself is never wiped

#### G. Appearance / Theming ✅
- [x] `ThemeManager.kt` — Orange/Blue/Green theme variants; applied in `AdminActivity.onCreate()`
- [x] `WallpaperManager.kt` — portrait/landscape wallpaper URI helper
- [x] Business name in PrefsManager; shown in sidebar header
- [x] Portrait + landscape wallpaper pickers with `ACTION_OPEN_DOCUMENT` (no permission needed)
- [x] Lock screen audio picker (URI stored in PrefsManager)
- [x] `themes.xml` updated to `MaterialComponents.Bridge` base + Blue/Green variants

#### H. About / Software Update ✅
- [x] `AboutFragment` shows app version, device model, Android version, Device Owner status
- [x] Backend `GET /api/app/version` endpoint (`routes/app.js`)
- [x] Android compares `version_code` to `BuildConfig.VERSION_CODE`; prompts download via `DownloadManager` if newer
- [x] `ApiService.kt` → `getAppVersion()` + `AppVersionResponse` DTO added

#### New Files
```
app/src/main/java/.../
  ui/
    dashboard/DashboardFragment.kt
    sessions/SessionsFragment.kt
    earnings/EarningsFragment.kt
    appearance/AppearanceFragment.kt
    settings/SettingsFragment.kt
    about/AboutFragment.kt
  kiosk/
    AppWhitelistManager.kt
  appearance/
    ThemeManager.kt
    WallpaperManager.kt
```

---

## Folder Structure (Monorepo)

```
piso-tab/
├── apps/
│   ├── backend/          # Node.js API + WebSocket server
│   ├── dashboard/        # Next.js admin web app
│   └── android/          # Kotlin Android kiosk app
├── firmware/
│   └── esp32/            # ESP32 Arduino firmware
├── packages/
│   └── shared/           # Shared types/constants
└── docs/
    └── hardware-setup.md
```

---

## Review Section

### Phase 3 — Security & Kiosk Lockdown (In Progress)

**Date:** 2026-04-14

**Completed:**
- Device Owner set via ADB — lock task mode now requires no PIN to exit (true kiosk)
- Kiosk re-applies on every `onResume` so Setup visits don't break it
- Admin button changed to long-press (accidental taps no longer open Setup)
- Session Expired screen: 30-second auto-dismiss + admin long-press available
- Anti-theft alarm: charger unplug + WiFi disconnect, configurable via Setup UI
- Custom alarm sound via Android system ringtone picker

**Known Issues / Pending:**
- Disable USB debugging — `DISALLOW_DEBUGGING_FEATURES` and `setGlobalSetting` both ineffective on test device (manufacturer override). Skipped.
- Anti-theft alarm crash: alarm defaults were `true`, causing crash on fresh install before any settings were saved. Fixed (defaults now `false`). Awaiting reinstall after factory reset.
- Factory reset required on test device to recover from crash + Device Owner lockout.

**Lessons learned:**
- Device Owner `DISALLOW_DEBUGGING_FEATURES` does not work on all manufacturers
- Alarm monitoring must default OFF — monitoring starts at app launch before prefs are configured
- `FLAG_ACTIVITY_CLEAR_TOP | FLAG_ACTIVITY_SINGLE_TOP` is required (not just `SINGLE_TOP`) to bring MainActivity to front from LockScreenActivity
- `LockScreenActivity.onDestroy` must NOT null out `SyncService.onStartSession` — it fires after `MainActivity.onResume` re-registers the callback

---

### Phase 3 (addition) — Floating Timer Overlay ✅

**Date:** 2026-04-20

**What was built:**
- Floating draggable timer overlay shown over all other apps during an active session
- Built directly into `TimerService` (already a foreground service on Main dispatcher — no second service needed)
- Syncs to `TimerService.currentSecs` every second (same source as the main countdown)
- Turns red (`#991B1B`) when ≤ 10 seconds remaining
- Beeps once (`ToneGenerator / STREAM_ALARM`) exactly when countdown hits 10 seconds; beep flag resets above 10 so it fires again if time is added
- Draggable via `WindowManager.LayoutParams` + `OnTouchListener`
- Overlay removed on session end, natural expiry, and `onDestroy()`
- Toggled in **SetupActivity** under a new "Floating Timer" section
- Permission: `SYSTEM_ALERT_WINDOW` — if not granted, SetupActivity shows warning and opens Settings > Display over other apps
- Setting stored in `PrefsManager.floatingTimerEnabled` (default off)

---

### Phase 6 — Android App Complete Redesign ✅

**Date:** 2026-04-21

**What was built:**

**Navigation:**
- New `AdminActivity` with `DrawerLayout` + `NavigationView` sidebar, Navigation Component (`nav_admin.xml`)
- 7 destinations: Dashboard, Sessions, Earnings, Appearance, Settings, About, AllowedApps
- Admin PIN in MainActivity now launches AdminActivity; SetupActivity kept for first-run
- WiFi sidebar item opens system WiFi settings (no fragment)

**Fragments (7 new):**
- `DashboardFragment` — 6 stat cards pulled from `/api/sessions` filtered to today; live timer status + battery
- `SessionsFragment` — paginated RecyclerView with pull-to-refresh; status color-coded (green/amber/grey)
- `EarningsFragment` — total + today/week/month breakdown computed client-side from sessions
- `AppearanceFragment` — business name, Orange/Blue/Green theme selector, portrait+landscape wallpaper picker (`ACTION_OPEN_DOCUMENT`), lock screen audio picker
- `SettingsFragment` — all SetupActivity settings migrated + PIN change dialog + Allowed Apps navigation + Deep Freeze + Connection Mode + Timer Config + Restart App/Device
- `AboutFragment` — device info, Device Owner status, version check against `/api/app/version`
- `AllowedAppsFragment` — searchable list of all launcher apps with checkboxes, saved to PrefsManager

**Utilities:**
- `ThemeManager.kt` — applies Orange/Blue/Green theme in AdminActivity before `super.onCreate()`
- `WallpaperManager.kt` — URI helpers for portrait/landscape wallpapers
- `AppWhitelistManager.kt` — `setPackagesSuspended()` on session start (whitelist enforced) and end (all restored); silently skips if not Device Owner

**Backend:** `routes/app.js` → `GET /api/app/version` (version_code, version_name, apk_url)

**Dependencies added:** Material 1.12, Navigation Fragment/UI 2.7.7, RecyclerView 1.3.2, SwipeRefreshLayout 1.1.0

**Known limitations:**
- Theme change requires app restart (standard Android behavior with `setTheme()`)

### Phase 5 — Licensing System ✅

**Date:** 2026-04-23

**What was built:**

**Backend:**
- `licenses` table: `id`, `key` (unique, PTAB-XXXX-XXXX-XXXX-XXXX format), `plan`, `device_id` (null until activated), `expires_at` (null = lifetime), `created_at`
- `GET /api/licenses/check/:device_id` — no auth, returns `{status, plan, days_left}`. Status: `"active"` (paid license), `"trial"` (7-day trial from device creation), `"trial_expired"`
- `POST /api/licenses/activate` — no auth, binds a key to a device; rejects if key already used on another device
- `GET /api/licenses` — admin only, lists all keys with device name
- `POST /api/licenses/generate` — admin only, creates a new key with optional expiry

**Android:**
- `PrefsManager.licenseKey` — stored activated key
- `ApiService` — `checkLicense()`, `activateLicense()` endpoints + DTOs
- `DashboardFragment` — real license status from API (green=active, orange=trial, red=expired)
- `AboutFragment` — real license status + "Activate License Key" button → dialog to enter key → calls `/api/licenses/activate`

**Dashboard:**
- New `Licenses` page (`/dashboard/licenses`) — admin only: generate keys with optional expiry, copy to clipboard, list all keys with device name / status / expiry
- Sidebar: "Licenses" nav item (admin only)

**Trial logic:** 7-day trial starts from **first call to `/api/licenses/check`** (stored as `devices.trial_started_at`), NOT from `device.created_at`. This prevents existing devices (registered before licensing was added) from showing "Trial Expired" on first open. `trial_started_at` is set lazily on first check call.

**Enforcement:** `AdminActivity.onResume()` calls `checkLicense()`. If `trial_expired` → shows non-dismissible AlertDialog with "Activate License" button that navigates to AboutFragment. Customer sessions (MainActivity) are never blocked.

**License management (dashboard):** Unbind (detach from device → reusable), Deactivate (immediately expire), Delete (hard delete → device reverts to trial)

**Devices page — license status per card:** Each DeviceCard shows a license badge (Licensed/Trial X days/Trial Expired). Admin-only "Trial settings" panel appears on cards with no active license — allows resetting the trial clock and setting a custom trial duration (stored as `trial_days_override` on the device). Backend `PATCH /api/licenses/trial/:device_id` handles both reset and custom days..

---

### LockScreenActivity Bug Fixes (2026-04-23)
- **Bug 1 (app close on session start during countdown)**: Root cause was two-layered:
  1. `LockScreenActivity.onStartSession` used `FLAG_ACTIVITY_CLEAR_TOP` + explicit `finish()` — redundant on `singleTask` `MainActivity`, caused full task close on some devices. Fix: removed all flags and `finish()`.
  2. `MainViewModel.startSession()` set `prefs.activeSessionId` AFTER `db.sessionDao().upsert()` (a suspend point). `syncFromDb()` ran during the suspension, saw empty prefs → emitted `Idle` → showed lock screen. Fix: moved `prefs.activeSessionId` and `_sessionState.value` assignments BEFORE the upsert call. Also added a guard in `syncFromDb()` to not override `Active`/`Paused` state when the DB row doesn't exist yet (mid-insert race). Same fix applied to `startUsbSession()`.
- **Bug 2 (dashboard end skips lock screen on repeated sessions)**: `SyncService.onEndSession` coroutine called `startActivity(MainActivity)` after the API call; `MainActivity` (singleTask) cleared `LockScreenActivity` from the stack. Works "once" only because the API call takes time on first run. Fix: replaced `startActivity(MainActivity)` with conditional `startActivity(LockScreenActivity)` only when `onEndSession == null` (MainActivity destroyed). Also fixed `endSessionById()` to emit `SessionState.Expired` instead of `Idle`.
- **Bug 3 (no wallpaper on lock screen)**: Added `iv_wallpaper_lock` ImageView, semi-transparent dark content card, and `WallpaperManager.applyToImageView()` in `onCreate`/`onResume`.
- **Wipe fix (final)**: Replaced reflection-based `ActivityManager.clearApplicationUserData()` (blocked by Android hidden API policy) with the correct public API: `DevicePolicyManager.clearApplicationUserData(admin, pkg, mainExecutor, listener)` (API 28+). This is the proper Device Owner API that clears full app data including logged-in accounts. Requires app to be set as Device Owner via `adb shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver`.
- **Usage access grayed out (Android 13+)**: `checkUsageStatsPermission()` now detects Android 13+ and guides the user to Settings → App Info → ⋮ → Allow Restricted Settings first, then Usage Access. The toggle is grayed out by OS design for sideloaded APKs — this is not a PisoTab bug.

---

### Phase 5 — OTA Firmware Update ✅

**Date:** 2026-04-20

**What was built:**
- Installed `multer` on backend for multipart .bin file upload
- `routes/firmware.js`: `GET /api/firmware` (version info), `POST /api/firmware/upload` (admin, stores `firmware.bin`), `GET /api/firmware/download` (no-auth, ESP32 fetches this), `POST /api/firmware/ota/:device_id` (admin, triggers OTA via MQTT)
- Firmware stored in `apps/backend/uploads/firmware/firmware.bin` (single file, overwritten on new upload)
- `firmware_versions` table: version, filename, size, uploaded_at (single row, replaced on upload)
- MQTT command: `{ command: "ota", url: "...", version: "..." }` sent to `pisotab/devices/{id}/cmd`
- ESP32: `#include <HTTPUpdate.h>` + handles `cmd == "ota"` in `mqttCallback` — publishes `ota_updating` status then calls `httpUpdate.update(wifiClient, url)` — auto-reboots on success
- Dashboard: new "Firmware OTA" page (admin only): current version info, upload form (version + .bin), per-device "Push OTA" button with status feedback
- Sidebar: "Firmware OTA" nav item (admin only)

---

### Phase 5 — Dynamic Pricing Engine ✅

**Date:** 2026-04-20

**What was built:**
- New `peak_rules` DB table: id, name, days_of_week (CSV "0–6"), start_hour, end_hour, multiplier, is_active
- `services/peakPricing.js`: `getCurrentMultiplier()` — checks active rules against current local day/hour, returns highest matching multiplier (1.0 = no change)
- Overnight time spans supported (e.g. 22→6 crosses midnight)
- `routes/peakRules.js`: CRUD at `/api/peak-rules` (admin-only create/update/delete, all-auth list)
- `sessions.js POST`: effective duration = `Math.round(duration_mins / multiplier)` applied before INSERT
- `mqttBridge.js` coin handler: effective secs = `Math.round(credited_secs / multiplier)` applied to both add-time and new session
- Dashboard: `PeakRule` type + `getPeakRules/createPeakRule/updatePeakRule/deletePeakRule` in `api.ts`
- Dashboard Pricing page: "Peak Hour Pricing" section with rule list, day toggles, hour selects, enable/disable/delete; staff read-only

---

### Phase 5 — Analytics Dashboard ✅

**Date:** 2026-04-19

**What was built:**
- New `GET /api/sessions/analytics` endpoint — returns hourly distribution (0–23h), per-device breakdown, payment method split for the last 30 days. Placed BEFORE `GET /:id` to prevent Express from matching "analytics" as a session ID.
- New **Analytics** page (`/dashboard/analytics`) with:
  - 4 stat cards: peak hour, avg session duration, avg revenue/session, top-earning device
  - Hourly activity bar chart (24 hours, local time, zeros filled in for hours with no sessions)
  - Per-device breakdown table (sessions, avg duration, revenue)
  - Payment method split with progress bars (coin vs manual)
- **Analytics** nav item added to Sidebar
- `api.ts`: Added `getAnalytics()` + `AnalyticsData` type

**QR Payment deferred** — requires GCash/PayMaya developer account + public HTTPS webhook URL. Cannot be tested locally without those credentials.

---

### Phase 4 — Role-based Access (Admin, Staff) ✅

**Date:** 2026-04-19

**What was built:**

**Backend:**
- Added `requireAdmin` middleware to `auth.js` — returns 403 if `req.user.role !== 'admin'`
- Applied `requireAdmin` to: `POST /api/devices`, `DELETE /api/devices/:id`, `POST /api/locations`, `DELETE /api/locations/:id`, `POST /api/pricing`, `PATCH /api/pricing/:id`, `DELETE /api/pricing/:id`
- New `users.js` routes (admin only): `GET /api/users`, `POST /api/users`, `DELETE /api/users/:id`
- Cannot delete own account (safety guard)

**Dashboard:**
- New "Users" page (`/dashboard/users`): list all users, create staff/admin, delete users; admin-only (non-admins redirected)
- "Users" nav item in Sidebar — only visible to admins
- Devices page: "+ Add Device" button hidden from staff
- Pricing page: "+ Add Tier", Deactivate/Activate, Delete hidden from staff
- Branches page: "+ Add Branch", Delete hidden from staff
- Staff can still: view all pages, start/pause/resume/end sessions, add time

---

### Phase 4 — Multi-device / Multi-branch Support ✅

**Date:** 2026-04-19

**What was built:**
- New "Branches" page (`/dashboard/branches`): list, add, delete locations; default `loc_main` branch protected from deletion
- "Branches" nav item added to Sidebar
- Devices page: Branch dropdown in "Add Device" form; location filter dropdown (only shown when 2+ branches exist)
- `api.ts`: Added `deleteLocation()` and `updateDevice()` helpers

**Backend:** Already complete — `/api/locations` CRUD and `/api/devices` `PATCH` were already implemented.

---

### PHASE 7 — JJT PisoTab Public Platform ✅ COMPLETE

**Date completed:** 2026-04-24
**Status:** All 9 test steps passed. Emails confirmed delivered via Gmail SMTP.

---

## Phase 7 Overview

This phase transforms PisoTab from a single-operator internal tool into a **multi-tenant SaaS platform** with:
- A public-facing marketing + download website (JJT PisoTab)
- A full user registration and approval workflow
- A Super Admin tier that governs all other admin accounts
- A GCash-based manual license purchase system
- License ownership, transferability, and custom pricing

---

## 7.1 — Updated Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              JJT PisoTab PUBLIC WEBSITE (apps/landing/)          │
│        Next.js — Marketing, Downloads, Auth, Install Guide       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ shares /api/auth/*
┌───────────────────────────▼─────────────────────────────────────┐
│              ADMIN DASHBOARD (apps/dashboard/)                   │
│          Next.js — Role-gated: Super Admin + Admin + Staff       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST + WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                  CLOUD BACKEND (apps/backend/)                   │
│           Node.js + Express + Socket.IO (extended)               │
│    New: Multi-role auth, license marketplace, GCash payments     │
└──────────┬────────────────────────┬────────────────────────────-┘
           │ REST/WebSocket          │ MQTT
┌──────────▼───────────┐   ┌────────▼──────────────────────┐
│  ANDROID KIOSK APP   │   │    ESP32 COINBOX FIRMWARE      │
│      (unchanged)     │   │        (unchanged)              │
└──────────────────────┘   └────────────────────────────────┘
```

---

## 7.2 — Updated Folder Structure

```
piso-tab/
├── apps/
│   ├── backend/          # Node.js API + WebSocket (extended)
│   ├── dashboard/        # Next.js admin panel (extended)
│   ├── landing/          # NEW: Next.js public marketing site
│   └── android/          # Kotlin kiosk app (unchanged)
├── firmware/
│   └── esp32/            # ESP32 firmware (unchanged)
├── public/               # NEW: Served downloadable files
│   ├── apk/              #   PisoTab.apk (latest + versioned)
│   └── bin/              #   pisotab_esp32.bin (latest + versioned)
└── docs/
    └── hardware-setup.md
```

---

## 7.3 — Database Schema Additions

### 7.3.1 — Users table (extended via migrations)

```sql
-- New columns (ALTER TABLE via migration in index.js):
ALTER TABLE users ADD COLUMN email       TEXT;
ALTER TABLE users ADD COLUMN full_name   TEXT;
ALTER TABLE users ADD COLUMN business_name TEXT;
-- role updated values: 'superadmin' | 'admin' | 'staff'
ALTER TABLE users ADD COLUMN status      TEXT NOT NULL DEFAULT 'pending';
  -- 'pending' | 'approved' | 'suspended'
ALTER TABLE users ADD COLUMN approved_by TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN approved_at INTEGER;
```

**Seed change:** Default admin user upgraded to `role = 'superadmin'`, `status = 'approved'`.

---

### 7.3.2 — New: `password_reset_tokens`

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  token      TEXT UNIQUE NOT NULL,        -- UUID, shown in URL
  expires_at INTEGER NOT NULL,             -- 1 hour from creation
  used_at    INTEGER,                      -- null = unused
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

### 7.3.3 — New: `gcash_settings`

```sql
CREATE TABLE IF NOT EXISTS gcash_settings (
  id           TEXT PRIMARY KEY DEFAULT 'gcash_main',
  gcash_name   TEXT NOT NULL,             -- "Juan dela Cruz"
  gcash_number TEXT NOT NULL,             -- "09XX-XXX-XXXX"
  qr_image_url TEXT,                      -- optional QR image path
  updated_by   TEXT REFERENCES users(id),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

### 7.3.4 — New: `license_pricing`

```sql
CREATE TABLE IF NOT EXISTS license_pricing (
  id                TEXT PRIMARY KEY,
  user_id           TEXT REFERENCES users(id),  -- NULL = global default
  price_per_license REAL NOT NULL DEFAULT 299.00,
  currency          TEXT NOT NULL DEFAULT 'PHP',
  notes             TEXT,                        -- e.g. "Bulk discount for 5+"
  updated_by        TEXT NOT NULL REFERENCES users(id),
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch())
);
-- Seed: INSERT one row with user_id=NULL (default price = ₱299)
```

---

### 7.3.5 — New: `license_purchase_requests`

```sql
CREATE TABLE IF NOT EXISTS license_purchase_requests (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  quantity            INTEGER NOT NULL DEFAULT 1,
  price_per_unit      REAL NOT NULL,     -- snapshot of price at time of request
  total_amount        REAL NOT NULL,     -- quantity × price_per_unit
  gcash_reference     TEXT,              -- reference number from GCash
  gcash_sender_name   TEXT,              -- name used in GCash payment
  status              TEXT NOT NULL DEFAULT 'pending',
                                         -- 'pending' | 'approved' | 'rejected'
  reviewed_by         TEXT REFERENCES users(id),
  reviewed_at         INTEGER,
  rejection_reason    TEXT,
  notes               TEXT,              -- admin note field
  created_at          INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

### 7.3.6 — Licenses table (extended via migrations)

```sql
ALTER TABLE licenses ADD COLUMN owner_user_id        TEXT REFERENCES users(id);
  -- which admin account owns this license
ALTER TABLE licenses ADD COLUMN purchase_request_id  TEXT REFERENCES license_purchase_requests(id);
  -- back-reference to the request that generated it
```

---

### 7.3.7 — New: `license_transfers`

```sql
CREATE TABLE IF NOT EXISTS license_transfers (
  id              TEXT PRIMARY KEY,
  license_id      TEXT NOT NULL REFERENCES licenses(id),
  from_user_id    TEXT NOT NULL REFERENCES users(id),
  to_user_id      TEXT NOT NULL REFERENCES users(id),
  transferred_by  TEXT NOT NULL REFERENCES users(id),
  note            TEXT,
  transferred_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

### 7.3.8 — New: `downloadable_files`

```sql
CREATE TABLE IF NOT EXISTS downloadable_files (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,              -- 'apk' | 'bin'
  version     TEXT NOT NULL,             -- "1.2.3"
  filename    TEXT NOT NULL,
  file_path   TEXT NOT NULL,             -- server-side path
  size        INTEGER,                   -- bytes
  changelog   TEXT,                      -- release notes
  is_latest   INTEGER NOT NULL DEFAULT 1,
  uploaded_by TEXT REFERENCES users(id),
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

### 7.3.9 — New: `audit_log`

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id),  -- who performed the action
  action      TEXT NOT NULL,              -- e.g. 'approve_user', 'approve_license'
  target_type TEXT,                       -- 'user' | 'license' | 'request'
  target_id   TEXT,                       -- ID of the affected record
  details     TEXT,                       -- JSON string with extra context
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

## 7.4 — Role & Permission System

### Role Hierarchy

```
superadmin  ── Full system control: approves users, manages pricing,
               generates licenses, reviews purchase requests, sets GCash info
     │
  admin      ── Manages own devices/sessions, buys licenses, transfers licenses
     │
  staff      ── View + operate sessions only (no settings, no licenses)
```

### User Status Flow

```
signup() → status='pending'
              │
    superadmin approves
              │
         status='approved' ──── can log into dashboard
              │
    superadmin suspends
              │
         status='suspended' ─── login blocked
```

### Access Control Matrix

| Feature                      | superadmin | admin (approved) | staff | pending |
|------------------------------|:----------:|:----------------:|:-----:|:-------:|
| Login + see pending notice   | ✓          | ✓                | ✓     | ✓       |
| Dashboard access             | ✓          | ✓                | ✓     | ✗       |
| Devices / Sessions           | ✓          | ✓                | ✓     | ✗       |
| Pricing / Branches           | ✓          | ✓ (own)          | ✗     | ✗       |
| Analytics                    | ✓          | ✓ (own)          | ✗     | ✗       |
| User management              | ✓          | ✗                | ✗     | ✗       |
| Approve / suspend users      | ✓          | ✗                | ✗     | ✗       |
| Change user roles            | ✓          | ✗                | ✗     | ✗       |
| GCash settings               | ✓          | ✗                | ✗     | ✗       |
| Set license pricing          | ✓          | ✗                | ✗     | ✗       |
| Generate license key         | ✓          | ✗                | ✗     | ✗       |
| Buy license (submit request) | ✓          | ✓                | ✗     | ✗       |
| Review purchase requests     | ✓          | ✗                | ✗     | ✗       |
| View own licenses            | ✓          | ✓                | ✗     | ✗       |
| Transfer license             | ✓          | ✓                | ✗     | ✗       |
| Upload APK / BIN             | ✓          | ✗                | ✗     | ✗       |
| OTA Firmware push            | ✓          | ✗                | ✗     | ✗       |

### Middleware Changes

```javascript
// Current
requireAuth     // valid JWT
requireAdmin    // role === 'admin'

// New (replacing + adding)
requireAuth         // valid JWT + status === 'approved'
requireAdmin        // requireAuth + role IN ('admin', 'superadmin')
requireSuperAdmin   // requireAuth + role === 'superadmin'
```

---

## 7.5 — Backend API Routes (New / Changed)

### Auth (new endpoints)

| Method | Route                        | Auth   | Description                             |
|--------|------------------------------|--------|-----------------------------------------|
| POST   | /api/auth/register           | public | Create pending user account             |
| POST   | /api/auth/forgot-password    | public | Generate password reset token           |
| POST   | /api/auth/reset-password     | public | Reset password using token              |
| GET    | /api/auth/me                 | auth   | Return current user info                |

**Forgot password behavior:**
- If `SMTP_HOST` is configured in .env → sends email with reset link
- If no SMTP → returns reset URL directly in response (internal/LAN use)
- Token expires in 1 hour; single-use

### Users (changed)

| Method | Route                        | Auth        | Description                    |
|--------|------------------------------|-------------|--------------------------------|
| GET    | /api/users                   | superadmin  | All users with status + role   |
| POST   | /api/users                   | superadmin  | Create user directly (no signup) |
| PATCH  | /api/users/:id/approve       | superadmin  | Set status = 'approved'        |
| PATCH  | /api/users/:id/suspend       | superadmin  | Set status = 'suspended'       |
| PATCH  | /api/users/:id/role          | superadmin  | Change role                    |
| DELETE | /api/users/:id               | superadmin  | Delete user                    |

**Socket events emitted:**
- `user:approved` → to `dashboard` room (triggers badge count refresh)
- `user:pending` → to `dashboard` room when new signup arrives

### GCash Settings (new)

| Method | Route                | Auth        | Description                  |
|--------|----------------------|-------------|------------------------------|
| GET    | /api/gcash-settings  | auth        | Get GCash name + number      |
| PATCH  | /api/gcash-settings  | superadmin  | Update GCash info + QR image |

### License Pricing (new)

| Method | Route                          | Auth        | Description                       |
|--------|--------------------------------|-------------|-----------------------------------|
| GET    | /api/license-pricing           | auth        | Default price + own custom price  |
| GET    | /api/license-pricing/all       | superadmin  | All users + their custom prices   |
| PATCH  | /api/license-pricing/default   | superadmin  | Set global default price          |
| PATCH  | /api/license-pricing/:userId   | superadmin  | Set user-specific price           |
| DELETE | /api/license-pricing/:userId   | superadmin  | Remove user override (use default)|

### License Purchase Requests (new)

| Method | Route                              | Auth        | Description                            |
|--------|------------------------------------|-------------|----------------------------------------|
| POST   | /api/license-purchases             | admin       | Submit purchase request                |
| GET    | /api/license-purchases             | superadmin  | All requests (all statuses)            |
| GET    | /api/license-purchases/mine        | admin       | Own requests only                      |
| PATCH  | /api/license-purchases/:id/approve | superadmin  | Approve → auto-generate N license keys |
| PATCH  | /api/license-purchases/:id/reject  | superadmin  | Reject with reason                     |

**Approve logic (server-side):**
1. Validate `status === 'pending'`
2. Generate `quantity` new license keys (PTAB-XXXX-XXXX-XXXX-XXXX format)
3. Insert each into `licenses` with `owner_user_id = request.user_id`, `purchase_request_id = request.id`
4. Update request `status = 'approved'`
5. Write to `audit_log`
6. Emit `purchase:approved` to requesting user's socket room
7. Return list of generated keys

### Licenses (changed)

| Method | Route                        | Auth        | Description                          |
|--------|------------------------------|-------------|--------------------------------------|
| GET    | /api/licenses                | auth        | superadmin: all; admin: owned only   |
| POST   | /api/licenses/generate       | superadmin  | Generate key directly (no purchase)  |
| POST   | /api/licenses/:id/transfer   | admin       | Transfer ownership to another user   |
| PATCH  | /api/licenses/:id/unbind     | admin (own) | Detach from device                   |
| PATCH  | /api/licenses/:id/deactivate | superadmin  | Immediately expire                   |
| DELETE | /api/licenses/:id            | superadmin  | Hard delete                          |

**Transfer validation:**
- Target user must exist (`status = 'approved'`)
- License must be owned by requesting user OR superadmin
- Writes to `license_transfers` audit table
- Superadmin can transfer any license

### Downloads (new)

| Method | Route                        | Auth        | Description                        |
|--------|------------------------------|-------------|------------------------------------|
| GET    | /api/downloads               | public      | List all downloadable files        |
| GET    | /api/downloads/latest/apk    | public      | Latest APK metadata                |
| GET    | /api/downloads/latest/bin    | public      | Latest BIN metadata                |
| GET    | /api/downloads/:id/file      | public      | Stream/download file               |
| POST   | /api/downloads/upload        | superadmin  | Upload new APK or BIN (multipart)  |

### Audit Log (new)

| Method | Route           | Auth        | Description              |
|--------|-----------------|-------------|--------------------------|
| GET    | /api/audit-log  | superadmin  | Recent actions (last 200)|

---

## 7.6 — Landing Page Design (`apps/landing/`)

**Tech stack:** Next.js 14 + TailwindCSS (independent app, no shared auth context with dashboard)

**Brand colors:**
- Primary red: `#DC2626` (from JJT logo)
- Accent gold: `#D4A017` (from JJT logo ring)
- Dark bg: `#0F172A` (matches dashboard)
- Text: `#F1F5F9`

**Logo:** `jjt-logo.png` placed in `/public/` of landing app

### Pages

```
/                          — Home (all sections in one scroll)
/auth/login                — Enhanced login
/auth/signup               — Registration + pending notice
/auth/forgot-password      — Request reset link
/auth/reset-password       — Enter new password (via token URL)
/download                  — Standalone downloads + install guide page
```

### Home Page Sections (scroll order)

1. **Navbar** — JJT logo, "JJT PisoTab", nav links, Login/Get Started buttons

2. **Hero** — Full-width, dark bg
   - JJT logo (large, centered)
   - Headline: "Smart Coin-Operated Phone Rental System"
   - Subheadline: "Turn any Android tablet into a self-service rental kiosk. Coin-operated, web-managed, offline-ready."
   - CTA: "Start Free Trial" → /auth/signup | "Download App" → #downloads

3. **Features Grid** (6 cards, 3×2)
   - ⏱ Real-time Timer — Countdown on device, live sync to web dashboard
   - 🪙 Coin Operated — ESP32 coin acceptor with MQTT integration
   - 🔌 USB Mode — Charge-based time tracking (USB connect/disconnect)
   - 📊 Web Dashboard — Manage all devices and sessions remotely
   - 🔒 Kiosk Lock — Full Android lockdown, no escape without PIN
   - 📡 Offline Ready — Stores locally, syncs when connection restores

4. **How It Works** (3 steps, horizontal)
   - Step 1: Register & Install — Sign up, download APK, install on tablet
   - Step 2: Configure — Set up devices, pricing, and coin box
   - Step 3: Start Earning — Customers insert coins, timer starts automatically

5. **Downloads** (id="downloads")
   - Two cards side by side:
     - **Android APK** — version badge, file size, "Download APK" button, last updated
     - **ESP32 Firmware (.bin)** — version badge, file size, "Download BIN" button, last updated
   - Note: "7-day free trial included. No license key needed to start."

6. **Installation Guide** (tabbed)
   - **Tab 1: Android Tablet Setup**
     1. Download and install the APK on your Android tablet
     2. Open PisoTab — complete first-time setup (server URL, device name, admin PIN)
     3. Enable Device Owner mode via ADB: `adb shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver`
     4. Enable Kiosk Mode in Settings → Security
     5. Register the device in your web dashboard (Devices → Add Device)
     6. Tablet is now ready — insert a coin or press Start from the dashboard

   - **Tab 2: ESP32 Flash Guide**
     1. Download the ESP32 Flash Tool (esptool or ESP Flash Download Tool)
     2. Download the `pisotab_esp32.bin` firmware file
     3. Connect ESP32 to PC via USB
     4. Flash: `esptool.py write_flash 0x0 pisotab_esp32.bin`
     5. On first boot, connect to WiFi AP "PisoTab-Setup" and enter your WiFi credentials
     6. Coin box connects to your local MQTT server automatically

7. **Trial & Pricing**
   - "Start with a 7-day free trial — no credit card needed"
   - After trial: single license per device, managed from your dashboard
   - Purchase licenses from inside the dashboard (GCash payment)

8. **CTA Banner** — "Ready to start?" | Login | Sign Up

9. **Footer** — © 2026 JJT PisoTab | Contact | Privacy

---

## 7.7 — Authentication Flow Design

### Sign Up (`/auth/signup`)

**Form fields:**
- Full Name (required)
- Business Name (optional, e.g. "Joey's Rentals")
- Username (required, unique, alphanumeric + underscore)
- Email (required, unique, for password reset)
- Password (required, min 8 chars, show/hide toggle 👁)
- Confirm Password (required, must match)
- Terms agreement checkbox

**Flow:**
1. Submit → `POST /api/auth/register`
2. Backend creates user: `status = 'pending'`, `role = 'admin'`
3. Emits `user:pending` to dashboard (superadmin sees badge)
4. Frontend shows: pending notice screen ("Account pending approval — you'll be notified by your administrator.")

### Login (`/auth/login`)

**Form fields:**
- Username
- Password (show/hide 👁 toggle)
- "Forgot password?" link

**Flow:**
- Success + `approved` → redirect to `/dashboard`
- Success + `pending` → show inline pending notice
- Success + `suspended` → show suspended message
- Failure → show error

### Forgot Password (`/auth/forgot-password`)

**Form:** Username or Email

**Flow:**
1. Submit → `POST /api/auth/forgot-password`
2. Backend finds user, generates token (UUID, 1hr expiry), stores in `password_reset_tokens`
3. **If SMTP configured:** sends email with link `/auth/reset-password?token=XXX`
4. **If no SMTP:** response body includes the reset URL directly (shown on screen)
5. User shown: "Check your email for a reset link" (or the direct link in dev/LAN mode)

### Reset Password (`/auth/reset-password`)

**Form:** New Password + Confirm (both with show/hide 👁)

**Flow:**
1. Token validated on load (404 if expired/used)
2. Submit → `POST /api/auth/reset-password` with token + new password
3. Token marked `used_at = now`
4. Redirect to `/auth/login` with success toast

---

## 7.8 — Dashboard Changes

### New Sidebar Items (per role)

**Super Admin sidebar:**
```
Overview          (all data, cross-account)
Devices           (all devices, all accounts)
Sessions          (all sessions)
Analytics         (global analytics)
Pricing           (global pricing tiers + peak rules)
──────────────── superadmin-only below ────────────────
Users             (with pending badge 🔴)
Purchase Requests (with pending badge 🔴)
GCash Settings
Firmware OTA
Audit Log
──────────────── shared below ─────────────────────────
Licenses          (full: generate, manage, transfer)
Branches
```

**Admin sidebar:**
```
Overview
Devices
Sessions
Analytics
Pricing
Licenses          (buy + view own only)
Branches
```

**Staff sidebar:**
```
Overview
Devices
Sessions
```

### New Pages (dashboard)

**`/dashboard/users`** (superadmin only)
- Table: Full Name, Username, Business Name, Email, Role, Status, Registered date
- Per-row actions: Approve | Suspend | Change Role (dropdown: admin/staff) | Delete
- Badge count on sidebar for pending users
- Filter: All | Pending | Approved | Suspended

**`/dashboard/purchase-requests`** (superadmin: all; admin: own)
- Superadmin view: table with User, Quantity, Total, GCash Ref, Submitted date, Status
  - Per-row: "Approve" button (opens confirm modal with note field) | "Reject" button (opens reason modal)
  - Approve auto-generates license keys and shows them in a result modal
- Admin view: own requests only, read-only status badges, no actions

**`/dashboard/gcash-settings`** (superadmin only)
- Form: GCash Name, GCash Number, QR Image upload
- Current values shown below form

**`/dashboard/licenses`** (changed, split by role)
- **Superadmin view:**
  - Existing: generate key, list all, unbind/deactivate/delete
  - New: "Pricing" panel — default price field + per-user overrides table (add/edit/delete)
  - New: Transfer panel on each key row — search user by username → transfer
  - New: `owner_user_id` column in license table (whose account)
- **Admin view:**
  - "My Licenses" tab: keys owned by this user, device binding, status, transfer button
  - "Buy License" button → purchase modal:
    - Shows your custom price (or default): "₱XXX per license"
    - Quantity input (1–10)
    - Calculated total
    - GCash info box: name + number (from gcash_settings)
    - QR image if uploaded
    - Fields: GCash Reference Number, Your Full Name (used in GCash)
    - Submit → `POST /api/license-purchases`
    - Success: "Request submitted! Await superadmin approval."
  - "My Requests" tab: own request history with status badges

---

## 7.9 — License Purchase Flow (end-to-end)

```
Admin fills Buy License form
  │ quantity=2, reference="REF123", sender_name="Joey T"
  ▼
POST /api/license-purchases
  │ Creates request: status='pending', price_per_unit=₱299, total=₱598
  ▼
Superadmin sees 🔴 badge on "Purchase Requests" sidebar
  │ Views request: user, quantity, GCash ref, amount
  ▼
Superadmin verifies GCash payment manually
  │ Clicks "Approve" → confirms
  ▼
Backend auto-generates 2 license keys:
  │  PTAB-A1B2-C3D4-E5F6-G7H8  (owner=admin, purchase_ref=req_xxx)
  │  PTAB-I1J2-K3L4-M5N6-O7P8  (owner=admin, purchase_ref=req_xxx)
  │ Updates request status='approved'
  │ Writes to audit_log
  ▼
Superadmin sees keys in modal → can copy
Admin's "My Licenses" tab now shows the 2 new keys
Admin activates keys on their tablet devices
```

---

## 7.10 — License Transfer Flow

```
Admin A owns a license key (unused or unbound from device)
  │ Goes to My Licenses → clicks "Transfer" on key
  │ Searches: username = "admin_b"  ← must be registered + approved
  ▼
POST /api/licenses/:id/transfer  { to_username: "admin_b" }
  │ Backend validates: license is owned by admin_a, admin_b exists + approved
  │ Updates licenses.owner_user_id = admin_b.id
  │ Writes license_transfers audit record
  ▼
Admin A: license disappears from their list
Admin B: license appears in their "My Licenses" tab
```

---

## 7.11 — GCash Settings Flow

```
Superadmin goes to GCash Settings page
  │ Enters: GCash Name = "Joey T.", GCash Number = "0917-123-4567"
  │ (Optional) Uploads QR code image
  ▼
PATCH /api/gcash-settings
  ▼
When admin clicks "Buy License":
  GET /api/gcash-settings → shows name + number in the payment info box
```

---

## 7.12 — Suggested Improvements (Architecture Recommendations)

The following are improvements beyond the immediate requirements. Implement after Phase 7 core is stable.

### P1 — Email Notifications (High Value)
- Use **Nodemailer** with Gmail SMTP (free, zero-config)
- Triggers: account approved, purchase approved/rejected, license expiring in 7 days
- Config: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env`
- Without SMTP: system still functional (show links on screen instead)

### P2 — Dashboard Notification Badges (UX)
- Superadmin sidebar shows live badge counts: pending users + pending purchase requests
- Real-time via Socket.IO: `user:pending` + `purchase:pending` events
- Clears when reviewed

### P3 — Per-Admin Data Scoping
- Each admin's dashboard shows only their own devices, sessions, and revenue
- Superadmin sees all, with a "Filter by account" dropdown
- Requires `devices.owner_user_id` column + JOIN filtering on all queries

### P4 — Invoice / Receipt PDF
- On purchase approval, auto-generate a PDF receipt
- Fields: buyer name, quantity, amount, reference number, approval date, license keys
- Served via `/api/license-purchases/:id/receipt` (admin access)
- Library: `pdfkit` (Node.js, no native deps)

### P5 — Two-Factor Authentication (TOTP) for Superadmin
- Time-based OTP using `speakeasy` + `qrcode` libraries
- Superadmin scans QR code on first enable → stores encrypted secret
- Login prompts for 6-digit code after password

### P6 — Changelog / Version History Page
- Landing page section listing recent APK + firmware updates
- Pulled from `downloadable_files.changelog` field
- Helps users know when to update

### P7 — Support / Contact Form (Landing Page)
- Simple form: name, email, message
- Sends to configured email or Telegram bot
- No backend DB needed (fire-and-forget)

### P8 — Batch Approval (Superadmin UX)
- Checkboxes on Users + Purchase Requests tables
- "Approve Selected" bulk action
- Reduces clicks for superadmin during busy periods

---

## 7.13 — Implementation Order (Recommended)

Execute in this order to minimize rework and dependency conflicts:

```
Step 1: DB migrations (users, password_reset, gcash_settings,
        license_pricing, license_purchase_requests, license_transfers,
        downloadable_files, audit_log, licenses columns)

Step 2: Backend middleware (requireSuperAdmin, update requireAuth to
        check status='approved', update requireAdmin)

Step 3: Auth routes (register, forgot-password, reset-password, me)

Step 4: Users management routes (approve, suspend, role change)

Step 5: GCash settings routes

Step 6: License pricing routes

Step 7: License purchase request routes (submit, list, approve, reject)

Step 8: License routes (update GET for scoping, transfer endpoint)

Step 9: Downloads routes + file serving

Step 10: Audit log route

Step 11: Dashboard — auth pages (login enhancements, signup, forgot/reset)

Step 12: Dashboard — Users page (superadmin)

Step 13: Dashboard — Purchase Requests page

Step 14: Dashboard — GCash Settings page

Step 15: Dashboard — Licenses page (split by role)

Step 16: Dashboard — sidebar updates (badges, role-gated items)

Step 17: Landing page (apps/landing/) — full build

Step 18: Socket.IO events for real-time badges (user:pending, purchase:pending)

Step 19: Email notifications (SMTP, optional)

Step 20: Testing + QA (role boundary checks, purchase flow end-to-end)
```

---

## 7.14 — Key Design Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Separate `apps/landing/` from `apps/dashboard/` | Landing is public (no auth context), different deployment (CDN/static), cleaner separation of concerns |
| `status = 'pending'` blocks dashboard access | Prevents unreviewed accounts from accessing sensitive device/session data |
| Price snapshot stored on purchase request | Locks in the price at time of purchase — superadmin price changes don't retroactively affect pending requests |
| License keys auto-generated on approval (not pre-generated) | Prevents superadmin from accidentally pre-generating unused keys; ties supply to confirmed payment |
| Transfer to `registered + approved` accounts only | Prevents license loss to non-existent or suspended accounts |
| `audit_log` table for all superadmin actions | Accountability trail for: user approvals, role changes, license operations, price changes |
| No SMTP required for forgot-password | Makes system functional on LAN/intranet deployments without email infrastructure |
| GCash is manual-only (no webhook) | GCash webhook requires verified merchant account + public HTTPS. Manual flow works for small operators; webhook can be added in Phase 8 |
| `downloadable_files` table (not just static files) | Allows versioning, changelogs, and controlled distribution tracking |

---

### Phase 2 — Coin Integration Complete ✅

**Date:** 2026-04-10

**What was built:**
- ESP32 flashed with MQTT firmware, connects to local aedes broker
- Backend MQTT bridge: auto-registers device, auto-starts sessions, adds time
- Tablet timer responds to coins in real-time (running and paused states)
- Lock screen dismisses automatically when coin starts new session

---

### Phase 1 — MVP Complete ✅

**Date:** 2026-03-28

**What was built:**

#### Backend (`apps/backend/`)
- Express + Socket.IO server with full REST API
- SQLite database (auto-migrates to PostgreSQL via driver swap)
- Entities: users, devices, sessions, pricing_tiers, coin_events, locations
- Session timer engine (server-side tick, real-time WebSocket broadcasts)
- MQTT bridge for ESP32 integration
- Telegram notification service (opt-in via .env)
- JWT authentication (admin/staff roles)
- Heartbeat endpoint for Android device presence

#### Dashboard (`apps/dashboard/`)
- Next.js 14 + TailwindCSS admin panel
- Login page with JWT auth
- Overview page: live stats + active session monitor + revenue chart
- Devices page: real-time device cards with start/pause/resume/end/add-time controls
- Sessions page: filterable session table
- Logs page: daily revenue chart (Recharts) + session log
- Pricing page: create/toggle/delete pricing tiers
- Settings page: server config info
- Socket.IO real-time updates via custom `useDevices` hook

#### Android App (`apps/android/`)
- Kotlin project with Hilt DI + Room + Retrofit + Socket.IO
- `TimerService`: foreground service countdown, syncs to server every 10s, fires lock screen on expiry
- `SyncService`: heartbeat every 30s, offline coin event flush queue
- `BootReceiver`: auto-launch on device restart
- `DeviceAdminReceiver`: Device Owner API hooks
- `KioskManager`: lock task mode, immersive fullscreen, button intercept
- `MainViewModel`: session state machine (Idle/Active/Paused/Expired)
- `LockScreenActivity`: full-screen overlay, blocks all input
- `SetupActivity`: admin PIN-gated config screen
- Offline-first: local Room DB stores sessions; syncs to server when online

#### ESP32 Firmware (`firmware/esp32/pisotab_coin/`)
- Pulse-counting coin acceptor (ISR debounced)
- Configurable coin-to-time mapping
- WiFiManager for zero-config WiFi provisioning
- MQTT publish with offline queue (50 events)
- BLE server with notify characteristic (fallback when WiFi unavailable)
- Receives commands from server (reboot, etc.)

**Architecture highlights:**
- Offline-first design throughout: Android stores locally, ESP32 queues events, both sync when connected
- Single WebSocket channel for all real-time updates (reduces polling)
- Server-side timer is authoritative; Android syncs periodically for UI accuracy
- All coin events flow through `/api/coins` — unified regardless of source (ESP32 MQTT, Android BLE, or direct API)

**Next phases:**
- Phase 2: BLE coin receiver on Android side (scan for PisoTab-Coin BLE device)
- Phase 3: Device Owner provisioning script + full kiosk enforcement
- Phase 4: Telegram alerts + offline sync polish
- Phase 5: QR payments, AI analytics, dynamic pricing, licensing system
