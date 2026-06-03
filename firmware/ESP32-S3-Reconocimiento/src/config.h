#ifndef CONFIG_H
#define CONFIG_H

// ── Variables de entorno ────────────────────────────────────────────
// Estos valores se inyectan desde el archivo .env mediante load_env.py
// NUNCA los escribas directamente aquí. Edita el archivo .env.
//
// Si ves errores como:
//   error: 'WIFI_SSID' was not declared in this scope
// significa que falta el archivo .env. Ejecuta:
//   cp .env.example .env   →  luego edita .env con tus datos reales.
// ──────────────────────────────────────────────────────────────────────

#ifndef WIFI_SSID
  #error "WIFI_SSID no definido. Crea el archivo .env basándote en .env.example"
#endif
#ifndef WIFI_PASSWORD
  #error "WIFI_PASSWORD no definido. Crea el archivo .env basándote en .env.example"
#endif
#ifndef SERVER_URL
  #error "SERVER_URL no definido. Crea el archivo .env basándote en .env.example"
#endif
#ifndef API_KEY
  #error "API_KEY no definido. Crea el archivo .env basándote en .env.example"
#endif
#ifndef AULA_ID
  #error "AULA_ID no definido. Crea el archivo .env basándote en .env.example"
#endif
#ifndef COUNTDOWN_SEC
  #error "COUNTDOWN_SEC no definido. Crea el archivo .env basándote en .env.example"
#endif
#ifndef RETRY_NEGATIVO_MS
  #error "RETRY_NEGATIVO_MS no definido. Crea el archivo .env basándote en .env.example"
#endif
#ifndef RETRY_POSITIVO_MS
  #error "RETRY_POSITIVO_MS no definido. Crea el archivo .env basándote en .env.example"
#endif

// Convertir las macros numéricas/de cadena a variables de C
const char *WIFI_SSID_STR     = WIFI_SSID;
const char *WIFI_PASSWORD_STR = WIFI_PASSWORD;
const char *SERVER_URL_STR    = SERVER_URL;
const char *API_KEY_STR       = API_KEY;

// AULA_ID puede ser numérico; lo convertimos a string literal
#define AULA_ID_STR STRINGIFY(AULA_ID)
#define STRINGIFY(x) STRINGIFY_(x)
#define STRINGIFY_(x) #x

// ── Pines de la cámara Freenove ESP32-S3 WROOM ──────────────────────
#define PWDN_GPIO_NUM  -1
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM  15
#define SIOD_GPIO_NUM  4
#define SIOC_GPIO_NUM  5
#define Y9_GPIO_NUM    16
#define Y8_GPIO_NUM    17
#define Y7_GPIO_NUM    18
#define Y6_GPIO_NUM    12
#define Y5_GPIO_NUM    10
#define Y4_GPIO_NUM    8
#define Y3_GPIO_NUM    9
#define Y2_GPIO_NUM    11
#define VSYNC_GPIO_NUM 6
#define HREF_GPIO_NUM  7
#define PCLK_GPIO_NUM  13

// ── Pantalla OLED (I2C) ─────────────────────────────────────────────
#define OLED_SDA_PIN 41
#define OLED_SCL_PIN 42

// ── Periféricos: Servo + LEDs ────────────────────────────────────────
// Servo Steren MOT-100 (señal PWM)
#define SERVO_PIN 2

// LED verde = acceso permitido (con resistencia 220Ω en serie)
#define LED_VERDE_PIN 46

// LED rojo  = acceso denegado  (con resistencia 220Ω en serie)
#define LED_ROJO_PIN 47

// Ángulo de "puerta cerrada" y "puerta abierta"
#define SERVO_CERRADO 0
#define SERVO_ABIERTO 90

// Tiempo que la puerta permanece "abierta" (ms)
#define PUERTA_OPEN_MS 3000

#endif // CONFIG_H