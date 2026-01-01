// Main app structure with tabbed Home, imports all new components
import React from 'react';
import './base.css';
import HomeTabs from './components/HomeTabs';

export default function App() {
  return (
    <div className="pva-container">
      <header className="pva-header">
        <h1>pvabazaar.org</h1>
        <p className="pva-subtitle">A Life in Words</p>
      </header>
      <HomeTabs />
    </div>
  );
}
