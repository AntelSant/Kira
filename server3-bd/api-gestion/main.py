import os
import shutil
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func as sql_func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta
import bcrypt
from jose import jwt, JWTError, ExpiredSignatureError

from models import (
    Base, Usuario, TipoUsuario, Materia, Grupo, Horario, Inscripcion,
    Asistencia, Emocion, EstadoAsistencia, TipoRegistro, CategoriaEmocion,
    Administrador
)
from database import get_db, engine

# --- Crear tablas al iniciar ---
print("⏳ Verificando y construyendo tablas en la base de datos...")
Base.metadata.create_all(bind=engine)
print("✅ ¡Tablas listas y creadas!")

# --- Crear carpetas necesarias ---
os.makedirs("app/static/perfiles", exist_ok=True)
os.makedirs("app/static/dashboard", exist_ok=True)

# ============================================================
#  CONFIGURACIÓN JWT & BCRYPT
# ============================================================

JWT_SECRET = os.getenv("JWT_SECRET", "kira_secret_2026_cambiar_en_produccion")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 8

http_bearer = HTTPBearer()


def hash_password(password: str) -> str:
    """Genera el hash bcrypt de una contraseña (usa bcrypt directo, sin passlib)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def crear_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión ha expirado. Vuelve a iniciar sesión.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        print(f"❌ JWT inválido: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db)
) -> Administrador:
    """Auth guard — protege cualquier endpoint que lo use como dependencia"""
    payload = verificar_token(credentials.credentials)
    admin_id = payload.get("sub")
    try:
        admin_id = int(admin_id)
    except (TypeError, ValueError):
        admin_id = None
    if admin_id is None:
        raise HTTPException(status_code=401, detail="Token sin identidad")
    admin = db.query(Administrador).filter(
        Administrador.id == admin_id,
        Administrador.activo == True
    ).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Administrador no encontrado o inactivo")
    return admin

# --- App ---
app = FastAPI(
    title="API de Gestión y Asistencia - UAS (Kira)",
    description="Backend central para dashboard, usuarios, asistencia y reportes",
    version="2.0.0"
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Archivos estáticos ---
app.mount("/static", StaticFiles(directory="app/static"), name="static")


# ============================================================
#  DASHBOARD SPA — Servir la interfaz web
# ============================================================

@app.get("/", include_in_schema=False)
@app.get("/dashboard", include_in_schema=False)
def serve_dashboard():
    """Sirve el dashboard SPA"""
    return FileResponse("app/static/dashboard/index.html")


# ============================================================
#  HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Verificar que la conexión a PostgreSQL está viva"""
    return {"status": "ok", "db_connection": "success"}


# ============================================================
#  PYDANTIC SCHEMAS
# ============================================================

class EmbeddingUpdate(BaseModel):
    vector_facial: List[float]

class ReconocerRequest(BaseModel):
    vector_facial: List[float]
    umbral: float = 0.40

class RegistroAsistenciaRequest(BaseModel):
    usuario_id: int
    aula: str
    fecha: str
    hora: str
    emocion: str
    confianza_emocion: float = 0.0

class MateriaCreate(BaseModel):
    nombre: str
    clave: str

class GrupoCreate(BaseModel):
    id: Optional[int] = None
    materia_id: int
    profesor_id: int
    aula: str
    semestre: str
    periodo: str

class HorarioCreate(BaseModel):
    grupo_id: int
    dia_semana: int    # 0=Lunes ... 6=Domingo
    hora_inicio: str   # "HH:MM"
    hora_fin: str      # "HH:MM"
    tolerancia_minutos: int = 10

class InscripcionCreate(BaseModel):
    alumno_id: int
    grupo_id: int

class LoginRequest(BaseModel):
    email: str
    password: str

class AdminCreate(BaseModel):
    nombre: str
    email: str
    password: str


# ============================================================
#  FUNCIONES AUXILIARES
# ============================================================

def calcular_estado(grupo_id: int, fecha_obj: date, hora_registro, db: Session) -> EstadoAsistencia:
    """Calcula si es a_tiempo, retardo o fuera_de_horario según el Horario del grupo"""
    dia_semana = fecha_obj.weekday()  # 0=Lunes ... 6=Domingo
    horario = db.query(Horario).filter(
        Horario.grupo_id == grupo_id,
        Horario.dia_semana == dia_semana
    ).first()

    if not horario:
        return EstadoAsistencia.fuera_de_horario

    limite_a_tiempo = (
        datetime.combine(fecha_obj, horario.hora_inicio)
        + timedelta(minutes=horario.tolerancia_minutos)
    ).time()

    if hora_registro <= limite_a_tiempo:
        return EstadoAsistencia.a_tiempo
    elif hora_registro <= horario.hora_fin:
        return EstadoAsistencia.retardo
    else:
        return EstadoAsistencia.fuera_de_horario


def serializar_usuario(u: Usuario) -> dict:
    """Convierte un ORM Usuario a diccionario serializable"""
    return {
        "id": u.id,
        "nombre": u.nombre,
        "apellido": u.apellido,
        "matricula": u.matricula_o_num_empleado,
        "tipo": u.tipo.value if u.tipo else None,
        "email": u.email,
        "foto_perfil": u.foto_perfil,
        "activo": u.activo,
        "tiene_embedding": u.embedding_facial is not None,
        "fecha_registro": str(u.fecha_registro) if u.fecha_registro else None,
    }


# ============================================================
#  AUTH — LOGIN, ME
# ============================================================

@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Autentica un administrador y devuelve un JWT de sesión (8h)"""
    admin = db.query(Administrador).filter(
        Administrador.email == data.email,
        Administrador.activo == True
    ).first()
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    token = crear_token({"sub": str(admin.id), "nombre": admin.nombre, "email": admin.email})
    return {"access_token": token, "token_type": "bearer", "nombre": admin.nombre}


@app.get("/api/auth/me")
def me(admin: Administrador = Depends(get_current_admin)):
    """Devuelve los datos del administrador autenticado (auth guard)"""
    return {"id": admin.id, "nombre": admin.nombre, "email": admin.email, "activo": admin.activo}


# ============================================================
#  ADMINISTRADORES — CRUD (protegido por auth guard)
# ============================================================

@app.post("/api/admins/primer-admin", status_code=201)
def crear_primer_admin(data: AdminCreate, db: Session = Depends(get_db)):
    """Crea el primer administrador SOLO si la tabla está vacía. No requiere auth."""
    if db.query(Administrador).count() > 0:
        raise HTTPException(
            status_code=403,
            detail="Ya existen administradores. Use el endpoint protegido para crear más."
        )
    nuevo = Administrador(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password)
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Primer administrador creado", "admin_id": nuevo.id}


@app.get("/api/admins")
def listar_admins(
    admin: Administrador = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Lista todos los administradores (requiere sesión activa)"""
    admins = db.query(Administrador).order_by(Administrador.id).all()
    return [
        {"id": a.id, "nombre": a.nombre, "email": a.email, "activo": a.activo,
         "fecha_registro": str(a.created_at.date()) if a.created_at else None}
        for a in admins
    ]


@app.post("/api/admins/registrar", status_code=201)
def registrar_admin(
    data: AdminCreate,
    admin: Administrador = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Registra un nuevo administrador (requiere sesión activa)"""
    nuevo = Administrador(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password)
    )
    try:
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return {"mensaje": "Administrador registrado", "admin_id": nuevo.id}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="El email ya está registrado")


@app.delete("/api/admins/{admin_id}")
def eliminar_admin(
    admin_id: int,
    admin: Administrador = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Elimina un administrador (no puede eliminarse a sí mismo)"""
    if admin_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    objetivo = db.query(Administrador).filter(Administrador.id == admin_id).first()
    if not objetivo:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")
    db.delete(objetivo)
    db.commit()
    return {"mensaje": "Administrador eliminado"}


# ============================================================
#  USUARIOS — CRUD
# ============================================================

@app.get("/api/usuarios")
def listar_usuarios(
    tipo: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista todos los usuarios. Filtro opcional: ?tipo=alumno o ?tipo=profesor"""
    query = db.query(Usuario)
    if tipo:
        try:
            tipo_enum = TipoUsuario(tipo.lower())
            query = query.filter(Usuario.tipo == tipo_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Tipo inválido. Use 'alumno' o 'profesor'.")
    usuarios = query.order_by(Usuario.id).all()
    return [serializar_usuario(u) for u in usuarios]


@app.get("/api/usuarios/{usuario_id}")
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtiene detalle de un usuario por ID"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return serializar_usuario(usuario)


@app.post("/api/usuarios/registrar")
async def registrar_usuario(
    nombre: str = Form(...),
    apellido: str = Form(...),
    matricula: str = Form(...),
    tipo: str = Form(...),
    foto: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Registra un usuario nuevo con foto de perfil"""
    try:
        tipo_enum = TipoUsuario(tipo.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Tipo de usuario inválido. Use 'alumno' o 'profesor'.")

    extension = foto.filename.split(".")[-1]
    nombre_archivo = f"{matricula}.{extension}"
    ruta_relativa = f"app/static/perfiles/{nombre_archivo}"
    ruta_bd = f"/static/perfiles/{nombre_archivo}"

    with open(ruta_relativa, "wb") as buffer:
        shutil.copyfileobj(foto.file, buffer)

    nuevo_usuario = Usuario(
        nombre=nombre,
        apellido=apellido,
        matricula_o_num_empleado=matricula,
        tipo=tipo_enum,
        foto_perfil=ruta_bd
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
        if os.path.exists(ruta_relativa):
            os.remove(ruta_relativa)
        raise HTTPException(status_code=400, detail="La matrícula ya está registrada.")


@app.delete("/api/usuarios/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Elimina un usuario y su foto de perfil"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Borrar foto si existe
    if usuario.foto_perfil:
        ruta_fisica = f"app{usuario.foto_perfil}"
        if os.path.exists(ruta_fisica):
            os.remove(ruta_fisica)

    db.delete(usuario)
    db.commit()
    return {"mensaje": "Usuario eliminado correctamente"}


# ============================================================
#  EMBEDDING FACIAL (IA)
# ============================================================

@app.put("/api/usuarios/{matricula}/embedding")
def actualizar_embedding_facial(
    matricula: str,
    data: EmbeddingUpdate,
    db: Session = Depends(get_db)
):
    """Endpoint para que Server1 (IA) guarde la huella matemática facial"""
    usuario = db.query(Usuario).filter(
        Usuario.matricula_o_num_empleado == matricula
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.embedding_facial = data.vector_facial

    try:
        db.commit()
        return {"mensaje": "Huella facial (embedding) guardada con éxito"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar el vector: {str(e)}")


# ============================================================
#  RECONOCIMIENTO FACIAL (PGVECTOR)
# ============================================================

@app.post("/api/usuarios/reconocer")
def reconocer_usuario(data: ReconocerRequest, db: Session = Depends(get_db)):
    """Busca en PostgreSQL el rostro más parecido usando Distancia Coseno (pgvector)"""

    if len(data.vector_facial) != 512:
        raise HTTPException(status_code=400, detail="El vector debe tener exactamente 512 dimensiones")

    resultado = db.query(
        Usuario,
        Usuario.embedding_facial.cosine_distance(data.vector_facial).label("distancia")
    ).filter(
        Usuario.embedding_facial.isnot(None)
    ).order_by("distancia").first()

    if not resultado:
        return {"encontrado": False, "mensaje": "Base de datos de rostros vacía."}

    usuario, distancia = resultado

    if distancia <= data.umbral:
        return {
            "encontrado": True,
            "distancia": float(distancia),
            "usuario": {
                "id": usuario.id,
                "nombre": usuario.nombre,
                "apellido": usuario.apellido,
                "matricula": usuario.matricula_o_num_empleado,
                "tipo": usuario.tipo.value if usuario.tipo else None
            }
        }
    else:
        return {
            "encontrado": False,
            "distancia": float(distancia),
            "mensaje": "Es un rostro desconocido."
        }


# ============================================================
#  ASISTENCIA — REGISTRO
# ============================================================

@app.post("/api/asistencia/registrar")
def registrar_asistencia(data: RegistroAsistenciaRequest, db: Session = Depends(get_db)):
    """Guarda la asistencia y la emoción detectada. Encuentra el grupo por aula y calcula estado según horario."""
    print(f"📥 Registrando asistencia — Usuario {data.usuario_id}, Aula: {data.aula}")

    # Normalizar emoción
    emocion_limpia = data.emocion.lower().strip()
    try:
        emocion_enum = CategoriaEmocion(emocion_limpia)
    except ValueError:
        print(f"⚠️ Emoción '{emocion_limpia}' no válida, usando neutro")
        emocion_enum = CategoriaEmocion.neutro

    try:
        fecha_obj = datetime.strptime(data.fecha, "%Y-%m-%d").date()
        hora_obj = datetime.strptime(data.hora, "%H:%M:%S").time()

        # --- BUSCAR CLASE ACTIVA SEGÚN AULA ---
        dia_semana = fecha_obj.weekday()
        horarios_hoy = db.query(Horario).join(Grupo).filter(
            Grupo.aula == data.aula,
            Horario.dia_semana == dia_semana
        ).all()

        horario_activo = None
        for h in horarios_hoy:
            dt_inicio = datetime.combine(fecha_obj, h.hora_inicio)
            dt_fin = datetime.combine(fecha_obj, h.hora_fin)
            dt_actual = datetime.combine(fecha_obj, hora_obj)
            
            # Se considera activa desde 30 mins antes del inicio hasta la hora de fin
            if dt_inicio - timedelta(minutes=30) <= dt_actual <= dt_fin:
                horario_activo = h
                break
                
        if not horario_activo:
            print(f"⚠️ No hay clase programada en '{data.aula}' para el día {dia_semana} a las {hora_obj}")
            return {"status": "error", "mensaje": f"No hay clase activa en aula '{data.aula}'"}
            
        grupo_id_activo = horario_activo.grupo_id
        print(f"✅ Clase activa encontrada: Grupo ID {grupo_id_activo}")

        # --- ANTI-DUPLICADOS ---
        existente = db.query(Asistencia).filter(
            Asistencia.usuario_id == data.usuario_id,
            Asistencia.grupo_id == grupo_id_activo,
            Asistencia.fecha == fecha_obj
        ).first()

        if existente:
            print("⚠️ Asistencia ya registrada para hoy")
            return {"status": "ya_registrado", "mensaje": "Asistencia ya registrada hoy para esta clase"}

        # --- CALCULAR ESTADO SEGÚN HORARIO ---
        estado = calcular_estado(grupo_id_activo, fecha_obj, hora_obj, db)

        # Buscar usuario
        usuario = db.query(Usuario).filter(Usuario.id == data.usuario_id).first()
        tipo_usr = usuario.tipo if usuario else TipoUsuario.alumno

        nueva_asistencia = Asistencia(
            usuario_id=data.usuario_id,
            grupo_id=grupo_id_activo,
            fecha=fecha_obj,
            hora_registro=hora_obj,
            tipo_registro=TipoRegistro.entrada,
            tipo_usuario=tipo_usr,
            estado=estado,
            emocion_detectada=emocion_enum
        )

        db.add(nueva_asistencia)
        db.commit()
        db.refresh(nueva_asistencia)

        # Crear detalle de emoción con confianza REAL
        nueva_emocion = Emocion(
            asistencia_id=nueva_asistencia.id,
            usuario_id=data.usuario_id,
            grupo_id=grupo_id_activo,
            fecha=fecha_obj,
            hora=hora_obj,
            emocion=emocion_enum,
            confianza=data.confianza_emocion,
            contexto=TipoRegistro.entrada
        )

        db.add(nueva_emocion)
        db.commit()
        print(f"✅ Asistencia registrada: {estado.value}")
        return {
            "status": "success",
            "mensaje": "Asistencia registrada",
            "estado": estado.value
        }

    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR CRÍTICO EN SERVIDOR 3:\n{str(e)}\n")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/asistencia/{grupo_id}")
def listar_asistencia(
    grupo_id: int,
    fecha: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista registros de asistencia de un grupo. Filtro opcional: ?fecha=2026-03-28"""
    query = db.query(Asistencia).filter(Asistencia.grupo_id == grupo_id)

    if fecha:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").date()
        query = query.filter(Asistencia.fecha == fecha_obj)

    registros = query.order_by(Asistencia.fecha.desc(), Asistencia.hora_registro).all()

    resultado = []
    for r in registros:
        usuario = db.query(Usuario).filter(Usuario.id == r.usuario_id).first()
        resultado.append({
            "id": r.id,
            "usuario_id": r.usuario_id,
            "nombre": f"{usuario.nombre} {usuario.apellido}" if usuario else "Desconocido",
            "matricula": usuario.matricula_o_num_empleado if usuario else "",
            "grupo_id": r.grupo_id,
            "fecha": str(r.fecha),
            "hora_registro": str(r.hora_registro),
            "tipo_registro": r.tipo_registro.value if r.tipo_registro else None,
            "tipo_usuario": r.tipo_usuario.value if r.tipo_usuario else None,
            "estado": r.estado.value if r.estado else None,
            "emocion": r.emocion_detectada.value if r.emocion_detectada else None,
        })

    return resultado


# ============================================================
#  MATERIAS — CRUD
# ============================================================

@app.get("/api/materias")
def listar_materias(db: Session = Depends(get_db)):
    """Lista todas las materias"""
    materias = db.query(Materia).order_by(Materia.id).all()
    return [
        {"id": m.id, "nombre": m.nombre, "clave": m.clave}
        for m in materias
    ]


@app.post("/api/materias/registrar")
def registrar_materia(data: MateriaCreate, db: Session = Depends(get_db)):
    """Registra una nueva materia"""
    nueva_materia = Materia(nombre=data.nombre, clave=data.clave)
    try:
        db.add(nueva_materia)
        db.commit()
        db.refresh(nueva_materia)
        return {"mensaje": "Materia registrada", "materia_id": nueva_materia.id}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="La clave de la materia ya existe")


# ============================================================
#  GRUPOS — CRUD
# ============================================================

@app.get("/api/grupos")
def listar_grupos(db: Session = Depends(get_db)):
    """Lista todos los grupos con nombre de materia y profesor"""
    grupos = db.query(Grupo).order_by(Grupo.id).all()
    resultado = []
    for g in grupos:
        materia = db.query(Materia).filter(Materia.id == g.materia_id).first()
        profesor = db.query(Usuario).filter(Usuario.id == g.profesor_id).first()
        num_alumnos = db.query(Inscripcion).filter(Inscripcion.grupo_id == g.id).count()
        resultado.append({
            "id": g.id,
            "materia_id": g.materia_id,
            "materia_nombre": materia.nombre if materia else "Sin materia",
            "profesor_id": g.profesor_id,
            "profesor_nombre": f"{profesor.nombre} {profesor.apellido}" if profesor else "Sin profesor",
            "aula": g.aula,
            "semestre": g.semestre,
            "periodo": g.periodo,
            "num_alumnos": num_alumnos,
        })
    return resultado


@app.post("/api/grupos/registrar")
def registrar_grupo(data: GrupoCreate, db: Session = Depends(get_db)):
    """Registra un nuevo grupo"""
    kwargs = {
        "materia_id": data.materia_id,
        "profesor_id": data.profesor_id,
        "aula": data.aula,
        "semestre": data.semestre,
        "periodo": data.periodo,
    }
    if data.id is not None:
        kwargs["id"] = data.id

    nuevo_grupo = Grupo(**kwargs)
    try:
        db.add(nuevo_grupo)
        db.commit()
        db.refresh(nuevo_grupo)
        return {"mensaje": "Grupo registrado", "grupo_id": nuevo_grupo.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear grupo: {str(e)}")


@app.get("/api/grupos/{grupo_id}/alumnos")
def listar_alumnos_grupo(grupo_id: int, db: Session = Depends(get_db)):
    """Lista los alumnos inscritos en un grupo"""
    inscripciones = db.query(Inscripcion).filter(Inscripcion.grupo_id == grupo_id).all()
    alumnos = []
    for ins in inscripciones:
        alumno = db.query(Usuario).filter(Usuario.id == ins.alumno_id).first()
        if alumno:
            alumnos.append(serializar_usuario(alumno))
    return alumnos


# ============================================================
#  HORARIOS — CRUD
# ============================================================

DIAS_SEMANA = {0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"}

@app.get("/api/horarios/{grupo_id}")
def listar_horarios(grupo_id: int, db: Session = Depends(get_db)):
    """Lista horarios de un grupo"""
    horarios = db.query(Horario).filter(Horario.grupo_id == grupo_id).order_by(Horario.dia_semana).all()
    return [
        {
            "id": h.id,
            "grupo_id": h.grupo_id,
            "dia_semana": h.dia_semana,
            "dia_nombre": DIAS_SEMANA.get(h.dia_semana, "?"),
            "hora_inicio": str(h.hora_inicio),
            "hora_fin": str(h.hora_fin),
            "tolerancia_minutos": h.tolerancia_minutos,
        }
        for h in horarios
    ]


@app.post("/api/horarios/registrar")
def registrar_horario(data: HorarioCreate, db: Session = Depends(get_db)):
    """Crea un horario para un grupo"""
    if data.dia_semana < 0 or data.dia_semana > 6:
        raise HTTPException(status_code=400, detail="dia_semana debe estar entre 0 (Lunes) y 6 (Domingo)")

    try:
        hora_inicio = datetime.strptime(data.hora_inicio, "%H:%M").time()
        hora_fin = datetime.strptime(data.hora_fin, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de hora inválido. Use HH:MM")

    nuevo_horario = Horario(
        grupo_id=data.grupo_id,
        dia_semana=data.dia_semana,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        tolerancia_minutos=data.tolerancia_minutos
    )

    try:
        db.add(nuevo_horario)
        db.commit()
        db.refresh(nuevo_horario)
        return {"mensaje": "Horario registrado", "horario_id": nuevo_horario.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


@app.delete("/api/horarios/{horario_id}")
def eliminar_horario(horario_id: int, db: Session = Depends(get_db)):
    """Elimina un horario"""
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    db.delete(horario)
    db.commit()
    return {"mensaje": "Horario eliminado"}


# ============================================================
#  INSCRIPCIONES — CRUD
# ============================================================

@app.get("/api/inscripciones/{grupo_id}")
def listar_inscripciones(grupo_id: int, db: Session = Depends(get_db)):
    """Lista inscripciones de un grupo con datos del alumno"""
    inscripciones = db.query(Inscripcion).filter(Inscripcion.grupo_id == grupo_id).all()
    resultado = []
    for ins in inscripciones:
        alumno = db.query(Usuario).filter(Usuario.id == ins.alumno_id).first()
        resultado.append({
            "inscripcion_id": ins.id,
            "alumno_id": ins.alumno_id,
            "nombre": f"{alumno.nombre} {alumno.apellido}" if alumno else "Desconocido",
            "matricula": alumno.matricula_o_num_empleado if alumno else "",
            "grupo_id": ins.grupo_id,
        })
    return resultado


@app.post("/api/inscripciones/registrar")
def registrar_inscripcion(data: InscripcionCreate, db: Session = Depends(get_db)):
    """Inscribe un alumno en un grupo"""
    nueva = Inscripcion(alumno_id=data.alumno_id, grupo_id=data.grupo_id)
    try:
        db.add(nueva)
        db.commit()
        db.refresh(nueva)
        return {"mensaje": "Inscripción registrada", "inscripcion_id": nueva.id}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="El alumno ya está inscrito en este grupo")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


@app.delete("/api/inscripciones/{inscripcion_id}")
def eliminar_inscripcion(inscripcion_id: int, db: Session = Depends(get_db)):
    """Elimina una inscripción"""
    ins = db.query(Inscripcion).filter(Inscripcion.id == inscripcion_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    db.delete(ins)
    db.commit()
    return {"mensaje": "Inscripción eliminada"}


# ============================================================
#  DASHBOARD — ENDPOINTS DE DATOS AGREGADOS
# ============================================================

@app.get("/api/dashboard/resumen")
def dashboard_resumen(db: Session = Depends(get_db)):
    """Datos resumidos para las tarjetas del dashboard"""
    total_alumnos = db.query(Usuario).filter(Usuario.tipo == TipoUsuario.alumno).count()
    total_profesores = db.query(Usuario).filter(Usuario.tipo == TipoUsuario.profesor).count()
    total_grupos = db.query(Grupo).count()
    total_materias = db.query(Materia).count()

    hoy = date.today()
    asistencias_hoy = db.query(Asistencia).filter(Asistencia.fecha == hoy).count()

    embeddings_registrados = db.query(Usuario).filter(
        Usuario.embedding_facial.isnot(None)
    ).count()

    return {
        "total_alumnos": total_alumnos,
        "total_profesores": total_profesores,
        "total_grupos": total_grupos,
        "total_materias": total_materias,
        "asistencias_hoy": asistencias_hoy,
        "embeddings_registrados": embeddings_registrados,
    }


@app.get("/api/dashboard/emociones")
def dashboard_emociones(
    dias: int = 7,
    db: Session = Depends(get_db)
):
    """Distribución de emociones de los últimos N días (para gráfica de dona)"""
    desde = date.today() - timedelta(days=dias)
    registros = db.query(
        Asistencia.emocion_detectada,
        sql_func.count(Asistencia.id)
    ).filter(
        Asistencia.fecha >= desde,
        Asistencia.emocion_detectada.isnot(None)
    ).group_by(Asistencia.emocion_detectada).all()

    return {
        "periodo_dias": dias,
        "datos": [
            {"emocion": r[0].value if r[0] else "desconocido", "cantidad": r[1]}
            for r in registros
        ]
    }


@app.get("/api/dashboard/asistencia-semanal")
def dashboard_asistencia_semanal(db: Session = Depends(get_db)):
    """Asistencias por día de los últimos 7 días (para gráfica de barras)"""
    hoy = date.today()
    datos = []
    dias_es = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    for i in range(6, -1, -1):
        dia = hoy - timedelta(days=i)
        count = db.query(Asistencia).filter(Asistencia.fecha == dia).count()
        datos.append({
            "fecha": str(dia),
            "dia": dias_es[dia.weekday()],
            "cantidad": count
        })

    return datos


@app.get("/api/dashboard/emociones-tendencia")
def dashboard_emociones_tendencia(
    dias: int = 30,
    grupo_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Tendencia de emociones día a día para gráfica de líneas"""
    desde = date.today() - timedelta(days=dias)
    query = db.query(
        Asistencia.fecha,
        Asistencia.emocion_detectada,
        sql_func.count(Asistencia.id)
    ).filter(
        Asistencia.fecha >= desde,
        Asistencia.emocion_detectada.isnot(None)
    )

    if grupo_id:
        query = query.filter(Asistencia.grupo_id == grupo_id)

    registros = query.group_by(
        Asistencia.fecha, Asistencia.emocion_detectada
    ).order_by(Asistencia.fecha).all()

    # Agrupar por fecha
    por_fecha = {}
    for fecha, emocion, cantidad in registros:
        key = str(fecha)
        if key not in por_fecha:
            por_fecha[key] = {"fecha": key, "positivo": 0, "neutro": 0, "negativo": 0}
        if emocion:
            por_fecha[key][emocion.value] = cantidad

    return list(por_fecha.values())