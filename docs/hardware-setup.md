# Hardware Setup Guide

## Components Required

| Component | Qty | Notes |
|-----------|-----|-------|
| ESP32 DevKit v1 | 1 | Any 38-pin ESP32 |
| Coin acceptor (CH-926 or compatible) | 1 | Pulse output type |
| 5V relay module | 1 | Optional — to cut power to device |
| USB charger / 5V power supply | 1 | For ESP32 |
| Jumper wires | — | |

---

## Wiring Diagram

```
Coin Acceptor
  SIGNAL  ──────────────────────── GPIO 4 (ESP32)
  +12V    ── [12V PSU +]
  GND     ── [Common GND] ─────── GND (ESP32)

ESP32
  GPIO 4  ← Coin pulse signal
  GPIO 2  → Built-in LED (feedback)
  VIN/5V  ← 5V USB
  GND     ← Common GND
```

---

## Coin Acceptor Settings

Most CH-926 coin acceptors have DIP switches for coin programming:
- **Set output mode to PULSE** (not inhibit)
- Each pulse = ₱1 value
- Configure pulse count per coin face value

Default mapping in firmware:
| Coin | Pulses | Time |
|------|--------|------|
| ₱1   | 1      | 5 min |
| ₱5   | 5      | 30 min |
| ₱10  | 10     | 65 min |
| ₱20  | 20     | 140 min |

---

## Firmware Setup

1. Install Arduino IDE + ESP32 board support
2. Install libraries listed in `libraries.txt`
3. Open `pisotab_coin.ino`
4. Flash to ESP32
5. On first boot: ESP32 creates WiFi AP **"PisoTab-Coin"**
6. Connect to that AP → configure your WiFi credentials + MQTT broker IP
7. ESP32 reboots and connects to your network

---

## MQTT Broker Setup (Mosquitto — local)

Install on the same machine as the backend:

```bash
# Ubuntu/Debian
sudo apt install mosquitto mosquitto-clients

# Windows
# Download from https://mosquitto.org/download/
```

Default config (no auth for LAN use):
```
# /etc/mosquitto/mosquitto.conf
listener 1883
allow_anonymous true
```

Set `MQTT_BROKER_URL=mqtt://localhost:1883` in `apps/backend/.env`

---

## Android Device Setup

1. Install PisoTab APK on Android device
2. Open app → long-press bottom-right corner to access Setup
3. Enter PIN (default: `1234`)
4. Configure:
   - **Backend URL**: `http://[your-server-IP]:4000`
   - **Device ID**: Copy from the web dashboard after registering the device
   - **Kiosk Mode**: Enable for production use

### Device Owner Mode (optional, for full kiosk lockdown)

For full kiosk mode (prevents users from leaving the app), set the app as Device Owner:

```bash
# Via ADB (USB debugging must be enabled first, then disable after)
adb shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver
```

This must be done on a fresh device (no accounts added).
