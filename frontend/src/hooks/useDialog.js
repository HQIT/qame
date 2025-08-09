import React, { useState, useCallback, useContext, createContext } from 'react';
import DialogRenderer from '../components/common/DialogRenderer';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState([]);

  const showMessage = useCallback((config) => {
    const id = Date.now() + Math.random();
    const dialog = {
      id,
      type: 'message',
      messageType: config.type,
      ...config,
      onClose: () => {
        setDialogs((prev) => prev.filter((d) => d.id !== id));
        if (config.onClose) config.onClose();
      },
    };
    setDialogs((prev) => [...prev, dialog]);
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
          setDialogs((prev) => prev.filter((d) => d.id !== id));
          resolve(true);
          if (config.onConfirm) config.onConfirm();
        },
        onCancel: () => {
          setDialogs((prev) => prev.filter((d) => d.id !== id));
          resolve(false);
          if (config.onCancel) config.onCancel();
        },
      };
      setDialogs((prev) => [...prev, dialog]);
    });
  }, []);

  const showSelect = useCallback((config) => {
    return new Promise((resolve) => {
      const id = Date.now() + Math.random();
      const dialog = {
        id,
        type: 'select',
        options: config.options || [],
        title: config.title || '请选择',
        message: config.message,
        onSelect: (index) => {
          setDialogs((prev) => prev.filter((d) => d.id !== id));
          resolve(index);
          if (config.onSelect) config.onSelect(index);
        },
        onCancel: () => {
          setDialogs((prev) => prev.filter((d) => d.id !== id));
          resolve(null);
          if (config.onCancel) config.onCancel();
        },
      };
      setDialogs((prev) => [...prev, dialog]);
    });
  }, []);

  const alert = useCallback((message, type = 'info', title) => {
    return showMessage({ message, type, title });
  }, [showMessage]);

  const success = useCallback(
    (message, title = '成功') =>
      showMessage({ message, type: 'success', title, autoClose: true, autoCloseDelay: 3000 }),
    [showMessage]
  );

  const error = useCallback((message, title = '错误') => showMessage({ message, type: 'error', title }), [showMessage]);
  const warning = useCallback((message, title = '警告') => showMessage({ message, type: 'warning', title }), [showMessage]);
  const info = useCallback(
    (message, title = '提示') => showMessage({ message, type: 'info', title, autoClose: true, autoCloseDelay: 4000 }),
    [showMessage]
  );
  const confirm = useCallback((message, title = '确认操作') => showConfirm({ message, title }), [showConfirm]);
  const confirmDanger = useCallback(
    (message, title = '危险操作') => showConfirm({ message, title, confirmButtonStyle: 'danger', confirmText: '确定删除' }),
    [showConfirm]
  );
  const closeAll = useCallback(() => setDialogs([]), []);

  const value = {
    dialogs,
    showMessage,
    showConfirm,
    showSelect,
    alert,
    success,
    error,
    warning,
    info,
    confirm,
    confirmDanger,
    closeAll,
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      <DialogRenderer dialogs={dialogs} />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (ctx) return ctx;
  // 兼容未包裹Provider的场景：降级为无UI实现
  return {
    dialogs: [],
    showMessage: () => {},
    showConfirm: async () => false,
    showSelect: async () => null,
    alert: () => {},
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
    confirm: async () => false,
    confirmDanger: async () => false,
    closeAll: () => {},
  };
};
