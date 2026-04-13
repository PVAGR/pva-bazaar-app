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
  governance: 'conference',
  showroom: 'showroom',
  conference: 'conference',
  forum: 'forum',
  'governance-conference': 'govConference',
  'governance-treasury': 'treasury',
  passport: 'My Passport',
  citizens: 'Citizens',
  'identity-center': 'Citizen Passport',
  'download-app': 'downloadApp',
  creator: 'creator',
  about: 'about',
  deploy: 'deploy',
  'admin-governance': 'admin',
};

export default function Layout({ children }) {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const location = useLocation();
  const hasUserAccess = Boolean(getToken());
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

  const primaryNavRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.navPlacement === 'primary' && route.access === 'public')
  ), []);

  const secondaryRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.navPlacement === 'secondary' && route.access === 'public')
  ), []);

  const conferenceSystemRoutes = useMemo(() => [
    { key: 'proposal-board', to: '/proposals', title: 'Proposal Board' },
    { key: 'conference-hub', to: '/conference', title: 'Popular Conference' },
    { key: 'vote-session', to: '/forum', title: 'Vote Session' },
  ], []);

  const citizenRoutes = useMemo(() => [
    { key: 'citizen-passport', to: '/passport', title: 'Citizen Passport' },
    { key: 'conference-queue', to: '/governance/conference', title: 'Governance Conference' },
    { key: 'treasury-execution', to: '/governance/treasury', title: 'Governance Treasury' },
    { key: 'my-wallet', to: '/passport#wallet', title: 'My Wallet' },
    { key: 'my-proposals', to: '/passport#governance', title: 'My Proposals / Votes' },
  ], []);

  const adminRoutes = useMemo(() => [
    { key: 'admin-governance', to: '/admin/governance', title: 'Admin Governance' },
    { key: 'moderation-queue', to: '/admin/governance', title: 'Moderation Queue' },
    { key: 'treasury-controls', to: '/governance/treasury', title: 'Treasury Controls' },
    { key: 'creator-approvals', to: '/creator', title: 'Creator Approvals' },
    { key: 'site-ops', to: '/deploy', title: 'Site Ops / Diagnostics' },
  ], []);

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
          {primaryNavRoutes.map((route) => (
            <NavLink key={route.key} to={route.to} end={route.to === '/'}>
              {route.navLabel}
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
        <label className="layout__languageControl">
          <span>{t('language')}:</span>
          <select
            value={lang}
            onChange={handleLanguageChange}
            title="Select language"
            className="layout__languageSelect"
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
        <section className="section-card layout__routeIdentity" data-route-identity="true" aria-label="Current route identity">
          <div className="pill" data-route-label="section">{routeIdentity.section}</div>
          <h2 data-route-label="title" className="layout__routeTitle">
            {routeIdentity.title}
          </h2>
          {routeIdentity.description ? (
            <p data-route-label="description" className="layout__routeDescription">
              {routeIdentity.description}
            </p>
          ) : null}
        </section>
        {children}
      </main>
      <OpenClawFloatingAssistant routePath={location.pathname || '/'} />
      <footer className="layout__footer">
        <div className="layout__footerGrid">
          <section className="layout__footerSection" aria-label="Secondary routes">
            <h2>Secondary</h2>
            <div className="layout__footerLinks">
              {secondaryRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          <section className="layout__footerSection" aria-label="Popular Conference navigation">
            <h2>Popular Conference System</h2>
            <div className="layout__footerLinks">
              {conferenceSystemRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          {hasUserAccess ? (
            <section className="layout__footerSection" aria-label="Citizen account routes">
              <h2>Citizen Account</h2>
              <div className="layout__footerLinks">
                {citizenRoutes.map((route) => (
                  <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                    {route.title}
                  </NavLink>
                ))}
              </div>
            </section>
          ) : null}

          {hasUserAccess && pathname.startsWith('/admin') ? (
            <section className="layout__footerSection" aria-label="Admin routes">
              <h2>Admin / Secretariat</h2>
              <div className="layout__footerLinks">
                {adminRoutes.map((route) => (
                  <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                    {route.title}
                  </NavLink>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <div className="layout__footerMeta">© {new Date().getFullYear()} · pvabazaar.org</div>
      </footer>
    </div>
  );
}
