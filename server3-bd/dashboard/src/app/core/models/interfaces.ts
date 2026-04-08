/* ============================================================
   KIRA UAS — TypeScript Interfaces
   ============================================================ */

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  matricula: string;
  tipo: 'alumno' | 'profesor';
  foto_perfil?: string;
  tiene_embedding: boolean;
}

export interface Materia {
  id: number;
  nombre: string;
  clave: string;
}

export interface Grupo {
  id: number;
  materia_id: number;
  materia_nombre: string;
  profesor_id: number;
  profesor_nombre: string;
  aula: string;
  semestre: string;
  periodo: string;
  num_alumnos: number;
}

export interface Horario {
  id: number;
  grupo_id: number;
  dia_semana: number;
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  tolerancia_minutos: number;
}

export interface Inscripcion {
  inscripcion_id: number;
  alumno_id: number;
  nombre: string;
  matricula: string;
}

export interface RegistroAsistencia {
  nombre: string;
  matricula: string;
  fecha: string;
  hora_registro: string;
  estado: 'a_tiempo' | 'retardo' | 'fuera_de_horario';
  emocion: string;
}

export interface Admin {
  id: number;
  nombre: string;
  email: string;
  fecha_registro?: string;
}

export interface DashboardResumen {
  total_alumnos: number;
  total_profesores: number;
  total_grupos: number;
  total_materias: number;
  embeddings_registrados: number;
  asistencias_hoy: number;
}

export interface AsistenciaSemanal {
  dia: string;
  cantidad: number;
}

export interface EmocionesDato {
  emocion: string;
  cantidad: number;
}

export interface EmocionesTendencia {
  fecha: string;
  positivo: number;
  neutro: number;
  negativo: number;
}

export interface LoginResponse {
  access_token: string;
  nombre: string;
}
