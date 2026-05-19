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

        <motion.div className="download-meta">
