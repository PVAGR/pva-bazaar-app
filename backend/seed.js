const mongoose = require('mongoose');
const Artifact = require('./models/Artifact');
const User = require('./models/user');
require('dotenv').config();

async function seedData() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar';
    await mongoose.connect(uri, { dbName: 'pvabazaar' });
    console.log('Connected to MongoDB for seeding');
    
    await User.deleteMany({});
    const sampleUser = new User({
      name: 'PVA Admin',
      email: 'admin@pvabazaar.org',
      password: 'admin123'
    });
    await sampleUser.save();
    console.log('✅ Sample user created');

    await Artifact.deleteMany({});
    const sampleArtifacts = [
      {
        name: 'Maradjet Emerald Pendant',
        title: 'Handcrafted Emerald Pendant',
        description: 'A stunning emerald pendant featuring natural Panjshir emerald set in 18k gold',
        imageUrl: 'https://i2.seadn.io/base/0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5/ab0864492d648de4434dd73c10970a/04ab0864492d648de4434dd73c10970a.jpeg?w=1000',
        price: 1200,
        category: 'Jewelry',
        materials: ['Panjshir Emerald', '18k Gold'],
        artisan: 'PVA Master Craftsman',
        creator: sampleUser._id,
        physicalSerial: 'PVA-0001',
        fractionalization: { enabled: true, totalShares: 5000, sharePrice: 1, soldShares: 0, majorityThreshold: 2600 }
      },
      {
        name: 'Traditional Afghan Carpet',
        title: 'Hand-woven Afghan Carpet',
        description: 'Traditional Afghan carpet with intricate geometric patterns, hand-woven by master craftsmen',
        imageUrl: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Afghan+Carpet',
        price: 2500,
        category: 'Textiles',
        materials: ['Wool', 'Natural Dyes'],
        artisan: 'Herat Weavers Guild',
        creator: sampleUser._id,
        physicalSerial: 'PVA-0002',
        fractionalization: { enabled: true, totalShares: 10000, sharePrice: 0.25, soldShares: 0, majorityThreshold: 5100 }
      }
    ];
    await Artifact.insertMany(sampleArtifacts);
    console.log('✅ Sample artifacts inserted successfully');
    await mongoose.connection.close();
  } catch (err) {
    console.error('Seeding failed:', err?.message || err);
    try { await mongoose.connection.close(); } catch(e){}
  }
}

seedData();
