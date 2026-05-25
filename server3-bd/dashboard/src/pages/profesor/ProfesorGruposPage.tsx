import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Users, BookOpen, CheckCircle } from 'lucide-react';

interface ResumenData {
  total_grupos: number;
  total_alumnos: number;
  asignaturas_hoy: number;
  emociones_semana: { emocion: string; cantidad: number }[];
}

export const ProfesorGruposPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resGrupos, resResumen] = await Promise.all([
          authFetch('/profesor/mis-grupos').then(r => r.json()),
          authFetch('/profesor/resumen').then(r => r.json()),
        ]);
        setGrupos(resGrupos);
        setResumen({
          total_grupos: resResumen.total_grupos || 0,
          total_alumnos: resResumen.total_alumnos || 0,
          asignaturas_hoy: resResumen.asistencias_hoy || 0,
          emociones_semana: resResumen.emociones_semana || [],
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Mis Grupos Asignados</h1>
      </div>

      {resumen && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <StatCard
            title="Grupos"
            value={resumen.total_grupos || 0}
            icon={<BookOpen size={24} />}
            gradient="grad-blue"
          />
          <StatCard
            title="Alumnos"
            value={resumen.total_alumnos || 0}
            icon={<Users size={24} />}
            gradient="grad-purple"
          />
          <StatCard
            title="Asistencias Hoy"
            value={resumen.asignaturas_hoy || 0}
            icon={<CheckCircle size={24} />}
            gradient="grad-green"
          />
        </div>
      )}

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
                {g.materia_clave && <span className="materia-clave">{g.materia_clave}</span>}
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
