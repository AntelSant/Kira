interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message, 
}) => {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
};
