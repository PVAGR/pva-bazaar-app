import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import SectionIntro from '../components/SectionIntro.jsx';
import './PublicLandingPage.css';

const PARTNERS = [
  'Universities',
  'Schools',
  'Museums',
  'Research institutes',
  'Laboratories',
  'Libraries',
  'NGOs',
  'Training centers',
  'TVETs',
  'Governments',
];

export default function PartnershipsPage() {
  return (
    <section className="static-page">
      <Helmet>
        <title>PVA Bazaar Partnerships | Institutions, Suppliers, and Collaboration</title>
        <meta
          name="description"
          content="PVA Bazaar partnerships for suppliers, universities, schools, museums, laboratories, libraries, NGOs, and public institutions."
        />
        <link rel="canonical" href="https://pvabazaar.org/partnerships" />
      </Helmet>

      <SectionIntro
        badge="Partner with us"
        title="Work with PVA Bazaar."
        promise="We support sourcing, education, archive publishing, institutional procurement, and public knowledge work. If you are building something real, this is the public bridge."
        actions={(
          <>
            <Link className="pva-btn pva-btn--primary" to="/contact">Start a conversation</Link>
            <Link className="pva-btn pva-btn--ghost" to="/institutions">Institution hub</Link>
            <Link className="pva-btn pva-btn--ghost" to="/marketplace">Marketplace</Link>
          </>
        )}
      />

      <section className="static-page__card">
        <h2>Who we work with</h2>
        <div className="static-page__chips">
          {PARTNERS.map((item) => (
            <span className="static-page__chip" key={item}>{item}</span>
          ))}
        </div>
      </section>

      <div className="static-page__grid">
        <article className="static-page__card">
          <h2>Supplier onboarding</h2>
          <p>Document your goods, origins, and capabilities. We prefer clear records over vague claims.</p>
        </article>
        <article className="static-page__card">
          <h2>Institutional procurement</h2>
          <p>Share what your school, lab, museum, or library needs so we can align the right materials.</p>
        </article>
        <article className="static-page__card">
          <h2>Archive and media collaboration</h2>
          <p>Writers, editors, and documenters can help preserve the stories behind products and knowledge.</p>
        </article>
      </div>
    </section>
  );
}
