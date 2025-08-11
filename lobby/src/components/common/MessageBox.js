import React from 'react';

const MessageBox = ({ 
  show, 
  type = 'info', // 'success', 'error', 'warning', 'info'
  title, 
  message, 
  onClose,
  closeText = '确定',
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  React.useEffect(() => {
    if (show && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [show, autoClose, autoCloseDelay, onClose]);

  if (!show) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          color: '#27ae60',
          backgroundColor: '#d4edda',
          borderColor: '#c3e6cb',
          titleColor: '#155724'
        };
      case 'error':
        return {
          icon: '❌',
          color: '#e74c3c',
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          titleColor: '#721c24'
        };
      case 'warning':
        return {
          icon: '⚠️',
          color: '#f39c12',
          backgroundColor: '#fff3cd',
          borderColor: '#ffeaa7',
          titleColor: '#856404'
        };
      case 'info':
      default:
        return {
          icon: 'ℹ️',
          color: '#3498db',
          backgroundColor: '#d1ecf1',
          borderColor: '#bee5eb',
          titleColor: '#0c5460'
        };
    }
  };

  const config = getTypeConfig();

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '400px',
          maxWidth: '500px',
          margin: '20px',
          border: `2px solid ${config.borderColor}`
        }}
        onClick={handleContentClick}
      >
        {/* 标题栏 */}
        <div style={{
          padding: '20px 20px 15px 20px',
          backgroundColor: config.backgroundColor,
          borderRadius: '6px 6px 0 0',
          borderBottom: `1px solid ${config.borderColor}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>{config.icon}</span>
            <h3 style={{
              margin: 0,
              color: config.titleColor,
              fontSize: '18px',
              fontWeight: 'bold'
            }}>
              {title || type.charAt(0).toUpperCase() + type.slice(1)}
            </h3>
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{
          padding: '20px',
          fontSize: '16px',
          lineHeight: '1.5',
          color: '#555'
        }}>
          {message}
        </div>

        {/* 按钮区域 */}
        <div style={{
          padding: '15px 20px 20px 20px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: config.color,
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              // 调暗颜色作为hover效果
              const darkerColor = config.color.replace(/[89ab]/g, (match) => 
                Math.max(0, parseInt(match, 16) - 2).toString(16)
              );
              e.target.style.backgroundColor = darkerColor;
            }}
            onMouseOut={(e) => e.target.style.backgroundColor = config.color}
          >
            {closeText}
          </button>
        </div>

        {/* 自动关闭进度条 */}
        {autoClose && (
          <div style={{
            height: '3px',
            backgroundColor: config.borderColor,
            borderRadius: '0 0 6px 6px',
            overflow: 'hidden'
          }}>
            <div 
              style={{
                height: '100%',
                backgroundColor: config.color,
                transformOrigin: 'left',
                transform: 'scaleX(1)',
                transition: `transform ${autoCloseDelay}ms linear`,
                animation: `progressShrink ${autoCloseDelay}ms linear forwards`
              }}
            />
            <style>{`
              @keyframes progressShrink {
                from { transform: scaleX(1); }
                to { transform: scaleX(0); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
