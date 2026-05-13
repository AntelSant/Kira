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
                    <div className="inscripcion-info-grid">
                      <div className="inscripcion-info-row">
                        <span><strong>Profesor:</strong> {clase.profesor_nombre}</span>
                        <span><strong>Aula:</strong> {clase.aula}</span>
                      </div>
                      <div className="inscripcion-info-row">
                        <span><strong>Semestre:</strong> {clase.semestre}</span>
                        <span className="inscripcion-alumnos">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                          Alumnos: {clase.num_alumnos}
                        </span>
                      </div>
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

          <h2 style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Grupos Disponibles</h2>
          <div className="clases-grid">
            {gruposDisponibles.map(grupo => {
              return (
                <div key={`disp-${grupo.id}`} className="clase-card">
                  <div className="clase-header">
                    <h3>{grupo.materia_nombre}</h3>
                  </div>
                  <div className="clase-body">
                    <p><strong>Profesor:</strong> {grupo.profesor_nombre}</p>
                    <p><strong>Aula:</strong> {grupo.aula}</p>
                    <p><strong>Semestre:</strong> {grupo.semestre}</p>
                    {grupo.horarios && grupo.horarios.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Horarios:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {grupo.horarios.map(h => (
                            <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: h.alumno_inscrito ? 'rgba(34, 197, 94, 0.1)' : selectedHorario?.horarioId === h.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)', borderRadius: '6px', border: h.alumno_inscrito ? '1px solid rgba(34, 197, 94, 0.3)' : selectedHorario?.horarioId === h.id ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border-subtle)' }}>
                              <span style={{ fontSize: '0.9rem' }}>{h.dia_nombre} {h.hora_inicio?.slice(0, 5)}-{h.hora_fin?.slice(0, 5)}</span>
                              {h.alumno_inscrito ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Ya inscrito</span>
                              ) : (
                                <button
                                  className="btn-icon"
                                  onClick={() => setSelectedHorario({ grupoId: grupo.id, horarioId: h.id })}
                                  style={{ background: selectedHorario?.horarioId === h.id ? 'var(--accent)' : 'var(--bg-secondary)', color: selectedHorario?.horarioId === h.id ? '#fff' : 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                  Seleccionar
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    {selectedHorario?.grupoId === grupo.id ? (
                      <>
                        {selectedHorario && grupo.horarios?.find(h => h.id === selectedHorario.horarioId)?.alumno_inscrito ? (
                          <Button variant="success" block disabled>Ya inscrito en este horario</Button>
                        ) : (
                          <Button variant="primary" block onClick={() => handleInscribir(grupo.id, selectedHorario.horarioId)} disabled={loading}>
                            {loading ? 'Inscribiendo...' : 'Confirmar Inscripción'}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button variant="secondary" block disabled>Selecciona un horario</Button>
                    )}
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
