import React from 'react';
import { Link } from 'react-router-dom';
import { getToken } from '../lib/auth';
import SellerFAQ from '../components/SellerFAQ.jsx';
import './CreatorPortalPage.css';

export default function CreatorPortalPage() {
  const authenticated = Boolean(getToken());

  return (
    <section className="creator-portal" aria-labelledby="creator-portal-title">
      <header className="creator-portal__hero">
        <h1 id="creator-portal-title">Creator Seller Portal</h1>
        <p>
          Open to sellers in Kenya, the United States, and anywhere else. Register from your phone,
          list your items, and manage your own listings safely.
        </p>
        <p className="creator-portal__note">
          This is separate from the owner admin system. Creator accounts cannot access or modify main admin controls.
        </p>
      </header>

      <div className="creator-portal__cards">
        <article className="creator-card">
          <h2>1. Create your account</h2>
          <p>Sign up as a creator/seller. No admin privileges are granted.</p>
          <Link to="/register?next=%2Fonboarding" className="creator-btn creator-btn--primary">
            Sign up now
          </Link>
        </article>

        <article className="creator-card">
          <h2>2. Sign in and set up</h2>
          <p>Use user login, save your defaults, then continue to your seller workspace.</p>
          <Link to="/login?next=%2Fonboarding" className="creator-btn">
            Sign in (User)
          </Link>
        </article>

        <article className="creator-card">
          <h2>3. Post items for review</h2>
          <p>Create listings from mobile or desktop. Submissions go through your safe creator flow.</p>
          <Link to={authenticated ? '/items/new' : '/login?next=%2Fitems%2Fnew'} className="creator-btn">
            Post an item
          </Link>
        </article>

        <article className="creator-card">
          <h2>4. Manage your listings</h2>
          <p>Track your own listings and syndication status without touching platform admin tools.</p>
          <Link to={authenticated ? '/items/mine' : '/login?next=%2Fitems%2Fmine'} className="creator-btn">
            Open my listings
          </Link>
        </article>
      </div>

      <SellerFAQ />
    </section>
  );
}
