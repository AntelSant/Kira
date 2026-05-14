import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface TablaAsistenciaData {
  teacher: { id: number; nombre: string; apellido: string; total_asistencias: number; total_faltas: number } | null;
  students: {
    id: number;
    nombre: string;
    apellido: string;
    matricula: string;
    asistencia_por_fecha: Record<string, string>;
    total_asistencias: number;
    total_faltas: number;
  }[];
  dates: string[];
  excluded_dates: string[];
  total_class_days: number;
}

export const ProfesorAsistenciaPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string>('');
  const [tabla, setTabla] = useState<TablaAsistenciaData | null>(null);
  const [, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

  const [isExcluirModalOpen, setIsExcluirModalOpen] = useState(false);
  const [excluirDiaData, setExcluirDiaData] = useState({ fecha: '' });

  useEffect(() => {
    authFetch('/profesor/mis-grupos').then(r => r.json()).then(setGrupos).catch(console.error);
  }, []);

  const fetchTabla = async () => {
    if (!grupoId) return;
    setLoading(true);
    try {
      const data = await authFetch(`/profesor/grupo/${grupoId}/tabla`).then(r => r.json());
      setTabla(data);
    } catch (error) {
      console.error(error);
      showAlert('Error al cargar tabla de asistencia', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabla();
  }, [grupoId]);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleExcluirDia = async () => {
    if (!excluirDiaData.fecha) return;
    try {
      const res = await authFetch(`/profesor/grupo/${grupoId}/excluir_dia`, {
        method: 'POST',
        body: JSON.stringify({ fecha: excluirDiaData.fecha }),
      });
      if (res.ok) {
        showAlert('Día excluido exitosamente', 'success');
        setIsExcluirModalOpen(false);
        setExcluirDiaData({ fecha: '' });
        fetchTabla();
      } else {
        const data = await res.json();
        showAlert(data.detail || 'Error al excluir día', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const getBadgeVariant = (estado: string): 'success' | 'warning' | 'danger' | 'info' => {
    if (estado === 'a_tiempo' || estado === 'justificado') return 'success';
    if (estado === 'retardo') return 'warning';
    if (estado === 'ausente' || estado === 'fuera_de_horario') return 'danger';
    return 'info';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Mi Asistencia</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label>Grupo</label>
          <select className="form-control" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Selecciona un grupo...</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.materia_nombre} - {g.aula}</option>
            ))}
          </select>
        </div>
        {grupoId && (
          <div className="form-group">
            <Button variant="outline" icon={<AlertTriangle size={16}/>} onClick={() => setIsExcluirModalOpen(true)}>
              Excluir Día
            </Button>
          </div>
        )}
      </div>

      {tabla && (
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p>Días totales de clase: <strong>{tabla.total_class_days}</strong> | Días excluidos: <strong>{tabla.excluded_dates.length}</strong></p>
        </div>
      )}

      {tabla && tabla.students.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-secondary)' }}>Alumno</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Matrícula</th>
                {tabla.dates.map(d => (
                  <th key={d} style={{ padding: '8px', textAlign: 'center', minWidth: '60px' }}>{formatDate(d)}</th>
                ))}
                <th style={{ padding: '8px', textAlign: 'center' }}>Asist.</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Faltas</th>
              </tr>
            </thead>
            <tbody>
              {tabla.students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px', fontWeight: 500 }}>{s.nombre} {s.apellido}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}><code>{s.matricula}</code></td>
                  {tabla.dates.map(d => {
                    const estado = s.asistencia_por_fecha?.[d];
                    return (
                      <td key={d} style={{ padding: '8px', textAlign: 'center' }}>
                        {estado ? (
                          <Badge variant={getBadgeVariant(estado)}>
                            {estado === 'a_tiempo' ? '✓' : estado === 'retardo' ? '~' : estado === 'justificado' ? 'J' : '✗'}
                          </Badge>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>{s.total_asistencias}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: 'var(--danger)' }}>{s.total_faltas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tabla && tabla.students.length === 0 && (
        <div className="empty-state"><p>No hay alumnos inscritos en este grupo.</p></div>
      )}

      <Modal
        isOpen={isExcluirModalOpen}
        onClose={() => setIsExcluirModalOpen(false)}
        title="Excluir Día de Clases"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsExcluirModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleExcluirDia}>Confirmar</Button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Las inasistencias de ese día no contarán para reprobar.
        </p>
        <div className="form-group">
          <label>Fecha a excluir</label>
          <input type="date" className="form-control" value={excluirDiaData.fecha}
            onChange={e => setExcluirDiaData({ ...excluirDiaData, fecha: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
};