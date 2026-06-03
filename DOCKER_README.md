# 🐳 Kira — Guía de Despliegue con Docker

Guía completa para levantar el proyecto Kira usando contenedores Docker. Cada microservicio se ejecuta en su propio contenedor independiente, comunicándose a través de una red Docker interna.

---

## 📋 Tabla de Contenidos

- [Requisitos Previos](#-requisitos-previos)
- [Arquitectura de Contenedores](#-arquitectura-de-contenedores)
- [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
- [Levantar el Proyecto](#-levantar-el-proyecto)
- [Comandos Útiles](#-comandos-útiles)
- [Verificar que Todo Funciona](#-verificar-que-todo-funciona)
- [Acceso a los Servicios](#-acceso-a-los-servicios)
- [Desarrollo Local vs Docker](#-desarrollo-local-vs-docker)
- [Solución de Problemas](#-solución-de-problemas)

---

## 🔧 Requisitos Previos

| Requisito          | Versión Mínima | Comando para verificar |
|--------------------|----------------|----------------------|
| Docker             | 24.0+          | `docker --version`   |
| Docker Compose     | v2.0+          | `docker compose version` |
| NVIDIA Driver      | 525+           | `nvidia-smi` |
| NVIDIA Container Toolkit | 1.14+    | `nvidia-ctk --version` |

### Instalación de NVIDIA Container Toolkit (obligatorio para GPU)

Los servidores de IA (`kira-face` y `kira-emotion`) requieren acceso a la GPU NVIDIA desde Docker.

**Ubuntu/Debian:**
```bash
# Agregar repositorio de NVIDIA
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

**Arch Linux:**
```bash
sudo pacman -S nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

**Verificar que funciona:**
```bash
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

---

## 🏗️ Arquitectura de Contenedores

```
┌────────────────────────────────────────────────────────────────────┐
│                        Red Docker: kira-net                        │
│                                                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │  kira-face   │   │ kira-emotion │   │    kira-dashboard    │   │
│  │  (GPU/CUDA)  │   │  (GPU/CUDA)  │   │   (Nginx + React)   │   │
│  │  :8001       │   │  :8002       │   │   :80                │   │
│  └──────┬───────┘   └──────────────┘   └──────────┬───────────┘   │
│         │                                         │ proxy /api/*  │
│         │  HTTP inter-servicio                    ▼               │
│  ┌──────▼──────────────────────────────────────────────────────┐  │
│  │                       kira-api                              │  │
│  │                 (FastAPI - Python)                           │  │
│  │                      :8003                                  │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             │                                     │
│                    ┌────────▼────────┐                            │
│                    │    kira-db      │                            │
│                    │  PostgreSQL +   │                            │
│                    │   pgvector      │                            │
│                    │    :5432        │                            │
│                    └─────────────────┘                            │
└────────────────────────────────────────────────────────────────────┘
```

| Contenedor         | Imagen Base              | Puerto   | Función |
|--------------------|--------------------------|----------|---------|
| `kira-db`          | `ankane/pgvector:latest` | 5432     | Base de datos PostgreSQL con extensión pgvector |
| `kira-api`         | `python:3.11-slim`       | 8003     | API REST de gestión (usuarios, asistencia, alertas) |
| `kira-dashboard`   | `nginx:alpine`           | 80       | Dashboard React SPA + proxy reverso a la API |
| `kira-face`        | `nvidia/cuda:12.1.0`     | 8001     | Reconocimiento facial + anti-spoofing (GPU) |
| `kira-emotion`     | `nvidia/cuda:12.1.0`     | 8002     | Análisis de emociones con EmotiEffLib (GPU) |

---

## ⚙️ Configuración de Variables de Entorno

Cada servicio tiene su propio archivo `.env.docker`. **Debes crearlos antes de levantar los contenedores.**

### 1. Server1 — Reconocimiento Facial

📄 **`server1-face/.env.docker`**

```env
# =============================================
# Server 1 - Reconocimiento Facial (Kira)
# =============================================

# URLs de los otros servicios (usar nombres de contenedor Docker)
SERVER3_URL=http://kira-api:8003
SERVER2_URL=http://kira-emotion:8002

# Clave de autenticación M2M (DEBE ser igual en todos los servicios)
API_KEY=kira_default_secret_key

# Dispositivo GPU (cuda:0 = primera GPU, cpu = sin GPU)
CUDA_DEVICE=cuda:0

# Anti-Spoofing (detección de vida)
ANTISPOOF_ENABLED=true
ANTISPOOF_THRESHOLD=0.80
```

### 2. Server2 — Análisis de Emociones

📄 **`server2-emotion/.env.docker`**

```env
# =============================================
# Server 2 - Análisis de Emociones (Kira)
# =============================================

# Clave de autenticación M2M (DEBE ser igual en todos los servicios)
API_KEY=kira_default_secret_key

# Dispositivo GPU
CUDA_DEVICE=cuda:0
```

### 3. Server3 — API de Gestión

📄 **`server3-bd/api-gestion/.env.docker`**

```env
# =============================================
# Server 3 - API de Gestión (Kira)
# =============================================

# Conexión a PostgreSQL (usar nombre de contenedor "kira-db")
DATABASE_URL=postgresql://admin:admin@kira-db:5432/uas_ai_db

# Clave de autenticación M2M (DEBE ser igual en todos los servicios)
API_KEY=kira_default_secret_key

# URL interna de Server1
SERVER1_URL=http://kira-face:8001

# JWT para sesiones del dashboard
JWT_SECRET=kira_secret_2026_cambiar_en_produccion
JWT_EXPIRE_MINUTES=15

# Clave AES-256 para cifrar embeddings faciales
# GENERAR con: python3 -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM; import base64; print(base64.b64encode(AESGCM.generate_key(bit_length=256)).decode())"
EMBEDDING_ENCRYPTION_KEY=TU_CLAVE_AQUI

# Dashboard no servido por la API (Nginx lo sirve)
SERVE_DASHBOARD=false

# Email para alertas de deserción (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Configuración de alertas automáticas
ALERTA_HORA_EJECUCION=22:00
ALERTA_MIN_FALTAS=4
```

### 4. Dashboard React

📄 **`server3-bd/dashboard/.env.docker`**

```env
# =============================================
# Dashboard React (Kira)
# =============================================

# Dejar vacío: Nginx hace proxy reverso, no necesita URL absoluta
VITE_API_URL=
```

---

## 🚀 Levantar el Proyecto

### Paso 1: Crear los archivos `.env.docker`

Copia los ejemplos de arriba y edítalos con tus valores reales:

```bash
cd /ruta/a/Kira

# Copiar los templates (si existen los .env.docker.example)
# O simplemente crear los archivos manualmente con los valores de la sección anterior
```

> ⚠️ **IMPORTANTE**: Genera una clave de cifrado única para `EMBEDDING_ENCRYPTION_KEY`:
> ```bash
> python3 -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM; import base64; print(base64.b64encode(AESGCM.generate_key(bit_length=256)).decode())"
> ```
> Copia el resultado en `server3-bd/api-gestion/.env.docker`.

> ⚠️ **IMPORTANTE**: El valor de `API_KEY` **debe ser idéntico** en los 3 servidores. Si lo cambias en uno, cámbialo en todos.

### Paso 2: Construir las imágenes

```bash
# Construir todas las imágenes (primera vez tarda ~10-20 min por las dependencias CUDA)
docker compose build
```

Para construir un servicio específico:
```bash
docker compose build kira-face       # Solo server1
docker compose build kira-emotion    # Solo server2
docker compose build kira-api        # Solo server3 API
docker compose build kira-dashboard  # Solo dashboard
```

### Paso 3: Levantar todos los servicios

```bash
# Levantar todo en segundo plano
docker compose up -d
```

El orden de arranque se maneja automáticamente:
1. `kira-db` (PostgreSQL) — arranca primero
2. `kira-api` — espera a que la BD pase el healthcheck
3. `kira-dashboard` — espera a que la API esté lista
4. `kira-face` y `kira-emotion` — esperan a la API

### Paso 4: Verificar el estado

```bash
docker compose ps
```

Salida esperada:
```
NAME              STATUS          PORTS
kira-db           running         0.0.0.0:5432->5432/tcp
kira-api          running         0.0.0.0:8003->8003/tcp
kira-dashboard    running         0.0.0.0:80->80/tcp
kira-face         running         0.0.0.0:8001->8001/tcp
kira-emotion      running         0.0.0.0:8002->8002/tcp
```

---

## 🛠️ Comandos Útiles

### Gestión del Stack

```bash
# Levantar todo
docker compose up -d

# Detener todo (sin eliminar datos)
docker compose down

# Detener y eliminar volúmenes (⚠️ BORRA LA BASE DE DATOS)
docker compose down -v

# Reiniciar un servicio específico
docker compose restart kira-api

# Reconstruir y levantar (después de cambios en el código)
docker compose up -d --build

# Reconstruir solo un servicio
docker compose up -d --build kira-dashboard
```

### Logs

```bash
# Ver logs de todos los servicios (en tiempo real)
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f kira-face
docker compose logs -f kira-api

# Ver las últimas 50 líneas de un servicio
docker compose logs --tail=50 kira-emotion
```

### Acceso a los Contenedores

```bash
# Abrir una terminal dentro de un contenedor
docker exec -it kira-api bash
docker exec -it kira-face bash

# Verificar GPU dentro del contenedor
docker exec kira-face nvidia-smi
docker exec kira-emotion nvidia-smi

# Acceder a PostgreSQL directamente
docker exec -it kira-db psql -U admin -d uas_ai_db
```

### Imágenes

```bash
# Ver las imágenes construidas
docker images | grep kira

# Eliminar imágenes para reconstruir desde cero
docker rmi kira-kira-face kira-kira-emotion kira-kira-api kira-kira-dashboard
```

---

## ✅ Verificar que Todo Funciona

Ejecuta estos comandos después de levantar el stack para confirmar que todos los servicios están operativos:

```bash
# 1. Base de datos conectada
curl -s http://localhost:8003/api/health
# Respuesta esperada: {"status":"ok","db_connection":"success"}

# 2. API accesible directamente
curl -s http://localhost:8003/docs
# Debe mostrar el HTML de Swagger UI

# 3. Dashboard React carga en Nginx
curl -sI http://localhost:80
# Debe responder HTTP 200

# 4. Proxy Nginx → API funciona
curl -s http://localhost:80/api/health
# Respuesta esperada: {"status":"ok","db_connection":"success"}

# 5. Server1 (Face) operativo
curl -s http://localhost:8001/docs
# Debe mostrar Swagger UI

# 6. Server2 (Emotion) operativo
curl -s http://localhost:8002/docs
# Debe mostrar Swagger UI

# 7. GPU disponible en contenedores de IA
docker exec kira-face nvidia-smi
docker exec kira-emotion nvidia-smi
```

---

## 🌐 Acceso a los Servicios

| Servicio            | URL                                     | Descripción                             |
|---------------------|-----------------------------------------|-----------------------------------------|
| **Dashboard**       | http://localhost                        | Interfaz web principal (React)          |
| **API Docs**        | http://localhost:8003/docs              | Swagger UI de la API de gestión         |
| **Server1 Docs**    | http://localhost:8001/docs              | Swagger UI del reconocimiento facial    |
| **Server2 Docs**    | http://localhost:8002/docs              | Swagger UI del análisis de emociones    |

### Primer Uso — Crear Administrador

La primera vez que levantes el proyecto, necesitas crear el primer administrador:

```bash
curl -X POST http://localhost:8003/api/admins/primer-admin \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Admin",
    "email": "admin@kira.local",
    "password": "tu_password_seguro"
  }'
```

Después podrás entrar al dashboard en http://localhost con esas credenciales.

---

## 💻 Desarrollo Local vs Docker

El proyecto mantiene compatibilidad con ambos modos de ejecución:

| Aspecto               | Local (`start_all.sh`)                       | Docker (`docker compose`)                      |
|-----------------------|----------------------------------------|----------------------------------------------|
| Archivos de config    | `.env` por servicio                    | `.env.docker` por servicio                   |
| Dashboard             | Servido por FastAPI (`SERVE_DASHBOARD=true`) | Servido por Nginx (contenedor separado)      |
| URLs inter-servicio   | `http://127.0.0.1:800X`                | `http://kira-xxx:800X` (DNS Docker)          |
| Base de datos         | PostgreSQL local o Docker individual   | PostgreSQL en contenedor `kira-db`             |
| GPU                   | Acceso directo al driver               | Via NVIDIA Container Toolkit                   |
| Comando de inicio     | `./start_all.sh`                       | `docker compose up -d`                     |
| Comando de parada     | `./stop_all.sh`                        | `docker compose down`                      |

> 💡 Los archivos `.env` (desarrollo local) y `.env.docker` (Docker) son independientes. Modificar uno no afecta al otro.

---

## 🐛 Solución de Problemas

### La base de datos no arranca

```bash
# Ver logs de PostgreSQL
docker compose logs kira-db

# Si hay problemas de permisos en el volumen
docker compose down -v   # ⚠️ Esto borra los datos
docker compose up -d
```

### La API no conecta con la base de datos

```bash
# Verificar que kira-db está healthy
docker compose ps

# Verificar la URL de conexión en el .env.docker
# Debe ser: postgresql://admin:admin@kira-db:5432/uas_ai_db
# (Usar "kira-db" como host, NO "localhost")
```

### Error "GPU not available" o "CUDA error"

```bash
# 1. Verificar que el driver NVIDIA funciona en el host
nvidia-smi

# 2. Verificar NVIDIA Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# 3. Si no funciona, reinstalar el toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 4. Para usar CPU en vez de GPU, cambiar en los .env.docker:
# CUDA_DEVICE=cpu
# Y quitar la sección deploy.resources del docker-compose.yml
```

### El dashboard no carga o muestra error de red

```bash
# Verificar que Nginx está corriendo
docker compose logs kira-dashboard

# Verificar que el proxy funciona
curl -v http://localhost:80/api/health

# Si el proxy falla, verificar que kira-api está corriendo
docker compose ps kira-api
```

### Error de API_KEY (401 Unauthorized entre servicios)

La clave `API_KEY` debe ser **exactamente igual** en los 3 archivos `.env.docker`:
- `server1-face/.env.docker`
- `server2-emotion/.env.docker`
- `server3-bd/api-gestion/.env.docker`

### Reconstruir después de cambios en el código

```bash
# Si modificaste código Python (API, face, emotion)
docker compose up -d --build kira-api kira-face kira-emotion

# Si modificaste código React (dashboard)
docker compose up -d --build kira-dashboard

# Si modificaste el docker-compose.yml
docker compose up -d
```

### Espacio en disco (las imágenes CUDA son grandes)

```bash
# Ver cuánto espacio usan las imágenes
docker system df

# Limpiar imágenes y cachés no utilizados
docker system prune -a
```

> ⚠️ Las imágenes de `kira-face` y `kira-emotion` pesan ~8-12 GB cada una debido a CUDA + PyTorch. Asegúrate de tener al menos **30 GB libres** antes de construir.

---

## 📁 Estructura de Archivos Docker

```
Kira/
├── docker-compose.yml              ← Orquestación de todos los servicios
├── DOCKER_README.md                ← Esta guía
│
├── server1-face/
│   ├── Dockerfile                  ← Imagen CUDA + PyTorch + facenet
│   ├── .dockerignore
│   ├── .env.docker                 ← Variables de entorno (NO subir a git)
│   ├── main.py
│   ├── antispoof.py
│   └── requirements.txt
│
├── server2-emotion/
│   ├── Dockerfile                  ← Imagen CUDA + PyTorch + EmotiEffLib
│   ├── .dockerignore
│   ├── .env.docker                 ← Variables de entorno (NO subir a git)
│   ├── main.py
│   └── requirements.txt
│
└── server3-bd/
    ├── init.sql                    ← Script de inicialización de PostgreSQL
    │
    ├── api-gestion/
    │   ├── Dockerfile              ← Imagen Python slim + FastAPI
    │   ├── .dockerignore
    │   ├── .env.docker             ← Variables de entorno (NO subir a git)
    │   ├── main.py
    │   ├── database.py
    │   ├── models.py
    │   └── requirements.txt
    │
    └── dashboard/
        ├── Dockerfile              ← Multi-stage: Node build → Nginx
        ├── .dockerignore
        ├── .env.docker             ← Variables de entorno (NO subir a git)
        ├── nginx.conf              ← Config Nginx (proxy + SPA + gzip)
        ├── package.json
        └── src/
```
