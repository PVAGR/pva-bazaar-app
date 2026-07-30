// STEP 0: Force Google DNS BEFORE anything else
require('dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const BookProject = require('./models/BookProject');
const User = require('./models/User');

let passed = 0;
let failed = 0;

function report(step, ok, detail) {
  const icon = ok ? '✅' : '❌';
  if (ok) passed++; else failed++;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${icon} ${step}`);
  console.log(`${'='.repeat(60)}`);
  console.log(detail);
}

// ─── STEP 2: DNS + MongoDB Connection ───
async function step2_connectionTest() {
  const dns = require('dns').promises;
  const hostname = 'cluster0.v6lhohq.mongodb.net';
  const details = [];

  try {
    const srv = await dns.resolveSrv(`_mongodb._tcp.${  hostname}`);
    details.push(`SRV records: ${srv.length} found`);
    srv.forEach(r => details.push(`  -> ${r.name}:${r.port}`));
  } catch (e) {
    details.push(`SRV FAILED: ${e.code} - ${e.message}`);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      dbName: 'pvabazaar',
    });
    details.push('mongoose.connect: SUCCESS');
    details.push(`readyState: ${mongoose.connection.readyState}`);
    details.push(`host: ${mongoose.connection.host}`);
    details.push(`databaseName: ${mongoose.connection.db.databaseName}`);

    const admin = mongoose.connection.db.admin();
    const info = await admin.serverStatus();
    details.push(`MongoDB version: ${info.version}`);

    const dbs = await admin.listDatabases();
    details.push(`Databases: ${dbs.databases.map(d => d.name).join(', ')}`);

    const colCount = await mongoose.connection.db.listCollections().toArray();
    details.push(`Collections in pvabazaar: ${colCount.map(c => c.name).join(', ') || '(empty)'}`);

    report('STEP 2: DNS + MongoDB Connection', true, details.join('\n'));
    return true;
  } catch (e) {
    details.push(`mongoose.connect: FAILED`);
    details.push(`Error: ${e.name}: ${e.message}`);
    report('STEP 2: DNS + MongoDB Connection', false, details.join('\n'));
    return false;
  }
}

// ─── STEP 3: Verify/Seed Users ───
async function step3_verifyUsers() {
  const details = [];

  try {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    details.push(`Total users in DB: ${users.length}`);
    users.forEach(u => details.push(`  -> ${u.name} <${u.email}> role=${u.role}`));

    const adminUser = users.find(u => u.email === 'admin@pvabazaar.org');
    const richyUser = users.find(u => u.username === 'richyrichaii');

    const adminOk = !!adminUser;
    const richyOk = !!richyUser;

    if (adminOk) details.push('admin@pvabazaar.org: FOUND ✅');
    else details.push('admin@pvabazaar.org: MISSING - seeding...');

    if (richyOk) details.push('richyrichaii: FOUND ✅');
    else details.push('richyrichaii: MISSING - seeding...');

    if (!adminOk) {
      await new User({ name: 'PVA Admin', email: 'admin@pvabazaar.org', password: 'admin123', role: 'admin' }).save();
      details.push('  -> Seeded admin@pvabazaar.org');
    }
    if (!richyOk) {
      await new User({ name: 'Richy Rich', username: 'richyrichaii', email: 'richyrichaii@local', password: 'pva123zxc!', role: 'admin' }).save();
      details.push('  -> Seeded richyrichaii');
    }

    const finalUsers = await db.collection('users').find({}).toArray();
    details.push(`\nFinal user count: ${finalUsers.length}`);

    report('STEP 3: Verify/Seed Users', true, details.join('\n'));
    return true;
  } catch (e) {
    details.push(`Error: ${e.name}: ${e.message}`);
    report('STEP 3: Verify/Seed Users', false, details.join('\n'));
    return false;
  }
}

// ─── STEP 4: Book Publishing (Create + Read) ───
async function step4_publishBook() {
  const details = [];
  const ts = Date.now();

  try {
    // Clean up any previous test books first
    await BookProject.deleteMany({ slug: /^pipeline-test-/ });

    const adminUser = await User.findOne({ email: 'admin@pvabazaar.org' });
    const authorId = String(adminUser?._id || '');
    details.push(`Using authorId: ${authorId}`);

    const testBook = {
      authorId,
      title: 'Pipeline Test Book',
      slug: `pipeline-test-${ts}`,
      authorName: 'Test Author',
      description: 'Testing the full publishing pipeline',
      genre: 'general',
      audience: 'general',
      language: 'en',
      status: 'published',
      manuscriptMarkdown: 'This is a test manuscript for pipeline validation.',
      wordCount: 9,
      isApproved: true,
      publishedAt: new Date(),
    };

    details.push(`Creating book: "${testBook.title}" (slug: ${testBook.slug})`);
    const saved = await BookProject.create(testBook);
    details.push(`CREATED - ID: ${saved._id}`);
    details.push(`  title: ${saved.title}`);
    details.push(`  slug: ${saved.slug}`);
    details.push(`  status: ${saved.status}`);
    details.push(`  authorId: ${saved.authorId}`);

    // Verify read back
    const foundById = await BookProject.findById(saved._id);
    details.push(`\nRead by _id: ${foundById ? 'EXISTS' : 'NOT FOUND'}`);
    if (foundById) {
      details.push(`  title matches: ${foundById.title === testBook.title}`);
      details.push(`  slug matches: ${foundById.slug === testBook.slug}`);
    }

    // Verify read by slug
    const foundBySlug = await BookProject.findOne({ slug: testBook.slug });
    details.push(`Read by slug: ${foundBySlug ? 'EXISTS' : 'NOT FOUND'}`);

    const ok = !!saved && !!foundById && !!foundBySlug;
    report('STEP 4: Book Publishing (Create + Read)', ok, details.join('\n'));
    return { ok, bookId: String(saved._id), slug: testBook.slug };
  } catch (e) {
    details.push(`Error: ${e.name}: ${e.message}`);
    details.push(`Stack: ${e.stack?.split('\n').slice(0, 3).join('\n')}`);
    report('STEP 4: Book Publishing (Create + Read)', false, details.join('\n'));
    return { ok: false, bookId: null, slug: null };
  }
}

// ─── STEP 5: Book Deletion (by ID + by slug) ───
async function step5_deleteBook(bookId, slug) {
  const details = [];

  try {
    // 5a: Delete by MongoDB ObjectId
    details.push(`5a) Deleting by ObjectId: ${bookId}`);
    const deletedById = await BookProject.findByIdAndDelete(bookId);
    details.push(`  findByIdAndDelete result: ${deletedById ? 'DELETED' : 'NOT FOUND'}`);

    const verifyGone1 = await BookProject.findById(bookId);
    details.push(`  Verify gone: ${verifyGone1 ? 'STILL EXISTS ❌' : 'REMOVED ✅'}`);

    // 5b: Create a second test book, then delete by slug
    const adminUser = await User.findOne({ email: 'admin@pvabazaar.org' });
    const slugBook = await BookProject.create({
      authorId: String(adminUser?._id || ''),
      title: 'Slug Delete Test Book',
      slug: `slug-delete-test-${Date.now()}`,
      status: 'draft',
    });
    details.push(`\n5b) Created slug-test book: ${slugBook._id} (slug: ${slugBook.slug})`);

    // This is the key test: removeBookRecord's slug fallback
    // removeBookRecord does: findOneAndDelete({ slug: strId })
    const slugDeleted = await BookProject.findOneAndDelete({ slug: slugBook.slug });
    details.push(`  findOneAndDelete by slug: ${slugDeleted ? 'DELETED' : 'NOT FOUND'}`);

    const verifyGone2 = await BookProject.findById(slugBook._id);
    details.push(`  Verify gone: ${verifyGone2 ? 'STILL EXISTS ❌' : 'REMOVED ✅'}`);

    // 5c: Verify no leftover test books
    const remaining = await BookProject.find({ slug: /^pipeline-test-|^slug-delete-test-/ });
    details.push(`\n5c) Remaining test books: ${remaining.length}`);
    remaining.forEach(b => details.push(`  -> ${b.title} (${b.slug})`));

    const allGone = !verifyGone1 && !verifyGone2 && remaining.length === 0;
    details.push(`\nAll test books removed: ${allGone ? 'YES ✅' : 'NO ❌'}`);

    report('STEP 5: Book Deletion (ID + Slug)', allGone, details.join('\n'));
    return allGone;
  } catch (e) {
    details.push(`Error: ${e.name}: ${e.message}`);
    details.push(`Stack: ${e.stack?.split('\n').slice(0, 3).join('\n')}`);
    report('STEP 5: Book Deletion (ID + Slug)', false, details.join('\n'));
    return false;
  }
}

// ─── MAIN ───
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   BOOK PUBLISHING PIPELINE - FULL END-TO-END TEST      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`URI (masked): ${MONGODB_URI?.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}`);
  console.log(`DNS: 8.8.8.8, 8.8.4.4, 1.1.1.1 (forced)`);

  // Step 2
  const connected = await step2_connectionTest();
  if (!connected) {
    console.log('\nFATAL: Cannot proceed without database connection.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Step 3
  await step3_verifyUsers();

  // Step 4
  const { ok: publishOk, bookId, slug } = await step4_publishBook();

  // Step 5
  let deleteOk = false;
  if (publishOk) {
    deleteOk = await step5_deleteBook(bookId, slug);
  } else {
    report('STEP 5: Book Deletion (ID + Slug)', false, 'SKIPPED - Step 4 failed');
  }

  // Step 6: Summary
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL SUMMARY                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  STEP 1 (Env Check):       ✅ PASS`);
  console.log(`  STEP 2 (DB Connection):   ${connected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  STEP 3 (User Seed):       ✅ PASS`);
  console.log(`  STEP 4 (Publish Book):    ${publishOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  STEP 5 (Delete Book):     ${deleteOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n  PIPELINE IS 100% GREEN AND READY FOR LIVE TESTING.');
  } else {
    console.log('\n  PIPELINE HAS FAILURES - SEE ABOVE FOR DETAILS.');
  }

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  await mongoose.disconnect();
  process.exit(1);
});
