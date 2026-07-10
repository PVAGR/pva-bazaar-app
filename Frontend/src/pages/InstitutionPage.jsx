import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { INSTITUTION_PAGES_LOOKUP } from '../data/institutions.js';
import './InstitutionPage.css';

export default function InstitutionPage() {
  const { institutionSlug } = useParams();
  const institution = useMemo(() => INSTITUTION_PAGES_LOOKUP[institutionSlug] || null, [institutionSlug]);

  if (!institution) {
    return (
      <main className="institution-page section-card">
        <p className="pill">Institutional partnerships</p>
        <h1>Institution not found</h1>
        <p>
          That institution page does not exist yet. Return to the institutions hub and choose another path.
        </p>
        <div className="institution-page__actions">
          <Link className="button" to="/institutions">Return to institutions</Link>
          <Link className="button ghost" to="/marketplace">Open marketplace</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="institution-page">
      <Helmet>
        <title>{institution.title} · PVA Bazaar</title>
        <meta name="description" content={institution.summary} />
      </Helmet>

      <section className="section-card institution-page__hero">
        <div className="institution-page__heroCopy">
          <p className="pill">{institution.kicker}</p>
          <h1>{institution.title}</h1>
          <p className="institution-page__lead">{institution.hero}</p>
          <p className="institution-page__summary">{institution.overview}</p>
          <div className="institution-page__actions">
            <Link className="button" to="/marketplace">Open marketplace</Link>
            <Link className="button ghost" to="/institutions">Back to hub</Link>
            <Link className="button secondary" to="/books">Open books</Link>
          </div>
        </div>

        <aside className="institution-page__panel">
          <div>
            <p className="institution-page__label">Programs</p>
            <ul>
              {institution.programs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="institution-page__label">Procurement</p>
            <ul>
              {institution.procurement.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="institution-page__label">Use cases</p>
            <div className="institution-page__chipRow">
              {institution.useCases.map((item) => (
                <span key={item} className="institution-page__chip">{item}</span>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="section-card institution-page__paths">
        <div className="section-heading">
          <div>
            <div className="pill">Recommended paths</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Quick ways to continue</h2>
          </div>
        </div>
        <div className="institution-page__pathGrid">
          {institution.recommendedPaths.map((path) => (
            <Link key={path.to} className="institution-page__pathCard" to={path.to}>
              <strong>{path.label}</strong>
              <span>Open destination →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

