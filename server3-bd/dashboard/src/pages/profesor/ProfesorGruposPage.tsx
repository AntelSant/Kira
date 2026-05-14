import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo } from '../../types';

export const ProfesorGruposPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const res = await authFetch('/profesor/mis-grupos');
        if (res.ok) {
          setGrupos(await res.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrupos();
  }, []);

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Mis Grupos Asignados</h1>
      </div>

      {loading ? (
        <p>Cargando grupos...</p>
      ) : grupos.length === 0 ? (
        <div className="empty-state"><p>No tienes grupos asignados en este momento.</p></div>
      ) : (
        <div className="clases-grid">
          {grupos.map(g => (
            <div key={g.id} className="clase-card">
              <div className="clase-header">
                <h3>{g.materia_nombre}</h3>
                {g.materia_clave && <span style={{fontSize: '0.8rem', opacity: 0.8}}>{g.materia_clave}</span>}
              </div>
              <div className="clase-body">
                <p><strong>Aula:</strong> {g.aula}</p>
                <p><strong>Semestre:</strong> {g.semestre}</p>
                <p><strong>Alumnos:</strong> {g.num_alumnos}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
