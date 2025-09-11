/**
 * Export data from MongoDB to JSON
 * Usage: node export-data.js > backup.json
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Artifact = require('../models/Artifact');
require('dotenv').config();

async function exportData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar');
    
    // Get all users (excluding passwords)
    const users = await User.find({}).select('-password').lean();
    
    // Get all artifacts
    const artifacts = await Artifact.find({}).lean();
    
    // Create export object
    const exportData = {
      users,
      artifacts,
      metadata: {
        exportDate: new Date(),
        version: '1.0'
      }
    };
    
    // Output as JSON
    console.log(JSON.stringify(exportData, null, 2));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  }
}

exportData();
