import React, { useEffect, useState, useRef } from 'react';
import { authFetch } from '../../api/client';
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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ nombre: '', apellido: '', matricula: '', tipo: 'alumno' });
  const [emailData, setEmailData] = useState('');
  const [passwordData, setPasswordData] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

  // Face Capture State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captureStep, setCaptureStep] = useState(0);
  const [fotos, setFotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);

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
    if (!fotoFile) {
      setModalError('La foto de perfil es obligatoria');
      return;
    }
    setModalError(null);

    try {
      const form = new FormData();
      form.append('nombre', formData.nombre);
      form.append('apellido', formData.apellido);
      form.append('matricula', formData.matricula);
      form.append('tipo', formData.tipo);
      form.append('foto', fotoFile);

      const res = await authFetch('/usuarios/registrar', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Usuario creado exitosamente', 'success');
        setIsModalOpen(false);
        fetchUsuarios();
        setFormData({ nombre: '', apellido: '', matricula: '', tipo: 'alumno' });
        setFotoFile(null);
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

  const handleSaveEmail = async () => {
    if (!selectedUser || !emailData) return;
    try {
      const res = await authFetch(`/usuarios/${selectedUser.id}/set-email`, {
        method: 'PUT',
        body: JSON.stringify({ email: emailData })
      });
      if (res.ok) {
        showAlert('Correo actualizado', 'success');
        setIsEmailModalOpen(false);
        fetchUsuarios();
      } else {
        const data = await res.json();
        showAlert(data.detail || 'Error al actualizar correo', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const handleSavePassword = async () => {
    if (!selectedUser || !passwordData) return;
    if (passwordData.length < 6) {
      showAlert('La contraseña debe tener al menos 6 caracteres', 'danger');
      return;
    }
    try {
      const res = await authFetch(`/usuarios/${selectedUser.id}/set-password`, {
        method: 'PUT',
        body: JSON.stringify({ password: passwordData })
      });
      if (res.ok) {
        showAlert('Contraseña asignada', 'success');
        setIsPasswordModalOpen(false);
        setPasswordData('');
      } else {
        const data = await res.json();
        showAlert(data.detail || 'Error al asignar contraseña', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const openEmailModal = (user: Usuario) => {
    setSelectedUser(user);
    setEmailData(user.email || '');
    setIsEmailModalOpen(true);
  };

  const openPasswordModal = (user: Usuario) => {
    setSelectedUser(user);
    setPasswordData('');
    setIsPasswordModalOpen(true);
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
    setIsFrozen(false);
    setFaceError(null);
    setIsFaceModalOpen(true);
    startCamera();
  };

  const closeFaceModal = () => {
    stopCamera();
    setIsFrozen(false);
    setFaceError(null);
    setIsFaceModalOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || captureStep >= 1) return;
    
    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, 320, 240);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      
      setFotos(prev => [...prev, base64Data]);
      setCaptureStep(prev => prev + 1);
      setIsFrozen(true);
      setFaceError(null);
    }
  };

  const retakePhoto = () => {
    setFotos([]);
    setCaptureStep(0);
    setIsFrozen(false);
    setFaceError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64Data = dataUrl.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, "");
      // Simulamos 1 captura
      setFotos([base64Data]);
      setCaptureStep(1);
      setIsFrozen(true);
      setFaceError(null);
      
      // Dibujar la imagen subida en el canvas para mostrarla
      const img = new window.Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, 320, 240);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const submitFotos = async () => {
    if (fotos.length < 1 || !selectedUser) return;
    setIsCapturing(true);
    setFaceError(null);

    try {
      const res1 = await authFetch('/proxy/registrar-cara', {
        method: 'POST',
        body: JSON.stringify({
          matricula: selectedUser.matricula,
          foto_base64: fotos[0]
        })
      });

      if (!res1.ok) {
        const err = await res1.json();
        const errorMsg = err.detail || 'Error en el registro facial';
        setFaceError(errorMsg);
        setFotos([]);
        setCaptureStep(0);
        setIsFrozen(false);
        setIsCapturing(false);
        return; // No cerramos el modal
      }

      showAlert('Rostro registrado exitosamente', 'success');
      fetchUsuarios();
      closeFaceModal();
    } catch (error) {
      console.error(error);
      setFaceError('Error de conexión con el servidor');
      setFotos([]);
      setCaptureStep(0);
      setIsFrozen(false);
    } finally {
      setIsCapturing(false);
    }
  };

  const columns: ColumnDef<Usuario>[] = [
    { header: 'ID', accessorKey: 'id', width: '50px', align: 'center' },
    { 
      header: 'Nombre', 
      align: 'center',
      cell: (user) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {user.foto_perfil && <img src={user.foto_perfil} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
          <span>{user.nombre} {user.apellido}</span>
        </div>
      )
    },
    { header: 'Matrícula', align: 'center', cell: (u) => <code>{u.matricula}</code> },
    { header: 'Tipo', align: 'center', cell: (u) => <Badge variant={u.tipo === 'alumno' ? 'info' : 'primary'}>{u.tipo}</Badge> },
    { header: 'Estado', align: 'center', cell: (u) => <Badge variant={u.tiene_embedding ? 'success' : 'warning'}>{u.tiene_embedding ? 'Listo' : 'Pendiente'}</Badge> },
    { 
      header: 'Acciones', 
      align: 'center',
      cell: (u) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
          <Button variant="primary" icon={<Camera size={16}/>} onClick={() => openFaceModal(u)}>Cara</Button>
          <Button variant="outline" icon={<Mail size={16}/>} title="Editar correo" onClick={() => openEmailModal(u)} />
          <Button variant="outline" icon={<Key size={16}/>} title="Asignar contraseña" onClick={() => openPasswordModal(u)} />
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

      <div className="toolbar" style={{ marginBottom: '24px' }}>
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
          <Button variant="primary" icon={<Plus size={16}/>} onClick={() => { setIsModalOpen(true); setModalError(null); }}>
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
        <div className="form-row">
          <div className="form-group" style={{ width: '100%' }}>
            <label>Foto de Perfil</label>
            <input type="file" className="form-control" accept="image/*" onChange={e => { setFotoFile(e.target.files?.[0] || null); setModalError(null); }} />
          </div>
        </div>
        {modalError && (
          <div className="form-group" style={{ width: '100%' }}>
            <div className="alert alert-danger" style={{ marginTop: '8px', padding: '10px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {modalError}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isFaceModalOpen}
        onClose={closeFaceModal}
        title={`Captura Facial: ${selectedUser?.nombre}`}
        footer={
          captureStep >= 1 ? (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <Button variant="outline" onClick={retakePhoto} disabled={isCapturing}>
                Reintentar
              </Button>
              <Button variant="success" block onClick={submitFotos} disabled={isCapturing}>
                {isCapturing ? 'Registrando...' : 'Finalizar y Guardar'}
              </Button>
            </div>
          ) : (
            <Button variant="primary" block onClick={capturePhoto}>
              Capturar Foto
            </Button>
          )
        }
      >
        <div style={{ textAlign: 'center' }}>
          <p>Mira a la cámara y captura 1 foto para el registro facial.</p>
          
          {faceError && (
            <div style={{
              margin: '0.5rem auto 1rem',
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              maxWidth: '320px',
              fontSize: '14px'
            }}>
              ⚠️ {faceError}
            </div>
          )}
          
          <div style={{ position: 'relative', width: '320px', height: '240px', margin: '1rem auto', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: isFrozen ? 'none' : 'block' }}></video>
            <canvas ref={canvasRef} width={320} height={240} style={{ width: '100%', height: '100%', objectFit: 'cover', display: isFrozen ? 'block' : 'none' }}></canvas>
          </div>
          
          {!isFrozen && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#999' }}>¿O prefieres subir una foto desde tu dispositivo?</p>
              <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #4a4a4a', background: '#2a2a2a', color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                <Camera size={16} /> Subir Imagen
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={`Editar Correo: ${selectedUser?.nombre}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEmailModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveEmail}>Guardar</Button>
          </>
        }
      >
        <div className="form-group">
          <label>Correo electrónico</label>
          <input
            type="email"
            className="form-control"
            value={emailData}
            onChange={e => setEmailData(e.target.value)}
            placeholder="correo@kira.uas.edu.mx"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Asignar Contraseña: ${selectedUser?.nombre}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSavePassword}>Guardar</Button>
          </>
        }
      >
        <div className="form-group">
          <label>Nueva contraseña</label>
          <input
            type="password"
            className="form-control"
            value={passwordData}
            onChange={e => setPasswordData(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
      </Modal>

    </div>
  );
};
