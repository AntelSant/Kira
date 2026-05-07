import React from 'react';
import { Database } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message, 
  icon = <Database size={48} opacity={0.5} /> 
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon}
      </div>
      <p>{message}</p>
    </div>
  );
};
