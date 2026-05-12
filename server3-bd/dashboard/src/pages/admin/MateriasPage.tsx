import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Materia } from '../../types';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Plus } from 'lucide-react';

export const MateriasPage: React.FC = () => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', clave: '' });

  const fetchMaterias = async () => {
    setLoading(true);
    try {
      const data = await authFetch('/materias').then(res => res.json());
      setMaterias(data);
    } catch (error) {
      console.error(error);
      showAlert('Error al cargar materias', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterias();
  }, []);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSaveMateria = async () => {
    try {
      const res = await authFetch('/materias/registrar', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Materia creada exitosamente', 'success');
        setIsModalOpen(false);
        fetchMaterias();
        setFormData({ nombre: '', clave: '' });
      } else {
        showAlert(data.detail || 'Error al crear materia', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const columns: ColumnDef<Materia>[] = [
    { header: 'ID', accessorKey: 'id', width: '80px', align: 'center' },
    { header: 'Nombre', accessorKey: 'nombre', align: 'center' },
    { header: 'Clave', align: 'center', cell: (m) => <code>{m.clave}</code> }
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Gestión de Materias</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <DataTable 
        title="Catálogo de Materias"
        columns={columns} 
        data={materias} 
        keyField="id" 
        loading={loading}
        actions={
          <Button variant="primary" icon={<Plus size={16}/>} onClick={() => setIsModalOpen(true)}>
            Nueva Materia
          </Button>
        }
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nueva Materia"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveMateria}>Guardar</Button>
          </>
        }
      >
        <div className="form-group">
          <label>Nombre de la Materia</label>
          <input type="text" className="form-control" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Clave (Opcional)</label>
          <input type="text" className="form-control" value={formData.clave} onChange={e => setFormData({...formData, clave: e.target.value})} />
        </div>
      </Modal>

    </div>
  );
};
