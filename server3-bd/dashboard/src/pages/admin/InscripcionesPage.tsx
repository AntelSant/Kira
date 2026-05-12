import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo, Usuario } from '../../types';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

interface ClaseAsignada extends Grupo {
  inscripcion_id: number;
}

export const InscripcionesPage: React.FC = () => {
  const [alumnos, setAlumnos] = useState<Usuario[]>([]);
  const [alumnoId, setAlumnoId] = useState<string>('');
  
  const [gruposDisponibles, setGruposDisponibles] = useState<Grupo[]>([]);
  const [clasesActuales, setClasesActuales] = useState<ClaseAsignada[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    authFetch('/usuarios?tipo=alumno').then(res => res.json()).then(setAlumnos).catch(console.error);
    authFetch('/grupos').then(res => res.json()).then(setGruposDisponibles).catch(console.error);
  }, []);

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

  const handleInscribir = async (grupoId: number) => {
    if (!alumnoId) return;
    try {
      const res = await authFetch('/inscripciones/registrar', {
        method: 'POST',
        body: JSON.stringify({
          alumno_id: parseInt(alumnoId),
          grupo_id: grupoId
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Inscripción exitosa', 'success');
        fetchInscripciones(alumnoId);
      } else {
        showAlert(data.detail || 'Error en inscripción', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const handleDesinscribir = async (inscripcionId: number) => {
    if (!confirm('¿Seguro que deseas dar de baja al alumno de este grupo?')) return;
    try {
      const res = await authFetch(`/inscripciones/${inscripcionId}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Baja exitosa', 'success');
        fetchInscripciones(alumnoId);
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
            <div className="clases-grid">
              {clasesActuales.map(clase => (
                <div key={`inscripcion-${clase.inscripcion_id}`} className="clase-card">
                  <div className="clase-header">
                    <h3>{clase.materia_nombre}</h3>
                    <button 
                      className="btn-icon" 
                      style={{ color: 'var(--danger)' }} 
                      onClick={() => handleDesinscribir(clase.inscripcion_id)}
                      title="Dar de baja"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="clase-body">
                    <p><strong>Profesor:</strong> {clase.profesor_nombre}</p>
                    <p><strong>Aula:</strong> {clase.aula}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Grupos Disponibles</h2>
          <div className="clases-grid">
            {gruposDisponibles.map(grupo => {
              const yaInscrito = clasesActuales.some(c => c.id === grupo.id);
              return (
                <div key={`disp-${grupo.id}`} className="clase-card">
                  <div className="clase-header">
                    <h3>{grupo.materia_nombre}</h3>
                  </div>
                  <div className="clase-body">
                    <p><strong>Profesor:</strong> {grupo.profesor_nombre}</p>
                    <p><strong>Aula:</strong> {grupo.aula}</p>
                    <p><strong>Semestre:</strong> {grupo.semestre}</p>
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    {yaInscrito ? (
                      <Button variant="success" block disabled>Ya inscrito</Button>
                    ) : (
                      <Button variant="primary" block onClick={() => handleInscribir(grupo.id)}>
                        Inscribir Alumno
                      </Button>
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
