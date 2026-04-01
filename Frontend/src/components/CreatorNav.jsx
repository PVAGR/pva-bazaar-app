import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import { calculateProfileCompletion } from '../utils/sellerProfileUtils.js';
import './AdminNav.css';

export default function CreatorNav() {
  const [profile, setProfile] = useState(null);
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    apiGet('/users/profile')
      .then(res => {
        if (res?.ok && res.user) {
          setProfile(res.user);
          setCompletion(calculateProfileCompletion(res.user));
        }
      })
      .catch(() => {
        // silent fallback
      });
  }, []);

  const items = [
    { to: '/creator', label: 'Creator Hub' },
    { to: '/onboarding', label: 'Guide' },
    { to: '/items/new', label: 'Post Item' },
    { to: '/items/mine', label: 'My Listings' },
    {
      to: '/account',
      label: 'Account',
      suffix: completion && !completion.isComplete ? ` (${completion.completed}/${completion.total})` : null,
    },
  ];

  return (
    <nav className="adminNav" aria-label="Creator area navigation">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) => `adminNav__tab ${isActive ? 'active' : ''}`}
          title={it.suffix ? 'Complete your profile to unlock full features' : undefined}
        >
          {it.label}
          {it.suffix}
        </NavLink>
      ))}
    </nav>
  );
}
