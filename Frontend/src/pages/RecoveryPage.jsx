import React from 'react';
import DownloadAppPage from './DownloadAppPage.jsx';

export default function RecoveryPage() {
  return (
    <>
      <section className="section-card download-app-card">
        <p className="pill">Continuity</p>
        <h1>Recovery</h1>
        <p>
          This is the continuity surface for the site: keep the app installable, keep the mobile build accessible,
          and keep your working record close when you move between devices.
        </p>
        <ul>
          <li>Use the mobile install flow to keep PVA Bazaar on your phone.</li>
          <li>Use the HeelKawn build links when you want the game client.</li>
          <li>Use the backend status and machine-readable docs to verify what is live.</li>
        </ul>
      </section>
      <DownloadAppPage />
    </>
  );
}
