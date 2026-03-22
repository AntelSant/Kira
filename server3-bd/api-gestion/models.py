import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Date, Time, LargeBinary, DateTime, Enum, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base, relationship

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

class CategoriaEmocion(enum.Enum):
    positivo = "positivo"
    neutro = "neutro"
    negativo = "negativo"

# ==========================================
# 2. MIXIN DE TIMESTAMPS
# ==========================================
class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# ==========================================
# 3. TABLAS (Modelos)
# ==========================================
class Usuario(Base, TimestampMixin):
    __tablename__ = 'usuarios'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    matricula_o_num_empleado = Column(String(50), unique=True, index=True, nullable=False)
    tipo = Column(Enum(TipoUsuario), nullable=False)
    email = Column(String(100), unique=True)
    
    # El vector matemático se queda en binario, la foto se cambia a String (ruta del archivo)
    embedding_facial = Column(LargeBinary)
    foto_perfil = Column(String(255)) 
    
    activo = Column(Boolean, default=True)
    fecha_registro = Column(Date, default=func.current_date())

    grupos_impartidos = relationship("Grupo", back_populates="profesor", cascade="all, delete-orphan")
    inscripciones = relationship("Inscripcion", back_populates="alumno", cascade="all, delete-orphan")
    asistencias = relationship("Asistencia", back_populates="usuario", cascade="all, delete-orphan")
    emociones = relationship("Emocion", back_populates="usuario", cascade="all, delete-orphan")

class Materia(Base, TimestampMixin):
    __tablename__ = 'materias'
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    clave = Column(String(20), unique=True, index=True, nullable=False)

    grupos = relationship("Grupo", back_populates="materia", cascade="all, delete-orphan")

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
    asistencias = relationship("Asistencia", back_populates="grupo", cascade="all, delete-orphan")
    emociones = relationship("Emocion", back_populates="grupo", cascade="all, delete-orphan")

class Horario(Base, TimestampMixin):
    __tablename__ = 'horarios'
    
    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)
    
    # Restricción: El día solo puede ser del 0 (Lunes) al 6 (Domingo)
    dia_semana = Column(Integer, CheckConstraint('dia_semana >= 0 AND dia_semana <= 6', name='check_dia_semana'), nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    tolerancia_minutos = Column(Integer, default=10)

    grupo = relationship("Grupo", back_populates="horarios")

class Inscripcion(Base, TimestampMixin):
    __tablename__ = 'inscripciones'
    
    # Restricción: Un alumno no puede estar inscrito dos veces en el mismo grupo
    __table_args__ = (UniqueConstraint('alumno_id', 'grupo_id', name='_alumno_grupo_uc'),)
    
    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)

    alumno = relationship("Usuario", back_populates="inscripciones")
    grupo = relationship("Grupo", back_populates="inscripciones")

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

    usuario = relationship("Usuario", back_populates="asistencias")
    grupo = relationship("Grupo", back_populates="asistencias")

class Emocion(Base, TimestampMixin):
    __tablename__ = 'emociones'
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id', ondelete='CASCADE'), index=True)
    fecha = Column(Date, index=True)
    hora = Column(Time)
    emocion = Column(Enum(CategoriaEmocion))
    confianza = Column(Float)
    contexto = Column(Enum(TipoRegistro))

    usuario = relationship("Usuario", back_populates="emociones")
    grupo = relationship("Grupo", back_populates="emociones")