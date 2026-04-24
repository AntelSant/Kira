# 📘 Kira UAS — Sistema Avanzado de Asistencia IA

<p align="center">
  <i>Plataforma distribuida inteligente para el pase de lista automatizado y análisis emocional en tiempo real.</i>
</p>

---

## 1. Introducción y Visión General

**Kira** es un ecosistema de hardware y software diseñado para la automatización del pase de lista (asistencia) y el monitoreo del estado anímico en entornos académicos (UAS). Utiliza nodos de captura basados en **ESP32** (cámaras IoT) colocados en aulas, y procesa las imágenes mediante modelos de inteligencia artificial en una arquitectura descentralizada de microservicios.

### Características Principales:
- **Biometría Inconsútil:** El pase de lista se realiza mediante reconocimiento facial sin que el alumno necesite credenciales físicas o teléfonos.
- **Análisis Emocional:** El sistema evalúa el estado anímico general (positivo, neutro, negativo) de la comunidad académica para prevenir la deserción escolar.
- **Arquitectura Distribuida:** Separa la carga computacional pesada (redes neuronales) de la gestión administrativa y base de datos, permitiendo escalabilidad.
- **Multi-Rol:** Dashboards dedicados para Administradores, Profesores y Alumnos.

---

## 2. Arquitectura del Sistema

El proyecto está dividido en varios módulos que interactúan entre sí.

### 2.1 Nodo de Captura (ESP32 / Firmware)
Desarrollado en C++ (Arduino IDE), se programa en microcontroladores **ESP32-S3 o ESP32-CAM**.
- **Hardware:** Sensor físico de cámara (OV2640 o similar), pantalla OLED SSD1306 (opcional).
- **Rol:** Captura la imagen en el aula, la codifica en Base64, adjunta parámetros de aula/fecha/hora y la envía mediante un POST HTTP.
- **NTP:** Sincroniza la hora automáticamente de internet para garantizar exactitud.

### 2.2 Servidor 1: Motor Facial (`/server1-face`)
Ejecutado localmente, recibe las peticiones HTTP del ESP32.
- **Tecnología:** Python (FastAPI), PyTorch (CUDA), MTCNN (Detección), ArcFace/InsightFace (Reconocimiento).
- **Rol:** Valida quién está en la imagen cruzando la base de datos de "embeddings" (vectores matemáticos de rostros). Si hay un rostro válido, registra la entrada y evalúa si fue *a tiempo* o *retardo* según los Horarios de la BD del Servidor 3.
- **Flujo asíncrono:** Una vez reconocida la persona, envía una copia recortada del rostro al Servidor 2 para su análisis anímico sin detener la respuesta rápida al ESP32.

### 2.3 Servidor 2: Análisis Emocional (`/server2-emotion`)
Ejecutado en entorno aislado o secundario (ej. WSL2).
- **Tecnología:** Python (FastAPI), PyTorch, HSEmotion.
- **Rol:** Recibe los rostros validados por el Servidor 1, aplica un modelo de clasificación para inferir una de las 7 emociones base, la mapea a una categoría principal (Positivo, Neutro, Negativo) y la envía a la base de datos (Servidor 3).

### 2.4 Servidor 3: API de Gestión, BD y Dashboard (`/server3-bd`)
El núcleo administrativo central.
- **Backend:** FastAPI, SQLAlchemy (ORM), Alembic, JWT (Roles). Configurado con soporte CORS para permitir solicitudes externas a localhost desde los otros servidores.
- **Base de Datos:** PostgreSQL (con extensiones pgvector / cube si aplica, o tablas relacionales de embebidos). Guardan usuarios, inscripciones, asistencias y metadatos emocionales.
- **Frontend SPA (Dashboard):** Implementado en JavaScript puro (Vanilla JS), HTML5 y CSS3. Consumo dinámico de API (`app.js`). Renderiza vistas distintas dependiendo del rol autenticado, con un diseño de interfaz de ancho completo para mejor aprovechamiento del espacio.

### 2.5 Simulador Web (`/simuladorESP32`)
Una utilidad local en Python.
- **Rol:** Permite subir archivos JPEG desde el navegador o capturar fotos directamente desde la cámara web del dispositivo para probar el `Servidor 1` sin necesidad de hardware ESP32 real.

---

## 3. Funciones por Rol de Usuario

El **Dashboard Web** (servido por el Servidor 3) proporciona permisos basados en roles (RBAC) mediante tokens JWT.

### 🛡️ Administrador (admin)
- Gestión completa de catálogos (Universitarios, Materias, Grupos, Aulas, Horarios).
- Registro masivo/individual de alumnos (Inscripciones manuales o CSV).
- **Alta de rostros (embeddings):** Capacidad para invocar el registro de biometría en el sistema.
- Asignación de credenciales (correo/contraseña) a usuarios físicos.
- Visibilidad global: Dashboard con métricas de toda la escuela y reportes por aula.

### 👨‍🏫 Profesor (profesor)
- **Mis Grupos:** Consulta directa de los grupos que tiene asignados.
- **Lista de Asistencia Dinámica:** Interfaz tabular de asistencia, con capacidad de filtrado por día y la facultad de **Justificar o Excluir/Restaurar** días de forma oficial.
- **Emociones (Mis Clases):** Visualización analítica del estado anímico promedio de sus estudiantes.

### 🎓 Alumno (alumno)
- **Mis Clases:** Consulta de las materias a las que fue asignado oficialmente a través del proceso de *Inscripciones Escolares*.
- **Mi Asistencia / Mis Stats:** Visión de su recorrido temporal. Estadísticas de total a tiempo, retardos y ausencias a nivel personal y por materia.

---

## 4. Guía de Instalación y Despliegue

Cada microservicio en Python usa entornos virtuales independientes para evitar conflictos entre librerías complejas (como versiones específicas de PyTorch).

### 4.1 Requisitos Globales
- **Python 3.10+**
- **PostgreSQL 14+**
- (Opcional, muy recomendado) Servidor X con GPU NVIDIA (CUDA Toolkit 12) para aceleración profunda.

### 4.2 Pasos de Servicio (Servidor 1, 2 y 3)

El patrón de instalación es idéntico para las 3 carpetas Python:
\`\`\`bash
# Ejemplo para Servidor 1 (repetir para server2-emotion y server3-bd)
cd /home/antelsant/Documentos/Kira/server1-face
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

### 4.3 Inicialización (Lanzadores)
En el directorio `script_inicio/arch` se encuentran los scripts bash optimizados para lanzamiento simultáneo, garantizando un arranque ordenado:

- **`start_server1.sh`**: Corre el nodo principal facial (`localhost:8001`).
- **`start_server2.sh`**: Corre el nodo de emociones (`localhost:8002`).
- **`start_server3.sh`**: Levanta el API de Gestión y la UI (`localhost:8003`).

\`\`\`bash
bash /home/antelsant/Documentos/Kira/script_inicio/arch/start_server3.sh
\`\`\`
*(Nota: El servidor 3 debe levantarse primero siempre, ya que los nodos IA requieren de la base de datos).*

---

## 5. Casos de Uso Comunes

### A. Dar de alta a un usuario con acceso Web:
1. Ir al panel Administrador (Puerto 8003).
2. Sección **Usuarios** -> "Nuevo Usuario". Llenar matrícula, nombre y rol.
3. Usar los botones flotantes en la tabla para asignarle un **Email** (📧) y luego su **Contraseña** (🔑).

### B. Inscribir un alumno formalmente a un Grupo:
1. Asegurarse de tener creado el `Usuario (Profesor)`, la `Materia`, el `Grupo` y sus `Horarios`.
2. Sección **Inscripciones Escolares**: Seleccionar el Grupo y buscar al Alumno por matrícula/nombre, luego clicar **Inscribir**. Solo las asistencias registradas dentro de los horarios oficiales de ese grupo, emitidas por la cámara del aula configurada, se vincularán al alumno.

### C. Configurar el Hardware IoT (ESP32):
En el archivo C++ del `firmware/` (ej. `main.cpp`), localizar y modificar las variables globales:
- `WIFI_SSID` / `WIFI_PASSWORD` (Red local).
- `SERVER_URL` (Debe apuntar a la IP local de CachyOS, ej. `http://192.168.1.10:8001/api/capture`).
- `AULA_ID` (String exacto que debe coincidir con un aula configurada en los *Horarios* del dashboard web).

---

## 6. Lógica de Puntuación de Asistencia Funcional
Cuando el rostro ingresa, la API busca en qué clase *"debería"* estar ese alumno con base en los horarios vigentes.
- **A tiempo:** De -15 minutos hasta +10 minutos del inicio de la clase.
- **Retardo:** De 10 min a 20 min del inicio de clase.
- **Ausente:** Evaluado retroactivamente si nunca se presentó (o a través de exclusiones manuales del profesor o justificaciones oficiales).
- **Fuera_de_horario:** Fue detectado por otra cámara a horas no registradas en su grupo.

---
_Cualquier modificación o refactor se debe seguir un desarrollo modular debido a la arquitectura multiserver del proyecto._
