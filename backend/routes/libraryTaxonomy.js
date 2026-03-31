const express = require('express');
const router = express.Router();
const LibraryTaxonomy = require('../models/LibraryTaxonomy');
const adminSession = require('../middleware/adminSession');

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
  roles: [
    'apprentice',
    'operator',
    'specialist',
    'coordinator',
    'trainer',
    'manager',
  ],
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

async function getOrCreateTaxonomy() {
  let doc = await LibraryTaxonomy.findOne({ key: DEFAULT_TAXONOMY.key }).lean();
  if (!doc) {
    doc = await LibraryTaxonomy.create(DEFAULT_TAXONOMY);
    doc = doc.toObject();
  } else if (!doc.domainRoles || typeof doc.domainRoles !== 'object') {
    const patched = sanitizeDomainRoles(
      doc.domainRoles,
      doc.domains || DEFAULT_TAXONOMY.domains,
      doc.roles || DEFAULT_TAXONOMY.roles,
    );
    const patchedDomainRoles = patched.map;
    await LibraryTaxonomy.updateOne({ _id: doc._id }, { $set: { domainRoles: patchedDomainRoles } });
    doc.domainRoles = patchedDomainRoles;
  }
  return doc;
}

router.get('/', async (_req, res) => {
  try {
    const doc = await getOrCreateTaxonomy();
    return res.json({ ok: true, taxonomy: doc });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/', adminSession, async (req, res) => {
  try {
    const categories = sanitizeList(req.body?.categories);
    const domains = sanitizeList(req.body?.domains);
    const roles = sanitizeList(req.body?.roles);
    const domainRolesResult = sanitizeDomainRoles(req.body?.domainRoles, domains, roles);
    const domainRoles = domainRolesResult.map;

    if (!categories.length || !domains.length || !roles.length) {
      return res.status(400).json({
        ok: false,
        error: 'Categories, domains, and roles must all contain at least one value',
      });
    }

    if (domainRolesResult.unknownDomains.length || domainRolesResult.unknownRoles.length) {
      return res.status(400).json({
        ok: false,
        error: 'Domain role mapping contains unknown domains or roles',
        details: {
          unknownDomains: domainRolesResult.unknownDomains,
          unknownRoles: domainRolesResult.unknownRoles,
        },
      });
    }

    const updated = await LibraryTaxonomy.findOneAndUpdate(
      { key: DEFAULT_TAXONOMY.key },
      {
        $set: {
          categories,
          domains,
          roles,
          domainRoles,
          updatedBy: req.admin?.username || req.admin?.email || 'admin',
        },
      },
      { new: true, upsert: true },
    ).lean();

    return res.json({ ok: true, taxonomy: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/reset', adminSession, async (_req, res) => {
  try {
    const updated = await LibraryTaxonomy.findOneAndUpdate(
      { key: DEFAULT_TAXONOMY.key },
      { $set: DEFAULT_TAXONOMY },
      { new: true, upsert: true },
    ).lean();
    return res.json({ ok: true, taxonomy: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;