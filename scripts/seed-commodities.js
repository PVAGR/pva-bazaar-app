#!/usr/bin/env node
/**
 * Seed broker commodities (Richard's core products).
 * Run: node scripts/seed-commodities.js
 * Requires: MongoDB connection, admin user (admin@pvabazaar.org)
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../backend/models/User');
const Commodity = require('../backend/models/Commodity');

const COMMODITIES = [
  {
    name: 'Kenyan Coffee',
    category: 'Beverages',
    notes: 'Premium Arabica from Kenya. Direct farm/trader relationships. FOB Mombasa.',
    marketData: {
      fobRange: '$3–5/kg green',
      sampleCostMax: 50,
      certificationsNeeded: 'Phytosanitary, CoO',
      exportDocs: 'B/L to US buyer, phytosanitary cert',
    },
    redFlags: ['No phytosanitary cert', 'Won\'t name consignee', 'Sample >$100'],
    greenFlags: ['Direct exporter', 'FOB pricing', 'Free/low-cost sample'],
  },
  {
    name: 'Congolese Malachite',
    category: 'Minerals',
    notes: 'DRC malachite. Art-grade carvings, precisely weighed. Potential for art/coin concept.',
    marketData: {
      fobRange: 'Varies by piece',
      sampleCostMax: null,
      certificationsNeeded: 'Export permit',
      exportDocs: 'Export license, invoice',
    },
    redFlags: ['No export docs', 'Conflict zone sourcing'],
    greenFlags: ['Traceable origin', 'Weighed pieces'],
  },
  {
    name: 'Kenyan Soapstone',
    category: 'Crafts',
    notes: 'Hand-carved soapstone from Kenya. Wrestling figurines, traditional designs.',
    marketData: {
      fobRange: '$2–15/piece',
      sampleCostMax: 30,
      certificationsNeeded: 'None typical',
      exportDocs: 'Invoice, packing list',
    },
    redFlags: ['Mass-produced look', 'No artisan verification'],
    greenFlags: ['Hand-carved', 'Direct from artisan cooperatives'],
  },
  {
    name: 'Afghan/Pakistani Gemstones',
    category: 'Gemstones',
    notes: 'Colored gemstones from Pakistan, Afghanistan. Lapis, tourmaline, etc. 50–100$ cost, 280$+ retail with silver setting.',
    marketData: {
      fobRange: '$50–150/kg depending on stone',
      sampleCostMax: 75,
      certificationsNeeded: 'None typical',
      exportDocs: 'Invoice, gem cert if high value',
    },
    redFlags: ['Untreated disclosure missing', 'No provenance'],
    greenFlags: ['Direct cutter/source', 'Fair 50/50 split potential'],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: 'admin@pvabazaar.org' });
  if (!user) {
    console.error('Admin user (admin@pvabazaar.org) not found. Run seed.js first.');
    process.exit(1);
  }

  let created = 0;
  for (const c of COMMODITIES) {
    const existing = await Commodity.findOne({ ownerId: user._id, name: c.name });
    if (existing) {
      console.log(`Skip (exists): ${c.name}`);
      continue;
    }
    await Commodity.create({
      ownerId: user._id,
      ...c,
    });
    console.log(`Created: ${c.name}`);
    created++;
  }

  console.log(`\nDone. Created ${created} commodities.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
