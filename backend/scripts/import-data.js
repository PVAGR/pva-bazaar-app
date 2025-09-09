/**
 * Import data from JSON to MongoDB
 * Usage: node import-data.js backup.json
 */

const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../models/user');
const Artifact = require('../models/Artifact');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function importData() {
  // Check if file path is provided
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide a file path: node import-data.js <file-path>');
    process.exit(1);
  }

  try {
    // Read JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar');
    
    // Import users (need to rehash passwords)
    if (data.users && data.users.length) {
      // First clean existing users
      await User.deleteMany({});
      
      // For each user, we need to create a new user with a temporary password
      // since we don't export passwords
      for (const user of data.users) {
        const newUser = new User({
          ...user,
          password: await bcrypt.hash('tempPassword123', 10) // Temporary password
        });
        await newUser.save();
      }
      console.log(`✅ Imported ${data.users.length} users`);
    }
    
    // Import artifacts
    if (data.artifacts && data.artifacts.length) {
      await Artifact.deleteMany({});
      await Artifact.insertMany(data.artifacts);
      console.log(`✅ Imported ${data.artifacts.length} artifacts`);
    }
    
    console.log('✅ Import completed successfully');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

importData();
