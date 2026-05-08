import React, { useState } from 'react';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout, role } = useAuth();
  const [isDark, setIsDark] = useState(!document.body.classList.contains('light-theme'));

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.add('light-theme');
      setIsDark(false);
    } else {
      document.body.classList.remove('light-theme');
      setIsDark(true);
    }
  };

  return (
    <div className="top-bar">
      <button className="sidebar-toggle" onClick={onMenuClick}>
        <Menu size={20} />
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Cambiar Tema">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="admin-info" style={{ background: 'transparent', padding: '4px 0' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user?.nombre} ({role})
          </span>
          <button className="btn-logout" style={{ width: 'auto', padding: '6px 12px' }} onClick={logout} title="Cerrar Sesión">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
