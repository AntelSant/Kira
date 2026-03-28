#include "base64.hpp"
#include "config.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <Wire.h>
#include <eloquent_esp32cam.h>
#include <eloquent_esp32cam/face/detection.h>

using eloq::camera;
using eloq::face::detection;

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define I2C_SDA 41
#define I2C_SCL 42
#define COOLDOWN_MS 8000
#define COUNTDOWN_SEC 5

static uint8_t *jpegBuffer = nullptr;
static size_t jpegBufLen = 150 * 1024;
static uint8_t *base64Buffer = nullptr;
static size_t base64BufLen = 210 * 1024;

static unsigned long ultimoEnvio = 0;

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ── Helpers ──────────────────────────────────────────────────────────

void mostrarMensaje(const char *linea1, const char *linea2 = "",
                    int delay_ms = 0) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 15);
  display.println(linea1);
  if (linea2[0] != '\0') {
    display.setCursor(0, 35);
    display.println(linea2);
  }
  display.display();
  if (delay_ms > 0)
    delay(delay_ms);
}

void mostrarCountdown(int segundos) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 5);
  display.println("Rostro Detectado!");
  display.setTextSize(3);
  display.setCursor(52, 25);
  display.print(segundos);
  display.display();
}

class BufferStream : public Stream {
public:
  BufferStream(const uint8_t *buf, size_t len)
      : _buf(buf), _len(len), _pos(0) {}
  int available() override { return _len - _pos; }
  int read() override { return (_pos < _len) ? _buf[_pos++] : -1; }
  int peek() override { return (_pos < _len) ? _buf[_pos] : -1; }
  void flush() override {}
  size_t write(uint8_t) override { return 0; }

private:
  const uint8_t *_buf;
  size_t _len;
  size_t _pos;
};

// ── Setup ────────────────────────────────────────────────────────────

void setup() {
  delay(3000); // estabilizar arranque
  Serial.begin(115200);
  while (!Serial && millis() < 8000)
    delay(10);
  Serial.println("=== INICIO ===");

  // OLED
  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("WARN: OLED no encontrado, continuando sin pantalla");
  }
  mostrarMensaje("Kira UAS", "Iniciando...");

  // PSRAM
  if (!psramFound()) {
    Serial.println("ERROR: Sin PSRAM");
    mostrarMensaje("ERROR", "Sin PSRAM");
    while (true)
      delay(1000);
  }
  Serial.printf("PSRAM OK: %d bytes libres\n", ESP.getFreePsram());

  // Buffers
  jpegBuffer = (uint8_t *)ps_malloc(jpegBufLen);
  if (!jpegBuffer) {
    Serial.println("ERROR: jpegBuffer");
    while (true)
      delay(1000);
  }

  base64Buffer = (uint8_t *)ps_malloc(base64BufLen);
  if (!base64Buffer) {
    Serial.println("ERROR: base64Buffer");
    while (true)
      delay(1000);
  }

  Serial.printf("Buffers OK | PSRAM libre: %d bytes\n", ESP.getFreePsram());

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando WiFi");
  mostrarMensaje("Conectando WiFi...");
  int wifiRetries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++wifiRetries > 40) { // timeout 20s
      Serial.println("\nERROR: WiFi timeout");
      mostrarMensaje("ERROR", "WiFi timeout");
      ESP.restart();
    }
  }
  Serial.println("\nWiFi OK: " + WiFi.localIP().toString());

  // Cámara (EloquentEsp32cam)
  camera.pinout.freenove_s3();
  camera.brownout.disable();
  camera.resolution.face(); // 240×240 obligatorio para detección
  camera.quality.high();    // JPEG interno, Eloquent lo convierte a RGB

  // Face detection config
  detection.accurate();      // detección de 2 etapas (más precisa)
  detection.confidence(0.5); // umbral de certeza

  // Iniciar cámara
  while (!camera.begin().isOk()) {
    Serial.println("ERROR camara: " + camera.exception.toString());
    mostrarMensaje("Error Camara", "Reintentando...");
    delay(1000);
  }
  Serial.printf("Camara OK: %dx%d\n", camera.resolution.getWidth(),
                camera.resolution.getHeight());

  mostrarMensaje("Sistema Listo", "Buscando Rostro...");
  Serial.println("=== LISTO ===");
}

// ── Loop ─────────────────────────────────────────────────────────────

void loop() {
  // Reconectar WiFi si se pierde
  if (WiFi.status() != WL_CONNECTED) {
    mostrarMensaje("WiFi perdido", "Reconectando...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  // Cooldown entre envíos
  if (millis() - ultimoEnvio < COOLDOWN_MS) {
    uint32_t restante = (COOLDOWN_MS - (millis() - ultimoEnvio)) / 1000;
    char buf[16];
    snprintf(buf, sizeof(buf), "Espere %lus", (unsigned long)restante);
    mostrarMensaje(buf);
    delay(300);
    return;
  }

  // ── Paso 1: Capturar frame para detección ───────────────────────
  if (!camera.capture().isOk()) {
    Serial.println("ERROR capture: " + camera.exception.toString());
    delay(200);
    return;
  }

  // ── Paso 2: Ejecutar detección de rostro ────────────────────────
  if (!detection.run().isOk()) {
    // No loguear cada frame sin rostro para no saturar serial
    delay(100);
    return;
  }

  if (detection.notFound()) {
    mostrarMensaje("Escaneando...", "Ponte enfrente");
    delay(100);
    return;
  }

  // ¡Rostro encontrado!
  Serial.printf(">>> ROSTRO DETECTADO (score: %.2f, pos: %d,%d) <<<\n",
                detection.first.score, detection.first.x, detection.first.y);

  // ── Paso 3: Countdown con verificación continua ─────────────────
  bool rostroMantenido = true;
  for (int i = COUNTDOWN_SEC; i > 0; i--) {
    mostrarCountdown(i);
    delay(700); // esperar parte del segundo

    // Re-capturar y verificar que el rostro sigue presente
    if (!camera.capture().isOk() || !detection.run().isOk() ||
        detection.notFound()) {
      rostroMantenido = false;
      Serial.println(">> Rostro perdido durante countdown, cancelando");
      mostrarMensaje("Cancelado", "Rostro perdido", 1500);
      break;
    }
    delay(300); // completar ~1s
  }

  if (!rostroMantenido) {
    mostrarMensaje("Escaneando...", "Ponte enfrente");
    return; // volver al loop sin capturar ni enviar
  }

  // ── Paso 4: Capturar la foto real (después del countdown) ───────
  mostrarMensaje("Capturando...", "No te muevas!");

  if (!camera.capture().isOk()) {
    Serial.println("ERROR capture post-countdown: " +
                   camera.exception.toString());
    mostrarMensaje("ERROR", "Captura fallida");
    delay(1000);
    return;
  }

  // El frame de Eloquent ya está en formato JPEG
  if (camera.frame == nullptr || camera.frame->buf == nullptr ||
      camera.frame->len == 0) {
    Serial.println("ERROR: frame vacío");
    delay(500);
    return;
  }

  size_t jpegSize = camera.frame->len;
  Serial.printf("JPEG capturado: %d bytes\n", jpegSize);

  if (jpegSize > jpegBufLen) {
    Serial.printf("ERROR: JPEG muy grande (%d > %d)\n", jpegSize, jpegBufLen);
    delay(500);
    return;
  }

  // Copiar JPEG al buffer propio (el frame de la cámara se reutiliza)
  memcpy(jpegBuffer, camera.frame->buf, jpegSize);

  // ── Paso 5: Codificar en Base64 ─────────────────────────────────
  mostrarMensaje("Enviando...", "Por favor espere");

  size_t b64Size = encode_base64_length(jpegSize);
  Serial.printf("JPEG: %d | B64: %d | BufMax: %d\n", jpegSize, b64Size,
                base64BufLen);

  if (b64Size + 1 > base64BufLen) {
    Serial.println("ERROR: imagen demasiado grande para base64");
    return;
  }

  encode_base64(jpegBuffer, jpegSize, base64Buffer);
  base64Buffer[b64Size] = '\0';

  if (b64Size == 0 || base64Buffer[0] == '\0') {
    Serial.println("ERROR: base64 vacio");
    return;
  }

  // ── Paso 6: Construir JSON y enviar ─────────────────────────────
  const char *prefix = "{\"foto_base64\":\"";
  const char *suffix =
      "\",\"grupo_id\":5,\"fecha\":\"2026-03-22\",\"hora\":\"12:00:00\"}";
  size_t prefixLen = strlen(prefix);
  size_t suffixLen = strlen(suffix);
  size_t totalLen = prefixLen + b64Size + suffixLen;

  // Reutilizar jpegBuffer para el payload JSON (ya copiamos el JPEG a base64)
  if (totalLen > jpegBufLen) {
    Serial.printf("ERROR: JSON muy grande (%d bytes)\n", totalLen);
    return;
  }

  memcpy(jpegBuffer, prefix, prefixLen);
  memcpy(jpegBuffer + prefixLen, base64Buffer, b64Size);
  memcpy(jpegBuffer + prefixLen + b64Size, suffix, suffixLen);

  Serial.printf("Payload total: %d bytes\n", totalLen);

  // Enviar por HTTP
  WiFiClient client;
  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.setTimeout(20000);
  http.addHeader("Content-Type", "application/json");

  BufferStream jsonStream(jpegBuffer, totalLen);
  int httpResponseCode = http.sendRequest("POST", &jsonStream, totalLen);
  Serial.printf("HTTP Response: %d\n", httpResponseCode);

  if (httpResponseCode == 200) {
    mostrarMensaje("ENVIADO", "Exito!", 3000);
    ultimoEnvio = millis();
  } else if (httpResponseCode == 422) {
    Serial.println("ERROR 422: " + http.getString());
    mostrarMensaje("ERROR 422", "Ver serial", 3000);
  } else {
    Serial.printf("ERROR HTTP: %d\n", httpResponseCode);
    char errBuf[24];
    snprintf(errBuf, sizeof(errBuf), "ERROR %d", httpResponseCode);
    mostrarMensaje(errBuf, "Ver serial", 3000);
  }

  http.end();
  mostrarMensaje("Sistema Listo", "Buscando Rostro...");
  delay(100);
}