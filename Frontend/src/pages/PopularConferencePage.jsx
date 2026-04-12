import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createGovernanceProposal,
  createGovernanceWalletChallenge,
  fetchGovernanceProposals,
  fetchGovernanceVoteSummary,
  publishGovernanceProposalOutcome,
  queueGovernanceProposal,
  submitGovernanceOnChainVote,
  toggleGovernanceProposalSupport,
  verifyGovernanceWalletChallenge,
} from '../lib/api';
import './PopularConferencePage.css';

function hasEthereum() {
  return !!globalThis?.ethereum?.request;
}

export default function PopularConferencePage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wallet, setWallet] = useState({ address: '', verified: false });

  const [form, setForm] = useState({
    title: '',
    summary: '',
    problem: '',
    solution: '',
    expectedOutcome: '',
  });

  const [vote, setVote] = useState({ choice: 'yes', txHash: '' });
  const [queueForm, setQueueForm] = useState({
    cycleKey: '',
    voteStartsAt: '',
    voteEndsAt: '',
  });
  const [outcomeForm, setOutcomeForm] = useState({
    outcome: 'planned',
    outcomeRationale: '',
    plannedTargetDate: '',
    tallyTxHash: '',
  });

  const selectedId = selected?._id || '';
  const canSubmitProposal = useMemo(
    () => !!wallet.verified && form.title.trim() && form.summary.trim(),
    [wallet.verified, form.title, form.summary]
  );

  const loadProposals = useCallback(async () => {
    setError('');
    const res = await fetchGovernanceProposals({ limit: 40 });
    if (res?.ok) {
      setItems(Array.isArray(res.items) ? res.items : []);
      if (Array.isArray(res.items) && res.items.length > 0) {
        setSelected((current) => current || res.items[0]);
      }
      return;
    }
    setError(res?.error || res?.message || 'Failed to load proposals');
  }, []);

  useEffect(() => {
    loadProposals().catch((e) => setError(e?.message || 'Failed to load proposals'));
  }, [loadProposals]);

  useEffect(() => {
    if (!selectedId) {
      setSummary(null);
      return;
    }
    fetchGovernanceVoteSummary(selectedId)
      .then((res) => {
        if (res?.ok) setSummary(res);
      })
      .catch(() => {
        setSummary(null);
      });
  }, [selectedId]);

  async function connectAndVerifyWallet() {
    setError('');
    setSuccess('');
    if (!hasEthereum()) {
      setError('No wallet detected. Install MetaMask or use a wallet-enabled browser.');
      return;
    }

    setBusy(true);
    try {
      const accounts = await globalThis.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = String(Array.isArray(accounts) ? accounts[0] || '' : '').toLowerCase();
      if (!walletAddress) throw new Error('No wallet account returned');

      const challenge = await createGovernanceWalletChallenge(walletAddress);
      if (!challenge?.ok) {
        throw new Error(challenge?.error || challenge?.message || 'Failed to create wallet challenge');
      }

      const signature = await globalThis.ethereum.request({
        method: 'personal_sign',
        params: [String(challenge.message), walletAddress],
      });

      const verified = await verifyGovernanceWalletChallenge({
        walletAddress,
        nonce: challenge.nonce,
        signature,
      });

      if (!verified?.ok) {
        throw new Error(verified?.error || verified?.message || 'Wallet verification failed');
      }

      setWallet({ address: walletAddress, verified: true });
      setSuccess('Wallet verified for governance actions.');
    } catch (e) {
      setError(e?.message || 'Failed to verify wallet');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateProposal(event) {
    event.preventDefault();
    if (!canSubmitProposal) return;

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        title: form.title,
        summary: form.summary,
        problem: form.problem,
        solution: form.solution,
        expectedOutcome: form.expectedOutcome,
        onChain: {
          chainId: 8453,
        },
      };
      const res = await createGovernanceProposal(payload);
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to create proposal');

      setForm({ title: '', summary: '', problem: '', solution: '', expectedOutcome: '' });
      setSuccess('Proposal created and published to public discussion.');
      await loadProposals();
    } catch (e) {
      setError(e?.message || 'Failed to create proposal');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleSupport(proposalId) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await toggleGovernanceProposalSupport(proposalId);
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to update support');
      setSuccess(res.supported ? 'Support added.' : 'Support removed.');
      await loadProposals();
    } catch (e) {
      setError(e?.message || 'Failed to update support');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitOnChainVote(event) {
    event.preventDefault();
    if (!selectedId) return;

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await submitGovernanceOnChainVote(selectedId, {
        choice: vote.choice,
        txHash: vote.txHash,
        chainId: 8453,
      });
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to submit on-chain vote');

      setSummary((prev) => ({
        ...(prev || {}),
        voteCounts: res.voteCounts || prev?.voteCounts,
      }));
      setSuccess('On-chain vote reference submitted.');
      setVote((v) => ({ ...v, txHash: '' }));
      await loadProposals();
    } catch (e) {
      setError(e?.message || 'Failed to submit vote');
    } finally {
      setBusy(false);
    }
  }

  async function handleQueueProposal(event) {
    event.preventDefault();
    if (!selectedId) return;

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await queueGovernanceProposal(selectedId, {
        cycleKey: queueForm.cycleKey,
        voteWindow: {
          startsAt: queueForm.voteStartsAt || undefined,
          endsAt: queueForm.voteEndsAt || undefined,
        },
      });
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to queue proposal');

      setSuccess('Proposal queued for conference agenda.');
      await loadProposals();
    } catch (e) {
      setError(e?.message || 'Failed to queue proposal');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishOutcome(event) {
    event.preventDefault();
    if (!selectedId) return;

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await publishGovernanceProposalOutcome(selectedId, {
        outcome: outcomeForm.outcome,
        outcomeRationale: outcomeForm.outcomeRationale,
        plannedTargetDate: outcomeForm.plannedTargetDate || undefined,
        onChain: {
          tallyTxHash: outcomeForm.tallyTxHash || undefined,
        },
      });
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to publish outcome');

      setSuccess('Outcome published to the public conference log.');
      setOutcomeForm((formState) => ({
        ...formState,
        outcomeRationale: '',
        plannedTargetDate: '',
        tallyTxHash: '',
      }));
      await loadProposals();
    } catch (e) {
      setError(e?.message || 'Failed to publish outcome');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="popular-conference" aria-label="Popular Conference">
      <div className="pc-hero">
        <h1>Popular Conference</h1>
        <p>
          Propose, support, and vote with one verified wallet per citizen. Conference outcomes are
          published as Accepted, Planned, Deferred, or Rejected.
        </p>
      </div>

      {error ? <div className="pc-error" role="alert">{error}</div> : null}
      {success ? <div className="pc-success" role="status">{success}</div> : null}

      <div className="pc-grid">
        <div className="pc-card">
          <h2>Create Proposal</h2>
          <form className="pc-form" onSubmit={handleCreateProposal}>
            <label htmlFor="pc-title">Title</label>
            <input
              id="pc-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Citizen proposal title"
              maxLength={200}
              required
            />

            <label htmlFor="pc-summary">Summary</label>
            <textarea
              id="pc-summary"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Short summary for agenda visibility"
              maxLength={1000}
              required
            />

            <label htmlFor="pc-problem">Problem</label>
            <textarea
              id="pc-problem"
              value={form.problem}
              onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))}
              placeholder="What issue are we solving?"
              maxLength={3000}
            />

            <label htmlFor="pc-solution">Solution</label>
            <textarea
              id="pc-solution"
              value={form.solution}
              onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
              placeholder="What should be done?"
              maxLength={3000}
            />

            <label htmlFor="pc-outcome">Expected Outcome</label>
            <textarea
              id="pc-outcome"
              value={form.expectedOutcome}
              onChange={(e) => setForm((f) => ({ ...f, expectedOutcome: e.target.value }))}
              placeholder="What measurable result should happen?"
              maxLength={3000}
            />

            <div className="pc-actions">
              <button type="button" className="pc-btn" onClick={connectAndVerifyWallet} disabled={busy}>
                {wallet.verified ? `Wallet Verified (${wallet.address.slice(0, 8)}...)` : 'Verify Wallet'}
              </button>
              <button type="submit" className="pc-btn primary" disabled={!canSubmitProposal || busy}>
                Submit Proposal
              </button>
            </div>
          </form>
        </div>

        <div className="pc-card">
          <h2>Proposal Board</h2>
          <div className="pc-list">
            {items.map((item) => (
              <article key={item._id} className="pc-item">
                <h3>{item.title}</h3>
                <div className="pc-meta">{item.summary}</div>
                <div className="pc-actions">
                  <span className="pc-pill">Status: {item.status}</span>
                  <span className="pc-pill">Support: {item.supportCount || 0}</span>
                </div>
                <div className="pc-actions">
                  <button
                    type="button"
                    className="pc-btn"
                    onClick={() => setSelected(item)}
                    disabled={busy}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="pc-btn"
                    onClick={() => handleToggleSupport(item._id)}
                    disabled={busy}
                  >
                    Support / Unsupport
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="pc-card">
        <h2>Vote Submission (On-Chain Reference)</h2>
        {!selected ? <p>Select a proposal first.</p> : null}
        {selected ? (
          <>
            <p>
              <strong>{selected.title}</strong>
            </p>
            <div className="pc-actions">
              <span className="pc-pill">Proposal ID: {selected._id}</span>
              <span className="pc-pill">Current Status: {selected.status}</span>
            </div>
            <div className="pc-actions">
              <span className="pc-pill">YES: {summary?.voteCounts?.yes || 0}</span>
              <span className="pc-pill">NO: {summary?.voteCounts?.no || 0}</span>
              <span className="pc-pill">ABSTAIN: {summary?.voteCounts?.abstain || 0}</span>
            </div>
            <form className="pc-form" onSubmit={handleSubmitOnChainVote}>
              <label htmlFor="pc-choice">Choice</label>
              <select
                id="pc-choice"
                value={vote.choice}
                onChange={(e) => setVote((v) => ({ ...v, choice: e.target.value }))}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="abstain">Abstain</option>
              </select>

              <label htmlFor="pc-tx-hash">On-chain Transaction Hash</label>
              <input
                id="pc-tx-hash"
                value={vote.txHash}
                onChange={(e) => setVote((v) => ({ ...v, txHash: e.target.value }))}
                placeholder="0x..."
                required
              />

              <div className="pc-actions">
                <button type="submit" className="pc-btn primary" disabled={busy || !wallet.verified}>
                  Submit On-Chain Vote
                </button>
              </div>
            </form>
          </>
        ) : null}
      </div>

      <div className="pc-grid">
        <div className="pc-card">
          <h2>Committee: Queue Proposal</h2>
          <p className="pc-meta">Requires committee/admin access.</p>
          <form className="pc-form" onSubmit={handleQueueProposal}>
            <label htmlFor="pc-cycle-key">Conference Cycle Key</label>
            <input
              id="pc-cycle-key"
              value={queueForm.cycleKey}
              onChange={(e) => setQueueForm((f) => ({ ...f, cycleKey: e.target.value }))}
              placeholder="2026-biweekly-08"
              required
            />

            <label htmlFor="pc-vote-start">Vote Starts At</label>
            <input
              id="pc-vote-start"
              type="datetime-local"
              value={queueForm.voteStartsAt}
              onChange={(e) => setQueueForm((f) => ({ ...f, voteStartsAt: e.target.value }))}
            />

            <label htmlFor="pc-vote-end">Vote Ends At</label>
            <input
              id="pc-vote-end"
              type="datetime-local"
              value={queueForm.voteEndsAt}
              onChange={(e) => setQueueForm((f) => ({ ...f, voteEndsAt: e.target.value }))}
            />

            <div className="pc-actions">
              <button type="submit" className="pc-btn" disabled={busy || !selectedId}>
                Queue Selected Proposal
              </button>
            </div>
          </form>
        </div>

        <div className="pc-card">
          <h2>Committee: Publish Outcome</h2>
          <p className="pc-meta">Accepted, Planned, Deferred, or Rejected with written rationale.</p>
          <form className="pc-form" onSubmit={handlePublishOutcome}>
            <label htmlFor="pc-outcome-select">Outcome</label>
            <select
              id="pc-outcome-select"
              value={outcomeForm.outcome}
              onChange={(e) => setOutcomeForm((f) => ({ ...f, outcome: e.target.value }))}
            >
              <option value="accepted">Accepted</option>
              <option value="planned">Planned</option>
              <option value="deferred">Deferred</option>
              <option value="rejected">Rejected</option>
            </select>

            <label htmlFor="pc-outcome-rationale">Rationale</label>
            <textarea
              id="pc-outcome-rationale"
              value={outcomeForm.outcomeRationale}
              onChange={(e) => setOutcomeForm((f) => ({ ...f, outcomeRationale: e.target.value }))}
              placeholder="Explain why this outcome was chosen and what happens next."
              required
            />

            <label htmlFor="pc-target-date">Planned Target Date (optional)</label>
            <input
              id="pc-target-date"
              type="date"
              value={outcomeForm.plannedTargetDate}
              onChange={(e) => setOutcomeForm((f) => ({ ...f, plannedTargetDate: e.target.value }))}
            />

            <label htmlFor="pc-tally-tx">Tally Transaction Hash (optional)</label>
            <input
              id="pc-tally-tx"
              value={outcomeForm.tallyTxHash}
              onChange={(e) => setOutcomeForm((f) => ({ ...f, tallyTxHash: e.target.value }))}
              placeholder="0x..."
            />

            <div className="pc-actions">
              <button type="submit" className="pc-btn primary" disabled={busy || !selectedId}>
                Publish Outcome
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
