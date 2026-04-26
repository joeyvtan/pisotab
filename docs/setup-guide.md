# JJT PisoTab — Complete Setup Guide

This guide walks you through the full setup of the JJT PisoTab system from scratch:
installing the Android app, flashing the ESP32 coin acceptor, and configuring the admin dashboard.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Dashboard — Create Your Account](#2-dashboard--create-your-account)
3. [Android App — Installation](#3-android-app--installation)
4. [Android App — Initial Setup](#4-android-app--initial-setup)
5. [ESP32 — Flashing the Firmware](#5-esp32--flashing-the-firmware)
6. [ESP32 — WiFi Configuration](#6-esp32--wifi-configuration)
7. [Dashboard — Register a Device](#7-dashboard--register-a-device)
8. [Android App — Connect to Backend](#8-android-app--connect-to-backend)
9. [Dashboard — Activate a License](#9-dashboard--activate-a-license)
10. [Dashboard — Admin Settings](#10-dashboard--admin-settings)
11. [Android App — Enable Kiosk Mode](#11-android-app--enable-kiosk-mode)
12. [Testing the Full Flow](#12-testing-the-full-flow)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

### What You Need

**Hardware:**
- Android tablet (Android 8.0 or higher, min SDK 26)
- ESP32 Dev Kit v1
- Coin acceptor module (pulse-type, 12V)
- 12V power supply for coin acceptor
- USB cable (for ESP32 flashing)
- WiFi router/network

**Software (on your PC):**
- [Arduino IDE](https://www.arduino.cc/en/software) or PlatformIO (VS Code extension)
- USB driver for ESP32 (CP210x or CH340 depending on your board)

**Accounts:**
- JJT PisoTab dashboard account at `https://jjtpisotab.com`

---

## 2. Dashboard — Create Your Account

1. Go to `https://jjtpisotab.com`
2. Click **Get Started** or **Sign In → Register**
3. Fill in your details:
   - Full name
   - Email address
   - Password (min. 6 characters)
4. Click **Create Account**
5. Your account will be in **pending** status until approved by the superadmin
6. Once approved, you will receive an email notification
7. Log in at `https://jjtpisotab.com/login`

> **Note:** If you are the superadmin, use the default credentials:
> - Username: `admin`
> - Password: `admin123`
>
> **Change this password immediately** after first login via Settings → Profile.

---

## 3. Android App — Installation

### Option A: Install APK directly (Sideload)

1. On the Android tablet, go to **Settings → Security**
2. Enable **"Install from Unknown Sources"** (or "Install Unknown Apps" on Android 8+)
3. Download the `pisotab.apk` file to the tablet (via USB, Google Drive, or email)
4. Open the APK file and tap **Install**
5. Tap **Open** when installation is complete

### Option B: ADB Install (from PC)

1. On the tablet, enable **Developer Options**:
   - Go to **Settings → About Tablet**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging** under **Settings → Developer Options**
3. Connect tablet to PC via USB
4. On your PC, run:
   ```
   adb install pisotab.apk
   ```

---

## 4. Android App — Initial Setup

When you first open the app, you will see the main rental screen.

### Access the Setup Panel

1. **Long-press the bottom-right corner** of the screen for 2 seconds
2. Enter the default PIN: **`1234`**
3. The Setup screen opens

### Required Settings to Configure

| Setting | What to Enter |
|---------|--------------|
| **Backend URL** | `https://api.jjtpisotab.com` |
| **Device ID** | Get this from the dashboard after registering your device (Step 7) |
| **Device Name** | e.g., `Phone 01`, `Phone 02` |
| **Admin PIN** | Change from `1234` to your own PIN |

> **Important:** Do not enable Kiosk Mode yet. Complete the full setup first, then enable it last (Step 11).

---

## 5. ESP32 — Flashing the Firmware

### Step 1: Install Arduino IDE and ESP32 Board

1. Open **Arduino IDE**
2. Go to **File → Preferences**
3. In "Additional Boards Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search **"esp32"** → Install **"esp32 by Espressif Systems"** (version 2.0.11 or higher)

### Step 2: Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

| Library | Version |
|---------|---------|
| ArduinoJson | 6.21.3 |
| PubSubClient | 2.8 |
| WiFiManager | 2.0.17 |

### Step 3: Configure the Firmware

1. Open the firmware file:
   ```
   firmware/esp32/pisotab_coin/pisotab_coin.ino
   ```
2. Find these lines and update them:

   ```cpp
   // Change this to your MQTT broker IP or hostname
   #define MQTT_BROKER_HOST "192.168.1.100"
   #define MQTT_BROKER_PORT 1883
   ```

   > If you are not using MQTT (no local broker), the ESP32 will still buffer coin events offline and the Android app can use USB mode instead.

3. Verify your coin pulse mappings match your coin acceptor:
   ```cpp
   // 1 pulse = ₱1 = 5 minutes
   // 5 pulses = ₱5 = 30 minutes
   // 10 pulses = ₱10 = 65 minutes
   // 20 pulses = ₱20 = 140 minutes
   ```
   Adjust these values to match your pricing.

### Step 4: Select Board and Port

1. Connect the ESP32 to your PC via USB
2. Go to **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
3. Go to **Tools → Port** → select the COM port for your ESP32
   - Windows: `COM3`, `COM4`, etc.
   - Mac/Linux: `/dev/ttyUSB0` or `/dev/ttyACM0`
4. Set **Upload Speed** to `921600`

### Step 5: Flash the Firmware

1. Click the **Upload** button (→ arrow) in Arduino IDE
2. Wait for "Uploading..." to complete
3. You will see "Done uploading" when successful
4. Open **Tools → Serial Monitor** (baud rate: `115200`) to verify boot messages

---

## 6. ESP32 — WiFi Configuration

After flashing, the ESP32 needs to connect to your WiFi network.

1. On your phone or tablet, go to **WiFi Settings**
2. Look for a network named **"PisoTab-Coin"**
3. Connect to it (no password)
4. A configuration page will open automatically (or go to `192.168.4.1` in a browser)
5. Click **"Configure WiFi"**
6. Select your WiFi network name (SSID)
7. Enter your WiFi password
8. Click **Save**
9. The ESP32 will reboot and connect to your network
10. The built-in LED (GPIO 2) will blink rapidly when connected

> **Note:** If the config page does not open automatically, open a browser and go to `http://192.168.4.1`

---

## 7. Dashboard — Register a Device

1. Log in to `https://jjtpisotab.com`
2. Go to **Devices** in the left menu
3. Click **"Add Device"**
4. Fill in:
   - **Device Name:** e.g., `Phone 01`
   - **Location/Branch:** select or create a branch
5. Click **Save**
6. The dashboard will generate a **Device ID** (e.g., `dev_abc123`)
7. **Copy this Device ID** — you will need it for the Android app (Step 4 and Step 8)

---

## 8. Android App — Connect to Backend

1. Open the app on the tablet
2. Long-press bottom-right → enter your PIN
3. Enter the **Device ID** you copied from the dashboard
4. Make sure **Backend URL** is set to `https://api.jjtpisotab.com`
5. Tap **Save / Connect**
6. The app will attempt to connect — you should see **"Connected"** status

---

## 9. Dashboard — Activate a License

Each device needs a license to operate after the 7-day free trial.

### Check Trial Status

1. Go to **Licenses** in the dashboard
2. Your device will show **"Trial"** status with days remaining

### Activate a Paid License

If you have a license key (format: `PTAB-XXXX-XXXX-XXXX-XXXX`):

1. On the tablet app, long-press bottom-right → enter PIN
2. Go to **License** section
3. Enter your license key
4. Tap **Activate**
5. The app will contact the server and confirm activation

### Purchase a License (via Dashboard)

1. Go to **Buy License** in the dashboard
2. Select a plan
3. Submit payment via GCash
4. Superadmin will approve and assign the license key to your account
5. You will receive the key via email or dashboard notification

---

## 10. Dashboard — Admin Settings

### Pricing Tiers

Set how much time each peso amount gives:

1. Go to **Pricing** in the dashboard
2. Click **"Add Tier"**
3. Enter:
   - **Amount (₱):** e.g., `5`
   - **Duration (minutes):** e.g., `30`
4. Click **Save**
5. Repeat for each coin denomination you accept

### Device Remote Configuration

Push settings to any tablet remotely:

1. Go to **Devices** → click on a device
2. Click **"Configure"** or the settings icon
3. Adjust settings:
   - **Kiosk Mode:** lock tablet to app
   - **Floating Timer:** show timer overlay
   - **Alarm on WiFi Disconnect:** anti-theft
   - **Alarm on Charger Disconnect:** anti-theft
   - **Deep Freeze:** wipe non-whitelisted apps after session ends
4. Click **"Push Config"** — settings apply to the tablet instantly if online

### Branch / Location Management

1. Go to **Branches** in the dashboard
2. Click **"Add Branch"**
3. Enter branch name and address
4. Assign devices to the branch

### User Management (Superadmin Only)

1. Go to **Users** in the dashboard
2. View pending accounts — click **Approve** or **Reject**
3. You can also:
   - **Suspend** a user account
   - **Change role** (admin / staff)
   - **Create** a new staff account directly

### GCash Settings

1. Go to **GCash Settings** in the dashboard
2. Enter your GCash number and account name
3. This is displayed to users when they submit payment requests

---

## 11. Android App — Enable Kiosk Mode

> **Do this last**, after everything is working correctly.

### Basic Kiosk Mode (app stays on top)

1. Long-press bottom-right → enter PIN
2. Toggle **"Kiosk Mode"** → ON
3. Tap **Save**
4. The tablet will lock to the PisoTab app

### Full Device Lock (requires ADB — optional)

For complete lockdown where users cannot exit the app at all:

1. Connect tablet to PC via USB with USB Debugging enabled
2. Run this command on your PC:
   ```
   adb shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver
   ```
3. This makes PisoTab the **Device Owner** — the strongest kiosk lock available

### Floating Timer (optional)

To show a timer overlay while users browse other apps:

1. Run this ADB command:
   ```
   adb shell appops set com.pisotab.app SYSTEM_ALERT_WINDOW allow
   ```
2. Then enable **Floating Timer** in the app settings

---

## 12. Testing the Full Flow

Before deploying, test the complete rental flow:

1. **Dashboard:** Verify the device shows **Online** status
2. **Coin test:** Insert a coin — the tablet should add time and show the session starting
3. **Session end:** Let the timer run to zero — session should end automatically
4. **Remote command:** From the dashboard, send a **Lock Screen** command — tablet should lock
5. **Email test:** Trigger a password reset to verify SMTP is working
6. **Push notification test:** Trigger an event that sends an FCM notification to the app

---

## 13. Troubleshooting

### App shows "Connection Failed"
- Verify **Backend URL** is exactly `https://api.jjtpisotab.com` (no trailing slash)
- Check the tablet has internet access
- Verify the backend is running: open `https://api.jjtpisotab.com/health` in a browser — should return `{"ok":true}`

### Coins not being detected
- Check ESP32 wiring: coin acceptor signal → GPIO 4
- Open Serial Monitor (115200 baud) to see if pulses are being received
- Verify ESP32 is connected to WiFi (LED blinks rapidly when connected)
- Check MQTT broker is running if using MQTT mode

### Device shows Offline in dashboard
- Tablet must be running the app and connected to the internet
- Check the Device ID matches exactly what's registered in the dashboard
- Restart the app on the tablet

### License shows "Trial Expired"
- Enter a valid license key in the app settings (long-press → PIN → License)
- Contact admin/superadmin for a license key

### Cannot access Setup screen
- Default PIN is `1234`
- If PIN was changed and forgotten, contact your superadmin to reset via dashboard remote config

### Kiosk Mode — tablet is locked and can't access settings
- If you set up full Device Owner lock via ADB, you must use ADB to exit:
  ```
  adb shell am force-stop com.pisotab.app
  ```
- Then quickly open the app and access setup before it relocks

### ESP32 WiFi reset (forgotten credentials)
- Hold the **BOOT button** on the ESP32 for 5 seconds during startup
- This resets WiFi credentials and restarts the "PisoTab-Coin" access point

---

*For support, contact your system administrator or visit the dashboard at `https://jjtpisotab.com`.*
