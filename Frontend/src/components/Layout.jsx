import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';
import { PUBLIC_ROUTES } from '../config/publicRoutes';

const translations = {
  en: {
    conference: 'Popular Conference',
    propose: 'Submit a Proposal',
    problem: 'What problem does this solve?',
    solution: 'What is your proposed solution?',
    outcome: 'What outcome do you expect?',
    connectWallet: 'Connect Wallet',
    treasury: 'Treasury',
  },
  sw: {
    conference: 'Mkutano Maarufu',
    propose: 'Wasilisha Pendekezo',
    problem: 'Tatizo gani hili linatatua?',
    solution: 'Suluhisho lako ni lipi?',
    outcome: 'Matokeo gani unatarajia?',
    connectWallet: 'Unganisha Poketi',
    treasury: 'Hazina',
  },
};

export default function Layout({ children }) {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const location = useLocation();
  const defaultLang = import.meta.env.VITE_DEFAULT_LANG === 'sw' ? 'sw' : 'en';
  const [lang, setLang] = useState(globalThis.localStorage?.getItem('pva-lang') || defaultLang);
  const t = useMemo(() => translations[lang] || translations.en, [lang]);

  const toggleLang = () => {
    const next = lang === 'en' ? 'sw' : 'en';
    setLang(next);
    globalThis.localStorage?.setItem('pva-lang', next);
    globalThis.document?.documentElement?.setAttribute('lang', next);
  };

  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <NavLink to="/" end className="layout__brand layout__brandLink" aria-label="PVA Bazaar home">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">Archive · Commerce · Governance · {t.conference}</div>
        </NavLink>
        <nav className="layout__nav" aria-label="Primary">
          {PUBLIC_ROUTES.map((route) => (
            <NavLink key={route.key} to={route.to} end={route.to === '/'}>
              {route.navLabel}
            </NavLink>
          ))}
          <NavLink to="/deploy">🚀 Deploy</NavLink>
        </nav>
        <button
          type="button"
          className="layout__themeToggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button
          type="button"
          onClick={toggleLang}
          style={{
            background: 'transparent',
            border: '1px solid var(--site-border)',
            color: 'var(--site-text-primary)',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Toggle language"
        >
          {lang === 'en' ? 'Kiswahili' : 'English'}
        </button>
      </header>
      <main id="content" className="layout__main">
        {children}
      </main>
      <OpenClawFloatingAssistant routePath={location.pathname || '/'} />
      <footer className="layout__footer">
        © {new Date().getFullYear()} · pvabazaar.org
      </footer>
    </div>
  );
}
