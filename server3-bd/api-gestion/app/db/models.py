from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Date, Time, LargeBinary
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Usuario(Base):
    __tablename__ = 'usuarios'
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    matricula_o_num_empleado = Column(String(50), unique=True, nullable=False)
    tipo = Column(String(20), nullable=False) # 'alumno' o 'profesor'
    email = Column(String(100), unique=True)
    embedding_facial = Column(LargeBinary) # Para almacenar los 512 dims de ArcFace
    foto_perfil = Column(LargeBinary)
    activo = Column(Boolean, default=True)
    fecha_registro = Column(Date)

class Materia(Base):
    __tablename__ = 'materias'
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    clave = Column(String(20), unique=True, nullable=False)

class Grupo(Base):
    __tablename__ = 'grupos'
    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey('materias.id'))
    profesor_id = Column(Integer, ForeignKey('usuarios.id'))
    aula = Column(String(20))
    semestre = Column(String(20))
    periodo = Column(String(20))

class Horario(Base):
    __tablename__ = 'horarios'
    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey('grupos.id'))
    dia_semana = Column(String(15))
    hora_inicio = Column(Time)
    hora_fin = Column(Time)
    tolerancia_minutos = Column(Integer, default=10)

class Inscripcion(Base):
    __tablename__ = 'inscripciones'
    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey('usuarios.id'))
    grupo_id = Column(Integer, ForeignKey('grupos.id'))

class Asistencia(Base):
    __tablename__ = 'asistencia'
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'))
    grupo_id = Column(Integer, ForeignKey('grupos.id'))
    fecha = Column(Date)
    hora_registro = Column(Time)
    tipo_registro = Column(String(20)) # 'entrada' o 'salida'
    tipo_usuario = Column(String(20)) # 'alumno' o 'profesor'
    estado = Column(String(20)) # 'a_tiempo', 'retardo', 'fuera_de_horario'
    dispositivo_id = Column(String(50))

class Emocion(Base):
    __tablename__ = 'emociones'
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'))
    grupo_id = Column(Integer, ForeignKey('grupos.id'))
    fecha = Column(Date)
    hora = Column(Time)
    emocion = Column(String(20)) # 'positivo', 'neutro', 'negativo'
    confianza = Column(Float)
    contexto = Column(String(20)) # 'entrada' o 'salida'