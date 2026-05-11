import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Usuario } from '../../types';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Plus, Trash2 } from 'lucide-react';

export const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', nombre: '' });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      // Assuming admins endpoint returns list of admins
      const data = await authFetch('/admins').then(res => res.json());
      setAdmins(data);
    } catch (error) {
      console.error(error);
      showAlert('Error al cargar administradores', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSaveAdmin = async () => {
    try {
      const res = await authFetch('/admins', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Administrador creado exitosamente', 'success');
        setIsModalOpen(false);
        fetchAdmins();
        setFormData({ email: '', password: '', nombre: '' });
      } else {
        showAlert(data.detail || 'Error al crear administrador', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este administrador? No podrás deshacer esta acción.')) return;
    try {
      const res = await authFetch(`/admins/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Administrador eliminado', 'success');
        fetchAdmins();
      } else {
        showAlert('Error al eliminar', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const columns: ColumnDef<Usuario>[] = [
    { header: 'ID', accessorKey: 'id', width: '50px', align: 'center' },
    { header: 'Nombre', accessorKey: 'nombre', align: 'center' },
    { header: 'Email / Usuario', align: 'center', cell: (u) => <code>{u.email}</code> },
    { header: 'Rol', align: 'center', cell: () => <Badge variant="primary">Admin</Badge> },
    { 
      header: 'Acciones', 
      align: 'center',
      cell: (u) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="danger" icon={<Trash2 size={16}/>} onClick={() => handleDeleteAdmin(u.id)} />
        </div>
      )
    }
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Gestión de Administradores</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <DataTable 
        title="Lista de Administradores"
        columns={columns} 
        data={admins} 
        keyField="id" 
        loading={loading}
        actions={
          <Button variant="primary" icon={<Plus size={16}/>} onClick={() => setIsModalOpen(true)}>
            Nuevo Admin
          </Button>
        }
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nuevo Administrador"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveAdmin}>Guardar</Button>
          </>
        }
      >
        <div className="form-group">
          <label>Nombre</label>
          <input type="text" className="form-control" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej. Admin Principal" />
        </div>
        <div className="form-group">
          <label>Email / Usuario</label>
          <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="admin@kira.uas.edu.mx" />
        </div>
        <div className="form-group">
          <label>Contraseña</label>
          <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
        </div>
      </Modal>

    </div>
  );
};
