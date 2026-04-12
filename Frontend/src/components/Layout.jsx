import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import { getToken } from '../lib/auth';
import { LANGUAGE_OPTIONS, bindLanguageSync, getStoredLanguage, setStoredLanguage, translate } from '../lib/i18n.js';

const ROUTE_LABEL_KEYS = {
  home: 'home',
  archive: 'archive',
  'civilization-library': 'civilization',
  'career-quiz': 'careerQuiz',
  marketplace: 'marketplace',
  showroom: 'showroom',
  conference: 'conference',
  forum: 'forum',
  'governance-conference': 'govConference',
  'governance-treasury': 'treasury',
  'download-app': 'downloadApp',
  creator: 'creator',
  about: 'about',
  deploy: 'deploy',
  'admin-governance': 'admin',
};

const iconPrefix = (label) => {
  const firstToken = String(label || '').trim().split(' ')[0] || '';
  return /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(firstToken) ? `${firstToken} ` : '';
};

export default function Layout({ children }) {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const location = useLocation();
  const hasAdminAccess = Boolean(getToken());
  const [lang, setLang] = useState(getStoredLanguage());
  const pathname = useMemo(() => {
    const raw = (location?.pathname || '/').trim();
    const normalized = raw.replace(/\/+$/, '');
    return normalized || '/';
  }, [location?.pathname]);

  useEffect(() => {
    globalThis.document?.documentElement?.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => bindLanguageSync(setLang), []);

  const t = useMemo(() => (key) => translate(lang, key), [lang]);

  const routeIdentity = useMemo(() => {
    const route = PUBLIC_ROUTES.find((item) => item.to === pathname);
    if (route) {
      const routeKey = ROUTE_LABEL_KEYS[route.key] || route.navLabel;
      return {
        section: route.group === 'core' ? 'Core route' : route.group === 'support' ? 'Support route' : 'Route',
        title: t(routeKey),
        description: route.description || '',
      };
    }

    if (pathname === '/deploy') {
      return {
        section: 'Governance tools',
        title: t('deploy'),
        description: t('deploySubtitle'),
      };
    }

    if (pathname === '/admin/governance') {
      return {
        section: 'Admin route',
        title: t('admin'),
        description: 'Governance administration controls.',
      };
    }

    return {
      section: 'Route',
      title: pathname === '/' ? t('home') : pathname,
      description: '',
    };
  }, [pathname, t]);

  useEffect(() => {
    const baseTitle = 'pvabazaar.org';
    if (routeIdentity?.title) {
      globalThis.document.title = `${routeIdentity.title} · ${baseTitle}`;
    }
  }, [routeIdentity]);

  const navRoutes = useMemo(() => {
    const routes = [
      ...PUBLIC_ROUTES,
      { key: 'deploy', to: '/deploy', navLabel: '🚀 Deploy' },
      { key: 'admin-governance', to: '/admin/governance', navLabel: '🛡️ Admin', protected: true, adminOnly: true },
    ];

    return routes.filter((route) => !(route.adminOnly && !hasAdminAccess));
  }, [hasAdminAccess]);

  const handleLanguageChange = (event) => {
    const next = setStoredLanguage(event.target.value);
    setLang(next);
  };

  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <NavLink to="/" end className="layout__brand layout__brandLink" aria-label="PVA Bazaar home">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">{t('siteTagline')}</div>
        </NavLink>
        <nav className="layout__nav" aria-label="Primary">
          {navRoutes.map((route) => (
            <NavLink key={route.key} to={route.to} end={route.to === '/'}>
              {iconPrefix(route.navLabel)}{t(ROUTE_LABEL_KEYS[route.key] || route.navLabel)}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="layout__themeToggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {darkMode ? `☀️ ${t('themeLight')}` : `🌙 ${t('themeDark')}`}
        </button>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <span>{t('language')}:</span>
          <select
            value={lang}
            onChange={handleLanguageChange}
            title="Select language"
            style={{
              background: 'var(--site-panel-soft)',
              border: '1px solid var(--site-border)',
              color: 'var(--site-text)',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main id="content" className="layout__main">
        <section className="section-card" data-route-identity="true" aria-label="Current route identity" style={{ padding: '0.9rem 1rem' }}>
          <div className="pill" data-route-label="section">{routeIdentity.section}</div>
          <h1 data-route-label="title" style={{ margin: '0.55rem 0 0.35rem', fontSize: '1.35rem', color: 'var(--site-accent)' }}>
            {routeIdentity.title}
          </h1>
          {routeIdentity.description ? (
            <p data-route-label="description" style={{ margin: 0, color: 'var(--site-text-muted)' }}>
              {routeIdentity.description}
            </p>
          ) : null}
        </section>
        {children}
      </main>
      <OpenClawFloatingAssistant routePath={location.pathname || '/'} />
      <footer className="layout__footer">
        © {new Date().getFullYear()} · pvabazaar.org
      </footer>
    </div>
  );
}
