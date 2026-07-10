import React, { useEffect, useMemo, useState } from 'react';
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

const CINEMATIC_SCENES = [
  {
    key: 'minerals',
    label: 'Geology',
    title: 'Miners, minerals, and geological story',
    desc: 'Gemstones, rock specimens, and rare earth materials presented with origin, scientific class, and ethical sourcing context.',
  },
  {
    key: 'coffee',
    label: 'Agriculture',
    title: 'Coffee farms, harvests, and living trade',
    desc: 'Coffee, tea, spices, herbs, seeds, and medicinal plants connected to land, climate, culture, and export routes.',
  },
  {
    key: 'lab',
    label: 'Research',
    title: 'Scientists studying specimens and systems',
    desc: 'Laboratory supplies, scientific equipment, and research materials with educational and industrial applications.',
  },
  {
    key: 'craft',
    label: 'Craft',
    title: 'Craftsmen shaping wood, glass, stone, and cloth',
    desc: 'Traditional makers, artisans, and manufacturers with detailed provenance, technique, and cultural value.',
  },
  {
    key: 'education',
    label: 'Education',
    title: 'Children, teachers, and classroom kits',
    desc: 'Educational specimens, classroom tools, museum replicas, lesson plans, and university teaching resources.',
  },
  {
    key: 'trade',
    label: 'Trade',
    title: 'Ports, cargo, and global exchange',
    desc: 'Import, export, logistics, and sourcing surfaces that connect farmers, collectors, and institutions worldwide.',
  },
];

const CIVILIZATION_CATEGORIES = [
  {
    key: 'agriculture',
    title: 'Agriculture',
    desc: 'Coffee, tea, spices, herbs, seeds, botany, and medicinal plants.',
  },
  {
    key: 'earth-sciences',
    title: 'Earth Sciences',
    desc: 'Geology, mineralogy, gemstones, fossils, meteorites, mining, and rare natural resources.',
  },
  {
    key: 'materials',
    title: 'Industrial Materials',
    desc: 'Wood, stone, metals, fibers, leather, dyes, pigments, and chemicals.',
  },
  {
    key: 'education',
    title: 'Education',
    desc: 'Kits, curriculum, laboratory supplies, museum collections, replicas, and classroom tools.',
  },
  {
    key: 'craft',
    title: 'Traditional Craft',
    desc: 'Textiles, ceramics, glass, woodworking, ethnographic collections, and artisan goods.',
  },
  {
    key: 'trade',
    title: 'Trade & Institutions',
    desc: 'Import/export, global trade, schools, universities, museums, libraries, labs, and NGOs.',
  },
];

const INSTITUTION_PAGES = [
  { key: 'universities', title: 'Universities', to: '/civilization-library', desc: 'Procurement, research, and teaching.' },
  { key: 'schools', title: 'Schools', to: '/books', desc: 'Lesson materials and student kits.' },
  { key: 'museums', title: 'Museums', to: '/archive', desc: 'Collections, replicas, and provenance.' },
  { key: 'research', title: 'Research Institutes', to: '/marketplace', desc: 'Specimens, materials, and references.' },
  { key: 'libraries', title: 'Libraries', to: '/archive', desc: 'Reading rooms and living knowledge.' },
  { key: 'labs', title: 'Laboratories', to: '/marketplace', desc: 'Scientific supplies and samples.' },
];

export default function OpeningHomePage() {
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    if (!CINEMATIC_SCENES.length) return undefined;

    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % CINEMATIC_SCENES.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  const scene = useMemo(() => CINEMATIC_SCENES[sceneIndex] || CINEMATIC_SCENES[0], [sceneIndex]);

  return (
    <div className="opening-home" aria-label="PVA Bazaar opening homepage">
      <section className="section-card opening-home__hero">
        <div className="opening-home__heroCopy">
          <p className="pill">pvabazaar.org</p>
          <h1 className="opening-home__heroTitle">The marketplace of civilization, knowledge, and real trade.</h1>
          <p className="opening-home__heroLead">
            PVA Bazaar is a living bazaar of agriculture, science, craft, education, publishing, and global exchange.
            It is built so every listing can teach, every story can preserve, and every connection can create
            opportunity.
          </p>
          <div className="opening-home__heroActions">
            <Link className="button" to="/marketplace">Enter the marketplace</Link>
            <Link className="button ghost" to="/books">Open publishing</Link>
            <Link className="button secondary" to="/archive">Read the archive</Link>
          </div>
        </div>

        <aside className="opening-home__heroPanel" aria-label="Cinematic civilization scene">
          <div className="opening-home__scene">
            <div className="opening-home__scenePill">{scene.label}</div>
            <h2>{scene.title}</h2>
            <p>{scene.desc}</p>
          </div>
          <div className="opening-home__sceneStrip" aria-hidden="true">
            {CINEMATIC_SCENES.map((item, index) => (
              <button
                type="button"
                key={item.key}
                className={`opening-home__sceneDot${index === sceneIndex ? ' is-active' : ''}`}
                onClick={() => setSceneIndex(index)}
                aria-label={`Show ${item.title}`}
              />
            ))}
          </div>
          <p className="opening-home__heroMeta">
            Rotating scenes of miners, farmers, scientists, teachers, makers, and traders.
          </p>
        </aside>
      </section>

      <section className="section-card opening-home__missionBand">
        <div>
          <div className="pill">Core mission</div>
          <h2>Everything has origin, value, and a story.</h2>
        </div>
        <p>
          A coffee bean is agriculture, chemistry, economics, geography, culture, and trade. A gemstone is geology,
          mining, crystallography, jewelry, art, and history. PVA Bazaar is designed to preserve those meanings while
          connecting the people who need them.
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

      <section className="section-card opening-home__catalogSection">
        <div className="section-heading">
          <div>
            <div className="pill">Civilization atlas</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Organized around knowledge, not just shopping</h2>
          </div>
          <Link className="button ghost" to="/marketplace">Browse trade</Link>
        </div>
        <div className="opening-home__catalogGrid">
          {CIVILIZATION_CATEGORIES.map((category) => (
            <article key={category.key} className="opening-home__catalogCard">
              <h3>{category.title}</h3>
              <p>{category.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card opening-home__institutionSection">
        <div className="section-heading">
          <div>
            <div className="pill">Institutional partnerships</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Built for universities, museums, schools, labs, and governments</h2>
          </div>
          <Link className="button ghost" to="/creator">Partner with us</Link>
        </div>
        <div className="opening-home__institutionGrid">
          {INSTITUTION_PAGES.map((institution) => (
            <Link key={institution.key} className="opening-home__institutionCard" to={institution.to}>
              <strong>{institution.title}</strong>
              <span>{institution.desc}</span>
            </Link>
          ))}
        </div>
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
