import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo, Usuario } from '../../types';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

interface HorarioInfo {
  id: number;
  dia_nombre: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  alumno_inscrito?: boolean;
  inscripcion_id?: number;
}

interface HorarioDisponble {
  dia?: string;
  dia_nombre?: string;
  hora_inicio: string;
  hora_fin: string;
  inscripcion_id?: number;
}

interface ClaseAsignada extends Grupo {
  inscripcion_id: number;
  materia_clave: string;
  periodo: string;
  num_alumnos: number;
  horarios: HorarioDisponble[];
}

interface GrupoConHorarios extends Grupo {
  horarios: HorarioInfo[];
}

export const InscripcionesPage: React.FC = () => {
  const [alumnos, setAlumnos] = useState<Usuario[]>([]);
  const [alumnoId, setAlumnoId] = useState<string>('');

  const [gruposDisponibles, setGruposDisponibles] = useState<GrupoConHorarios[]>([]);
  const [selectedHorario, setSelectedHorario] = useState<{ grupoId: number; horarioId: number } | null>(null);
  const [clasesActuales, setClasesActuales] = useState<ClaseAsignada[]>([]);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    authFetch('/usuarios?tipo=alumno').then(res => res.json()).then(setAlumnos).catch(console.error);
  }, []);

  useEffect(() => {
    if (alumnoId) {
      authFetch(`/grupos/con-horarios?alumno_id=${alumnoId}`)
        .then(res => res.json())
        .then(setGruposDisponibles)
        .catch(console.error);
    } else {
      authFetch('/grupos/con-horarios')
        .then(res => res.json())
        .then(setGruposDisponibles)
        .catch(console.error);
    }
  }, [alumnoId]);

  const fetchInscripciones = async (aid: string) => {
    if (!aid) {
      setClasesActuales([]);
      return;
    }
    setLoading(true);
    try {
      const data = await authFetch(`/inscripciones/alumno/${aid}`).then(res => res.json());
      setClasesActuales(data);
    } catch (error) {
      console.error(error);
      showAlert('Error al cargar clases del alumno', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInscripciones(alumnoId);
  }, [alumnoId]);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleInscribir = async (grupoId: number, horarioId: number) => {
    if (!alumnoId) return;
    setLoading(true);
    try {
      const res = await authFetch('/inscripciones/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: parseInt(alumnoId),
          grupo_id: grupoId,
          horario_id: horarioId
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('Inscripción exitosa', 'success');
        setSelectedHorario(null);
        fetchInscripciones(alumnoId);
        const gruposRes = await authFetch(`/grupos/con-horarios?alumno_id=${alumnoId}`).then(r => r.json());
        setGruposDisponibles(gruposRes);
      } else {
        showAlert(data.detail || 'Error en inscripción', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDesinscribir = async (inscripcionId: number) => {
    if (!confirm('¿Seguro que deseas dar de baja al alumno de este grupo?')) return;
    try {
      const res = await authFetch(`/inscripciones/${inscripcionId}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Baja exitosa', 'success');
        fetchInscripciones(alumnoId);
        const gruposRes = await authFetch(`/grupos/con-horarios?alumno_id=${alumnoId}`).then(r => r.json());
        setGruposDisponibles(gruposRes);
      } else {
        showAlert('Error al dar de baja', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Inscripciones</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <div className="toolbar">
        <select
          className="form-control"
          value={alumnoId}
          onChange={(e) => setAlumnoId(e.target.value)}
        >
          <option value="">Selecciona un alumno...</option>
          {alumnos.map(a => (
            <option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.matricula})</option>
          ))}
        </select>
      </div>

      {alumnoId && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Clases Actuales</h2>
          {loading ? (
            <p>Cargando clases...</p>
          ) : clasesActuales.length === 0 ? (
            <div className="empty-state"><p>El alumno no está inscrito en ninguna clase.</p></div>
          ) : (
            <div className="inscripciones-grid">
              {clasesActuales.map(clase => (
                <div key={`inscripcion-${clase.inscripcion_id}`} className="inscripcion-card">
                  <div className="inscripcion-card-body">
                    <div className="inscripcion-curso">
                      {clase.materia_nombre}
                      <span className="inscripcion-clave">{clase.materia_clave}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span><strong>Profesor:</strong> {clase.profesor_nombre}</span>
                        <span><strong>Semestre:</strong> {clase.semestre}</span>
                        <span><strong>Aula:</strong> {clase.aula}</span>
                      </div>
                    {clase.horarios && clase.horarios.length > 0 && (
                      <div className="inscripcion-horarios">
                        {clase.horarios.map((h, i) => (
                          <div key={i} className="horario-tag-wrapper">
                            <span className="horario-tag">{h.dia_nombre || h.dia} {h.hora_inicio?.slice(0, 5)}-{h.hora_fin?.slice(0, 5)}</span>
                            {h.inscripcion_id && (
                              <button
                                className="btn-icon inscripcion-remove-sm"
                                style={{ background: 'none', border: 'none', padding: '2px' }}
                                onClick={() => handleDesinscribir(h.inscripcion_id!)}
                                title="Dar de baja"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="inscripcion-card-footer">
                    <span className="badge-inscritos">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                      Completamente inscrito
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Clases Disponibles</h2>
          <div className="clases-grid">
            {gruposDisponibles.map(grupo => {
              const isSelected = selectedHorario?.grupoId === grupo.id;
              return (
                <div key={`disp-${grupo.id}`} className={`inscripcion-card${isSelected ? ' inscripcion-card--seleccionado' : ' inscripcion-card--disponible'}`}>
                  <div className="inscripcion-card-body">
                    <div className="inscripcion-curso">
                      {grupo.materia_nombre}
                      {grupo.materia_clave && <span className="inscripcion-clave">{grupo.materia_clave}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span><strong>Profesor:</strong> {grupo.profesor_nombre}</span>
                        <span><strong>Semestre:</strong> {grupo.semestre}</span>
                        <span><strong>Aula:</strong> {grupo.aula}</span>
                      </div>
                    {grupo.horarios && grupo.horarios.length > 0 && (
                      <div className="inscripcion-horarios">
                        {grupo.horarios.map(h => (
                          <div key={h.id} className="horario-tag-wrapper" style={{ background: h.alumno_inscrito ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)', border: h.alumno_inscrito ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-subtle)' }}>
                            <span className="horario-tag" style={{ color: h.alumno_inscrito ? 'var(--success)' : 'var(--accent)' }}>
                              {h.dia_nombre} {h.hora_inicio?.slice(0, 5)}-{h.hora_fin?.slice(0, 5)}
                              {h.alumno_inscrito && ' · Ya inscrito'}
                            </span>
                            {!h.alumno_inscrito && (
                              <button
                                className="inscripcion-select-sm"
                                onClick={() => setSelectedHorario({ grupoId: grupo.id, horarioId: h.id })}
                                title="Seleccionar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="inscripcion-card-action">
                      {selectedHorario?.grupoId === grupo.id ? (
                        selectedHorario && grupo.horarios?.find(h => h.id === selectedHorario.horarioId)?.alumno_inscrito ? (
                          <Button variant="success" block disabled>Ya inscrito en este horario</Button>
                        ) : (
                          <Button variant="primary" block onClick={() => handleInscribir(grupo.id, selectedHorario.horarioId)} disabled={loading}>
                            {loading ? 'Inscribiendo...' : 'Confirmar Inscripción'}
                          </Button>
                        )
                      ) : (
                        <Button variant="outline" block disabled>Selecciona un horario</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
