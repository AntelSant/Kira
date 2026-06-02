import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../../api/client';
import { ArrowLeft, User, CalendarCheck, XCircle, AlertTriangle, Smile } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

interface ReporteData {
  alumno: {
    id: number;
    nombre: string;
    matricula: string;
    foto_perfil: string | null;
  };
  asistencia_7d: Array<{
    fecha: string;
    grupo_id: number;
    materia: string;
    estado: string;
    emocion: string | null;
    hora: string;
  }>;
  emociones_7d: Array<{
    fecha: string;
    emocion: string;
    cantidad: number;
  }>;
  resumen: {
    total_asistencias: number;
    total_faltas: number;
    total_retardos: number;
    emociones_conteo: {
      positivo: number;
      neutro: number;
      negativo: number;
    };
  };
}

export const ReporteAlumnoPage: React.FC = () => {
  const { alumnoId } = useParams<{ alumnoId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReporte = async () => {
      try {
        const res = await authFetch(`/alertas/reporte/${alumnoId}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Error fetching reporte:", error);
      } finally {
        setLoading(false);
      }
    };
    if (alumnoId) fetchReporte();
  }, [alumnoId]);

  if (loading) {
    return <div className="page-section active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Cargando reporte...</div>;
  }

  if (!data) {
    return <div className="page-section active" style={{ textAlign: 'center', padding: '40px' }}>Error al cargar el reporte o alumno no encontrado.</div>;
  }

  // Preparar datos para BarChart (Asistencia)
  // Agrupar por fecha
  const asisPorFecha: Record<string, any> = {};
  data.asistencia_7d.forEach(a => {
    if (!asisPorFecha[a.fecha]) {
      asisPorFecha[a.fecha] = { fecha: a.fecha, a_tiempo: 0, retardo: 0, ausente: 0, justificado: 0 };
    }
    const estado = a.estado === 'fuera_de_horario' ? 'ausente' : a.estado; // simplificar
    if (asisPorFecha[a.fecha][estado] !== undefined) {
      asisPorFecha[a.fecha][estado] += 1;
    }
  });
  const dataBarChart = Object.values(asisPorFecha).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));

  // Preparar datos para PieChart (Emociones)
  const emocionesConteo = data.resumen.emociones_conteo;
  const dataPieChart = [
    { name: 'Positivo', value: emocionesConteo.positivo, color: '#10b981' },
    { name: 'Neutro', value: emocionesConteo.neutro, color: '#3b82f6' },
    { name: 'Negativo', value: emocionesConteo.negativo, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Preparar datos para LineChart (Tendencia emocional)
  const emocPorFecha: Record<string, any> = {};
  data.emociones_7d.forEach(e => {
    if (!emocPorFecha[e.fecha]) {
      emocPorFecha[e.fecha] = { fecha: e.fecha, positivo: 0, neutro: 0, negativo: 0 };
    }
    const key = e.emocion as 'positivo' | 'neutro' | 'negativo';
    emocPorFecha[e.fecha][key] += e.cantidad;
  });
  const dataLineChart = Object.values(emocPorFecha).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));

  // Identificar emoción dominante global
  let emocionDominante = 'Neutro';
  let colorDominante = '#3b82f6';
  if (emocionesConteo.negativo > emocionesConteo.positivo && emocionesConteo.negativo > emocionesConteo.neutro) {
    emocionDominante = 'Negativo';
    colorDominante = '#ef4444';
  } else if (emocionesConteo.positivo > emocionesConteo.negativo && emocionesConteo.positivo > emocionesConteo.neutro) {
    emocionDominante = 'Positivo';
    colorDominante = '#10b981';
  }

  const getEmocionBadge = (emocion: string | null) => {
    if (!emocion) return <span className="badge" style={{ backgroundColor: '#94a3b8' }}>N/A</span>;
    if (emocion === 'positivo') return <span className="badge" style={{ backgroundColor: '#10b981' }}>Positivo</span>;
    if (emocion === 'neutro') return <span className="badge" style={{ backgroundColor: '#3b82f6' }}>Neutro</span>;
    if (emocion === 'negativo') return <span className="badge" style={{ backgroundColor: '#ef4444' }}>Negativo</span>;
    return <span className="badge">{emocion}</span>;
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === 'a_tiempo' || estado === 'justificado') return <span className="badge bg-green-500 text-white">Presente</span>;
    if (estado === 'retardo') return <span className="badge bg-yellow-500 text-white">Retardo</span>;
    return <span className="badge bg-red-500 text-white">Ausente</span>;
  };

  return (
    <div className="page-section active">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/admin/alertas')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}
        >
          <ArrowLeft size={16} /> Volver a Alertas
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {data.alumno.foto_perfil ? (
              <img src={`http://localhost:8003${data.alumno.foto_perfil}`} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={40} color="#94a3b8" />
            )}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>{data.alumno.nombre}</h1>
            <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Matrícula: {data.alumno.matricula}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <span className="badge bg-red-500 text-white" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> En riesgo de deserción
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}><CalendarCheck color="#10b981" /></div>
          <div className="stat-info">
            <h3>Asistencias (7d)</h3>
            <p className="stat-value">{data.resumen.total_asistencias}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}><XCircle color="#ef4444" /></div>
          <div className="stat-info">
            <h3>Faltas (7d)</h3>
            <p className="stat-value">{data.resumen.total_faltas}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}><AlertTriangle color="#f59e0b" /></div>
          <div className="stat-info">
            <h3>Retardos (7d)</h3>
            <p className="stat-value">{data.resumen.total_retardos}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${colorDominante}` }}>
          <div className="stat-icon" style={{ background: `${colorDominante}33` }}><Smile color={colorDominante} /></div>
          <div className="stat-info">
            <h3>Emoción Dom.</h3>
            <p className="stat-value" style={{ color: colorDominante, fontSize: '1.5rem' }}>{emocionDominante}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Gráfica 1: Asistencia */}
        <div className="card">
          <div className="card-header">
            <h2>Asistencia últimos 7 días</h2>
          </div>
          <div style={{ height: '300px', padding: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBarChart} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="a_tiempo" name="A tiempo" stackId="a" fill="#10b981" />
                <Bar dataKey="justificado" name="Justificado" stackId="a" fill="#3b82f6" />
                <Bar dataKey="retardo" name="Retardo" stackId="a" fill="#f59e0b" />
                <Bar dataKey="ausente" name="Ausente" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Emociones */}
        <div className="card">
          <div className="card-header">
            <h2>Estado Emocional últimos 7 días</h2>
          </div>
          <div style={{ height: '300px', display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataPieChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataPieChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, padding: '20px 20px 20px 0' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataLineChart} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="positivo" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="neutro" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="negativo" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                Tendencia Diaria
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="card">
        <div className="card-header">
          <h2>Historial Detallado (7 días)</h2>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Materia</th>
                <th>Estado</th>
                <th>Emoción Detectada</th>
              </tr>
            </thead>
            <tbody>
              {data.asistencia_7d.map((a, idx) => (
                <tr key={idx}>
                  <td>{a.fecha}</td>
                  <td>{a.hora || '—'}</td>
                  <td>{a.materia}</td>
                  <td>{getEstadoBadge(a.estado)}</td>
                  <td>{getEmocionBadge(a.emocion)}</td>
                </tr>
              ))}
              {data.asistencia_7d.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                    No hay registros de asistencia en los últimos 7 días.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
