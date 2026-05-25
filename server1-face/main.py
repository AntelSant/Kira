from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import os
import numpy as np
from datetime import datetime
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import io
import httpx

# --- VARIABLES DE ENTORNO ---
SERVER3_URL = os.getenv("SERVER3_URL", "http://127.0.0.1:8003")
SERVER2_URL = os.getenv("SERVER2_URL", "http://127.0.0.1:8002")
API_KEY = os.getenv("API_KEY", "kira_default_secret_key")
CUDA_DEVICE = os.getenv("CUDA_DEVICE", "cuda:0")

app = FastAPI(title="Servidor 1 - Orquestador de Asistencia IA (Kira)")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN DE IA ---
print("-- Cargando modelos de IA en GPU...")
device = torch.device(CUDA_DEVICE if torch.cuda.is_available() else 'cpu')
print(f"[] Dispositivo de procesamiento: {device}")

mtcnn = MTCNN(keep_all=False, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
print("-- Modelos de IA listos.")

# --- CARPETAS ---
os.makedirs("capturas_temp", exist_ok=True)
os.makedirs("caras_recortadas", exist_ok=True)


# ============================================================
#  SCHEMAS
# ============================================================

class CapturaRequest(BaseModel):
    foto_base64: str
    aula: str
    fecha: str
    hora: str

class RegisterRequest(BaseModel):
    matricula: str
    foto_base64: str


# ============================================================
#  FUNCIONES AUXILIARES Y MIDDLEWARES
# ============================================================

def verificar_api_key(x_api_key: str = Header(...)):
    """Verifica que la petición contenga el API_KEY correcto."""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API Key inválida o faltante")

def extraer_embedding(image: Image.Image):
    """Detecta rostro con MTCNN y extrae embedding con ResNet. Retorna (vector, face_img) o (None, None)."""
    aligned_face = mtcnn(image)
    if aligned_face is None:
        return None, None

    # Guardar info del recorte para debug
    face_img = aligned_face.permute(1, 2, 0).cpu().numpy()
    face_img = ((face_img + 1) * 127.5).astype(np.uint8)

    # Extraer embedding
    aligned_face = aligned_face.unsqueeze(0).to(device)
    with torch.no_grad():
        embedding = resnet(aligned_face)

    vector = embedding[0].cpu().numpy().tolist()
    return vector, face_img


async def analizar_y_guardar_emocion(
    foto_b64: str,
    usuario_id: int,
    aula: str,
    fecha: str,
    hora: str,
    confianza_default: float = 0.0
):
    """Task en background: llama a Server2 para emoción y registra asistencia en Server3"""
    emocion_detectada = "neutro"
    confianza = confianza_default

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Paso 1: Obtener emoción de Server2
            try:
                resp_emocion = await client.post(
                    f"{SERVER2_URL}/api/emociones/analizar",
                    json={"foto_base64": foto_b64},
                    headers={"X-API-Key": API_KEY}
                )
                if resp_emocion.status_code == 200:
                    datos_emocion = resp_emocion.json()
                    emocion_detectada = datos_emocion.get("emocion", "neutro")
                    confianza = datos_emocion.get("confianza", 0.0)
                    print(f"-- Emoción detectada: {emocion_detectada} ({confianza*100:.1f}%)")
            except httpx.RequestError:
                print("!! -- Server2 no disponible, usando emoción neutro")

            # Paso 2: Registrar asistencia con emoción en Server3
            payload = {
                "usuario_id": usuario_id,
                "aula": aula,
                "fecha": fecha,
                "hora": hora,
                "emocion": emocion_detectada,
                "confianza_emocion": confianza
            }
            resp_asistencia = await client.post(
                f"{SERVER3_URL}/api/asistencia/registrar",
                json=payload,
                headers={"X-API-Key": API_KEY}
            )
            if resp_asistencia.status_code == 200:
                print("💾 Asistencia registrada en Server3")
            else:
                print(f"!! -- Error registrando asistencia: {resp_asistencia.text}")

    except Exception as e:
        print(f"!! -- Error en tarea de background: {e}")


# ============================================================
#  ENDPOINT: /api/capture  —  Flujo principal desde ESP32
# ============================================================

@app.post("/api/capture", dependencies=[Depends(verificar_api_key)])
async def procesar_asistencia(data: CapturaRequest, background_tasks: BackgroundTasks):
    try:
        # 1. Decodificar imagen
        image_bytes = base64.b64decode(data.foto_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        # 2. Detectar rostro y extraer embedding
        vector_facial, face_img = extraer_embedding(image)

        if vector_facial is None:
            print("!! -- No se detectó ningún rostro en la imagen.")
            return {"status": "error", "mensaje": "No se detectó rostro"}

        print("-- ¡Rostro detectado por MTCNN!")

        # Guardar recorte (debug)
        timestamp = f"{data.fecha.replace('-', '')}_{data.hora.replace(':', '')}"
        face_save_path = f"caras_recortadas/cara_{timestamp}.jpg"
        Image.fromarray(face_img).save(face_save_path)

        # 3. Preguntar a Server3: ¿Quién es?
        print("-?- Buscando identidad en Server3 (PostgreSQL)...")
        async with httpx.AsyncClient(timeout=10) as client:
            resp_reconocer = await client.post(
                f"{SERVER3_URL}/api/usuarios/reconocer",
                json={"vector_facial": vector_facial, "umbral": 0.40},
                headers={"X-API-Key": API_KEY}
            )

        datos_id = resp_reconocer.json()

        if not datos_id.get("encontrado"):
            print("<\> Rostro desconocido. Acceso denegado.")
            return {"status": "error", "mensaje": "Usuario desconocido"}

        usuario = datos_id["usuario"]
        print(f"-- ¡Bienvenido {usuario['nombre']} {usuario['apellido']}!")

        # 4. Lanzar análisis de emoción + registro de asistencia en BACKGROUND
        # Esto NO bloquea la respuesta al ESP32
        background_tasks.add_task(
            analizar_y_guardar_emocion,
            data.foto_base64,
            usuario["id"],
            data.aula,
            data.fecha,
            data.hora
        )

        print("Devolviendo respuesta al ESP32...")

        # 5. Responder al ESP32 inmediatamente
        return {
            "status": "success",
            "mensaje": f"Hola {usuario['nombre']}",
            "nombre": usuario["nombre"],
            "apellido": usuario["apellido"],
        }

    except Exception as e:
        print(f"!! -- Error general: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#  ENDPOINT: /api/register  —  Registrar cara desde Dashboard
# ============================================================

@app.post("/api/register", dependencies=[Depends(verificar_api_key)])
async def registrar_embedding(data: RegisterRequest):
    """Genera el embedding facial y lo envía a Server3"""
    try:
        # 1. Decodificar imagen
        image_bytes = base64.b64decode(data.foto_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        # 2. Extraer embedding
        vector_facial, _ = extraer_embedding(image)

        if vector_facial is None:
            return {"status": "error", "mensaje": "No se detectó rostro en la imagen"}

        # 3. Enviar a Server3
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.put(
                f"{SERVER3_URL}/api/usuarios/{data.matricula}/embedding",
                json={"vector_facial": vector_facial},
                headers={"X-API-Key": API_KEY}
            )

        if resp.status_code == 200:
            print(f"-- Embedding guardado para matrícula {data.matricula}")
            return {"status": "success", "mensaje": "Embedding facial guardado correctamente"}
        else:
            detail = resp.json().get("detail", "Error en Server3")
            return {"status": "error", "mensaje": detail}

    except Exception as e:
        print(f"!! -- Error al registrar embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))