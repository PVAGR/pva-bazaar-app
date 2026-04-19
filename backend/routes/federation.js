const express = require('express');
const FederationPresence = require('../models/FederationPresence');
const FederationGameState = require('../models/FederationGameState');
const FederationWorldEvent = require('../models/FederationWorldEvent');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const INTRO_QUIZ = {
  id: 'federation-intro-v1',
  title: 'Federation Orientation Quiz',
  intro:
    'This short orientation helps suggest where you can contribute best across the federation. It combines your answers, current role intent, and job profile.',
  questions: [
    {
      id: 'f1',
      prompt: 'Which mission feels most natural to you?',
      options: [
        { key: 'A', text: 'Build systems and infrastructure', role: 'Infrastructure Builder', weight: 3 },
        { key: 'B', text: 'Coordinate people and operations', role: 'Operations Coordinator', weight: 3 },
        { key: 'C', text: 'Teach, mentor, and guide communities', role: 'Community Mentor', weight: 3 },
      ],
    },
    {
      id: 'f2',
      prompt: 'How do you usually solve difficult problems?',
      options: [
        { key: 'A', text: 'Data first, then decisions', role: 'Research Strategist', weight: 2 },
        { key: 'B', text: 'Talk with people and align quickly', role: 'Diplomatic Facilitator', weight: 2 },
        { key: 'C', text: 'Prototype and test in the field', role: 'Field Innovator', weight: 2 },
      ],
    },
    {
      id: 'f3',
      prompt: 'What pace suits you best?',
      options: [
        { key: 'A', text: 'Long-term planning and architecture', role: 'Systems Planner', weight: 2 },
        { key: 'B', text: 'Daily momentum and execution', role: 'Operations Coordinator', weight: 2 },
        { key: 'C', text: 'Rapid response and adaptation', role: 'Emergency Response Lead', weight: 2 },
      ],
    },
    {
      id: 'f4',
      prompt: 'Which outcome would make you proud?',
      options: [
        { key: 'A', text: 'A stable platform people depend on', role: 'Infrastructure Builder', weight: 3 },
        { key: 'B', text: 'A thriving, coordinated community', role: 'Civic Organizer', weight: 3 },
        { key: 'C', text: 'A learning path that changes lives', role: 'Community Mentor', weight: 3 },
      ],
    },
    {
      id: 'f5',
      prompt: 'Where would you like to contribute first?',
      options: [
        { key: 'A', text: 'Technology, logistics, or supply systems', role: 'Infrastructure Builder', weight: 2 },
        { key: 'B', text: 'Governance, mediation, or partnerships', role: 'Diplomatic Facilitator', weight: 2 },
        { key: 'C', text: 'Education, culture, and public wellbeing', role: 'Community Mentor', weight: 2 },
      ],
    },
  ],
};

function cleanText(value, maxLen = 120) {
  return String(value || '').trim().slice(0, maxLen);
}

function normalizeCountryCode(value = '') {
  const cleaned = String(value || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleaned)) return cleaned;
  return '';
}

function chooseCountryFromUser(user) {
  const complianceCountry = String(user?.onboardingProfile?.compliance?.country || '').trim();
  const prefCountry = String(user?.preferences?.defaultCountry || '').trim();
  const passportLocation = String(user?.location || '').trim();
  return complianceCountry || prefCountry || passportLocation || '';
}

function scoreIntroQuiz(answers = []) {
  const scoreByRole = new Map();
  const answered = [];

  for (const item of answers) {
    const questionId = String(item?.questionId || '').trim();
    const optionKey = String(item?.optionKey || '').trim().toUpperCase();
    const question = INTRO_QUIZ.questions.find((q) => q.id === questionId);
    if (!question) continue;

    const option = question.options.find((o) => String(o.key || '').toUpperCase() === optionKey);
    if (!option) continue;

    const current = scoreByRole.get(option.role) || 0;
    scoreByRole.set(option.role, current + Number(option.weight || 1));
    answered.push({ questionId, optionKey, role: option.role });
  }

  const ranked = Array.from(scoreByRole.entries())
    .map(([role, score]) => ({ role, score }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0] || { role: 'Federation Contributor', score: 0 };

  return {
    recommendedRole: top.role,
    score: top.score,
    rankedRoles: ranked,
    answered,
  };
}

function defaultGameState() {
  return {
    commanderName: 'Citizen Commander',
    faction: 'PVA Collective',
    cycle: 0,
    energy: 120,
    food: 95,
    materials: 80,
    population: 14,
    outposts: 1,
    keepers: 0,
    research: 0,
  };
}

function sanitizeGameProfile(input = {}) {
  const commanderName = cleanText(input.commanderName, 80) || 'Citizen Commander';
  const faction = cleanText(input.faction, 80) || 'PVA Collective';
  return { commanderName, faction };
}

function applyPassiveGameTick(state, context = {}) {
  const activeCitizens = Number(context.activeCitizens || 0);
  const countriesOnline = Number(context.countriesOnline || 0);
  const energyGain = 4 + Number(state.outposts || 0) * 2 + Math.floor(activeCitizens / 20);
  const foodGain = 3 + Math.floor(countriesOnline / 4);
  const materialsGain = 2 + Math.floor(Number(state.keepers || 0) / 2);
  const foodConsumption = Math.floor(Number(state.population || 1) / 8);
  const populationShift = Number(state.food || 0) > Number(state.population || 0) ? 1 : 0;

  return {
    cycle: Number(state.cycle || 0) + 1,
    energy: Math.max(0, Number(state.energy || 0) + energyGain),
    food: Math.max(0, Number(state.food || 0) + foodGain - foodConsumption),
    materials: Math.max(0, Number(state.materials || 0) + materialsGain),
    population: Math.max(1, Number(state.population || 1) + populationShift),
  };
}

function applyGameAction(state, actionType) {
  const next = {
    cycle: Number(state.cycle || 0),
    energy: Number(state.energy || 0),
    food: Number(state.food || 0),
    materials: Number(state.materials || 0),
    population: Number(state.population || 1),
    outposts: Number(state.outposts || 0),
    keepers: Number(state.keepers || 0),
    research: Number(state.research || 0),
  };

  if (actionType === 'build_outpost') {
    if (next.energy < 25 || next.materials < 30 || next.food < 12) {
      return { ok: false, message: 'Insufficient resources for outpost build.' };
    }
    next.energy -= 25;
    next.materials -= 30;
    next.food -= 12;
    next.population += 2;
    next.outposts += 1;
    return {
      ok: true,
      next,
      event: {
        title: 'Outpost Established',
        details: 'A new federation outpost has been deployed.',
        delta: { energy: -25, materials: -30, food: -12, population: 2, outposts: 1 },
      },
    };
  }

  if (actionType === 'train_keeper') {
    if (next.food < 14 || next.materials < 10) {
      return { ok: false, message: 'Insufficient resources for keeper training.' };
    }
    next.food -= 14;
    next.materials -= 10;
    next.keepers += 1;
    return {
      ok: true,
      next,
      event: {
        title: 'Keeper Trained',
        details: 'A keeper has joined logistics and protection operations.',
        delta: { food: -14, materials: -10, keepers: 1 },
      },
    };
  }

  if (actionType === 'run_research') {
    if (next.energy < 30 || next.materials < 15) {
      return { ok: false, message: 'Insufficient resources for research.' };
    }
    next.energy -= 30;
    next.materials -= 15;
    next.research += 8;
    return {
      ok: true,
      next,
      event: {
        title: 'Research Complete',
        details: 'Federation labs completed a strategic research cycle.',
        delta: { energy: -30, materials: -15, research: 8 },
      },
    };
  }

  return { ok: false, message: 'Unsupported action type.' };
}

async function getActivePresenceContext(windowMinutes = 90) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const rows = await FederationPresence.find({ lastSeenAt: { $gte: since } }).select('countryCode country').lean();
  const uniqueCountries = new Set(
    rows.map((row) => String(row.countryCode || row.country || 'UNKNOWN').toUpperCase()),
  );
  return { activeCitizens: rows.length, countriesOnline: uniqueCountries.size };
}

async function ensureGameState(user) {
  const base = defaultGameState();
  const profile = sanitizeGameProfile({
    commanderName: user?.name,
    faction: user?.onboardingProfile?.appRole || user?.citizenRole || 'PVA Collective',
  });

  const state = await FederationGameState.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { ...base, ...profile, userId: user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return state;
}

async function upsertPresenceForUser(user, patch = {}) {
  const baselineCountry = chooseCountryFromUser(user);
  const country = cleanText(patch.country !== undefined ? patch.country : baselineCountry, 120);
  const countryCode = normalizeCountryCode(
    patch.countryCode || user?.preferences?.defaultCountryCode || '',
  );

  const payload = {
    name: cleanText(user?.name, 120),
    societalId: cleanText(user?.societalId, 80),
    passportStatus: cleanText(user?.passportStatus, 40) || 'unverified',
    citizenRole: cleanText(user?.citizenRole, 60) || 'citizen',
    country,
    countryCode,
    jobTitle: cleanText(
      patch.jobTitle !== undefined
        ? patch.jobTitle
        : user?.onboardingProfile?.roleOther || user?.onboardingProfile?.appRole || '',
      120,
    ),
    introRecommendedRole: cleanText(patch.introRecommendedRole, 120),
    introScore: Number.isFinite(Number(patch.introScore)) ? Number(patch.introScore) : 0,
    careerTopRoles: Array.isArray(patch.careerTopRoles)
      ? patch.careerTopRoles.map((v) => cleanText(v, 120)).filter(Boolean).slice(0, 8)
      : [],
    careerTopDomains: Array.isArray(patch.careerTopDomains)
      ? patch.careerTopDomains.map((v) => cleanText(v, 120)).filter(Boolean).slice(0, 8)
      : [],
    lastSource: ['manual', 'ip-lookup', 'passport', 'system'].includes(String(patch.lastSource || 'manual'))
      ? String(patch.lastSource || 'manual')
      : 'manual',
    lastSeenAt: new Date(),
    metadata: patch.metadata || null,
  };

  const doc = await FederationPresence.findOneAndUpdate(
    { userId: user._id },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return doc;
}

router.get('/intro-quiz/definition', (_req, res) => {
  return res.json({ ok: true, quiz: INTRO_QUIZ });
});

router.post('/intro-quiz/submit', authenticateToken, async (req, res) => {
  try {
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (!answers.length) {
      return res.status(400).json({ ok: false, message: 'No answers provided' });
    }

    const scoring = scoreIntroQuiz(answers);
    const user = await User.findById(req.user.id).select(
      '_id name societalId passportStatus citizenRole location onboardingProfile preferences',
    );

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await upsertPresenceForUser(user, {
      introRecommendedRole: scoring.recommendedRole,
      introScore: scoring.score,
      lastSource: 'manual',
      metadata: {
        introQuiz: {
          id: INTRO_QUIZ.id,
          answered: scoring.answered,
          rankedRoles: scoring.rankedRoles,
        },
      },
    });

    return res.json({
      ok: true,
      result: {
        recommendedRole: scoring.recommendedRole,
        score: scoring.score,
        rankedRoles: scoring.rankedRoles,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const item = await FederationPresence.findOne({ userId: req.user.id }).lean();
    return res.json({ ok: true, item: item || null });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      '_id name societalId passportStatus citizenRole location onboardingProfile preferences',
    );

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const country = cleanText(req.body?.country, 120);
    const countryCode = normalizeCountryCode(req.body?.countryCode);
    const source = String(req.body?.source || 'manual');

    if (!country) {
      return res.status(400).json({ ok: false, message: 'country is required' });
    }

    const item = await upsertPresenceForUser(user, {
      country,
      countryCode,
      jobTitle: req.body?.jobTitle,
      introRecommendedRole: req.body?.introRecommendedRole,
      introScore: req.body?.introScore,
      careerTopRoles: req.body?.careerTopRoles,
      careerTopDomains: req.body?.careerTopDomains,
      lastSource: source,
      metadata: req.body?.metadata || null,
    });

    // Keep default country in user preferences aligned with latest check-in.
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'preferences.defaultCountry': country,
        updatedAt: new Date(),
      },
    });

    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/live', async (req, res) => {
  try {
    const minutes = Math.max(5, Math.min(Number(req.query.minutes) || 60, 1440));
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const rows = await FederationPresence.find({ lastSeenAt: { $gte: since } })
      .sort({ lastSeenAt: -1 })
      .limit(1200)
      .lean();

    const byCountryMap = new Map();
    for (const row of rows) {
      const key = String(row.countryCode || row.country || 'UNKNOWN').toUpperCase();
      const label = String(row.country || row.countryCode || 'Unknown');
      const entry = byCountryMap.get(key) || {
        countryCode: key,
        country: label,
        activeCount: 0,
        roles: {},
      };
      entry.activeCount += 1;
      const role = String(row.introRecommendedRole || row.citizenRole || row.jobTitle || 'Citizen');
      entry.roles[role] = (entry.roles[role] || 0) + 1;
      byCountryMap.set(key, entry);
    }

    const byCountry = Array.from(byCountryMap.values())
      .map((entry) => ({
        ...entry,
        topRoles: Object.entries(entry.roles)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([role, count]) => ({ role, count })),
      }))
      .sort((a, b) => b.activeCount - a.activeCount)
      .slice(0, 300);

    const participants = rows.slice(0, 250).map((row) => ({
      id: String(row.userId),
      name: row.name || 'Citizen',
      societalId: row.societalId || '',
      passportStatus: row.passportStatus || 'unverified',
      citizenRole: row.citizenRole || 'citizen',
      country: row.country || row.countryCode || 'Unknown',
      countryCode: row.countryCode || '',
      jobTitle: row.jobTitle || '',
      recommendedRole: row.introRecommendedRole || '',
      lastSeenAt: row.lastSeenAt,
    }));

    return res.json({
      ok: true,
      windowMinutes: minutes,
      totals: {
        activeCitizens: rows.length,
        countries: byCountry.length,
      },
      byCountry,
      participants,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/game/state', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('_id name onboardingProfile citizenRole');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const state = await ensureGameState(user);
    return res.json({ ok: true, state });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.put('/game/state', authenticateToken, async (req, res) => {
  try {
    const patch = sanitizeGameProfile(req.body || {});
    const state = await FederationGameState.findOneAndUpdate(
      { userId: req.user.id },
      { $set: patch, $setOnInsert: { ...defaultGameState(), userId: req.user.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json({ ok: true, state });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/game/actions', authenticateToken, async (req, res) => {
  try {
    const actionType = String(req.body?.actionType || '').trim();
    if (!actionType) {
      return res.status(400).json({ ok: false, message: 'actionType is required' });
    }

    const user = await User.findById(req.user.id).select('_id name onboardingProfile citizenRole');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const state = await ensureGameState(user);
    const context = await getActivePresenceContext(90);
    const passive = applyPassiveGameTick(state, context);

    const workingState = {
      ...state.toObject(),
      ...passive,
      outposts: Number(state.outposts || 0),
      keepers: Number(state.keepers || 0),
      research: Number(state.research || 0),
    };

    const result = applyGameAction(workingState, actionType);
    if (!result.ok) {
      return res.status(400).json({ ok: false, message: result.message });
    }

    const next = result.next;
    const updated = await FederationGameState.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          cycle: next.cycle,
          energy: next.energy,
          food: next.food,
          materials: next.materials,
          population: next.population,
          outposts: next.outposts,
          keepers: next.keepers,
          research: next.research,
          lastActionAt: new Date(),
        },
      },
      { new: true },
    );

    await FederationWorldEvent.create({
      userId: req.user.id,
      commanderName: cleanText(updated?.commanderName || user?.name || 'Citizen Commander', 80),
      eventType: actionType,
      title: result.event.title,
      details: result.event.details,
      delta: result.event.delta,
    });

    return res.json({ ok: true, state: updated, notice: result.event.title });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/game/world', async (_req, res) => {
  try {
    const [recentEvents, topStates, livePresence] = await Promise.all([
      FederationWorldEvent.find({}).sort({ createdAt: -1 }).limit(40).lean(),
      FederationGameState.find({})
        .sort({ outposts: -1, research: -1, population: -1, updatedAt: -1 })
        .limit(20)
        .select('commanderName faction outposts keepers research population updatedAt')
        .lean(),
      FederationPresence.find({ lastSeenAt: { $gte: new Date(Date.now() - 90 * 60 * 1000) } })
        .select('country countryCode introRecommendedRole')
        .lean(),
    ]);

    const sectorMap = new Map();
    for (const row of livePresence) {
      const key = String(row.countryCode || row.country || 'UNKNOWN').toUpperCase();
      const item = sectorMap.get(key) || {
        sector: key,
        label: String(row.country || row.countryCode || 'Unknown'),
        activeCitizens: 0,
        controlRole: 'Citizen',
        roleCount: {},
      };
      item.activeCitizens += 1;
      const role = String(row.introRecommendedRole || 'Citizen');
      item.roleCount[role] = (item.roleCount[role] || 0) + 1;
      sectorMap.set(key, item);
    }

    const sectors = Array.from(sectorMap.values())
      .map((entry) => {
        const controlRole = Object.entries(entry.roleCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Citizen';
        return {
          sector: entry.sector,
          label: entry.label,
          activeCitizens: entry.activeCitizens,
          controlRole,
        };
      })
      .sort((a, b) => b.activeCitizens - a.activeCitizens)
      .slice(0, 20);

    return res.json({
      ok: true,
      world: {
        leaderboard: topStates,
        events: recentEvents.map((event) => ({
          id: String(event._id),
          commanderName: event.commanderName,
          eventType: event.eventType,
          title: event.title,
          details: event.details,
          delta: event.delta,
          createdAt: event.createdAt,
        })),
        sectors,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
