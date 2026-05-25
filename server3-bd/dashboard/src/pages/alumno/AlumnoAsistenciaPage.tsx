import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Badge } from '../../components/ui/Badge';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';

interface RegistroAsistencia {
  id: number;
  grupo_id: number;
  materia_nombre: string;
  fecha: string;
  hora_registro: string;
  estado: string;
  emocion: string | null;
}

export const AlumnoAsistenciaPage: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await authFetch('/alumno/mi-asistencia').then(r => r.json());
        setRegistros(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getBadgeVariant = (estado: string): 'success' | 'warning' | 'danger' | 'info' => {
    if (estado === 'a_tiempo' || estado === 'justificado') return 'success';
    if (estado === 'retardo') return 'warning';
    if (estado === 'ausente' || estado === 'fuera_de_horario') return 'danger';
    return 'info';
  };

  const getEmojiVariant = (emocion: string | null): 'success' | 'warning' | 'danger' | 'info' => {
    if (emocion === 'positivo') return 'success';
    if (emocion === 'negativo') return 'danger';
    if (emocion === 'neutro') return 'info';
    return 'info';
  };

  const columns: ColumnDef<RegistroAsistencia>[] = [
    { header: 'Fecha', accessorKey: 'fecha', align: 'center' as const },
    { header: 'Materia', accessorKey: 'materia_nombre', align: 'center' as const },
    { header: 'Hora', accessorKey: 'hora_registro', align: 'center' as const },
    {
      header: 'Estado',
      align: 'center' as const,
      cell: (r) => <Badge variant={getBadgeVariant(r.estado)}>{r.estado.replace('_', ' ')}</Badge>
    },
    {
      header: 'Emoción',
      align: 'center' as const,
      cell: (r) => r.emocion ? (
        <Badge variant={getEmojiVariant(r.emocion)}>
          {r.emocion === 'positivo' ? '😊' : r.emocion === 'negativo' ? '😔' : '😐'}
        </Badge>
      ) : '-'
    },
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Mi Asistencia</h1>
      </div>

      <DataTable
        title="Historial de Asistencia"
        columns={columns}
        data={registros}
        keyField="id"
        loading={loading}
        emptyMessage="No tienes registros de asistencia todavía"
      />
    </div>
  );
};