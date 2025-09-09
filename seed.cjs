const mongoose = require('mongoose');
const Artifact = require('./backend/models/Artifact');
const User = require('./backend/models/user');
require('dotenv').config();

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
    });
    console.log('Connected to MongoDB');
    
    // Create a sample user first (needed for creator field)
    await User.deleteMany({});
    const sampleUser = new User({
      name: 'PVA Admin',
      email: 'admin@pvabazaar.org',
      password: 'admin123' // This will be hashed automatically
    });
    await sampleUser.save();
    console.log('✅ Sample user created');
    
    // Clear existing artifacts
    await Artifact.deleteMany({});
    
    // Create sample artifacts (using real user ID)
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
        creator: sampleUser._id, // Use real user ID
        physicalSerial: 'PVA-0001',
        fractionalization: {
          enabled: true,
          totalShares: 5000,
          sharePrice: 1,
          soldShares: 0,
          majorityThreshold: 2600
        }
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
        creator: sampleUser._id, // Use real user ID
        physicalSerial: 'PVA-0002',
        fractionalization: {
          enabled: true,
          totalShares: 10000,
          sharePrice: 0.25,
          soldShares: 0,
          majorityThreshold: 5100
        }
      },
      {
        name: 'Handcrafted Lapis Lazuli Bowl',
        title: 'Afghan Lapis Lazuli Bowl',
        description: 'Beautiful bowl carved from authentic Afghan lapis lazuli stone',
        imageUrl: 'https://via.placeholder.com/400x300/4169E1/FFFFFF?text=Lapis+Bowl',
        price: 850,
        category: 'Stone Crafts',
        materials: ['Lapis Lazuli'],
        artisan: 'Badakhshan Stoneworkers',
        creator: sampleUser._id,
        physicalSerial: 'PVA-0003'
      }
    ];
    
    await Artifact.insertMany(sampleArtifacts);
    console.log('✅ Sample artifacts inserted successfully');
    console.log('📧 Test login credentials: admin@pvabazaar.org / admin123');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedData();