# 🔌 Kira — Firmware ESP32-S3 (Módulo de Captura Facial)

> Firmware embebido que ejecuta detección de rostros en tiempo real sobre un **ESP32-S3** con cámara OV2640, pantalla OLED, servo y LEDs indicadores. Captura la imagen, la codifica en Base64 y la envía al servidor de reconocimiento facial del sistema **Kira**.

---

## 📑 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Hardware Requerido](#-hardware-requerido)
- [Diagrama de Conexiones](#-diagrama-de-conexiones)
- [Requisitos de Software](#-requisitos-de-software)
- [Configuración](#-configuración)
- [Compilación y Carga](#-compilación-y-carga)
- [Flujo de Operación](#-flujo-de-operación)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Protocolo de Comunicación](#-protocolo-de-comunicación)
- [Indicadores Visuales (OLED)](#-indicadores-visuales-oled)
- [Solución de Problemas](#-solución-de-problemas)
- [Notas Importantes](#-notas-importantes)

---

## 📖 Descripción General

Este firmware convierte una placa **Freenove ESP32-S3 WROOM** (con cámara integrada) en un nodo inteligente de captura y detección facial. Forma parte del ecosistema **Kira**, un sistema distribuido de reconocimiento facial para control de acceso y asistencia en aulas.

### ¿Qué hace?

1. **Detecta rostros** en tiempo real usando el modelo ESP-DL de dos etapas (`MSR01` + `MNP01`).
2. **Soporta múltiples orientaciones**: si no detecta un rostro a 0°, prueba automáticamente a 90°, 180° y 270°.
3. **Realiza un countdown de verificación** para asegurar que el rostro se mantiene frente a la cámara.
4. **Captura la imagen**, la codifica en Base64 y la envía al servidor vía HTTP POST.
5. **Controla hardware físico**: abre/cierra una puerta con servo y enciende LEDs según la respuesta del servidor (acceso permitido/denegado).
6. **Muestra información** en una pantalla OLED 128×64 durante todo el proceso.

---

## 🛠 Hardware Requerido

| Componente               | Modelo / Especificación                                       | Cantidad |
|--------------------------|---------------------------------------------------------------|----------|
| Microcontrolador         | **Freenove ESP32-S3 WROOM** (con OV2640 y PSRAM)              |     1    |
| Pantalla OLED            | **SSD1306** 128×64 px, I2C (dirección `0x3C`)                 |     1    |
| Servomotor               | **Steren MOT-100** (o cualquier hobby servo estándar de 180°) |     1    |
| LED Verde                | LED difuso 5mm + resistencia **220Ω**                         |     1    |
| LED Rojo                 | LED difuso 5mm + resistencia **220Ω**                         |     1    |
| Fuente de alimentación   | 5V / 2A mínimo (USB-C o fuente externa)                       |     1    |
| Cables                   | Dupont macho-hembra / protoboard                              |     —    |

> [!IMPORTANT]
> La placa **debe tener PSRAM** (mínimo 2 MB). Sin PSRAM el firmware no puede asignar los buffers de imagen y **no arrancará**.

---

## 🔗 Diagrama de Conexiones

### Pantalla OLED (I2C)

| Pin OLED | Pin ESP32-S3 | GPIO |
|---|---|:---:|
| SDA | — | **GPIO 41** |
| SCL | — | **GPIO 42** |
| VCC | 3.3V | — |
| GND | GND | — |

### Servomotor (PWM)

| Pin Servo | Pin ESP32-S3 | GPIO |
|---|---|:---:|
| Señal (naranja) | — | **GPIO 2** |
| VCC (rojo) | **5V externo** | — |
| GND (marrón) | GND compartido | — |

> [!WARNING]
> **No alimentes el servo desde el pin 5V del ESP32-S3.** Usa una fuente de 5V externa con GND compartido. El consumo del servo puede reiniciar la placa.

### LEDs Indicadores

| LED | GPIO | Resistencia |
|---|:---:|:---:|
| 🟢 Verde (Acceso Permitido) | **GPIO 46** | 220Ω en serie |
| 🔴 Rojo (Acceso Denegado) | **GPIO 47** | 220Ω en serie |

### Cámara OV2640 (integrada en la placa Freenove)

La cámara **ya viene conectada** en la placa Freenove ESP32-S3 WROOM. Los pines están mapeados en el firmware automáticamente con `camera.pinout.freenove_s3()`. La asignación interna es:

| Señal | GPIO |
|---|:---:|
| XCLK | 15 |
| SIOD | 4 |
| SIOC | 5 |
| Y9–Y2 | 16, 17, 18, 12, 10, 8, 9, 11 |
| VSYNC | 6 |
| HREF | 7 |
| PCLK | 13 |

### Esquema de Conexión General

```
                    ┌──────────────────────┐
     ┌──────────┐   │   ESP32-S3 WROOM     │
     │  OLED    │   │   (Freenove)         │
     │ SSD1306  │◄──┤ GPIO 41 (SDA)        │
     │          │◄──┤ GPIO 42 (SCL)        │   ┌───────────┐
     └──────────┘   │                      │   │  Servo    │
                    │ GPIO  2 (PWM) ──────────►│  MOT-100  │
     ┌──[220Ω]──┐   │                      │   └───────────┘
     │ LED 🟢   │◄──┤ GPIO 46              │
     └──────────┘   │                      │
     ┌──[220Ω]──┐  │                      │
     │ LED 🔴   │◄──┤ GPIO 47              │
     └──────────┘   │                      │
                    │    [Cámara OV2640]   │
                    │    (Integrada)       │
                    └──────────────────────┘
```

---

## 💻 Requisitos de Software

| Herramienta | Versión Mínima |
|---|---|
| [PlatformIO](https://platformio.org/) | Core 6.x o IDE Extension |
| Framework | Arduino (Espressif 32) |
| Python | 3.8+ (requerido por PlatformIO) |

### Dependencias (se instalan automáticamente)

Definidas en `platformio.ini`:

| Librería | Versión | Uso |
|---|---|---|
| `densaugeo/base64` | ^1.4.0 | Codificación Base64 de imágenes JPEG |
| `adafruit/Adafruit SSD1306` | ^2.5.16 | Driver pantalla OLED |
| `adafruit/Adafruit GFX Library` | ^1.12.5 | Gráficos para OLED |
| `bblanchon/ArduinoJson` | ^7.4.3 | Serialización/Deserialización JSON |
| `madhephaestus/ESP32Servo` | ^3.0.5 | Control del servomotor |
| `EloquentEsp32cam` | GitHub HEAD | Abstracción de cámara + detección facial ESP-DL |

---

## ⚙️ Configuración

Las credenciales y parámetros del dispositivo se gestionan mediante un archivo **`.env`** que **nunca se sube al repositorio**. El script `load_env.py` los inyecta como macros del compilador en cada compilación.

### Paso 1 — Crear el archivo `.env`

```bash
cd firmware/ESP32-S3-Reconocimiento
cp .env.example .env
```

Luego edita `.env` con los valores reales de tu instalación:

```ini
# ── Red WiFi ──────────────────────────────────────────────────────────
WIFI_SSID=NombreDeTuRed
WIFI_PASSWORD=TuContraseña

# ── Servidor Kira ──────────────────────────────────────────────────────
SERVER_URL=http://192.168.1.100:8001/api/capture

# ── Autenticación M2M ──────────────────────────────────────────────────
API_KEY=tu_api_key_secreta

# ── Identificador de Aula ─────────────────────────────────────────────
AULA_ID=1

# ── Comportamiento del dispositivo ────────────────────────────────────
COUNTDOWN_SEC=5
```

### Referencia de Variables

| Variable | Descripción | Ejemplo |
|---|---|---|
| `WIFI_SSID` | Nombre de la red WiFi (solo 2.4 GHz) | `MiRed` |
| `WIFI_PASSWORD` | Contraseña de la red | `Pass1234` |
| `SERVER_URL` | URL completa del endpoint de captura | `http://10.0.0.5:8001/api/capture` |
| `API_KEY` | Clave M2M compartida con el backend | `kira_prod_key_123` |
| `AULA_ID` | ID numérico del aula en la base de datos | `9` |
| `COUNTDOWN_SEC` | Segundos de cuenta regresiva antes de capturar la foto | `5` |

> [!CAUTION]
> **Nunca subas el archivo `.env` al repositorio.** Ya está incluido en `.gitignore`. La API Key debe coincidir exactamente con `M2M_API_KEY` en el `.env` del servidor `server1-face`.

> [!NOTE]
> Si compilas sin `.env`, el build falla inmediatamente con un mensaje claro: `WIFI_SSID no definido. Crea el archivo .env...`

### Zona Horaria (en `main.cpp`)

El firmware sincroniza la hora vía NTP. Por defecto está configurado para **UTC-7 (Sinaloa, México)**. Si necesitas otra zona, edita la línea en `src/main.cpp`:

```cpp
configTime(-7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
//          ↑ cambia este offset (ej: UTC-6 → -6 * 3600)
```

---

## 🚀 Compilación y Carga

### Opción A: PlatformIO CLI

```bash
# Navegar al directorio del proyecto
cd firmware/ESP32-S3-Reconocimiento

# Compilar
pio run

# Compilar y cargar al ESP32-S3
pio run --target upload

# Abrir monitor serial (115200 baud)
pio device monitor --baud 115200
```

### Opción B: PlatformIO IDE (VS Code)

1. Abre la carpeta `firmware/ESP32-S3-Reconocimiento` en VS Code.
2. PlatformIO detectará automáticamente el proyecto.
3. Haz clic en **Build** (✓) para compilar.
4. Haz clic en **Upload** (→) para cargar al dispositivo.
5. Haz clic en **Serial Monitor** (🔌) para ver la salida.

### Configuración de la Placa

El `platformio.ini` ya está configurado para la **ESP32-S3-DevKitC-1**:

```ini
[env:esp32-s3-devkitc-1]
platform  = espressif32
board     = esp32-s3-devkitc-1
framework = arduino

extra_scripts = pre:load_env.py   ; ← inyecta las variables del .env

build_flags =
    -DBOARD_HAS_PSRAM
    -DARDUINO_USB_MODE=1
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DCONFIG_CAMERA_TASK_STACK_SIZE=8192

board_build.arduino.memory_type = qio_opi
board_build.partitions = huge_app.csv
```

> [!NOTE]
> Se usa el esquema de particiones `huge_app.csv` porque el binario con ESP-DL (detección facial) es grande (~3 MB). El stack de la tarea de cámara se incrementó a 8192 bytes para evitar stack overflow.

---

## 🔄 Flujo de Operación

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARRANQUE (setup)                            │
├─────────────────────────────────────────────────────────────────────┤
│  1. Inicializa LEDs (apagados) y Servo (posición cerrada)          │
│  2. Inicializa pantalla OLED → muestra "Kira UAS - Iniciando..."   │
│  3. Verifica PSRAM (obligatoria)                                   │
│  4. Asigna buffers JPEG (150 KB) y Base64 (210 KB) en PSRAM        │
│  5. Conecta a WiFi (timeout: 20s, reinicio si falla)               │
│  6. Sincroniza hora NTP (UTC-7)                                    │
│  7. Inicializa cámara OV2640 a 240×240 px                          │
│  8. Configura detector facial de 2 etapas (umbral: 0.5)            │
│  9. Muestra "Sistema Listo — Buscando Rostro..."                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LOOP PRINCIPAL                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──► Verificar WiFi (reconectar si se pierde)                     │
│  │                                                                  │
│  ├──► Verificar cooldown (8 segundos entre envíos)                 │
│  │                                                                  │
│  ├──► Capturar frame de la cámara                                  │
│  │                                                                  │
│  ├──► Detectar rostro con multi-rotación (0°→90°→180°→270°)        │
│  │    └── Si no detecta → vuelve al inicio del loop                │
│  │                                                                  │
│  ├──► ¡Rostro detectado! → Countdown 5 segundos                   │
│  │    └── Re-verifica en cada segundo que el rostro sigue presente │
│  │    └── Si se pierde → cancela y vuelve al inicio                │
│  │                                                                  │
│  ├──► Capturar imagen final en JPEG                                │
│  │                                                                  │
│  ├──► Rotar JPEG si el rostro estaba rotado                        │
│  │                                                                  │
│  ├──► Codificar imagen a Base64                                    │
│  │                                                                  │
│  ├──► Construir JSON con foto, aula, fecha y hora                  │
│  │                                                                  │
│  ├──► Enviar POST al servidor (con X-API-Key)                      │
│  │                                                                  │
│  ├──► Procesar respuesta:                                          │
│  │    ├── ✅ "success" → LED verde + Servo abre puerta (3s)        │
│  │    └── ❌ "error"   → LED rojo (3s)                             │
│  │                                                                  │
│  └──► Volver a "Buscando Rostro..."                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
firmware/
└── ESP32-S3-Reconocimiento/
    ├── platformio.ini          # Configuración de PlatformIO (placa, dependencias, flags)
    ├── src/
    │   ├── main.cpp            # Lógica principal (setup, loop, detección, envío HTTP)
    │   └── config.h            # ⚠️ Configuración del dispositivo (WiFi, server, pines, aula)
    ├── include/
    │   └── config.h            # Configuración alternativa / de referencia
    ├── lib/                    # Librerías locales (vacío, se usan las de lib_deps)
    ├── test/                   # Tests unitarios (vacío)
    └── .vscode/                # Configuración del IDE
```

> [!TIP]
> El archivo principal de configuración es **`src/config.h`**. El archivo en `include/config.h` sirve como referencia, pero `src/config.h` tiene prioridad al compilar.

---

## 📡 Protocolo de Comunicación

### Request (ESP32 → Servidor)

**Endpoint:** `POST /api/capture`

**Headers:**
```
Content-Type: application/json
X-API-Key: <API_KEY>
```

**Body (JSON):**
```json
{
  "foto_base64": "<imagen JPEG codificada en Base64>",
  "aula": "9",
  "fecha": "2026-05-28",
  "hora": "14:30:25"
}
```

### Response (Servidor → ESP32)

**Acceso Permitido (reconocido):**
```json
{
  "status": "success",
  "nombre": "Juan",
  "apellido": "Pérez"
}
```

**Acceso Denegado (no reconocido):**
```json
{
  "status": "error",
  "mensaje": "Rostro no registrado"
}
```

---

## 📺 Indicadores Visuales (OLED)

| Mensaje en Pantalla | Significado |
|---|---|
| `Kira UAS / Iniciando...` | Arranque del sistema |
| `Conectando WiFi...` | Intentando conexión a la red |
| `Sincronizando / Hora NTP...` | Obteniendo hora del servidor NTP |
| `Error Camara / Reintentando...` | No se pudo inicializar la cámara |
| `Sistema Listo / Buscando Rostro...` | Modo normal de operación |
| `Escaneando... / Ponte enfrente` | No se detecta rostro |
| `Rostro Detectado! / [countdown]` | Cuenta regresiva antes de captura |
| `Capturando... / No te muevas!` | Tomando la foto final |
| `Enviando... / Por favor espere` | Transmitiendo al servidor |
| `ACCESO PERMITIDO / [Nombre]` | ✅ El servidor reconoció al usuario |
| `ACCESO DENEGADO / [Mensaje]` | ❌ Rostro no registrado |
| `Espere Xs` | Cooldown activo entre capturas |
| `WiFi perdido / Reconectando...` | Se perdió la conexión |

---

## 🔧 Solución de Problemas

### El dispositivo no arranca / se reinicia continuamente

| Problema | Causa | Solución |
|---|---|---|
| `ERROR: Sin PSRAM` | Placa sin PSRAM o mal configurada | Verifica que tu placa tiene PSRAM. Asegúrate de que `BOARD_HAS_PSRAM` está en los build flags |
| `ERROR: jpegBuffer` | No hay suficiente PSRAM libre | Revisa que `memory_type = qio_opi` en `platformio.ini` |
| Reinicio al conectar servo | El servo consume demasiada corriente | Alimenta el servo con fuente externa de 5V |

### Problemas de conexión

| Problema | Causa | Solución |
|---|---|---|
| `WiFi timeout` → reinicio | No encuentra la red WiFi | Verifica SSID y contraseña en `config.h`. Asegúrate de usar 2.4 GHz (no 5 GHz) |
| `ERROR HTTP: -1` | Servidor no alcanzable | Verifica que la IP y puerto en `SERVER_URL` son correctos. Ambos dispositivos deben estar en la misma red |
| `ERROR 422` | JSON inválido o datos faltantes | Revisa el monitor serial para ver el payload enviado |
| `ERROR 401/403` | API Key incorrecta | Verifica que `API_KEY` coincida con `M2M_API_KEY` del servidor |

### Problemas de detección facial

| Problema | Causa | Solución |
|---|---|---|
| No detecta rostros | Poca iluminación o rostro muy lejos | Mejora la iluminación. Colócate a 30–60 cm de la cámara |
| Countdown se cancela | Movimiento excesivo | Mantente quieto frente a la cámara durante los 5 segundos |
| `WARN: NTP timeout` | Sin acceso a internet o DNS | Verifica que tu red tiene salida a internet |

### Monitor Serial

Para diagnosticar problemas, conecta el ESP32-S3 por USB y abre el monitor serial a **115200 baud**:

```bash
pio device monitor --baud 115200
```

Salida típica de un arranque exitoso:

```
=== INICIO ===
Servo OK: GPIO 2, posicion inicial 0°
PSRAM OK: 7864320 bytes libres
Buffers OK | PSRAM libre: 7491584 bytes
Conectando WiFi........
WiFi OK: 192.168.100.50
Sincronizando NTP...
NTP OK: 2026-05-28 14:30:00
Camara OK: 240x240
=== LISTO ===
```

---

## 📌 Notas Importantes

- **Resolución fija:** La cámara opera a **240×240 px**, que es la resolución requerida por el modelo ESP-DL de detección facial. No cambiar.
- **Cooldown:** Hay un intervalo mínimo de **8 segundos** entre capturas sucesivas para evitar spam al servidor.
- **Puerta abierta:** El servo mantiene la puerta abierta durante **3 segundos** (configurable con `PUERTA_OPEN_MS`).
- **Servo PWM:** Rango configurado para el MOT-100: 500µs–2400µs. Si usas otro servo, ajusta los valores en `servoMotor.attach()`.
- **Dos archivos `config.h`:** El archivo en `src/config.h` tiene prioridad. El de `include/config.h` puede usarse como plantilla o respaldo.
- **Consumo energético:** En operación continua el ESP32-S3 + cámara + OLED consumen ~300–500 mA. Asegúrate de que tu fuente soporta al menos **2A** (considerando picos del servo).

---

## 📄 Licencia

Este firmware forma parte del proyecto **Kira** — Sistema de Reconocimiento Facial para Control de Acceso y Asistencia Académica.
