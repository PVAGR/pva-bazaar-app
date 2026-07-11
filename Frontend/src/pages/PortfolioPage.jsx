import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './PublicLandingPage.css';

const PROJECTS = [
  { title: 'Marketplaces and commerce', text: 'Listings, sourcing, showroom presentation, deals, and supplier tools.' },
  { title: 'Archive and writings', text: 'Public essays, long-form notes, and the memory layer of the project.' },
  { title: 'Books and publishing', text: 'Reading, publishing, shelf browsing, and manuscript workflows.' },
  { title: 'Institutional partnerships', text: 'Programs for schools, museums, libraries, labs, and governments.' },
  { title: 'Recovery and continuity', text: 'Backups, export bundles, and cross-device continuity support.' },
  { title: 'HeelKawn', text: 'The adjacent simulation universe and research hub referenced across the site.' },
];

export default function PortfolioPage() {
  return (
    <section className="static-page">
      <Helmet>
        <title>PVA Bazaar Portfolio | Public Projects and Work Samples</title>
        <meta
          name="description"
          content="PVA Bazaar portfolio page with public projects, work samples, marketplace systems, and publishing surfaces."
        />
        <link rel="canonical" href="https://pvabazaar.org/portfolio" />
      </Helmet>

      <header className="static-page__hero">
        <p className="static-page__kicker">Portfolio</p>
        <h1>Public work, organized clearly.</h1>
        <p>
          This page shows selected systems and public-facing projects so partners can see the breadth of the work
          without hunting through hidden menus.
        </p>
        <div className="static-page__actions">
          <Link className="button" to="/contact">Collaborate</Link>
          <Link className="button ghost" to="/marketplace">Marketplace</Link>
          <Link className="button ghost" to="/archive">Archive</Link>
        </div>
      </header>

      <div className="static-page__grid">
        {PROJECTS.map((project) => (
          <article className="static-page__card" key={project.title}>
            <h2>{project.title}</h2>
            <p>{project.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
