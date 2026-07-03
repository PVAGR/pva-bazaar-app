import React from 'react';
import { Link } from 'react-router-dom';
import './OpeningHomePage.css';

const PRIMARY_CATEGORIES = [
  {
    key: 'archive',
    to: '/archive',
    symbol: '📖',
    title: 'Archive & Writings',
    subtitle: 'Knowledge',
    desc: 'Long-form notes, preserved essays, and the personal record. The foundation of everything.',
  },
  {
    key: 'marketplace',
    to: '/marketplace',
    symbol: '⚖️',
    title: 'Marketplace & Trade',
    subtitle: 'Commerce',
    desc: 'Browse goods, connect with suppliers, run sourcing and fulfillment. Real trade.',
  },
  {
    key: 'books',
    to: '/books',
    symbol: '📚',
    title: 'Books & Publishing',
    subtitle: 'Publishing',
    desc: 'Featured books, published editions, and the workspace for new publishing projects.',
  },
  {
    key: 'heelkawn',
    to: '/heelkawn',
    symbol: '🎮',
    title: 'HeelKawn',
    subtitle: 'Game',
    desc: 'The game hub — downloads, armory profile, and repository pulse, all in one place.',
  },
];

const SECONDARY_LINKS = [
  { key: 'governance', to: '/proposals', label: 'Governance & Proposals' },
  { key: 'creator', to: '/creator', label: 'Supplier Portal' },
  { key: 'about', to: '/about', label: 'About' },
  { key: 'recovery', to: '/recovery', label: 'Recovery & Install' },
  { key: 'forum', to: '/forum', label: 'Forum' },
  { key: 'started', to: '/get-started', label: 'Get Started' },
];

export default function OpeningHomePage() {
  return (
    <div className="opening-home" aria-label="PVA Bazaar opening homepage">
      <section className="section-card opening-home__hero">
        <p className="pill">pvabazaar.org</p>
        <h1 className="opening-home__heroTitle">Archive · Trade · Books · HeelKawn</h1>
        <p className="opening-home__heroLead">
          Personal archive, commerce bridge, publishing workspace, and game hub — one site, four clear doors.
        </p>
      </section>

      <section className="opening-home__primaryGrid" aria-label="Primary categories">
        {PRIMARY_CATEGORIES.map((cat) => (
          <Link key={cat.key} className="opening-home__primaryCard" to={cat.to}>
            <span className="opening-home__cardSymbol" aria-hidden="true">{cat.symbol}</span>
            <span className="opening-home__cardSubtitle">{cat.subtitle}</span>
            <h2 className="opening-home__cardTitle">{cat.title}</h2>
            <p className="opening-home__cardDesc">{cat.desc}</p>
            <span className="opening-home__cardArrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      <section className="section-card opening-home__secondary" aria-label="More sections">
        <p className="pill">More</p>
        <nav className="opening-home__secondaryNav" aria-label="Secondary links">
          {SECONDARY_LINKS.map((link) => (
            <Link key={link.key} className="opening-home__secondaryLink" to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
