const express = require('express');
const router = express.Router();
const CareerQuizResult = require('../models/CareerQuizResult');
const CareerQuizDefinition = require('../models/CareerQuizDefinition');
const adminSession = require('../middleware/adminSession');

const QUIZ_VERSION = 1;
const QUIZ_TITLE = 'Civilization Career Compass';
const QUIZ_INTRO =
  'Rate each activity from 1 to 5 based on genuine enjoyment. This produces a detailed MBTI + RIASEC fit profile and career path suggestions for real civilizational roles.';

const RIASEC_CODES = new Set(['R', 'I', 'A', 'S', 'E', 'C']);
const LIKERT_OPTIONS = [
  { key: '1', value: 1, text: '1 - I do not enjoy this at all' },
  { key: '2', value: 2, text: '2 - I rarely enjoy this' },
  { key: '3', value: 3, text: '3 - Neutral / depends on context' },
  { key: '4', value: 4, text: '4 - I enjoy this often' },
  { key: '5', value: 5, text: '5 - I love this and lose track of time' },
];

function buildLikertQuestion(id, prompt, axis, lowPole, highPole, riasecLow, riasecHigh, section = 'enjoyment', weight = 1) {
  return {
    id,
    prompt,
    axis,
    scale: 'likert',
    section,
    weight,
    lowPole,
    highPole,
    riasecLow,
    riasecHigh,
    options: LIKERT_OPTIONS,
  };
}

const ENJOYMENT_QUESTIONS = [
  buildLikertQuestion('q1', 'How much do you enjoy building or assembling things with your hands (furniture, models, machinery, electronics, etc.)?', 'SN', 'N', 'S', ['A', 'I'], ['R', 'C'], 'enjoyment', 1.15),
  buildLikertQuestion('q2', 'How much do you enjoy researching, analyzing data, or investigating complex questions to figure out how things work?', 'SN', 'S', 'N', ['R', 'C'], ['I', 'C'], 'enjoyment', 1.15),
  buildLikertQuestion('q3', 'How much do you enjoy creating art, music, writing, photography, design, or any form of artistic expression?', 'SN', 'S', 'N', ['C', 'R'], ['A', 'I'], 'enjoyment', 1.15),
  buildLikertQuestion('q4', 'How much do you enjoy helping, teaching, counseling, or supporting other people through their problems or growth?', 'TF', 'T', 'F', ['I', 'C'], ['S', 'E'], 'enjoyment', 1.15),
  buildLikertQuestion('q5', 'How much do you enjoy leading a group, motivating others, starting new projects, or being in charge?', 'EI', 'I', 'E', ['I', 'C'], ['E', 'S'], 'enjoyment', 1.15),
  buildLikertQuestion('q6', 'How much do you enjoy organizing information, creating schedules, managing details, or keeping systems running smoothly?', 'JP', 'P', 'J', ['A', 'E'], ['C', 'E'], 'enjoyment', 1.15),
  buildLikertQuestion('q7', 'How much do you enjoy physical outdoor activities (hiking, sports, gardening, working with nature or animals)?', 'EI', 'I', 'E', ['I', 'C'], ['R', 'E'], 'enjoyment', 1.15),
  buildLikertQuestion('q8', 'How much do you enjoy quiet, focused indoor work where you can concentrate deeply without interruptions?', 'EI', 'E', 'I', ['E', 'S'], ['I', 'C'], 'enjoyment', 1.15),
  buildLikertQuestion('q9', 'How much do you enjoy brainstorming and collaborating with a team of people?', 'EI', 'I', 'E', ['I', 'C'], ['E', 'A'], 'enjoyment', 1.15),
  buildLikertQuestion('q10', 'How much do you enjoy working completely alone on a project you control from start to finish?', 'EI', 'E', 'I', ['E', 'S'], ['I', 'R'], 'enjoyment', 1.15),
  buildLikertQuestion('q11', 'How much do you enjoy exploring big ideas, theories, philosophies, or future possibilities?', 'SN', 'S', 'N', ['R', 'C'], ['I', 'A'], 'enjoyment', 1.15),
  buildLikertQuestion('q12', 'How much do you enjoy practical, real-world tasks that produce immediate, tangible results?', 'SN', 'N', 'S', ['A', 'I'], ['R', 'C'], 'enjoyment', 1.15),
  buildLikertQuestion('q13', 'How much do you enjoy making decisions based on logic, facts, and objective analysis?', 'TF', 'F', 'T', ['S', 'E'], ['I', 'C'], 'enjoyment', 1.15),
  buildLikertQuestion('q14', 'How much do you enjoy making decisions that focus on people’s feelings, values, and keeping harmony?', 'TF', 'T', 'F', ['I', 'C'], ['S', 'E'], 'enjoyment', 1.15),
  buildLikertQuestion('q15', 'How much do you enjoy having a clear, structured routine and knowing exactly what to expect each day?', 'JP', 'P', 'J', ['A', 'E'], ['C', 'E'], 'enjoyment', 1.15),
  buildLikertQuestion('q16', 'How much do you enjoy flexibility, last-minute changes, and spontaneous adventures?', 'JP', 'J', 'P', ['C', 'E'], ['E', 'A'], 'enjoyment', 1.15),
  buildLikertQuestion('q17', 'How much do you enjoy public speaking, presenting ideas, or performing in front of others?', 'EI', 'I', 'E', ['I', 'C'], ['E', 'A'], 'enjoyment', 1.15),
  buildLikertQuestion('q18', 'How much do you enjoy working behind the scenes where no one is watching or praising you?', 'EI', 'E', 'I', ['E', 'A'], ['I', 'C'], 'enjoyment', 1.15),
  buildLikertQuestion('q19', 'How much do you enjoy learning about and experimenting with new technology, gadgets, or tools?', 'SN', 'S', 'N', ['C', 'S'], ['I', 'R'], 'enjoyment', 1.15),
  buildLikertQuestion('q20', 'How much do you enjoy cooking, baking, or creatively experimenting with food and recipes?', 'SN', 'N', 'S', ['I', 'C'], ['A', 'R'], 'enjoyment', 1.15),
  buildLikertQuestion('q21', 'How much do you enjoy designing spaces, interiors, websites, graphics, or visual layouts?', 'SN', 'S', 'N', ['C', 'R'], ['A', 'I'], 'enjoyment', 1.15),
  buildLikertQuestion('q22', 'How much do you enjoy working with numbers, budgets, statistics, or financial planning?', 'TF', 'F', 'T', ['A', 'S'], ['C', 'I'], 'enjoyment', 1.15),
  buildLikertQuestion('q23', 'How much do you enjoy conducting experiments, lab work, or scientific exploration?', 'SN', 'S', 'N', ['R', 'C'], ['I', 'A'], 'enjoyment', 1.15),
  buildLikertQuestion('q24', 'How much do you enjoy inventing stories, poems, characters, or imaginary worlds?', 'SN', 'S', 'N', ['C', 'R'], ['A', 'I'], 'enjoyment', 1.15),
  buildLikertQuestion('q25', 'How much do you enjoy mentoring, coaching, or guiding others to reach their full potential?', 'TF', 'T', 'F', ['I', 'C'], ['S', 'E'], 'enjoyment', 1.15),
  buildLikertQuestion('q26', 'How much do you enjoy negotiating, selling ideas/products, or persuading people to take action?', 'EI', 'I', 'E', ['I', 'C'], ['E', 'S'], 'enjoyment', 1.15),
  buildLikertQuestion('q27', 'How much do you enjoy maintaining accurate records, following established rules, or handling repetitive but important tasks?', 'JP', 'P', 'J', ['A', 'E'], ['C', 'E'], 'enjoyment', 1.15),
  buildLikertQuestion('q28', 'How much do you enjoy traveling to new places, experiencing different cultures, or seeking new adventures?', 'JP', 'J', 'P', ['C', 'I'], ['E', 'A'], 'enjoyment', 1.15),
  buildLikertQuestion('q29', 'How much do you enjoy solving mechanical or technical problems (fixing cars, building apps, troubleshooting systems)?', 'SN', 'N', 'S', ['A', 'S'], ['R', 'I'], 'enjoyment', 1.15),
  buildLikertQuestion('q30', 'How much do you enjoy quiet, reflective activities like reading, journaling, meditating, or thinking deeply about life?', 'EI', 'E', 'I', ['E', 'S'], ['I', 'A'], 'enjoyment', 1.15),
];

const INTROSPECTION_QUESTIONS = [
  buildLikertQuestion('i1', 'After a week of intense work, being around people restores your energy more than spending time alone.', 'EI', 'I', 'E', ['I', 'C'], ['E', 'S'], 'introspection', 1),
  buildLikertQuestion('i2', 'When walking into a room full of strangers, you naturally introduce yourself instead of observing quietly first.', 'EI', 'I', 'E', ['I', 'C'], ['E', 'S'], 'introspection', 1),
  buildLikertQuestion('i3', 'You feel most alive when teaching or guiding others rather than mastering skills alone.', 'EI', 'I', 'E', ['I', 'R'], ['S', 'E'], 'introspection', 1),
  buildLikertQuestion('i4', 'When you have a breakthrough idea, you talk it out quickly rather than processing it internally first.', 'EI', 'I', 'E', ['I', 'A'], ['E', 'A'], 'introspection', 1),
  buildLikertQuestion('i5', 'In teams, you naturally drive conversation instead of listening quietly before speaking.', 'EI', 'I', 'E', ['I', 'C'], ['E', 'S'], 'introspection', 1),
  buildLikertQuestion('i6', 'When learning something new, you prefer step-by-step instructions over high-level theory.', 'SN', 'N', 'S', ['I', 'A'], ['R', 'C'], 'introspection', 1),
  buildLikertQuestion('i7', 'You are more satisfied fixing tangible objects than solving abstract conceptual puzzles.', 'SN', 'N', 'S', ['I', 'A'], ['R', 'C'], 'introspection', 1),
  buildLikertQuestion('i8', 'You trust proven methods more than intuitive hunches about future possibilities.', 'SN', 'N', 'S', ['A', 'I'], ['C', 'R'], 'introspection', 1),
  buildLikertQuestion('i9', 'When describing a scene, you focus more on specific details than symbolic meaning and patterns.', 'SN', 'N', 'S', ['A', 'I'], ['C', 'R'], 'introspection', 1),
  buildLikertQuestion('i10', 'You prefer work with immediate visible results over work that builds long-term visions.', 'SN', 'N', 'S', ['A', 'I'], ['R', 'C'], 'introspection', 1),
  buildLikertQuestion('i11', 'When making decisions, logical efficiency matters more to you than emotional alignment.', 'TF', 'F', 'T', ['S', 'E'], ['I', 'C'], 'introspection', 1),
  buildLikertQuestion('i12', 'When a friend shares a problem, your first instinct is to offer practical solutions rather than emotional validation.', 'TF', 'F', 'T', ['S', 'E'], ['I', 'C'], 'introspection', 1),
  buildLikertQuestion('i13', 'You believe hard truth is usually better than softening reality to avoid discomfort.', 'TF', 'F', 'T', ['S', 'E'], ['I', 'C'], 'introspection', 1),
  buildLikertQuestion('i14', 'In conflicts, being factually right is more important to you than preserving harmony.', 'TF', 'F', 'T', ['S', 'E'], ['I', 'C'], 'introspection', 1),
  buildLikertQuestion('i15', 'When evaluating careers, challenge and measurable payoff matter more than meaning and service.', 'TF', 'F', 'T', ['S', 'E'], ['I', 'C'], 'introspection', 1),
  buildLikertQuestion('i16', 'You feel most relaxed when plans are set well in advance rather than open-ended.', 'JP', 'P', 'J', ['E', 'A'], ['C', 'E'], 'introspection', 1),
  buildLikertQuestion('i17', 'You prefer finishing projects early over working close to the deadline.', 'JP', 'P', 'J', ['E', 'A'], ['C', 'E'], 'introspection', 1),
  buildLikertQuestion('i18', 'Your workspace is naturally organized rather than comfortably cluttered.', 'JP', 'P', 'J', ['A', 'E'], ['C', 'E'], 'introspection', 1),
  buildLikertQuestion('i19', 'You tend to make decisions quickly instead of continuing to gather more information.', 'JP', 'P', 'J', ['I', 'A'], ['E', 'C'], 'introspection', 1),
  buildLikertQuestion('i20', 'You see rules as useful structure rather than unnecessary limitations.', 'JP', 'P', 'J', ['A', 'E'], ['C', 'E'], 'introspection', 1),
  buildLikertQuestion('i21', 'You can stay engaged for hours in repetitive system-building tasks that others find draining.', 'JP', 'P', 'J', ['A', 'E'], ['C', 'R'], 'introspection', 1),
  buildLikertQuestion('i22', 'People consistently praise your reliability and process discipline as one of your easiest strengths.', 'JP', 'P', 'J', ['A', 'I'], ['C', 'E'], 'introspection', 1),
  buildLikertQuestion('i23', 'If failure were impossible, you would focus on solving systemic world problems at scale.', 'SN', 'S', 'N', ['C', 'R'], ['I', 'E'], 'introspection', 1),
  buildLikertQuestion('i24', 'You are strongly moved by social suffering and feel compelled to respond personally.', 'TF', 'T', 'F', ['I', 'C'], ['S', 'E'], 'introspection', 1),
  buildLikertQuestion('i25', 'In flow state, you are most often helping people rather than analyzing systems.', 'TF', 'T', 'F', ['I', 'C'], ['S', 'E'], 'introspection', 1),
  buildLikertQuestion('i26', 'You could speak for 30 minutes without preparation on one focused practical domain you know deeply.', 'SN', 'N', 'S', ['A', 'I'], ['R', 'C'], 'introspection', 1),
  buildLikertQuestion('i27', 'You are most fulfilled as a vision leader more than a craft specialist or relationship healer.', 'EI', 'I', 'E', ['I', 'R'], ['E', 'S'], 'introspection', 1),
  buildLikertQuestion('i28', 'You often trust deep intuition before external evidence fully appears.', 'SN', 'S', 'N', ['C', 'R'], ['A', 'I'], 'introspection', 1),
  buildLikertQuestion('i29', 'You think often about leaving a legacy through systems, institutions, or enduring work.', 'JP', 'P', 'J', ['A', 'E'], ['C', 'E'], 'introspection', 1),
  buildLikertQuestion('i30', 'You are strongly motivated to align your life with a clear personal calling or purpose.', 'TF', 'T', 'F', ['I', 'C'], ['S', 'E'], 'introspection', 1),
];

const DEFAULT_QUESTIONS = [...ENJOYMENT_QUESTIONS, ...INTROSPECTION_QUESTIONS];

const TYPE_TO_RECOMMENDATIONS = {
  ISTJ: {
    domains: ['mechanical-repair', 'electrical', 'civil-security'],
    careers: ['Maintenance Technician', 'Electrical Systems Operator', 'Logistics Coordinator'],
  },
  ISFJ: {
    domains: ['healthcare', 'community-support', 'farming'],
    careers: ['Healthcare Assistant', 'Community Safety Officer', 'Food Preservation Technician'],
  },
  INFJ: {
    domains: ['healthcare', 'education', 'systems-planning'],
    careers: ['Clinical Counselor', 'Training Architect', 'Resilience Planner'],
  },
  INTJ: {
    domains: ['software-it', 'engineering', 'infrastructure-strategy'],
    careers: ['Systems Engineer', 'Cybersecurity Planner', 'Research Coordinator'],
  },
  ISTP: {
    domains: ['mechanical-repair', 'security-defense', 'electrical'],
    careers: ['Field Repair Specialist', 'Emergency Response Technician', 'Power Systems Technician'],
  },
  ISFP: {
    domains: ['healthcare', 'craft-production', 'farming'],
    careers: ['Medical Support Worker', 'Artisan Fabricator', 'Sustainable Farming Specialist'],
  },
  INFP: {
    domains: ['education', 'care-services', 'community-operations'],
    careers: ['Education Mentor', 'Family Services Coordinator', 'Ethical Supply Steward'],
  },
  INTP: {
    domains: ['software-it', 'science-research', 'engineering'],
    careers: ['Software Architect', 'Applied Research Analyst', 'Automation Designer'],
  },
  ESTP: {
    domains: ['security-defense', 'field-operations', 'mechanical-repair'],
    careers: ['Incident Response Lead', 'Operations Specialist', 'Rapid Repair Operator'],
  },
  ESFP: {
    domains: ['healthcare', 'hospitality-logistics', 'community-services'],
    careers: ['Public Health Outreach Worker', 'Supply Distribution Lead', 'Team Wellbeing Coordinator'],
  },
  ENFP: {
    domains: ['education', 'innovation-hubs', 'community-development'],
    careers: ['Career Transition Coach', 'Community Builder', 'Learning Program Designer'],
  },
  ENTP: {
    domains: ['software-it', 'entrepreneurship', 'engineering'],
    careers: ['Product Innovator', 'Systems Prototyper', 'Technology Venture Builder'],
  },
  ESTJ: {
    domains: ['security-defense', 'construction', 'infrastructure-operations'],
    careers: ['Operations Commander', 'Construction Supervisor', 'Utility Network Manager'],
  },
  ESFJ: {
    domains: ['healthcare', 'education', 'community-care'],
    careers: ['Nursing Operations Coordinator', 'School Program Manager', 'Care Team Lead'],
  },
  ENFJ: {
    domains: ['education', 'governance', 'healthcare'],
    careers: ['Training Director', 'Civic Program Leader', 'Health Program Coordinator'],
  },
  ENTJ: {
    domains: ['engineering', 'security-defense', 'infrastructure-strategy'],
    careers: ['Infrastructure Director', 'Emergency Systems Strategist', 'Technical Operations Executive'],
  },
};

const RIASEC_TO_OCCUPATIONS = {
  R: {
    domains: ['hands-on-builders', 'outdoor-nature-work', 'infrastructure-operations'],
    careers: [
      'Construction Worker',
      'Carpenter',
      'Welder',
      'Mechanic',
      'Electrician',
      'HVAC Technician',
      'Farmer',
      'Water Treatment Operator',
      'Bridge and Tunnel Maintainer',
      'Road Repair Crew Lead',
    ],
  },
  I: {
    domains: ['research-investigation', 'science-and-strategy', 'technology-analysis'],
    careers: [
      'Data Analyst',
      'Forensic Analyst',
      'Research Scientist',
      'Lab Technician',
      'Intelligence Analyst',
      'Historian',
      'Cybersecurity Analyst',
      'AI Researcher',
      'Quality Control Tester',
      'Patent Examiner',
    ],
  },
  A: {
    domains: ['art-and-design', 'media-storytelling', 'culture-expression'],
    careers: [
      'Writer',
      'Musician',
      'Photographer',
      'Graphic Designer',
      'Game Designer',
      'Chef',
      'Interior Designer',
      'Set Designer',
      'Florist',
      'Film and Media Producer',
    ],
  },
  S: {
    domains: ['helpers-healers-teachers', 'community-care', 'human-development'],
    careers: [
      'Teacher',
      'Counselor',
      'Nurse',
      'Social Worker',
      'Mentor and Coach',
      'Child Care Specialist',
      'Elder Care Specialist',
      'EMT and Paramedic',
      'Crisis Hotline Operator',
      'Community Outreach Coordinator',
    ],
  },
  E: {
    domains: ['leadership-and-persuasion', 'governance-and-commerce', 'public-mobilization'],
    careers: [
      'Entrepreneur',
      'Operations Manager',
      'Sales Leader',
      'Marketing Strategist',
      'Public Relations Specialist',
      'Policy and Civic Program Lead',
      'Community Organizer',
      'Union Representative',
      'Business Development Manager',
      'Project Launch Director',
    ],
  },
  C: {
    domains: ['organizers-system-keepers', 'finance-compliance', 'logistics-records'],
    careers: [
      'Accountant',
      'Bookkeeper',
      'Auditor',
      'Logistics Coordinator',
      'Supply Chain Planner',
      'Compliance Officer',
      'Records Administrator',
      'Inventory Control Specialist',
      'Court Clerk',
      'Operations Scheduler',
    ],
  },
};

const RIASEC_ROLE_BUCKETS = {
  R: {
    majorRoles: ['Civil Engineer', 'Construction Supervisor', 'Master Electrician', 'Mechanical Systems Lead', 'Infrastructure Operations Manager'],
    supportingRoles: ['Landscaper', 'Maintenance Repair Technician', 'Irrigation Specialist', 'Recycling Plant Operator', 'Road Crew Operator'],
  },
  I: {
    majorRoles: ['Research Scientist', 'Data Science Lead', 'Forensic Investigator', 'Intelligence Analyst', 'Systems Research Architect'],
    supportingRoles: ['Lab Assistant', 'Library Archivist', 'Survey Data Collector', 'Quality Assurance Tester', 'Patent Documentation Reviewer'],
  },
  A: {
    majorRoles: ['Creative Director', 'Product Designer', 'Architect', 'Media Producer', 'Experience Designer'],
    supportingRoles: ['Tattoo Artist', 'Set Designer', 'Costume Maker', 'Bookbinder', 'Independent Craft Producer'],
  },
  S: {
    majorRoles: ['Physician', 'Teacher', 'Therapist', 'Social Program Lead', 'Community Health Coordinator'],
    supportingRoles: ['Hospice Worker', 'Crisis Hotline Operator', 'School Support Staff', 'Care Assistant', 'Volunteer Coordinator'],
  },
  E: {
    majorRoles: ['Entrepreneur', 'Operations Director', 'Policy Leader', 'Sales Executive', 'Public Mobilization Strategist'],
    supportingRoles: ['Shift Supervisor', 'Community Organizer', 'Union Representative', 'PR Coordinator', 'Stakeholder Liaison'],
  },
  C: {
    majorRoles: ['Finance Controller', 'Compliance Director', 'Logistics Manager', 'Program Administrator', 'Supply Chain Planner'],
    supportingRoles: ['Inventory Clerk', 'Records Clerk', 'Mail Distribution Specialist', 'Warehouse Coordinator', 'Scheduling Assistant'],
  },
};

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 4 || questions.length > 64) {
    return 'Questions must be an array containing 4 to 64 items';
  }

  const allowedAxis = new Set(['EI', 'SN', 'TF', 'JP']);
  const ids = new Set();

  for (const question of questions) {
    const id = String(question?.id || '').trim();
    if (!id) return 'Each question must include a non-empty id';
    if (ids.has(id)) return `Duplicate question id: ${id}`;
    ids.add(id);

    const prompt = String(question?.prompt || '').trim();
    if (!prompt) return `Question ${id} is missing prompt`;

    const axis = String(question?.axis || '').trim();
    if (!allowedAxis.has(axis)) return `Question ${id} has invalid axis ${axis}`;

    const options = Array.isArray(question?.options) ? question.options : [];
    if (options.length < 2) return `Question ${id} must have at least two options`;

    const poles = new Set(axis.split(''));
    const isLikert = question.scale === 'likert';
    if (isLikert) {
      const lowPole = String(question?.lowPole || '').trim();
      const highPole = String(question?.highPole || '').trim();
      if (!poles.has(lowPole) || !poles.has(highPole)) {
        return `Question ${id} must define lowPole/highPole inside axis ${axis}`;
      }
      if (lowPole === highPole) {
        return `Question ${id} lowPole and highPole must be different`;
      }

      const seenValues = new Set();
      for (const option of options) {
        const key = String(option?.key || '').trim();
        const text = String(option?.text || '').trim();
        const value = Number(option?.value);
        if (!key || !text || !Number.isFinite(value)) {
          return `Question ${id} likert options must include key/text/value`;
        }
        if (value < 1 || value > 5) {
          return `Question ${id} likert option value must be between 1 and 5`;
        }
        if (seenValues.has(value)) {
          return `Question ${id} has duplicate likert option value ${value}`;
        }
        seenValues.add(value);
      }

      const riasecLow = Array.isArray(question.riasecLow) ? question.riasecLow : [];
      const riasecHigh = Array.isArray(question.riasecHigh) ? question.riasecHigh : [];
      for (const code of [...riasecLow, ...riasecHigh]) {
        if (!RIASEC_CODES.has(String(code || '').trim())) {
          return `Question ${id} has invalid RIASEC code ${code}`;
        }
      }
    } else {
      for (const option of options) {
        const key = String(option?.key || '').trim();
        const text = String(option?.text || '').trim();
        const pole = String(option?.pole || '').trim();
        if (!key || !text || !pole) {
          return `Question ${id} has an option missing key/text/pole`;
        }
        if (!poles.has(pole)) {
          return `Question ${id} option ${key} has invalid pole ${pole}`;
        }
      }
    }
  }

  return null;
}

async function getActiveQuizDefinition() {
  const active = await CareerQuizDefinition.findOne({ isActive: true })
    .sort({ updatedAt: -1, _id: -1 })
    .lean();

  if (active) {
    return {
      version: active.version || QUIZ_VERSION,
      title: active.title || QUIZ_TITLE,
      intro: active.intro || QUIZ_INTRO,
      questions: Array.isArray(active.questions) && active.questions.length
        ? active.questions
        : DEFAULT_QUESTIONS,
    };
  }

  return {
    version: QUIZ_VERSION,
    title: QUIZ_TITLE,
    intro: QUIZ_INTRO,
    questions: DEFAULT_QUESTIONS,
  };
}

function deriveType(axisScores) {
  const first = axisScores.E >= axisScores.I ? 'E' : 'I';
  const second = axisScores.S >= axisScores.N ? 'S' : 'N';
  const third = axisScores.T >= axisScores.F ? 'T' : 'F';
  const fourth = axisScores.J >= axisScores.P ? 'J' : 'P';
  return `${first}${second}${third}${fourth}`;
}

function buildTopRiasecCodes(riasecScores, count = 3) {
  return Object.entries(riasecScores)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([code]) => code);
}

function mergeUnique(items, nextItems, limit) {
  const output = [...items];
  for (const item of nextItems || []) {
    if (!item || output.includes(item)) continue;
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}

function buildRoleBuckets(topRiasec, limit = 10) {
  let majorRoles = [];
  let supportingRoles = [];
  for (const code of topRiasec || []) {
    const bucket = RIASEC_ROLE_BUCKETS[code];
    if (!bucket) continue;
    majorRoles = mergeUnique(majorRoles, bucket.majorRoles, limit);
    supportingRoles = mergeUnique(supportingRoles, bucket.supportingRoles, limit);
  }

  return {
    majorRoles,
    supportingRoles,
  };
}

function getQuestionSection(question) {
  const section = String(question?.section || '').trim();
  if (section === 'introspection') return 'introspection';
  return 'enjoyment';
}

function getQuestionWeight(question) {
  const weight = Number(question?.weight);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}

function buildConfidence(axisScores, answeredCount, totalQuestions, sectionScores, totalSignal, totalMaxSignal) {
  const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
  const axisClarity = pairs.reduce((sum, [left, right]) => {
    const leftScore = Number(axisScores[left] || 0);
    const rightScore = Number(axisScores[right] || 0);
    const total = leftScore + rightScore;
    if (!total) return sum;
    return sum + (Math.abs(leftScore - rightScore) / total);
  }, 0) / pairs.length;

  const completion = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
  const signalStrength = totalMaxSignal > 0 ? totalSignal / totalMaxSignal : 0;
  const weighted = (completion * 0.35) + (signalStrength * 0.35) + (axisClarity * 0.30);
  const score = Math.round(weighted * 100);
  const band = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'emerging';

  const sectionBreakdown = Object.entries(sectionScores || {}).reduce((acc, [section, data]) => {
    const answered = Number(data?.answered || 0);
    const total = Number(data?.total || 0);
    const completionRatio = total > 0 ? answered / total : 0;
    const signalRatio = data?.maxSignal > 0 ? (data.signal / data.maxSignal) : 0;
    
    // Per-section confidence score (similar to overall score)
    const sectionWeighted = (completionRatio * 0.35) + (signalRatio * 0.35) + (axisClarity * 0.30);
    const sectionScore = Math.round(sectionWeighted * 100);
    const sectionBand = sectionScore >= 75 ? 'high' : sectionScore >= 50 ? 'medium' : 'emerging';
    
    acc[section] = {
      answered,
      total,
      completion: Math.round(completionRatio * 100),
      signalStrength: Math.round(signalRatio * 100),
      score: sectionScore,
      band: sectionBand,
    };
    return acc;
  }, {});

  return {
    score,
    band,
    completion: Math.round(completion * 100),
    signalStrength: Math.round(signalStrength * 100),
    axisClarity: Math.round(axisClarity * 100),
    sectionBreakdown,
  };
}

function buildRoleRationale(majorRoles, supportingRoles, topRiasec, riasecScores) {
  const RIASEC_DESCRIPTORS = {
    R: 'hands-on technical and mechanical work',
    I: 'research, analysis, and investigation',
    A: 'creative expression and artistic design',
    S: 'helping, teaching, and supporting people',
    E: 'leadership, persuasion, and public engagement',
    C: 'organizing systems, compliance, and administration',
  };

  const buildExplanation = (role, codes) => {
    if (!codes || codes.length === 0) return `${role} matches your career profile.`;
    
    const topCodes = codes.slice(0, 2);
    const descriptors = topCodes.map(code => RIASEC_DESCRIPTORS[code] || code).join(' and ');
    return `${role} recommended because you show strong affinity for ${descriptors}.`;
  };

  const rationale = [];
  
  for (const role of majorRoles || []) {
    const matchedCodes = topRiasec.filter(code => {
      const bucket = RIASEC_ROLE_BUCKETS[code] || {};
      return (bucket.majorRoles || []).includes(role);
    });
    
    if (matchedCodes.length > 0) {
      rationale.push({
        role,
        category: 'major',
        matchedCodes,
        explanation: buildExplanation(role, matchedCodes),
      });
    }
  }

  for (const role of supportingRoles || []) {
    const matchedCodes = topRiasec.filter(code => {
      const bucket = RIASEC_ROLE_BUCKETS[code] || {};
      return (bucket.supportingRoles || []).includes(role);
    });
    
    if (matchedCodes.length > 0) {
      rationale.push({
        role,
        category: 'supporting',
        matchedCodes,
        explanation: buildExplanation(role, matchedCodes),
      });
    }
  }

  return rationale;
}

function buildRecommendations(personalityType, riasecScores) {
  const base = TYPE_TO_RECOMMENDATIONS[personalityType] || {
    domains: ['general-operations', 'community-support', 'technical-foundations'],
    careers: ['Operations Generalist', 'Community Support Specialist', 'Technical Apprentice'],
  };

  const topRiasec = buildTopRiasecCodes(riasecScores, 3);
  let domains = [...base.domains];
  let careers = [...base.careers];
  for (const code of topRiasec) {
    const mapped = RIASEC_TO_OCCUPATIONS[code];
    if (!mapped) continue;
    domains = mergeUnique(domains, mapped.domains, 10);
    careers = mergeUnique(careers, mapped.careers, 12);
  }

  const roles = buildRoleBuckets(topRiasec, 10);
  const rationale = buildRoleRationale(roles.majorRoles, roles.supportingRoles, topRiasec, riasecScores);

  return {
    topDomains: domains,
    topCareers: careers,
    topInterests: topRiasec,
    majorRoles: roles.majorRoles,
    supportingRoles: roles.supportingRoles,
    roleRationale: rationale,
  };
}

function scoreLikertQuestion(question, option, axisScores, riasecScores) {
  const rawValue = Number(option?.value);
  const value = Number.isFinite(rawValue) ? rawValue : Number(option?.key);
  if (!Number.isFinite(value) || value < 1 || value > 5) return null;

  const lowPole = String(question?.lowPole || '').trim();
  const highPole = String(question?.highPole || '').trim();
  const weight = getQuestionWeight(question);
  const delta = value - 3;

  if (delta > 0) {
    const points = delta * weight;
    axisScores[highPole] += points;
    const codes = Array.isArray(question?.riasecHigh) ? question.riasecHigh : [];
    for (const code of codes) {
      if (riasecScores[code] !== undefined) riasecScores[code] += points;
    }
  } else if (delta < 0) {
    const points = Math.abs(delta) * weight;
    axisScores[lowPole] += points;
    const codes = Array.isArray(question?.riasecLow) ? question.riasecLow : [];
    for (const code of codes) {
      if (riasecScores[code] !== undefined) riasecScores[code] += points;
    }
  }

  return {
    signal: Math.abs(delta) * weight,
    maxSignal: 2 * weight,
  };
}

function defaultOptionForQuestion(question) {
  const options = Array.isArray(question?.options) ? question.options : [];
  if (!options.length) return null;
  if (question?.scale !== 'likert') return options[0];
  return options.find((option) => Number(option.value) === 3) || options[2] || options[0];
}

function scoreQuizAnswers(quiz, answers, options = {}) {
  const fillDefaults = Boolean(options.fillDefaults);
  const qMap = (quiz.questions || []).reduce((acc, question) => {
    acc[question.id] = question;
    return acc;
  }, {});

  const axisScores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const riasecScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const sectionScores = {};
  const normalizedAnswers = [];
  let totalSignal = 0;
  let totalMaxSignal = 0;

  const ensureSection = (question) => {
    const section = getQuestionSection(question);
    if (!sectionScores[section]) {
      sectionScores[section] = { answered: 0, total: 0, signal: 0, maxSignal: 0 };
    }
    return section;
  };

  for (const question of quiz.questions || []) {
    const section = ensureSection(question);
    sectionScores[section].total += 1;
  }

  for (const answer of answers) {
    const question = qMap[String(answer.questionId || '')];
    if (!question) continue;
    const option = question.options.find((opt) => opt.key === answer.optionKey);
    if (!option) continue;
    const section = ensureSection(question);

    if (question.scale === 'likert') {
      const scored = scoreLikertQuestion(question, option, axisScores, riasecScores);
      if (!scored) continue;
      totalSignal += scored.signal;
      totalMaxSignal += scored.maxSignal;
      sectionScores[section].signal += scored.signal;
      sectionScores[section].maxSignal += scored.maxSignal;
    } else {
      const points = getQuestionWeight(question);
      axisScores[option.pole] += points;
      totalSignal += points;
      totalMaxSignal += points;
      sectionScores[section].signal += points;
      sectionScores[section].maxSignal += points;
    }

    sectionScores[section].answered += 1;
    normalizedAnswers.push({ questionId: question.id, optionKey: option.key });
  }

  if (fillDefaults && normalizedAnswers.length === 0) {
    for (const question of quiz.questions || []) {
      const option = defaultOptionForQuestion(question);
      if (!option) continue;
      const section = ensureSection(question);
      if (question.scale === 'likert') {
        const scored = scoreLikertQuestion(question, option, axisScores, riasecScores);
        if (scored) {
          totalSignal += scored.signal;
          totalMaxSignal += scored.maxSignal;
          sectionScores[section].signal += scored.signal;
          sectionScores[section].maxSignal += scored.maxSignal;
        }
      } else {
        const points = getQuestionWeight(question);
        axisScores[option.pole] += points;
        totalSignal += points;
        totalMaxSignal += points;
        sectionScores[section].signal += points;
        sectionScores[section].maxSignal += points;
      }
      sectionScores[section].answered += 1;
      normalizedAnswers.push({ questionId: question.id, optionKey: option.key });
    }
  }

  if (!normalizedAnswers.length) {
    return null;
  }

  const personalityType = deriveType(axisScores);
  const recommendation = buildRecommendations(personalityType, riasecScores);
  const confidence = buildConfidence(
    axisScores,
    normalizedAnswers.length,
    Array.isArray(quiz.questions) ? quiz.questions.length : 0,
    sectionScores,
    totalSignal,
    totalMaxSignal,
  );

  return {
    personalityType,
    axisScores,
    riasecScores,
    confidence,
    topInterests: recommendation.topInterests,
    topDomains: recommendation.topDomains,
    topCareers: recommendation.topCareers,
    majorRoles: recommendation.majorRoles,
    supportingRoles: recommendation.supportingRoles,
    roleRationale: recommendation.roleRationale,
    answers: normalizedAnswers,
  };
}

function buildPreviewAnswers(questions, strategy) {
  const normalizedStrategy = ['first-option', 'alternating', 'reverse'].includes(strategy)
    ? strategy
    : 'first-option';

  const output = [];
  for (const question of questions || []) {
    const options = Array.isArray(question?.options) ? question.options : [];
    if (!options.length) continue;

    let selected = options[0];
    if (normalizedStrategy === 'reverse') {
      selected = options[options.length - 1];
    } else if (normalizedStrategy === 'alternating') {
      const code = String(question.id || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      selected = options[code % options.length];
    }

    output.push({
      questionId: question.id,
      optionKey: selected.key,
    });
  }

  return output;
}

router.get('/definition', async (_req, res) => {
  const quiz = await getActiveQuizDefinition();
  return res.json({
    ok: true,
    quiz,
  });
});

router.post('/submit', async (req, res) => {
  try {
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (!answers.length) {
      return res.status(400).json({ ok: false, error: 'No answers provided' });
    }

    const quiz = await getActiveQuizDefinition();
    const scored = scoreQuizAnswers(quiz, answers);
    if (!scored) {
      return res.status(400).json({ ok: false, error: 'No valid answers found' });
    }

    const result = new CareerQuizResult({
      quizVersion: quiz.version || QUIZ_VERSION,
      personalityType: scored.personalityType,
      axisScores: scored.axisScores,
      riasecScores: scored.riasecScores,
      topInterests: scored.topInterests,
      confidence: scored.confidence,
      topDomains: scored.topDomains,
      topCareers: scored.topCareers,
      majorRoles: scored.majorRoles,
      supportingRoles: scored.supportingRoles,
      roleRationale: scored.roleRationale,
      answers: scored.answers,
    });
    await result.save();

    return res.status(201).json({
      ok: true,
      result: {
        id: result._id,
        personalityType: scored.personalityType,
        axisScores: scored.axisScores,
        riasecScores: scored.riasecScores,
        confidence: scored.confidence,
        topInterests: scored.topInterests,
        topDomains: scored.topDomains,
        topCareers: scored.topCareers,
        majorRoles: scored.majorRoles,
        supportingRoles: scored.supportingRoles,
        roleRationale: scored.roleRationale,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/admin/preview', adminSession, async (req, res) => {
  try {
    const draftQuestions = Array.isArray(req.body?.questions) ? req.body.questions : null;
    let quiz = await getActiveQuizDefinition();

    if (draftQuestions) {
      const questionError = validateQuestions(draftQuestions);
      if (questionError) {
        return res.status(400).json({ ok: false, error: questionError });
      }
      quiz = {
        ...quiz,
        questions: draftQuestions,
      };
    }

    const strategy = String(req.body?.strategy || 'first-option').trim();
    const providedAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const answers = providedAnswers.length ? providedAnswers : buildPreviewAnswers(quiz.questions, strategy);
    const scored = scoreQuizAnswers(quiz, answers, { fillDefaults: true });

    if (!scored) {
      return res.status(400).json({ ok: false, error: 'Unable to compute preview score' });
    }

    return res.json({
      ok: true,
      preview: {
        personalityType: scored.personalityType,
        axisScores: scored.axisScores,
        riasecScores: scored.riasecScores,
        confidence: scored.confidence,
        topInterests: scored.topInterests,
        topDomains: scored.topDomains,
        topCareers: scored.topCareers,
        majorRoles: scored.majorRoles,
        supportingRoles: scored.supportingRoles,
        roleRationale: scored.roleRationale,
        answerCount: scored.answers.length,
        strategy: providedAnswers.length ? 'custom' : strategy,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/admin/definition', adminSession, async (_req, res) => {
  try {
    const quiz = await getActiveQuizDefinition();
    return res.json({ ok: true, quiz });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/admin/definition', adminSession, async (req, res) => {
  try {
    const title = String(req.body?.title || QUIZ_TITLE).trim();
    const intro = String(req.body?.intro || QUIZ_INTRO).trim();
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

    if (!title) return res.status(400).json({ ok: false, error: 'Title is required' });
    if (!intro) return res.status(400).json({ ok: false, error: 'Intro is required' });

    const questionError = validateQuestions(questions);
    if (questionError) {
      return res.status(400).json({ ok: false, error: questionError });
    }

    const latest = await CareerQuizDefinition.findOne({ isActive: true }).sort({ version: -1, _id: -1 }).lean();
    const nextVersion = (latest?.version || QUIZ_VERSION) + 1;

    await CareerQuizDefinition.updateMany({ isActive: true }, { $set: { isActive: false } });
    const definition = new CareerQuizDefinition({
      version: nextVersion,
      title,
      intro,
      questions,
      isActive: true,
      updatedBy: req.admin?.username || req.admin?.email || 'admin',
    });
    await definition.save();

    return res.json({
      ok: true,
      quiz: {
        version: definition.version,
        title: definition.title,
        intro: definition.intro,
        questions: definition.questions,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/admin/definition/reset', adminSession, async (req, res) => {
  try {
    const latest = await CareerQuizDefinition.findOne({}).sort({ version: -1, _id: -1 }).lean();
    const nextVersion = (latest?.version || QUIZ_VERSION) + 1;
    await CareerQuizDefinition.updateMany({ isActive: true }, { $set: { isActive: false } });
    const definition = new CareerQuizDefinition({
      version: nextVersion,
      title: QUIZ_TITLE,
      intro: QUIZ_INTRO,
      questions: DEFAULT_QUESTIONS,
      isActive: true,
      updatedBy: req.admin?.username || req.admin?.email || 'admin',
    });
    await definition.save();
    return res.json({
      ok: true,
      quiz: {
        version: definition.version,
        title: definition.title,
        intro: definition.intro,
        questions: definition.questions,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/stats', adminSession, async (_req, res) => {
  try {
    const [summary] = await CareerQuizResult.aggregate([
      {
        $facet: {
          totals: [{ $count: 'count' }],
          byType: [
            { $group: { _id: '$personalityType', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 8 },
          ],
          recent: [
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 1,
                personalityType: 1,
                topDomains: 1,
                topCareers: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ]);

    return res.json({
      ok: true,
      totalSubmissions: summary?.totals?.[0]?.count || 0,
      topPersonalityTypes: summary?.byType || [],
      recentResults: summary?.recent || [],
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;