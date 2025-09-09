// Create a seed script - backend/seed.js
const mongoose = require('mongoose');
const Artifact = require('./models/Artifact');
require('dotenv').config();

async function seedData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
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
      creator: new mongoose.Types.ObjectId(), // Replace with actual user ID
      physicalSerial: 'PVA-0001',
      fractionalization: {
        enabled: true,
        totalShares: 5000,
        sharePrice: 1,
        soldShares: 0,
        majorityThreshold: 2600
      }
    }
  ];
  
  await Artifact.insertMany(sampleArtifacts);
  console.log('Sample data inserted');
  process.exit();
}

seedData();