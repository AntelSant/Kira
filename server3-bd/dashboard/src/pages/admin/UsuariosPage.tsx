import React, { useEffect, useState, useRef } from 'react';
import { authFetch, apiServer1 } from '../../api/client';
import { Usuario } from '../../types';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Plus, Trash2, Mail, Key, Camera } from 'lucide-react';

export const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ nombre: '', apellido: '', matricula: '', tipo: 'alumno' });
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

  // Face Capture State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captureStep, setCaptureStep] = useState(0);
  const [fotos, setFotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const query = filtroTipo ? `?tipo=${filtroTipo}` : '';
      const data = await authFetch(`/usuarios${query}`).then(res => res.json());
      setUsuarios(data);
    } catch (error) {
      console.error(error);
      showAlert('Error al cargar usuarios', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [filtroTipo]);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSaveUsuario = async () => {
    try {
      const res = await authFetch('/usuarios', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Usuario creado exitosamente', 'success');
        setIsModalOpen(false);
        fetchUsuarios();
        setFormData({ nombre: '', apellido: '', matricula: '', tipo: 'alumno' });
      } else {
        showAlert(data.detail || 'Error al crear usuario', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const handleDeleteUsuario = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      const res = await authFetch(`/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Usuario eliminado', 'success');
        fetchUsuarios();
      } else {
        showAlert('Error al eliminar', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      showAlert('No se pudo acceder a la cámara', 'danger');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const openFaceModal = (user: Usuario) => {
    setSelectedUser(user);
    setCaptureStep(0);
    setFotos([]);
    setIsFaceModalOpen(true);
    startCamera();
  };

  const closeFaceModal = () => {
    stopCamera();
    setIsFaceModalOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || captureStep >= 5) return;
    
    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, 320, 240);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      
      setFotos(prev => [...prev, base64Data]);
      setCaptureStep(prev => prev + 1);
    }
  };

  const submitFotos = async () => {
    if (fotos.length < 5 || !selectedUser) return;
    setIsCapturing(true);

    try {
      // 1. Enviar fotos a Server 1 (Reconocimiento Facial)
      const res1 = await apiServer1('/register_user', {
        method: 'POST',
        body: JSON.stringify({
          id_empleado: selectedUser.matricula,
          fotos: fotos
        })
      });

      if (!res1.ok) throw new Error('Error en Server1');

      // 2. Actualizar estado en Server 3 (DB)
      const res3 = await authFetch(`/usuarios/${selectedUser.id}/embedding`, {
        method: 'PUT'
      });

      if (res3.ok) {
        showAlert('Rostro registrado exitosamente', 'success');
        fetchUsuarios();
      } else {
        throw new Error('Error al actualizar BD');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error en el registro facial', 'danger');
    } finally {
      setIsCapturing(false);
      closeFaceModal();
    }
  };

  const columns: ColumnDef<Usuario>[] = [
    { header: 'ID', accessorKey: 'id', width: '50px' },
    { 
      header: 'Nombre', 
      cell: (user) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user.foto_perfil && <img src={user.foto_perfil} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
          <span>{user.nombre} {user.apellido}</span>
        </div>
      )
    },
    { header: 'Matrícula', cell: (u) => <code>{u.matricula}</code> },
    { header: 'Tipo', cell: (u) => <Badge variant={u.tipo === 'alumno' ? 'info' : 'primary'}>{u.tipo}</Badge> },
    { header: 'Estado', cell: (u) => <Badge variant={u.tiene_embedding ? 'success' : 'warning'}>{u.tiene_embedding ? 'Listo' : 'Pendiente'}</Badge> },
    { 
      header: 'Acciones', 
      cell: (u) => (
        <div style={{ display: 'flex', gap: '5px' }}>
          <Button variant="primary" icon={<Camera size={16}/>} onClick={() => openFaceModal(u)}>Cara</Button>
          <Button variant="outline" icon={<Mail size={16}/>} title="Editar correo" onClick={() => {}} />
          <Button variant="outline" icon={<Key size={16}/>} title="Asignar contraseña" onClick={() => {}} />
          <Button variant="danger" icon={<Trash2 size={16}/>} onClick={() => handleDeleteUsuario(u.id)} />
        </div>
      )
    }
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Gestión de Usuarios</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <div className="toolbar">
        <select 
          className="form-control" 
          style={{ width: '200px' }}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los usuarios</option>
          <option value="alumno">Alumnos</option>
          <option value="profesor">Profesores</option>
        </select>
      </div>

      <DataTable 
        title="Lista de Usuarios"
        columns={columns} 
        data={usuarios} 
        keyField="id" 
        loading={loading}
        actions={
          <Button variant="primary" icon={<Plus size={16}/>} onClick={() => setIsModalOpen(true)}>
            Nuevo Usuario
          </Button>
        }
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nuevo Usuario"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveUsuario}>Guardar</Button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Nombre</label>
            <input type="text" className="form-control" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Apellido</label>
            <input type="text" className="form-control" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Matrícula / Clave</label>
            <input type="text" className="form-control" value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select className="form-control" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="alumno">Alumno</option>
              <option value="profesor">Profesor</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isFaceModalOpen}
        onClose={closeFaceModal}
        title={`Captura Facial: ${selectedUser?.nombre}`}
        footer={
          captureStep >= 5 ? (
            <Button variant="success" block onClick={submitFotos} disabled={isCapturing}>
              {isCapturing ? 'Registrando...' : 'Finalizar y Guardar'}
            </Button>
          ) : (
            <Button variant="primary" block onClick={capturePhoto}>
              Capturar Foto ({captureStep}/5)
            </Button>
          )
        }
      >
        <div style={{ textAlign: 'center' }}>
          <p>Mira a la cámara y captura 5 fotos para el registro facial.</p>
          <div style={{ position: 'relative', width: '320px', height: '240px', margin: '1rem auto', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
          </div>
          <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }}></canvas>
        </div>
      </Modal>

    </div>
  );
};
