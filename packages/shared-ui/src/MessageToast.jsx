import React, { useState, useEffect } from 'react';

const MessageToast = ({ message, type, duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // 等待动画完成
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const getStyle = () => {
    const baseStyle = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '6px',
      color: 'white',
      fontWeight: 'bold',
      zIndex: 10000,
      transition: 'all 0.3s ease-in-out',
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      opacity: visible ? 1 : 0,
      maxWidth: '400px',
      wordWrap: 'break-word',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    };

    const typeStyles = {
      success: { backgroundColor: '#28a745' },
      error: { backgroundColor: '#dc3545' },
      info: { backgroundColor: '#007bff' },
      warning: { backgroundColor: '#ffc107', color: '#000' }
    };

    return { ...baseStyle, ...typeStyles[type] };
  };

  return (
    <div style={getStyle()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{message}</span>
        <button
          onClick={() => {
            setVisible(false);
            if (onClose) {
              setTimeout(onClose, 300);
            }
          }}
          style={{
            marginLeft: '12px',
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 4px'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Toast管理器
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ top: `${20 + index * 70}px` }}>
          <MessageToast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );

  return {
    showToast,
    ToastContainer,
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    info: (message, duration) => showToast(message, 'info', duration),
    warning: (message, duration) => showToast(message, 'warning', duration)
  };
};

export default MessageToast;