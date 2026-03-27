import os
import shutil
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import List

# --- IMPORTACIONES DE TU BASE DE DATOS Y MODELOS ---
from database import get_db, engine 
from models import Base, Usuario, TipoUsuario  

# --- MAGIA DE SQLALCHEMY ---
# Esta línea va a tu PostgreSQL y crea TODAS las tablas si no existen
print("⏳ Verificando y construyendo tablas en la base de datos...")
Base.metadata.create_all(bind=engine)
print("✅ ¡Tablas listas y creadas!")
# ---------------------------

# Crear la carpeta física para guardar las fotos si no existe
os.makedirs("app/static/perfiles", exist_ok=True)

app = FastAPI(
    title="API de Gestión y Asistencia - UAS",
    description="Backend central para dashboard, usuarios y reportes",
    version="1.0.0"
)

# Montar la ruta estática para servir las fotos de perfil al Dashboard Angular
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Endpoint para verificar que la conexión a PostgreSQL está viva"""
    return {"status": "ok", "db_connection": "success"}

@app.post("/api/usuarios/registrar")
async def registrar_usuario(
    nombre: str = Form(...),
    apellido: str = Form(...),
    matricula: str = Form(...),
    tipo: str = Form(...), # Debe ser "alumno" o "profesor"
    foto: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Endpoint para registrar un usuario y guardar su foto de perfil"""
    
    # 1. Validar el tipo de usuario contra el Enum
    try:
        tipo_enum = TipoUsuario(tipo.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Tipo de usuario inválido. Use 'alumno' o 'profesor'.")

    # 2. Construir la ruta y guardar la foto físicamente
    extension = foto.filename.split(".")[-1]
    nombre_archivo = f"{matricula}.{extension}"
    ruta_relativa = f"app/static/perfiles/{nombre_archivo}"
    ruta_bd = f"/static/perfiles/{nombre_archivo}" # Ruta que leerá Angular

    with open(ruta_relativa, "wb") as buffer:
        shutil.copyfileobj(foto.file, buffer)

    # 3. Guardar el registro en PostgreSQL
    nuevo_usuario = Usuario(
        nombre=nombre,
        apellido=apellido,
        matricula_o_num_empleado=matricula,
        tipo=tipo_enum,
        foto_perfil=ruta_bd
        # embedding_facial se queda vacío por ahora, lo generará la IA en el Servidor 1 después
    )

    try:
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return {
            "mensaje": "Usuario registrado con éxito", 
            "usuario_id": nuevo_usuario.id, 
            "foto_url": ruta_bd
        }
    except IntegrityError:
        db.rollback()
        # Si la base de datos rechaza el registro (ej. matrícula duplicada), borramos la foto
        if os.path.exists(ruta_relativa):
            os.remove(ruta_relativa)
        raise HTTPException(status_code=400, detail="La matrícula ya está registrada.")

# ==========================================
# NUEVO: ENDPOINT PARA LA INTELIGENCIA ARTIFICIAL
# ==========================================

# Modelo para recibir el vector matemático desde el Servidor 1
class EmbeddingUpdate(BaseModel):
    vector_facial: List[float]

@app.put("/api/usuarios/{matricula}/embedding")
def actualizar_embedding_facial(
    matricula: str, 
    data: EmbeddingUpdate, 
    db: Session = Depends(get_db)
):
    """Endpoint exclusivo para que el Servidor 1 (IA) guarde la huella matemática"""
    
    # Buscamos al usuario usando su matrícula
    usuario = db.query(Usuario).filter(Usuario.matricula_o_num_empleado == matricula).first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # pgvector se encarga de transformar la lista de Python al formato correcto de la BD
    usuario.embedding_facial = data.vector_facial
    
    try:
        db.commit()
        return {"mensaje": "Huella facial (embedding) guardada con éxito en la base de datos"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar el vector: {str(e)}")