import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';

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
    <div className="top-bar">
      <button className="sidebar-toggle" onClick={onMenuClick}>
        <Menu size={20} />
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Cambiar Tema">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
};
