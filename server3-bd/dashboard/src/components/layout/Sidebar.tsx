import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Home, 
  Users, 
  BookOpen, 
  Layers, 
  Clock, 
  ClipboardList, 
  CalendarCheck, 
  Smile, 
  ShieldAlert 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-placeholder"></div>
          <h2>Kira UAS</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {/* Admin Links */}
            {role === 'admin' && (
              <>
                <li>
                  <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <Home size={20} />
                    <span>Inicio</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/usuarios" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <Users size={20} />
                    <span>Usuarios</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/materias" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <BookOpen size={20} />
                    <span>Materias</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/grupos" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <Layers size={20} />
                    <span>Grupos</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/horarios" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <Clock size={20} />
                    <span>Horarios</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/inscripciones" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <ClipboardList size={20} />
                    <span>Inscripciones</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/asistencia" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <CalendarCheck size={20} />
                    <span>Asistencia</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/emociones" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <Smile size={20} />
                    <span>Emociones</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/admins" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <ShieldAlert size={20} />
                    <span>Admins</span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Profesor Links */}
            {role === 'profesor' && (
              <>
                <li>
                  <NavLink to="/profesor" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <Layers size={20} />
                    <span>Mis Grupos</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/profesor/asistencia" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <CalendarCheck size={20} />
                    <span>Asistencia</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/profesor/emociones" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <Smile size={20} />
                    <span>Emociones</span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Alumno Links */}
            {role === 'alumno' && (
              <>
                <li>
                  <NavLink to="/alumno" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <BookOpen size={20} />
                    <span>Mis Clases</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/alumno/asistencia" className={({ isActive }) => isActive ? 'active' : ''} onClick={onClose}>
                    <CalendarCheck size={20} />
                    <span>Mi Asistencia</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
};
