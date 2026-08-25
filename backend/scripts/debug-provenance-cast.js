const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'x';
  await mongoose.connect(process.env.MONGODB_URI);

  const Artifact = require('../models/Artifact');
  const { buildProvenanceRecord } = require('../service/provenanceService');
  const { lookupReverseImageSignals, shouldBlockOnReverseImage, buildReverseImageSnapshot } = require('../service/reverseImageLookupService');

  async function attempt(label, mutate) {
    const artifactData = {
      name: 'T-' + label,
      title: 'T-' + label,
      description: 'D',
      price: 1,
      category: 'C',
      imageUrls: [],
      materials: [],
      artisan: 'A',
      creator: new mongoose.Types.ObjectId(),
      status: 'draft',
      tags: ['new'],
      physicalSerial: 'PVA-' + label,
      slug: 't-' + label,
    };
    artifactData.provenance = buildProvenanceRecord({
      title: 'T', name: 'T', description: 'D', price: 1, category: 'C',
      materials: [], imageUrls: [], artisan: 'A', creator: 'x', network: 'base',
    });
    if (mutate) await mutate(artifactData);
    const doc = new Artifact(artifactData);
    try {
      await doc.save();
      console.log(`${label}: SAVED OK`);
      return true;
    } catch (err) {
      console.log(`${label}: FAILED - ${err.message.slice(0, 200)}`);
      return false;
    }
  }

  await attempt('base', null);

  await attempt('with-reverse-image', async (d) => {
    const reverseImage = await lookupReverseImageSignals({ imageUrls: [], title: d.title, category: d.category });
    d.provenance = { ...(d.provenance || {}), reverseImage: buildReverseImageSnapshot(reverseImage) };
  });

  await attempt('with-consignment-syndication', async (d) => {
    d.consignment = { artisanShare: 55, pvaFee: 30, promoterShare: 15, agreed: false };
    d.syndication = {
      requestedChannels: [],
      jobs: [],
      lastDispatchAt: undefined,
    };
  });

  // Full mirror
  let ok = true;
  ok = await attempt('full-mirror', async (d) => {
    const reverseImage = await lookupReverseImageSignals({ imageUrls: [], title: d.title, category: d.category });
    d.provenance = { ...(d.provenance || {}), reverseImage: buildReverseImageSnapshot(reverseImage) };
    d.consignment = { artisanShare: 55, pvaFee: 30, promoterShare: 15, agreed: false };
    d.syndication = { requestedChannels: [], jobs: [] };
  });
  console.log('full-mirror ok?', ok);

  await mongoose.disconnect();
  await mongoServer.stop();
})().catch((e) => { console.error(e); process.exit(1); });
