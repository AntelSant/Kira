import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo, Horario } from '../../types';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Plus, Trash2 } from 'lucide-react';

export const HorariosPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string>('');
  const [horarios, setHorarios] = useState<Horario[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    dia_semana: '0', 
    hora_inicio: '08:00',
    hora_fin: '10:00',
    tolerancia_minutos: 15
  });

  useEffect(() => {
    authFetch('/grupos').then(res => res.json()).then(setGrupos).catch(console.error);
  }, []);

  const fetchHorarios = async (gid: string) => {
    if (!gid) {
      setHorarios([]);
      return;
    }
    setLoading(true);
    try {
      const data = await authFetch(`/horarios/${gid}`).then(res => res.json());
      setHorarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showAlert('Error al cargar horarios', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHorarios(grupoId);
  }, [grupoId]);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSaveHorario = async () => {
    if (!grupoId) return;
    try {
      const res = await authFetch('/horarios/registrar', {
        method: 'POST',
        body: JSON.stringify({
          grupo_id: parseInt(grupoId),
          dia_semana: parseInt(formData.dia_semana),
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin,
          tolerancia_minutos: parseInt(formData.tolerancia_minutos.toString())
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Horario asignado exitosamente', 'success');
        setIsModalOpen(false);
        fetchHorarios(grupoId);
      } else {
        showAlert(data.detail || 'Error al asignar horario', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const handleDeleteHorario = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este horario?')) return;
    try {
      const res = await authFetch(`/horarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Horario eliminado', 'success');
        fetchHorarios(grupoId);
      } else {
        showAlert('Error al eliminar', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const columns: ColumnDef<Horario>[] = [
    { header: 'Día', accessorKey: 'dia_nombre', align: 'center' },
    { header: 'Inicio', accessorKey: 'hora_inicio', align: 'center' },
    { header: 'Fin', accessorKey: 'hora_fin', align: 'center' },
    { header: 'Tolerancia', align: 'center', cell: (h) => `${h.tolerancia_minutos} min` },
    { 
      header: 'Acciones', 
      align: 'center',
      cell: (h) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="danger" icon={<Trash2 size={16}/>} onClick={() => handleDeleteHorario(h.id)} />
        </div>
      )
    }
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Gestión de Horarios</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <div className="toolbar">
        <select 
          className="form-control" 
          value={grupoId}
          onChange={(e) => setGrupoId(e.target.value)}
        >
          <option value="">Selecciona un grupo...</option>
          {grupos.map(g => (
            <option key={g.id} value={g.id}>{g.materia_nombre} - {g.profesor_nombre} (Aula: {g.aula})</option>
          ))}
        </select>
      </div>

      {grupoId && (
        <DataTable 
          title="Horarios del Grupo"
          columns={columns} 
          data={horarios} 
          keyField="id" 
          loading={loading}
          emptyMessage="Este grupo no tiene horarios asignados"
          actions={
            <Button variant="primary" icon={<Plus size={16}/>} onClick={() => setIsModalOpen(true)}>
              Agregar Horario
            </Button>
          }
        />
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Agregar Horario"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveHorario}>Guardar</Button>
          </>
        }
      >
        <div className="form-group">
          <label>Día de la semana</label>
          <select className="form-control" value={formData.dia_semana} onChange={e => setFormData({...formData, dia_semana: e.target.value})}>
            <option value="0">Lunes</option>
            <option value="1">Martes</option>
            <option value="2">Miércoles</option>
            <option value="3">Jueves</option>
            <option value="4">Viernes</option>
            <option value="5">Sábado</option>
            <option value="6">Domingo</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Hora Inicio</label>
            <input type="time" className="form-control" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Hora Fin</label>
            <input type="time" className="form-control" value={formData.hora_fin} onChange={e => setFormData({...formData, hora_fin: e.target.value})} />
          </div>
        </div>
        <div className="form-group">
          <label>Minutos de Tolerancia (retardo)</label>
          <input type="number" className="form-control" value={formData.tolerancia_minutos} onChange={e => setFormData({...formData, tolerancia_minutos: parseInt(e.target.value)})} />
        </div>
      </Modal>

    </div>
  );
};
