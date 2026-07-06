import React from 'react';
import './SectionHeader.css';

export default function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="uiSectionHeader">
      <div>
        <h1 className="uiSectionHeader__title">{title}</h1>
        {subtitle ? <p className="uiSectionHeader__subtitle">{subtitle}</p> : null}
      </div>
      {right ? <div className="uiSectionHeader__right">{right}</div> : null}
    </div>
  );
}
