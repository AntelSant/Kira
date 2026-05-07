import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    // Sync initial state
    setIsDark(!document.body.classList.contains('light-theme'));
  }, []);

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button className="menu-toggle" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
      </div>
      <div className="top-bar-right">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Cambiar Tema">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="user-profile">
          <span className="user-name">{user?.nombre} {user?.apellido} ({role})</span>
          <button className="btn-logout" onClick={logout} title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
