import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import SectionIntro from '../components/SectionIntro.jsx';
import './PublicLandingPage.css';

const CONTACTS = [
  {
    title: 'General contact',
    email: 'contact@pvabazaar.org',
    note: 'For site questions, press, and public inquiries.',
  },
  {
    title: 'Supplier partnerships',
    email: 'contact@pvabazaar.org',
    note: 'For sourcing, consignment, product submissions, and distribution.',
  },
  {
    title: 'Institutions and schools',
    email: 'contact@pvabazaar.org',
    note: 'For classroom kits, research materials, museum work, and procurement.',
  },
  {
    title: 'Archive and media',
    email: 'contact@pvabazaar.org',
    note: 'For writings, archive collaboration, and public documentation.',
  },
];

export default function ContactPage() {
  return (
    <section className="static-page">
      <Helmet>
        <title>Contact PVA Bazaar | Partnership and Support</title>
        <meta
          name="description"
          content="Contact PVA Bazaar for partnerships, supplier onboarding, institutional inquiries, media, and public support."
        />
        <link rel="canonical" href="https://pvabazaar.org/contact" />
      </Helmet>

      <SectionIntro
        badge="Contact"
        title="Talk to PVA Bazaar."
        promise="General inquiries, supplier onboarding, institutional partnerships, archive questions, and public collaboration - pick the lane and write directly."
        actions={(
          <>
            <a className="pva-btn pva-btn--primary" href="mailto:contact@pvabazaar.org?subject=PVA%20Bazaar%20Inquiry">Email us</a>
            <Link className="pva-btn pva-btn--ghost" to="/partnerships">Partnerships</Link>
            <Link className="pva-btn pva-btn--ghost" to="/verification">Verification</Link>
          </>
        )}
      />

      <div className="static-page__grid">
        {CONTACTS.map((item) => (
          <article className="static-page__card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.note}</p>
            <a href={`mailto:${item.email}`} className="static-page__link">{item.email}</a>
          </article>
        ))}
      </div>

      <section className="static-page__card">
        <h2>What to include</h2>
        <ul className="static-page__list">
          <li>Your name and role</li>
          <li>The page, item, or partnership you’re asking about</li>
          <li>Your country or region</li>
          <li>Best way to reply</li>
        </ul>
      </section>
    </section>
  );
}
