/**
 * PisoTab ESP32 Coin Acceptor Firmware
 * =====================================
 * Reads pulse signals from a coin acceptor and:
 *  1. Maps pulses to coin values
 *  2. Converts coin values to rental time (seconds)
 *  3. Sends events via WiFi + MQTT (primary path)
 *     Offline queue buffers up to 50 events when MQTT is unavailable.
 *
 * Wiring:
 *  Coin acceptor SIGNAL pin → GPIO 4 (COIN_PIN)
 *  Built-in LED → GPIO 2 (feedback)
 *
 * Compatible coin acceptors: CH-926, NRI G-13, Suzohapp
 * Pulse output: 1 pulse = ₱1, 5 pulses = ₱5, etc. (configurable)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFiManager.h>  // https://github.com/tzapu/WiFiManager
#include <HTTPUpdate.h>   // ESP32 OTA over HTTP

// ── Pin config ──────────────────────────────────────────────────────────────
#define COIN_PIN        4    // Coin acceptor signal (active HIGH pulse)
#define LED_PIN         2    // Built-in LED
#define PULSE_TIMEOUT   200  // ms — gap between pulse trains

// ── Server config ────────────────────────────────────────────────────────────
// Broker IP is infrastructure — always authoritative from firmware.
// NVS persists across flashes so stored values would silently override changes.
#define MQTT_BROKER_HOST "192.168.100.61"
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
Preferences prefs;
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

volatile int pulseCount = 0;
volatile unsigned long lastPulseTime = 0;

String deviceId   = "";
// Broker IP/port come from compile-time constants, not NVS
String mqttBroker = MQTT_BROKER_HOST;
int    mqttPort   = MQTT_BROKER_PORT;

// Offline queue — buffers coin events while MQTT is unavailable
struct CoinEvent { int pulses; float pesos; int seconds; unsigned long ts; };
CoinEvent offlineQueue[50];
int queueHead = 0;
int queueSize = 0;

// ── Interrupt handler ────────────────────────────────────────────────────────
void IRAM_ATTR onCoinPulse() {
  unsigned long now = millis();
  if (now - lastPulseTime < 20) return;  // debounce
  lastPulseTime = now;
  pulseCount++;
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[PisoTab] Coin firmware starting...");

  pinMode(COIN_PIN, INPUT_PULLDOWN);
  pinMode(LED_PIN, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(COIN_PIN), onCoinPulse, RISING);

  loadConfig();
  setupWiFi();
  setupMQTT();

  Serial.println("[PisoTab] Ready. Waiting for coins...");
  digitalWrite(LED_PIN, HIGH);
}

// ── Main loop ────────────────────────────────────────────────────────────────
void loop() {
  if (pulseCount > 0 && (millis() - lastPulseTime) > PULSE_TIMEOUT) {
    int pulses = pulseCount;
    pulseCount = 0;
    processCoinEvent(pulses);
  }

  if (WiFi.isConnected()) {
    if (!mqtt.connected()) reconnectMQTT();
    mqtt.loop();
    flushOfflineQueue();
  }

  delay(10);
}

// ── Coin processing ──────────────────────────────────────────────────────────
void processCoinEvent(int pulses) {
  Serial.printf("[Coin] %d pulse(s) detected\n", pulses);

  float pesos = 0; int seconds = 0;
  for (int i = 0; i < COIN_MAP_SIZE; i++) {
    if (COIN_MAP[i].pulses == pulses) { pesos = COIN_MAP[i].pesos; seconds = COIN_MAP[i].seconds; break; }
  }
  if (pesos == 0) { pesos = pulses * 1.0f; seconds = pulses * 5 * 60; }  // proportional fallback

  Serial.printf("[Coin] ₱%.1f → %d seconds credited\n", pesos, seconds);
  blinkLED(pulses);

  StaticJsonDocument<256> doc;
  doc["device_id"]     = deviceId;
  doc["coin_value"]    = pesos;
  doc["pulses"]        = pulses;
  doc["credited_secs"] = seconds;
  doc["ts"]            = millis();
  String payload; serializeJson(doc, payload);

  if (mqtt.connected()) {
    String topic = "pisotab/coins/" + deviceId;
    if (!mqtt.publish(topic.c_str(), payload.c_str(), false)) queueEvent(pulses, pesos, seconds);
    else Serial.println("[MQTT] Coin event published");
  } else {
    queueEvent(pulses, pesos, seconds);
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
  wm.setConfigPortalTimeout(90);
  if (!wm.autoConnect("PisoTab-Coin")) {
    Serial.println("[WiFi] Failed to connect — check WiFiManager portal");
    return;
  }
  Serial.printf("[WiFi] Connected: %s\n", WiFi.localIP().toString().c_str());
}

// ── MQTT ─────────────────────────────────────────────────────────────────────
void setupMQTT() {
  if (mqttBroker.isEmpty()) return;
  mqtt.setServer(mqttBroker.c_str(), mqttPort);
  mqtt.setCallback(mqttCallback);
  reconnectMQTT();
}

void reconnectMQTT() {
  if (mqttBroker.isEmpty()) return;
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

  if (cmd == "reboot") {
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

    httpUpdate.rebootOnUpdate(true);
    t_httpUpdate_return ret = httpUpdate.update(wifiClient, url);

    // Only reached on failure — success triggers auto-reboot
    if (ret == HTTP_UPDATE_FAILED) {
      Serial.printf("[OTA] FAILED (%d): %s\n",
        httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
    }
    reconnectMQTT();
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
void loadConfig() {
  // Only device_id comes from NVS — it identifies this specific unit.
  // Broker IP/port are compile-time constants to prevent stale NVS values
  // from silently overriding server config changes after a reflash.
  prefs.begin("pisotab", false);
  deviceId = prefs.getString("device_id", "esp32_001");
  prefs.end();
  Serial.printf("[Config] Device ID: %s\n", deviceId.c_str());
  Serial.printf("[Config] MQTT: %s:%d\n",   mqttBroker.c_str(), mqttPort);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW);  delay(100);
    digitalWrite(LED_PIN, HIGH); delay(100);
  }
}
