# 👤 Kira — Server 1: Reconocimiento Facial y Liveness

Este microservicio en Python (FastAPI) procesa imágenes capturadas por el ESP32-S3 para autenticar a los alumnos mediante reconocimiento facial y medidas anti-spoofing.

## Características Principales

- **Reconocimiento Facial**: Utiliza MTCNN para la detección de rostros e InceptionResNetV1 (VGGFace2) para la extracción de embeddings (características de 512 dimensiones).
- **Aceleración GPU**: Diseñado para correr en CUDA (tarjetas NVIDIA) para máxima velocidad de inferencia en tiempo real.
- **Seguridad Anti-Spoofing (Liveness)**: Integra MiniFASNet para detectar intentos de fraude (fotos impresas, pantallas de celular, etc.), asegurando que el rostro frente a la cámara es de una persona viva.
- **Autenticación M2M**: Protegido por `X-API-Key` para comunicación segura entre el ESP32, Server 1 y la API principal.
- **Procesamiento Asíncrono**: Despacha tareas en segundo plano hacia el Server 2 (Análisis Emocional) para no retrasar la respuesta al ESP32 y abrir la puerta rápidamente.

## Endpoints Principales

- `POST /api/capture`: Recibe foto codificada en Base64 desde el ESP32, verifica si es real (Anti-Spoofing), extrae el embedding y consulta a la BD (Server 3) si hay coincidencia.
- `POST /api/register`: Permite dar de alta a un usuario con múltiples fotos, calculando el embedding promedio y asegurando que las fotos cumplen las normas de Liveness.

## Despliegue

La forma recomendada de desplegar es mediante Docker (ver `DOCKER_README.md` en la raíz). Se utiliza una imagen base `nvidia/cuda:12.1.0`.

Variables de Entorno (ver `.env.docker`):
- `SERVER3_URL`
- `SERVER2_URL`
- `API_KEY`
- `CUDA_DEVICE`
- `ANTISPOOF_ENABLED` y `ANTISPOOF_THRESHOLD`
