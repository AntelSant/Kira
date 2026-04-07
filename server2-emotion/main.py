import os
import cv2
import numpy as np
import base64
import torch
import io
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from facenet_pytorch import MTCNN

# ==========================================
# PARCHE DE SEGURIDAD PARA PYTORCH 2.6+
# Forzamos weights_only=False por compatibilidad
original_load = torch.load
def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = patched_load
# ==========================================

from emotiefflib.facial_analysis import EmotiEffLibRecognizerOnnx

app = FastAPI(
    title="Servidor 2 - Analizador de Emociones",
    description="Microservicio con PyTorch y HSEmotion (Acelerado por GPU)"
)

# --- CONFIGURACIÓN DE IA (PYTORCH) ---
CUDA_DEVICE = os.getenv("CUDA_DEVICE", "cuda:0")
device = CUDA_DEVICE if torch.cuda.is_available() else 'cpu'
print(f"🚀 Iniciando IA de Emociones en: {device}...")

# MTCNN para buscar la cara en la foto
mtcnn = MTCNN(keep_all=False, device=device)

# EmotiEffLib (sucesor de hsemotion) - usa ONNX, sin dependencias de timm
model_name = 'enet_b0_8_best_vgaf'
recognizer = EmotiEffLibRecognizerOnnx(model_name=model_name)
print("✅ Modelos cargados exitosamente.")

class EmocionRequest(BaseModel):
    foto_base64: str

# --- FUNCIÓN TRADUCTORA DE EMOCIONES ---
def clasificar_emocion(emocion_ingles: str) -> str:
    """Convierte las emociones de HSEmotion a tu BD (positivo, neutro, negativo).
    Normaliza a Title Case para comparar sin importar cómo devuelva el modelo.
    """
    # Normalizar: 'happiness' -> 'Happiness', 'ANGER' -> 'Anger'
    emocion_norm = str(emocion_ingles).strip().title()
    
    positivas = {'Happiness', 'Surprise'}
    negativas = {'Anger', 'Contempt', 'Disgust', 'Fear', 'Sadness'}
    
    if emocion_norm in positivas:
        return "positivo"
    elif emocion_norm in negativas:
        return "negativo"
    else:
        return "neutro"

@app.post("/api/emociones/analizar")
async def analizar_emocion(data: EmocionRequest):
    try:
        # 1. Decodificar Base64 a imagen de PIL
        image_bytes = base64.b64decode(data.foto_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # 2. Encontrar el rostro en la imagen
        boxes, _ = mtcnn.detect(image)
        
        if boxes is None:
            print("⚠️ No se encontró cara para emociones.")
            return {"emocion": "neutro", "emocion_cruda": "no_face", "confianza": 0.0}
            
        # 3. Recortar la cara
        box = boxes[0]
        x1, y1, x2, y2 = [int(b) for b in box]
        img_array = np.array(image)
        face_crop = img_array[max(0, y1):y2, max(0, x1):x2]
        
        if face_crop.size == 0:
            return {"emocion": "neutro", "emocion_cruda": "error_crop", "confianza": 0.0}

        # 4. Predecir la emoción
        emocion_cruda, scores = recognizer.predict_emotions(face_crop, logits=False)
        
        # Asegurarse de que emocion_cruda sea un string simple (algunos modelos devuelven lista)
        if isinstance(emocion_cruda, (list, np.ndarray)):
            emocion_cruda = emocion_cruda[0]
        emocion_cruda = str(emocion_cruda)
        
        # 5. Clasificar para tu Base de Datos
        emocion_final = clasificar_emocion(emocion_cruda)
        confianza = float(np.max(scores))

        print(f"🎭 Resultado: {emocion_cruda} ({confianza*100:.1f}%) -> {emocion_final.upper()}")

        return {
            "emocion": emocion_final,
            "emocion_cruda": emocion_cruda,
            "confianza": confianza
        }

    except Exception as e:
        print(f"❌ Error al analizar la emoción: {e}")
        return {"emocion": "neutro", "emocion_cruda": "error", "confianza": 0.0}

if __name__ == "__main__":
    import uvicorn
    # Arrancamos en el puerto 8002
    uvicorn.run(app, host="0.0.0.0", port=8002)