import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGovernanceStore } from '../store/governanceStore';
import './CitizenPassportPage.css';

const ROLE_CARDS = [
  {
    key: 'visitor',
    title: 'Visitor',
    powers: 'Browse public archive, marketplace, and conference discussions.',
    limits: 'No verified voting identity, no proposal publishing authority.',
  },
  {
    key: 'citizen',
    title: 'Citizen',
    powers: 'Submit proposals, support initiatives, cast votes, and build a civic record.',
    limits: 'Cannot issue official moderation decisions or treasury controls.',
  },
  {
    key: 'committee',
    title: 'Committee Member',
    powers: 'Review conference queue, prepare recommendations, and steward execution quality.',
    limits: 'Decisions must still flow through formal secretariat/admin channels.',
  },
  {
    key: 'secretariat',
    title: 'Secretariat',
    powers: 'Publish official responses, coordinate queue throughput, and record policy outcomes.',
    limits: 'Higher-risk controls still require explicit admin authorization.',
  },
  {
    key: 'admin',
    title: 'Admin',
    powers: 'Access governance administration, treasury controls, approvals, and site operations.',
    limits: 'Accountable to public records and governance policy boundaries.',
  },
];

const CREDENTIAL_STEPS = [
  {
    title: 'App Account',
    state: 'Live now',
    detail: 'Citizen profile and membership state are active in the current application layer.',
    live: true,
  },
  {
    title: 'Wallet Binding',
    state: 'Live now',
    detail: 'Users can connect an EVM wallet and bind it to passport identity context.',
    live: true,
  },
  {
    title: 'Verifiable Credential',
    state: 'Planned next',
    detail: 'Passport assertions will become VC-ready for portable trust and role verification.',
    live: false,
  },
  {
    title: 'On-Chain / Smart Account Identity',
    state: 'Planned next',
    detail: 'Roadmap includes DID anchoring and ERC-4337 smart-account-compatible identity operations.',
    live: false,
  },
];

const SUPPORTED_WALLETS = ['MetaMask (EVM browser wallet)', 'Injected EVM wallets', 'Secure mobile deep-link handoff'];
const FUTURE_WALLETS = ['WalletConnect session routing', 'Contract account support (ERC-4337)', 'Delegated session keys for civic actions'];

function statusLabel(citizenRole, memberActive, committeeAssignments) {
  if (!memberActive) return 'Visitor';
  if (String(citizenRole || '').toLowerCase() === 'admin') return 'Admin';
  if (String(citizenRole || '').toLowerCase() === 'secretariat') return 'Secretariat';
  if (String(citizenRole || '').toLowerCase() === 'committee' || (committeeAssignments || []).length > 0) return 'Committee';
  return 'Citizen';
}

export default function CitizenPassportPage() {
  const proposals = useGovernanceStore((state) => state.proposals);
  const citizen = useGovernanceStore((state) => state.citizen);
  const citizenPassport = useGovernanceStore((state) => state.citizenPassport);
  const citizenRole = useGovernanceStore((state) => state.citizenRole);
  const committeeAssignments = useGovernanceStore((state) => state.committeeAssignments);
  const treasury = useGovernanceStore((state) => state.treasury);
  const ensureCitizenMembership = useGovernanceStore((state) => state.ensureCitizenMembership);

  const [walletState, setWalletState] = useState('Not connected');

  const computed = useMemo(() => {
    const citizenName = citizenPassport?.name || citizen?.name || '';
    const citizenId = citizenPassport?.citizenId || '';

    const proposalsCreated = proposals.filter((proposal) => {
      const createdBy = String(proposal.createdBy || proposal.author || '').trim();
      return createdBy && createdBy === citizenName;
    });

    const supportsCast = proposals.filter((proposal) => {
      const supporters = Array.isArray(proposal.supporters) ? proposal.supporters : [];
      return supporters.includes(citizenId);
    });

    const commentsMade = proposals.reduce((count, proposal) => {
      const comments = Array.isArray(proposal.comments) ? proposal.comments : [];
      return count + comments.filter((comment) => {
        const byId = String(comment.authorId || '') === String(citizenId);
        const byName = String(comment.authorName || '') === String(citizenName);
        return byId || byName;
      }).length;
    }, 0);

    const conferenceParticipation = proposals.filter((proposal) => (
      ['conference_queue', 'threshold_reached', 'accepted', 'in_execution', 'completed'].includes(proposal.status)
    )).length;

    const officialResponsesVisible = proposals.filter((proposal) => Boolean(proposal.adminDecision || proposal.adminReason)).length;

    const proposalParticipation = proposalsCreated.length + supportsCast.length;
    const governanceParticipation = proposalParticipation + commentsMade;

    return {
      proposalsCreated: proposalsCreated.length,
      supportsCast: supportsCast.length,
      commentsMade,
      conferenceParticipation,
      officialResponsesVisible,
      proposalParticipation,
      governanceParticipation,
    };
  }, [citizen, citizenPassport, proposals]);

  const handleConnectWallet = async () => {
    const eth = globalThis?.ethereum;
    if (!eth) {
      setWalletState('No wallet provider detected in this browser.');
      ensureCitizenMembership('');
      return;
    }

    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const walletAddress = String(accounts?.[0] || '');
      ensureCitizenMembership(walletAddress);
      setWalletState(walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected without address.');
    } catch (_err) {
      setWalletState('Wallet connection request was cancelled or failed.');
    }
  };

  const membershipLabel = statusLabel(citizenRole, citizenPassport?.memberActive, committeeAssignments);

  return (
    <div className="identity-page">
      <section className="identity-hero section-card">
        <div>
          <div className="pill">Phase C1 · Citizen Passport + Wallet + Identity Lab</div>
          <h1>Citizen Passport</h1>
          <p>
            The Citizen Passport is your identity layer for governance participation, wallet-linked reputation,
            and future credential portability across the PVA civilization stack.
          </p>
        </div>
        <div className="identity-hero__meta">
          <div className="identity-status">Status: {membershipLabel}</div>
          <div className="identity-cta-row">
            <button type="button" className="button" onClick={handleConnectWallet}>Connect Wallet</button>
            <a className="button ghost" href="#governance">View Governance Record</a>
            <a className="button secondary" href="#economic">View Economic Record</a>
          </div>
          <p className="identity-wallet-note">{walletState}</p>
        </div>
      </section>

      <section id="identity" className="section-card identity-grid identity-overview">
        <h2>Identity Overview</h2>
        <div className="identity-metric-grid">
          <article className="identity-metric"><h3>Membership</h3><p>{citizenPassport?.memberActive ? 'Active Citizen Passport' : 'Visitor'}</p></article>
          <article className="identity-metric"><h3>Wallet</h3><p>{citizenPassport?.walletAddress ? `${citizenPassport.walletAddress.slice(0, 6)}...${citizenPassport.walletAddress.slice(-4)}` : 'Not connected'}</p></article>
          <article className="identity-metric"><h3>Governance participation</h3><p>{computed.governanceParticipation}</p></article>
          <article className="identity-metric"><h3>Committee membership</h3><p>{committeeAssignments?.length || 0} assignments</p></article>
          <article className="identity-metric"><h3>Proposal participation</h3><p>{computed.proposalParticipation}</p></article>
          <article className="identity-metric"><h3>Votes cast</h3><p>{Number(citizen?.votes || 0)}</p></article>
          <article className="identity-metric"><h3>Contribution score</h3><p>{Number(citizen?.reputation || 0)} / 100</p></article>
        </div>
      </section>

      <section className="section-card identity-grid">
        <h2>Credential Roadmap</h2>
        <div className="identity-roadmap-grid">
          {CREDENTIAL_STEPS.map((step, idx) => (
            <article key={step.title} className={`identity-roadmap-step ${step.live ? 'is-live' : 'is-planned'}`}>
              <div className="identity-roadmap-index">Step {idx + 1}</div>
              <h3>{step.title}</h3>
              <p className="identity-roadmap-state">{step.state}</p>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card identity-grid">
        <h2>Role System</h2>
        <div className="identity-role-grid">
          {ROLE_CARDS.map((role) => (
            <article key={role.key} className={`identity-role-card ${role.title === membershipLabel ? 'is-active' : ''}`}>
              <h3>{role.title}</h3>
              <p><strong>Powers:</strong> {role.powers}</p>
              <p><strong>Limits:</strong> {role.limits}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="wallet" className="section-card identity-grid">
        <h2>Wallet Center</h2>
        <div className="identity-columns">
          <article className="identity-panel">
            <h3>Connection state</h3>
            <p>{citizenPassport?.walletAddress ? 'Wallet linked to passport context.' : 'Wallet not yet linked to passport context.'}</p>
            <p className="identity-muted">Current: {citizenPassport?.walletAddress || 'No bound wallet address'}</p>
            <button type="button" className="button" onClick={handleConnectWallet}>Connect Wallet</button>
          </article>
          <article className="identity-panel">
            <h3>Supported wallets</h3>
            <ul>
              {SUPPORTED_WALLETS.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <h3>Wallet actions</h3>
            <ul>
              <li>Bind wallet to passport identity context</li>
              <li>Open governance and economic records with wallet context</li>
              <li>Prepare for verifiable credential issuance</li>
            </ul>
          </article>
          <article className="identity-panel">
            <h3>Future support</h3>
            <ul>
              {FUTURE_WALLETS.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="identity-muted">Planned features are roadmap items and are not yet live on-chain.</p>
          </article>
        </div>
      </section>

      <section id="governance" className="section-card identity-grid">
        <h2>Governance Record</h2>
        <div className="identity-metric-grid">
          <article className="identity-metric"><h3>Proposals created</h3><p>{computed.proposalsCreated}</p></article>
          <article className="identity-metric"><h3>Supports cast</h3><p>{computed.supportsCast}</p></article>
          <article className="identity-metric"><h3>Comments made</h3><p>{computed.commentsMade}</p></article>
          <article className="identity-metric"><h3>Conference participation</h3><p>{computed.conferenceParticipation}</p></article>
          <article className="identity-metric"><h3>Official responses visible</h3><p>{computed.officialResponsesVisible}</p></article>
        </div>
        <div className="identity-inline-links">
          <Link className="button ghost" to="/conference">Open Popular Conference</Link>
          <Link className="button secondary" to="/governance/conference">Open Governance Conference</Link>
        </div>
      </section>

      <section id="economic" className="section-card identity-grid">
        <h2>Economic Record</h2>
        <div className="identity-metric-grid">
          <article className="identity-metric"><h3>Wallet balance</h3><p>{Number(citizen?.tokens || 0)} PVA (live app record)</p></article>
          <article className="identity-metric"><h3>Treasury participation</h3><p>{computed.conferenceParticipation} civic execution events</p></article>
          <article className="identity-metric"><h3>Marketplace activity</h3><p>Live profile/order data exists in account dashboards</p></article>
          <article className="identity-metric"><h3>Grants / labor / dues / exchange history</h3><p>Planned ledger view (roadmap)</p></article>
        </div>
        <p className="identity-muted">Live now: app-level participation metrics and treasury snapshots. Planned: full standardized economic ledger timeline.</p>
      </section>

      <section className="section-card identity-grid">
        <h2>Identity Architecture</h2>
        <div className="identity-arch-grid">
          <article className="identity-panel"><h3>DID-ready identity</h3><p>Passport data model is structured to map into decentralized identifiers without replacing current app flows.</p></article>
          <article className="identity-panel"><h3>VC-ready passport</h3><p>Role and participation records are positioned for verifiable credential issuance in later phases.</p></article>
          <article className="identity-panel"><h3>WalletConnect-ready wallet layer</h3><p>Wallet center is prepared for multi-wallet session orchestration and mobile wallet interoperability.</p></article>
          <article className="identity-panel"><h3>ERC-4337 smart-account-ready</h3><p>Future account abstraction support will enable safer delegated civic actions and recovery flows.</p></article>
        </div>
      </section>

      <section className="section-card identity-grid">
        <h2>Civilization Linkage</h2>
        <div className="identity-linkage">
          <Link to="/conference" className="identity-linkage-item"><h3>Popular Conference</h3><p>Identity authorizes civic voice and accountability.</p></Link>
          <Link to="/marketplace" className="identity-linkage-item"><h3>Marketplace / Economy</h3><p>Identity anchors trust in exchange and contribution.</p></Link>
          <Link to="/library" className="identity-linkage-item"><h3>Learning / Library</h3><p>Identity tracks participation in collective knowledge.</p></Link>
          <Link to="/civilization-library" className="identity-linkage-item"><h3>Culture & Memory</h3><p>Identity links citizens to long-term civilizational memory.</p></Link>
        </div>
      </section>

      <section className="section-card identity-grid">
        <h2>Live Treasury Snapshot</h2>
        <p className="identity-muted">Current treasury records from governance store:</p>
        <div className="identity-treasury-list">
          {(treasury?.recentTransactions || []).slice(0, 4).map((tx) => (
            <div key={tx.id} className="identity-tx-row">
              <strong>{tx.id}</strong>
              <span>{tx.type}</span>
              <span>{tx.amount} PVA</span>
              <span>{tx.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
