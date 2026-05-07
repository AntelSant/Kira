import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartCardProps {
  title: string;
  children: React.ReactElement;
  className?: string;
  height?: number | string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children, className = '', height = 300 }) => {
  return (
    <div className={`chart-card ${className}`}>
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="card-body" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
