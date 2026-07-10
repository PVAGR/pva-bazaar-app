import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { INSTITUTION_PAGES } from '../data/institutions.js';
import './InstitutionsPage.css';

export default function InstitutionsPage() {
  return (
    <main className="institutions-page section-card">
      <Helmet>
        <title>Institutions · PVA Bazaar</title>
        <meta
          name="description"
          content="Universities, schools, museums, governments, labs, libraries, NGOs, training centers, and TVETs in one procurement and partnership hub."
        />
      </Helmet>

      <header className="institutions-page__hero">
        <div>
          <p className="pill">Institutional partnerships</p>
          <h1>One hub for every institution that teaches, preserves, researches, or serves.</h1>
          <p>
            PVA Bazaar is built for the buyers and collaborators who need origin, story, and procurement clarity.
            Start here, then move into the specific institution page that matches your work.
          </p>
        </div>
        <div className="institutions-page__heroPanel">
          <strong>What this hub supports</strong>
          <ul>
            <li>Procurement and repeat ordering</li>
            <li>Curriculum and research supply</li>
            <li>Collections and provenance support</li>
            <li>Program partnerships and sourcing</li>
          </ul>
        </div>
      </header>

      <section className="institutions-page__grid" aria-label="Institution pages">
        {INSTITUTION_PAGES.map((institution) => (
          <Link key={institution.slug} className="institutions-page__card" to={`/institutions/${institution.slug}`}>
            <p className="pill">{institution.kicker}</p>
            <h2>{institution.title}</h2>
            <p>{institution.summary}</p>
            <span className="institutions-page__cardLink">Open institution page →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

