# Kira UAS — Sistema de Asistencia con IA

Sistema distribuido de pase de lista automático mediante reconocimiento facial con ESP32-S3 y control de acceso físico.

---

## Estructura del Proyecto

```
/Kira
├── /firmware                      # ESP32-S3: Captura de rostro, ESP-DL y control de puerta
├── /server1-face                  # FastAPI: Reconocimiento Facial (Facenet) + Anti-Spoofing
├── /server2-emotion               # FastAPI: Análisis Emocional (HSEmotion)
├── /server3-bd                    # Base de datos PostgreSQL, API de Gestión y Dashboard React
│   ├── /api-gestion               # FastAPI: CRUD completo, Autenticación y Alertas
│   └── /dashboard                 # Vite + React + TypeScript: SPA Multi-rol
├── /simuladorESP32                # Utilidad web para probar Server 1 sin hardware
└── docker-compose.yml             # Orquestación de todos los microservicios
```

---

## Documentación Principal

El proyecto Kira ha evolucionado hacia una arquitectura basada en microservicios dockerizados. Por favor, consulta los siguientes documentos para la instalación, despliegue y detalles técnicos:

1. **[Guía de Despliegue con Docker (DOCKER_README.md)](./DOCKER_README.md)**
   Aprende cómo configurar y levantar todo el sistema Kira en minutos utilizando Docker y `docker-compose`. (¡Esta es la forma recomendada de ejecutar Kira!)

2. **[Documentación Oficial (DOCUMENTACION_OFICIAL.md)](./DOCUMENTACION_OFICIAL.md)**
   Arquitectura detallada, flujos de autenticación (X-API-Key, JWT), Anti-Spoofing, Alertas Inteligentes y diseño de base de datos.

3. **[Análisis de Mejoras (ANALISIS_MEJORAS_KIRA.md)](./ANALISIS_MEJORAS_KIRA.md)**
   Historial de actualizaciones, incluyendo la migración a React, alertas tempranas de deserción y seguridad Anti-Spoofing.

---

## Microservicios

Cada componente de Kira tiene su propia documentación técnica. Si deseas trabajar en un servicio específico, revisa su README:

- 📷 **[Firmware ESP32-S3](./firmware/README.md)**
- 👤 **[Server 1: Reconocimiento Facial](./server1-face/README.md)**
- 🎭 **[Server 2: Análisis de Emociones](./server2-emotion/README.md)**
- ⚙️ **[Server 3: API de Gestión y Base de Datos](./server3-bd/README.md)**
- 🧠 **[Server 3 API: Lógica y Base de Datos](./server3-bd/api-gestion/README.md)**
- 💻 **[Server 3 Dashboard: UI Web](./server3-bd/dashboard/README.md)**

---

**Nota:** Si necesitas ejecutar Kira sin Docker (modo desarrollo local), puedes usar el script `./start_all.sh` ubicado en la raíz del proyecto.
