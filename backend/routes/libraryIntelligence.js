const express = require('express');
const router = express.Router();
const adminSession = require('../middleware/adminSession');
const CareerQuizDefinition = require('../models/CareerQuizDefinition');
const LibraryTaxonomy = require('../models/LibraryTaxonomy');

const QUIZ_TITLE = 'Civilization Career Compass';
const QUIZ_INTRO =
  'Answer each question honestly. You will receive a personality type and practical career tracks needed for society to survive and thrive.';

const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    prompt: 'When solving a new problem, what energizes you more?',
    axis: 'EI',
    options: [
      { key: 'A', text: 'Working with people and discussing ideas', pole: 'E' },
      { key: 'B', text: 'Working alone and building a deep plan', pole: 'I' },
    ],
  },
  {
    id: 'q2',
    prompt: 'How do you prefer to learn a trade?',
    axis: 'SN',
    options: [
      { key: 'A', text: 'Hands-on steps and proven instructions', pole: 'S' },
      { key: 'B', text: 'Big concepts and future possibilities', pole: 'N' },
    ],
  },
  {
    id: 'q3',
    prompt: 'In a hard decision, what matters more first?',
    axis: 'TF',
    options: [
      { key: 'A', text: 'Objective logic and measurable outcomes', pole: 'T' },
      { key: 'B', text: 'Human impact and values', pole: 'F' },
    ],
  },
  {
    id: 'q4',
    prompt: 'How do you work best under pressure?',
    axis: 'JP',
    options: [
      { key: 'A', text: 'Structured checklists and deadlines', pole: 'J' },
      { key: 'B', text: 'Flexible adaptation and improvisation', pole: 'P' },
    ],
  },
  {
    id: 'q5',
    prompt: 'In a team, what role feels natural?',
    axis: 'EI',
    options: [
      { key: 'A', text: 'Coordinator and communicator', pole: 'E' },
      { key: 'B', text: 'Specialist and deep builder', pole: 'I' },
    ],
  },
  {
    id: 'q6',
    prompt: 'Which kind of work gives you momentum?',
    axis: 'SN',
    options: [
      { key: 'A', text: 'Reliable systems and physical infrastructure', pole: 'S' },
      { key: 'B', text: 'Innovation, research, and invention', pole: 'N' },
    ],
  },
  {
    id: 'q7',
    prompt: 'When leading others, your instinct is to...',
    axis: 'TF',
    options: [
      { key: 'A', text: 'Set clear standards and evaluate results', pole: 'T' },
      { key: 'B', text: 'Mentor people and strengthen morale', pole: 'F' },
    ],
  },
  {
    id: 'q8',
    prompt: 'How do you approach long projects?',
    axis: 'JP',
    options: [
      { key: 'A', text: 'Plan milestones early and follow sequence', pole: 'J' },
      { key: 'B', text: 'Explore options and pivot when needed', pole: 'P' },
    ],
  },
];

const DEFAULT_TAXONOMY = {
  key: 'civilization-core',
  categories: [
    'agriculture',
    'carpentry',
    'construction',
    'electrical',
    'healthcare',
    'mechanical-repair',
    'plumbing',
    'security-defense',
    'software-it',
  ],
  domains: [
    'community-support',
    'civil-security',
    'emergency-response',
    'food-systems',
    'infrastructure-operations',
    'science-research',
    'technical-foundations',
  ],
  roles: ['apprentice', 'operator', 'specialist', 'coordinator', 'trainer', 'manager'],
  domainRoles: {
    'community-support': ['apprentice', 'operator', 'coordinator'],
    'civil-security': ['operator', 'specialist', 'manager'],
    'emergency-response': ['operator', 'specialist', 'coordinator'],
    'food-systems': ['apprentice', 'operator', 'trainer'],
    'infrastructure-operations': ['operator', 'specialist', 'manager'],
    'science-research': ['apprentice', 'specialist', 'trainer'],
    'technical-foundations': ['apprentice', 'operator', 'specialist'],
  },
};

function sanitizeList(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ).sort();
}

function sanitizeDomainRoles(domainRoles, domains, roles) {
  const roleSet = new Set(roles);
  const domainSet = new Set(domains);
  const output = {};
  const unknownDomains = [];
  const unknownRoles = [];

  if (domainRoles && typeof domainRoles === 'object' && !Array.isArray(domainRoles)) {
    for (const [rawDomain, rawRoles] of Object.entries(domainRoles)) {
      const domain = String(rawDomain || '').trim().toLowerCase();
      if (!domain || !domainSet.has(domain)) {
        if (domain) unknownDomains.push(domain);
        continue;
      }

      const listedRoles = sanitizeList(rawRoles);
      const invalidForDomain = listedRoles.filter((role) => !roleSet.has(role));
      if (invalidForDomain.length) {
        unknownRoles.push({ domain, roles: invalidForDomain });
      }

      const cleaned = listedRoles.filter((role) => roleSet.has(role));
      if (cleaned.length) {
        output[domain] = cleaned;
      }
    }
  }

  const fallbackRoles = roles.slice(0, Math.max(1, Math.min(3, roles.length)));
  for (const domain of domains) {
    if (!Array.isArray(output[domain]) || output[domain].length === 0) {
      output[domain] = fallbackRoles;
    }
  }

  return {
    map: output,
    unknownDomains: Array.from(new Set(unknownDomains)).sort(),
    unknownRoles,
  };
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 4 || questions.length > 64) {
    return 'Questions must be an array containing 4 to 64 items';
  }

  const allowedAxis = new Set(['EI', 'SN', 'TF', 'JP']);
  const riasecCodes = new Set(['R', 'I', 'A', 'S', 'E', 'C']);
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
      if (!poles.has(lowPole) || !poles.has(highPole) || lowPole === highPole) {
        return `Question ${id} must define valid lowPole/highPole values`;
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

      const riasecLow = Array.isArray(question?.riasecLow) ? question.riasecLow : [];
      const riasecHigh = Array.isArray(question?.riasecHigh) ? question.riasecHigh : [];
      for (const code of [...riasecLow, ...riasecHigh]) {
        if (!riasecCodes.has(String(code || '').trim())) {
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
      version: active.version || 1,
      title: active.title || QUIZ_TITLE,
      intro: active.intro || QUIZ_INTRO,
      questions: Array.isArray(active.questions) && active.questions.length ? active.questions : DEFAULT_QUESTIONS,
    };
  }

  return {
    version: 1,
    title: QUIZ_TITLE,
    intro: QUIZ_INTRO,
    questions: DEFAULT_QUESTIONS,
  };
}

async function getOrCreateTaxonomy() {
  let doc = await LibraryTaxonomy.findOne({ key: DEFAULT_TAXONOMY.key }).lean();
  if (!doc) {
    doc = await LibraryTaxonomy.create(DEFAULT_TAXONOMY);
    doc = doc.toObject();
  }
  return doc;
}

router.get('/snapshot', adminSession, async (_req, res) => {
  try {
    const [quiz, taxonomy] = await Promise.all([getActiveQuizDefinition(), getOrCreateTaxonomy()]);
    return res.json({
      ok: true,
      snapshot: {
        version: 1,
        exportedAt: new Date().toISOString(),
        quiz: {
          title: quiz.title,
          intro: quiz.intro,
          questions: quiz.questions,
        },
        taxonomy: {
          categories: taxonomy.categories || [],
          domains: taxonomy.domains || [],
          roles: taxonomy.roles || [],
          domainRoles: taxonomy.domainRoles || {},
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/snapshot/import', adminSession, async (req, res) => {
  try {
    const snapshot = req.body?.snapshot;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ ok: false, error: 'snapshot payload is required' });
    }

    const quiz = snapshot.quiz || {};
    const taxonomy = snapshot.taxonomy || {};

    const title = String(quiz.title || '').trim();
    const intro = String(quiz.intro || '').trim();
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

    if (!title) return res.status(400).json({ ok: false, error: 'Snapshot quiz title is required' });
    if (!intro) return res.status(400).json({ ok: false, error: 'Snapshot quiz intro is required' });

    const questionError = validateQuestions(questions);
    if (questionError) {
      return res.status(400).json({ ok: false, error: questionError });
    }

    const categories = sanitizeList(taxonomy.categories);
    const domains = sanitizeList(taxonomy.domains);
    const roles = sanitizeList(taxonomy.roles);

    if (!categories.length || !domains.length || !roles.length) {
      return res.status(400).json({
        ok: false,
        error: 'Snapshot taxonomy categories, domains, and roles must be non-empty arrays',
      });
    }

    const domainRolesResult = sanitizeDomainRoles(taxonomy.domainRoles, domains, roles);
    if (domainRolesResult.unknownDomains.length || domainRolesResult.unknownRoles.length) {
      return res.status(400).json({
        ok: false,
        error: 'Snapshot domainRoles contains unknown domains or roles',
        details: {
          unknownDomains: domainRolesResult.unknownDomains,
          unknownRoles: domainRolesResult.unknownRoles,
        },
      });
    }

    const updatedBy = req.admin?.username || req.admin?.email || 'admin';

    await LibraryTaxonomy.findOneAndUpdate(
      { key: DEFAULT_TAXONOMY.key },
      {
        $set: {
          key: DEFAULT_TAXONOMY.key,
          categories,
          domains,
          roles,
          domainRoles: domainRolesResult.map,
          updatedBy,
        },
      },
      { new: true, upsert: true },
    );

    const latest = await CareerQuizDefinition.findOne({}).sort({ version: -1, _id: -1 }).lean();
    const nextVersion = (latest?.version || 1) + 1;
    await CareerQuizDefinition.updateMany({ isActive: true }, { $set: { isActive: false } });
    await CareerQuizDefinition.create({
      version: nextVersion,
      title,
      intro,
      questions,
      isActive: true,
      updatedBy,
    });

    return res.json({
      ok: true,
      message: 'Snapshot imported and activated',
      imported: {
        quizVersion: nextVersion,
        questionCount: questions.length,
        domainCount: domains.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
