import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { ChartCard } from '../../components/ui/ChartCard';
import { 
  PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis
} from 'recharts';

interface EmocionData {
  emocion: string;
  cantidad: number;
}

const COLORS = {
  positivo: '#10b981',
  neutro: '#3b82f6',
  negativo: '#ef4444'
};

export const EmocionesPage: React.FC = () => {
  const [dias, setDias] = useState<number>(7);
  const [emociones, setEmociones] = useState<EmocionData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmociones = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/dashboard/emociones?dias=${dias}`).then(r => r.json());
      setEmociones(res.datos || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmociones();
  }, [dias]);

  const chartData = emociones.map(d => ({
    name: d.emocion.charAt(0).toUpperCase() + d.emocion.slice(1),
    value: d.cantidad,
    color: COLORS[d.emocion as keyof typeof COLORS] || '#64748b'
  }));

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Análisis de Emociones</h1>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ width: '200px' }}>
          <label>Periodo de Análisis</label>
          <select className="form-control" value={dias} onChange={(e) => setDias(parseInt(e.target.value))}>
            <option value={1}>Hoy</option>
            <option value={7}>Últimos 7 días</option>
            <option value={15}>Últimos 15 días</option>
            <option value={30}>Último Mes</option>
            <option value={90}>Últimos 3 Meses</option>
          </select>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: '20px' }}>
        <ChartCard title="Distribución de Emociones" height={400}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Cargando...</div> : (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={150}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend verticalAlign="bottom" align="center" iconType="circle" />
            </PieChart>
          )}
        </ChartCard>

        <ChartCard title="Comparativa por Emoción" height={400}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Cargando...</div> : (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ChartCard>
      </div>
    </div>
  );
};
