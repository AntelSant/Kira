import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline';
  icon?: React.ReactNode;
  block?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  icon,
  block = false,
  className = '',
  ...props
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    block ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {icon && <span className="btn-icon-wrapper">{icon}</span>}
      {children}
    </button>
  );
};
