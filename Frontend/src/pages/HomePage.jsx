import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArchiveEntriesSafe } from '../lib/archiveFeed';
import { fetchProposals, fetchRecoverySnapshots } from '../lib/api';
import { HOME_CORE_ROUTES, HOME_SUPPORT_ROUTES } from '../config/publicRoutes';
import FederationManifesto from '../components/FederationManifesto.jsx';

const MAX_LATEST = 6;

export default function HomePage({ entries = [] }) {
  const [liveEntries, setLiveEntries] = useState([]);
  const [liveEntriesError, setLiveEntriesError] = useState('');
  const [liveEntriesLoading, setLiveEntriesLoading] = useState(true);
  const [latestProposals, setLatestProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [recoverySnapshots, setRecoverySnapshots] = useState([]);
  const [recoverySnapshotsLoading, setRecoverySnapshotsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadLatestEntries = async () => {
      setLiveEntriesLoading(true);
      setLiveEntriesError('');
      const result = await fetchArchiveEntriesSafe({ limit: MAX_LATEST, sort: 'new' });
      if (cancelled) return;
      if (result.ok) {
        setLiveEntries(Array.isArray(result.items) ? result.items.slice(0, MAX_LATEST) : []);
      } else {
        setLiveEntries([]);
        setLiveEntriesError(result.error || 'Unable to load archive entries right now.');
      }
      setLiveEntriesLoading(false);
    };

    loadLatestEntries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLatestProposals = async () => {
      setProposalsLoading(true);
      try {
        const response = await fetchProposals({
          status: 'open',
          sort: 'recent',
          page: 1,
          limit: 3,
        });
        if (cancelled) return;
        if (response?.ok && Array.isArray(response.items)) {
          setLatestProposals(response.items.slice(0, 3));
        } else {
          setLatestProposals([]);
        }
      } catch (_error) {
        if (!cancelled) setLatestProposals([]);
      } finally {
        if (!cancelled) setProposalsLoading(false);
      }
    };

    loadLatestProposals();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRecoverySnapshots = async () => {
      setRecoverySnapshotsLoading(true);
      try {
        const response = await fetchRecoverySnapshots();
        if (cancelled) return;
        setRecoverySnapshots(Array.isArray(response?.items) ? response.items : []);
      } catch (_error) {
        if (!cancelled) setRecoverySnapshots([]);
      } finally {
        if (!cancelled) setRecoverySnapshotsLoading(false);
      }
    };

    loadRecoverySnapshots();
    return () => {
      cancelled = true;
    };
  }, []);

  const latestEntries = useMemo(() => {
    const source = Array.isArray(liveEntries) && liveEntries.length > 0 ? liveEntries : entries;
    if (!Array.isArray(source) || source.length === 0) return [];

    return source.slice(0, MAX_LATEST).map((entry) => ({
      id: entry.id || entry._id || entry.externalId || entry.slug || entry.title,
      title: entry.title || entry.name || 'Untitled archive entry',
      to: '/archive',
      note: `${entry.date ? new Date(entry.date).toLocaleDateString() : 'Recent'} · ${entry.category || 'Archive'}`,
      excerpt: entry.excerpt || entry.summary || '',
    }));
  }, [entries, liveEntries]);

  const stats = useMemo(
    () => [
      { value: String(latestEntries.length || MAX_LATEST), label: 'Latest archive items' },
      { value: String(HOME_CORE_ROUTES.length), label: 'Core sections' },
      { value: String(HOME_SUPPORT_ROUTES.length), label: 'Support routes' },
      {
        value: `${HOME_CORE_ROUTES.filter((section) => section.featured).length}`,
        label: 'Featured civic hub',
      },
    ],
    [latestEntries.length],
  );

  const latestRecoverySnapshot = recoverySnapshots[0] || null;
  const pathGroups = useMemo(
    () => [
      {
        key: 'learning',
        kicker: 'Learn',
        title: 'Pure life knowledge for reading and study',
        description:
          'Start with the archive, books, and civilization library when you want to learn, reflect, or go deep.',
        cards: [
          {
            key: 'archive',
            title: 'Archive Library',
            to: '/archive',
            badge: 'Read',
            description: 'Open the living archive and long-form writings.',
          },
          {
            key: 'books',
            title: 'Books',
            to: '/books',
            badge: 'Study',
            description: 'Open the bigger works and explainers.',
          },
          {
            key: 'civilization',
            title: 'Civilization Library',
            to: '/civilization-library',
            badge: 'Wisdom',
            description: 'Read the worldview and knowledge sections.',
          },
        ],
      },
      {
        key: 'create',
        kicker: 'Create',
        title: 'For writing, making, and publishing',
        description:
          'Move from a thought to a draft, a post, a listing, or a supplier submission without getting lost.',
        cards: [
          {
            key: 'studio',
            title: 'Writing Studio',
            to: '/studio',
            badge: 'Write',
            description: 'Draft, edit, and publish your notes or posts.',
          },
          {
            key: 'creator',
            title: 'Supplier Portal',
            to: '/creator',
            badge: 'Sell',
            description: 'Start as a supplier, artisan, or sourcing partner.',
          },
          {
            key: 'marketplace',
            title: 'Marketplace',
            to: '/marketplace',
            badge: 'List',
            description: 'Browse goods, sourcing opportunities, and inventory.',
          },
        ],
      },
      {
        key: 'continuity',
        kicker: 'Return',
        title: 'For recovery and personal continuity',
        description:
          'Keep your context, backups, and identity close so the site follows you across devices and places.',
        cards: [
          {
            key: 'recovery',
            title: 'Recovery',
            to: '/recovery',
            badge: 'Backup',
            description: 'Save snapshots, restore bundles, and keep continuity alive.',
          },
          {
            key: 'passport',
            title: 'My Passport',
            to: '/passport',
            badge: 'Identity',
            description: 'Open the passport and wallet identity center.',
          },
          {
            key: 'start',
            title: 'Get Started',
            to: '/get-started',
            badge: 'Onboard',
            description: 'Create an account and choose your path.',
          },
        ],
      },
      {
        key: 'civic',
        kicker: 'Participate',
        title: 'For proposals and public decisions',
        description:
          'Use the civic surfaces when you want to discuss, vote, or see how public choices are made.',
        cards: [
          {
            key: 'proposals',
            title: 'Governance',
            to: '/proposals',
            badge: 'Vote',
            description: "Browse the People's Proposal Board.",
          },
          {
            key: 'forum',
            title: 'Forum',
            to: '/forum',
            badge: 'Discuss',
            description: 'Open the civic forum and proposal feed.',
          },
          {
            key: 'conference',
            title: 'Conference',
            to: '/conference',
            badge: 'Meet',
            description: 'Follow the conference workflow and sessions.',
          },
        ],
      },
      {
        key: 'world',
        kicker: 'Explore',
        title: 'For the world, the map, and the simulation',
        description:
          'Enter the simulation hub and world-reading surfaces from the same front page when you want to explore.',
        cards: [
          {
            key: 'heelkawn',
            title: 'HeelKawn',
            to: '/heelkawn',
            badge: 'Play',
            description: 'Enter the game and simulation hub.',
          },
          {
            key: 'federation',
            title: 'Federation Map',
            to: '/federation-map',
            badge: 'Live',
            description: 'View the live world pulse and roles.',
          },
          {
            key: 'citizens',
            title: 'Citizens',
            to: '/citizens',
            badge: 'People',
            description: 'Browse verified public societal profiles.',
          },
        ],
      },
    ],
    [],
  );
  const chooserButtons = useMemo(
    () => [
      {
        key: 'learn',
        label: 'Learn',
        to: '/archive',
        note: 'Read pure life knowledge and long-form writings.',
      },
      {
        key: 'buy',
        label: 'Buy',
        to: '/marketplace',
        note: 'Find goods, sourcing, and real trade.',
      },
      { key: 'sell', label: 'Sell', to: '/creator', note: 'Offer goods as a supplier or artisan.' },
      {
        key: 'recover',
        label: 'Recover',
        to: '/recovery',
        note: 'Restore context and keep continuity alive.',
      },
      {
        key: 'participate',
        label: 'Participate',
        to: '/proposals',
        note: 'Read, vote, and discuss public decisions.',
      },
      {
        key: 'explore',
        label: 'Explore',
        to: '/heelkawn',
        note: 'Enter the world, map, and simulation hub.',
      },
    ],
    [],
  );
  const featuredJourneys = useMemo(
    () => [
      {
        key: 'learn',
        title: 'If you want to learn',
        items: [
          { key: 'learn-archive', to: '/archive', label: 'Archive Library' },
          { key: 'learn-books', to: '/books', label: 'Books' },
          { key: 'learn-civilization', to: '/civilization-library', label: 'Civilization Library' },
        ],
      },
      {
        key: 'buy',
        title: 'If you want to buy',
        items: [
          { key: 'buy-marketplace', to: '/marketplace', label: 'Marketplace' },
          { key: 'buy-showroom', to: '/showroom', label: 'Showroom' },
          { key: 'buy-creator', to: '/creator', label: 'Supplier Portal' },
        ],
      },
      {
        key: 'recover',
        title: 'If you want to keep continuity',
        items: [
          { key: 'recover-console', to: '/recovery', label: 'Recovery' },
          { key: 'recover-passport', to: '/passport', label: 'My Passport' },
          { key: 'recover-start', to: '/get-started', label: 'Get Started' },
        ],
      },
    ],
    [],
  );

  return (
    <div className="home-page">
      <section className="home-hero section-card">
        <div className="home-hero__copy">
          <div className="pill home-hero__kicker">PVA Bazaar · Pure life knowledge</div>
          <h1>
            A human-friendly bazaar for pure life knowledge, writing, recovery, trade, and public
            life.
          </h1>
          <p>
            Pura Vida Ayurveda means pure life knowledge. This site is built as a friendly public
            atlas for all people: read the writings, buy and sell, recover your context, join public
            decisions, and explore the wider world from one front door.
          </p>
          <div className="home-hero__actions">
            <Link className="button" to="/archive">
              Open archive
            </Link>
            <Link className="button ghost" to="/marketplace">
              Open marketplace
            </Link>
            <Link className="button secondary" to="/heelkawn">
              Open HeelKawn
            </Link>
            <Link className="button ghost" to="/recovery">
              Open recovery
            </Link>
          </div>
        </div>

        <aside className="home-hero__panel" aria-label="Site snapshot">
          <div className="home-hero__panel-title">Site snapshot</div>
          <div className="home-stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="home-stat">
                <div className="home-stat__value">{stat.value}</div>
                <div className="home-stat__label">{stat.label}</div>
              </div>
            ))}
          </div>
          <p className="home-hero__panel-copy">
            The opening page is intentionally broad so first-time visitors can find the archive, the
            business surface, and the HeelKawn hub without having to guess where anything lives.
          </p>
        </aside>
      </section>

      <section className="section-card home-section-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Start here</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>What are you here for?</h2>
          </div>
          <Link className="button ghost" to="/archive">
            Open archive library
          </Link>
        </div>
        <p className="home-state-copy">
          Choose the path that matches your reason for being here. Each button leads to a section
          built for that purpose so the site stays friendly, clear, and useful.
        </p>
        <div className="home-choice-row" aria-label="Primary actions">
          {chooserButtons.map((button) => (
            <Link key={button.key} className="home-choice-button" to={button.to}>
              <strong>{button.label}</strong>
              <span>{button.note}</span>
            </Link>
          ))}
        </div>
        <div className="home-path-groups">
          {pathGroups.map((group) => (
            <article key={group.key} className="home-path-group">
              <div className="home-path-group__header">
                <div className="pill">{group.kicker}</div>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              <div className="home-path-grid">
                {group.cards.map((card) => (
                  <Link key={card.key} to={card.to} className="home-path-card">
                    <div className="home-path-card__meta">
                      <span className="pill">{card.badge}</span>
                    </div>
                    <strong>{card.title}</strong>
                    <p>{card.description}</p>
                    <span className="home-card__link">Open section →</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card home-section-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Featured journeys</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Suggested routes for different people</h2>
          </div>
          <Link className="button ghost" to="/about">
            Read the mission
          </Link>
        </div>
        <div className="home-journey-grid">
          {featuredJourneys.map((journey) => (
            <article key={journey.key} className="home-journey-card">
              <h3>{journey.title}</h3>
              <div className="home-journey-links">
                {journey.items.map((item) => (
                  <Link key={item.key} to={item.to} className="home-journey-link">
                    {item.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card home-section-shell home-continuity-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Continuity</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Latest remote backup</h2>
          </div>
          <Link className="button ghost" to="/recovery">
            Open recovery console
          </Link>
        </div>
        <div className="home-continuity-grid">
          <article className="home-continuity-card">
            <span className="home-continuity-label">Remote snapshots</span>
            <strong>{recoverySnapshotsLoading ? 'Loading...' : recoverySnapshots.length}</strong>
            <p>Encrypted backups saved to your account and ready to restore.</p>
          </article>
          <article className="home-continuity-card">
            <span className="home-continuity-label">Latest label</span>
            <strong>
              {recoverySnapshotsLoading
                ? 'Loading...'
                : latestRecoverySnapshot?.label || 'No backup yet'}
            </strong>
            <p>
              {latestRecoverySnapshot?.createdAt
                ? new Date(latestRecoverySnapshot.createdAt).toLocaleString()
                : 'Create a backup in the recovery console.'}
            </p>
          </article>
          <article className="home-continuity-card">
            <span className="home-continuity-label">Restore path</span>
            <strong>/recovery</strong>
            <p>
              Import a portable bundle, inspect saved snapshots, or restore your browser context.
            </p>
          </article>
        </div>
      </section>

      <FederationManifesto title="Federation Manifesto" />

      <section className="section-card home-section-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Start here</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Core sections</h2>
          </div>
          <Link className="button ghost" to="/library">
            Browse archive
          </Link>
        </div>
        <div className="home-section-grid home-section-grid--core">
          {HOME_CORE_ROUTES.map((section) => (
            <Link
              key={section.key}
              to={section.to}
              className={`home-card ${section.featured ? 'home-card--featured' : ''}`}
            >
              <div className="home-card__meta">
                <span className="pill">{section.badge || 'Route'}</span>
                {section.featured ? <span className="home-card__featured">Featured</span> : null}
              </div>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
              <span className="home-card__link">Open section →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-card home-section-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Navigation shell</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Secondary navigation</h2>
          </div>
          <Link className="button ghost" to="/conference">
            Open conference lifecycle
          </Link>
        </div>
        <div className="home-section-grid home-section-grid--support">
          {HOME_SUPPORT_ROUTES.map((route) => (
            <Link key={route.key} to={route.to} className="home-support-card">
              <h3>{route.title}</h3>
              <p>{route.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-card home-section-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Governance</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Latest Proposals</h2>
          </div>
          <Link className="button ghost" to="/proposals">
            See All Proposals
          </Link>
        </div>
        {proposalsLoading ? <p className="home-state-copy">Loading latest proposals...</p> : null}
        {!proposalsLoading && latestProposals.length === 0 ? (
          <p className="home-state-copy">No open proposals available right now.</p>
        ) : null}
        {!proposalsLoading && latestProposals.length > 0 ? (
          <div className="home-proposal-grid">
            {latestProposals.map((proposal) => {
              const threshold = Number(proposal.endorsementThreshold || 10);
              const count = Number(proposal.endorsementCount || 0);
              return (
                <article
                  key={proposal.proposalId || proposal._id}
                  className="entry-card home-proposal-card"
                >
                  <div className="proposal-card-head">
                    <span className="proposal-badge">{proposal.category}</span>
                    <span className={`proposal-badge status-${proposal.status}`}>
                      {proposal.status}
                    </span>
                  </div>
                  <h3>
                    <Link to={`/proposals/${encodeURIComponent(proposal.proposalId)}`}>
                      {proposal.title}
                    </Link>
                  </h3>
                  <p className="entry-meta">
                    By {proposal?.submittedBy?.name || 'Unknown citizen'} ·{' '}
                    {proposal?.createdAt
                      ? new Date(proposal.createdAt).toLocaleDateString()
                      : 'Unknown date'}
                  </p>
                  <p className="entry-excerpt">
                    {String(proposal.problem || '').slice(0, 140)}
                    {String(proposal.problem || '').length > 140 ? '…' : ''}
                  </p>
                  <p className="entry-meta">
                    {count}/{threshold} endorsements
                  </p>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="section-card home-section-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Live content</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Latest from PVA</h2>
          </div>
          <Link className="button ghost" to="/archive">
            View all works
          </Link>
        </div>
        <p className="home-state-copy">
          Latest from the archive feed, capped to the most recent items.
        </p>
        {liveEntriesLoading ? (
          <p className="home-state-copy">Loading latest archive entries...</p>
        ) : null}
        {!liveEntriesLoading && latestEntries.length > 0 ? (
          <div className="home-spotlight-grid">
            {latestEntries.map((entry) => (
              <article key={entry.id} className="entry-card home-spotlight-card">
                <h3>
                  <Link to={entry.to}>{entry.title}</Link>
                </h3>
                <div className="entry-meta">{entry.note}</div>
                {entry.excerpt ? <p className="entry-excerpt">{entry.excerpt}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
        {!liveEntriesLoading && latestEntries.length === 0 ? (
          <article className="entry-card home-fallback-card">
            <h3>Archive feed is unavailable right now</h3>
            <p className="entry-excerpt">
              {liveEntriesError ||
                'The live archive feed could not be loaded. You can still browse the full archive page.'}
            </p>
            <div>
              <Link className="button ghost" to="/archive">
                Open archive library
              </Link>
            </div>
          </article>
        ) : null}
      </section>
    </div>
  );
}
