import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Home, Users, BookOpen, Layers, Clock,
  ClipboardList, CalendarCheck, Smile, ShieldAlert,
  ListChecks, X, User
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
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, end }) => {
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
            <h1>KIRA UAS</h1>
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
              <NavItem to="/admin" icon={<Home size={18} />} label="Inicio" end />

              <div className="nav-section-label">Gestión</div>
              <NavItem to="/admin/usuarios" icon={<Users size={18} />} label="Usuarios" />
              <NavItem to="/admin/materias" icon={<BookOpen size={18} />} label="Materias" />
              <NavItem to="/admin/grupos" icon={<Layers size={18} />} label="Grupos" />
              <NavItem to="/admin/horarios" icon={<Clock size={18} />} label="Horarios" />
              <NavItem to="/admin/inscripciones" icon={<ClipboardList size={18} />} label="Inscripciones" />

              <div className="nav-section-label">Reportes</div>
              <NavItem to="/admin/asistencia" icon={<CalendarCheck size={18} />} label="Asistencia" />
              <NavItem to="/admin/lista-asistencia" icon={<ListChecks size={18} />} label="Lista Asistencia" />
              <NavItem to="/admin/emociones" icon={<Smile size={18} />} label="Emociones" />

              <div className="nav-section-label">Sistema</div>
              <NavItem to="/admin/admins" icon={<ShieldAlert size={18} />} label="Administradores" />
            </>
          )}

          {/* ─── Profesor Links ─── */}
          {role === 'profesor' && (
            <>
              <div className="nav-section-label">Mi Panel</div>
              <NavItem to="/profesor" icon={<Layers size={18} />} label="Mis Grupos" end />
              <NavItem to="/profesor/asistencia" icon={<CalendarCheck size={18} />} label="Asistencia" />
              <NavItem to="/profesor/emociones" icon={<Smile size={18} />} label="Emociones" />
            </>
          )}

          {/* ─── Alumno Links ─── */}
          {role === 'alumno' && (
            <>
              <div className="nav-section-label">Mi Panel</div>
              <NavItem to="/alumno" icon={<BookOpen size={18} />} label="Mis Clases" end />
              <NavItem to="/alumno/asistencia" icon={<CalendarCheck size={18} />} label="Mi Asistencia" />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="admin-info">
            <span className="admin-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#94a3b8" />
            </span>
            <span className="admin-name">{user?.nombre || 'Usuario'}</span>
            <span className="admin-role-badge">{role}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
