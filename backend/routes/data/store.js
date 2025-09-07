// backend/data/store.js

// simple in-memory store (no database yet)
const ARTIFACTS = {
  'maradjet-001': {
    id: 'maradjet-001',
    name: 'Maradjet Emerald Pendant',
    description:
      'A handcrafted emerald pendant featuring a natural Panjshir emerald set in 18k yellow gold.',
    imageUrl:
      'https://i2.seadn.io/base/0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5/ab0864492d648de4434dd73c10970a/04ab0864492d648de4434dd73c10970a.jpeg?w=1000',
    physicalSerial: 'PVA-0001',
    materials: ['Panjshir Emerald', '18k Gold'],
    artisan: 'PVA Artisan',
    blockchainDetails: {
      network: 'base',
      contractAddress: '0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5',
      tokenId: '0',
      tokenStandard: 'ERC-721',
    },
    fractionalization: {
      enabled: true,
      totalShares: 5000,
      sharePrice: 1,
      soldShares: 0,
      majorityThreshold: 2600,
    },
  },
};

// optional helpers (not required by your route, but useful)
function getAllArtifacts() {
  return Object.values(ARTIFACTS);
}
function getArtifactById(id) {
  return ARTIFACTS[id] || null;
}
function setShares(id, newSoldShares) {
  const it = ARTIFACTS[id];
  if (!it) return null;
  it.fractionalization.soldShares = newSoldShares;
  return it;
}

module.exports = {
  ARTIFACTS,
  getAllArtifacts,
  getArtifactById,
  setShares,
};
