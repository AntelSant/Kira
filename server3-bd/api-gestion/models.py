import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Date, Time, DateTime, Enum, CheckConstraint, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base, relationship
from pgvector.sqlalchemy import Vector
from sqlalchemy import LargeBinary

Base = declarative_base()

# ==========================================
# 1. DEFINICIÓN DE ENUMS
# ==========================================
class TipoUsuario(enum.Enum):
    alumno = "alumno"
    profesor = "profesor"

class TipoRegistro(enum.Enum):
    entrada = "entrada"
    salida = "salida"

class EstadoAsistencia(enum.Enum):
    a_tiempo = "a_tiempo"
    retardo = "retardo"
    fuera_de_horario = "fuera_de_horario"
    ausente = "ausente"
    justificado = "justificado"

class CategoriaEmocion(enum.Enum):
    positivo = "positivo"
    neutro = "neutro"
    negativo = "negativo"

class EstadoAlerta(enum.Enum):
    activa = "activa"
    revisada = "revisada"
    resuelta = "resuelta"

# ==========================================
# 2. MIXIN DE TIMESTAMPS
# ==========================================
class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# ==========================================
# 3. TABLAS (Modelos)
# ==========================================

class DiaExcluido(Base):
    __tablename__ = 'dias_excluidos'
    __table_args__ = (UniqueConstraint('grupo_id', 'fecha', name='_grupo_fecha_excluido_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True, nullable=False)
    fecha = Column(Date, index=True, nullable=False)

    grupo = relationship("Grupo")

class Usuario(Base, TimestampMixin):
    __tablename__ = 'usuarios'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    matricula_o_num_empleado = Column(String(50), unique=True, index=True, nullable=False)
    tipo = Column(Enum(TipoUsuario), nullable=False)
    email = Column(String(100), unique=True)
    password_hash = Column(String(255), nullable=True)
    
    # Embedding facial cifrado con AES-256-GCM (dato biométrico protegido)
    embedding_cifrado = Column(LargeBinary, nullable=True)
    foto_perfil = Column(String(255)) 
    
    activo = Column(Boolean, default=True)
    fecha_registro = Column(Date, default=func.current_date())

    grupos_impartidos = relationship("Grupo", back_populates="profesor")
    inscripciones = relationship("Inscripcion", back_populates="alumno")
    asistencias = relationship("Asistencia", back_populates="usuario")
    emociones = relationship("Emocion", back_populates="usuario")

class Administrador(Base, TimestampMixin):
    """Tabla independiente para los administradores del dashboard"""
    __tablename__ = 'administradores'

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)
    # asistencias = relationship("Asistencia", back_populates="usuario")
    # emociones = relationship("Emocion", back_populates="usuario")

class Materia(Base, TimestampMixin):
    __tablename__ = 'materias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    clave = Column(String(20), unique=True, index=True, nullable=False)

    grupos = relationship("Grupo", back_populates="materia")

class Grupo(Base, TimestampMixin):
    __tablename__ = 'grupos'
    
    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey('materias.id', ondelete='CASCADE'), index=True)
    profesor_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    aula = Column(String(20))
    semestre = Column(String(20))
    periodo = Column(String(20))

    materia = relationship("Materia", back_populates="grupos")
    profesor = relationship("Usuario", back_populates="grupos_impartidos")
    horarios = relationship("Horario", back_populates="grupo", cascade="all, delete-orphan")
    inscripciones = relationship("Inscripcion", back_populates="grupo", cascade="all, delete-orphan")
    asistencias = relationship("Asistencia", back_populates="grupo")
    emociones = relationship("Emocion", back_populates="grupo")

class Horario(Base, TimestampMixin):
    __tablename__ = 'horarios'
    
    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)
    dia_semana = Column(Integer, CheckConstraint('dia_semana >= 0 AND dia_semana <= 6'), nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    tolerancia_minutos = Column(Integer, default=10)

    grupo = relationship("Grupo", back_populates="horarios")
    inscripciones = relationship("Inscripcion", back_populates="horario", cascade="all, delete-orphan")

class Inscripcion(Base, TimestampMixin):
    __tablename__ = 'inscripciones'
    __table_args__ = (UniqueConstraint('alumno_id', 'horario_id', name='_alumno_horario_uc'),)
    
    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)
    horario_id = Column(Integer, ForeignKey('horarios.id', ondelete='CASCADE'), index=True, nullable=False)

    alumno = relationship("Usuario", back_populates="inscripciones")
    grupo = relationship("Grupo", back_populates="inscripciones")
    horario = relationship("Horario", back_populates="inscripciones")

class Asistencia(Base, TimestampMixin):
    __tablename__ = 'asistencia'
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)
    fecha = Column(Date, index=True)
    hora_registro = Column(Time)
    tipo_registro = Column(Enum(TipoRegistro)) 
    tipo_usuario = Column(Enum(TipoUsuario))
    estado = Column(Enum(EstadoAsistencia))
    dispositivo_id = Column(String(50))
    
    # --- NUEVO CAMPO ---
    emocion_detectada = Column(Enum(CategoriaEmocion), nullable=True)

    usuario = relationship("Usuario", back_populates="asistencias")
    grupo = relationship("Grupo", back_populates="asistencias")
    # Relación para conectar con la tabla detallada de emociones si es necesario
    detalle_emocion = relationship("Emocion", back_populates="asistencia_rel", uselist=False)

class Emocion(Base, TimestampMixin):
    __tablename__ = 'emociones'
    
    id = Column(Integer, primary_key=True, index=True)
    # Vinculamos opcionalmente a un registro de asistencia específico
    asistencia_id = Column(Integer, ForeignKey('asistencia.id', ondelete='CASCADE'), nullable=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)
    fecha = Column(Date, index=True)
    hora = Column(Time)
    emocion = Column(Enum(CategoriaEmocion))
    confianza = Column(Float)
    contexto = Column(Enum(TipoRegistro))

    asistencia_rel = relationship("Asistencia", back_populates="detalle_emocion")
    usuario = relationship("Usuario", back_populates="emociones")
    grupo = relationship("Grupo", back_populates="emociones")

class AlertaDesercion(Base, TimestampMixin):
    __tablename__ = 'alertas_desercion'
    __table_args__ = (
        UniqueConstraint('alumno_id', 'grupo_id', 'estado',
                         name='_alerta_activa_uc'),
    )

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)
    faltas_consecutivas = Column(Integer, nullable=False)
    ultima_emocion = Column(Enum(CategoriaEmocion), nullable=True)
    estado = Column(Enum(EstadoAlerta), default=EstadoAlerta.activa)
    correo_enviado = Column(Boolean, default=False)
    fecha_deteccion = Column(Date, nullable=False)
    notas = Column(String(500), nullable=True)

    alumno = relationship("Usuario")
    grupo = relationship("Grupo")