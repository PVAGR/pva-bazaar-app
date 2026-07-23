const mongoose = require('mongoose');
const dotenv = require('dotenv');
const BookProject = require('../models/BookProject');

// Load environment variables from .env file
dotenv.config({ path: require('path').join(__dirname, '../../.env') });

const TEST_BOOK_TITLES = [
  'Mongo Test Book 1784321779305',
  'Codex Cover Smoke Test 1784674070980',
  'Codex Live Smoke Preserve Fields 1784674508',
  'Codex Live Smoke Preserve Fields 1784674561',
  'Codex Smoke Test Book 1784673930989',
  'Diagnostic Test 1784747016',
  'E2E Publish bc509452',
  'Final Test 3c6024e3',
  'Multipart Probe',
  'Publish Probe',
  'Published Book 19d48310',
];

async function cleanupTestBooks() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error('MONGODB_URI or DATABASE_URL not set in environment');
    console.error('Please set MONGODB_URI in your .env file or pass it as an environment variable');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    console.log('\nSearching for test books to delete...');
    const testBooks = await BookProject.find({
      title: { $in: TEST_BOOK_TITLES }
    });

    if (testBooks.length === 0) {
      console.log('No test books found to delete');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${testBooks.length} test books:`);
    testBooks.forEach(book => {
      console.log(`  - ${book.title} (ID: ${book._id}, Status: ${book.status})`);
    });

    console.log('\nDeleting test books...');
    const deleteResult = await BookProject.deleteMany({
      title: { $in: TEST_BOOK_TITLES }
    });

    console.log(`Deleted ${deleteResult.deletedCount} test books`);
    console.log('\nCleanup complete');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupTestBooks();
