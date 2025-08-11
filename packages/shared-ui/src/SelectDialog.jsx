import React from 'react';

const SelectDialog = ({ show, title = '请选择', message, options = [], onSelect, onCancel }) => {
  if (!show) return null;

  const handleContentClick = (e) => e.stopPropagation();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: 360,
          maxWidth: 520,
          margin: 20,
        }}
        onClick={handleContentClick}
      >
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#2c3e50' }}>{title}</h3>
        </div>
        {message && (
          <div style={{ padding: 16, fontSize: 14, color: '#666' }}>{message}</div>
        )}
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(idx)}
                style={{
                  textAlign: 'left',
                  background: '#f8f9fa',
                  border: '1px solid #ecf0f1',
                  borderRadius: 6,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#eef2f5')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#f8f9fa')}
              >
                {typeof opt === 'string' ? opt : opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '10px 16px 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectDialog;


