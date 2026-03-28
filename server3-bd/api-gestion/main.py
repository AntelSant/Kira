import os
import shutil
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import List
from datetime import datetime
from models import (
    Base, Usuario, TipoUsuario, Materia, Grupo,
    Asistencia, Emocion, EstadoAsistencia, TipoRegistro, CategoriaEmocion
)

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
# ENDPOINT PARA GUARDAR LA HUELLA FACIAL (IA)
# ==========================================

class EmbeddingUpdate(BaseModel):
    vector_facial: List[float]

@app.put("/api/usuarios/{matricula}/embedding")
def actualizar_embedding_facial(
    matricula: str, 
    data: EmbeddingUpdate, 
    db: Session = Depends(get_db)
):
    """Endpoint exclusivo para que el Servidor 1 (IA) guarde la huella matemática"""
    
    usuario = db.query(Usuario).filter(Usuario.matricula_o_num_empleado == matricula).first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.embedding_facial = data.vector_facial
    
    try:
        db.commit()
        return {"mensaje": "Huella facial (embedding) guardada con éxito en la base de datos"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar el vector: {str(e)}")

# ==========================================
# NUEVO: ENDPOINT PARA BUSCAR Y RECONOCER
# ==========================================

class ReconocerRequest(BaseModel):
    vector_facial: List[float]
    umbral: float = 0.40  # Tolerancia (Menos de 0.40 es la misma persona)

@app.post("/api/usuarios/reconocer")
def reconocer_usuario(data: ReconocerRequest, db: Session = Depends(get_db)):
    """Busca en PostgreSQL el rostro más parecido al vector recibido usando Distancia Coseno"""
    
    # 1. Validar que la IA mandó exactamente 512 números
    if len(data.vector_facial) != 512:
        raise HTTPException(status_code=400, detail="El vector debe tener exactamente 512 dimensiones")

    # 2. La magia de PGVECTOR: Buscar al usuario más parecido
    resultado = db.query(
        Usuario,
        Usuario.embedding_facial.cosine_distance(data.vector_facial).label("distancia")
    ).filter(Usuario.embedding_facial.isnot(None))\
     .order_by("distancia").first()

    # 3. Si la base de datos está vacía de rostros
    if not resultado:
        return {"encontrado": False, "mensaje": "Base de datos de rostros vacía."}

    usuario, distancia = resultado

    # 4. Verificamos si la distancia matemática es menor al umbral de seguridad
    if distancia <= data.umbral:
        return {
            "encontrado": True,
            "distancia": float(distancia),
            "usuario": {
                "id": usuario.id,
                "nombre": usuario.nombre,
                "apellido": usuario.apellido,
                "matricula": usuario.matricula_o_num_empleado
            }
        }
    else:
        # Se parece a alguien, pero la distancia es muy grande (es un desconocido)
        return {
            "encontrado": False,
            "distancia": float(distancia),
            "mensaje": "Es un rostro desconocido."
        }
    
# ==========================================
# NUEVO: ENDPOINT PARA GUARDAR LA ASISTENCIA Y EMOCIÓN
# ==========================================

class RegistroAsistenciaRequest(BaseModel):
    usuario_id: int
    grupo_id: int
    fecha: str
    hora: str
    emocion: str  

@app.post("/api/asistencia/registrar")
def registrar_asistencia(data: RegistroAsistenciaRequest, db: Session = Depends(get_db)):
    """Guarda la asistencia y la emoción detectada al mismo tiempo"""
    print(f"📥 Intentando registrar asistencia para Usuario ID: {data.usuario_id} en Grupo: {data.grupo_id}")
    
    # 1. Normalizar emoción para el Enum
    emocion_limpia = data.emocion.lower().strip()
    try:
        emocion_enum = CategoriaEmocion(emocion_limpia)
    except ValueError:
        print(f"⚠️ Emoción '{emocion_limpia}' no válida, usando neutro")
        emocion_enum = CategoriaEmocion.neutro

    try:
        # Convertir strings a objetos Python
        fecha_obj = datetime.strptime(data.fecha, "%Y-%m-%d").date()
        hora_obj = datetime.strptime(data.hora, "%H:%M:%S").time()

        # 2. Crear Asistencia
        nueva_asistencia = Asistencia(
            usuario_id=data.usuario_id,
            grupo_id=data.grupo_id,
            fecha=fecha_obj,
            hora_registro=hora_obj,
            tipo_registro=TipoRegistro.entrada, 
            tipo_usuario=TipoUsuario.alumno, # Ajustar si es necesario
            estado=EstadoAsistencia.a_tiempo,   
            emocion_detectada=emocion_enum
        )
        
        db.add(nueva_asistencia)
        db.commit()
        db.refresh(nueva_asistencia)

        # 3. Crear Detalle de Emoción
        nueva_emocion = Emocion(
            asistencia_id=nueva_asistencia.id,
            usuario_id=data.usuario_id,
            grupo_id=data.grupo_id,
            fecha=fecha_obj,
            hora=hora_obj,
            emocion=emocion_enum,
            confianza=0.95,
            contexto=TipoRegistro.entrada
        )
        
        db.add(nueva_emocion)
        db.commit()
        print("✅ Registro exitoso en PostgreSQL")
        return {"status": "success", "mensaje": "Asistencia registrada"}
    
    except Exception as e:
        db.rollback()
        # --- EL CHISMOSO ---
        print("\n❌ ERROR CRÍTICO EN SERVIDOR 3:")
        print(str(e))
        print("----------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))
    
    # ==========================================
# ENDPOINTS DE GESTIÓN (MATERIAS Y GRUPOS)
# ==========================================

class MateriaCreate(BaseModel):
    nombre: str
    clave: str

class GrupoCreate(BaseModel):
    id: int  # Lo pedimos explícitamente para poder forzar el ID 5
    materia_id: int
    profesor_id: int
    aula: str
    semestre: str
    periodo: str

@app.post("/api/materias/registrar")
def registrar_materia(data: MateriaCreate, db: Session = Depends(get_db)):
    """Registra una nueva materia en el sistema"""
    nueva_materia = Materia(nombre=data.nombre, clave=data.clave)
    try:
        db.add(nueva_materia)
        db.commit()
        db.refresh(nueva_materia)
        return {"mensaje": "Materia registrada", "materia_id": nueva_materia.id}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="La clave de la materia ya existe")

@app.post("/api/grupos/registrar")
def registrar_grupo(data: GrupoCreate, db: Session = Depends(get_db)):
    """Registra un nuevo grupo (Permite forzar el ID para compatibilidad con el ESP32)"""
    nuevo_grupo = Grupo(
        id=data.id, # Forzamos el ID 5 aquí
        materia_id=data.materia_id,
        profesor_id=data.profesor_id,
        aula=data.aula,
        semestre=data.semestre,
        periodo=data.periodo
    )
    try:
        db.add(nuevo_grupo)
        db.commit()
        db.refresh(nuevo_grupo)
        return {"mensaje": "Grupo registrado", "grupo_id": nuevo_grupo.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear grupo: {str(e)}")