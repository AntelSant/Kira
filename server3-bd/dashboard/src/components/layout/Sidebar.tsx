import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Home, Users, BookOpen, Layers, Clock, 
  ClipboardList, CalendarCheck, Smile, ShieldAlert,
  ListChecks, X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  onClose: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, end, onClose }) => {
  const location = useLocation();

  // For "end" routes (like /admin), only match exact path
  const isActive = end 
    ? location.pathname === to 
    : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      end={end}
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={onClose}
    >
      <span className="icon">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role, user } = useAuth();

  return (
    <>
      {/* Overlay para móvil */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />

      <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1>Kira UAS</h1>
            <button className="sidebar-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <p>Sistema de Gestión Escolar</p>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* ─── Admin Links ─── */}
          {role === 'admin' && (
            <>
              <div className="nav-section-label">Principal</div>
              <NavItem to="/admin" icon={<Home size={18} />} label="Inicio" end onClose={onClose} />

              <div className="nav-section-label">Gestión</div>
              <NavItem to="/admin/usuarios" icon={<Users size={18} />} label="Usuarios" onClose={onClose} />
              <NavItem to="/admin/materias" icon={<BookOpen size={18} />} label="Materias" onClose={onClose} />
              <NavItem to="/admin/grupos" icon={<Layers size={18} />} label="Grupos" onClose={onClose} />
              <NavItem to="/admin/horarios" icon={<Clock size={18} />} label="Horarios" onClose={onClose} />
              <NavItem to="/admin/inscripciones" icon={<ClipboardList size={18} />} label="Inscripciones" onClose={onClose} />

              <div className="nav-section-label">Reportes</div>
              <NavItem to="/admin/asistencia" icon={<CalendarCheck size={18} />} label="Asistencia" onClose={onClose} />
              <NavItem to="/admin/lista-asistencia" icon={<ListChecks size={18} />} label="Lista Asistencia" onClose={onClose} />
              <NavItem to="/admin/emociones" icon={<Smile size={18} />} label="Emociones" onClose={onClose} />

              <div className="nav-section-label">Sistema</div>
              <NavItem to="/admin/admins" icon={<ShieldAlert size={18} />} label="Administradores" onClose={onClose} />
            </>
          )}

          {/* ─── Profesor Links ─── */}
          {role === 'profesor' && (
            <>
              <div className="nav-section-label">Mi Panel</div>
              <NavItem to="/profesor" icon={<Layers size={18} />} label="Mis Grupos" end onClose={onClose} />
              <NavItem to="/profesor/asistencia" icon={<CalendarCheck size={18} />} label="Asistencia" onClose={onClose} />
              <NavItem to="/profesor/emociones" icon={<Smile size={18} />} label="Emociones" onClose={onClose} />
            </>
          )}

          {/* ─── Alumno Links ─── */}
          {role === 'alumno' && (
            <>
              <div className="nav-section-label">Mi Panel</div>
              <NavItem to="/alumno" icon={<BookOpen size={18} />} label="Mis Clases" end onClose={onClose} />
              <NavItem to="/alumno/asistencia" icon={<CalendarCheck size={18} />} label="Mi Asistencia" onClose={onClose} />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="admin-info">
            <span className="admin-avatar">👤</span>
            <span className="admin-name">{user?.nombre || 'Usuario'}</span>
            <span className="admin-role-badge">{role}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
