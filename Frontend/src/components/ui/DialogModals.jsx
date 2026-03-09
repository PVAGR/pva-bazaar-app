import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

// AlertModal - Replaces alert()
export function AlertModal({ isOpen, onClose, title = 'Alert', message, buttonText = 'OK' }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <Button onClick={onClose} variant="primary">
          {buttonText}
        </Button>
      }
    >
      <p style={{ margin: 0, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// ConfirmModal - Replaces confirm()
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      closeOnBackdrop={false}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            {cancelText}
          </Button>
          <Button onClick={handleConfirm} variant={variant}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// PromptModal - Replaces prompt()
export function PromptModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Input',
  message,
  placeholder = '',
  defaultValue = '',
  confirmText = 'Submit',
  cancelText = 'Cancel',
  inputType = 'text',
}) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (value.trim()) {
      onSubmit(value);
      onClose();
      setValue(defaultValue);
    }
  };

  const handleClose = () => {
    onClose();
    setValue(defaultValue);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      closeOnBackdrop={false}
      footer={
        <>
          <Button onClick={handleClose} variant="secondary">
            {cancelText}
          </Button>
          <Button onClick={handleSubmit} variant="primary" disabled={!value.trim()}>
            {confirmText}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {message && <p style={{ marginTop: 0, marginBottom: '1rem', lineHeight: 1.6 }}>{message}</p>}
        <input
          type={inputType}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--site-border)',
            borderRadius: '6px',
            fontSize: '1rem',
            background: 'var(--site-bg)',
            color: 'var(--site-text)',
          }}
        />
      </form>
    </Modal>
  );
}
