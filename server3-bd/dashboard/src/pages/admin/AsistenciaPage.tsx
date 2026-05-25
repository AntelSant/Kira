import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo, Asistencia } from '../../types';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

export const AsistenciaPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [asistencia, setAsistencia] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch('/grupos').then(res => res.json()).then(setGrupos).catch(console.error);
  }, []);

  const fetchAsistencia = async () => {
    if (!grupoId || !fecha) return;
    setLoading(true);
    try {
      const rawData = await authFetch(`/asistencia/${grupoId}?fecha=${fecha}`).then(res => res.json());
      const data = Array.isArray(rawData) ? rawData.map((r: any) => ({
        ...r,
        alumno_nombre: r.nombre,
        hora_llegada: r.hora_registro
      })) : [];
      setAsistencia(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsistencia();
  }, [grupoId, fecha]);

  const columns: ColumnDef<Asistencia>[] = [
    { header: 'Matrícula', align: 'center', cell: (a) => <code>{a.matricula}</code> },
    { header: 'Alumno', accessorKey: 'alumno_nombre', align: 'center' },
    { header: 'Hora Llegada', accessorKey: 'hora_llegada', align: 'center' },
    { 
      header: 'Estado', 
      align: 'center',
      cell: (a) => {
        let variant: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (a.estado === 'presente') variant = 'success';
        if (a.estado === 'retardo') variant = 'warning';
        if (a.estado === 'ausente') variant = 'danger';
        return <Badge variant={variant}>{a.estado}</Badge>;
      } 
    },
    { 
      header: 'Emoción', 
      align: 'center',
      cell: (a) => {
        if (!a.emocion) return '-';
        let variant: 'success' | 'warning' | 'danger' | 'info' | 'primary' = 'info';
        if (a.emocion === 'positivo') variant = 'success';
        if (a.emocion === 'negativo') variant = 'danger';
        if (a.emocion === 'neutro') variant = 'primary';
        return <Badge variant={variant}>{a.emocion}</Badge>;
      } 
    }
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Control de Asistencia Diario</h1>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label>Grupo</label>
          <select className="form-control" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Selecciona un grupo...</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.materia_nombre} - {g.profesor_nombre} (Aula: {g.aula})</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ width: '200px' }}>
          <label>Fecha</label>
          <input type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      {grupoId && (
        <DataTable 
          title={`Asistencia del ${fecha}`}
          columns={columns} 
          data={asistencia} 
          keyField="id" 
          loading={loading}
          emptyMessage="No hay registros de asistencia para esta fecha"
        />
      )}
    </div>
  );
};
