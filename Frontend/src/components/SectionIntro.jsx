import React from 'react';
import './SectionIntro.css';

/**
 * Shared section opener per docs/UI-VISION.md:
 * gold eyebrow badge, serif promise title, one-line "what you can do here", actions.
 */
export default function SectionIntro({ badge, title, promise, actions }) {
  return (
    <header className="pva-section-intro">
      {badge ? <span className="pva-section-intro__badge">{badge}</span> : null}
      <h1 className="pva-section-intro__title">{title}</h1>
      {promise ? <p className="pva-section-intro__promise">{promise}</p> : null}
      {actions ? <div className="pva-section-intro__actions">{actions}</div> : null}
    </header>
  );
}
