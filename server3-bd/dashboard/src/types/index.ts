export type RolUsuario = 'admin' | 'profesor' | 'alumno';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  matricula: string;
  tipo: RolUsuario;
  email?: string;
  foto_perfil?: string;
  tiene_embedding?: boolean;
  activo: boolean;
}

export interface Materia {
  id: number;
  nombre: string;
  clave: string;
}

export interface Grupo {
  id: number;
  materia_nombre: string;
  materia_clave?: string;
  profesor_nombre: string;
  aula: string;
  semestre: string;
  periodo: string;
  num_alumnos: number;
  materia_id?: number;
  profesor_id?: number;
}

export interface Horario {
  id: number;
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  tolerancia_minutos: number;
  dia_semana?: number;
}

export interface Asistencia {
  id: number;
  alumno_nombre: string;
  matricula: string;
  fecha: string;
  hora_llegada: string;
  estado: string;
  emocion?: string;
}

export interface ClaseAlumno {
  grupo_id: number;
  materia_nombre: string;
  profesor_nombre: string;
  aula: string;
  horarios: Horario[];
}
