import React from 'react';
import MessageBox from './MessageBox';
import ConfirmDialog from './ConfirmDialog';

const DialogRenderer = ({ dialogs }) => {
  return (
    <>
      {dialogs.map(dialog => {
        if (dialog.type === 'message') {
          return (
            <MessageBox
              key={dialog.id}
              show={true}
              type={dialog.messageType || 'info'}
              title={dialog.title}
              message={dialog.message}
              onClose={dialog.onClose}
              closeText={dialog.closeText}
              autoClose={dialog.autoClose}
              autoCloseDelay={dialog.autoCloseDelay}
            />
          );
        }
        
        if (dialog.type === 'confirm') {
          return (
            <ConfirmDialog
              key={dialog.id}
              show={true}
              title={dialog.title}
              message={dialog.message}
              onConfirm={dialog.onConfirm}
              onCancel={dialog.onCancel}
              confirmText={dialog.confirmText}
              cancelText={dialog.cancelText}
              confirmButtonStyle={dialog.confirmButtonStyle}
            />
          );
        }
        
        return null;
      })}
    </>
  );
};

export default DialogRenderer;
