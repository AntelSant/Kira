# 🎭 Kira — Server 2: Análisis Emocional

Este microservicio en Python (FastAPI) evalúa el estado emocional de los estudiantes al momento de registrar su asistencia.

## Características Principales

- **Análisis de Emociones**: Utiliza el modelo HSEmotion y la librería EmotiEffLib.
- **Aceleración GPU**: Optimizado para ejecutarse en CUDA, minimizando el tiempo de procesamiento.
- **Clasificación Simplificada**: Mapea las emociones complejas a tres categorías accionables: Positivo, Neutro y Negativo. Esto alimenta el sistema de Alertas Tempranas de Deserción en el Dashboard.
- **Operación en Segundo Plano**: Recibe las solicitudes del Server 1 (Reconocimiento Facial) después de que este le haya respondido al ESP32, garantizando una respuesta de acceso físico ultrarrápida.

## Endpoints Principales

- `POST /api/emotion`: Recibe la imagen y datos de contexto (ID del estudiante) desde el Server 1, procesa la imagen para determinar la emoción predominante, y envía los resultados de forma asíncrona al Server 3 (Base de datos).

## Despliegue

La forma recomendada de desplegar es mediante Docker (ver `DOCKER_README.md` en la raíz). Se utiliza una imagen base `nvidia/cuda:12.1.0`.

Variables de Entorno (ver `.env.docker`):
- `API_KEY`: Autenticación M2M.
- `CUDA_DEVICE`: Dispositivo de procesamiento (ej. `cuda:0` o `cpu`).
