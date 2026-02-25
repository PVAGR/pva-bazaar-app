import React from 'react';
import { Helmet } from 'react-helmet-async';
import SiteFooter from '../components/SiteFooter.jsx';
import ShareButton from '../components/ShareButton.jsx';

export default function NotFoundPage() {
  return (
    <div className="not-found-page" style={{ maxWidth: 480, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <Helmet>
        <title>Page not found | PVA Bazaar</title>
        <meta name="description" content="The page you requested could not be found." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <h1>404</h1>
      <p>This page doesn&apos;t exist.</p>
      <p style={{ marginTop: 16 }}>
        <ShareButton url="https://pvabazaar.org/" title="PVA Bazaar" text="Archive, marketplace, chat with Richard" />
      </p>
      <div style={{ marginTop: 24 }}>
        <SiteFooter style={{ borderTop: 'none', padding: 0 }} />
      </div>
    </div>
  );
}
