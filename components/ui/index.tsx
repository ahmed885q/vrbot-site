// أضف هذه المكونات في components/ui/index.tsx
export const Alert: React.FC<{
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  description?: string;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
  showIcon?: boolean;
}> = ({ type, message, description, closable, onClose, className, showIcon }) => (
  <div className={`alert alert-${type} ${className || ''}`}>
    {showIcon && <span className="alert-icon">{type === 'warning' ? '⚠️' : 'ℹ️'}</span>}
    <div className="alert-content">
      <div className="alert-message">{message}</div>
      {description && <div className="alert-description">{description}</div>}
    </div>
    {closable && (
      <button className="alert-close" onClick={onClose}>×</button>
    )}
  </div>
);