# Getting Started with PisoTab

## Quick Start (Phase 1 — No Coins Yet)

### 1. Backend

```bash
cd apps/backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET, MQTT_BROKER_URL (optional), TELEGRAM credentials (optional)
node src/db/setup.js   # Initialize database
npm run dev            # Start server on http://localhost:4000
```

Default admin credentials: `admin` / `admin123`

### 2. Admin Dashboard

```bash
cd apps/dashboard
npm install
npm run dev            # Open http://localhost:3000
```

Login → Register devices → Start sessions manually.

### 3. Android App

1. Open `apps/android/` in Android Studio
2. Edit `app/build.gradle.kts`: set `API_BASE_URL` to your server IP
3. Build and install APK on the rental phone
4. Configure via the hidden setup screen (long-press bottom-right → enter PIN `1234`)

---

## API Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Get JWT token |
| `/api/devices` | GET | List all devices |
| `/api/devices` | POST | Register device |
| `/api/devices/:id/heartbeat` | POST | Device online ping |
| `/api/sessions` | POST | Start session |
| `/api/sessions/:id/end` | POST | End session |
| `/api/sessions/:id/pause` | POST | Pause session |
| `/api/sessions/:id/resume` | POST | Resume session |
| `/api/sessions/:id/add-time` | POST | Add time manually |
| `/api/sessions/:id/sync` | PATCH | Sync timer from Android |
| `/api/sessions/revenue/summary` | GET | Daily revenue |
| `/api/pricing` | GET | All pricing tiers |
| `/api/coins` | POST | Report coin insert (ESP32) |

---

## WebSocket Events

Connect to `http://localhost:4000` with Socket.IO.

Auth: `{ auth: { token: "your_jwt_token" } }`

| Event | Direction | Payload |
|-------|-----------|---------|
| `device:status` | S→C | `{ device_id, status }` |
| `session:started` | S→C | `{ session }` |
| `session:updated` | S→C | `{ session_id, time_remaining_secs }` |
| `session:ended` | S→C | `{ session_id, device_id }` |
| `coin:inserted` | S→C | `{ device_id, coin_value, credited_secs }` |
| `cmd:start` | C→S | `{ device_id, duration_mins }` |
| `cmd:end` | C→S | `{ session_id }` |
| `cmd:add_time` | C→S | `{ session_id, added_mins }` |
| `cmd:lock` | C→S | `{ device_id }` |

---

## Project Structure

```
piso-tab/
├── apps/
│   ├── backend/                # Node.js REST API + WebSocket + MQTT bridge
│   │   └── src/
│   │       ├── db/             # SQLite setup and schema
│   │       ├── routes/         # Express route handlers
│   │       ├── services/       # Timer engine, MQTT bridge, notifier
│   │       ├── socketHandlers.js
│   │       └── index.js
│   ├── dashboard/              # Next.js admin web app
│   │   └── src/
│   │       ├── app/            # Next.js app router pages
│   │       ├── components/     # React components
│   │       ├── hooks/          # Custom React hooks
│   │       └── lib/            # API client, socket, utilities
│   └── android/                # Kotlin Android kiosk app
│       └── app/src/main/
│           ├── java/com/pisotab/app/
│           │   ├── data/       # Room DB + Retrofit API
│           │   ├── service/    # Timer + Sync foreground services
│           │   ├── receiver/   # Boot + DeviceAdmin receivers
│           │   ├── ui/         # Activities + ViewModel
│           │   └── util/       # KioskManager + PrefsManager
│           └── res/            # Layouts + assets
├── firmware/
│   └── esp32/pisotab_coin/     # Arduino sketch for coin acceptor
└── docs/                       # This guide + hardware setup
```
