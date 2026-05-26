import React, { useState, useEffect } from 'react';
import { authFetch } from '../../api/client';
import { ShieldAlert, CheckCircle, Clock, Play, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Alerta {
  id: number;
  alumno_id: number;
  alumno_nombre: string;
  alumno_matricula: string;
  grupo_id: number;
  grupo_aula: string;
  materia_nombre: string;
  faltas_consecutivas: number;
  ultima_emocion: string | null;
  estado: string;
  correo_enviado: boolean;
  fecha_deteccion: string;
  notas: string | null;
}

interface Resumen {
  activas: number;
  revisadas: number;
  resueltas: number;
  total: number;
}

export const AlertasPage: React.FC = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ activas: 0, revisadas: 0, resueltas: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [ejecutando, setEjecutando] = useState(false);

  // Modal de actualización
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<Alerta | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<string>('');
  const [notas, setNotas] = useState<string>('');

  const navigate = useNavigate();

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const url = filtroEstado === 'todas' ? '/alertas' : `/alertas?estado=${filtroEstado}`;

      const [resAlertas, resResumen] = await Promise.all([
        authFetch(url),
        authFetch('/alertas/resumen')
      ]);

      if (resAlertas.ok && resResumen.ok) {
        setAlertas(await resAlertas.json());
        setResumen(await resResumen.json());
      }
    } catch (error) {
      console.error("Error fetching alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, [filtroEstado]);

  const handleEjecutarAhora = async () => {
    if (!window.confirm("¿Ejecutar la verificación de alertas ahora mismo?")) return;
    try {
      setEjecutando(true);
      const res = await authFetch('/alertas/ejecutar-ahora', { method: 'POST' });
      if (res.ok) {
        alert("Proceso de verificación ejecutado con éxito.");
        fetchAlertas();
      } else {
        alert("Error al ejecutar la verificación.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    } finally {
      setEjecutando(false);
    }
  };

  const handleAbrirModal = (alerta: Alerta) => {
    setAlertaSeleccionada(alerta);
    setNuevoEstado(alerta.estado);
    setNotas(alerta.notas || '');
  };

  const handleGuardarCambios = async () => {
    if (!alertaSeleccionada) return;
    try {
      const res = await authFetch(`/alertas/${alertaSeleccionada.id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado, notas })
      });
      if (res.ok) {
        setAlertaSeleccionada(null);
        fetchAlertas();
      } else {
        alert("Error al actualizar la alerta");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getBadgeColor = (estado: string) => {
    switch (estado) {
      case 'activa': return 'bg-red-500 text-white';
      case 'revisada': return 'bg-yellow-500 text-white';
      case 'resuelta': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEmocionBadge = (emocion: string | null) => {
    if (!emocion) return <span className="badge" style={{ backgroundColor: '#94a3b8' }}>N/A</span>;
    if (emocion === 'positivo') return <span className="badge" style={{ backgroundColor: '#10b981' }}>Positivo</span>;
    if (emocion === 'neutro') return <span className="badge" style={{ backgroundColor: '#3b82f6' }}>Neutro</span>;
    if (emocion === 'negativo') return <span className="badge" style={{ backgroundColor: '#ef4444' }}>Negativo</span>;
    return <span className="badge">{emocion}</span>;
  };

  return (
    <div className="page-section active">
      <div className="page-header">
        <div>
          <h1>Smart Alerts</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Monitoreo de riesgo de deserción escolar
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleEjecutarAhora}
          disabled={ejecutando}
        >
          <Play size={18} />
          {ejecutando ? "Ejecutando..." : "Forzar Análisis Ahora"}
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}><ShieldAlert color="#ef4444" /></div>
          <div className="stat-info">
            <h3>Activas</h3>
            <p className="stat-value">{resumen.activas}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}><Clock color="#f59e0b" /></div>
          <div className="stat-info">
            <h3>Revisadas</h3>
            <p className="stat-value">{resumen.revisadas}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}><CheckCircle color="#10b981" /></div>
          <div className="stat-info">
            <h3>Resueltas</h3>
            <p className="stat-value">{resumen.resueltas}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Historial de Alertas</h2>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="form-control"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="todas">Todas</option>
            <option value="activa">Activas</option>
            <option value="revisada">Revisadas</option>
            <option value="resuelta">Resueltas</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Cargando alertas...</div>
        ) : alertas.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            No hay alertas para mostrar.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Alumno</th>
                  <th>Materia / Aula</th>
                  <th>Faltas</th>
                  <th>Emoción</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map(a => (
                  <tr key={a.id}>
                    <td>{a.fecha_deteccion}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.alumno_nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{a.alumno_matricula}</div>
                    </td>
                    <td>
                      <div>{a.materia_nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{a.grupo_aula}</div>
                    </td>
                    <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{a.faltas_consecutivas}</td>
                    <td>{getEmocionBadge(a.ultima_emocion)}</td>
                    <td>{a.correo_enviado ? '✅ Sí' : '❌ No'}</td>
                    <td>
                      <span className={`badge ${getBadgeColor(a.estado)}`} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                        {a.estado.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAbrirModal(a)}
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      >
                        Gestionar
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '4px 8px', fontSize: '0.85rem', background: '#3b82f6', color: 'white' }}
                        onClick={() => navigate(`/admin/alertas/reporte/${a.alumno_id}`)}
                      >
                        <FileText size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                        Ver Reporte
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {alertaSeleccionada && (
        <div className="modal-overlay active">
          <div className="modal active">
            <div className="modal-header">
              <h2>Gestionar Alerta</h2>
              <button className="modal-close" onClick={() => setAlertaSeleccionada(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px' }}>
                <strong>Alumno:</strong> {alertaSeleccionada.alumno_nombre} ({alertaSeleccionada.alumno_matricula})<br />
                <strong>Materia:</strong> {alertaSeleccionada.materia_nombre}<br />
                <strong>Fecha Detección:</strong> {alertaSeleccionada.fecha_deteccion}
              </div>

              <div className="form-group">
                <label>Cambiar Estado</label>
                <select
                  className="form-control"
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                >
                  <option value="activa">Activa (Pendiente)</option>
                  <option value="revisada">Revisada (En proceso)</option>
                  <option value="resuelta">Resuelta (Solucionado)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notas de seguimiento</label>
                <textarea
                  className="form-control"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Se contactó a los padres, el alumno se reincorpora mañana..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAlertaSeleccionada(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardarCambios}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
