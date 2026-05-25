import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { ChartCard } from '../../components/ui/ChartCard';
import { StatCard } from '../../components/ui/StatCard';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Heart, Meh, AlertTriangle } from 'lucide-react';

interface TendenciaData {
  fecha: string;
  positivo: number;
  neutro: number;
  negativo: number;
}

interface EmocionData {
  emocion: string;
  cantidad: number;
}

const COLORS = {
  positivo: '#10b981',
  neutro: '#3b82f6',
  negativo: '#ef4444'
};

export const ProfesorEmocionesPage: React.FC = () => {
  const [dias, setDias] = useState<number>(30);
  const [tendencia, setTendencia] = useState<TendenciaData[]>([]);
  const [resumen, setResumen] = useState<{ emociones_semana: EmocionData[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTendencia, resResumen] = await Promise.all([
        authFetch(`/profesor/emociones-tendencia?dias=${dias}`).then(r => r.json()),
        authFetch('/profesor/resumen').then(r => r.json()),
      ]);
      setTendencia(resTendencia);
      setResumen(resResumen);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dias]);

  const pieData = (resumen?.emociones_semana || []).map(d => ({
    name: d.emocion.charAt(0).toUpperCase() + d.emocion.slice(1),
    value: d.cantidad,
    color: COLORS[d.emocion as keyof typeof COLORS] || '#64748b'
  }));

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Mis Emociones</h1>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ width: '200px' }}>
          <label>Periodo de Análisis</label>
          <select className="form-control" value={dias} onChange={(e) => setDias(parseInt(e.target.value))}>
            <option value={7}>Últimos 7 días</option>
            <option value={15}>Últimos 15 días</option>
            <option value={30}>Último Mes</option>
            <option value={90}>Últimos 3 Meses</option>
          </select>
        </div>
      </div>

      {resumen && resumen.emociones_semana.length > 0 && (
        <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
          <StatCard
            title="Positivo"
            value={resumen.emociones_semana.find(e => e.emocion === 'positivo')?.cantidad || 0}
            icon={<Heart size={24} />}
            gradient="grad-green"
          />
          <StatCard
            title="Neutro"
            value={resumen.emociones_semana.find(e => e.emocion === 'neutro')?.cantidad || 0}
            icon={<Meh size={24} />}
            gradient="grad-blue"
          />
          <StatCard
            title="Negativo"
            value={resumen.emociones_semana.find(e => e.emocion === 'negativo')?.cantidad || 0}
            icon={<AlertTriangle size={24} />}
            gradient="grad-red"
          />
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: '2rem' }}>
        <ChartCard title="Tendencia de Emociones">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>
          ) : tendencia.length === 0 ? (
            <div className="empty-state"><p>Sin datos de emociones en este periodo.</p></div>
          ) : (
            <LineChart data={tendencia} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(v) => new Date(v).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} />
              <Legend verticalAlign="middle" align="center" iconType="circle" />
              <Line type="monotone" dataKey="positivo" stroke="#10b981" strokeWidth={2} dot={false} name="Positivo" />
              <Line type="monotone" dataKey="neutro" stroke="#3b82f6" strokeWidth={2} dot={false} name="Neutro" />
              <Line type="monotone" dataKey="negativo" stroke="#ef4444" strokeWidth={2} dot={false} name="Negativo" />
            </LineChart>
          )}
        </ChartCard>

        <div style={{ marginTop: '24px' }} />

        <ChartCard title="Distribución (Esta Semana)">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>
          ) : pieData.length === 0 ? (
            <div className="empty-state"><p>Sin datos para mostrar.</p></div>
          ) : (
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
            </PieChart>
          )}
        </ChartCard>
      </div>
    </div>
  );
};