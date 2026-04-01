import React from 'react';
import { NavLink } from 'react-router-dom';
import './AdminNav.css';

export default function CreatorNav() {
  const items = [
    { to: '/creator', label: 'Creator Hub' },
    { to: '/onboarding', label: 'Guide' },
    { to: '/items/new', label: 'Post Item' },
    { to: '/items/mine', label: 'My Listings' },
    { to: '/account', label: 'Account' },
  ];

  return (
    <nav className="adminNav" aria-label="Creator area navigation">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) => `adminNav__tab ${isActive ? 'active' : ''}`}
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
