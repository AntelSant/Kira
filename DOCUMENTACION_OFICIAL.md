# 📘 Kira UAS — Sistema Avanzado de Asistencia IA

<p align="center">
  <i>Plataforma distribuida inteligente para el pase de lista automatizado y análisis emocional en tiempo real.</i>
</p>

---

## 1. Introducción y Visión General

**Kira** es un ecosistema de hardware y software diseñado para la automatización del pase de lista (asistencia) y el monitoreo del estado anímico en entornos académicos (UAS). Utiliza nodos de captura basados en **ESP32-S3** colocados en aulas y procesa las imágenes mediante modelos de inteligencia artificial en una arquitectura distribuida de microservicios.

### Características Principales
- **Biometría Inconsútil:** El pase de lista se realiza mediante reconocimiento facial sin que el alumno necesite credenciales físicas.
- **Control de Acceso Físico:** El sistema activa un servo (Steren MOT-100) para abrir una puerta y LEDs de retroalimentación visual en tiempo real.
- **Detección Multi-Rotación:** El firmware detecta rostros en cualquier orientación (0°, 90°, 180°, 270°) y corrige la imagen antes de transmitirla.
- **Análisis Emocional:** Evalúa el estado anímico general (positivo, neutro, negativo) de la comunidad académica.
- **Arquitectura Distribuida:** Separa la carga computacional pesada de la gestión administrativa.
- **Multi-Rol:** Dashboards dedicados para Administradores, Profesores y Alumnos.

---

## 2. Arquitectura del Sistema

```
[ESP32-S3 en Aula] ──POST HTTP──► [Server 1: Motor Facial :8001]
                                           │ background task
                                           ├──► [Server 2: Emociones :8002]
                                           │         │
                                           └──► [Server 3: API+BD+Dashboard :8003]
                                                       ▲
                                              [Dashboard Web (Vanilla JS)]
```

### 2.1 Nodo de Captura — Firmware (`/firmware/ESP32-S3-Reconocimiento`)

Desarrollado en **C++ (PlatformIO / Arduino Framework)** para el microcontrolador **Freenove ESP32-S3 WROOM**.

**Hardware integrado:**
| Componente | Descripción |
|---|---|
| Cámara | OV2640, resolución 240×240 (face mode) |
| OLED | SSD1306 128×64 (I2C: SDA=41, SCL=42) |
| Servo | Steren MOT-100 en GPIO 2 (PWM 50Hz, 500–2400µs) |
| LED Verde | GPIO 46 — Acceso permitido |
| LED Rojo | GPIO 47 — Acceso denegado |

**Flujo de operación del firmware:**
1. **Captura** un frame a 240×240 JPEG desde la cámara.
2. **Detección multi-rotación** (`detectarConRotacion()`): prueba 0°, 90°, 180° y 270° usando el pipeline ESP-DL (MSR01 + MNP01) hasta encontrar un rostro con confianza ≥ 0.5.
3. **Countdown de 5 segundos** con verificación continua del rostro.
4. **Captura la foto definitiva** y rota el JPEG al ángulo correcto (`rotarJPEG()`).
5. **Codifica en Base64** y construye el JSON `{foto_base64, aula, fecha, hora}`.
6. **Envía HTTP POST** al Server 1 usando `BufferStream` para evitar duplicar el payload en RAM.
7. **Actúa según la respuesta JSON**:
   - `status: "success"` → llama `abrirPuerta()` (LED verde + servo 0°→90°→0°).
   - `status: "error"` → llama `accesoDenegado()` (LED rojo 3 s).
8. **Cooldown de 8 segundos** entre envíos.

**Configuración** en `src/config.h`:
```cpp
const char *WIFI_SSID     = "TuRedWiFi";
const char *WIFI_PASSWORD = "TuContraseña";
const char *SERVER_URL    = "http://<IP_SERVER1>:8001/api/capture";
#define AULA_ID            "9"      // ID del aula en la BD
#define SERVO_PIN          2
#define LED_VERDE_PIN      46
#define LED_ROJO_PIN       47
#define SERVO_CERRADO      0        // grados
#define SERVO_ABIERTO      90       // grados
#define PUERTA_OPEN_MS     3000     // ms que la puerta permanece abierta
```

**Dependencias PlatformIO** (`platformio.ini`):
- `densaugeo/base64`, `Adafruit SSD1306`, `Adafruit GFX`, `ArduinoJson`, `ESP32Servo`, `EloquentEsp32cam`
- Partición: `huge_app.csv`, stack de cámara ampliado a 8192 bytes.

---

### 2.2 Servidor 1 — Motor Facial (`/server1-face`)

**Puerto:** `8001` | **Tecnología:** Python, FastAPI, PyTorch (CUDA), MTCNN, FaceNet/InceptionResnetV1 (VGGFace2)

Implementado en un único archivo `main.py` (arquitectura monolítica simple).

**Variables de entorno** (`.env`):
```env
SERVER3_URL=http://127.0.0.1:8003
SERVER2_URL=http://127.0.0.1:8002
CUDA_DEVICE=cuda:0
```

**Endpoints:**
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/capture` | Flujo principal desde ESP32. Detecta rostro, identifica al usuario en Server3, lanza análisis de emoción en background y responde inmediatamente al ESP32. |
| `POST` | `/api/register` | Genera embedding facial desde el Dashboard y lo guarda en Server3. |

**Flujo interno de `/api/capture`:**
1. Decodifica `foto_base64` → imagen PIL.
2. Extrae embedding facial con MTCNN + InceptionResNetV1 (512 dimensiones).
3. Consulta `POST /api/usuarios/reconocer` en Server3 con umbral de similitud `0.40`.
4. Si el usuario es reconocido, lanza `analizar_y_guardar_emocion()` como `BackgroundTask` (no bloquea la respuesta).
5. Responde al ESP32 con `{status, nombre, apellido}`.

**Modelos de IA usados:**
- **MTCNN** (`facenet-pytorch`): Detección y alineación de rostros.
- **InceptionResNetV1** (`facenet-pytorch`, preentrenado en VGGFace2): Generación de embeddings de 512 dimensiones.

---

### 2.3 Servidor 2 — Análisis Emocional (`/server2-emotion`)

**Puerto:** `8002` | **Tecnología:** Python, FastAPI, PyTorch, HSEmotion

Ejecutado en entorno aislado (puede correr en WSL2 o máquina secundaria).

**Endpoint principal:**
- `POST /api/emociones/analizar` — Recibe `{foto_base64}`, retorna `{emocion, confianza}`.

**Mapeo emocional:** 7 emociones base → 3 categorías:
- **Positivo:** alegría, sorpresa
- **Negativo:** enojo, tristeza, miedo, asco
- **Neutro:** neutral

---

### 2.4 Servidor 3 — API de Gestión, BD y Dashboard (`/server3-bd`)

**Puerto:** `8003` | **Tecnología:** FastAPI, SQLAlchemy, Alembic, JWT, PostgreSQL

El núcleo administrativo central del sistema.

**Componentes:**
- **`/api-gestion`** — Backend FastAPI con endpoints CRUD para usuarios, materias, grupos, horarios, inscripciones y asistencias. Autenticación con roles (JWT).
- **`/dashboard`** — Single Page Application en **Vanilla JS + HTML5 + CSS3**. Consume la API dinámicamente con `fetch`. Renderiza vistas distintas según el rol autenticado.
- **`docker-compose.yml`** — Orquestación de PostgreSQL y la API de gestión.

**Endpoints clave:**
- `POST /api/usuarios/reconocer` — Compara vector facial contra embeddings almacenados.
- `PUT /api/usuarios/{matricula}/embedding` — Guarda o actualiza el embedding facial de un usuario.
- `POST /api/asistencia/registrar` — Registra una asistencia con emoción, evaluando si fue a tiempo, retardo o ausencia según horarios.

---

### 2.5 Simulador Web ESP32 (`/simuladorESP32`)

Utilidad local en Python que permite subir imágenes JPEG desde el navegador para probar el Server 1 sin hardware real. Soporta subida por archivo y captura desde cámara web (base64 vía `getUserMedia`).

---

## 3. Funciones por Rol de Usuario

El **Dashboard Web** usa autenticación RBAC con tokens JWT.

### 🛡️ Administrador
- Gestión completa de catálogos: Universitarios, Materias, Grupos, Aulas, Horarios.
- Inscripciones manuales o por CSV.
- **Alta de rostros (embeddings):** Invoca `/api/register` del Server 1 desde el dashboard.
- Asignación de credenciales (email/contraseña).
- Métricas globales y reportes.

### 👨‍🏫 Profesor
- **Mis Grupos:** Lista de grupos asignados.
- **Lista de Asistencia:** Filtrado por día, con opción de **Justificar ausencias** o **Excluir/Restaurar días** del conteo oficial.
- **Emociones de Mis Clases:** Estado anímico promedio de sus estudiantes.

### 🎓 Alumno
- **Mis Clases:** Materias a las que fue inscrito oficialmente.
- **Mi Asistencia / Mis Stats:** Estadísticas personales de asistencias, retardos y ausencias por materia.

---

## 4. Lógica de Puntuación de Asistencia

Cuando el Server 1 confirma la identidad del alumno, el registro de asistencia (creado por el background task en Server 3) evalúa el horario vigente del aula:

| Estado | Criterio |
|---|---|
| **A tiempo** | De −15 min hasta +10 min del inicio de clase |
| **Retardo** | De +10 min a +20 min del inicio de clase |
| **Ausente** | Nunca se presentó (evaluado retroactivamente) |
| **Fuera de horario** | Detectado en cámara en horas fuera de su grupo |

Los profesores pueden complementar esto con **Justificaciones** (ausencia justificada oficial) o **Exclusiones** de días específicos.

---

## 5. Guía de Instalación y Despliegue

### 5.1 Requisitos Globales
- **Python 3.10+**
- **PostgreSQL 14+**
- **NVIDIA GPU con CUDA 12+** (muy recomendado para Server 1 y 2)
- **PlatformIO** (para compilar y flashear el firmware)

### 5.2 Instalación de Dependencias Python

El patrón es idéntico para Server 1, 2 y 3:
```bash
cd /home/antelsant/Documentos/Kira/<carpeta_servidor>
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5.3 Lanzamiento de Servidores

Se recomienda levantar **Server 3 primero** (los servidores de IA dependen de la base de datos):

```bash
# Servidor 3 — API de Gestión / BD (Puerto 8003) — PRIMERO
bash /home/antelsant/Documentos/Kira/script_inicio/arch/start_server3.sh

# Servidor 1 — Reconocimiento Facial (Puerto 8001)
bash /home/antelsant/Documentos/Kira/script_inicio/arch/start_server1.sh

# Servidor 2 — Emociones (Puerto 8002)
bash /home/antelsant/Documentos/Kira/script_inicio/arch/start_server2.sh
```

### 5.4 Flashear el Firmware al ESP32-S3

1. Editar `firmware/ESP32-S3-Reconocimiento/src/config.h` con tus credenciales WiFi, IP del Server 1 y el ID del aula.
2. Abrir el proyecto con PlatformIO (VSCode).
3. Compilar y subir (`Upload`).

---

## 6. Casos de Uso Comunes

### A. Dar de alta a un usuario con acceso web
1. Ir al panel Administrador (Puerto 8003).
2. Sección **Usuarios** → "Nuevo Usuario". Llenar matrícula, nombre y rol.
3. Usar los botones flotantes en la tabla para asignar **Email** (📧) y **Contraseña** (🔑).

### B. Registrar el rostro de un alumno (embedding biométrico)
1. En el panel Admin, ir a la sección de gestión del usuario.
2. Usar la función de **Alta de Rostro** (invoca `POST /api/register` al Server 1).
3. El sistema captura la imagen desde la cámara web del navegador, genera el embedding y lo guarda en la BD.

### C. Inscribir un alumno a un grupo
1. Asegurarse de tener creados: `Materia`, `Grupo`, `Profesor` y `Horarios`.
2. Sección **Inscripciones Escolares** → Seleccionar grupo → Buscar alumno por matrícula/nombre → **Inscribir**.

### D. Configurar un nuevo nodo ESP32 para un aula
1. Editar `config.h`: `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL`, `AULA_ID`.
2. Ajustar pines de servo/LEDs si el hardware difiere.
3. Flashear con PlatformIO.
4. En el Dashboard, registrar el aula con el `AULA_ID` configurado y asignarla a un grupo con horario.

---

_Cualquier modificación debe respetar el desarrollo modular y la separación de responsabilidades de la arquitectura multiservidor del proyecto._
