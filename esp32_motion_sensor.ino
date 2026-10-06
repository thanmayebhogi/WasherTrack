/*
 * WashTrack — ESP32 + HC-SR501 PIR motion sensor
 *
 * What it does:
 *   1. Connects to your Wi-Fi.
 *   2. Watches the PIR sensor on GPIO 27.
 *   3. Every time the motion state CHANGES it sends:
 *        POST <SERVER_URL>/api/sensor/motion
 *        { "machineId": "m1", "motion": "detected" }   (or "none")
 *
 * SERVER_URL is your deployed backend, e.g. https://washertrack-api.onrender.com
 * (https works: the certificate is accepted without validation — see setInsecure()).
 *
 * Board:  ESP32 Dev Module (Arduino core for ESP32)
 * Sensor: HC-SR501 PIR
 *   VCC  -> ESP32 3V3 (5V also works on most boards)
 *   OUT  -> ESP32 GPIO 27
 *   GND  -> ESP32 GND
 *
 * Before uploading, edit the 4 values in the SETTINGS block below.
 * Open the Serial Monitor at 115200 baud to see what is happening.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ========================= SETTINGS — EDIT THESE =========================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";            // your Wi-Fi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";        // your Wi-Fi password
const char* SERVER_URL    = "https://washertrack-api.onrender.com"; // deployed backend, no trailing slash
const char* MACHINE_ID    = "m1";                        // m1, m2 or m3
// ========================================================================

const int PIR_PIN = 27;               // HC-SR501 OUT pin
const unsigned long DEBOUNCE_MS   = 150;   // ignore glitches shorter than this
const unsigned long RETRY_MS      = 3000;  // retry a failed POST every 3 s
const unsigned long WIFI_RETRY_MS = 5000;  // retry Wi-Fi every 5 s
const unsigned long HTTP_TIMEOUT  = 5000;  // give up on a request after 5 s

int rawState = LOW;
int stableState = LOW;
unsigned long lastEdgeAt = 0;

String ackedMotion = "";     // last value the server confirmed
String pendingMotion = "";   // value still waiting to be delivered
unsigned long lastAttemptAt = 0;
unsigned long lastWifiAttemptAt = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(PIR_PIN, INPUT);

  Serial.println();
  Serial.println("=== WashTrack ESP32 motion sensor ===");
  Serial.printf("Machine: %s | PIR on GPIO %d | Backend: %s\n", MACHINE_ID, PIR_PIN, SERVER_URL);

  connectWiFi();

  Serial.println("HC-SR501 warm-up: keep the room still for 30-60 s, or the PIR will fire by itself.");
}

void loop() {
  maintainWiFi();
  readSensor();
  flushPending();
  delay(20);
}

/* ---------- Wi-Fi ---------- */

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[WiFi] Connecting to \"%s\"", WIFI_SSID);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected. ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WiFi] Could not connect. Will keep retrying every 5 s.");
  }
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttemptAt < WIFI_RETRY_MS) return;
  lastWifiAttemptAt = millis();
  Serial.println("[WiFi] Disconnected — reconnecting...");
  WiFi.reconnect();
}

/* ---------- sensor (debounced) ---------- */

void readSensor() {
  int raw = digitalRead(PIR_PIN) == HIGH ? HIGH : LOW;

  if (raw != rawState) {           // restart the debounce timer on every bounce
    rawState = raw;
    lastEdgeAt = millis();
  }

  if (raw != stableState && millis() - lastEdgeAt >= DEBOUNCE_MS) {
    stableState = raw;
    String motion = (stableState == HIGH) ? "detected" : "none";
    Serial.printf("[PIR] Motion %s\n", motion.c_str());
    pendingMotion = motion;        // queued until the server acknowledges it
    lastAttemptAt = 0;             // send immediately
  }
}

/* ---------- delivery with retry ---------- */

void flushPending() {
  if (pendingMotion.length() == 0) return;
  if (pendingMotion == ackedMotion) { pendingMotion = ""; return; }
  if (lastAttemptAt != 0 && millis() - lastAttemptAt < RETRY_MS) return;

  lastAttemptAt = millis();
  if (sendMotion(pendingMotion)) {
    ackedMotion = pendingMotion;
    pendingMotion = "";
    Serial.println("[HTTP] Delivered.");
  } else {
    Serial.println("[HTTP] Not delivered yet — will retry in 3 s.");
  }
}

bool postJson(WiFiClient& client, const String& url, const String& payload) {
  HTTPClient http;

  if (!http.begin(client, url)) {
    Serial.println("[HTTP] Could not start the request (check SERVER_URL).");
    return false;
  }

  http.setTimeout(HTTP_TIMEOUT);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  bool ok = false;

  if (code > 0) {
    String response = http.getString();
    if (code == 200) {
      ok = true;
      Serial.printf("[HTTP] 200 OK — %s\n", response.c_str());
    } else {
      Serial.printf("[HTTP] Server replied %d — %s\n", code, response.c_str());
    }
  } else {
    Serial.printf("[HTTP] Request failed — %s\n", http.errorToString(code).c_str());
  }

  http.end();
  return ok;
}

bool sendMotion(const String& motion) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Skipped: Wi-Fi is down.");
    return false;
  }

  String url = String(SERVER_URL) + "/api/sensor/motion";
  String payload = "{\"machineId\":\"" + String(MACHINE_ID) + "\",\"motion\":\"" + motion + "\"}";
  Serial.printf("[HTTP] POST %s\n[HTTP] Body: %s\n", url.c_str(), payload.c_str());

  // Render serves https:// — the ESP32 needs a TLS client for that.
  if (url.startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();  // accept the server certificate without checking it
    return postJson(client, url, payload);
  }

  WiFiClient client;
  return postJson(client, url, payload);
}
