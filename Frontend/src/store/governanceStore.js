// src/store/governanceStore.js
// Central state store for the PVA Bazaar governance system.
// Uses Zustand. Install with: npm install zustand

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── SEED DATA ──────────────────────────────────────────────────────────────────
const SEED_PROPOSALS = [
  {
    id: 'PROP-041',
    stage: 'vote',           // draft | endorsed | panel | vote | passed | rejected
    category: 'Infrastructure',
    urgency: 'High',
    title: 'Solar Micro-Grid Expansion — Kibera District',
    excerpt:
      'Install a 40kW solar micro-grid to provide clean, affordable electricity to 1,200 households. Estimated cost: 180,000 PVA tokens. Operational within 90 days.',
    problem:
      'Over 4,200 residents in Kibera Block C lack reliable electricity. Kerosene lanterns cause respiratory illness and fire risk. Children cannot study after dark.',
    solution:
      'Install a 40kW solar micro-grid with battery storage. A community-owned cooperative manages distribution. Revenue recycles to community treasury.',
    outcome:
      '1,200 households receive 12hr/day electricity. Estimated 40% reduction in energy costs. 3 local technicians employed full-time.',
    panelStatement:
      "The Citizens' Panel (47 members) reviewed this over 14 days. 41 recommend YES. Key concern: ensure maintenance training is locally delivered.",
    author: 'Wanjiru M.',
    authorInitial: 'W',
    authorColor: '#c97d2e',
    endorsements: 412,
    comments: 87,
    yesVotes: 1306,
    noVotes: 618,
    daysLeft: 7,
    createdAt: '2026-04-05',
    lifecycle: 4,
    userEndorsed: false,
    userVote: null,
  },
  {
    id: 'PROP-044',
    stage: 'endorsed',
    category: 'Health',
    urgency: 'Standard',
    title: 'Community Water Filtration & Testing Network',
    excerpt:
      'Deploy 12 gravity-fed ceramic filtration stations with monthly water quality testing and public reporting via the PVA dashboard.',
    problem:
      'Waterborne illness accounts for 23% of clinic visits. Nearest clean water is 2km away. Women and children spend 3hrs/day collecting water.',
    solution:
      '12 filtration stations from local ceramic manufacturers. Community-trained monitors test quality monthly. Results published on PVA platform.',
    outcome: 'Reduce waterborne illness by 60%. Save 3hrs/day per household. Create 12 part-time water monitor roles.',
    panelStatement: null,
    author: 'Omondi K.',
    authorInitial: 'O',
    authorColor: '#5a8a3c',
    endorsements: 287,
    comments: 54,
    yesVotes: 0,
    noVotes: 0,
    daysLeft: null,
    createdAt: '2026-04-08',
    lifecycle: 2,
    userEndorsed: false,
    userVote: null,
  },
  {
    id: 'PROP-039',
    stage: 'panel',
    category: 'Economy',
    urgency: 'Standard',
    title: 'Establish a Weekly Open Market — Digital & Physical',
    excerpt:
      "Create a combined physical and digital marketplace where citizens trade goods and services using PVA tokens. Anchor the community's internal economy.",
    problem: 'Citizens lack a structured venue for economic exchange. PVA token utility is limited, reducing participation incentives.',
    solution:
      'Weekly physical market on Saturdays matched by digital storefront on pvabazaar.org. Merchant registration requires verified citizen ID. Fees: 1% to community treasury.',
    outcome: 'Circulate 50,000+ PVA tokens weekly. Provide income to 200+ vendors. Build proof-of-concept for PVA economic model.',
    panelStatement:
      'Panel deliberation ongoing. 31 of 50 members completed review. Preliminary vote: 27 YES, 4 NO. Full statement expected in 5 days.',
    author: 'Fatuma A.',
    authorInitial: 'F',
    authorColor: '#4a90a4',
    endorsements: 334,
    comments: 102,
    yesVotes: 0,
    noVotes: 0,
    daysLeft: null,
    createdAt: '2026-04-01',
    lifecycle: 3,
    userEndorsed: false,
    userVote: null,
  },
  {
    id: 'PROP-046',
    stage: 'draft',
    category: 'Education',
    urgency: 'Standard',
    title: 'Mobile Library & After-School Learning Stations',
    excerpt:
      'Repurpose two donated vehicles as mobile libraries with tablets, offline learning software, and trained facilitators for ages 5–17.',
    problem: '68% of children lack access to books or digital learning tools outside school hours. Drop-out rates peak at age 14.',
    solution: 'Two mobile learning stations rotating across 4 zones. Offline-first software. Weekly schedule published on PVA platform.',
    outcome: '800 children served weekly. 30% improvement in literacy metrics over 12 months.',
    panelStatement: null,
    author: 'Amara K.',
    authorInitial: 'A',
    authorColor: '#e8a83e',
    endorsements: 47,
    comments: 12,
    yesVotes: 0,
    noVotes: 0,
    daysLeft: null,
    createdAt: '2026-04-11',
    lifecycle: 1,
    userEndorsed: false,
    userVote: null,
  },
  {
    id: 'PROP-038',
    stage: 'passed',
    category: 'Health',
    urgency: 'High',
    title: 'Mobile Health Clinic — Monthly Rotation',
    excerpt:
      'Fund and operate a monthly mobile clinic providing basic healthcare, vaccinations, and reproductive health services across 6 community zones.',
    problem: 'Nearest public clinic is 5km away. 40% of community members have not received basic preventive care in the past year.',
    solution:
      'Monthly clinic visiting 6 zones on a published schedule. Staffed by 2 nurses + 1 doctor. Funded by community treasury (60,000 PVA/year).',
    outcome: '2,400 citizens served annually. Vaccination coverage increased from 34% to 85%.',
    panelStatement:
      "Citizens' Panel voted 45–5 YES. The proposal is well-evidenced, cost-effective, and addresses a critical need. Panel recommends quarterly reporting.",
    author: 'Dr. Njoroge P.',
    authorInitial: 'N',
    authorColor: '#5a8a3c',
    endorsements: 589,
    comments: 143,
    yesVotes: 1956,
    noVotes: 801,
    daysLeft: null,
    createdAt: '2026-03-20',
    lifecycle: 5,
    userEndorsed: true,
    userVote: 'yes',
  },
  {
    id: 'PROP-047',
    stage: 'draft',
    category: 'Governance',
    urgency: 'Standard',
    title: "Citizens' Oversight Committee — Quarterly Audit",
    excerpt:
      'Establish a randomly selected 15-member Oversight Committee to audit all treasury spending every quarter and publish full reports on-chain.',
    problem: 'No formal mechanism for citizens to audit treasury expenditures. Trust requires radical transparency.',
    solution:
      '15 citizens selected at random each quarter. Full access to treasury records. Findings published on-chain and via PVA website within 30 days.',
    outcome: 'Complete financial transparency. Early detection of misuse. Strengthen citizen trust.',
    panelStatement: null,
    author: 'Kibera Node',
    authorInitial: 'K',
    authorColor: '#e05a2b',
    endorsements: 19,
    comments: 6,
    yesVotes: 0,
    noVotes: 0,
    daysLeft: null,
    createdAt: '2026-04-12',
    lifecycle: 1,
    userEndorsed: false,
    userVote: null,
  },
]

const SEED_CITIZEN = {
  name: 'Amara Kamau',
  initial: 'A',
  id: '0047',
  did: '0x4f2a8b3c9e1d7f05…8c91',
  node: 'Nairobi Node · Kenya',
  joinedAt: 'Feb 2025',
  votes: 23,
  proposals: 4,
  reputation: 72,
  tokens: 450,
  conferencesAttended: 3,
  panelTerms: 1,
  verified: true,
}

const SEED_TREASURY = {
  totalSupply: 1000000,
  circulating: 284700,
  communityFund: 182400,
  proposalReserve: 45000,
  recentTransactions: [
    { id: 'TX-8821', type: 'payout', amount: 60000, desc: 'Mobile Health Clinic — monthly operating budget', date: '2026-04-01' },
    { id: 'TX-8720', type: 'deposit', amount: 12400, desc: 'Market fee collection — March', date: '2026-03-31' },
    { id: 'TX-8611', type: 'payout', amount: 8000, desc: "Citizens' Panel honorarium — Q1", date: '2026-03-28' },
    { id: 'TX-8504', type: 'deposit', amount: 5000, desc: 'New citizen enrollment fees', date: '2026-03-25' },
  ],
}

const SEED_CONFERENCE = {
  number: 7,
  date: '2026-04-20',
  location: 'Kibera Community Hall + pvabazaar.org (livestream)',
  agenda: [
    { time: '09:00', item: 'Opening & Attendance Verification' },
    { time: '09:30', item: "PROP-041: Solar Micro-Grid (Panel Statement + Q&A)" },
    { time: '10:30', item: "PROP-039: Open Market System (Panel Statement + Q&A)" },
    { time: '11:30', item: 'PROP-044: Water Filtration Network' },
    { time: '13:00', item: 'Break + Open Deliberation' },
    { time: '14:00', item: 'Open Floor — Citizen Questions (5 min each)' },
    { time: '15:00', item: 'LIVE VOTING SESSION — all eligible citizens' },
    { time: '16:00', item: 'Results Announced & Recorded On-Chain' },
    { time: '16:30', item: 'New Proposals from the Floor' },
  ],
  targetDate: new Date('2026-04-20T09:00:00').getTime(),
}

// ── STORE ──────────────────────────────────────────────────────────────────────
export const useGovernanceStore = create(
  persist(
    (set, get) => ({
      // State
      proposals: SEED_PROPOSALS,
      citizen: SEED_CITIZEN,
      treasury: SEED_TREASURY,
      conference: SEED_CONFERENCE,
      communityStats: { citizens: 2847, proposals: 143, activeVotes: 12, participation: 68 },
      tickerEvents: [],
      toasts: [],

      // ── Proposals
      addProposal: (data) => {
        const proposals = get().proposals
        const nextNum = 48 + proposals.length
        const newProposal = {
          id: `PROP-0${nextNum}`,
          stage: 'draft',
          category: data.category || 'Governance',
          urgency: data.urgency || 'Standard',
          title: data.title,
          excerpt: data.solution || 'Draft proposal — details pending.',
          problem: data.problem || '',
          solution: data.solution || '',
          outcome: data.outcome || '',
          panelStatement: null,
          author: 'Amara K.',
          authorInitial: 'A',
          authorColor: '#e8a83e',
          endorsements: 0,
          comments: 0,
          yesVotes: 0,
          noVotes: 0,
          daysLeft: null,
          createdAt: new Date().toISOString().split('T')[0],
          lifecycle: 1,
          userEndorsed: false,
          userVote: null,
        }
        set({ proposals: [newProposal, ...proposals] })
        get().addTicker(`New proposal · ${newProposal.id}`)
        get().showToast(`📝 ${newProposal.id} submitted! Needs 5% endorsements to advance.`)
        // Update citizen proposal count
        set((s) => ({ citizen: { ...s.citizen, proposals: s.citizen.proposals + 1 } }))
      },

      endorseProposal: (id) => {
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (p.id !== id) return p
            if (p.userEndorsed) return p
            const newEndorsements = p.endorsements + 1
            // Auto-advance draft→endorsed at 100 endorsements (represents ~5% threshold)
            const newStage = p.stage === 'draft' && newEndorsements >= 100 ? 'endorsed' : p.stage
            const newLifecycle = newStage === 'endorsed' ? 2 : p.lifecycle
            return { ...p, endorsements: newEndorsements, userEndorsed: true, stage: newStage, lifecycle: newLifecycle }
          }),
        }))
        const p = get().proposals.find((x) => x.id === id)
        get().addTicker(`Endorsed · ${id}`)
        if (p?.stage === 'endorsed') {
          get().showToast(`✅ ${id} reached endorsement threshold!`)
        } else {
          get().showToast(`⬆ Endorsed · ${p?.endorsements} total`)
        }
      },

      castVote: (id, choice) => {
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (p.id !== id || p.stage !== 'vote') return p
            if (p.userVote === choice) return p
            let yes = p.yesVotes
            let no = p.noVotes
            // Remove previous vote if switching
            if (p.userVote === 'yes') yes--
            if (p.userVote === 'no') no--
            if (choice === 'yes') yes++
            else no++
            return { ...p, yesVotes: yes, noVotes: no, userVote: choice }
          }),
        }))
        get().addTicker(`Vote cast · ${id}`)
        get().showToast(`🗳 ${choice.toUpperCase()} vote cast · ZK proof generated · Recorded on-chain`)
        set((s) => ({ citizen: { ...s.citizen, votes: s.citizen.votes + 1 } }))
      },

      // ── UI helpers
      addTicker: (msg) => {
        const hash = `0x${Math.random().toString(16).substr(2, 4)}`
        const event = { hash, msg, id: Date.now() }
        set((s) => ({ tickerEvents: [event, ...s.tickerEvents].slice(0, 8) }))
      },

      showToast: (msg) => {
        const id = Date.now()
        set((s) => ({ toasts: [...s.toasts, { id, msg }] }))
        globalThis.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200)
      },

      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'pva-governance-store',
      partialize: (s) => ({ proposals: s.proposals, citizen: s.citizen }),
    }
  )
)
