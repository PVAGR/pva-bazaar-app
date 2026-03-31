const express = require('express');
const router = express.Router();
const CareerQuizResult = require('../models/CareerQuizResult');
const CareerQuizDefinition = require('../models/CareerQuizDefinition');
const adminSession = require('../middleware/adminSession');

const QUIZ_VERSION = 1;
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

function questionMap() {
  return DEFAULT_QUESTIONS.reduce((acc, question) => {
    acc[question.id] = question;
    return acc;
  }, {});
}

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

function scoreQuizAnswers(quiz, answers, options = {}) {
  const fillDefaults = Boolean(options.fillDefaults);
  const qMap = (quiz.questions || []).reduce((acc, question) => {
    acc[question.id] = question;
    return acc;
  }, {});

  const axisScores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const normalizedAnswers = [];

  for (const answer of answers) {
    const question = qMap[String(answer.questionId || '')];
    if (!question) continue;
    const option = question.options.find((opt) => opt.key === answer.optionKey);
    if (!option) continue;
    axisScores[option.pole] += 1;
    normalizedAnswers.push({ questionId: question.id, optionKey: option.key });
  }

  if (fillDefaults && normalizedAnswers.length === 0) {
    for (const question of quiz.questions || []) {
      const option = Array.isArray(question.options) && question.options.length ? question.options[0] : null;
      if (!option) continue;
      axisScores[option.pole] += 1;
      normalizedAnswers.push({ questionId: question.id, optionKey: option.key });
    }
  }

  if (!normalizedAnswers.length) {
    return null;
  }

  const personalityType = deriveType(axisScores);
  const recommendation = TYPE_TO_RECOMMENDATIONS[personalityType] || {
    domains: ['general-operations', 'community-support', 'technical-foundations'],
    careers: ['Operations Generalist', 'Community Support Specialist', 'Technical Apprentice'],
  };

  return {
    personalityType,
    axisScores,
    topDomains: recommendation.domains,
    topCareers: recommendation.careers,
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
      topDomains: scored.topDomains,
      topCareers: scored.topCareers,
      answers: scored.answers,
    });
    await result.save();

    return res.status(201).json({
      ok: true,
      result: {
        id: result._id,
        personalityType: scored.personalityType,
        axisScores: scored.axisScores,
        topDomains: scored.topDomains,
        topCareers: scored.topCareers,
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
        topDomains: scored.topDomains,
        topCareers: scored.topCareers,
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