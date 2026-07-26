import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CIVILIZATION_PAGES, CIVILIZATION_INSTITUTION_LINKS } from '../data/civilizationAtlas.js';
import { fetchHomepageFeed } from '../lib/api.js';
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
  { key: 'institutions', to: '/institutions', label: 'Institution Hub' },
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

const FEED_SECTIONS = [
  {
    key: 'latest',
    title: 'Latest across PVA Bazaar',
    summary: 'A combined stream of the newest public updates.',
    href: '/marketplace',
    emptyMessage: 'The live feed will fill here as new public updates are published.',
  },
  {
    key: 'books',
    title: 'Books',
    summary: 'Fresh published books and publishing updates.',
    href: '/books/published',
    emptyMessage: 'The first published book will appear here.',
  },
  {
    key: 'blogs',
    title: 'Blogs',
    summary: 'Newest public posts and essays.',
    href: '/archive',
    emptyMessage: 'The first blog post will appear here.',
  },
  {
    key: 'items',
    title: 'Items',
    summary: 'New marketplace listings and product updates.',
    href: '/marketplace',
    emptyMessage: 'The first marketplace item will appear here.',
  },
  {
    key: 'prices',
    title: 'Price watch',
    summary: 'Current listing prices and sale updates.',
    href: '/marketplace',
    emptyMessage: 'Price updates will appear here as listings change.',
  },
  {
    key: 'customers',
    title: 'Customers',
    summary: 'Recent public customer signups.',
    href: '/citizens',
    emptyMessage: 'New public customer signups will appear here.',
  },
  {
    key: 'suppliers',
    title: 'Suppliers',
    summary: 'Recent public supplier and creator signups.',
    href: '/creator',
    emptyMessage: 'New public supplier signups will appear here.',
  },
  {
    key: 'partnerships',
    title: 'Partnerships',
    summary: 'Business submissions and collaboration inquiries.',
    href: '/partnerships',
    emptyMessage: 'New business inquiries will appear here.',
  },
  {
    key: 'journal',
    title: 'Writing',
    summary: 'Public journal entries and archive notes.',
    href: '/archive',
    emptyMessage: 'The first public writing entry will appear here.',
  },
];

function formatFeedTimestamp(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatFeedCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '0';
}

function scrollToFeedSection(sectionKey) {
  if (typeof document === 'undefined') return;
  document.getElementById(`home-feed-${sectionKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildFeedPlaceholder(section) {
  return {
    id: `placeholder-${section.key}`,
    kind: 'placeholder',
    sectionKey: section.key,
    badge: section.title,
    title: `Waiting for the first ${section.title.toLowerCase()}`,
    summary: section.emptyMessage || section.summary,
    detail: 'This space will fill automatically when new content is published.',
    href: section.href,
    imageUrl: '',
    priceText: '',
    sourceLabel: 'Starter slot',
    timestamp: '',
  };
}

function LiveFeedCard({ card }) {
  const isPlaceholder = card?.kind === 'placeholder';
  const imageStyle = card?.imageUrl
    ? { backgroundImage: `url(${card.imageUrl})` }
    : undefined;

  return (
    <Link
      className={`opening-home__liveFeedCard${isPlaceholder ? ' is-placeholder' : ''}`}
      to={card?.href || '/marketplace'}
    >
      <div className="opening-home__liveFeedCardMedia" style={imageStyle} aria-hidden="true">
        {!card?.imageUrl ? (
          <span>{card?.badge || 'PVA Bazaar'}</span>
        ) : null}
      </div>
      <div className="opening-home__liveFeedCardBody">
        <div className="opening-home__liveFeedCardMeta">
          <span className="pill">{card?.badge || 'Update'}</span>
          {card?.priceText ? <span className="opening-home__liveFeedCardPrice">{card.priceText}</span> : null}
        </div>
        <h3>{card?.title || 'Untitled update'}</h3>
        <p>{card?.summary || 'Live content from across PVA Bazaar.'}</p>
        {card?.detail ? <small>{card.detail}</small> : null}
        <div className="opening-home__liveFeedCardFooter">
          <span>{card?.sourceLabel || 'Live update'}</span>
          {card?.timestamp ? <time dateTime={card.timestamp}>{formatFeedTimestamp(card.timestamp)}</time> : <span>Live now</span>}
        </div>
      </div>
    </Link>
  );
}

export default function OpeningHomePage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [homeFeed, setHomeFeed] = useState(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [feedCheckedAt, setFeedCheckedAt] = useState('');

  useEffect(() => {
    if (!CINEMATIC_SCENES.length) return undefined;

    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % CINEMATIC_SCENES.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshFeed = async ({ silent = false } = {}) => {
      try {
        if (!silent) setFeedLoading(true);
        const payload = await fetchHomepageFeed({ limit: 4, t: Date.now() });
        if (!active) return;
        setHomeFeed(payload || null);
        setFeedCheckedAt(payload?.updatedAt || new Date().toISOString());
        setFeedError('');
      } catch (error) {
        if (!active) return;
        setFeedError(error?.message || 'Unable to load live updates right now.');
      } finally {
        if (active && !silent) {
          setFeedLoading(false);
        }
      }
    };

    refreshFeed();
    const timer = window.setInterval(() => {
      refreshFeed({ silent: true });
    }, 60000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const scene = useMemo(() => CINEMATIC_SCENES[sceneIndex] || CINEMATIC_SCENES[0], [sceneIndex]);
  const feedCounts = homeFeed?.counts || {
    books: 0,
    blogs: 0,
    items: 0,
    prices: 0,
    customers: 0,
    suppliers: 0,
    partnerships: 0,
    journal: 0,
    total: 0,
  };
  const liveSections = (Array.isArray(homeFeed?.sections) && homeFeed.sections.length ? homeFeed.sections : FEED_SECTIONS).map((section) => {
    const cards = Array.isArray(section.cards) && section.cards.length ? section.cards : [buildFeedPlaceholder(section)];
    return {
      ...section,
      cards,
    };
  });
  const latestCards = Array.isArray(homeFeed?.items) && homeFeed.items.length
    ? homeFeed.items.slice(0, 6)
    : liveSections[0]?.cards?.slice(0, 6) || [buildFeedPlaceholder(FEED_SECTIONS[0])];
  const liveStatusLabel = feedLoading
    ? 'Loading live updates…'
    : feedError && !homeFeed
      ? 'Feed connection warning'
      : homeFeed?.source === 'mongo'
        ? 'Live Mongo feed connected'
        : 'Preview feed running';
  const liveStatusNote = feedError && homeFeed
    ? `Refresh warning: ${feedError}`
    : feedError
      ? feedError
      : feedCheckedAt || homeFeed?.updatedAt
        ? `Updated ${formatFeedTimestamp(feedCheckedAt || homeFeed?.updatedAt)}`
        : 'Waiting for the first live update.';

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
          {CIVILIZATION_PAGES.map((category) => (
            <Link key={category.slug} to={category.path} className="opening-home__catalogCard">
              <div className="opening-home__catalogCardMeta">
                <span className="pill">{category.kicker}</span>
                <span className="opening-home__catalogCardLink">Open category →</span>
              </div>
              <h3>{category.title}</h3>
              <p>{category.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-card opening-home__institutionSection">
        <div className="section-heading">
          <div>
            <div className="pill">Institutional partnerships</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Built for universities, museums, schools, labs, and governments</h2>
          </div>
          <Link className="button ghost" to="/institutions">Open institution hub</Link>
        </div>
        <div className="opening-home__institutionGrid">
          {CIVILIZATION_INSTITUTION_LINKS.map((institution) => (
            <Link key={institution.key} className="opening-home__institutionCard" to={institution.to}>
              <strong>{institution.title}</strong>
              <span>{institution.note}</span>
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

      <section className="section-card opening-home__liveFeed" aria-label="Live homepage feed">
        <div className="opening-home__liveFeedHeader">
          <div>
            <div className="pill">Live feed</div>
            <h2>What is new across PVA Bazaar right now</h2>
            <p>
              This section updates automatically with new books, blogs, items, prices, public signups, supplier
              activity, partnership inquiries, and writing.
            </p>
          </div>
          <div className="opening-home__liveFeedStatus">
            <strong>{liveStatusLabel}</strong>
            <span>{liveStatusNote}</span>
          </div>
        </div>

        <div className="opening-home__liveFeedStats" aria-label="Live feed summary">
          <div className="opening-home__liveFeedStat">
            <span>Total updates</span>
            <strong>{formatFeedCount(feedCounts.total)}</strong>
          </div>
          <div className="opening-home__liveFeedStat">
            <span>Books</span>
            <strong>{formatFeedCount(feedCounts.books)}</strong>
          </div>
          <div className="opening-home__liveFeedStat">
            <span>Items</span>
            <strong>{formatFeedCount(feedCounts.items)}</strong>
          </div>
          <div className="opening-home__liveFeedStat">
            <span>Partners</span>
            <strong>{formatFeedCount(Number(feedCounts.partnerships || 0) + Number(feedCounts.suppliers || 0))}</strong>
          </div>
        </div>

        <div className="opening-home__liveFeedNav" aria-label="Jump to feed sections">
          {liveSections.filter((section) => section.key !== 'latest').map((section) => (
            <button
              key={section.key}
              type="button"
              className="opening-home__liveFeedNavButton"
              onClick={() => scrollToFeedSection(section.key)}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="opening-home__liveFeedLatest">
          <div className="opening-home__liveFeedSectionHeading">
            <div>
              <span className="pill">Latest across the site</span>
              <h3>Newest items from every public surface</h3>
            </div>
            <Link className="button ghost" to="/marketplace">Open marketplace</Link>
          </div>
          <div className="opening-home__liveFeedGrid opening-home__liveFeedGrid--featured">
            {latestCards.map((card) => (
              <LiveFeedCard key={card.id} card={card} />
            ))}
          </div>
        </div>

        <div className="opening-home__liveFeedSections">
          {liveSections.filter((section) => section.key !== 'latest').map((section) => (
            <section key={section.key} id={`home-feed-${section.key}`} className="opening-home__liveFeedSection">
              <div className="opening-home__liveFeedSectionHeading">
                <div>
                  <span className="pill">{section.title}</span>
                  <h3>{section.summary}</h3>
                </div>
                <Link className="button ghost" to={section.href}>
                  Open {section.title.toLowerCase()}
                </Link>
              </div>
              <div className="opening-home__liveFeedGrid">
                {section.cards.map((card) => (
                  <LiveFeedCard key={card.id} card={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
