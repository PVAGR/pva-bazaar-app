import React from 'react';

const downloadUrl = import.meta.env.VITE_HEELKAWN_DOWNLOAD_URL || 'https://github.com/PVAGR/HeelKawn1/releases/download/android-latest/HeelKawn-android.apk';
const repoUrl = import.meta.env.VITE_HEELKAWN_REPO_URL || 'https://github.com/PVAGR/HeelKawn1';

export default function HeelKawnPage() {
  return (
    <section className="section-card download-app-card">
      <h2>HeelKawn · Mobile Download</h2>
      <p>
        Download the latest HeelKawn package from your phone and track active development in the core repository.
      </p>

      <div className="download-status">
        Use this page as the dedicated HeelKawn hub for download and updates.
      </div>

      <div className="download-actions">
        <a
          className="button"
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download HeelKawn
        </a>
        <a
          className="button secondary"
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open HeelKawn Repo
        </a>
      </div>

      <div className="download-help-grid">
        <article className="download-help-panel">
          <h3>Phone steps</h3>
          <ol>
            <li>Open this page on your mobile browser.</li>
            <li>Tap Download HeelKawn.</li>
            <li>Open the file from your Downloads app/folder.</li>
          </ol>
        </article>

        <article className="download-help-panel">
          <h3>Direct APK support</h3>
          <p>
            To switch this button to a direct Android build, set
            <code> VITE_HEELKAWN_DOWNLOAD_URL </code>
            to your APK URL.
          </p>
        </article>
      </div>
    </section>
  );
}
