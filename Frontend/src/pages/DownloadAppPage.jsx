import React, { useEffect, useState } from 'react';
import { HEELKAWN_DOWNLOAD } from '../config/heelkawnDownload.js';

const heelKawnDownloadUrl =
  import.meta.env.VITE_HEELKAWN_DOWNLOAD_URL || HEELKAWN_DOWNLOAD.releasesPage;

export default function DownloadAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [heelkawnApkUrl, setHeelkawnApkUrl] = useState(HEELKAWN_DOWNLOAD.githubApkUrl);
  const [heelkawnApkOnSite, setHeelkawnApkOnSite] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    const siteApk = HEELKAWN_DOWNLOAD.siteApkPath;

    async function resolveApkUrl() {
      try {
        const res = await fetch(siteApk, { method: 'HEAD' });
        if (!cancelled && res.ok) {
          setHeelkawnApkOnSite(true);
          setHeelkawnApkUrl(siteApk);
          return;
        }
      } catch {
        /* fall through to GitHub */
      }
      if (!cancelled) {
        setHeelkawnApkOnSite(false);
        setHeelkawnApkUrl(HEELKAWN_DOWNLOAD.githubApkUrl);
      }
    }

    resolveApkUrl();
    return () => {
      cancelled = true;
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
    <>
      <section className="section-card download-app-card download-app-card--heelkawn">
        <h2>HeelKawn — Android playtest</h2>
        <p>
          Install the Godot settlement sim on your phone for touch controls, mobile HUD, and
          on-device playtesting. This is a debug build for internal testing (not Play Store).
        </p>

        <div className="download-meta">
          <span>Package: {HEELKAWN_DOWNLOAD.packageId}</span>
          <span>
            Version: {HEELKAWN_DOWNLOAD.versionName} ({HEELKAWN_DOWNLOAD.versionCode})
          </span>
          {heelkawnApkOnSite ? (
            <span className="download-meta-badge">Hosted on pvabazaar.org</span>
          ) : (
            <span className="download-meta-badge download-meta-badge--alt">GitHub release mirror</span>
          )}
        </div>

        <div className="download-actions">
          <a className="button button--primary" href={heelkawnApkUrl} download="HeelKawn-android.apk">
            Download HeelKawn APK
          </a>
          <a
            className="button button--ghost"
            href={HEELKAWN_DOWNLOAD.releasesPage}
            target="_blank"
            rel="noopener noreferrer"
          >
            All releases
          </a>
        </div>

        <div className="download-help-grid">
          <article className="download-help-panel">
            <h3>Install on Android</h3>
            <ol>
              <li>Tap <strong>Download HeelKawn APK</strong> above (use Chrome if possible).</li>
              <li>When the download finishes, open the file from your notifications or Downloads folder.</li>
              <li>
                If prompted, allow installs from this browser or enable{' '}
                <strong>Install unknown apps</strong> for Chrome.
              </li>
              <li>Confirm install, then open <strong>HeelKawn</strong> from your app drawer.</li>
            </ol>
          </article>
          <article className="download-help-panel">
            <h3>Playtest tips</h3>
            <ul>
              <li>Use pinch to zoom and drag to pan the map.</li>
              <li>Bottom bar: speed, zoom, build, inventory, and menu.</li>
              <li>Tap tiles to select; use build mode to designate like desktop.</li>
              <li>iPhone: native APK is not supported — use an Android device for this build.</li>
            </ul>
          </article>
        </div>
      </section>

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
          <a className="button button--ghost" href="/#/heelkawn">
            Open HeelKawn page
          </a>
          <a
            className="button button--ghost"
            href={heelKawnDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            HeelKawn builds
          </a>
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
    </>
  );
}
