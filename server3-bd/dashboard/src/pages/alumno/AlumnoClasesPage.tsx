import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { ClaseAlumno } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { BookOpen, CheckCircle, XCircle } from 'lucide-react';

interface ResumenAlumno {
  total_clases_inscritas: number;
  total_asistencias: number;
  total_faltas: number;
  emociones_semana: { emocion: string; cantidad: number }[];
}

export const AlumnoClasesPage: React.FC = () => {
  const [clases, setClases] = useState<ClaseAlumno[]>([]);
  const [resumen, setResumen] = useState<ResumenAlumno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resClases, resResumen] = await Promise.all([
          authFetch('/alumno/mis-clases').then(r => r.json()),
          authFetch('/alumno/resumen').then(r => r.json()),
        ]);
        setClases(resClases);
        setResumen(resResumen);
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
        <h1>Mis Clases</h1>
      </div>

      {resumen && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <StatCard
            title="Clases Inscritas"
            value={resumen.total_clases_inscritas || 0}
            icon={<BookOpen size={24} />}
            gradient="grad-blue"
          />
          <StatCard
            title="Asistencias"
            value={resumen.total_asistencias || 0}
            icon={<CheckCircle size={24} />}
            gradient="grad-green"
          />
          <StatCard
            title="Faltas"
            value={resumen.total_faltas || 0}
            icon={<XCircle size={24} />}
            gradient="grad-red"
          />
        </div>
      )}

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
