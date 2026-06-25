/**
 * PisoTab ESP8266 (NodeMCU) Coin Acceptor Firmware
 * ==================================================
 * Functionally identical to the ESP32 version but adapted for NodeMCU v1/v2/v3
 * (ESP-12E / ESP-12F module). Uses the same MQTT topics and backend — the two
 * variants are interchangeable from the server's perspective.
 *
 * Platform differences from ESP32 version:
 *  - ESP8266WiFi + ESP8266httpUpdate (no WiFi.h / HTTPUpdate.h)
 *  - EEPROM instead of Preferences for device ID storage
 *  - Different GPIO assignments (see pin config below)
 *  - Built-in LED on D4/GPIO2 is ACTIVE-LOW on NodeMCU
 *  - I2C default pins are D2/D1 (GPIO4/GPIO5)
 *
 * Wiring:
 *  Coin acceptor SIGNAL → 10kΩ → D5  (GPIO14)
 *  Built-in LED                  D4  (GPIO2)   [active LOW]
 *  Relay IN (optional)         ← D6  (GPIO12)
 *  LCD SDA  (optional)         ← D2  (GPIO4)
 *  LCD SCL  (optional)         ← D1  (GPIO5)
 *
 * Compatible coin acceptors: CH-926, NRI G-13, Suzohapp
 * Pulse output: 1 pulse = ₱1, 5 pulses = ₱5, etc. (configurable)
 *
 * Arduino IDE board: "NodeMCU 1.0 (ESP-12E Module)"
 * Required libraries (Library Manager):
 *   - PubSubClient        (Nick O'Leary)
 *   - ArduinoJson         (Benoit Blanchon) — v6.x
 *   - WiFiManager         (tzapu) — v2.x
 *   - LiquidCrystal_I2C  (Frank de Brabander) — if USE_LCD enabled
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <WiFiManager.h>        // https://github.com/tzapu/WiFiManager
#include <ESP8266httpUpdate.h>  // ESP8266 OTA over HTTP

// ── Optional 16×2 LCD I2C display ───────────────────────────────────────────
// Wiring: SDA → D2 (GPIO4) | SCL → D1 (GPIO5)   (ESP8266 I2C defaults)
// Common I2C address: 0x27 (PCF8574 backpack) or 0x3F
// Comment out to build without LCD support:
#define USE_LCD

// ── Optional Charger Relay (Charge Protection) ───────────────────────────────
// Wiring: Relay IN pin ← D6 (GPIO12) — 3.3V compatible, no voltage divider needed
// Use a NC (Normally-Closed) relay module for fail-safe:
//   Charger reconnects automatically if the ESP8266 loses power.
//   NC relay: LOW signal = coil energized = contacts OPEN = charger DISCONNECTED
//             HIGH signal = coil off     = contacts CLOSED = charger CONNECTED
// Comment out to build without relay support:
#define USE_RELAY
#ifdef USE_RELAY
#define RELAY_PIN          12   // D6 on NodeMCU
#define RELAY_CHARGER_ON   HIGH // NC contact closed  → charger connected
#define RELAY_CHARGER_OFF  LOW  // NC contact open    → charger disconnected
#endif

#ifdef USE_LCD
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2);
int  lcdTimeRemaining = 0;   // seconds remaining (set by timer_sync from backend)
bool lcdInSession     = false;
bool lcdPaused        = false;  // true while session is paused; stops local countdown
unsigned long lcdLastTickMs = 0;
#endif

// ── Pin config ──────────────────────────────────────────────────────────────
// WIRING: Coin acceptor signal → 10kΩ → D5 (GPIO14)
//   INPUT_PULLUP is correct for open-drain/open-collector coin acceptors
//   (standard Philippine market CH-926 and clones). The internal pull-up keeps
//   the line at 3.3V when idle; the acceptor pulls it LOW for each pulse.
//   GPIO14 (D5) has no boot-mode constraint and fully supports external interrupts.
//   The RISING interrupt fires at the end of each LOW pulse — counts correctly.
//
// DO NOT use GPIO0, GPIO2, or GPIO15 for the coin pin — these have boot-mode
// pull constraints that conflict with the coin acceptor signal at startup.
#define COIN_PIN        14   // D5 on NodeMCU — supports interrupts, no boot constraint
#define LED_PIN         2    // D4 on NodeMCU — built-in LED, ACTIVE LOW
#define LED_ON          LOW  // NodeMCU built-in LED is active-LOW
#define LED_OFF         HIGH
#define PULSE_DEBOUNCE  50000UL  // µs — ignore pulses faster than 50ms (ISR uses micros())
#define PULSE_TIMEOUT   400      // ms — silence after last pulse = end of coin event

// ── EEPROM layout ────────────────────────────────────────────────────────────
// ESP8266 has no NVS (Preferences). EEPROM emulates Flash-backed storage.
// Layout: bytes 0-39 = device ID (ASCII, null-padded, 40 chars max)
#define EEPROM_SIZE       64
#define EEPROM_ID_OFFSET   0
#define EEPROM_ID_LEN     40

// ── Server config ────────────────────────────────────────────────────────────
#define MQTT_BROKER_HOST "broker.emqx.io"
#define MQTT_BROKER_PORT 1883

// ── Coin value map ───────────────────────────────────────────────────────────
struct CoinMapping { int pulses; float pesos; int seconds; };

const CoinMapping COIN_MAP[] = {
  {1,  1.0,  5 * 60},   // 1 pulse  = ₱1  = 5 min
  {5,  5.0,  30 * 60},  // 5 pulses = ₱5  = 30 min
  {10, 10.0, 65 * 60},  // 10 pulses = ₱10 = 65 min
  {20, 20.0, 140 * 60}, // 20 pulses = ₱20 = 140 min
};
const int COIN_MAP_SIZE = sizeof(COIN_MAP) / sizeof(COIN_MAP[0]);

// ── State ────────────────────────────────────────────────────────────────────
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

volatile int pulseCount = 0;
volatile unsigned long lastPulseMicros = 0;

String deviceId   = "";
String mqttBroker = MQTT_BROKER_HOST;
int    mqttPort   = MQTT_BROKER_PORT;

// Offline queue — buffers coin events while MQTT is unavailable
struct CoinEvent { int pulses; float pesos; int seconds; unsigned long ts; };
CoinEvent offlineQueue[50];
int queueHead = 0;
int queueSize = 0;

// ── Forward declarations ──────────────────────────────────────────────────────
void processCoinEvent(int pulses);
void queueEvent(int pulses, float pesos, int seconds);
void flushOfflineQueue();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void blinkLED(int times);
void loadConfig();
void saveDeviceId(const String& id);
#ifdef USE_LCD
void lcdShowIdle();
void lcdShowNotConfigured();
void lcdShowTime(int secs);
void lcdSetSession(int secs);
#endif

// ── Interrupt handler ────────────────────────────────────────────────────────
// IRAM_ATTR is required on ESP8266 — ISR must run from RAM, not Flash.
// In ESP8266 Arduino core >= 2.5, IRAM_ATTR is an alias for ICACHE_RAM_ATTR.
void IRAM_ATTR onCoinPulse() {
  unsigned long now = micros();  // micros() reads hardware timer — ISR-safe on ESP8266
  if (now - lastPulseMicros < PULSE_DEBOUNCE) return;
  lastPulseMicros = now;
  pulseCount++;
}

// ── LCD helpers ───────────────────────────────────────────────────────────────
#ifdef USE_LCD
void lcdShowIdle() {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" Please Insert  ");
  lcd.setCursor(0, 1); lcd.print("     Coins      ");
}

void lcdShowNotConfigured() {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" NOT CONFIGURED ");
  lcd.setCursor(0, 1); lcd.print("  Setup via AP  ");
}

void lcdShowTime(int secs) {
  int h = secs / 3600;
  int m = (secs % 3600) / 60;
  int s = secs % 60;
  char buf[17];
  lcd.setCursor(0, 0); lcd.print("  Time Left:    ");
  lcd.setCursor(0, 1);
  if (h > 0) snprintf(buf, sizeof(buf), "  %02d:%02d:%02d      ", h, m, s);
  else        snprintf(buf, sizeof(buf), "    %02d:%02d        ", m, s);
  lcd.print(buf);
}

void lcdSetSession(int secs) {
  lcdPaused        = false;     // timer_sync always clears pause state
  lcdInSession     = (secs > 0);
  lcdTimeRemaining = secs;
  lcdLastTickMs    = millis();
  if (lcdInSession) lcdShowTime(secs);
  else              lcdShowIdle();
}
#endif

// ── EEPROM helpers ────────────────────────────────────────────────────────────
void loadConfig() {
  EEPROM.begin(EEPROM_SIZE);
  char buf[EEPROM_ID_LEN + 1] = {};
  for (int i = 0; i < EEPROM_ID_LEN; i++) {
    uint8_t c = EEPROM.read(EEPROM_ID_OFFSET + i);
    buf[i] = (c == 0xFF || c == 0x00) ? 0 : c;  // 0xFF = unformatted Flash
  }
  EEPROM.end();
  buf[EEPROM_ID_LEN] = '\0';
  deviceId = String(buf);
  deviceId.trim();
  Serial.printf("[Config] Device ID: %s\n", deviceId.isEmpty() ? "(not set)" : deviceId.c_str());
  Serial.printf("[Config] MQTT: %s:%d\n",   mqttBroker.c_str(), mqttPort);
}

void saveDeviceId(const String& id) {
  EEPROM.begin(EEPROM_SIZE);
  for (int i = 0; i < EEPROM_ID_LEN; i++)
    EEPROM.write(EEPROM_ID_OFFSET + i, i < (int)id.length() ? (uint8_t)id[i] : 0);
  EEPROM.commit();
  EEPROM.end();
  Serial.printf("[Config] Device ID saved: %s\n", id.c_str());
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[PisoTab-8266] Coin firmware starting...");

  pinMode(COIN_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_OFF);  // start dark; lit after init completes
  attachInterrupt(digitalPinToInterrupt(COIN_PIN), onCoinPulse, RISING);

#ifdef USE_RELAY
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_CHARGER_ON);  // charger connected at boot
  Serial.println("[Relay] Initialized — charger ON");
#endif

#ifdef USE_LCD
  Wire.begin(4, 5);  // SDA=D2(GPIO4), SCL=D1(GPIO5) — NodeMCU I2C defaults
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" PisoTab  8266  ");
  lcd.setCursor(0, 1); lcd.print("  Starting...   ");
  Serial.println("[LCD] Initialized");
#endif

  loadConfig();

#ifdef USE_LCD
  // Show "Not Configured" BEFORE setupWiFi() opens the portal so the user
  // sees instructions on the LCD while the config AP is active.
  if (deviceId.isEmpty()) lcdShowNotConfigured();
#endif

  setupWiFi();
  setupMQTT();

#ifdef USE_LCD
  if (deviceId.isEmpty()) {
    lcdShowNotConfigured();
  } else if (!WiFi.isConnected()) {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" WiFi Not Found ");
    lcd.setCursor(0, 1); lcd.print("Check WiFi Creds");
  } else if (!mqtt.connected()) {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(" Server Offline ");
    lcd.setCursor(0, 1); lcd.print("  Check MQTT    ");
  } else {
    lcdShowIdle();
  }
#endif

  Serial.println("[PisoTab-8266] Ready. Waiting for coins...");
  digitalWrite(LED_PIN, LED_ON);  // solid ON = ready
}

// ── Main loop ────────────────────────────────────────────────────────────────
void loop() {
  // Read both volatile ISR variables atomically to avoid race condition
  // where an interrupt fires between the two reads and corrupts pulse count.
  noInterrupts();
  int           capturedPulses    = pulseCount;
  unsigned long capturedLastPulse = lastPulseMicros;
  interrupts();

  // PULSE_TIMEOUT is in ms; lastPulseMicros is in µs — multiply to match units
  if (capturedPulses > 0 && (micros() - capturedLastPulse) > (unsigned long)PULSE_TIMEOUT * 1000UL) {
    noInterrupts();
    pulseCount = 0;
    interrupts();
    processCoinEvent(capturedPulses);
  }

  if (WiFi.isConnected()) {
    if (!mqtt.connected()) reconnectMQTT();
    mqtt.loop();
    flushOfflineQueue();
  }

#ifdef USE_LCD
  // Tick local countdown once per second between backend syncs; stop when paused
  if (lcdInSession && !lcdPaused && lcdTimeRemaining > 0) {
    unsigned long now = millis();
    if (now - lcdLastTickMs >= 1000) {
      lcdLastTickMs = now;
      lcdTimeRemaining--;
      if (lcdTimeRemaining <= 0) lcdSetSession(0);
      else                       lcdShowTime(lcdTimeRemaining);
    }
  }
#endif

  delay(10);
}

// ── Coin processing ──────────────────────────────────────────────────────────
void processCoinEvent(int pulses) {
  if (deviceId.isEmpty()) {
    Serial.println("[Coin] No Device ID configured — event dropped. Connect to PisoTab-Coin-8266 WiFi to set it.");
#ifdef USE_LCD
    lcdShowNotConfigured();
#endif
    return;
  }
  Serial.printf("[Coin] %d pulse(s) detected\n", pulses);

  float pesos = 0; int seconds = 0;
  for (int i = 0; i < COIN_MAP_SIZE; i++) {
    if (COIN_MAP[i].pulses == pulses) { pesos = COIN_MAP[i].pesos; seconds = COIN_MAP[i].seconds; break; }
  }
  if (pesos == 0) { pesos = pulses * 1.0f; seconds = pulses * 5 * 60; }  // proportional fallback

  Serial.printf("[Coin] P%.1f -> %d seconds credited\n", pesos, seconds);
  blinkLED(pulses);

#ifdef USE_LCD
  // Show coin accepted on line 0 immediately. Line 1 is filled after the MQTT
  // result so the user can see whether the event actually reached the server.
  // Do NOT set lcdTimeRemaining here — the admin-configured time comes back
  // via timer_sync from the backend within ~1 second.
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(" Coin Accepted! ");
  lcd.setCursor(0, 1); lcd.print("                ");
#endif

  StaticJsonDocument<256> doc;
  doc["device_id"]     = deviceId;
  doc["coin_value"]    = pesos;
  doc["pulses"]        = pulses;
  doc["credited_secs"] = seconds;
  doc["ts"]            = millis();
  String payload; serializeJson(doc, payload);

  if (mqtt.connected()) {
    String topic = "pisotab/coins/" + deviceId;
    if (mqtt.publish(topic.c_str(), payload.c_str(), false)) {
      Serial.println("[MQTT] Coin event published");
#ifdef USE_LCD
      lcd.setCursor(0, 1); lcd.print(" Please wait... ");
#endif
    } else {
      queueEvent(pulses, pesos, seconds);
#ifdef USE_LCD
      lcd.setCursor(0, 1); lcd.print("  Send Failed!  ");
#endif
    }
  } else {
    queueEvent(pulses, pesos, seconds);
#ifdef USE_LCD
    lcd.setCursor(0, 1); lcd.print(" No Connection! ");
#endif
  }
}

// ── Offline queue ────────────────────────────────────────────────────────────
void queueEvent(int pulses, float pesos, int seconds) {
  if (queueSize >= 50) { queueHead = (queueHead + 1) % 50; queueSize--; }
  int idx = (queueHead + queueSize) % 50;
  offlineQueue[idx] = { pulses, pesos, seconds, millis() };
  queueSize++;
  Serial.printf("[Queue] Event queued (%d pending)\n", queueSize);
}

void flushOfflineQueue() {
  if (queueSize == 0 || !mqtt.connected()) return;
  while (queueSize > 0) {
    CoinEvent& e = offlineQueue[queueHead];
    StaticJsonDocument<256> doc;
    doc["device_id"] = deviceId; doc["coin_value"] = e.pesos;
    doc["pulses"] = e.pulses; doc["credited_secs"] = e.seconds; doc["queued"] = true;
    String payload; serializeJson(doc, payload);
    String topic = "pisotab/coins/" + deviceId;
    if (!mqtt.publish(topic.c_str(), payload.c_str())) break;
    queueHead = (queueHead + 1) % 50; queueSize--;
  }
  if (queueSize == 0) Serial.println("[Queue] Flushed successfully");
}

// ── WiFi ─────────────────────────────────────────────────────────────────────
void setupWiFi() {
  WiFiManager wm;

  // Device ID is entered once during initial setup via the captive portal.
  // It must match the Device ID shown on the tablet's card in the dashboard.
  WiFiManagerParameter paramDeviceId(
    "device_id",
    "Device ID (copy from Dashboard)",
    deviceId.c_str(),
    40
  );
  wm.addParameter(&paramDeviceId);
  wm.setConfigPortalTimeout(180);

  if (deviceId.isEmpty()) {
    Serial.println("[WiFi] No Device ID — opening config portal (PisoTab-Coin-8266)");
    wm.startConfigPortal("PisoTab-Coin-8266");
  } else {
    wm.autoConnect("PisoTab-Coin-8266");
  }

  // Persist device_id if it was entered or changed in the portal.
  String newId = String(paramDeviceId.getValue());
  newId.trim();
  if (!newId.isEmpty() && newId != deviceId) {
    deviceId = newId;
    saveDeviceId(deviceId);
  }

  if (WiFi.isConnected()) {
    Serial.printf("[WiFi] Connected: %s (Device: %s)\n",
      WiFi.localIP().toString().c_str(), deviceId.c_str());
  } else {
    Serial.println("[WiFi] Not connected");
  }
}

// ── MQTT ─────────────────────────────────────────────────────────────────────
void setupMQTT() {
  if (mqttBroker.isEmpty()) return;
  mqtt.setServer(mqttBroker.c_str(), mqttPort);
  mqtt.setCallback(mqttCallback);
  reconnectMQTT();
}

void reconnectMQTT() {
  if (mqttBroker.isEmpty() || deviceId.isEmpty()) return;
  String clientId = "pisotab-coin-" + deviceId;
  Serial.printf("[MQTT] Connecting to %s:%d ...\n", mqttBroker.c_str(), mqttPort);
  if (mqtt.connect(clientId.c_str())) {
    Serial.println("[MQTT] Connected to broker");
    mqtt.subscribe(("pisotab/devices/" + deviceId + "/cmd").c_str());
    StaticJsonDocument<64> doc; doc["status"] = "online";
    String payload; serializeJson(doc, payload);
    mqtt.publish(("pisotab/devices/" + deviceId + "/status").c_str(), payload.c_str(), true);
  } else {
    Serial.printf("[MQTT] FAILED — state: %d (WiFi: %s)\n",
      mqtt.state(), WiFi.isConnected() ? WiFi.localIP().toString().c_str() : "NOT CONNECTED");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.printf("[MQTT] Received on %s: %s\n", topic, msg.c_str());

  StaticJsonDocument<256> doc;
  deserializeJson(doc, msg);
  String cmd = doc["command"].as<String>();

  if (cmd == "timer_sync") {
    int secs = doc["time_remaining_secs"] | 0;
#ifdef USE_LCD
    lcdSetSession(secs);
#endif
    Serial.printf("[LCD] Timer sync: %d secs\n", secs);

  } else if (cmd == "pause") {
#ifdef USE_LCD
    lcdPaused = true;
    Serial.println("[LCD] Session paused — countdown stopped");
#endif

  } else if (cmd == "relay_on") {
#ifdef USE_RELAY
    digitalWrite(RELAY_PIN, RELAY_CHARGER_ON);
    Serial.println("[Relay] Charger ON");
#endif

  } else if (cmd == "relay_off") {
#ifdef USE_RELAY
    digitalWrite(RELAY_PIN, RELAY_CHARGER_OFF);
    Serial.println("[Relay] Charger OFF");
#endif

  } else if (cmd == "reboot") {
    ESP.restart();

  } else if (cmd == "ota") {
    String url = doc["url"].as<String>();
    String ver = doc["version"].as<String>();
    if (url.isEmpty()) { Serial.println("[OTA] No URL provided"); return; }

    Serial.printf("[OTA] Starting update from %s (v%s)\n", url.c_str(), ver.c_str());

    // Publish status then disconnect cleanly before flashing
    StaticJsonDocument<64> st; st["status"] = "ota_updating";
    String sp; serializeJson(st, sp);
    mqtt.publish(("pisotab/devices/" + deviceId + "/status").c_str(), sp.c_str(), false);
    mqtt.disconnect();
    delay(200);

    // ESPhttpUpdate is the ESP8266 equivalent of ESP32's httpUpdate object
    ESPhttpUpdate.rebootOnUpdate(true);
    t_httpUpdate_return ret = ESPhttpUpdate.update(wifiClient, url);

    // Only reached on failure — success triggers auto-reboot
    if (ret == HTTP_UPDATE_FAILED) {
      Serial.printf("[OTA] FAILED (%d): %s\n",
        ESPhttpUpdate.getLastError(), ESPhttpUpdate.getLastErrorString().c_str());
    }
    reconnectMQTT();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LED_OFF); delay(100);  // dark
    digitalWrite(LED_PIN, LED_ON);  delay(100);  // lit
  }
  // LED remains ON (lit) after blinking — "ready" state
}
