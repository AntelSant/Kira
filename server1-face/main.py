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

app = FastAPI(title="Servidor 1 - Captura y Extracción Facial")

# --- CONFIGURACIÓN DE IA ---
print("Cargando modelos de IA... (Esto puede tardar unos segundos)")
# Detectar si tienes la RTX 4050 disponible, si no, usa el procesador
device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
print(f"Dispositivo de procesamiento: {device}")

# MTCNN: El modelo que busca y recorta la cara
mtcnn = MTCNN(keep_all=False, device=device)

# ResNet: El modelo que convierte la cara en un vector matemático (Embedding)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
print("✅ Modelos de IA listos.")

# --- CARPETAS ---
os.makedirs("capturas_temp", exist_ok=True)
os.makedirs("caras_recortadas", exist_ok=True) # Nueva carpeta para ver qué detectó la IA

class CapturaRequest(BaseModel):
    foto_base64: str
    grupo_id: int
    fecha: str
    hora: str

@app.post("/api/capture")
async def recibir_captura(data: CapturaRequest):
    try:
        # 1. Decodificar la imagen Base64 a bytes
        image_bytes = base64.b64decode(data.foto_base64)
        
        # 2. Convertir los bytes a una imagen legible para la IA (PIL Image)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # 3. Guardar la foto original como respaldo
        timestamp = f"{data.fecha.replace('-', '')}_{data.hora.replace(':', '')}"
        original_path = f"capturas_temp/original_{data.grupo_id}_{timestamp}.jpg"
        image.save(original_path)
        print(f"📸 Foto original guardada: {original_path}")

        # 4. PASO MÁGICO 1: Detectar la cara (MTCNN)
        # aligned_face es un tensor de PyTorch ya recortado y normalizado
        aligned_face = mtcnn(image)

        if aligned_face is not None:
            print("👤 ¡Rostro detectado!")
            
            # (Opcional) Guardar el recorte de la cara para que veas qué vio la IA
            face_save_path = f"caras_recortadas/cara_{timestamp}.jpg"
            # Denormalizar el tensor para guardarlo como imagen visible
            face_img = aligned_face.permute(1, 2, 0).cpu().numpy()
            face_img = ((face_img + 1) * 127.5).astype(np.uint8)
            Image.fromarray(face_img).save(face_save_path)
            
            # 5. PASO MÁGICO 2: Extraer características (ResNet)
            # Agregamos una dimensión extra porque el modelo espera un "lote" de imágenes
            aligned_face = aligned_face.unsqueeze(0).to(device)
            
            # Pasamos la cara por la red neuronal
            with torch.no_grad():
                embedding = resnet(aligned_face)
            
            # Convertimos el resultado a una lista de Python
            vector_facial = embedding[0].cpu().numpy().tolist()
            
            print(f"🧠 Vector facial extraído con éxito. Tamaño: {len(vector_facial)} números.")
            
            # --- NUEVO: ENVIAR EL VECTOR AL SERVIDOR 2 ---
            # Para la prueba, usaremos una matrícula de ejemplo
            matricula_alumno = "123456" 
            url_api = f"http://127.0.0.1:8003/api/usuarios/{matricula_alumno}/embedding"
            
            payload = {"vector_facial": vector_facial}
            
            try:
                print(f"➡️ Enviando vector al Servidor 2 (Matrícula: {matricula_alumno})...")
                respuesta = requests.put(url_api, json=payload)
                
                if respuesta.status_code == 200:
                    print("✅ ¡ÉXITO! Vector guardado oficialmente en PostgreSQL")
                else:
                    print(f"⚠️ El Servidor 2 rechazó el dato. Código: {respuesta.status_code} - Info: {respuesta.text}")
            except Exception as e:
                print(f"❌ Error: No se pudo conectar con el Servidor 2. ¿Está encendido en el puerto 8003? Detalles: {e}")
            
            return {
                "status": "success",
                "message": "Rostro detectado y vector extraído",
                "vector_size": len(vector_facial)
            }
        else:
            print("❌ No se detectó ningún rostro en la imagen.")
            return {"status": "error", "message": "No se detectó rostro"}

    except Exception as e:
        print(f"⚠️ Error procesando la captura: {e}")
        raise HTTPException(status_code=500, detail=str(e))