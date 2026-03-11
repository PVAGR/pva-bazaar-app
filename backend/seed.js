// Backend seed script: creates admin user and sample artifacts if DB is empty
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Artifact = require('./models/Artifact');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar';
  await mongoose.connect(uri, { dbName: 'pvabazaar', autoIndex: true });

  let admin = await User.findOne({ email: 'admin@pvabazaar.org' });
  if (!admin) {
    admin = new User({ name: 'PVA Admin', email: 'admin@pvabazaar.org', password: 'admin123' });
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
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Seed error:', e?.message || e);
  process.exitCode = 1;
});
