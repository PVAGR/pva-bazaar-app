import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SITE_TAGLINE } from '../lib/philosophy.js';
import { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell.jsx';

export default function Layout({ children }) {
  const location = useLocation();
  const pathname = location?.pathname || '/';
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Admin has its own full-screen shell and controls.
    return <>{children}</>;
  }

  const token =
    typeof window !== 'undefined' &&
    (localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt'));

    const [walletAddress, setWalletAddress] = useState(() => {
      if (typeof window === 'undefined') return '';
      return localStorage.getItem('walletAddress') || localStorage.getItem('defaultWalletAddress') || '';
    });

    useEffect(() => {
      if (!token) { setWalletAddress(''); return; }
      // Attempt to read wallet from stored profile preferences
      try {
        const raw = localStorage.getItem('userProfile');
        const profile = raw ? JSON.parse(raw) : null;
        const addr = profile?.preferences?.defaultWalletAddress || profile?.walletAddress || '';
        if (addr) setWalletAddress(addr);
      } catch { /* ignore */ }
    }, [token]);

  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <div className="layout__brand">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">{SITE_TAGLINE}</div>
        </div>
        <nav className="layout__nav" aria-label="Primary">
          <NavLink to="/" end>📚 Archive</NavLink>
          <NavLink to="/verification">✓ Verification</NavLink>
          <NavLink to="/manifesto">Manifesto</NavLink>
          <NavLink to="/marketplace">🛒 Marketplace</NavLink>
          <NavLink to="/cart">Cart</NavLink>
          {token ? <NavLink to="/items/new">📦 Sell Item</NavLink> : null}
          {token ? <NavLink to="/items/mine">My Listings</NavLink> : null}
          {token ? <NavLink to="/dashboard">📈 Dashboard</NavLink> : null}
          <NavLink to="/oracle">🔮 Oracle Assessment</NavLink>
          <NavLink to="/about">About</NavLink>
          {token
            ? <NavLink to="/account">Account</NavLink>
            : <><NavLink to="/login">Login</NavLink><NavLink to="/register">Register</NavLink></>}
                  {token && walletAddress ? <NotificationBell recipientAddress={walletAddress} /> : null}
        </nav>
      </header>
      <main id="content" className="layout__main">
        {children}
      </main>
      <footer className="layout__footer">
        © {new Date().getFullYear()} · pvabazaar.org
      </footer>
    </div>
  );
}
