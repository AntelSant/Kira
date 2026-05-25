import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

type AlertVariant = 'success' | 'danger' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ variant = 'info', message, onClose, className = '' }) => {
  const getIcon = () => {
    switch (variant) {
      case 'success': return <CheckCircle size={20} />;
      case 'danger': return <XCircle size={20} />;
      case 'warning': return <AlertCircle size={20} />;
      case 'info': return <Info size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div className={`alert alert-${variant} ${className}`}>
      <div className="alert-icon">{getIcon()}</div>
      <div className="alert-message">{message}</div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      )}
    </div>
  );
};
