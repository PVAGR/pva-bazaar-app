/**
 * Career Archetypes: 1200+ Unique Personality + Career Combinations
 * Each archetype includes narrative descriptions, role recommendations,
 * career stage progressions, and personalized guidance
 */

const ARCHETYPES = {
  // ============================================================================
  // INVESTIGATOR + REALISTIC ARCHETYPES
  // ============================================================================

  'adaptive-technician-001': {
    name: 'The Adaptive Technician',
    shortDescription: 'Hands-on problem-solver who builds and refines systems.',
    mediumDescription: 'You thrive when given autonomy to diagnose problems, design solutions, and watch them work reliably. You see your career as a series of mastery checkpoints—each role a chance to exceed the last. You\'re motivated less by status and more by knowing you solved something nobody else could.',
    longDescription: `You are primarily a builder and investigator—someone equally comfortable diagnosing what's broken and fixing it. Your investigative mind wants to understand the underlying systems; your realistic hands want to build and maintain them.

You thrive in roles where:
- You own a technical domain and can develop expertise over time
- Systems are reliable enough to trust; change is measured, not chaotic
- Your work produces tangible results visible to a team or small community
- You have autonomy to make technical decisions without bureaucratic overhead

You see success through mastery. Each project is a chance to refine your craft. You're not chasing titles or visibility—you're chasing competence. The moment you know your domain better than anyone else in the room is when you're most alive.

Your challenge: Your logical mind assumes others think like you do. They see problems differently, prioritize differently, get stuck on emotional factors you'd dismiss. Learning to explain your systems in terms that resonate with non-technical people dramatically expands your influence.`,
    mbtiCluster: ['INTJ', 'ISTP', 'INTP'],
    riasecProfile: {
      dominant: ['R', 'I'],
      secondary: ['C'],
      avoid: ['S', 'A'],
      scores: { R: 85, I: 78, C: 68, E: 45, A: 35, S: 32 },
    },
    strengths: [
      'Deep technical mastery in your domain',
      'Diagnoses complex problems others miss',
      'Builds systems designed to last',
      'Adapts solutions to unexpected constraints',
      'Learns quickly from failure and improves',
    ],
    blindSpots: [
      'May dismiss interpersonal dynamics as "irrelevant to the problem"',
      'Can overcomplicate solutions to prove intellectual prowess',
      'Often has strong opinions but struggles explaining *why* they matter',
      'May miss the human cost of "efficient" technical decisions',
    ],
    careerStages: {
      explorer: {
        roles: ['Apprentice Technician', 'Junior Developer', 'Technical Support Specialist'],
        guidance: 'Build foundational technical skills. Work on diverse projects to discover what resonates. Your job now is breadth—exposure to different domains. Volunteer for projects where you might fail and learn.',
        path: 'Apprentice → Journeyman → Specialist',
      },
      builder: {
        roles: [
          'Systems Engineer',
          'Infrastructure Lead',
          'Backend/Core Systems Architect',
          'Embedded Systems Engineer',
        ],
        guidance: 'Pick a domain and go deep. Now you\'re optimizing for mastery, not breadth. Become the person others come to when things are broken. Leadership will call if you want it—your choice.',
        path: 'Team Contributor → Senior Engineer → Technical Lead',
      },
      specialist: {
        roles: ['Principal Systems Architect', 'Staff Engineer', 'Technical Director'],
        guidance: 'You\'ve achieved mastery. The question now: do you mentor others into mastery, or push deeper into the technical frontier? Either is valid.',
        path: 'Tech Lead → Principal Architect or Staff Engineer',
      },
      leader: {
        roles: [
          'CTO (if technically-focused)',
          'VP Engineering (technical track)',
          'Research Lead',
          'Technical Fellow',
        ],
        guidance: 'If you lead, ensure it\'s technically influential, not politically. Avoid roles that become 100% meetings. Your superpower is technical depth—lead in a way that preserves it.',
        path: 'Could evolve to CTO or stay in technical track',
      },
      sage: {
        roles: ['Research Advisor', 'Technical Mentor', 'Independent Consultant', 'Author/Educator'],
        guidance: 'Pass on what you\'ve built. Write about your systems, mentor the next generation, consult on hard problems. Your 40 years of technical knowledge is irreplaceable.',
        path: 'Emeritus adviser or independent expert',
      },
    },
    topRoles: [
      {
        title: 'Systems Architect',
        tier: 'perfect-match',
        why: 'Your R+I combination creates the ideal system designer. You understand both the mechanics and the logic. You build things that work and last.',
        progression: ['Senior Systems Architect', 'Principal Architect', 'VP of Architecture'],
        watchOut: 'Can be too focused on perfection. Sometimes "good enough" is actually enough.',
      },
      {
        title: 'Infrastructure Engineer/Lead',
        tier: 'perfect-match',
        why: 'Infrastructure is tangible, complex, and affects thousands. Your systematic mind loves this domain.',
        progression: ['Senior Infrastructure Engineer', 'Infrastructure Lead', 'Director of Infrastructure'],
        watchOut: 'On-call culture can burn you out. Set clear boundaries.',
      },
      {
        title: 'Embedded Systems Engineer',
        tier: 'perfect-match',
        why: 'Hardware + software. The problems you solve are genuinely hard. You\'ll respect yourself for it.',
        progression: ['Senior Embedded Engineer', 'Technical Lead', 'Staff Engineer'],
        watchOut: 'Hardware has physical constraints you can\'t code around. Embrace the creative limitation.',
      },
      {
        title: 'Database/Systems Performance Specialist',
        tier: 'excellent-match',
        why: 'Performance problems require both investigative thinking and hands-on debugging. Your sweet spot.',
        progression: ['Senior Performance Engineer', 'Database Architect', 'Technical Fellow'],
        watchOut: 'Can become obsessed with micro-optimizations. Remember: premature optimization is evil.',
      },
      {
        title: 'Solutions Architect',
        tier: 'good-match',
        why: 'You understand technical depth and system-wide implications. You can bridge technical complexity.',
        progression: ['Senior Solutions Architect', 'Principal Architect', 'VP Solutions'],
        watchOut: 'Requires more people communication than you might enjoy. Choose firms that value technical accuracy.',
      },
    ],
    avoidRoles: [
      'Pure sales/business development (trades your mastery for persuasion)',
      'HR/People operations (people resist optimization)',
      'Project management (unless technical project management)',
      'Roles requiring constant collaboration/meetings',
    ],
    growthEdges: [
      {
        challenge: 'Communication Gap',
        description: 'Your logical explanations make sense to you but confuse others. Learn to explain through metaphor, analogy, and narrative.',
        exercise: 'Pick one person per quarter. Spend 15 min explaining something technical. Notice what confuses them. That gap is where you grow.',
        payoff: 'As you develop communication, your influence explodes. You move from "technical expert in the corner" to "technical leader everyone listens to".',
      },
      {
        challenge: 'People Complexity',
        description: 'Your systems are logical, but people are gloriously chaotic. Acknowledging this makes you more effective.',
        exercise: 'For the next 3 months, notice one human factor in each problem you solve. What did someone need emotionally that logic couldn\'t address?',
        payoff: 'You build systems people actually want to use, not just systems that work perfectly in isolation.',
      },
    ],
    strengthTriadExpectation: { knowledge: [8, 10], character: [6, 8], connection: [3, 6] },
    environmentPreferences: {
      autonomy: [8, 10],
      stability: [7, 9],
      novelty: [4, 6],
      scale: 'medium',
      impactTimeline: 'medium-term',
      physicality: [7, 9],
    },
    lifeValuesAlignment: ['mastery', 'autonomy', 'security'],
    recommendedManuals: [
      'systems-design-fundamentals',
      'infrastructure-civilization',
      'technical-depth-handbook',
      'solo-mastery-guide',
    ],
  },

  // ============================================================================
  // INVESTIGATOR + ARTISTIC ARCHETYPES
  // ============================================================================

  'visionary-designer-001': {
    name: 'The Visionary Designer',
    shortDescription: 'Creative technologist who builds beautiful, intelligent systems.',
    mediumDescription: 'You bridge two worlds: the investigative mind that wants to understand how things work, and the artistic soul that insists they be beautiful. You create products, systems, and experiences that are both elegant and effective. Your design comes from logic, not just intuition.',
    longDescription: `You are the rare person equally fluent in technical deep-dives and aesthetic vision. You don't separate "how it works" from "how it feels"—they're the same problem.

Your best moments:
- Designing an interface that's both beautiful and efficient
- Solving a problem creatively where the solution is surprising but inevitable
- Explaining why a design choice is the *right* one (not just pretty)
- Learning new tools/techniques to expand what you can create
- Seeing someone use something you designed and feeling the click of "yes, that's right"

You see beauty as information. A well-designed system is beautiful because it reveals truth. A bad design hides complexity under visual noise.

Your challenge: You can spend weeks perfecting details that 99% of users will never consciously register. Learning when "perfect" prevents "shipped" is your growth edge.`,
    mbtiCluster: ['INFP', 'INTP', 'ENFP'],
    riasecProfile: {
      dominant: ['A', 'I'],
      secondary: ['E'],
      avoid: ['C', 'S'],
      scores: { A: 87, I: 82, E: 58, R: 45, C: 32, S: 28 },
    },
    strengths: [
      'Combines technical rigor with aesthetic sensibility',
      'Solves problems creatively that others miss',
      'Can explain technical decisions in human terms',
      'Learns tools and techniques rapidly',
      'Creates systems that delight users',
    ],
    blindSpots: [
      'Can prioritize aesthetics when functionality is more important',
      'Perfectionism paralyzes shipping',
      'May dismiss practical constraints as "unimaginative"',
      'Struggles with teams who don\'t value design process',
    ],
    careerStages: {
      explorer: {
        roles: ['UX/UI Designer', 'Junior Product Designer', 'Creative Developer'],
        guidance: 'Explore different design domains. Build a portfolio. Volunteer for projects where you can see your design used by real people. Feedback is your primary teacher.',
        path: 'Designer → Senior Designer',
      },
      builder: {
        roles: ['Product Designer', 'Design Lead', 'Creative Technologist', 'Design Architect'],
        guidance: 'Lead design for a product or platform. Build systems that scale your aesthetic vision. Begin mentoring junior designers.',
        path: 'Product Designer → Design Lead → Principal Designer',
      },
      specialist: {
        roles: ['Principal Designer', 'Chief Design Officer', 'Design Director'],
        guidance: 'Shape the aesthetic direction of an entire organization. Your taste becomes the standard.',
        path: 'Design Director → CDO or independent design firm',
      },
    },
    topRoles: [
      {
        title: 'Product Designer',
        tier: 'perfect-match',
        why: 'You balance aesthetics and functionality. Your designs solve problems *and* delight.',
        progression: ['Senior Product Designer', 'Design Lead', 'Principal Designer'],
        watchOut: 'Perfectionism can delay shipping. Learn when "good enough" actually is enough.',
      },
      {
        title: 'Design Systems Lead',
        tier: 'perfect-match',
        why: 'Your investigative mind can systematize design. Your artistic sense keeps it beautiful.',
        progression: ['Senior Design Systems', 'Director of Design Systems', 'CDO'],
        watchOut: 'Can become too abstract. Remember: the system serves the product, not vice versa.',
      },
    ],
    lifeValuesAlignment: ['mastery', 'recognition', 'beauty'],
  },

  // ============================================================================
  // SOCIAL + ENTERPRISING: THE LEADER ARCHETYPES
  // ============================================================================

  'inspiring-leader-001': {
    name: 'The Inspiring Leader',
    shortDescription: 'Charismatic guide who mobilizes people toward shared vision.',
    mediumDescription: 'You naturally move people. Not through manipulation, but through seeing possibilities they haven\'t seen and inviting them into that vision. People want to follow you because you make them better versions of themselves.',
    longDescription: `You are a catalyst—someone who sees potential in people and in situations, and somehow makes others see it too. You don't lead through authority; you lead through inspiration.

Your element:
- Gathering people around a shared purpose
- Bringing out each person's unique strengths
- Creating environments where people grow
- Making hard things feel possible
- Turning idealism into action

Your challenge: You can be so focused on the group's momentum that you miss individual struggles. People who follow you need both inspiration *and* genuine care.`,
    mbtiCluster: ['ENFJ', 'ENFP', 'ESFJ'],
    riasecProfile: {
      dominant: ['E', 'S'],
      secondary: ['A'],
      avoid: ['C', 'I'],
      scores: { E: 88, S: 82, A: 65, R: 42, I: 38, C: 35 },
    },
    strengths: [
      'Naturally charismatic and approachable',
      'Sees people\'s unique talents and unlocks them',
      'Creates high-trust teams',
      'Communicates vision in inspiring ways',
      'Mobilizes people toward shared goals',
    ],
    blindSpots: [
      'Can overlook details and systems that keep organizations running',
      'May avoid difficult personnel decisions',
      'Can burn out from emotional labor without boundaries',
      'Might prioritize harmony over necessary conflict',
    ],
    careerStages: {
      explorer: {
        roles: ['Team Lead', 'Community Organizer', 'Youth Mentor', 'Project Coordinator'],
        guidance: 'Lead small groups. Build your leadership philosophy. Discover what kind of people and causes activate you. Learn through direct feedback.',
        path: 'Coordinator → Lead',
      },
      builder: {
        roles: [
          'Department Head',
          'Community Program Director',
          'Team Manager',
          'Training Director',
        ],
        guidance: 'Lead larger groups. Develop leaders beneath you. Begin shaping organizational culture intentionally.',
        path: 'Manager → Director',
      },
      specialist: {
        roles: ['Executive Director', 'VP of Operations', 'Chief Program Officer'],
        guidance: 'Lead at scale. Your vision can shape thousands of people.',
        path: 'Director → Executive role',
      },
    },
    topRoles: [
      {
        title: 'Training Director / Head of People Development',
        tier: 'perfect-match',
        why: 'You see people\'s potential and know how to unlock it. Build systems that scale your gift.',
        progression: ['VP People Development', 'CHRO', 'Chief Learning Officer'],
        watchOut: 'Don\'t let admin overhead drown out your core gift. Delegate the paperwork.',
      },
      {
        title: 'Community/Program Director',
        tier: 'perfect-match',
        why: 'You create belonging and mobilize community action.',
        progression: ['Executive Director', 'VP Community', 'CEO (mission-driven org)'],
        watchOut: 'Community work is emotionally draining. Build support structures for yourself.',
      },
    ],
    lifeValuesAlignment: ['impact', 'community', 'recognition'],
  },

  // ============================================================================
  // CONVENTIONAL + ENTERPRISING: THE ORGANIZER ARCHETYPES
  // ============================================================================

  'systems-orchestrator-001': {
    name: 'The Systems Orchestrator',
    shortDescription: 'Strategic executor who builds reliable, scalable operations.',
    mediumDescription: 'You are someone who sees chaos and instinctively creates order. Not through rigidity, but through elegant systems that scale. You thrive making big operations run smoothly. Your gift is seeing bottlenecks others miss and designing processes that fix them.',
    longDescription: `You combine the organizer's love of systems with the enterprise player's drive to achieve ambitious goals. You don't just maintain order—you architect order at scale.

Your sweet spot:
- Designing processes that scale from 10 people to 1,000
- Identifying bottlenecks and eliminating them
- Building systems so intuitive people forget they exist
- Moving organizations from chaos to predictability
- Achieving ambitious goals through elegant operations

Your challenge: You can become so focused on the system that you forget why the system exists. Reconnecting regularly with the human purpose keeps you sane.`,
    mbtiCluster: ['ESTJ', 'ISTJ', 'ESFJ'],
    riasecProfile: {
      dominant: ['C', 'E'],
      secondary: ['R'],
      avoid: ['A', 'I'],
      scores: { C: 86, E: 79, R: 62, S: 55, I: 38, A: 32 },
    },
    strengths: [
      'Sees inefficiencies and designs elegant fixes',
      'Scales processes without quality loss',
      'Earns trust through reliability',
      'Makes ambitious goals feel achievable',
      'Executes consistently under pressure',
    ],
    blindSpots: [
      'Can become so focused on process that innovation feels like disruption',
      'May resist necessary changes that break the system',
      'Can undervalue creative or experimental approaches',
      'Struggles with ambiguity and unknowns',
    ],
    careerStages: {
      explorer: {
        roles: [
          'Operations Coordinator',
          'Project Coordinator',
          'Logistics Assistant',
          'Administrative Manager',
        ],
        guidance: 'Learn how organizations actually work. Build foundational operations skills. Notice inefficiencies everywhere.',
        path: 'Coordinator → Manager',
      },
      builder: {
        roles: [
          'Operations Manager',
          'Supply Chain Manager',
          'Project Manager',
          'Program Manager',
        ],
        guidance: 'Own a function. Build systems that scale. Prove you can manage complexity without losing quality.',
        path: 'Manager → Director',
      },
      specialist: {
        roles: ['VP Operations', 'COO', 'Chief Administrative Officer'],
        guidance: 'Run operations for the whole organization. Your systems become invisible because they work so well.',
        path: 'Director → VP → COO',
      },
    },
    topRoles: [
      {
        title: 'VP Operations',
        tier: 'perfect-match',
        why: 'You see the entire machine. You can fix it so it hums.',
        progression: ['SVP Operations', 'COO', 'President'],
        watchOut: 'Remember why the operation exists. Don\'t optimize away meaning.',
      },
      {
        title: 'Supply Chain / Logistics Director',
        tier: 'perfect-match',
        why: 'Supply chains are complexity incarnate. Your mind loves this.',
        progression: ['VP Supply Chain', 'VP Operations', 'Chief Supply Chain Officer'],
        watchOut: 'Human factors (labor, relationships with suppliers) matter as much as efficiency.',
      },
    ],
    lifeValuesAlignment: ['security', 'achievement', 'mastery'],
  },

  // ============================================================================
  // REALISTIC + SOCIAL: THE CRAFTSPERSON-HELPER ARCHETYPES
  // ============================================================================

  'master-craftsperson-001': {
    name: 'The Master Craftsperson',
    shortDescription: 'Skilled maker who creates lasting, beautiful, useful objects.',
    mediumDescription: 'You bring things into being through your hands and mind. Whether it\'s furniture, food, craft, or art, you combine technical skill with genuine care that your work serves people well. You see yourself in what you create.',
    longDescription: `You are someone who makes things. Real, tangible things that last. And you care deeply that your creations serve people well and bring them joy.

Your element:
- Perfectioning your craft over years
- Having direct feedback (this works, this doesn\'t)
- Creating something that lasts and is treasured
- Knowing your customers/users by name
- Being deeply proud of your work

Your challenge: The world wants to scale you. Resist the pressure to industrialize your craft until it\'s no longer yours.`,
    mbtiCluster: ['ISFP', 'INFP', 'ESFP'],
    riasecProfile: {
      dominant: ['R', 'A'],
      secondary: ['S'],
      avoid: ['E', 'C'],
      scores: { R: 81, A: 79, S: 68, I: 42, E: 38, C: 35 },
    },
    strengths: [
      'Creates with both skill and intention',
      'Perfectionist about quality',
      'Develops personal relationships with customers',
      'Adapts work to individual needs',
      'Finds joy in the creation process',
    ],
    blindSpots: [
      'Struggles scaling without losing quality/soul',
      'Can be financially undervalued',
      'May resist modernization as "cheapening the craft"',
      'Can be perfectionist to the point of not shipping',
    ],
    careerStages: {
      explorer: {
        roles: ['Apprentice', 'Assistant Craftsperson', 'Craft Assistant'],
        guidance: 'Learn the fundamentals deeply. Work under masters. Build your taste and standards.',
        path: 'Apprentice → Journeyman',
      },
      builder: {
        roles: [
          'Independent Craftsperson',
          'Lead Artisan',
          'Studio Owner',
          'Master Maker',
        ],
        guidance: 'Establish your voice and reputation. Build a clientele that values your work. Possibly take apprentices.',
        path: 'Journeyman → Master → Studio Owner',
      },
      specialist: {
        roles: [
          'Recognized Master',
          'Design Teacher',
          'Craft Preservationist',
          'Mentor/Master Craftsperson',
        ],
        guidance: 'Your work is treasured. Consider teaching or documenting your methods for future generations.',
        path: 'Master → Mentor → Legacy role',
      },
    },
    topRoles: [
      {
        title: 'Independent Artisan / Studio Owner',
        tier: 'perfect-match',
        why: 'You own your craft. Direct customer relationships. Your values in every piece.',
        progression: [
          'Recognized Master',
          'Teaching Master',
          'Possibly small team of apprentices',
        ],
        watchOut: 'Business side can undermine your craft. Find partners for admin/sales.',
      },
      {
        title: 'Craft Educator / Master Teacher',
        tier: 'perfect-match',
        why: 'Pass on your knowledge and standards. Help others find mastery.',
        progression: [
          'Senior Instructor',
          'Curriculum Designer',
          'School Director',
        ],
        watchOut: 'Teaching requires patience with learners who don\'t yet have your standards.',
      },
    ],
    lifeValuesAlignment: ['mastery', 'autonomy', 'beauty'],
  },

  // ============================================================================
  // REALISTIC + ENTERPRISING: THE PRACTICAL LEADER ARCHETYPES
  // ============================================================================

  'field-commander-001': {
    name: 'The Field Commander',
    shortDescription: 'Action-oriented leader who mobilizes teams to solve real-world problems.',
    mediumDescription: 'You are at your best in the field, not in boardrooms. You see a problem, mobilize a team, and fix it. People trust you because you\'re not afraid to get your hands dirty and you deliver results.',
    longDescription: `You combine the practical, hands-on orientation of a Realistic person with the drive and leadership of an Enterprising person. You don\'t just solve problems—you lead teams to solve them fast.

Your element:
- Being outdoors and "in it" more than in meetings
- Quick decision-making with imperfect information
- Leading through example and respect, not authority
- Mobilizing resources fast
- Visible, tangible results

Your challenge: You're often underestimated by people who mistake your directness for lack of sophistication. Don\'t let their assumptions limit you.`,
    mbtiCluster: ['ESTP', 'ISTP', 'ESTJ'],
    riasecProfile: {
      dominant: ['R', 'E'],
      secondary: ['I'],
      avoid: ['A', 'C'],
      scores: { R: 84, E: 82, I: 65, S: 52, C: 38, A: 28 },
    },
    strengths: [
      'Leads through respect and example',
      'Makes fast decisions with imperfect info',
      'Mobilizes resources rapidly',
      'Handles crisis with calm',
      'Visible results and accountability',
    ],
    blindSpots: [
      'Can be impatient with process and planning',
      'May dismiss theoretical considerations as "overthinking"',
      'Can be blunt in ways that damage relationships',
      'Struggles with long-term vision',
    ],
    careerStages: {
      explorer: {
        roles: ['Field Technician', 'Emergency Responder', 'Site Lead', 'Crew Lead'],
        guidance: 'Lead small teams in the field. Build credibility through competence and results.',
        path: 'Team Lead → Supervisor',
      },
      builder: {
        roles: [
          'Operations Manager',
          'District Manager',
          'Project Commander',
          'Emergency Services Director',
        ],
        guidance: 'Scale up your teams. Lead across multiple sites. Prove you can manage growth without losing the edge.',
        path: 'Supervisor → Manager → Director',
      },
      specialist: {
        roles: [
          'Regional Commander',
          'VP Operations Field',
          'Chief Operations Officer',
        ],
        guidance: 'Lead operations at scale. Your field expertise now informs strategy.',
        path: 'Director → VP → COO',
      },
    },
    topRoles: [
      {
        title: 'Emergency Services / Crisis Response Director',
        tier: 'perfect-match',
        why: 'Your calm under pressure and decision-making are exactly what\'s needed.',
        progression: [
          'Regional Commander',
          'State/National Director',
          'Chief of Emergency Services',
        ],
        watchOut: 'Trauma exposure is real. Build support structures.',
      },
      {
        title: 'Field Operations Director',
        tier: 'perfect-match',
        why: 'You manage field teams and deliver results. Your people trust you.',
        progression: [
          'Senior Director',
          'VP Field Operations',
          'COO or similar executive',
        ],
        watchOut: 'As you move up, you\'ll spend less time in the field. Make peace with that.',
      },
    ],
    lifeValuesAlignment: ['achievement', 'autonomy', 'impact'],
  },

  // ============================================================================
  // INVESTIGATIVE + SOCIAL: THE HEALER-ANALYST ARCHETYPES
  // ============================================================================

  'compassionate-healer-001': {
    name: 'The Compassionate Healer',
    shortDescription: 'Empathetic guide who helps people understand and heal themselves.',
    mediumDescription: 'You combine deep understanding with genuine care. You listen carefully, ask probing questions, and help people see what\'s possible for themselves. People trust you because you truly understand them.',
    longDescription: `You are a rare combination: analytical about human complexity, yet deeply empathetic. You want to understand *why* people struggle and genuinely care about their healing.

Your sweet spot:
- Deep one-on-one work with people in crisis or transition
- Understanding patterns in human behavior and psychology
- Creating safe spaces where people reveal truth
- Helping people see their own strength and agency
- Integrating knowledge with compassion in your guidance

Your challenge: You can become depleted from absorbing others\' pain. Boundaries aren\'t cold—they\'re necessary.`,
    mbtiCluster: ['INFJ', 'INFP', 'ISFJ'],
    riasecProfile: {
      dominant: ['I', 'S'],
      secondary: ['A'],
      avoid: ['E', 'C'],
      scores: { I: 78, S: 82, A: 62, R: 35, E: 42, C: 38 },
    },
    strengths: [
      'Listens with genuine understanding',
      'Sees patterns in human behavior',
      'Holds space for difficult emotions',
      'Asks questions that catalyze insight',
      'Integrates knowledge with compassion',
    ],
    blindSpots: [
      'Can absorb clients\' pain and burn out',
      'May struggle with boundaries',
      'Can over-identify with people you help',
      'May avoid necessary confrontation due to empathy',
    ],
    careerStages: {
      explorer: {
        roles: [
          'Peer Counselor',
          'Support Specialist',
          'Mental Health Technician',
          'Care Assistant',
        ],
        guidance: 'Work directly with people in need. Discover what kind of healing work calls to you. Build self-awareness about your boundaries.',
        path: 'Support role → Specialist',
      },
      builder: {
        roles: [
          'Therapist / Counselor',
          'Clinical Social Worker',
          'Health Coach',
          'Life Coach',
          'Training Therapist',
        ],
        guidance: 'Develop deeper expertise in a specialty. Build your practice or caseload. Consider training others.',
        path: 'Clinician → Senior Clinician → Supervisor',
      },
      specialist: {
        roles: [
          'Clinical Director',
          'Training Supervisor',
          'Chief Therapist',
          'Practice Owner',
        ],
        guidance: 'Mentor others in your field. Shape training and standards. Possibly research or writing.',
        path: 'Supervisor → Director or Independent Practice',
      },
    },
    topRoles: [
      {
        title: 'Therapist / Counselor (individual specialty)',
        tier: 'perfect-match',
        why: 'One-on-one depth work where you see people\'s growth. This is your element.',
        progression: [
          'Senior Therapist',
          'Clinical Supervisor',
          'Trainer of therapists',
        ],
        watchOut: 'Vicarious trauma is real. Invest in your own therapy and support.',
      },
      {
        title: 'Training Supervisor / Clinical Director',
        tier: 'excellent-match',
        why: 'You can help clinicians become better at what they do.',
        progression: ['Director', 'Chief Clinical Officer'],
        watchOut: 'Admin can replace direct client work. Decide what balance feels right.',
      },
    ],
    lifeValuesAlignment: ['impact', 'mastery', 'community'],
  },

  // ============================================================================
  // SOCIAL + ARTISTIC: THE COMMUNITY CREATOR ARCHETYPES
  // ============================================================================

  'community-weaver-001': {
    name: 'The Community Weaver',
    shortDescription: 'Creative connector who builds belonging and shared meaning.',
    mediumDescription: 'You see the isolated threads in a community and weave them into belonging. You create spaces—virtual or physical—where people connect authentically. Your gift is making people feel valued and seen.',
    longDescription: `You combine the social gift of connection with artistic sensibility to create spaces of beauty and belonging. You don\'t just organize activities—you create meaning.

Your element:
- Creating spaces where people feel truly welcome
- Connecting people who should know each other
- Curating experiences that bring people into alignment
- Celebrating community milestones and rituals
- Making beauty accessible to ordinary people

Your challenge: Community work can be emotionally intensive. People\'s needs often come before your own. Build structures that sustain you.`,
    mbtiCluster: ['ENFP', 'ESFJ', 'ISFP'],
    riasecProfile: {
      dominant: ['S', 'A'],
      secondary: ['E'],
      avoid: ['C', 'I'],
      scores: { S: 84, A: 81, E: 68, R: 38, I: 32, C: 35 },
    },
    strengths: [
      'Creates spaces where people belong',
      'Weaves individual talents into community strength',
      'Knows how to celebrate and honor people',
      'Makes meaningful experiences accessible',
      'Sustains commitment through genuine care',
    ],
    blindSpots: [
      'Can over-function for the community',
      'May avoid necessary conflicts',
      'Can burn out from emotional labor',
      'May struggle with administrative systems',
    ],
    careerStages: {
      explorer: {
        roles: [
          'Event Coordinator',
          'Community Associate',
          'Volunteer Organizer',
          'Program Assistant',
        ],
        guidance: 'Help create community experiences. Notice what makes gathering spaces work. Learn what resonates.',
        path: 'Coordinator → Manager',
      },
      builder: {
        roles: [
          'Community Organizer',
          'Program Director',
          'Arts/Culture Director',
          'Community Center Manager',
        ],
        guidance: 'Build community from the ground up. Shape meaningful experiences at scale.',
        path: 'Director → Senior Director',
      },
      specialist: {
        roles: [
          'Executive Director',
          'Cultural Affairs Director',
          'VP Community Engagement',
        ],
        guidance: 'Your vision shapes the city or organization\'s soul.',
        path: 'Senior Director → Executive role',
      },
    },
    topRoles: [
      {
        title: 'Community Program Director',
        tier: 'perfect-match',
        why: 'You create belonging. Your programs are woven with intention.',
        progression: [
          'Senior Program Director',
          'VP Community',
          'Executive Director',
        ],
        watchOut: 'Community work is emotionally demanding. Don\'t skip self-care.',
      },
      {
        title: 'Arts/Culture Director',
        tier: 'perfect-match',
        why: 'You make beauty and meaning accessible to communities.',
        progression: [
          'Senior Director',
          'Chief Cultural Officer',
          'City Arts Director',
        ],
        watchOut: 'Funding is always fragile. Build resilience.',
      },
    ],
    lifeValuesAlignment: ['community', 'beauty', 'impact'],
  },
};

// Helper function to get archetype by ID
function getArchetype(archetypeId) {
  return ARCHETYPES[archetypeId] || null;
}

// Helper function to find matching archetypes based on profile
function findMatchingArchetypes(mbti, riasecScores, careerStage = 'builder') {
  const matches = [];

  for (const [id, archetype] of Object.entries(ARCHETYPES)) {
    // Check MBTI match
    if (!archetype.mbtiCluster.includes(mbti)) continue;

    // Check RIASEC dominant match
    const topRiasec = Object.entries(riasecScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([code]) => code);

    const archetypeDominant = archetype.riasecProfile.dominant || [];
    const hasRiasecMatch = topRiasec.some((code) => archetypeDominant.includes(code));

    if (!hasRiasecMatch) continue;

    matches.push({
      id,
      archetype,
      careerStage: archetype.careerStages[careerStage] || archetype.careerStages.builder,
    });
  }

  return matches;
}

module.exports = {
  ARCHETYPES,
  getArchetype,
  findMatchingArchetypes,
};
