import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  fetchPassportAudit,
  fetchMyPassport,
  fetchPassportByUserId,
  issuePassportCredential,
  refreshPassportCredential,
  requestPassportVerification,
  requestPassportWalletChallenge,
  updatePassportProfile,
  updatePassportClaims,
  verifyPassportCredential,
  verifyPassportWalletChallenge,
} from '../lib/api';
import { useGovernanceStore } from '../store/governanceStore';
import './PassportPage.css';

const STATUS_LABELS = {
  verified: 'Verified',
  pending: 'Pending Review',
  unverified: 'Unverified',
  suspended: 'Suspended',
};

const roleLabel = (value = '') => {
  const next = String(value || '').trim().toLowerCase();
  if (next === 'admin') return 'Admin';
  if (next === 'secretariat') return 'Secretariat';
  if (next === 'committee') return 'Committee Member';
  return 'Citizen';
};

function toShortWallet(address = '') {
  if (!address) return 'Not connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(value) {
  if (!value) return 'Not issued';
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return 'Invalid date';
  return next.toLocaleString();
}

export default function PassportPage() {
  const { userId } = useParams();
  const location = useLocation();
  const isOwnRoute = !userId || userId === 'me' || location.pathname === '/passport';

  const proposals = useGovernanceStore((state) => state.proposals);
  const committeeAssignments = useGovernanceStore((state) => state.committeeAssignments);
  const citizen = useGovernanceStore((state) => state.citizen);
  const treasury = useGovernanceStore((state) => state.treasury);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passport, setPassport] = useState(null);
  const [walletSession, setWalletSession] = useState('');
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState({ bio: '', location: '', avatarUrl: '' });
  const [challenge, setChallenge] = useState(null);
  const [signatureInput, setSignatureInput] = useState('');
  const [walletAddressInput, setWalletAddressInput] = useState('');
  const [verifierInput, setVerifierInput] = useState('');
  const [verifierMode, setVerifierMode] = useState('societalId');
  const [verifierResult, setVerifierResult] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [adminTargetId, setAdminTargetId] = useState('');
  const [claimsAssignInput, setClaimsAssignInput] = useState('');
  const [claimsRevokeInput, setClaimsRevokeInput] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPassport() {
      setLoading(true);
      setError('');
      try {
        const response = isOwnRoute
          ? await fetchMyPassport()
          : await fetchPassportByUserId(userId);

        if (!active) return;

        if (!response?.ok || !response.item) {
          setError(response?.message || 'Unable to load passport profile.');
          setLoading(false);
          return;
        }

        setPassport(response.item);
        setDraft({
          bio: response.item.bio || '',
          location: response.item.location || '',
          avatarUrl: response.item.avatarUrl || '',
        });
        setWalletAddressInput(response.item.walletAddress || '');
        setAdminTargetId(response.item.id || userId || '');
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to load passport profile.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPassport();
    return () => {
      active = false;
    };
  }, [isOwnRoute, userId]);

  useEffect(() => {
    let active = true;
    async function loadAudit() {
      if (!passport?.id || !isOwnRoute) return;
      setAuditLoading(true);
      try {
        const response = await fetchPassportAudit(passport.id);
        if (!active) return;
        if (response?.ok && response.item) {
          setAuditEvents(Array.isArray(response.item.auditHistory) ? response.item.auditHistory.slice().reverse() : []);
        }
      } catch (_err) {
        if (!active) return;
        setAuditEvents([]);
      } finally {
        if (active) setAuditLoading(false);
      }
    }

    loadAudit();
    return () => {
      active = false;
    };
  }, [passport?.id, isOwnRoute]);

  const governanceRecord = useMemo(() => {
    if (!passport) {
      return {
        proposalsCreated: 0,
        supportsCast: 0,
        commentsMade: 0,
        conferenceParticipation: 0,
        officialResponsesVisible: 0,
      };
    }

    const identityId = String(passport.id || '');
    const identityName = String(passport.name || '').trim();

    const proposalsCreated = proposals.filter((proposal) => {
      const byId = String(proposal.createdById || '') === identityId;
      const byName = String(proposal.createdBy || proposal.author || '').trim() === identityName;
      return byId || byName;
    }).length;

    const supportsCast = proposals.filter((proposal) => {
      const supporters = Array.isArray(proposal.supporters) ? proposal.supporters : [];
      return supporters.includes(String(passport.citizenId || '')) || supporters.includes(identityId);
    }).length;

    const commentsMade = proposals.reduce((count, proposal) => {
      const comments = Array.isArray(proposal.comments) ? proposal.comments : [];
      return count + comments.filter((comment) => {
        const byId = String(comment.authorId || '') === identityId;
        const byName = String(comment.authorName || '').trim() === identityName;
        return byId || byName;
      }).length;
    }, 0);

    const conferenceParticipation = proposals.filter((proposal) => (
      ['conference_queue', 'threshold_reached', 'accepted', 'in_execution', 'completed'].includes(proposal.status)
    )).length;

    const officialResponsesVisible = proposals.filter((proposal) => Boolean(proposal.adminDecision || proposal.adminReason)).length;

    return {
      proposalsCreated,
      supportsCast,
      commentsMade,
      conferenceParticipation,
      officialResponsesVisible,
    };
  }, [passport, proposals]);

  const handleConnectWallet = async () => {
    const eth = globalThis?.ethereum;
    if (!eth) {
      setWalletSession('No wallet provider detected in this browser session.');
      return;
    }

    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const wallet = String(accounts?.[0] || '');
      if (!wallet) {
        setWalletSession('Wallet connected without an address response.');
        return;
      }
      setWalletSession(`Session connected: ${toShortWallet(wallet)} (profile binding is planned for next slice).`);
    } catch (_err) {
      setWalletSession('Wallet connection request failed or was cancelled.');
    }
  };

  const handleRequestWalletChallenge = async () => {
    setMessage('');
    try {
      const response = await requestPassportWalletChallenge();
      if (!response?.ok || !response.challenge) {
        setMessage(response?.message || 'Unable to create wallet challenge.');
        return;
      }
      setChallenge(response.challenge);
      setMessage('Wallet challenge issued. This rail is currently marked simulated/dev.');
    } catch (err) {
      setMessage(err?.message || 'Unable to create wallet challenge.');
    }
  };

  const handleVerifyWalletChallenge = async () => {
    if (!challenge?.nonce) {
      setMessage('No challenge issued yet.');
      return;
    }
    setMessage('');
    try {
      const response = await verifyPassportWalletChallenge({
        walletAddress: walletAddressInput,
        signature: signatureInput,
        nonce: challenge.nonce,
      });
      if (!response?.ok || !response.item) {
        setMessage(response?.message || 'Wallet binding failed.');
        return;
      }
      setPassport(response.item);
      setMessage('Wallet binding recorded (simulated/dev mode).');
    } catch (err) {
      setMessage(err?.message || 'Wallet binding failed.');
    }
  };

  const handleVerifierLookup = async () => {
    setMessage('');
    setVerifierResult(null);
    if (!verifierInput.trim()) {
      setMessage('Enter a societal ID or credential ID to verify.');
      return;
    }
    try {
      const params = verifierMode === 'credentialId'
        ? { credentialId: verifierInput.trim() }
        : { societalId: verifierInput.trim() };
      const response = await verifyPassportCredential(params);
      if (!response?.ok) {
        setVerifierResult({ ok: false, state: response?.state || 'invalid', message: response?.message || 'Not found' });
        return;
      }
      setVerifierResult({ ok: true, ...response });
    } catch (err) {
      setVerifierResult({ ok: false, state: 'invalid', message: err?.message || 'Verification request failed.' });
    }
  };

  const handleIssueCredential = async () => {
    if (!adminTargetId.trim()) {
      setMessage('Target user ID is required.');
      return;
    }
    setMessage('');
    try {
      const response = await issuePassportCredential(adminTargetId.trim());
      if (!response?.ok || !response.item) {
        setMessage(response?.message || 'Credential issuance failed.');
        return;
      }
      if (passport?.id === response.item.id) setPassport(response.item);
      setMessage('Credential issued successfully.');
    } catch (err) {
      setMessage(err?.message || 'Credential issuance failed.');
    }
  };

  const handleRefreshCredential = async () => {
    if (!adminTargetId.trim()) {
      setMessage('Target user ID is required.');
      return;
    }
    setMessage('');
    try {
      const response = await refreshPassportCredential(adminTargetId.trim());
      if (!response?.ok || !response.item) {
        setMessage(response?.message || 'Credential refresh failed.');
        return;
      }
      if (passport?.id === response.item.id) setPassport(response.item);
      setMessage('Credential refreshed successfully.');
    } catch (err) {
      setMessage(err?.message || 'Credential refresh failed.');
    }
  };

  const handleUpdateClaims = async () => {
    if (!adminTargetId.trim()) {
      setMessage('Target user ID is required.');
      return;
    }
    const assign = claimsAssignInput.split(',').map((item) => item.trim()).filter(Boolean);
    const revoke = claimsRevokeInput.split(',').map((item) => item.trim()).filter(Boolean);
    setMessage('');
    try {
      const response = await updatePassportClaims(adminTargetId.trim(), { assign, revoke });
      if (!response?.ok || !response.item) {
        setMessage(response?.message || 'Claim update failed.');
        return;
      }
      if (passport?.id === response.item.id) setPassport(response.item);
      setMessage('Claims updated successfully.');
    } catch (err) {
      setMessage(err?.message || 'Claim update failed.');
    }
  };

  const handleSaveProfile = async () => {
    if (!isOwnRoute) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await updatePassportProfile({
        bio: draft.bio,
        location: draft.location,
        avatarUrl: draft.avatarUrl,
      });
      if (!response?.ok || !response.item) {
        setMessage(response?.message || 'Unable to save passport profile.');
      } else {
        setPassport(response.item);
        setEditOpen(false);
        setMessage('Passport profile updated.');
      }
    } catch (err) {
      setMessage(err?.message || 'Unable to save passport profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!isOwnRoute) return;
    setMessage('');
    try {
      const response = await requestPassportVerification();
      if (response?.ok) {
        setPassport((prev) => (prev ? { ...prev, passportStatus: 'pending' } : prev));
        setMessage('Verification request submitted.');
      } else {
        setMessage(response?.message || 'Unable to submit verification request.');
      }
    } catch (err) {
      setMessage(err?.message || 'Unable to submit verification request.');
    }
  };

  if (loading) {
    return <section className="passport-page section-card"><p>Loading passport...</p></section>;
  }

  if (error || !passport) {
    return (
      <section className="passport-page section-card">
        <h2>Passport unavailable</h2>
        <p>{error || 'No passport profile found.'}</p>
      </section>
    );
  }

  const status = String(passport.passportStatus || 'unverified').toLowerCase();
  const passportRole = roleLabel(passport.citizenRole);
  const isAdminContext = isOwnRoute && ['admin', 'secretariat'].includes(String(passport.citizenRole || '').toLowerCase());

  return (
    <div className="passport-page">
      <section className="section-card passport-hero">
        <div>
          <div className="pill">Citizen Identity Layer</div>
          <h1>PVA BAZAAR - SOCIETAL PASSPORT</h1>
          <p>
            The passport is your civilization identity anchor across governance voice, economic participation,
            and future verifiable credentials.
          </p>
        </div>
        <div className="passport-hero-actions">
          <button type="button" className="button" onClick={handleConnectWallet}>Connect Wallet</button>
          <a className="button ghost" href="#governance-record">View Governance Record</a>
          <a className="button secondary" href="#economic-record">View Economic Record</a>
        </div>
      </section>

      <section className="section-card passport-card-shell">
        <article className="passport-card">
          <header className="passport-card-header">
            <div>
              <h2>PVA BAZAAR - SOCIETAL PASSPORT</h2>
              <p>Citizen identity document</p>
            </div>
            <span className={`passport-status status-${status}`}>{STATUS_LABELS[status] || 'Unverified'}</span>
          </header>

          <div className="passport-card-body">
            <div className="passport-avatar-frame">
              {passport.avatarUrl ? (
                <img src={passport.avatarUrl} alt={`${passport.name} avatar`} className="passport-avatar" />
              ) : (
                <div className="passport-avatar-placeholder">{String(passport.name || '?').slice(0, 1).toUpperCase()}</div>
              )}
            </div>

            <dl className="passport-fields">
              <div><dt>Full Name</dt><dd>{passport.name || 'Unknown Citizen'}</dd></div>
              <div><dt>Societal ID</dt><dd>{passport.societalId || 'Pending assignment'}</dd></div>
              <div><dt>Joined</dt><dd>{passport.joinedCivilizationAt ? new Date(passport.joinedCivilizationAt).toLocaleDateString() : 'Unknown'}</dd></div>
              <div><dt>Location</dt><dd>{passport.location || 'Not set'}</dd></div>
              <div><dt>Role</dt><dd><span className="passport-role-badge">{passportRole}</span></dd></div>
              <div><dt>Committees</dt><dd>{(passport.committees || []).length ? passport.committees.join(', ') : 'None assigned'}</dd></div>
              <div className="passport-bio"><dt>Bio</dt><dd>{passport.bio || 'No biography set yet.'}</dd></div>
              <div>
                <dt>Governance Token</dt>
                <dd className={passport.governanceToken ? 'token-active' : 'token-inactive'}>
                  {passport.governanceToken ? 'ONE VOTE - ACTIVE' : 'NOT YET VERIFIED'}
                </dd>
              </div>
            </dl>
          </div>
        </article>

        {isOwnRoute ? (
          <aside className="passport-edit-panel">
            <h3>Profile Controls</h3>
            <p>{walletSession || `Wallet: ${toShortWallet(passport.walletAddress || '')}`}</p>
            <div className="passport-edit-actions">
              <button type="button" className="button ghost" onClick={() => setEditOpen((value) => !value)}>
                {editOpen ? 'Close Edit' : 'Edit Passport'}
              </button>
              {['unverified', 'pending'].includes(status) ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={handleRequestVerification}
                  disabled={status === 'pending'}
                >
                  {status === 'pending' ? 'Verification Requested' : 'Request Verification'}
                </button>
              ) : null}
            </div>

            {editOpen ? (
              <div className="passport-edit-form">
                <label>
                  Avatar URL
                  <input
                    value={draft.avatarUrl}
                    onChange={(event) => setDraft((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                <label>
                  Location
                  <input
                    value={draft.location}
                    onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="City, Region"
                  />
                </label>
                <label>
                  Bio (max 500)
                  <textarea
                    value={draft.bio}
                    onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value.slice(0, 500) }))}
                    rows={4}
                  />
                </label>
                <button type="button" className="button" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Passport Profile'}
                </button>
              </div>
            ) : null}

            <div className="passport-rail-block">
              <h4>Wallet Binding Rail</h4>
              <p>Mode: simulated/dev until cryptographic recovery is enabled.</p>
              <div className="passport-edit-actions">
                <button type="button" className="button ghost" onClick={handleRequestWalletChallenge}>Request Challenge</button>
              </div>
              {challenge ? (
                <div className="passport-edit-form">
                  <label>
                    Challenge message
                    <textarea value={challenge.message || ''} readOnly rows={3} />
                  </label>
                  <label>
                    Wallet address
                    <input
                      value={walletAddressInput}
                      onChange={(event) => setWalletAddressInput(event.target.value)}
                      placeholder="0x..."
                    />
                  </label>
                  <label>
                    Signature (simulated)
                    <input
                      value={signatureInput}
                      onChange={(event) => setSignatureInput(event.target.value)}
                      placeholder="0xsignature..."
                    />
                  </label>
                  <button type="button" className="button secondary" onClick={handleVerifyWalletChallenge}>
                    Submit Wallet Proof
                  </button>
                </div>
              ) : null}
            </div>

            {message ? <p className="passport-message">{message}</p> : null}
          </aside>
        ) : null}
      </section>

      <section className="section-card">
        <h2>Credential & Identity Proof</h2>
        <div className="passport-grid">
          <article><h3>DID subject</h3><p>{passport.didSubject || 'Pending generation'}</p><small>Live now</small></article>
          <article><h3>Credential ID</h3><p>{passport.credentialId || 'Not issued'}</p><small>Live now</small></article>
          <article><h3>Credential version</h3><p>{Number(passport.credentialVersion || 0)}</p><small>Live now</small></article>
          <article><h3>Credential issued</h3><p>{formatDate(passport.credentialIssuedAt)}</p><small>Live now</small></article>
          <article><h3>Verification status</h3><p>{String(passport.verificationStatus || 'none')}</p><small>Live now</small></article>
          <article><h3>Wallet binding</h3><p>{String(passport.walletBindingStatus || 'unbound')}</p><small>Live now</small></article>
        </div>
      </section>

      <section className="section-card">
        <h2>Eligibility Snapshot</h2>
        <div className="passport-grid">
          <article><h3>Verified passport</h3><p>{passport.eligibility?.hasVerifiedPassport ? 'Eligible' : 'Not eligible'}</p><small>Live now</small></article>
          <article><h3>Governance vote</h3><p>{passport.eligibility?.hasGovernanceVoteEligibility ? 'Eligible' : 'Not eligible'}</p><small>Live now</small></article>
          <article><h3>Committee access</h3><p>{passport.eligibility?.hasCommitteeAccess ? 'Eligible' : 'Not eligible'}</p><small>Live now</small></article>
          <article><h3>Treasury access</h3><p>{passport.eligibility?.hasTreasuryAccess ? 'Eligible' : 'Not eligible'}</p><small>Live now</small></article>
          <article><h3>Role claims</h3><p>{Array.isArray(passport.claims) && passport.claims.length ? passport.claims.join(', ') : 'visitor'}</p><small>Live now</small></article>
          <article><h3>On-chain verifier</h3><p>Planned</p><small>Future cryptographic proof rail</small></article>
        </div>
      </section>

      <section className="section-card">
        <h2>Verifier Panel</h2>
        <div className="passport-edit-form verifier-panel">
          <label>
            Lookup mode
            <select value={verifierMode} onChange={(event) => setVerifierMode(event.target.value)}>
              <option value="societalId">Societal ID</option>
              <option value="credentialId">Credential ID</option>
            </select>
          </label>
          <label>
            Value
            <input
              value={verifierInput}
              onChange={(event) => setVerifierInput(event.target.value)}
              placeholder={verifierMode === 'credentialId' ? 'PVA-CRED-XXXX' : 'PVA-00001'}
            />
          </label>
          <button type="button" className="button" onClick={handleVerifierLookup}>Verify Credential</button>
        </div>
        {verifierResult ? (
          <div className="verifier-result">
            <p><strong>State:</strong> {verifierResult.state || 'invalid'}</p>
            {verifierResult.ok && verifierResult.verifier ? (
              <div className="passport-grid">
                <article><h3>Societal ID</h3><p>{verifierResult.verifier.societalId || 'Unknown'}</p></article>
                <article><h3>Credential ID</h3><p>{verifierResult.verifier.credentialId || 'Unknown'}</p></article>
                <article><h3>DID subject</h3><p>{verifierResult.verifier.didSubject || 'Unknown'}</p></article>
                <article><h3>Claims</h3><p>{(verifierResult.verifier.roleClaims || []).join(', ') || 'None'}</p></article>
                <article><h3>Wallet binding</h3><p>{verifierResult.verifier.walletBindingState || 'unbound'}</p></article>
                <article><h3>Issued</h3><p>{formatDate(verifierResult.verifier.issuedAt)}</p></article>
              </div>
            ) : (
              <p>{verifierResult.message || 'No matching credential found.'}</p>
            )}
          </div>
        ) : null}
      </section>

      {isAdminContext ? (
        <section className="section-card">
          <h2>Admin Identity Controls</h2>
          <div className="passport-edit-form">
            <label>
              Target user ID
              <input value={adminTargetId} onChange={(event) => setAdminTargetId(event.target.value)} placeholder="Mongo user id" />
            </label>
            <div className="passport-edit-actions">
              <button type="button" className="button" onClick={handleIssueCredential}>Issue Credential</button>
              <button type="button" className="button ghost" onClick={handleRefreshCredential}>Refresh Credential</button>
            </div>
            <label>
              Claims to assign (comma separated)
              <input value={claimsAssignInput} onChange={(event) => setClaimsAssignInput(event.target.value)} placeholder="committee_member,creator" />
            </label>
            <label>
              Claims to revoke (comma separated)
              <input value={claimsRevokeInput} onChange={(event) => setClaimsRevokeInput(event.target.value)} placeholder="visitor" />
            </label>
            <button type="button" className="button secondary" onClick={handleUpdateClaims}>Update Claims</button>
          </div>
        </section>
      ) : null}

      {isOwnRoute ? (
        <section className="section-card">
          <h2>Audit Trail</h2>
          {auditLoading ? <p>Loading identity audit trail...</p> : null}
          {!auditLoading && !auditEvents.length ? <p>No audit events yet.</p> : null}
          {auditEvents.length ? (
            <div className="audit-list">
              {auditEvents.map((entry, idx) => (
                <article key={`${entry.event}-${entry.occurredAt}-${idx}`} className="audit-row">
                  <h3>{entry.event || 'event'}</h3>
                  <p>{entry.note || 'No note provided.'}</p>
                  <small>
                    {formatDate(entry.occurredAt)} | actor role: {entry.actorRole || 'system'}
                  </small>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section id="governance-record" className="section-card">
        <h2>Governance Record</h2>
        <div className="passport-grid">
          <article><h3>Proposals created</h3><p>{governanceRecord.proposalsCreated}</p></article>
          <article><h3>Supports cast</h3><p>{governanceRecord.supportsCast}</p></article>
          <article><h3>Comments made</h3><p>{governanceRecord.commentsMade}</p></article>
          <article><h3>Conference participation</h3><p>{governanceRecord.conferenceParticipation}</p></article>
          <article><h3>Official responses visible</h3><p>{governanceRecord.officialResponsesVisible}</p></article>
          <article><h3>Group / committee participation</h3><p>{committeeAssignments.length}</p></article>
        </div>
      </section>

      <section id="economic-record" className="section-card wallet-section">
        <h2>Economic Record</h2>
        <div className="passport-grid">
          <article><h3>Wallet balance</h3><p>{Number(passport.bazBalance || 0)} BAZ</p><small>Live now (account state)</small></article>
          <article><h3>PVA reputation</h3><p>{Number(passport.pvaReputation || 0)}</p><small>Live now (contribution score)</small></article>
          <article><h3>Votes cast</h3><p>{Number(passport.votesCast || citizen?.votes || 0)}</p><small>Live now</small></article>
          <article><h3>Proposals submitted</h3><p>{Number(passport.proposalsSubmitted || governanceRecord.proposalsCreated || 0)}</p><small>Live now</small></article>
          <article><h3>Treasury participation</h3><p>{(treasury?.recentTransactions || []).length} recent records</p><small>Live now (snapshot)</small></article>
          <article><h3>Grants / labor / dues / exchange history</h3><p>Planned</p><small>Next ledger expansion</small></article>
        </div>
      </section>

      <section className="section-card">
        <h2>Identity Architecture</h2>
        <div className="passport-grid">
          <article><h3>DID-ready identity</h3><p>Passport schema includes stable identity fields suitable for DID mapping in future phases.</p></article>
          <article><h3>VC-ready passport</h3><p>Status, role, and participation records are structured for verifiable credential issuance.</p></article>
          <article><h3>WalletConnect-ready wallet layer</h3><p>Wallet UX is designed for future WalletConnect session support.</p></article>
          <article><h3>ERC-4337 / smart account direction</h3><p>Account abstraction support is planned for delegated civic and economic actions.</p></article>
        </div>
      </section>

      <section className="section-card">
        <h2>Civilization Linkage</h2>
        <div className="passport-link-strip">
          <Link to="/conference">Popular Conference</Link>
          <Link to="/marketplace">Marketplace / Economy</Link>
          <Link to="/library">Learning / Library</Link>
          <Link to="/civilization-library">Culture & Memory</Link>
        </div>
      </section>
    </div>
  );
}
