import { useState, useCallback } from 'react';

export const useDialog = () => {
  const [dialogs, setDialogs] = useState([]);

  const showMessage = useCallback((config) => {
    const id = Date.now() + Math.random();
    const dialog = {
      id,
      type: 'message',
      messageType: config.type, // 重命名避免冲突
      ...config,
      onClose: () => {
        setDialogs(prev => prev.filter(d => d.id !== id));
        if (config.onClose) config.onClose();
      }
    };
    setDialogs(prev => [...prev, dialog]);
    return id;
  }, []);

  const showConfirm = useCallback((config) => {
    return new Promise((resolve) => {
      const id = Date.now() + Math.random();
      const dialog = {
        id,
        type: 'confirm',
        ...config,
        onConfirm: () => {
          setDialogs(prev => prev.filter(d => d.id !== id));
          resolve(true);
          if (config.onConfirm) config.onConfirm();
        },
        onCancel: () => {
          setDialogs(prev => prev.filter(d => d.id !== id));
          resolve(false);
          if (config.onCancel) config.onCancel();
        }
      };
      setDialogs(prev => [...prev, dialog]);
    });
  }, []);

  // 便捷方法
  const alert = useCallback((message, type = 'info', title) => {
    return showMessage({ message, type, title });
  }, [showMessage]);

  const success = useCallback((message, title = '成功') => {
    return showMessage({ 
      message, 
      type: 'success', 
      title,
      autoClose: true,
      autoCloseDelay: 3000
    });
  }, [showMessage]);

  const error = useCallback((message, title = '错误') => {
    return showMessage({ message, type: 'error', title });
  }, [showMessage]);

  const warning = useCallback((message, title = '警告') => {
    return showMessage({ message, type: 'warning', title });
  }, [showMessage]);

  const info = useCallback((message, title = '提示') => {
    return showMessage({ 
      message, 
      type: 'info', 
      title,
      autoClose: true,
      autoCloseDelay: 4000
    });
  }, [showMessage]);

  const confirm = useCallback((message, title = '确认操作') => {
    return showConfirm({ message, title });
  }, [showConfirm]);

  const confirmDanger = useCallback((message, title = '危险操作') => {
    return showConfirm({ 
      message, 
      title, 
      confirmButtonStyle: 'danger',
      confirmText: '确定删除'
    });
  }, [showConfirm]);

  const closeAll = useCallback(() => {
    setDialogs([]);
  }, []);

  return {
    dialogs,
    // 基础方法
    showMessage,
    showConfirm,
    // 便捷方法
    alert,
    success,
    error,
    warning,
    info,
    confirm,
    confirmDanger,
    closeAll
  };
};
