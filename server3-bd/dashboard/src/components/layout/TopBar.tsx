import React, { useState } from 'react';
import { Menu, Sun, Moon } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
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
      </div>
    </div>
  );
};
