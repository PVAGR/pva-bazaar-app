import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchArchiveEntriesSafe } from '../lib/archiveFeed'
import { fetchProposals } from '../lib/api'
import { HOME_CORE_ROUTES, HOME_SUPPORT_ROUTES } from '../config/publicRoutes'
import FederationManifesto from '../components/FederationManifesto.jsx'

const MAX_LATEST = 6

export default function HomePage({ entries = [] }) {
  const [liveEntries, setLiveEntries] = useState([])
  const [liveEntriesError, setLiveEntriesError] = useState('')
  const [liveEntriesLoading, setLiveEntriesLoading] = useState(true)
  const [latestProposals, setLatestProposals] = useState([])
  const [proposalsLoading, setProposalsLoading] = useState(true)

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

  useEffect(() => {
    let cancelled = false

    const loadLatestProposals = async () => {
      setProposalsLoading(true)
      try {
        const response = await fetchProposals({ status: 'open', sort: 'recent', page: 1, limit: 3 })
        if (cancelled) return
        if (response?.ok && Array.isArray(response.items)) {
          setLatestProposals(response.items.slice(0, 3))
        } else {
          setLatestProposals([])
        }
      } catch (_error) {
        if (!cancelled) setLatestProposals([])
      } finally {
        if (!cancelled) setProposalsLoading(false)
      }
    }
    loadLatestProposals()
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

  return (
    <div className="home-page">
      <section className="home-hero" aria-label="PVA Bazaar introduction">
        <span className="pill home-hero__badge">Pure Life Knowledge · Pura Vida Ayurveda</span>
        <h1 className="home-hero__title">The Living Bazaar</h1>
        <p className="home-hero__promise">
          A marketplace where objects and ideas carry their story. Read the archive and writings,
          buy and sell real goods with provenance, publish books, and partner with institutions -
          all from one front door.
        </p>
        <div className="home-hero__actions">
          <Link className="pva-btn pva-btn--primary" to="/archive">Open the archive</Link>
          <Link className="pva-btn pva-btn--ghost" to="/marketplace">Browse the marketplace</Link>
          <Link className="pva-btn pva-btn--ghost" to="/get-started">Join free</Link>
        </div>
      </section>

      <section className="home-section" aria-label="Core sections">
        <header className="pva-section-intro pva-section-intro--tight">
          <span className="pva-section-intro__badge">The doors</span>
          <h2 className="pva-section-intro__title">Everything has a place</h2>
          <p className="pva-section-intro__promise">
            Each door is a complete section with its own promise. Start anywhere; the site keeps its shape.
          </p>
        </header>
        <div className="home-doors">
          {HOME_CORE_ROUTES.map((section) => (
            <Link
              key={section.key}
              to={section.to}
              className={`home-door ${section.featured ? 'home-door--featured' : ''}`}
            >
              <span className="home-door__badge">{section.badge || 'Section'}</span>
              <h3 className="home-door__title">{section.title}</h3>
              <p className="home-door__promise">{section.description}</p>
              <span className="home-door__cta">Open section →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section home-section--feed" aria-label="Latest from PVA">
        <header className="pva-section-intro pva-section-intro--tight">
          <span className="pva-section-intro__badge">Live</span>
          <h2 className="pva-section-intro__title">Fresh from the bazaar</h2>
        </header>
        <div className="home-feed-grid">
          <article className="home-feed-card">
            <h3>Latest archive entries</h3>
            {liveEntriesLoading ? <p className="home-feed-state">Loading…</p> : null}
            {!liveEntriesLoading && latestEntries.length > 0 ? (
              <ul className="home-feed-list">
                {latestEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link to={entry.to}>{entry.title}</Link>
                    <span>{entry.note}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!liveEntriesLoading && latestEntries.length === 0 ? (
              <p className="home-feed-state">{liveEntriesError || 'The archive feed is quiet right now.'}</p>
            ) : null}
            <Link className="home-feed-more" to="/archive">All works →</Link>
          </article>

          <article className="home-feed-card">
            <h3>Open proposals</h3>
            {proposalsLoading ? <p className="home-feed-state">Loading…</p> : null}
            {!proposalsLoading && latestProposals.length > 0 ? (
              <ul className="home-feed-list">
                {latestProposals.map((proposal) => (
                  <li key={proposal.proposalId || proposal._id}>
                    <Link to={`/proposals/${encodeURIComponent(proposal.proposalId)}`}>{proposal.title}</Link>
                    <span>
                      {Number(proposal.endorsementCount || 0)}/{Number(proposal.endorsementThreshold || 10)} endorsements
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!proposalsLoading && latestProposals.length === 0 ? (
              <p className="home-feed-state">No open proposals right now.</p>
            ) : null}
            <Link className="home-feed-more" to="/proposals">Proposal board →</Link>
          </article>
        </div>
      </section>

      <nav className="home-support-band" aria-label="Support pages">
        <span className="home-support-band__label">Also here</span>
        {HOME_SUPPORT_ROUTES.map((route) => (
          <Link key={route.key} to={route.to} className="home-support-band__link">
            {route.title}
          </Link>
        ))}
        <Link to="/recovery" className="home-support-band__link">Recovery</Link>
        <Link to="/heelkawn" className="home-support-band__link">HeelKawn</Link>
      </nav>

      <FederationManifesto title="Federation Manifesto" />
    </div>
  )
}
