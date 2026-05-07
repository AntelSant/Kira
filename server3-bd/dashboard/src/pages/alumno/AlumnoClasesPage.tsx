import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { ClaseAlumno } from '../../types';

export const AlumnoClasesPage: React.FC = () => {
  const [clases, setClases] = useState<ClaseAlumno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClases = async () => {
      try {
        const res = await authFetch('/alumno/clases');
        if (res.ok) {
          setClases(await res.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchClases();
  }, []);

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Mis Clases</h1>
      </div>

      {loading ? (
        <p>Cargando clases...</p>
      ) : clases.length === 0 ? (
        <div className="empty-state"><p>No estás inscrito en ninguna clase todavía.</p></div>
      ) : (
        <div className="clases-grid">
          {clases.map(c => (
            <div key={c.grupo_id} className="clase-card">
              <div className="clase-header">
                <h3>{c.materia_nombre}</h3>
              </div>
              <div className="clase-body">
                <p><strong>Profesor:</strong> {c.profesor_nombre}</p>
                <p><strong>Aula:</strong> {c.aula}</p>
              </div>
              <div className="clase-horarios" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Horarios:</h4>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem' }}>
                  {c.horarios?.map(h => (
                    <li key={h.id} style={{ marginBottom: '4px' }}>
                      {h.dia_nombre}: {h.hora_inicio} - {h.hora_fin}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
