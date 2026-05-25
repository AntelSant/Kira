import React, { useEffect, useState } from 'react';
import { authFetch } from '../../api/client';
import { Grupo, Materia, Usuario } from '../../types';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Plus, Users, ClipboardList, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const GruposPage: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [profesores, setProfesores] = useState<Usuario[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlumnosModalOpen, setIsAlumnosModalOpen] = useState(false);
  const [isInscripcionesModalOpen, setIsInscripcionesModalOpen] = useState(false);
  const [, setSelectedGrupoId] = useState<number | null>(null);
  const [alumnosDelGrupo, setAlumnosDelGrupo] = useState<Usuario[]>([]);
  const [inscripcionesDelGrupo, setInscripcionesDelGrupo] = useState<any[]>([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [loadingInscripciones, setLoadingInscripciones] = useState(false);
  const [formData, setFormData] = useState({ 
    materia_id: '', 
    profesor_id: '',
    aula: '',
    semestre: '',
    periodo: '',
    num_alumnos: 30
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gruposData, materiasData, profesData] = await Promise.all([
        authFetch('/grupos').then(res => res.json()),
        authFetch('/materias').then(res => res.json()),
        authFetch('/usuarios?tipo=profesor').then(res => res.json())
      ]);
      setGrupos(gruposData);
      setMaterias(materiasData);
      setProfesores(profesData);
    } catch (error) {
      console.error(error);
      showAlert('Error al cargar datos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSaveGrupo = async () => {
    try {
      const res = await authFetch('/grupos/registrar', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          materia_id: parseInt(formData.materia_id),
          profesor_id: parseInt(formData.profesor_id),
          num_alumnos: parseInt(formData.num_alumnos.toString())
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showAlert('Grupo creado exitosamente', 'success');
        setIsModalOpen(false);
        fetchData();
        setFormData({ materia_id: '', profesor_id: '', aula: '', semestre: '', periodo: '', num_alumnos: 30 });
      } else {
        showAlert(data.detail || 'Error al crear grupo', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const handleDeleteGrupo = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este grupo?')) return;
    try {
      const res = await authFetch(`/grupos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Grupo eliminado', 'success');
        fetchData();
      } else {
        showAlert('Error al eliminar', 'danger');
      }
    } catch (e) {
      showAlert('Error de conexión', 'danger');
    }
  };

  const columns: ColumnDef<Grupo>[] = [
    { header: 'ID', accessorKey: 'id', width: '80px', align: 'center' },
    { 
      header: 'Materia', 
      align: 'center',
      cell: (g) => <div style={{ textAlign: 'center' }}><strong>{g.materia_nombre}</strong><br/><small>{g.materia_clave}</small></div> 
    },
    { header: 'Profesor', accessorKey: 'profesor_nombre', align: 'center' },
    { header: 'Aula', accessorKey: 'aula', align: 'center' },
    { header: 'Semestre/Periodo', align: 'center', cell: (g) => `${g.semestre} - ${g.periodo}` },
    { header: 'Cupo', accessorKey: 'num_alumnos', align: 'center' },
    {
      header: 'Acciones',
      align: 'center',
      cell: (g) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <Button variant="outline" icon={<Users size={14}/>} title="Ver alumnos" onClick={() => openAlumnosModal(g.id)} />
          <Button variant="outline" icon={<ClipboardList size={14}/>} title="Ver inscripciones" onClick={() => openInscripcionesModal(g.id)} />
          <Button variant="danger" icon={<Trash2 size={14}/>} title="Eliminar" onClick={() => handleDeleteGrupo(g.id)} />
        </div>
      )
    }
  ];

  const openAlumnosModal = async (grupoId: number) => {
    setSelectedGrupoId(grupoId);
    setIsAlumnosModalOpen(true);
    setLoadingAlumnos(true);
    try {
      const data = await authFetch(`/grupos/${grupoId}/alumnos`).then(r => r.json());
      setAlumnosDelGrupo(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAlumnos(false);
    }
  };

  const openInscripcionesModal = async (grupoId: number) => {
    setSelectedGrupoId(grupoId);
    setIsInscripcionesModalOpen(true);
    setLoadingInscripciones(true);
    try {
      const data = await authFetch(`/inscripciones/${grupoId}`).then(r => r.json());
      setInscripcionesDelGrupo(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInscripciones(false);
    }
  };

  const alumnoColumns: ColumnDef<Usuario>[] = [
    { header: 'ID', accessorKey: 'id', align: 'center' },
    { header: 'Nombre', cell: (u) => `${u.nombre} ${u.apellido}`, align: 'center' },
    { header: 'Matrícula', cell: (u) => <code>{u.matricula}</code>, align: 'center' },
    { header: 'Tipo', cell: (u) => <Badge variant={u.tipo === 'alumno' ? 'info' : 'primary'}>{u.tipo}</Badge>, align: 'center' },
    { header: 'Email', accessorKey: 'email', align: 'center' },
  ];

  const inscripcionColumns: ColumnDef<any>[] = [
    { header: 'ID', accessorKey: 'inscripcion_id', align: 'center' },
    { header: 'Alumno ID', accessorKey: 'alumno_id', align: 'center' },
    { header: 'Nombre', accessorKey: 'nombre', align: 'center' },
    { header: 'Matrícula', cell: (r) => <code>{r.matricula}</code>, align: 'center' },
  ];

  return (
    <div className="page-section active">
      <div className="section-header">
        <h1>Gestión de Grupos</h1>
      </div>

      {alert && <Alert variant={alert.type} message={alert.message} className="mb-4" />}

      <DataTable 
        title="Lista de Grupos"
        columns={columns} 
        data={grupos} 
        keyField="id" 
        loading={loading}
        actions={
          <Button variant="primary" icon={<Plus size={16}/>} onClick={() => setIsModalOpen(true)}>
            Nuevo Grupo
          </Button>
        }
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nuevo Grupo Escolar"
        size="large"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveGrupo}>Guardar</Button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Materia</label>
            <select className="form-control" value={formData.materia_id} onChange={e => setFormData({...formData, materia_id: e.target.value})}>
              <option value="">Selecciona una materia...</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.clave})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Profesor Asignado</label>
            <select className="form-control" value={formData.profesor_id} onChange={e => setFormData({...formData, profesor_id: e.target.value})}>
              <option value="">Selecciona un profesor...</option>
              {profesores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Aula</label>
            <input type="text" className="form-control" value={formData.aula} onChange={e => setFormData({...formData, aula: e.target.value})} placeholder="Ej. A-101" />
          </div>
          <div className="form-group">
            <label>Cupo de Alumnos</label>
            <input type="number" className="form-control" value={formData.num_alumnos} onChange={e => setFormData({...formData, num_alumnos: parseInt(e.target.value)})} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Semestre</label>
            <input type="text" className="form-control" value={formData.semestre} onChange={e => setFormData({...formData, semestre: e.target.value})} placeholder="Ej. 1" />
          </div>
          <div className="form-group">
            <label>Periodo</label>
            <input type="text" className="form-control" value={formData.periodo} onChange={e => setFormData({...formData, periodo: e.target.value})} placeholder="Ej. 2024-1" />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAlumnosModalOpen}
        onClose={() => setIsAlumnosModalOpen(false)}
        title="Alumnos del Grupo"
        size="large"
        footer={
          <Button variant="outline" onClick={() => setIsAlumnosModalOpen(false)}>Cerrar</Button>
        }
      >
        <DataTable
          title={`Alumnos (${alumnosDelGrupo.length})`}
          columns={alumnoColumns}
          data={alumnosDelGrupo}
          keyField="id"
          loading={loadingAlumnos}
          emptyMessage="No hay alumnos en este grupo"
        />
      </Modal>

      <Modal
        isOpen={isInscripcionesModalOpen}
        onClose={() => setIsInscripcionesModalOpen(false)}
        title="Inscripciones del Grupo"
        size="large"
        footer={
          <Button variant="outline" onClick={() => setIsInscripcionesModalOpen(false)}>Cerrar</Button>
        }
      >
        <DataTable
          title={`Inscripciones (${inscripcionesDelGrupo.length})`}
          columns={inscripcionColumns}
          data={inscripcionesDelGrupo}
          keyField="inscripcion_id"
          loading={loadingInscripciones}
          emptyMessage="No hay inscripciones en este grupo"
        />
      </Modal>
    </div>
  );
};
