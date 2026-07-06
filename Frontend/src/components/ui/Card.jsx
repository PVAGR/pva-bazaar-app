import React from 'react';
import './Card.css';

export default function Card({ as: Tag = 'section', className = '', ...props }) {
  return <Tag className={`uiCard ${className}`.trim()} {...props} />;
}
