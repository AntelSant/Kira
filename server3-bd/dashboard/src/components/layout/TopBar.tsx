import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

// Helpers que leen/escriben el tema directamente en el DOM
function getIsDark(): boolean {
  return !document.documentElement.classList.contains('light-theme');
}

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.remove('light-theme');
    document.body.classList.remove('light-theme');
    localStorage.setItem('kira-theme', 'dark');
  } else {
    document.documentElement.classList.add('light-theme');
    document.body.classList.add('light-theme');
    localStorage.setItem('kira-theme', 'light');
  }
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const [isDark, setIsDark] = React.useState<boolean>(getIsDark);

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
