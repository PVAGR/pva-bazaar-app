import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STATUS_TO_STAGE = {
  draft: 'draft',
  public: 'draft',
  threshold_reached: 'endorsed',
  conference_queue: 'panel',
  accepted: 'passed',
  rejected: 'rejected',
  needs_revision: 'draft',
  in_execution: 'panel',
  completed: 'passed',
};

const STAGE_LIFECYCLE = {
  draft: 1,
  endorsed: 2,
  panel: 3,
  vote: 4,
  passed: 5,
  rejected: 5,
};

const toStage = (status) => STATUS_TO_STAGE[status] || 'draft';

const toLifecycle = (status) => STAGE_LIFECYCLE[toStage(status)] || 1;

const makeSupporters = (seedCount, seedLabel) =>
  Array.from({ length: seedCount }).map((_, idx) => `${seedLabel}-${idx + 1}`);

const createProposalModel = (raw) => {
  const comments = Array.isArray(raw.comments) ? raw.comments : [];
  const supporters = Array.isArray(raw.supporters) ? raw.supporters : [];
  const supportCount = Number(raw.supportCount ?? raw.endorsements ?? supporters.length ?? 0);
  const status = raw.status || 'public';

  return {
    id: raw.id,
    title: raw.title,
    problem: raw.problem || '',
    proposal: raw.proposal || raw.solution || '',
    expectedOutcome: raw.expectedOutcome || raw.outcome || '',
    costResources: raw.costResources || '',
    urgency: raw.urgency || 'standard',
    committeeCategory: raw.committeeCategory || raw.category || 'governance',
    createdBy: raw.createdBy || raw.author || 'Citizen',
    createdAt: raw.createdAt || new Date().toISOString(),
    supportCount,
    supporters,
    comments,
    status,
    adminDecision: raw.adminDecision || '',
    adminReason: raw.adminReason || '',
    nextStep: raw.nextStep || '',
    targetTimeline: raw.targetTimeline || '',
    executionProject: raw.executionProject || null,
    thresholdReachedAt: raw.thresholdReachedAt || null,
    conferenceQueuedAt: raw.conferenceQueuedAt || null,

    // Backward-compatible fields used in existing components
    stage: raw.stage || toStage(status),
    lifecycle: raw.lifecycle || toLifecycle(status),
    category: raw.category || raw.committeeCategory || 'Governance',
    excerpt: raw.excerpt || raw.proposal || raw.solution || '',
    solution: raw.solution || raw.proposal || '',
    outcome: raw.outcome || raw.expectedOutcome || '',
    endorsements: supportCount,
    author: raw.author || raw.createdBy || 'Citizen',
    authorInitial:
      raw.authorInitial || String((raw.createdBy || raw.author || 'C')[0] || 'C').toUpperCase(),
    authorColor: raw.authorColor || '#4a90a4',
    panelStatement: raw.panelStatement || '',
    yesVotes: Number(raw.yesVotes || 0),
    noVotes: Number(raw.noVotes || 0),
    userVote: raw.userVote || null,
    userEndorsed: Boolean(raw.userEndorsed),
    daysLeft: raw.daysLeft ?? null,
  };
};

const SEED_PROPOSALS = [
  createProposalModel({
    id: 'PROP-101',
    title: 'Solar Micro-Grid Expansion — Kibera District',
    problem: 'Households still rely on unsafe kerosene lighting after sunset.',
    proposal: 'Install a 40kW solar micro-grid managed by a local citizen cooperative.',
    expectedOutcome: 'Reliable energy access for 1,200 homes and lower monthly energy costs.',
    costResources: 'Budget: 180,000 PVA; 3 trained technicians; 90-day rollout.',
    urgency: 'high',
    committeeCategory: 'infrastructure',
    createdBy: 'Wanjiru M.',
    createdAt: '2026-04-05T08:00:00.000Z',
    supportCount: 4,
    supporters: makeSupporters(4, 'seed-citizen'),
    comments: [
      {
        id: 'COM-1001',
        authorId: 'seed-citizen-1',
        authorName: 'Omondi K.',
        body: 'Please include local maintenance training in phase one.',
        createdAt: '2026-04-06T10:12:00.000Z',
      },
      {
        id: 'COM-1002',
        authorId: 'seed-citizen-2',
        authorName: 'Achieng A.',
        body: 'Strong support from Block C residents.',
        createdAt: '2026-04-07T09:20:00.000Z',
      },
    ],
    status: 'conference_queue',
    thresholdReachedAt: '2026-04-07T09:20:00.000Z',
    conferenceQueuedAt: '2026-04-07T09:21:00.000Z',
    nextStep: 'Scheduled for Conference Session 7 deliberation.',
    targetTimeline: 'Deliberation: 2026-04-20',
  }),
  createProposalModel({
    id: 'PROP-102',
    title: 'Community Water Filtration & Testing Network',
    problem: 'Unsafe water sources drive avoidable illness and high clinic load.',
    proposal: 'Deploy 12 ceramic filtration stations with transparent monthly water testing.',
    expectedOutcome: 'Reduce waterborne illness and cut daily water collection time.',
    costResources: 'Budget: 95,000 PVA; 12 volunteer monitors; testing kits every 30 days.',
    urgency: 'high',
    committeeCategory: 'health',
    createdBy: 'Fatuma A.',
    createdAt: '2026-04-03T10:00:00.000Z',
    supportCount: 6,
    supporters: makeSupporters(6, 'seed-citizen-a'),
    comments: [
      {
        id: 'COM-1003',
        authorId: 'seed-citizen-a-2',
        authorName: 'Nia K.',
        body: 'Can we prioritize zones with the highest reported cases first?',
        createdAt: '2026-04-04T11:00:00.000Z',
      },
    ],
    status: 'accepted',
    adminDecision: 'accepted',
    adminReason: 'Meets urgent health need, validated by committee and public support.',
    nextStep: 'Begin procurement and station placement.',
    targetTimeline: 'Launch pilot within 30 days.',
    executionProject: {
      owner: 'Health Committee Node',
      milestones: [
        { id: 'M-1', title: 'Procure filtration units', done: true },
        { id: 'M-2', title: 'Install first 6 stations', done: false },
        { id: 'M-3', title: 'Publish month-1 quality report', done: false },
      ],
      progressPercent: 35,
      latestUpdate: 'Vendor contracts signed. Site prep started in 2 zones.',
      completed: false,
    },
  }),
  createProposalModel({
    id: 'PROP-103',
    title: 'Weekly Open Market — Digital + Physical',
    problem: 'Local vendors need predictable trade channels and token utility.',
    proposal: 'Launch weekly market day and mirrored digital listings under PVA civic marketplace.',
    expectedOutcome: 'Increase household trade activity and improve PVA token circulation.',
    costResources: 'Budget: 40,000 PVA; 2 market coordinators; stall equipment.',
    urgency: 'standard',
    committeeCategory: 'economy',
    createdBy: 'Kibera Node',
    createdAt: '2026-04-10T09:00:00.000Z',
    supportCount: 2,
    supporters: makeSupporters(2, 'seed-citizen-b'),
    comments: [],
    status: 'public',
  }),
];

const SEED_PASSPORT = {
  citizenId: 'citizen-0047',
  name: 'Amara Kamau',
  node: 'Nairobi Node · Kenya',
  memberActive: true,
  walletAddress: '',
  joinedAt: '2025-02-01',
  mock: true,
};

const SEED_CITIZEN = {
  name: 'Amara Kamau',
  initial: 'A',
  id: '0047',
  did: 'mock:citizen:0047',
  node: 'Nairobi Node · Kenya',
  joinedAt: 'Feb 2025',
  votes: 23,
  proposals: 4,
  reputation: 72,
  tokens: 450,
  conferencesAttended: 3,
  panelTerms: 1,
  verified: true,
};

const SEED_TREASURY = {
  totalSupply: 1000000,
  circulating: 284700,
  communityFund: 182400,
  proposalReserve: 45000,
  recentTransactions: [
    {
      id: 'TX-8821',
      type: 'payout',
      amount: 60000,
      desc: 'Water filtration pilot tranche 1',
      date: '2026-04-10',
    },
    {
      id: 'TX-8720',
      type: 'deposit',
      amount: 12400,
      desc: 'Market fee collection',
      date: '2026-04-08',
    },
  ],
};

const SEED_CONFERENCE = {
  number: 7,
  date: '2026-04-20',
  location: 'Kibera Community Hall + pvabazaar.org livestream',
  agenda: [
    { time: '09:00', item: 'Opening & citizen attendance verification' },
    { time: '09:30', item: 'Conference queue deliberation block' },
    { time: '11:00', item: 'Public comments and moderator response' },
    { time: '14:00', item: 'Decision publication and execution handoff' },
  ],
  targetDate: new Date('2026-04-20T09:00:00Z').getTime(),
};

const SUPPORT_THRESHOLD = 3;

const normalizeUrgency = (value) => {
  const v = String(value || 'standard').toLowerCase();
  if (v === 'high' || v === 'critical') return 'high';
  return 'standard';
};

const normalizeDecisionStatus = (value) => {
  const next = String(value || '')
    .toLowerCase()
    .trim();
  if (next === 'accepted') return 'accepted';
  if (next === 'rejected') return 'rejected';
  if (next === 'needs_revision') return 'needs_revision';
  if (next === 'conference_queue') return 'conference_queue';
  if (next === 'public') return 'public';
  if (next === 'in_execution') return 'in_execution';
  if (next === 'completed') return 'completed';
  return '';
};

const makeProposalId = (proposals) => {
  const maxNum = proposals.reduce((acc, p) => {
    const parsed = Number(String(p.id || '').replace(/[^0-9]/g, '')) || 0;
    return Math.max(acc, parsed);
  }, 100);
  return `PROP-${String(maxNum + 1).padStart(3, '0')}`;
};

const withDerivedFields = (proposal) => {
  const supportCount = Number(proposal.supportCount ?? proposal.endorsements ?? 0);
  return {
    ...proposal,
    supportCount,
    endorsements: supportCount,
    stage: toStage(proposal.status),
    lifecycle: toLifecycle(proposal.status),
    solution: proposal.proposal,
    outcome: proposal.expectedOutcome,
    comments: Array.isArray(proposal.comments) ? proposal.comments : [],
    userEndorsed: false,
  };
};

const refreshStats = (state) => {
  const proposals = state.proposals || [];
  const queueOrVoting = proposals.filter((p) =>
    ['threshold_reached', 'conference_queue', 'in_execution'].includes(p.status),
  );
  return {
    ...state,
    communityStats: {
      ...state.communityStats,
      proposals: proposals.length,
      activeVotes: queueOrVoting.length,
    },
  };
};

export const useGovernanceStore = create(
  persist(
    (set, get) => ({
      proposals: SEED_PROPOSALS,
      citizenPassport: SEED_PASSPORT,
      supportThreshold: SUPPORT_THRESHOLD,

      // Legacy-friendly state
      citizen: SEED_CITIZEN,
      treasury: SEED_TREASURY,
      conference: SEED_CONFERENCE,
      citizenRole: 'member',
      committeeAssignments: ['PROP-101'],
      communityStats: {
        citizens: 2847,
        proposals: SEED_PROPOSALS.length,
        activeVotes: 2,
        participation: 68,
      },
      tickerEvents: [],
      toasts: [],

      setCitizenRole: (role) => set({ citizenRole: role || 'member' }),

      setCitizenMembership: (payload = {}) => {
        set((state) => {
          const nextPassport = {
            ...state.citizenPassport,
            ...payload,
            memberActive: payload.memberActive ?? true,
          };

          const nextCitizen = {
            ...state.citizen,
            name: nextPassport.name || state.citizen.name,
            id: String(nextPassport.citizenId || state.citizen.id).replace('citizen-', ''),
            verified: Boolean(nextPassport.memberActive),
            did: nextPassport.walletAddress
              ? `mock:wallet:${nextPassport.walletAddress}`
              : state.citizen.did,
          };

          return {
            citizenPassport: nextPassport,
            citizen: nextCitizen,
          };
        });
      },

      ensureCitizenMembership: (walletAddress = '') => {
        const state = get();
        const passport = state.citizenPassport;
        if (
          passport?.memberActive &&
          (!walletAddress || passport.walletAddress === walletAddress)
        ) {
          return passport;
        }

        const short = walletAddress
          ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : 'Mock Citizen';
        const nextPassport = {
          ...passport,
          citizenId: walletAddress ? `citizen-${walletAddress.slice(-6)}` : passport.citizenId,
          name: walletAddress ? `Citizen ${short}` : passport.name,
          walletAddress,
          memberActive: true,
          mock: !walletAddress,
        };
        get().setCitizenMembership(nextPassport);
        return nextPassport;
      },

      assignToCommittee: (proposalId) =>
        set((state) => ({
          committeeAssignments: state.committeeAssignments.includes(proposalId)
            ? state.committeeAssignments
            : [...state.committeeAssignments, proposalId],
        })),

      removeFromCommittee: (proposalId) =>
        set((state) => ({
          committeeAssignments: state.committeeAssignments.filter((id) => id !== proposalId),
        })),

      addProposal: (input = {}) => {
        const state = get();
        const passport = state.ensureCitizenMembership(state.citizenPassport?.walletAddress || '');
        const now = new Date().toISOString();
        const proposalId = makeProposalId(state.proposals);
        const createdBy = passport.name || state.citizen.name || 'Citizen';

        const proposal = withDerivedFields(
          createProposalModel({
            id: proposalId,
            title: input.title || 'Untitled Proposal',
            problem: input.problem || '',
            proposal: input.proposal || input.solution || '',
            expectedOutcome: input.expectedOutcome || input.outcome || '',
            costResources: input.costResources || '',
            urgency: normalizeUrgency(input.urgency),
            committeeCategory: input.committeeCategory || input.category || 'governance',
            createdBy,
            createdAt: now,
            supportCount: 0,
            supporters: [],
            comments: [],
            status: 'public',
            adminDecision: '',
            adminReason: '',
            nextStep: 'Awaiting public support threshold.',
            targetTimeline: input.targetTimeline || '',
            executionProject: null,
            author: createdBy,
            authorInitial: String(createdBy[0] || 'C').toUpperCase(),
            authorColor: '#4a90a4',
            category: input.committeeCategory || input.category || 'Governance',
          }),
        );

        set((s) =>
          refreshStats({
            ...s,
            proposals: [proposal, ...s.proposals],
            citizen: { ...s.citizen, proposals: Number(s.citizen.proposals || 0) + 1 },
          }),
        );

        get().addTicker(`Proposal published · ${proposalId}`);
        get().showToast(`📝 ${proposalId} is live for public support.`);
        return proposal;
      },

      supportProposal: (proposalId, supporter = {}) => {
        const state = get();
        const passport = state.ensureCitizenMembership(
          supporter.walletAddress || state.citizenPassport?.walletAddress || '',
        );
        const supporterId = supporter.citizenId || passport.citizenId;

        let alreadySupported = false;
        let reachedThreshold = false;

        set((s) => {
          const proposals = s.proposals.map((proposal) => {
            if (proposal.id !== proposalId) return proposal;

            const supporters = Array.isArray(proposal.supporters) ? proposal.supporters : [];
            if (supporters.includes(supporterId)) {
              alreadySupported = true;
              return proposal;
            }

            const supportCount = Number(proposal.supportCount || 0) + 1;
            let status = proposal.status;
            let thresholdReachedAt = proposal.thresholdReachedAt;
            let conferenceQueuedAt = proposal.conferenceQueuedAt;
            let nextStep = proposal.nextStep;

            if (
              supportCount >= (s.supportThreshold || SUPPORT_THRESHOLD) &&
              ['public', 'draft', 'threshold_reached'].includes(status)
            ) {
              reachedThreshold = true;
              status = 'conference_queue';
              thresholdReachedAt = thresholdReachedAt || new Date().toISOString();
              conferenceQueuedAt = new Date().toISOString();
              nextStep = 'Added to conference agenda queue for moderation and public decision.';
            }

            return withDerivedFields({
              ...proposal,
              supporters: [...supporters, supporterId],
              supportCount,
              status,
              thresholdReachedAt,
              conferenceQueuedAt,
              nextStep,
            });
          });

          return refreshStats({ ...s, proposals });
        });

        if (alreadySupported) {
          get().showToast('You already supported this proposal with your citizen passport.');
          return false;
        }

        get().addTicker(`Support recorded · ${proposalId}`);
        if (reachedThreshold) {
          get().showToast(`✅ ${proposalId} reached threshold and entered the conference queue.`);
        }
        return true;
      },

      addProposalComment: (proposalId, payload = {}) => {
        const state = get();
        const passport = state.ensureCitizenMembership(
          payload.walletAddress || state.citizenPassport?.walletAddress || '',
        );
        const body = String(payload.body || '').trim();
        if (!body) return false;

        const comment = {
          id: `COM-${Date.now()}`,
          authorId: payload.authorId || passport.citizenId,
          authorName: payload.authorName || passport.name || 'Citizen',
          body,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          proposals: s.proposals.map((proposal) => {
            if (proposal.id !== proposalId) return proposal;
            return withDerivedFields({
              ...proposal,
              comments: [...(proposal.comments || []), comment],
            });
          }),
        }));

        get().addTicker(`Comment added · ${proposalId}`);
        return true;
      },

      setAdminDecision: (proposalId, payload = {}) => {
        const nextStatus = normalizeDecisionStatus(payload.decision);
        if (!nextStatus) return false;

        set((s) => ({
          proposals: s.proposals.map((proposal) => {
            if (proposal.id !== proposalId) return proposal;

            return withDerivedFields({
              ...proposal,
              status: nextStatus,
              adminDecision: nextStatus,
              adminReason: payload.reason || proposal.adminReason || '',
              nextStep: payload.nextStep || proposal.nextStep || '',
              targetTimeline: payload.targetTimeline || proposal.targetTimeline || '',
            });
          }),
        }));

        get().addTicker(`Decision published · ${proposalId} → ${nextStatus}`);
        get().showToast(`Moderator decision saved for ${proposalId}.`);
        return true;
      },

      hydrateAdminResponses: (items = []) => {
        if (!Array.isArray(items) || !items.length) return false;

        set((s) => {
          const byProposal = new Map(
            items
              .filter((item) => item && item.proposalId)
              .map((item) => [String(item.proposalId), item]),
          );

          const proposals = s.proposals.map((proposal) => {
            const response = byProposal.get(String(proposal.id));
            if (!response) return proposal;

            let next = {
              ...proposal,
              status: normalizeDecisionStatus(response.decision) || proposal.status,
              adminDecision:
                normalizeDecisionStatus(response.decision) || proposal.adminDecision || '',
              adminReason: response.reason || proposal.adminReason || '',
              nextStep: response.nextStep || proposal.nextStep || '',
              targetTimeline: response.targetTimeline || proposal.targetTimeline || '',
            };

            if (response.executionBlock) {
              next = {
                ...next,
                executionProject: {
                  owner: response.executionBlock.owner || proposal.executionProject?.owner || '',
                  milestones: Array.isArray(response.executionBlock.milestones)
                    ? response.executionBlock.milestones
                    : proposal.executionProject?.milestones || [],
                  progressPercent: Number(response.executionBlock.progressPercent || 0),
                  latestUpdate:
                    response.executionBlock.latestUpdate ||
                    proposal.executionProject?.latestUpdate ||
                    '',
                  completed: Boolean(response.executionBlock.completed),
                },
              };
            }

            return withDerivedFields(next);
          });

          return refreshStats({
            ...s,
            proposals,
          });
        });

        return true;
      },

      setExecutionProject: (proposalId, payload = {}) => {
        set((s) => ({
          proposals: s.proposals.map((proposal) => {
            if (proposal.id !== proposalId) return proposal;

            const milestones = Array.isArray(payload.milestones)
              ? payload.milestones.map((milestone, idx) => ({
                  id: milestone.id || `M-${idx + 1}`,
                  title: milestone.title || `Milestone ${idx + 1}`,
                  done: Boolean(milestone.done),
                }))
              : [];

            const progressPercent = Number(payload.progressPercent || 0);
            const completed = Boolean(payload.completed);
            const status = completed
              ? 'completed'
              : progressPercent > 0
                ? 'in_execution'
                : 'accepted';

            return withDerivedFields({
              ...proposal,
              status,
              executionProject: {
                owner: payload.owner || proposal.executionProject?.owner || '',
                milestones,
                progressPercent,
                latestUpdate: payload.latestUpdate || proposal.executionProject?.latestUpdate || '',
                completed,
              },
            });
          }),
        }));

        get().addTicker(`Execution tracker updated · ${proposalId}`);
        return true;
      },

      castVote: (proposalId, choice) => {
        set((s) => ({
          proposals: s.proposals.map((proposal) => {
            if (proposal.id !== proposalId) return proposal;
            let yes = Number(proposal.yesVotes || 0);
            let no = Number(proposal.noVotes || 0);
            if (proposal.userVote === 'yes') yes -= 1;
            if (proposal.userVote === 'no') no -= 1;
            if (choice === 'yes') yes += 1;
            if (choice === 'no') no += 1;
            return withDerivedFields({
              ...proposal,
              yesVotes: Math.max(0, yes),
              noVotes: Math.max(0, no),
              userVote: choice,
            });
          }),
          citizen: { ...s.citizen, votes: Number(s.citizen.votes || 0) + 1 },
        }));

        get().addTicker(`Vote cast · ${proposalId}`);
      },

      setProposalStatus: (proposalId, status) => {
        const statusMap = {
          draft: 'draft',
          endorsed: 'threshold_reached',
          conference: 'conference_queue',
          panel: 'conference_queue',
          vote: 'conference_queue',
          passed: 'accepted',
          rejected: 'rejected',
          public: 'public',
        };
        const mapped =
          statusMap[String(status || '').toLowerCase()] ||
          normalizeDecisionStatus(status) ||
          'public';
        return get().setAdminDecision(proposalId, { decision: mapped });
      },

      endorseProposal: (proposalId) => {
        const passport = get().citizenPassport;
        return get().supportProposal(proposalId, {
          citizenId: passport.citizenId,
          walletAddress: passport.walletAddress,
        });
      },

      removeProposal: (proposalId) => {
        set((s) =>
          refreshStats({
            ...s,
            proposals: s.proposals.filter((proposal) => proposal.id !== proposalId),
          }),
        );
        get().addTicker(`Proposal removed · ${proposalId}`);
      },

      addTicker: (msg) => {
        const hash = `0x${Math.random().toString(16).slice(2, 6)}`;
        const event = { hash, msg, id: Date.now() };
        set((s) => ({ tickerEvents: [event, ...s.tickerEvents].slice(0, 10) }));
      },

      showToast: (msg) => {
        const id = Date.now();
        set((s) => ({ toasts: [...s.toasts, { id, msg }] }));
        globalThis.setTimeout(
          () => set((s) => ({ toasts: s.toasts.filter((item) => item.id !== id) })),
          3200,
        );
      },

      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((toast) => toast.id !== id) })),
    }),
    {
      name: 'pva-governance-store',
      partialize: (state) => ({
        proposals: state.proposals,
        citizenPassport: state.citizenPassport,
        citizen: state.citizen,
        citizenRole: state.citizenRole,
        committeeAssignments: state.committeeAssignments,
      }),
    },
  ),
);

export const useStore = useGovernanceStore;
