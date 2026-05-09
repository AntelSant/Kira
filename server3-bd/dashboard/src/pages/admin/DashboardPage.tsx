import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { authFetch } from '../../api/client';
import { Users, BookOpen, Layers, CheckCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface ResumenData {
  total_alumnos: number;
  total_profesores: number;
  total_grupos: number;
  total_materias: number;
  embeddings_registrados: number;
  asistencias_hoy: number;
}

interface AsistenciaSemanalData {
  dia: string;
  cantidad: number;
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

export const DashboardPage: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [asistencia, setAsistencia] = useState<AsistenciaSemanalData[]>([]);
  const [emociones, setEmociones] = useState<EmocionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resResumen, resAsistencia, resEmociones] = await Promise.all([
          authFetch('/dashboard/resumen').then(r => r.json()),
          authFetch('/dashboard/asistencia-semanal').then(r => r.json()),
          authFetch('/dashboard/emociones?dias=7').then(r => r.json())
        ]);

        setResumen(resResumen);
        setAsistencia(resAsistencia);
        setEmociones(resEmociones.datos || []);
      } catch (error) {
        console.error("Error cargando el dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando dashboard...</div>;
  }

  const chartData = emociones.map(d => ({
    name: d.emocion.charAt(0).toUpperCase() + d.emocion.slice(1),
    value: d.cantidad,
    color: COLORS[d.emocion as keyof typeof COLORS] || '#64748b'
  }));

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Dashboard de Control</h1>
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Alumnos" 
          value={resumen?.total_alumnos || 0} 
          subtitle={`${resumen?.embeddings_registrados || 0} rostros registrados`}
          icon={<Users size={24} />}
          gradient="grad-cyan"
        />
        <StatCard 
          title="Profesores" 
          value={resumen?.total_profesores || 0} 
          icon={<Users size={24} />}
          gradient="grad-purple"
        />
        <StatCard 
          title="Asistencias Hoy" 
          value={resumen?.asistencias_hoy || 0} 
          icon={<CheckCircle size={24} />}
          gradient="grad-green"
        />
        <StatCard 
          title="Grupos" 
          value={resumen?.total_grupos || 0} 
          icon={<Layers size={24} />}
          gradient="grad-blue-purple"
        />
        <StatCard 
          title="Materias" 
          value={resumen?.total_materias || 0} 
          icon={<BookOpen size={24} />}
          gradient="grad-blue"
        />
        <StatCard 
          title="Rostros Registrados" 
          value={resumen?.embeddings_registrados || 0} 
          icon={<CheckCircle size={24} />}
          gradient="grad-green"
        />
      </div>

      <div className="grid grid-2" style={{ marginTop: '30px' }}>
        <ChartCard title="Asistencia Semanal (Últimos 7 días)">
          <BarChart data={asistencia} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
            <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
            <Bar dataKey="cantidad" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Emociones Detectadas (Últimos 7 días)">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  );
};
