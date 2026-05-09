import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, gradient = 'grad-cyan', className = '' }) => {
  return (
    <div className={`stat-card ${className}`}>
      <div className={`stat-icon ${gradient}`}>
        {icon}
      </div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{title}</p>
        {subtitle && <p style={{ fontSize: '0.7rem', opacity: 0.7 }}>{subtitle}</p>}
      </div>
    </div>
  );
};
