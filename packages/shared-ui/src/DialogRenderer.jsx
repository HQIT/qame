import React from 'react';
import MessageBox from './MessageBox';
import ConfirmDialog from './ConfirmDialog';
import SelectDialog from './SelectDialog';

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

        if (dialog.type === 'select') {
          return (
            <SelectDialog
              key={dialog.id}
              show={true}
              title={dialog.title}
              message={dialog.message}
              options={dialog.options}
              onSelect={dialog.onSelect}
              onCancel={dialog.onCancel}
            />
          );
        }
        
        return null;
      })}
    </>
  );
};

export default DialogRenderer;
