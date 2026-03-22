import os
import base64
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Crear carpeta temporal para guardar las fotos que lleguen
os.makedirs("capturas_temp", exist_ok=True)

app = FastAPI(
    title="Servidor 1 - Receptor de Capturas",
    description="Puente entre el ESP32-CAM y el motor de IA",
    version="1.0.0"
)

# Definimos el esquema del JSON que esperamos recibir del ESP32
class CapturaESP32(BaseModel):
    foto_base64: str
    grupo_id: int
    fecha: str
    hora: str

@app.post("/api/capture")
async def recibir_captura(data: CapturaESP32):
    """
    Recibe el JSON del ESP32, extrae el Base64 y lo guarda como imagen física.
    """
    try:
        # 1. Limpiar el string base64 por si el ESP32 manda cabeceras extra
        base64_data = data.foto_base64
        if "base64," in base64_data:
            base64_data = base64_data.split("base64,")[1]
            
        # 2. Decodificar la imagen
        image_bytes = base64.b64decode(base64_data)
        
        # 3. Generar un nombre de archivo y guardar
        nombre_archivo = f"capturas_temp/captura_grupo_{data.grupo_id}_{data.hora.replace(':', '')}.jpg"
        
        with open(nombre_archivo, "wb") as f:
            f.write(image_bytes)
            
        print(f"✅ ¡Foto recibida y guardada en {nombre_archivo}!")
        
        # Por ahora devolvemos 200 OK. Después, aquí devolveremos el sticker a mostrar.
        return {"status": "success", "mensaje": "Imagen recibida correctamente"}
        
    except Exception as e:
        print(f"❌ Error al procesar la imagen: {e}")
        raise HTTPException(status_code=400, detail="Error decodificando la imagen Base64")