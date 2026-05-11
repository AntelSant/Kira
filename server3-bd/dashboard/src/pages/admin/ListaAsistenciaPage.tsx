import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo, Asistencia } from '../../types';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { AlertTriangle, Edit } from 'lucide-react';

export const ListaAsistenciaPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string>('');
  
  const today = new Date();
  const pastWeek = new Date();
  pastWeek.setDate(today.getDate() - 7);
  
  const [fechaInicio, setFechaInicio] = useState<string>(pastWeek.toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState<string>(today.toISOString().split('T')[0]);
  
  const [asistencia, setAsistencia] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  // Excluir Dia Modal
  const [isExcluirModalOpen, setIsExcluirModalOpen] = useState(false);
  const [excluirDiaData, setExcluirDiaData] = useState({ fecha: '', motivo: '' });

  // Justificar Falta Modal
  const [isJustificarModalOpen, setIsJustificarModalOpen] = useState(false);
  const [justificarData, setJustificarData] = useState({ id: 0, estado: 'justificado', motivo: '' });

  useEffect(() => {
    authFetch('/grupos').then(res => res.json()).then(setGrupos).catch(console.error);
  }, []);

  const fetchAsistencia = async () => {
    if (!grupoId || !fechaInicio || !fechaFin) return;
    setLoading(true);
    try {
      const data = await authFetch(`/asistencia/lista?grupo_id=${grupoId}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`).then(res => res.json());
      setAsistencia(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsistencia();
  }, [grupoId, fechaInicio, fechaFin]);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleExcluirDia = async () => {
    try {
      const res = await authFetch('/asistencia/excluir-dia', {
        method: 'POST',
        body: JSON.stringify({
          grupo_id: parseInt(grupoId),
          fecha: excluirDiaData.fecha,
          motivo: excluirDiaData.motivo
        }),
      });
      if (res.ok) {
        showAlert('Día excluido exitosamente', 'success');
        setIsExcluirModalOpen(false);
        fetchAsistencia();
        setExcluirDiaData({ fecha: '', motivo: '' });
      } else {
        const data = await res.json();
        showAlert(data.detail || 'Error al excluir día', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const handleJustificar = async () => {
    try {
      const res = await authFetch(`/asistencia/${justificarData.id}/justificar`, {
        method: 'PUT',
        body: JSON.stringify({
          estado: justificarData.estado,
          motivo: justificarData.motivo
        }),
      });
      if (res.ok) {
        showAlert('Asistencia actualizada', 'success');
        setIsJustificarModalOpen(false);
        fetchAsistencia();
      } else {
        const data = await res.json();
        showAlert(data.detail || 'Error al justificar', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const openJustificarModal = (registro: Asistencia) => {
    setJustificarData({ id: registro.id, estado: 'justificado', motivo: '' });
    setIsJustificarModalOpen(true);
  };

  const columns: ColumnDef<Asistencia>[] = [
    { header: 'Fecha', accessorKey: 'fecha', align: 'center' },
    { header: 'Matrícula', align: 'center', cell: (a) => <code>{a.matricula}</code> },
    { header: 'Alumno', accessorKey: 'alumno_nombre', align: 'center' },
    { header: 'Llegada', accessorKey: 'hora_llegada', align: 'center' },
    { 
      header: 'Estado', 
      align: 'center',
      cell: (a) => {
        let variant: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (a.estado === 'presente') variant = 'success';
        if (a.estado === 'retardo') variant = 'warning';
        if (a.estado === 'ausente') variant = 'danger';
        if (a.estado === 'justificado') variant = 'info';
        return <Badge variant={variant}>{a.estado}</Badge>;
      } 
    },
    { 
      header: 'Acciones', 
      align: 'center',
      cell: (a) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="outline" icon={<Edit size={16}/>} onClick={() => openJustificarModal(a)} title="Modificar Estado / Justificar" />
        </div>
      )
    }
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Reporte de Asistencia</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <div className="toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label>Grupo</label>
          <select className="form-control" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Selecciona un grupo...</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.materia_nombre} - {g.profesor_nombre} (Aula: {g.aula})</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ width: '150px' }}>
          <label>Desde</label>
          <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div className="form-group" style={{ width: '150px' }}>
          <label>Hasta</label>
          <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
        {grupoId && (
          <div className="form-group">
            <Button variant="danger" icon={<AlertTriangle size={16}/>} onClick={() => setIsExcluirModalOpen(true)}>
              Excluir Día
            </Button>
          </div>
        )}
      </div>

      {grupoId && (
        <DataTable 
          title="Registros de Asistencia"
          columns={columns} 
          data={asistencia} 
          keyField="id" 
          loading={loading}
          emptyMessage="No hay registros en este rango de fechas"
        />
      )}

      {/* Modal Excluir Día */}
      <Modal 
        isOpen={isExcluirModalOpen} 
        onClose={() => setIsExcluirModalOpen(false)} 
        title="Excluir Día de Clases"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsExcluirModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleExcluirDia}>Confirmar Exclusión</Button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Al excluir un día (por puente, día festivo o falta del profesor), las inasistencias de ese día no contarán para reprobar a los alumnos.
        </p>
        <div className="form-group">
          <label>Fecha a Excluir</label>
          <input type="date" className="form-control" value={excluirDiaData.fecha} onChange={e => setExcluirDiaData({...excluirDiaData, fecha: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Motivo</label>
          <input type="text" className="form-control" value={excluirDiaData.motivo} onChange={e => setExcluirDiaData({...excluirDiaData, motivo: e.target.value})} placeholder="Ej. Día Festivo Oficial" />
        </div>
      </Modal>

      {/* Modal Justificar */}
      <Modal 
        isOpen={isJustificarModalOpen} 
        onClose={() => setIsJustificarModalOpen(false)} 
        title="Modificar Estado / Justificar Falta"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsJustificarModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleJustificar}>Guardar</Button>
          </>
        }
      >
        <div className="form-group">
          <label>Nuevo Estado</label>
          <select className="form-control" value={justificarData.estado} onChange={e => setJustificarData({...justificarData, estado: e.target.value})}>
            <option value="presente">Presente</option>
            <option value="retardo">Retardo</option>
            <option value="justificado">Justificado (No cuenta como falta)</option>
            <option value="ausente">Ausente</option>
          </select>
        </div>
        <div className="form-group">
          <label>Motivo / Observaciones</label>
          <textarea className="form-control" value={justificarData.motivo} onChange={e => setJustificarData({...justificarData, motivo: e.target.value})} placeholder="Ej. Presentó receta médica..." rows={3}></textarea>
        </div>
      </Modal>

    </div>
  );
};
