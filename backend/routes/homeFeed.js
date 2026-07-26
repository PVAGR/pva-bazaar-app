const express = require('express');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');
const { toPublicItem } = require('../lib/itemNormalize');
const Blog = require('../models/Blog');
const BookProject = require('../models/BookProject');
const Artifact = require('../models/Artifact');
const JournalEntry = require('../models/JournalEntry');
const PartnerSubmission = require('../models/PartnerSubmission');
const User = require('../models/User');

const router = express.Router();

const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
let mongoReadyPromise = null;

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

async function ensureMongoReady() {
  if (!hasMongoUri) {
    return false;
  }

  if (!mongoReadyPromise) {
    mongoReadyPromise = connectMongo({ logger: console, allowMemoryFallback: false }).catch((error) => {
      mongoReadyPromise = null;
      throw error;
    });
  }

  try {
    await mongoReadyPromise;
  } catch (error) {
    mongoReadyPromise = null;
    throw error;
  }

  const state = getMongoState();
  return state.mode === 'mongo' && state.readyState === 1;
}

function stripMarkup(value, max = 180) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_>#~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function formatRelativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  const deltaMs = Date.now() - date.getTime();
  const deltaMinutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (deltaMinutes < 1) return 'just now';
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) return `${deltaDays}d ago`;
  return date.toLocaleDateString();
}

function summarize(value, max = 160) {
  const text = stripMarkup(value, max * 2);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function formatMoney(priceCents, currency = 'USD') {
  const cents = Number(priceCents || 0);
  if (!Number.isFinite(cents) || cents <= 0) return '';
  const amount = cents / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'USD').toUpperCase(),
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch (_error) {
    return `${String(currency || 'USD').toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function extractWebsiteLabel(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./i, '');
  } catch (_error) {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  }
}

function roleLabelForUser(user) {
  const roleIntent = String(user?.onboardingProfile?.roleIntent || '').toLowerCase();
  const appRole = String(user?.onboardingProfile?.appRole || '').toLowerCase();
  const role = String(user?.role || '').toLowerCase();
  const combined = `${roleIntent} ${appRole} ${role}`;

  if (/(seller|creator|artist|merchant|broker|supplier)/.test(combined)) return 'Supplier';
  if (/(consumer|customer|buyer)/.test(combined)) return 'Customer';
  if (/(collector)/.test(combined)) return 'Collector';
  if (/(researcher)/.test(combined)) return 'Researcher';
  if (/(contributor)/.test(combined)) return 'Contributor';
  return 'Member';
}

function buildCard({
  id,
  kind,
  sectionKey,
  badge,
  title,
  summary,
  detail,
  href,
  imageUrl = '',
  priceText = '',
  sourceLabel = '',
  timestamp = '',
}) {
  return {
    id,
    kind,
    sectionKey,
    badge,
    title,
    summary,
    detail,
    href,
    imageUrl,
    priceText,
    sourceLabel,
    timestamp,
  };
}

function buildSection(key, title, summary, href, cards, emptyMessage) {
  return {
    key,
    title,
    summary,
    href,
    emptyMessage,
    cards,
  };
}

function buildPlaceholderCard(section) {
  return buildCard({
    id: `placeholder-${section.key}`,
    kind: 'placeholder',
    sectionKey: section.key,
    badge: section.title,
    title: `Waiting for the first ${section.title.toLowerCase()}`,
    summary: section.emptyMessage || section.summary,
    detail: 'This space will fill automatically when new content is published.',
    href: section.href,
    imageUrl: '',
    priceText: '',
    sourceLabel: 'Starter slot',
    timestamp: '',
  });
}

function sortCardsByTime(cards) {
  return [...cards].sort((a, b) => {
    const left = new Date(a.timestamp || 0).getTime();
    const right = new Date(b.timestamp || 0).getTime();
    return right - left;
  });
}

function getArtifactImage(item) {
  if (!item) return '';
  const media = Array.isArray(item.media) ? item.media : [];
  return media.find((entry) => typeof entry === 'string' && String(entry || '').trim()) || '';
}

async function loadBooks(limit) {
  const books = await BookProject.find({ status: 'published' })
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(limit)
    .select('title subtitle authorName slug description genre audience language frontCover backCover wordCount createdAt updatedAt publishedAt')
    .lean();

  return books.map((book) => {
    const slug = String(book.slug || '').trim();
    const title = String(book.title || '').trim() || 'Untitled book';
    const summary = summarize(book.description || book.subtitle || `New book published by ${book.authorName || 'a PVA Bazaar author'}.`);
    const detailParts = [
      book.authorName ? `by ${book.authorName}` : '',
      book.genre || '',
      book.wordCount ? `${Number(book.wordCount).toLocaleString()} words` : '',
    ].filter(Boolean);

    return buildCard({
      id: slug || String(book._id || ''),
      kind: 'book',
      sectionKey: 'books',
      badge: 'Book',
      title,
      summary,
      detail: detailParts.join(' · '),
      href: slug ? `/books/read/${encodeURIComponent(slug)}` : '/books/published',
      imageUrl: book.frontCover?.url || book.backCover?.url || '',
      sourceLabel: 'Published book',
      timestamp: book.publishedAt || book.updatedAt || book.createdAt || '',
    });
  });
}

async function loadBlogs(limit) {
  const blogs = await Blog.find({ status: 'published' })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .select('slug title authorName content updatedAt createdAt')
    .lean();

  return blogs.map((blog) => {
    const slug = String(blog.slug || '').trim();
    const title = String(blog.title || '').trim() || 'Untitled blog';
    const summary = summarize(blog.content || `New blog post by ${blog.authorName || 'a PVA Bazaar writer'}.`);
    const detailParts = [
      blog.authorName ? `by ${blog.authorName}` : '',
      formatRelativeTime(blog.updatedAt || blog.createdAt || ''),
    ].filter(Boolean);

    return buildCard({
      id: slug || String(blog._id || ''),
      kind: 'blog',
      sectionKey: 'blogs',
      badge: 'Blog',
      title,
      summary,
      detail: detailParts.join(' · '),
      href: slug ? `/blog/${encodeURIComponent(slug)}` : '/archive',
      imageUrl: '',
      sourceLabel: 'Published blog',
      timestamp: blog.updatedAt || blog.createdAt || '',
    });
  });
}

async function loadItems(limit) {
  const artifacts = await Artifact.find({ status: 'published' })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(limit)
    .select('title name slug description imageUrls media price salePrice currency category createdAt updatedAt origin country region stewardship currentHolderName')
    .lean();

  return artifacts.map((artifact) => {
    const item = toPublicItem(artifact);
    const title = String(item.name || item.title || '').trim() || 'Untitled item';
    const summary = summarize(item.description || item.lore || 'New item posted in the marketplace.');
    const origin = item.catalog?.origin || {};
    const originLabel = [origin.country, origin.region].filter(Boolean).join(', ');
    const priceText = formatMoney(item.priceCents, item.currency);

    return buildCard({
      id: item.slug || item.id || title,
      kind: 'item',
      sectionKey: 'items',
      badge: item.category || 'Item',
      title,
      summary,
      detail: [
        originLabel ? `Origin: ${originLabel}` : '',
        item.stewardship?.currentHolderName ? `Held by ${item.stewardship.currentHolderName}` : '',
      ].filter(Boolean).join(' · '),
      href: item.slug ? `/marketplace/${encodeURIComponent(item.slug)}` : '/marketplace',
      imageUrl: getArtifactImage(item),
      priceText: priceText || 'Price on request',
      sourceLabel: 'Marketplace listing',
      timestamp: item.updatedAt || item.createdAt || '',
    });
  });
}

async function loadPriceWatch(limit) {
  const artifacts = await Artifact.find({
    status: 'published',
    $or: [
      { price: { $gt: 0 } },
      { salePrice: { $gt: 0 } },
    ],
  })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(limit)
    .select('title name slug description imageUrls media price salePrice currency category createdAt updatedAt origin stewardship')
    .lean();

  return artifacts.map((artifact) => {
    const item = toPublicItem(artifact);
    const title = String(item.name || item.title || '').trim() || 'Untitled item';
    const priceText = formatMoney(item.priceCents, item.currency) || 'Price on request';
    const origin = item.catalog?.origin || {};
    const originLabel = [origin.country, origin.region].filter(Boolean).join(', ');
    const summary = artifact.salePrice
      ? `Sale price now ${priceText}.`
      : `Current listed price is ${priceText}.`;

    return buildCard({
      id: `${item.slug || item.id || title}-price`,
      kind: 'price',
      sectionKey: 'prices',
      badge: 'Price watch',
      title,
      summary,
      detail: [
        item.category || '',
        originLabel ? `Origin: ${originLabel}` : '',
      ].filter(Boolean).join(' · '),
      href: item.slug ? `/marketplace/${encodeURIComponent(item.slug)}` : '/marketplace',
      imageUrl: getArtifactImage(item),
      priceText,
      sourceLabel: artifact.salePrice ? 'Sale update' : 'Listing price',
      timestamp: item.updatedAt || item.createdAt || '',
    });
  });
}

async function loadPublicUsers(limit) {
  const users = await User.find({
    'preferences.defaultPublicVisibility': { $ne: false },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('name role profilePicture createdAt onboardingProfile.roleIntent onboardingProfile.appRole onboardingProfile.personalJourney onboardingProfile.contactLinks preferences.defaultPublicVisibility')
    .lean();

  return users.map((user) => {
    const roleLabel = roleLabelForUser(user);
    const detailParts = [
      user.onboardingProfile?.appRole || user.onboardingProfile?.roleIntent || '',
      summarize(user.onboardingProfile?.personalJourney || '', 90),
    ].filter(Boolean);

    return buildCard({
      id: String(user._id || user.name || ''),
      kind: 'user',
      sectionKey: roleLabel === 'Customer' ? 'customers' : 'suppliers',
      badge: roleLabel,
      title: String(user.name || '').trim() || 'Unnamed member',
      summary: summarize(user.onboardingProfile?.personalJourney || `New ${roleLabel.toLowerCase()} joined PVA Bazaar.`, 150),
      detail: detailParts.join(' · '),
      href: roleLabel === 'Customer' ? '/citizens' : '/creator',
      imageUrl: String(user.profilePicture || '').trim(),
      sourceLabel: `Public ${roleLabel.toLowerCase()} signup`,
      timestamp: user.createdAt || '',
    });
  });
}

async function loadPublicPartners(limit) {
  const submissions = await PartnerSubmission.find()
    .sort({ createdAt: -1, updatedAt: -1 })
    .limit(limit)
    .select('name company website message status createdAt updatedAt')
    .lean();

  return submissions.map((submission) => {
    const company = String(submission.company || '').trim();
    const title = company || String(submission.name || '').trim() || 'Partnership inquiry';
    const websiteLabel = extractWebsiteLabel(submission.website);
    const summary = summarize(submission.message || 'New partnership inquiry submitted.');
    const detailParts = [
      submission.name ? `by ${submission.name}` : '',
      websiteLabel ? websiteLabel : '',
      submission.status ? submission.status : '',
    ].filter(Boolean);

    return buildCard({
      id: String(submission._id || title),
      kind: 'partner',
      sectionKey: 'partnerships',
      badge: 'Partnership',
      title,
      summary,
      detail: detailParts.join(' · '),
      href: '/partnerships',
      imageUrl: '',
      sourceLabel: 'Business submission',
      timestamp: submission.createdAt || submission.updatedAt || '',
    });
  });
}

async function loadPublicWriting(limit) {
  const entries = await JournalEntry.find({ isPublic: true })
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name profilePicture')
    .select('title content tags mood publishedAt updatedAt createdAt userId')
    .lean();

  return entries.map((entry) => {
    const title = String(entry.title || '').trim() || 'Writing entry';
    const authorName = String(entry.userId?.name || '').trim();
    const summary = summarize(entry.content || 'New public writing shared from the archive.');
    const tags = Array.isArray(entry.tags) ? entry.tags.filter(Boolean).slice(0, 2) : [];
    const detailParts = [
      authorName ? `by ${authorName}` : '',
      entry.mood ? String(entry.mood) : '',
      tags.length ? tags.join(', ') : '',
    ].filter(Boolean);

    return buildCard({
      id: String(entry._id || title),
      kind: 'writing',
      sectionKey: 'journal',
      badge: 'Writing',
      title,
      summary,
      detail: detailParts.join(' · '),
      href: '/archive',
      imageUrl: String(entry.userId?.profilePicture || '').trim(),
      sourceLabel: 'Public writing',
      timestamp: entry.publishedAt || entry.updatedAt || entry.createdAt || '',
    });
  });
}

router.get('/', async (req, res) => {
  setNoCacheHeaders(res);
  const sectionLimit = Math.max(2, Math.min(Number(req.query.limit) || 4, 8));
  const itemLimit = Math.max(sectionLimit + 2, 6);

  let mongoReady = false;
  try {
    mongoReady = await ensureMongoReady();
  } catch (error) {
    console.warn('home-feed mongo bootstrap warning:', error?.message || error);
  }

  const emptySections = [
    buildSection('latest', 'Latest across PVA Bazaar', 'A combined stream of the newest public updates.', '/marketplace', [], 'The live feed will fill here as new books, blogs, items, customers, suppliers, and partnership updates are published.'),
    buildSection('books', 'Books', 'Fresh published books and publishing updates.', '/books/published', [], 'The first published book will appear here.'),
    buildSection('blogs', 'Blogs', 'Newest public posts and essays.', '/archive', [], 'The first blog post will appear here.'),
    buildSection('items', 'Items', 'New marketplace listings and product updates.', '/marketplace', [], 'The first marketplace item will appear here.'),
    buildSection('prices', 'Price watch', 'Current listing prices and sale updates.', '/marketplace', [], 'Price updates will appear here as listings change.'),
    buildSection('customers', 'Customers', 'Recent public customer signups.', '/citizens', [], 'New public customer signups will appear here.'),
    buildSection('suppliers', 'Suppliers', 'Recent public supplier and creator signups.', '/creator', [], 'New public supplier signups will appear here.'),
    buildSection('partnerships', 'Partnerships', 'Business submissions and collaboration inquiries.', '/partnerships', [], 'New business inquiries will appear here.'),
    buildSection('journal', 'Writing', 'Public journal entries and archive notes.', '/archive', [], 'The first public writing entry will appear here.'),
  ];

  if (!mongoReady) {
    return res.json({
      ok: true,
      source: hasMongoUri ? 'unavailable' : 'empty',
      updatedAt: new Date().toISOString(),
      counts: {
        books: 0,
        blogs: 0,
        items: 0,
        prices: 0,
        customers: 0,
        suppliers: 0,
        partnerships: 0,
        journal: 0,
        total: 0,
      },
      sections: emptySections,
      items: [],
    });
  }

  try {
    const [books, blogs, items, prices, users, partners, journal] = await Promise.all([
      loadBooks(sectionLimit).catch(() => []),
      loadBlogs(sectionLimit).catch(() => []),
      loadItems(itemLimit).catch(() => []),
      loadPriceWatch(itemLimit).catch(() => []),
      loadPublicUsers(sectionLimit * 2).catch(() => []),
      loadPublicPartners(sectionLimit).catch(() => []),
      loadPublicWriting(sectionLimit).catch(() => []),
    ]);

    const customerCards = users.filter((card) => card.sectionKey === 'customers').slice(0, sectionLimit);
    const supplierCards = users.filter((card) => card.sectionKey === 'suppliers').slice(0, sectionLimit);

    const sections = [
      buildSection(
        'latest',
        'Latest across PVA Bazaar',
        'The newest public changes from books, blogs, marketplace items, prices, customers, suppliers, partnerships, and writing.',
        '/marketplace',
        [],
        'The live feed will fill here as new public updates are published.',
      ),
      buildSection('books', 'Books', 'Fresh published books and publishing updates.', '/books/published', books.slice(0, sectionLimit), 'The first published book will appear here.'),
      buildSection('blogs', 'Blogs', 'Newest public posts and essays.', '/archive', blogs.slice(0, sectionLimit), 'The first blog post will appear here.'),
      buildSection('items', 'Items', 'New marketplace listings and product updates.', '/marketplace', items.slice(0, itemLimit), 'The first marketplace item will appear here.'),
      buildSection('prices', 'Price watch', 'Current listing prices and sale updates.', '/marketplace', prices.slice(0, itemLimit), 'Price updates will appear here as listings change.'),
      buildSection('customers', 'Customers', 'Recent public customer signups.', '/citizens', customerCards, 'New public customer signups will appear here.'),
      buildSection('suppliers', 'Suppliers', 'Recent public supplier and creator signups.', '/creator', supplierCards, 'New public supplier signups will appear here.'),
      buildSection('partnerships', 'Partnerships', 'Business submissions and collaboration inquiries.', '/partnerships', partners.slice(0, sectionLimit), 'New business inquiries will appear here.'),
      buildSection('journal', 'Writing', 'Public journal entries and archive notes.', '/archive', journal.slice(0, sectionLimit), 'The first public writing entry will appear here.'),
    ];

    const nonLatestCards = sections
      .filter((section) => section.key !== 'latest')
      .flatMap((section) => section.cards || []);
    const sortedItems = sortCardsByTime(nonLatestCards);
    const latestCards = sortedItems.slice(0, Math.max(6, sectionLimit));
    sections[0] = {
      ...sections[0],
      cards: latestCards,
    };

    const counts = {
      books: books.length,
      blogs: blogs.length,
      items: items.length,
      prices: prices.length,
      customers: customerCards.length,
      suppliers: supplierCards.length,
      partnerships: partners.length,
      journal: journal.length,
      total: books.length + blogs.length + items.length + prices.length + customerCards.length + supplierCards.length + partners.length + journal.length,
    };

    const updatedAt = sortedItems.length
      ? sortedItems[0].timestamp || new Date().toISOString()
      : new Date().toISOString();

    return res.json({
      ok: true,
      source: 'mongo',
      updatedAt,
      counts,
      sections,
      items: sortedItems,
    });
  } catch (error) {
    console.error('home-feed error:', error);
    return res.json({
      ok: true,
      source: 'empty',
      updatedAt: new Date().toISOString(),
      counts: {
        books: 0,
        blogs: 0,
        items: 0,
        prices: 0,
        customers: 0,
        suppliers: 0,
        partnerships: 0,
        journal: 0,
        total: 0,
      },
      sections: emptySections,
      items: [],
      error: error?.message || 'Unable to load live homepage updates',
    });
  }
});

module.exports = router;
