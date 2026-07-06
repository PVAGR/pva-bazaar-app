import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import GovernanceInterface from '../components/governance';
import { clearGovernanceDraft, fetchGovernanceDraft, saveGovernanceDraft } from '../lib/api';
import { getToken } from '../lib/auth';
import { Telemetry } from '../lib/telemetry';
import '../styles/governance.css';
import './Forum.css';

export default function ForumPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search || '');
  const onboardingEntry = params.get('onboarding') === '1';
  const focus = params.get('focus') || '';
  const tags = params.get('tags') || '';
  const journey = params.get('journey') || '';
  const tagList = tags
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const initialQuery = [focus, tags, journey].filter(Boolean).join(' ').trim();

  const categoryMap = {
    marketplace: 'Economy',
    creator: 'Education',
    governance: 'Governance',
    research: 'Education',
    community: 'Infrastructure',
  };

  const focusLabelMap = {
    marketplace: 'Marketplace Trade',
    creator: 'Creator Storytelling',
    governance: 'Governance and Proposals',
    research: 'Research and Archives',
    community: 'Community Operations',
  };

  const focusLabel = focusLabelMap[focus] || 'Community Growth';
  const primaryCategory = categoryMap[focus] || 'Governance';

  const [draftFromServer, setDraftFromServer] = useState(null);
  const saveTimeoutRef = useRef(null);

  const onboardingDraft = onboardingEntry
    ? {
        title: `Onboarding Initiative: ${focusLabel}`,
        category: primaryCategory,
        urgency: 'Standard',
        problem: journey
          ? `New member context: ${journey}`
          : 'New members need a clearer first contribution path in this forum surface.',
        solution: [
          'Create an onboarding-first proposal lane for new contributors.',
          tagList.length
            ? `Align first actions with selected path tags: ${tagList.join(', ')}.`
            : '',
          'Assign clear first-week actions and publish completion metrics.',
        ]
          .filter(Boolean)
          .join(' '),
        outcome:
          'Higher onboarding-to-contribution conversion and faster first civic participation.',
      }
    : null;

  const initialProposalDraft = draftFromServer || onboardingDraft;

  useEffect(() => {
    if (!getToken()) return undefined;
    let mounted = true;
    fetchGovernanceDraft()
      .then((res) => {
        if (!mounted) return;
        if (res?.ok && res?.draft && typeof res.draft === 'object') {
          setDraftFromServer(res.draft);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleDraftChange = useCallback((draft) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveGovernanceDraft(draft).catch(() => {});
    }, 450);
  }, []);

  const handleDraftClear = useCallback(() => {
    setDraftFromServer(null);
    clearGovernanceDraft().catch(() => {});
  }, []);

  const handleProposalSubmitted = useCallback(
    (payload) => {
      if (!onboardingEntry) return;
      Telemetry.trackEvent('onboarding_forum_proposal_submitted', {
        focus,
        tags: tagList,
        title: String(payload?.title || '').slice(0, 120),
        category: payload?.category || '',
      });
    },
    [focus, onboardingEntry, tagList],
  );

  return (
    <>
      {onboardingEntry ? (
        <section className="forum-onboarding-banner section-card" aria-label="Onboarding context">
          <h2>Community bridge active</h2>
          <p>
            We prefilled forum search with your path context so you can find relevant proposals
            faster.
            {focus ? ` Focus: ${focus}.` : ''}
          </p>
          <div className="row rowWrap">
            <Link className="btn ghost" to="/proposals/submit">
              Submit your first proposal
            </Link>
            <Link className="btn ghost" to="/conference">
              Open conference
            </Link>
          </div>
        </section>
      ) : null}
      <GovernanceInterface
        initialPage="forum"
        initialQuery={initialQuery}
        initialShowForm={onboardingEntry}
        initialProposalDraft={initialProposalDraft}
        onDraftChange={handleDraftChange}
        onDraftClear={handleDraftClear}
        onProposalSubmitted={handleProposalSubmitted}
        showDraftExplainer={onboardingEntry}
      />
    </>
  );
}
