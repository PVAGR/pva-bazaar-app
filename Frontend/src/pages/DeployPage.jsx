import React, { useEffect, useMemo, useState } from 'react';
import { bindLanguageSync, getStoredLanguage, translate } from '../lib/i18n.js';

export default function DeployPage() {
  const [lang, setLang] = useState(getStoredLanguage());

  useEffect(() => bindLanguageSync(setLang), []);

  const t = useMemo(() => (key) => translate(lang, key), [lang]);

  useEffect(() => {
    console.log('✅ DeployPage mounted at', new Date().toISOString());
  }, []);

  const deployOptions = [
    {
      platform: 'Vercel',
      url: 'https://vercel.com/new/clone?repository-url=https://github.com/pvabazaar/pva-bazaar&project-name=pva-bazaar&repository-name=pva-bazaar',
      icon: '▲',
      color: '#000',
    },
    {
      platform: 'Netlify',
      url: 'https://app.netlify.com/start/deploy?repository=https://github.com/pvabazaar/pva-bazaar',
      icon: '◆',
      color: '#00C7B7',
    },
    {
      platform: 'Render',
      url: 'https://render.com/deploy?repo=https://github.com/pvabazaar/pva-bazaar',
      icon: '⚡',
      color: '#0094FF',
    },
  ];

  return (
    <div
      data-federation-enabled={import.meta.env.VITE_FEDERATION_ENABLED === 'true'}
      data-community-id={import.meta.env.VITE_COMMUNITY_ID}
      data-federation-hub={import.meta.env.VITE_FEDERATION_HUB_URL}
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '24px 16px',
        minHeight: '100vh',
        background: 'var(--site-bg-primary)',
      }}
    >
      <header
        style={{
          textAlign: 'center',
          marginBottom: '32px',
          padding: '20px',
          background: 'var(--site-panel)',
          borderRadius: '12px',
          border: '1px solid var(--site-border)',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800' }}>{t('deployOwn')}</h1>
        <p style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--site-text-muted)' }}>
          {t('deploySubtitle')}
        </p>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '14px',
            fontStyle: 'italic',
            color: 'var(--site-accent)',
            fontWeight: '600',
          }}
        >
          Based on The Green Book • One Citizen, One Vote • Portable Civilization Layer
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {deployOptions.map((option) => (
          <a
            key={option.platform}
            href={option.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px',
              background: 'var(--site-panel)',
              border: '1px solid var(--site-border)',
              borderRadius: '12px',
              textDecoration: 'none',
              color: 'var(--site-text-primary)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px', color: option.color }}>
              {option.icon}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>
              {option.platform}
            </h3>
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                color: 'var(--site-text-muted)',
                fontSize: '14px',
              }}
            >
              One-click deploy with pre-configured governance, wallet auth, and offline sync.
            </p>
          </a>
        ))}
      </div>

      <section
        style={{
          background: 'var(--site-panel)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--site-border)',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px' }}>{t('configOptions')}</h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: '20px',
            color: 'var(--site-text-muted)',
            lineHeight: '1.8',
          }}
        >
          <li>
            <strong>Community Name:</strong> Customize your instance identity
          </li>
          <li>
            <strong>Blockchain:</strong> Choose Polygon, Ethereum, or local testnet
          </li>
          <li>
            <strong>Language:</strong> Enable Swahili, French, Arabic, or other locales
          </li>
          <li>
            <strong>Proof-of-Personhood:</strong> Integrate with local ID systems or wallet-only
            mode
          </li>
          <li>
            <strong>Federation:</strong> Connect to global PVA network or run isolated
          </li>
        </ul>
      </section>

      <section
        style={{
          background: 'var(--site-panel)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--site-border)',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px' }}>{t('joinFederation')}</h2>
        <p style={{ margin: '0 0 16px', color: 'var(--site-text-muted)' }}>{t('federationText')}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href="https://github.com/pvabazaar/federation-protocol"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--site-accent)', textDecoration: 'none', fontWeight: '600' }}
          >
            {t('readProtocol')}
          </a>
          <a
            href="https://federation.pvabazaar.org/status"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--site-accent)', textDecoration: 'none', fontWeight: '600' }}
          >
            {t('viewStatus')}
          </a>
        </div>
      </section>
    </div>
  );
}
