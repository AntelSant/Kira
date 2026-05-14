import React from 'react';
import { Menu, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onMenuClick: () => void;
}

// Lee el tema guardado o devuelve 'dark' por defecto
function getSavedIsDark(): boolean {
  const saved = localStorage.getItem('kira-theme');
  return saved !== 'light';
}

// Aplica la clase al DOM
function applyTheme(dark: boolean) {
  const cl = document.documentElement.classList;
  const bl = document.body.classList;
  if (dark) {
    cl.remove('light-theme');
    bl.remove('light-theme');
  } else {
    cl.add('light-theme');
    bl.add('light-theme');
  }
  localStorage.setItem('kira-theme', dark ? 'dark' : 'light');
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const [isDark, setIsDark] = React.useState<boolean>(getSavedIsDark);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Restaurar el tema correcto al montar
  React.useEffect(() => {
    applyTheme(isDark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    const next = !isDark;
    applyTheme(next);
    setIsDark(next);
  };

  return (
    <div className="top-bar" style={{ position: 'relative', zIndex: 10 }}>
      <button className="sidebar-toggle" onClick={onMenuClick}>
        <Menu size={20} />
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          id="theme-toggle"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title="Cambiar Tema"
          type="button"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          id="logout-btn"
          className="theme-toggle-btn"
          onClick={() => { logout(); navigate('/login'); }}
          title="Cerrar Sesión"
          type="button"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

