from dotenv import load_dotenv
load_dotenv()  # Cargar variables de entorno desde .env

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import os
import cv2
import numpy as np
from datetime import datetime
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import io
import requests

# --- VARIABLES DE ENTORNO ---
SERVER3_URL = os.getenv("SERVER3_URL", "http://127.0.0.1:8003") # Base de Datos y Gestión
SERVER2_URL = os.getenv("SERVER2_URL", "http://127.0.0.1:8002") # Análisis de Emociones
CUDA_DEVICE = os.getenv("CUDA_DEVICE", "cuda:0")

app = FastAPI(title="Servidor 1 - Orquestador de Asistencia IA")

# --- CONFIGURACIÓN DE IA ---
print("Cargando modelos de IA en GPU... 🚀")
device = torch.device(CUDA_DEVICE if torch.cuda.is_available() else 'cpu')
print(f"Dispositivo de procesamiento: {device}")

mtcnn = MTCNN(keep_all=False, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
print("✅ Modelos de IA listos.")

# --- CARPETAS ---
os.makedirs("capturas_temp", exist_ok=True)
os.makedirs("caras_recortadas", exist_ok=True)

class CapturaRequest(BaseModel):
    foto_base64: str
    grupo_id: int
    fecha: str
    hora: str

@app.post("/api/capture") # Si tu ESP32 apunta a /api/reconocimiento, cambia esto
async def procesar_asistencia(data: CapturaRequest):
    try:
        # 1. Decodificar la imagen
        image_bytes = base64.b64decode(data.foto_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        timestamp = f"{data.fecha.replace('-', '')}_{data.hora.replace(':', '')}"
        
        # 2. Detectar y recortar la cara (MTCNN)
        aligned_face = mtcnn(image)

        if aligned_face is not None:
            print("👤 ¡Rostro detectado por MTCNN!")
            
            # Guardar recorte (Opcional, para debug)
            face_save_path = f"caras_recortadas/cara_{timestamp}.jpg"
            face_img = aligned_face.permute(1, 2, 0).cpu().numpy()
            face_img = ((face_img + 1) * 127.5).astype(np.uint8)
            Image.fromarray(face_img).save(face_save_path)
            
            # 3. Extraer características (ResNet)
            aligned_face = aligned_face.unsqueeze(0).to(device)
            with torch.no_grad():
                embedding = resnet(aligned_face)
            
            vector_facial = embedding[0].cpu().numpy().tolist()
            
            # =========================================================
            # FASE DE ORQUESTACIÓN CON LOS OTROS SERVIDORES
            # =========================================================
            
            # A) PREGUNTAR AL SERVIDOR 3: "¿Quién es?"
            print("🔍 Buscando identidad en Servidor 3 (PostgreSQL)...")
            url_reconocer = f"{SERVER3_URL}/api/usuarios/reconocer"
            resp_reconocer = requests.post(url_reconocer, json={
                "vector_facial": vector_facial,
                "umbral": 0.40 # Ajusta esto si es muy estricto o muy flexible
            })
            
            datos_id = resp_reconocer.json()
            
            if not datos_id.get("encontrado"):
                print("⚠️ Rostro desconocido. Acceso denegado.")
                return {"status": "error", "mensaje": "Usuario desconocido"}
                
            usuario = datos_id["usuario"]
            print(f"✅ ¡Es {usuario['nombre']} {usuario['apellido']}!")

            # B) PREGUNTAR AL SERVIDOR 2: "¿Qué emoción tiene?"
            print("🎭 Consultando emoción al Servidor 2...")
            emocion_detectada = "Neutro" # Default por si el Servidor 2 está apagado
            try:
                url_emocion = f"{SERVER2_URL}/api/emociones/analizar"
                # Le mandamos el base64 original
                resp_emocion = requests.post(url_emocion, json={"foto_base64": data.foto_base64}, timeout=3)
                if resp_emocion.status_code == 200:
                    emocion_detectada = resp_emocion.json().get("emocion", "Neutro")
                    print(f"✨ Emoción detectada: {emocion_detectada}")
            except requests.exceptions.RequestException:
                print("⚠️ Servidor 2 apagado o inalcanzable. Usando emoción por defecto.")

            # C) REGISTRAR ASISTENCIA EN EL SERVIDOR 3
            print("💾 Guardando asistencia en Servidor 3...")
            url_asistencia = f"{SERVER3_URL}/api/asistencia/registrar"
            payload_asistencia = {
                "usuario_id": usuario["id"],
                "grupo_id": data.grupo_id,
                "fecha": data.fecha,
                "hora": data.hora,
                "emocion": emocion_detectada
            }
            # Comentado hasta que crees este endpoint en el Servidor 3
            requests.post(url_asistencia, json=payload_asistencia)

            print("🎉 ¡Flujo completo exitoso!")
            
            # D) RESPONDER AL ESP32
            return {
                "status": "success",
                "mensaje": f"Hola {usuario['nombre']}",
                "emocion": emocion_detectada
            }
            
        else:
            print("❌ No se detectó ningún rostro en la imagen.")
            return {"status": "error", "mensaje": "No se detectó rostro"}

    except Exception as e:
        print(f"⚠️ Error general: {e}")
        raise HTTPException(status_code=500, detail=str(e))