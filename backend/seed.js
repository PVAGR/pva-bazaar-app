// Backend seed script: creates admin user and sample artifacts if DB is empty
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Artifact = require('./models/Artifact');
const Proposal = require('./models/Proposal');

function nextSocietalId(index) {
  return `PVA-${String(index).padStart(5, '0')}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required for seeding');
  }
  await mongoose.connect(uri, { dbName: 'pvabazaar', autoIndex: true });

  let admin = await User.findOne({ email: 'admin@pvabazaar.org' });
  if (!admin) {
    admin = new User({ name: 'PVA Admin', email: 'admin@pvabazaar.org', password: 'admin123', role: 'admin' });
    await admin.save();
    console.log('✅ Admin user ensured: admin@pvabazaar.org / admin123');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // Primary app/admin user: login with username richyrichaii + password pva123zxc!
  const richy = await User.findOne({ username: 'richyrichaii' });
  if (!richy) {
    await new User({
      name: 'Richy Rich',
      username: 'richyrichaii',
      email: 'richyrichaii@local',
      password: 'pva123zxc!',
      role: 'admin',
    }).save();
    console.log('✅ User ensured: richyrichaii / pva123zxc!');
  } else {
    if (richy.role !== 'admin') {
      richy.role = 'admin';
      await richy.save();
      console.log('✅ User richyrichaii role upgraded to admin');
    }
    console.log('ℹ️ User richyrichaii already exists');
  }

  // Backfill societal IDs in deterministic sequence for users that are missing one.
  const allUsers = await User.find({}).sort({ createdAt: 1 });
  const usedIds = new Set(
    allUsers
      .map((u) => String(u.societalId || ''))
      .filter((id) => /^PVA-\d{5}$/.test(id)),
  );

  let idCursor = 1;
  let assigned = 0;
  for (const user of allUsers) {
    if (user.societalId) continue;
    while (usedIds.has(nextSocietalId(idCursor))) {
      idCursor += 1;
    }
    const nextId = nextSocietalId(idCursor);
    user.societalId = nextId;
    usedIds.add(nextId);
    idCursor += 1;
    assigned += 1;
    await user.save();
  }
  console.log(`✅ Societal IDs assigned: ${assigned}`);

  // Ensure primary admin account has verified passport + governance token defaults.
  const primaryAdmin = await User.findOne({ username: 'richyrichaii' });
  if (primaryAdmin) {
    primaryAdmin.role = 'admin';
    primaryAdmin.citizenRole = 'admin';
    primaryAdmin.passportStatus = 'verified';
    primaryAdmin.governanceToken = true;
    primaryAdmin.passportIssuedAt = primaryAdmin.passportIssuedAt || new Date();
    primaryAdmin.joinedCivilizationAt = primaryAdmin.joinedCivilizationAt || primaryAdmin.createdAt || new Date();
    primaryAdmin.bazBalance = 100;
    primaryAdmin.pvaReputation = 500;
    if (!primaryAdmin.societalId) {
      while (usedIds.has(nextSocietalId(idCursor))) {
        idCursor += 1;
      }
      primaryAdmin.societalId = nextSocietalId(idCursor);
      usedIds.add(primaryAdmin.societalId);
      idCursor += 1;
    }
    await primaryAdmin.save();
    console.log('✅ Primary admin passport state ensured (verified/admin/governance token)');
  }

  const count = await Artifact.estimatedDocumentCount();
  if (count === 0) {
    const sampleArtifacts = [
      {
        name: 'Maradjet Emerald Pendant',
        title: 'Handcrafted Emerald Pendant',
        description:
          'A stunning emerald pendant featuring natural Panjshir emerald set in 18k gold',
        imageUrls: [
          'https://i2.seadn.io/base/0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5/ab0864492d648de4434dd73c10970a/04ab0864492d648de4434dd73c10970a.jpeg?w=1000',
        ],
        price: 1200,
        category: 'Jewelry',
        materials: ['Panjshir Emerald', '18k Gold'],
        artisan: 'PVA Master Craftsman',
        creator: admin._id,
        physicalSerial: 'PVA-0001',
        fractionalization: {
          enabled: true,
          totalShares: 5000,
          sharePrice: 1,
          soldShares: 0,
          majorityThreshold: 2600,
        },
      },
      {
        name: 'Traditional Afghan Carpet',
        title: 'Hand-woven Afghan Carpet',
        description:
          'Traditional Afghan carpet with intricate geometric patterns, hand-woven by master craftsmen',
        imageUrls: ['https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Afghan+Carpet'],
        price: 2500,
        category: 'Textiles',
        materials: ['Wool', 'Natural Dyes'],
        artisan: 'Herat Weavers Guild',
        creator: admin._id,
        physicalSerial: 'PVA-0002',
        fractionalization: {
          enabled: true,
          totalShares: 10000,
          sharePrice: 0.25,
          soldShares: 0,
          majorityThreshold: 5100,
        },
      },
    ];
    await Artifact.insertMany(sampleArtifacts);
    console.log(`✅ Seeded ${sampleArtifacts.length} artifacts`);
  } else {
    console.log(`ℹ️ Artifacts already present: ${count}`);
  }

  const proposalCount = await Proposal.estimatedDocumentCount();
  if (proposalCount === 0) {
    const endorsementUsers = Array.from({ length: 12 }, () => new mongoose.Types.ObjectId());
    const now = Date.now();

    const proposalSeeds = [
      {
        proposalId: 'PROP-11001',
        title: 'Community Solar Credits for Artisan Workshops',
        category: 'infrastructure',
        problem: 'Many artisan workshops experience unstable electricity costs that reduce output and wages.',
        solution: 'Launch a cooperative solar credit pool for verified workshop clusters and shared battery storage.',
        expectedOutcome: 'Reduce workshop energy costs by 25% within two quarters and stabilize production cycles.',
        estimatedCost: 'USD 42,000 equivalent',
        timeline: '6 months rollout',
        submittedBy: primaryAdmin?._id || admin._id,
        status: 'accepted',
        endorsementThreshold: 10,
        endorsementCount: 11,
        endorsements: endorsementUsers.slice(0, 11).map((citizen, idx) => ({
          citizen,
          endorsedAt: new Date(now - (11 - idx) * 86400000),
        })),
        thresholdReachedAt: new Date(now - 8 * 86400000),
        officialResponse: {
          respondedBy: primaryAdmin?._id || admin._id,
          decision: 'accepted',
          explanation: 'Approved for execution under the energy resilience initiative.',
          respondedAt: new Date(now - 5 * 86400000),
        },
        executionProject: {
          owner: 'Infrastructure Secretariat',
          milestones: ['Vendor selection complete', 'Pilot district installation', 'Usage dashboard launch'],
          budget: 'USD 42,000 equivalent',
          status: 'in_progress',
          updates: [{ text: 'Pilot installation has started in two districts.', postedAt: new Date(now - 2 * 86400000) }],
        },
      },
      {
        proposalId: 'PROP-11002',
        title: 'Emergency Textile Relief Stock for Flood Seasons',
        category: 'emergency',
        problem: 'Flood seasons repeatedly destroy household textile essentials and local trade stock.',
        solution: 'Create a rotating relief stock with community-owned warehousing and monthly replenishment.',
        expectedOutcome: 'Maintain 90-day emergency textile coverage for high-risk districts.',
        estimatedCost: 'USD 18,000 equivalent',
        timeline: '4 months setup',
        submittedBy: primaryAdmin?._id || admin._id,
        status: 'endorsed',
        endorsementThreshold: 10,
        endorsementCount: 10,
        endorsements: endorsementUsers.slice(0, 10).map((citizen, idx) => ({
          citizen,
          endorsedAt: new Date(now - (10 - idx) * 43200000),
        })),
        thresholdReachedAt: new Date(now - 3 * 86400000),
      },
      {
        proposalId: 'PROP-11003',
        title: 'Neighborhood Learning Pods with Weekend Mentors',
        category: 'learning',
        problem: 'Youth in several neighborhoods lack consistent access to mentorship and practical study support.',
        solution: 'Fund neighborhood learning pods staffed by rotating certified mentors and maker instructors.',
        expectedOutcome: 'Increase weekly learning participation by 35% in six months.',
        estimatedCost: 'USD 12,000 equivalent',
        timeline: '3 months launch',
        submittedBy: primaryAdmin?._id || admin._id,
        status: 'open',
        endorsementThreshold: 10,
        endorsementCount: 7,
        endorsements: endorsementUsers.slice(0, 7).map((citizen, idx) => ({
          citizen,
          endorsedAt: new Date(now - (7 - idx) * 86400000),
        })),
      },
      {
        proposalId: 'PROP-11004',
        title: 'Citizen Mediation Desk for Trade Disputes',
        category: 'justice',
        problem: 'Small trade disputes take too long to resolve, hurting trust and transaction velocity.',
        solution: 'Establish a citizen mediation desk with transparent case SLAs and public metrics.',
        expectedOutcome: 'Resolve at least 70% of eligible disputes within 10 business days.',
        estimatedCost: 'USD 9,500 equivalent',
        timeline: '2 months setup',
        submittedBy: primaryAdmin?._id || admin._id,
        status: 'open',
        endorsementThreshold: 10,
        endorsementCount: 2,
        endorsements: endorsementUsers.slice(0, 2).map((citizen, idx) => ({
          citizen,
          endorsedAt: new Date(now - (2 - idx) * 86400000),
        })),
      },
      {
        proposalId: 'PROP-11005',
        title: 'Cultural Preservation Grants for Oral Histories',
        category: 'culture',
        problem: 'Oral histories are being lost because recording and archival resources are limited.',
        solution: 'Create micro-grants for recorders, translators, and archive curators in each district.',
        expectedOutcome: 'Preserve 250 oral history records in the first year.',
        estimatedCost: 'USD 6,000 equivalent',
        timeline: '5 months to first archive release',
        submittedBy: primaryAdmin?._id || admin._id,
        status: 'draft',
        endorsementThreshold: 10,
        endorsementCount: 0,
        endorsements: [],
      },
    ];

    await Proposal.insertMany(proposalSeeds, { ordered: true });
    console.log(`✅ Seeded ${proposalSeeds.length} proposals`);
  } else {
    console.log(`ℹ️ Proposals already present: ${proposalCount}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Seed error:', e?.message || e);
  process.exitCode = 1;
});
