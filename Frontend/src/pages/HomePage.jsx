import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchArchiveEntriesSafe } from '../lib/archiveFeed'
import { HOME_CORE_ROUTES, HOME_SUPPORT_ROUTES } from '../config/publicRoutes'

const MAX_LATEST = 6

export default function HomePage({ entries = [] }) {
  const [liveEntries, setLiveEntries] = useState([])
  const [liveEntriesError, setLiveEntriesError] = useState('')
  const [liveEntriesLoading, setLiveEntriesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadLatestEntries = async () => {
      setLiveEntriesLoading(true)
      setLiveEntriesError('')
      const result = await fetchArchiveEntriesSafe({ limit: MAX_LATEST, sort: 'new' })
      if (cancelled) return
      if (result.ok) {
        setLiveEntries(Array.isArray(result.items) ? result.items.slice(0, MAX_LATEST) : [])
      } else {
        setLiveEntries([])
        setLiveEntriesError(result.error || 'Unable to load archive entries right now.')
      }
      setLiveEntriesLoading(false)
    }

    loadLatestEntries()
    return () => {
      cancelled = true
    }
  }, [])

  const latestEntries = useMemo(() => {
    const source = Array.isArray(liveEntries) && liveEntries.length > 0 ? liveEntries : entries
    if (!Array.isArray(source) || source.length === 0) return []

    return source.slice(0, MAX_LATEST).map((entry) => ({
      id: entry.id || entry._id || entry.externalId || entry.slug || entry.title,
      title: entry.title || entry.name || 'Untitled archive entry',
      to: '/archive',
      note: `${entry.date ? new Date(entry.date).toLocaleDateString() : 'Recent'} · ${entry.category || 'Archive'}`,
      excerpt: entry.excerpt || entry.summary || '',
    }))
  }, [entries, liveEntries])

  const stats = useMemo(() => [
    { value: String(latestEntries.length || MAX_LATEST), label: 'Latest archive items' },
    { value: String(HOME_CORE_ROUTES.length), label: 'Core sections' },
    { value: String(HOME_SUPPORT_ROUTES.length), label: 'Support routes' },
    { value: `${HOME_CORE_ROUTES.filter((section) => section.featured).length}`, label: 'Featured civic hub' },
  ], [latestEntries.length])

  return (
    <div className="home-page">
      <section className="home-hero section-card">
        <div className="home-hero__copy">
          <div className="pill home-hero__kicker">PVA Bazaar · Full Site Overview</div>
          <h1>One site, three layers: archive, commerce, and civic governance.</h1>
          <p>
            Start here to move between the living archive, the marketplace, the showroom, and the public
            governance spaces without losing the thread of the site.
          </p>
          <div className="home-hero__actions">
            <Link className="button" to="/archive">Enter archive</Link>
            <Link className="button ghost" to="/forum">Open forum</Link>
            <Link className="button secondary" to="/conference">Visit conference</Link>
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
            The Forum is the featured civic hub. Governance pages are public, and the route map is visible from the
            top navigation.
          </p>
        </aside>
      </section>

      <section className="section-card home-section-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Start here</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Core sections</h2>
          </div>
          <Link className="button ghost" to="/library">Browse archive</Link>
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
            <h2 style={{ margin: '0.35rem 0 0' }}>All public routes</h2>
          </div>
          <Link className="button ghost" to="/download-app">Get app link</Link>
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
            <div className="pill">Live content</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Latest from PVA</h2>
          </div>
          <Link className="button ghost" to="/archive">View all works</Link>
        </div>
        <p className="home-state-copy">Latest from the archive feed, capped to the most recent items.</p>
        {liveEntriesLoading ? <p className="home-state-copy">Loading latest archive entries...</p> : null}
        {!liveEntriesLoading && latestEntries.length > 0 ? (
          <div className="home-spotlight-grid">
            {latestEntries.map((entry) => (
              <article key={entry.id} className="entry-card home-spotlight-card">
                <h3><Link to={entry.to}>{entry.title}</Link></h3>
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
              {liveEntriesError || 'The live archive feed could not be loaded. You can still browse the full archive page.'}
            </p>
            <div>
              <Link className="button ghost" to="/archive">Open archive library</Link>
            </div>
          </article>
        ) : null}
      </section>
    </div>
  )
}
