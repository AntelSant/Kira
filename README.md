# Kira UAS — Sistema de Asistencia con IA

Sistema distribuido de pase de lista automático mediante reconocimiento facial con ESP32-S3 y control de acceso físico.

---

## Estructura del Proyecto

```
/Kira
├── /firmware
│   └── /ESP32-S3-Reconocimiento   # C++ (PlatformIO) para Freenove ESP32-S3 WROOM
│       ├── src/main.cpp           # Lógica de captura, detección multi-rotación, servo y LEDs
│       └── src/config.h          # Credenciales WiFi, IP del servidor, pines GPIO
├── /server1-face                  # FastAPI — Reconocimiento facial (Puerto 8001)
│   └── main.py                    # MTCNN + InceptionResNetV1 (VGGFace2) con PyTorch/CUDA
├── /server2-emotion               # FastAPI — Análisis emocional (Puerto 8002)
│   └── app/                       # HSEmotion, mapeo 7 emociones → positivo/neutro/negativo
├── /server3-bd                    # FastAPI + PostgreSQL + Dashboard (Puerto 8003)
│   ├── /api-gestion               # CRUD completo (usuarios, grupos, horarios, asistencias)
│   └── /dashboard                 # SPA Vanilla JS + HTML5 + CSS3 (multi-rol: admin/prof/alumno)
├── /simuladorESP32                # Utilidad web para probar Server 1 sin hardware
└── /script_inicio
    └── /arch                      # Scripts bash para lanzar los servidores (CachyOS / Arch)
```

---

## Inicio Rápido

### Prerequisitos
- Python 3.10+ y PostgreSQL 14+ instalados.
- GPU NVIDIA con CUDA 12+ (recomendado para Server 1 y 2).
- PlatformIO instalado para compilar el firmware.

### 1. Instalar dependencias de cada servidor

```bash
# Ejemplo (repetir para server2-emotion y server3-bd)
cd ~/Documentos/Kira/server1-face
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Levantar servidores (Arch/CachyOS)

> **Importante:** Levantar Server 3 primero, ya que los servidores de IA dependen de la BD.

```bash
# Terminal 1 — Base de datos + API de gestión + Dashboard
bash ~/Documentos/Kira/script_inicio/arch/start_server3.sh

# Terminal 2 — Reconocimiento facial
bash ~/Documentos/Kira/script_inicio/arch/start_server1.sh

# Terminal 3 — Análisis emocional
bash ~/Documentos/Kira/script_inicio/arch/start_server2.sh
```

### 3. Configurar y flashear el ESP32-S3

Editar `firmware/ESP32-S3-Reconocimiento/src/config.h`:

```cpp
const char *WIFI_SSID     = "TuRedWiFi";
const char *WIFI_PASSWORD = "TuContraseña";
const char *SERVER_URL    = "http://192.168.X.X:8001/api/capture";
#define AULA_ID            "9"   // ID exacto del aula en el dashboard
```

Luego compilar y subir con PlatformIO desde VSCode.

---

## Documentación Completa

Ver [DOCUMENTACION_OFICIAL.md](./DOCUMENTACION_OFICIAL.md) para:
- Arquitectura detallada de cada módulo
- Flujo completo del firmware (detección multi-rotación, servo, LEDs)
- Endpoints de cada servidor
- Roles de usuario y funcionalidades del dashboard
- Lógica de puntuación de asistencia (a tiempo / retardo / ausente)
- Casos de uso comunes
