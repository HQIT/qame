import React from 'react';

const ConfirmDialog = ({ 
  show, 
  title = '确认操作', 
  message, 
  onConfirm, 
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  confirmButtonStyle = 'danger' // 'danger', 'primary', 'success'
}) => {
  if (!show) return null;

  const getConfirmButtonColor = () => {
    switch (confirmButtonStyle) {
      case 'danger':
        return '#e74c3c';
      case 'primary':
        return '#3498db';
      case 'success':
        return '#27ae60';
      default:
        return '#e74c3c';
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  // 阻止点击对话框内容时关闭
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
      onClick={handleCancel}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '400px',
          maxWidth: '500px',
          margin: '20px'
        }}
        onClick={handleContentClick}
      >
        {/* 标题栏 */}
        <div style={{
          padding: '20px 20px 15px 20px',
          borderBottom: '1px solid #eee'
        }}>
          <h3 style={{
            margin: 0,
            color: '#2c3e50',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            {title}
          </h3>
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
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={handleCancel}
            style={{
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#7f8c8d'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#95a5a6'}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              backgroundColor: getConfirmButtonColor(),
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
              const currentColor = getConfirmButtonColor();
              // 稍微调暗颜色作为hover效果
              const darkerColor = currentColor.replace(/[89ab]/g, (match) => 
                (parseInt(match, 16) - 1).toString(16)
              );
              e.target.style.backgroundColor = darkerColor;
            }}
            onMouseOut={(e) => e.target.style.backgroundColor = getConfirmButtonColor()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
