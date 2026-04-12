import React, { useEffect, useState } from 'react';

export default function DownloadAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const browserWindow = globalThis?.window;
    if (!browserWindow) return undefined;

    const ua = browserWindow.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const standaloneMatch = browserWindow.matchMedia('(display-mode: standalone)').matches;
    const navigatorStandalone = Boolean(browserWindow.navigator.standalone);
    setIsStandalone(standaloneMatch || navigatorStandalone);

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
    };

    browserWindow.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    browserWindow.addEventListener('appinstalled', onInstalled);

    return () => {
      browserWindow.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      browserWindow.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <section className="section-card download-app-card">
      <h2>Download PVA Bazaar on Mobile</h2>
      <p>
        Install PVA Bazaar as an app on your phone for fast launch, full-screen browsing,
        and home-screen access to the Archive, Marketplace, Showroom, and Popular Conference.
      </p>

      {isStandalone ? (
        <div className="download-status download-status--success">
          PVA Bazaar is already installed on this device.
        </div>
      ) : (
        <div className="download-status">
          This site is now installable as a progressive web app (PWA).
        </div>
      )}

      <div className="download-actions">
        <button
          type="button"
          className="button"
          onClick={handleInstall}
          disabled={!isInstallable || isStandalone}
        >
          {isStandalone ? 'Installed' : 'Install App'}
        </button>
      </div>

      <div className="download-help-grid">
        <article className="download-help-panel">
          <h3>Android (Chrome/Edge)</h3>
          <ol>
            <li>Open pvabazaar.org in your browser.</li>
            <li>Tap Install App when prompted, or open the browser menu.</li>
            <li>Choose Install app or Add to Home screen.</li>
          </ol>
        </article>

        <article className="download-help-panel">
          <h3>iPhone (Safari)</h3>
          <ol>
            <li>Open pvabazaar.org in Safari.</li>
            <li>Tap the Share icon.</li>
            <li>Select Add to Home Screen, then tap Add.</li>
          </ol>
          {isIos && !isStandalone ? (
            <p className="subtle-note">On iPhone, install uses the Share menu rather than a browser prompt.</p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
