import React, { useMemo, useState } from 'react'
import { useGovernanceStore } from '../../store/governanceStore'

const STAGE_ORDER = ['draft', 'endorsed', 'panel', 'vote', 'passed', 'rejected']

const stageTagClass = (stage) => {
  if (stage === 'vote') return 'gov-tag gov-tag-vote'
  if (stage === 'panel') return 'gov-tag gov-tag-panel'
  if (stage === 'endorsed') return 'gov-tag gov-tag-endorsed'
  if (stage === 'passed') return 'gov-tag gov-tag-passed'
  if (stage === 'rejected') return 'gov-tag gov-tag-rejected'
  return 'gov-tag gov-tag-draft'
}

const stageCardClass = (stage) => {
  if (stage === 'vote') return 'gov-card stage-vote'
  if (stage === 'panel') return 'gov-card stage-panel'
  if (stage === 'endorsed') return 'gov-card stage-endorsed'
  if (stage === 'passed') return 'gov-card stage-passed'
  return 'gov-card stage-draft'
}

const stageLabel = (stage) => {
  if (stage === 'vote') return 'Live Vote'
  if (stage === 'panel') return "Citizen Panel"
  if (stage === 'endorsed') return 'Endorsed'
  if (stage === 'passed') return 'Passed'
  if (stage === 'rejected') return 'Rejected'
  return 'Draft'
}

const votePercent = (yes, no) => {
  const total = yes + no
  if (!total) return 50
  return Math.max(0, Math.min(100, Math.round((yes / total) * 100)))
}

function Sidebar({ activePage, onPageChange, stats }) {
  return (
    <aside className="gov-sidebar">
      <div>
        <div className="gov-section-label">Civic Navigation</div>
        <div className="gov-nav-list">
          <button className={activePage === 'forum' ? 'active' : ''} onClick={() => onPageChange('forum')}>◉ Forum</button>
          <button className={activePage === 'conference' ? 'active' : ''} onClick={() => onPageChange('conference')}>◉ Conference VII</button>
          <button className={activePage === 'treasury' ? 'active' : ''} onClick={() => onPageChange('treasury')}>◉ Treasury</button>
        </div>
      </div>

      <div>
        <div className="gov-section-label">Community Pulse</div>
        <div className="gov-stats-grid">
          <div className="gov-stat-card">
            <div className="gov-stat-num">{stats.citizens}</div>
            <div className="gov-stat-label">Citizens</div>
          </div>
          <div className="gov-stat-card">
            <div className="gov-stat-num">{stats.proposals}</div>
            <div className="gov-stat-label">Proposals</div>
          </div>
          <div className="gov-stat-card">
            <div className="gov-stat-num">{stats.activeVotes}</div>
            <div className="gov-stat-label">Active Votes</div>
          </div>
          <div className="gov-stat-card">
            <div className="gov-stat-num">{stats.participation}%</div>
            <div className="gov-stat-label">Participation</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Hero({ onCreate }) {
  return (
    <section className="gov-hero">
      <div className="gov-hero-eyebrow">PVA Governance Layer</div>
      <h1 className="gov-hero-title">The <strong>Civic Forge</strong> of PVA Bazaar</h1>
      <p className="gov-hero-sub">
        Proposals move from draft to endorsement, panel review, and live voting. Every civic action is visible, traceable, and community-auditable.
      </p>
      <div className="gov-hero-actions">
        <button type="button" className="gov-btn gov-btn-primary" onClick={onCreate}>+ New Proposal</button>
        <button type="button" className="gov-btn gov-btn-ghost">View Governance Charter</button>
      </div>
    </section>
  )
}

function ProposalForm({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Governance')
  const [urgency, setUrgency] = useState('Standard')
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [outcome, setOutcome] = useState('')

  const canSubmit = title.trim() && solution.trim()

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSubmit) return

    onSubmit({
      title: title.trim(),
      category,
      urgency,
      problem: problem.trim(),
      solution: solution.trim(),
      outcome: outcome.trim(),
    })

    setTitle('')
    setProblem('')
    setSolution('')
    setOutcome('')
    onClose()
  }

  return (
    <form className="gov-form-wrap" onSubmit={handleSubmit}>
      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-title">Proposal Title</label>
        <input id="gov-title" className="gov-form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Expand clean water infrastructure" />
      </div>

      <div className="gov-form-row">
        <div className="gov-form-group">
          <label className="gov-form-label" htmlFor="gov-category">Category</label>
          <select id="gov-category" className="gov-form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Governance</option>
            <option>Infrastructure</option>
            <option>Health</option>
            <option>Education</option>
            <option>Economy</option>
          </select>
        </div>

        <div className="gov-form-group">
          <label className="gov-form-label" htmlFor="gov-urgency">Urgency</label>
          <select id="gov-urgency" className="gov-form-select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option>Standard</option>
            <option>High</option>
          </select>
        </div>
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-problem">Problem</label>
        <textarea id="gov-problem" className="gov-form-textarea" value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="What issue does this solve?" />
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-solution">Solution</label>
        <textarea id="gov-solution" className="gov-form-textarea" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Describe the implementation plan" />
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-outcome">Expected Outcome</label>
        <textarea id="gov-outcome" className="gov-form-textarea" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Expected measurable impact" />
      </div>

      <div className="gov-form-actions">
        <button type="button" className="gov-btn gov-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="gov-btn gov-btn-primary" disabled={!canSubmit}>Submit Proposal</button>
      </div>
    </form>
  )
}

function ProposalCard({ proposal, onEndorse, onVote, onOpen }) {
  const yesPct = votePercent(proposal.yesVotes, proposal.noVotes)
  const handleOpen = () => onOpen(proposal)
  const handleKeyOpen = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(proposal)
    }
  }

  return (
    <article
      className={stageCardClass(proposal.stage)}
      onClick={handleOpen}
      onKeyDown={handleKeyOpen}
      role="button"
      tabIndex={0}
    >
      <div className="gov-card-meta">
        <span className={stageTagClass(proposal.stage)}>{stageLabel(proposal.stage)}</span>
        <span className="gov-tag gov-tag-cat">{proposal.category}</span>
        {proposal.urgency === 'High' ? <span className="gov-pill-urgent">Urgent</span> : null}
      </div>

      <h3 className="gov-card-title">{proposal.title}</h3>
      <p className="gov-card-excerpt">{proposal.excerpt}</p>

      {proposal.stage === 'vote' ? (
        <div className="gov-vote-bar-wrap">
          <div className="gov-vote-bar-labels">
            <span>YES {proposal.yesVotes.toLocaleString()}</span>
            <span>NO {proposal.noVotes.toLocaleString()}</span>
          </div>
          <div className="gov-vote-bar">
            <div className="gov-vote-bar-fill" style={{ width: `${yesPct}%` }} />
          </div>
        </div>
      ) : null}

      <div className="gov-card-footer">
        <div className="gov-card-author">
          <span className="gov-avatar" style={{ background: proposal.authorColor }}>{proposal.authorInitial}</span>
          <span>{proposal.author}</span>
          <span>·</span>
          <span>{proposal.id}</span>
        </div>

        <div className="gov-card-actions">
          <button
            type="button"
            className={proposal.userEndorsed ? 'gov-action-btn liked' : 'gov-action-btn'}
            onClick={(event) => {
              event.stopPropagation()
              onEndorse(proposal.id)
            }}
            disabled={proposal.userEndorsed}
          >
            ⬆ {proposal.endorsements}
          </button>

          {proposal.stage === 'vote' ? (
            <>
              <button
                type="button"
                className={proposal.userVote === 'yes' ? 'gov-action-btn voted-yes' : 'gov-action-btn'}
                onClick={(event) => {
                  event.stopPropagation()
                  onVote(proposal.id, 'yes')
                }}
              >
                YES
              </button>
              <button
                type="button"
                className={proposal.userVote === 'no' ? 'gov-action-btn voted-no' : 'gov-action-btn'}
                onClick={(event) => {
                  event.stopPropagation()
                  onVote(proposal.id, 'no')
                }}
              >
                NO
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="gov-action-btn"
            onClick={(event) => event.stopPropagation()}
          >
            💬 {proposal.comments}
          </button>
        </div>
      </div>
    </article>
  )
}

function ProposalModal({ proposal, onClose, onVote, onOverlayKeyDown }) {
  if (!proposal) return null

  const yesPct = votePercent(proposal.yesVotes, proposal.noVotes)

  return (
    <div
      className="gov-modal-overlay"
      onClick={onClose}
      onKeyDown={onOverlayKeyDown}
      role="button"
      tabIndex={0}
    >
      <div
        className="gov-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="gov-modal-header">
          <div>
            <div className="gov-card-meta">
              <span className={stageTagClass(proposal.stage)}>{stageLabel(proposal.stage)}</span>
              <span className="gov-tag gov-tag-cat">{proposal.category}</span>
              <span className="gov-tag">{proposal.id}</span>
            </div>
            <h3 className="gov-modal-title">{proposal.title}</h3>
          </div>
          <button type="button" className="gov-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="gov-stage-timeline">
          {STAGE_ORDER.map((step, idx) => {
            const done = idx < proposal.lifecycle
            const current = idx + 1 === proposal.lifecycle
            return (
              <div key={step} className={`gov-stage-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                <div className="gov-stage-dot">{idx + 1}</div>
                <div className="gov-stage-label">{stageLabel(step)}</div>
              </div>
            )
          })}
        </div>

        <div className="gov-detail-section">
          <div className="gov-detail-title">Problem</div>
          <div className="gov-detail-body">{proposal.problem || proposal.excerpt}</div>
        </div>

        <div className="gov-detail-section">
          <div className="gov-detail-title">Solution</div>
          <div className="gov-detail-body">{proposal.solution || proposal.excerpt}</div>
        </div>

        <div className="gov-detail-section">
          <div className="gov-detail-title">Expected Outcome</div>
          <div className="gov-detail-body">{proposal.outcome || 'Outcome report pending publication.'}</div>
        </div>

        {proposal.panelStatement ? (
          <div className="gov-detail-section">
            <div className="gov-detail-title">Panel Statement</div>
            <div className="gov-detail-body">{proposal.panelStatement}</div>
          </div>
        ) : null}

        {proposal.stage === 'vote' ? (
          <div className="gov-detail-section">
            <div className="gov-detail-title">Live Vote</div>
            <div className="gov-vr-row">
              <div className="gov-vr-label">YES</div>
              <div className="gov-vr-bar"><div className="gov-vr-fill-yes" style={{ width: `${yesPct}%` }} /></div>
              <div className="gov-vr-pct">{yesPct}%</div>
            </div>
            <div className="gov-vr-row">
              <div className="gov-vr-label">NO</div>
              <div className="gov-vr-bar"><div className="gov-vr-fill-no" style={{ width: `${100 - yesPct}%` }} /></div>
              <div className="gov-vr-pct">{100 - yesPct}%</div>
            </div>
            <div className="gov-big-vote-btns">
              <button
                type="button"
                className={proposal.userVote === 'yes' ? 'gov-big-vote-btn gov-vote-yes selected' : 'gov-big-vote-btn gov-vote-yes'}
                onClick={() => onVote(proposal.id, 'yes')}
              >
                Vote YES
              </button>
              <button
                type="button"
                className={proposal.userVote === 'no' ? 'gov-big-vote-btn gov-vote-no selected' : 'gov-big-vote-btn gov-vote-no'}
                onClick={() => onVote(proposal.id, 'no')}
              >
                Vote NO
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function LiveVoteWidget({ proposal, onVote }) {
  if (!proposal) {
    return (
      <section className="gov-live-widget">
        <div className="gov-live-badge"><span className="gov-live-dot" /> No Live Vote</div>
        <div className="gov-widget-title">No proposal in voting stage right now</div>
        <div className="gov-widget-desc">Once a proposal reaches the voting phase, you will be able to cast your vote here.</div>
      </section>
    )
  }

  const yesPct = votePercent(proposal.yesVotes, proposal.noVotes)

  return (
    <section className="gov-live-widget">
      <div className="gov-live-badge"><span className="gov-live-dot" /> Live Voting</div>
      <div className="gov-widget-title">{proposal.id}: {proposal.title}</div>
      <div className="gov-widget-desc">Voting window closes in {proposal.daysLeft || 0} days. Vote is ZK-proven and posted to governance ledger.</div>

      <div className="gov-big-vote-btns">
        <button
          type="button"
          className={proposal.userVote === 'yes' ? 'gov-big-vote-btn gov-vote-yes selected' : 'gov-big-vote-btn gov-vote-yes'}
          onClick={() => onVote(proposal.id, 'yes')}
        >
          YES
        </button>
        <button
          type="button"
          className={proposal.userVote === 'no' ? 'gov-big-vote-btn gov-vote-no selected' : 'gov-big-vote-btn gov-vote-no'}
          onClick={() => onVote(proposal.id, 'no')}
        >
          NO
        </button>
      </div>

      <div className="gov-vr-row">
        <div className="gov-vr-label">YES</div>
        <div className="gov-vr-bar"><div className="gov-vr-fill-yes" style={{ width: `${yesPct}%` }} /></div>
        <div className="gov-vr-pct">{yesPct}%</div>
      </div>
      <div className="gov-vr-row">
        <div className="gov-vr-label">NO</div>
        <div className="gov-vr-bar"><div className="gov-vr-fill-no" style={{ width: `${100 - yesPct}%` }} /></div>
        <div className="gov-vr-pct">{100 - yesPct}%</div>
      </div>
      <div className="gov-vote-tally">{(proposal.yesVotes + proposal.noVotes).toLocaleString()} verified votes</div>
    </section>
  )
}

function Ticker({ events }) {
  return (
    <section className="gov-ticker">
      <div className="gov-ticker-title">Ledger Feed</div>
      {events.length === 0 ? (
        <div className="gov-ticker-item">
          <span className="gov-ticker-hash">0xseed</span>
          <span className="gov-ticker-event">No recent events yet</span>
        </div>
      ) : (
        events.map((event) => (
          <div className="gov-ticker-item" key={event.id}>
            <span className="gov-ticker-hash">{event.hash}</span>
            <span className="gov-ticker-event">{event.msg}</span>
          </div>
        ))
      )}
    </section>
  )
}

function Passport({ citizen }) {
  return (
    <section className="gov-passport">
      <div className="gov-passport-header">
        <div className="gov-passport-avatar">{citizen.initial}</div>
        <div>
          <div className="gov-passport-name">{citizen.name}</div>
          <div className="gov-passport-id">Citizen #{citizen.id}</div>
        </div>
      </div>

      <div className="gov-passport-stats">
        <div className="gov-p-stat">
          <div className="gov-p-stat-num">{citizen.votes}</div>
          <div className="gov-p-stat-label">Votes</div>
        </div>
        <div className="gov-p-stat">
          <div className="gov-p-stat-num">{citizen.proposals}</div>
          <div className="gov-p-stat-label">Proposals</div>
        </div>
        <div className="gov-p-stat">
          <div className="gov-p-stat-num">{citizen.tokens}</div>
          <div className="gov-p-stat-label">PVA</div>
        </div>
      </div>

      <div className="gov-rep-bar-header">
        <span>Reputation</span>
        <span>{citizen.reputation}%</span>
      </div>
      <div className="gov-rep-bar">
        <div className="gov-rep-bar-fill" style={{ width: `${citizen.reputation}%` }} />
      </div>
    </section>
  )
}

function ConferenceCountdown({ conference }) {
  const now = Date.now()
  const diff = Math.max(0, conference.targetDate - now)
  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <section className="gov-conf-alert">
      <div className="gov-conf-icon">⌛</div>
      <div>
        <div className="gov-conf-title">Citizens Conference #{conference.number}</div>
        <div className="gov-conf-desc">{conference.date} · {conference.location}</div>
        <div className="gov-countdown">
          <div className="gov-countdown-unit">
            <div className="gov-countdown-num">{days}</div>
            <div className="gov-countdown-label">Days</div>
          </div>
          <div className="gov-countdown-unit">
            <div className="gov-countdown-num">{hours}</div>
            <div className="gov-countdown-label">Hours</div>
          </div>
          <div className="gov-countdown-unit">
            <div className="gov-countdown-num">{minutes}</div>
            <div className="gov-countdown-label">Minutes</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ForumMain({ proposals, onEndorse, onVote, onOpen }) {
  return (
    <>
      <div className="gov-section-header">
        <div className="gov-section-title">Proposal Feed</div>
        <div className="gov-section-meta">{proposals.length} visible proposals</div>
      </div>
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          onEndorse={onEndorse}
          onVote={onVote}
          onOpen={onOpen}
        />
      ))}
    </>
  )
}

function ConferencePage({ conference }) {
  return (
    <section>
      <div className="gov-section-header">
        <div className="gov-section-title">Conference Agenda</div>
        <div className="gov-section-meta">Session #{conference.number}</div>
      </div>
      <div className="gov-card">
        {conference.agenda.map((slot) => (
          <div className="gov-agenda-item" key={`${slot.time}-${slot.item}`}>
            <div className="gov-agenda-time">{slot.time}</div>
            <div className="gov-agenda-desc">{slot.item}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TreasuryPage({ treasury }) {
  return (
    <section>
      <div className="gov-section-header">
        <div className="gov-section-title">Treasury Ledger</div>
        <div className="gov-section-meta">Fully transparent accounting</div>
      </div>

      <div className="gov-treasury-grid">
        <div className="gov-treasury-card">
          <div className="gov-treasury-card-label">Total Supply</div>
          <div className="gov-treasury-card-num">{treasury.totalSupply.toLocaleString()}</div>
          <div className="gov-treasury-card-sub">PVA</div>
        </div>
        <div className="gov-treasury-card">
          <div className="gov-treasury-card-label">Circulating</div>
          <div className="gov-treasury-card-num">{treasury.circulating.toLocaleString()}</div>
          <div className="gov-treasury-card-sub">PVA</div>
        </div>
        <div className="gov-treasury-card">
          <div className="gov-treasury-card-label">Community Fund</div>
          <div className="gov-treasury-card-num">{treasury.communityFund.toLocaleString()}</div>
          <div className="gov-treasury-card-sub">PVA</div>
        </div>
        <div className="gov-treasury-card">
          <div className="gov-treasury-card-label">Proposal Reserve</div>
          <div className="gov-treasury-card-num">{treasury.proposalReserve.toLocaleString()}</div>
          <div className="gov-treasury-card-sub">PVA</div>
        </div>
      </div>

      <div className="gov-card">
        <div className="gov-section-title" style={{ marginBottom: '0.6rem' }}>Recent Transactions</div>
        {treasury.recentTransactions.map((tx) => (
          <div className="gov-tx-item" key={tx.id}>
            <div className="gov-tx-id">{tx.id}</div>
            <div className="gov-tx-desc">{tx.desc}</div>
            <div className="gov-tx-date">{tx.date}</div>
            <div className={tx.type === 'payout' ? 'gov-tx-amount gov-tx-payout' : 'gov-tx-amount gov-tx-deposit'}>
              {tx.type === 'payout' ? '-' : '+'}{tx.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function RightPanel({ liveProposal, tickerEvents, citizen, onVote }) {
  return (
    <aside className="gov-right-panel">
      <LiveVoteWidget proposal={liveProposal} onVote={onVote} />
      <Ticker events={tickerEvents} />
      <Passport citizen={citizen} />
    </aside>
  )
}

export default function GovernanceInterface({ initialPage = 'forum' }) {
  const proposals = useGovernanceStore((s) => s.proposals)
  const conference = useGovernanceStore((s) => s.conference)
  const treasury = useGovernanceStore((s) => s.treasury)
  const citizen = useGovernanceStore((s) => s.citizen)
  const stats = useGovernanceStore((s) => s.communityStats)
  const tickerEvents = useGovernanceStore((s) => s.tickerEvents)
  const addProposal = useGovernanceStore((s) => s.addProposal)
  const endorseProposal = useGovernanceStore((s) => s.endorseProposal)
  const castVote = useGovernanceStore((s) => s.castVote)
  const toasts = useGovernanceStore((s) => s.toasts)

  const [activePage, setActivePage] = useState(initialPage)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState(null)

  const handleModalOverlayKeyDown = (event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedProposal(null)
    }
  }

  const liveProposal = useMemo(
    () => proposals.find((p) => p.stage === 'vote') || null,
    [proposals]
  )

  const filteredProposals = useMemo(() => {
    const q = query.trim().toLowerCase()
    return proposals
      .filter((p) => (stageFilter === 'all' ? true : p.stage === stageFilter))
      .filter((p) => {
        if (!q) return true
        return (
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [proposals, query, stageFilter])

  return (
    <div className="gov-page">
      <div className="gov-layout">
        <Sidebar activePage={activePage} onPageChange={setActivePage} stats={stats} />

        <main className="gov-main">
          {activePage === 'forum' ? (
            <>
              <Hero onCreate={() => setShowForm((v) => !v)} />
              <ConferenceCountdown conference={conference} />

              {showForm ? (
                <ProposalForm
                  onClose={() => setShowForm(false)}
                  onSubmit={(payload) => addProposal(payload)}
                />
              ) : null}

              <div className="gov-search-bar">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search proposals by title, id, category..."
                />
              </div>

              <div className="gov-filters">
                <button
                  type="button"
                  className={stageFilter === 'all' ? 'gov-filter-btn active' : 'gov-filter-btn'}
                  onClick={() => setStageFilter('all')}
                >
                  All
                </button>
                {STAGE_ORDER.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    className={stageFilter === stage ? 'gov-filter-btn active' : 'gov-filter-btn'}
                    onClick={() => setStageFilter(stage)}
                  >
                    {stageLabel(stage)}
                  </button>
                ))}
              </div>

              <ForumMain
                proposals={filteredProposals}
                onEndorse={endorseProposal}
                onVote={castVote}
                onOpen={setSelectedProposal}
              />
            </>
          ) : null}

          {activePage === 'conference' ? <ConferencePage conference={conference} /> : null}
          {activePage === 'treasury' ? <TreasuryPage treasury={treasury} /> : null}
        </main>

        <RightPanel
          liveProposal={liveProposal}
          tickerEvents={tickerEvents}
          citizen={citizen}
          onVote={castVote}
        />
      </div>

      <ProposalModal
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
        onVote={castVote}
        onOverlayKeyDown={handleModalOverlayKeyDown}
      />

      <div className="gov-toast-container">
        {toasts.map((toast) => (
          <div className="gov-toast" key={toast.id}>
            <span>⚑</span>
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
