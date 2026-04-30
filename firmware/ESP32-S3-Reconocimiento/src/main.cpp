#include "base64.hpp"
#include "config.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <Wire.h>
#include <eloquent_esp32cam.h>
#include <eloquent_esp32cam/face/detection.h>

// ESP-DL face detector (para re-inferir en rotaciones)
#include <human_face_detect_mnp01.hpp>
#include <human_face_detect_msr01.hpp>

// Conversión de imagen (ESP-IDF)
#include "img_converters.h"

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
Servo servoMotor;

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
  // readBytes eficiente: copia en bloque en vez de byte por byte
  size_t readBytes(char *buffer, size_t length) override {
    size_t toRead = min(length, (size_t)(_len - _pos));
    memcpy(buffer, _buf + _pos, toRead);
    _pos += toRead;
    return toRead;
  }

private:
  const uint8_t *_buf;
  size_t _len;
  size_t _pos;
};

// ── Rotación de imagen ────────────────────────────────────────────────

/**
 * Rota un buffer RGB888 de 240×240 en sentido horario (in-place).
 * angulo: 90, 180 o 270 grados.
 */
void rotarRGB240(uint8_t *rgb, int angulo) {
  const int W = 240, H = 240;
  size_t bufSize = (size_t)W * H * 3;

  uint8_t *tmp = (uint8_t *)ps_malloc(bufSize);
  if (!tmp) {
    Serial.println("ERROR rotarRGB: sin PSRAM");
    return;
  }

  for (int y = 0; y < H; y++) {
    for (int x = 0; x < W; x++) {
      int srcIdx = (y * W + x) * 3;
      int dstIdx;
      if (angulo == 90)
        dstIdx = (x * W + (W - 1 - y)) * 3; // 90° horario
      else if (angulo == 180)
        dstIdx = ((H - 1 - y) * W + (W - 1 - x)) * 3; // 180°
      else
        dstIdx = ((H - 1 - x) * W + y) * 3; // 270° horario
      tmp[dstIdx] = rgb[srcIdx];
      tmp[dstIdx + 1] = rgb[srcIdx + 1];
      tmp[dstIdx + 2] = rgb[srcIdx + 2];
    }
  }
  memcpy(rgb, tmp, bufSize);
  free(tmp);
}

/**
 * Detecta rostros probando 0°, 90°, 180° y 270°.
 * Retorna el ángulo en que se detectó el rostro, o -1 si no se encontró.
 * Actualiza detection.first con la mejor detección encontrada.
 *
 * PRECONDICIÓN: camera.capture() ya fue llamado antes de esta función.
 */
int detectarConRotacion() {
  // ── Intento 0°: usa detection.run() normal ──────────────────────
  if (detection.run().isOk() && detection.found()) {
    return 0;
  }

  // detection.run() ya decodificó JPEG→RGB en detection.image.
  // Si llegamos aquí, detection.image contiene el frame en RGB pero sin rostro.

  if (detection.image == nullptr) {
    Serial.println("WARN: detection.image nulo, no se puede rotar");
    return -1;
  }

  // ── Intentos 90°, 180°, 270° ────────────────────────────────────
  // Cada iteración rota 90° adicionales (acumulativo: 90, 180, 270)
  const int angulos[3] = {90, 180, 270};
  const std::vector<int> shape = {240, 240, 3};
  const float CONF_THRESH = 0.5f;

  for (int i = 0; i < 3; i++) {
    rotarRGB240(detection.image, 90); // siempre rotamos 90° extra

    // Re-ejecutar inferencia ESP-DL sobre el buffer rotado
    HumanFaceDetectMSR01 s1(0.1f, 0.5f, 10, 1.0f);
    HumanFaceDetectMNP01 s2(0.5f, 0.5f, 5);

    std::list<dl::detect::result_t> &cand = s1.infer(detection.image, shape);
    std::list<dl::detect::result_t> results =
        s2.infer(detection.image, shape, cand);

    for (const auto &r : results) {
      if (r.score >= CONF_THRESH) {
        Serial.printf(">>> ROSTRO en rotación %d° (score: %.2f) <<<\n",
                      angulos[i], r.score);
        // Actualizar detection.first para que el código posterior funcione
        detection.first.copyFrom(r);
        return angulos[i];
      }
    }
  }

  return -1; // Sin rostro en ninguna orientación
}

/**
 * Si el rostro fue detectado rotado, esta función rota el JPEG al mismo ángulo
 * para que el servidor reciba la imagen orientada correctamente.
 * jpegIn/jpegOut pueden ser el mismo buffer (se usa tmp internamente).
 * Retorna el tamaño del JPEG resultante, o jpegInLen si angulo==0.
 */
size_t rotarJPEG(const uint8_t *jpegIn, size_t jpegInLen, int angulo,
                 uint8_t *jpegOut, size_t jpegOutMaxLen) {
  if (angulo == 0) {
    if (jpegOut != jpegIn)
      memcpy(jpegOut, jpegIn, jpegInLen);
    return jpegInLen;
  }

  const int W = 240, H = 240;
  size_t rgbSize = (size_t)W * H * 3;

  uint8_t *rgb = (uint8_t *)ps_malloc(rgbSize);
  if (!rgb) {
    Serial.println("ERROR rotarJPEG: sin PSRAM para RGB");
    return 0;
  }

  // Decodificar JPEG → RGB888
  if (!fmt2rgb888(jpegIn, jpegInLen, PIXFORMAT_JPEG, rgb)) {
    Serial.println("ERROR rotarJPEG: fmt2rgb888 falló");
    free(rgb);
    return 0;
  }

  // Rotar píxeles
  rotarRGB240(rgb, angulo);

  // Re-codificar a JPEG
  uint8_t *jpegResult = nullptr;
  size_t jpegResultLen = 0;
  bool ok = fmt2jpg(rgb, rgbSize, W, H, PIXFORMAT_RGB888, 80, &jpegResult,
                    &jpegResultLen);
  free(rgb);

  if (!ok || jpegResult == nullptr) {
    Serial.println("ERROR rotarJPEG: fmt2jpg falló");
    return 0;
  }

  if (jpegResultLen > jpegOutMaxLen) {
    Serial.printf("ERROR rotarJPEG: JPEG rotado muy grande (%d > %d)\n",
                  jpegResultLen, jpegOutMaxLen);
    free(jpegResult);
    return 0;
  }

  memcpy(jpegOut, jpegResult, jpegResultLen);
  free(jpegResult);
  return jpegResultLen;
}

// ── Setup ────────────────────────────────────────────────────────────

// ── Helpers de Hardware ──────────────────────────────────────────────

/**
 * Simula apertura de puerta:
 *  1. LED verde ON
 *  2. Servo gira a SERVO_ABIERTO°
 *  3. Espera PUERTA_OPEN_MS milisegundos
 *  4. Servo vuelve a SERVO_CERRADO°
 *  5. LED verde OFF
 */
void abrirPuerta() {
  digitalWrite(LED_VERDE_PIN, HIGH);
  servoMotor.write(SERVO_ABIERTO);
  Serial.printf("SERVO: abriendo puerta (%d°)\n", SERVO_ABIERTO);
  delay(PUERTA_OPEN_MS);
  servoMotor.write(SERVO_CERRADO);
  Serial.printf("SERVO: cerrando puerta (%d°)\n", SERVO_CERRADO);
  delay(500); // pequeña pausa para que el servo llegue
  digitalWrite(LED_VERDE_PIN, LOW);
}

/**
 * Indica acceso denegado: LED rojo ON durante ms milisegundos.
 */
void accesoDenegado(int ms = 3000) {
  digitalWrite(LED_ROJO_PIN, HIGH);
  delay(ms);
  digitalWrite(LED_ROJO_PIN, LOW);
}

// ────────────────────────────────────────────────────────────────────

void setup() {
  delay(3000); // estabilizar arranque
  Serial.begin(115200);
  while (!Serial && millis() < 8000)
    delay(10);
  Serial.println("=== INICIO ===");

  // ── LEDs ──────────────────────────────────────────────────────────
  pinMode(LED_VERDE_PIN, OUTPUT);
  pinMode(LED_ROJO_PIN, OUTPUT);
  digitalWrite(LED_VERDE_PIN, LOW);
  digitalWrite(LED_ROJO_PIN, LOW);

  // ── Servo ─────────────────────────────────────────────────────────
  // Asignar canales LEDC libres (el canal 0 lo usa la cámara internamente,
  // ESP32Servo gestiona la asignación automáticamente con allowAllTimers())
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  servoMotor.setPeriodHertz(50); // PWM estándar 50 Hz para hobby servo
  servoMotor.attach(SERVO_PIN, 500, 2400); // MOT-100: 500µs=0°, 2400µs=180°
  servoMotor.write(SERVO_CERRADO);         // posición inicial: cerrado
  Serial.printf("Servo OK: GPIO %d, posicion inicial %d°\n", SERVO_PIN,
                SERVO_CERRADO);

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

  // Sincronizar hora con NTP (UTC-7 Sinaloa, sin horario de verano)
  configTime(-7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Sincronizando NTP");
  mostrarMensaje("Sincronizando", "Hora NTP...");
  struct tm timeinfo;
  int ntpRetries = 0;
  while (!getLocalTime(&timeinfo) && ntpRetries < 20) {
    delay(500);
    Serial.print(".");
    ntpRetries++;
  }
  if (ntpRetries < 20) {
    Serial.printf("\nNTP OK: %04d-%02d-%02d %02d:%02d:%02d\n",
                  timeinfo.tm_year + 1900, timeinfo.tm_mon + 1,
                  timeinfo.tm_mday, timeinfo.tm_hour, timeinfo.tm_min,
                  timeinfo.tm_sec);
  } else {
    Serial.println("\nWARN: NTP timeout, se usara hora 00:00:00");
  }

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

  // ── Paso 2: Ejecutar detección con soporte multi-rotación ───────
  int anguloDetectado = detectarConRotacion();

  if (anguloDetectado < 0) {
    mostrarMensaje("Escaneando...", "Ponte enfrente");
    delay(100);
    return;
  }

  // ¡Rostro encontrado!
  Serial.printf(
      ">>> ROSTRO DETECTADO (score: %.2f, pos: %d,%d, angulo: %d°) <<<\n",
      detection.first.score, detection.first.x, detection.first.y,
      anguloDetectado);

  // ── Paso 3: Countdown con verificación continua ─────────────────
  bool rostroMantenido = true;
  for (int i = COUNTDOWN_SEC; i > 0; i--) {
    mostrarCountdown(i);
    delay(700);

    // Re-capturar y verificar que el rostro sigue presente
    if (!camera.capture().isOk()) {
      rostroMantenido = false;
      Serial.println(">> Error de captura durante countdown, cancelando");
      mostrarMensaje("Cancelado", "Error captura", 1500);
      break;
    }

    // Verificar con multi-rotación (acepta cualquier orientación)
    if (detectarConRotacion() < 0) {
      rostroMantenido = false;
      Serial.println(">> Rostro perdido durante countdown, cancelando");
      mostrarMensaje("Cancelado", "Rostro perdido", 1500);
      break;
    }

    delay(300);
  }

  if (!rostroMantenido) {
    mostrarMensaje("Escaneando...", "Ponte enfrente");
    return;
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

  // Copiar JPEG al buffer propio
  memcpy(jpegBuffer, camera.frame->buf, jpegSize);

  // ── Paso 5: Rotar JPEG si el rostro estaba rotado ───────────────
  if (anguloDetectado != 0) {
    Serial.printf("Rotando JPEG %d° para orientar imagen...\n",
                  anguloDetectado);
    size_t jpegRotado = rotarJPEG(jpegBuffer, jpegSize, anguloDetectado,
                                  jpegBuffer, jpegBufLen);
    if (jpegRotado > 0) {
      jpegSize = jpegRotado;
      Serial.printf("JPEG rotado OK: %d bytes\n", jpegSize);
    } else {
      Serial.println("WARN: fallo al rotar JPEG, enviando imagen sin rotar");
    }
  }

  // ── Paso 6: Codificar en Base64 ─────────────────────────────────
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

  // ── Paso 7: Construir JSON con fecha/hora reales (NTP) ──────────
  struct tm timeinfo;
  char fechaStr[12] = "1970-01-01";
  char horaStr[10] = "00:00:00";
  if (getLocalTime(&timeinfo)) {
    snprintf(fechaStr, sizeof(fechaStr), "%04d-%02d-%02d",
             timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday);
    snprintf(horaStr, sizeof(horaStr), "%02d:%02d:%02d", timeinfo.tm_hour,
             timeinfo.tm_min, timeinfo.tm_sec);
  } else {
    Serial.println("WARN: Sin hora NTP, usando valores por defecto");
  }
  Serial.printf("Fecha: %s | Hora: %s\n", fechaStr, horaStr);

  const char *prefix = "{\"foto_base64\":\"";
  char suffix[140];
  snprintf(suffix, sizeof(suffix),
           "\",\"aula\":\"%s\",\"fecha\":\"%s\",\"hora\":\"%s\"}", AULA_ID,
           fechaStr, horaStr);

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

  // ── Enviar por HTTP ─────────────────────────────────────────────
  WiFiClient client;
  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.setTimeout(20000);
  http.addHeader("Content-Type", "application/json");

  BufferStream jsonStream(jpegBuffer, totalLen);
  int httpResponseCode = http.sendRequest("POST", &jsonStream, totalLen);
  Serial.printf("HTTP Response: %d\n", httpResponseCode);

  // Asegurar que ambos LEDs estén apagados antes de actuar
  digitalWrite(LED_VERDE_PIN, LOW);
  digitalWrite(LED_ROJO_PIN, LOW);

  if (httpResponseCode == 200) {
    // ── Parsear respuesta JSON ────────────────────────────────────
    String respBody = http.getString();
    Serial.println("Respuesta servidor: " + respBody);

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, respBody);

    if (err) {
      Serial.println("WARN: No se pudo parsear JSON de respuesta");
      mostrarMensaje("ENVIADO", "Respuesta invalida", 2000);
    } else {
      const char *status = doc["status"] | "error";

      if (strcmp(status, "success") == 0) {
        // ── Cara reconocida: abrir puerta ──────────────────────
        const char *nombre = doc["nombre"] | "";
        const char *apellido = doc["apellido"] | "";
        Serial.printf("ACCESO PERMITIDO: %s %s\n", nombre, apellido);

        char linea2[32];
        snprintf(linea2, sizeof(linea2), "%s %s", nombre, apellido);
        mostrarMensaje("ACCESO PERMITIDO", linea2);

        abrirPuerta(); // LED verde + servo abre y cierra
        mostrarMensaje("ACCESO PERMITIDO", linea2, 0);
      } else {
        // ── Cara desconocida: denegar acceso ───────────────────
        const char *msg = doc["mensaje"] | "Desconocido";
        Serial.printf("ACCESO DENEGADO: %s\n", msg);
        mostrarMensaje("ACCESO DENEGADO", msg);
        accesoDenegado(3000); // LED rojo 3 segundos
      }
    }

    ultimoEnvio = millis();

  } else if (httpResponseCode == 422) {
    Serial.println("ERROR 422: " + http.getString());
    mostrarMensaje("ERROR 422", "Ver serial");
    accesoDenegado(2000);
  } else {
    Serial.printf("ERROR HTTP: %d\n", httpResponseCode);
    char errBuf[24];
    snprintf(errBuf, sizeof(errBuf), "ERROR %d", httpResponseCode);
    mostrarMensaje(errBuf, "Ver serial");
    accesoDenegado(1500);
  }

  http.end();
  mostrarMensaje("Sistema Listo", "Buscando Rostro...");
  delay(100);
}