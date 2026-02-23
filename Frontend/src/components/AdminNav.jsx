import React from 'react';
import { NavLink } from 'react-router-dom';
import './AdminNav.css';

/**
 * AdminNav
 * Shared tab bar for the private/admin area.
 */
export default function AdminNav() {
  const items = [
    { to: '/admin', label: 'Admin' },
    { to: '/streams', label: 'Streams' },
    { to: '/deals', label: 'Deals' },
    { to: '/items/new', label: 'Sell' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/account', label: 'Account' },
  ];

  return (
    <nav className="adminNav" aria-label="Admin area navigation">
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

