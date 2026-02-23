import React from 'react';
import './Button.css';

/**
 * Button
 * Small wrapper to standardize button styling across admin pages.
 */
export default function Button({ variant = 'ghost', className = '', type = 'button', ...props }) {
  const cls = `uiBtn uiBtn--${variant} ${className}`.trim();
  return <button type={type} className={cls} {...props} />;
}

