# 🧠 Kira — API de Gestión (Orquestador Central)

Backend desarrollado en Python y FastAPI encargado de conectar las operaciones de la IA (Server 1 y 2) con la Base de Datos y el Frontend (Dashboard).

## Características Principales

- **Gestión de Base de Datos**: Mapeo completo con SQLAlchemy (tablas: usuarios, materias, horarios, grupos, alertas, asistencias, emociones).
- **Embeddings Seguros**: Almacenamiento seguro de las características biométricas en la tabla `usuarios` usando la extensión `pgvector` y cifrado AES-256 (EMBEDDING_ENCRYPTION_KEY).
- **Alertas Tempranas (Cron/Background)**: Tareas en segundo plano que detectan alumnos en riesgo de deserción escolar cruzando ausencias continuas y registros emocionales negativos. También notifica por Email usando SMTP.
- **Autenticación Dual**: 
  1. `X-API-Key` para comunicación M2M (Machine to Machine) con Server 1, Server 2 y el ESP32.
  2. Tokens JWT con tiempo de expiración configurable para las sesiones del Dashboard Web.

## Endpoints

- `/api/auth/*`: Gestión de sesiones (Login, creación del primer admin).
- `/api/users/*`, `/api/groups/*`, `/api/schedules/*`: Endpoints CRUD consumidos por el Dashboard.
- `/api/records/*`: Endpoints de registro llamados por los servidores de IA (Server 1 manda el registro de asistencia, Server 2 manda la emoción).
- `/api/alerts/*`: Visualización y gestión de alertas por deserción.

## Despliegue

Sigue las instrucciones generales de Docker (`DOCKER_README.md` en la raíz).
Configuración mediante el archivo `.env.docker` incluyendo credenciales de DB, SMTP para correos, claves de encriptado y JWT.
