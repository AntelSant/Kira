import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <Outlet />
      </div>
    </div>
  );
};
