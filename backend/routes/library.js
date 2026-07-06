const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const axios = require('axios');
const archiver = require('archiver');
const rateLimit = require('express-rate-limit');
const slugify = require('slugify');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const LibraryDocument = require('../models/LibraryDocument');
const LibraryArticle = require('../models/LibraryArticle');
const ModerationLog = require('../models/ModerationLog');
const ipfsService = require('../service/ipfs');
const {
  parseFrontmatter,
  buildTemplateFrontmatter,
  ensureUniversalReference,
  computeDiffSummary,
  renderArticleHtml,
  uploadHtmlToIpfs,
  writeToGitBranch,
  buildFrontmatterMarkdown,
} = require('../services/libraryPublisher');

const LIBRARY_UPLOAD_DIR = path.join(__dirname, '../uploads/library');
const CAREERS_SEED_PATH = path.join(__dirname, '../data/seed/onet-jobs-professions-skills.json');
let careersSeedCache = null;

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

const EMPTY_CAREERS_SEED = {
  summary: { occupations: 0, skillConcepts: 0 },
  professions: [],
  skillsCatalog: [],
};

function sanitizeText(value, max = 12000) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function isModerator(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'moderator';
}

function requireModerator(req, res, next) {
  if (!isModerator(req)) {
    return res.status(403).json({ ok: false, error: 'Moderator or admin access required' });
  }
  next();
}

function normalizeArticlePayload(input, reqUser) {
  const markdownInput = String(input?.markdown || '').trim();
  if (!markdownInput) {
    throw new Error('markdown is required');
  }

  const parsed = parseFrontmatter(markdownInput);
  const normalizedFrontmatter = buildTemplateFrontmatter(
    parsed.frontmatter,
    String(reqUser?.id || ''),
  );
  ensureUniversalReference(normalizedFrontmatter);

  const slug = slugify(
    sanitizeText(
      input?.slug || normalizedFrontmatter.title || input?.title || 'library-entry',
      200,
    ),
    { lower: true, strict: true },
  );

  if (!slug) {
    throw new Error('Unable to create a slug from title');
  }

  return {
    title: sanitizeText(normalizedFrontmatter.title, 200),
    slug,
    body: parsed.body,
    frontmatter: normalizedFrontmatter,
    markdown: buildFrontmatterMarkdown(normalizedFrontmatter, parsed.body),
  };
}

function articleSelectProjection() {
  return 'title slug status authorId version markdown frontmatter quickFacts renderedHtml ipfsCid ipfsGatewayUrl gitCommitHash lastPublishedAt lastSubmittedAt updatedAt createdAt moderationNote rejectedReason';
}

async function resolvePublishedArticle(identifier) {
  const normalizedIdentifier = sanitizeText(identifier, 200);
  let byId = null;

  if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
    byId = await LibraryArticle.findOne({
      _id: normalizedIdentifier,
      status: 'published',
    })
      .select(articleSelectProjection())
      .lean();
  }

  if (byId) return byId;

  return LibraryArticle.findOne({
    slug: normalizedIdentifier.toLowerCase(),
    status: 'published',
  })
    .select(articleSelectProjection())
    .lean();
}

router.post('/submit', authenticateToken, submitLimiter, async (req, res) => {
  try {
    const payload = normalizeArticlePayload(req.body, req.user);
    const note = sanitizeText(req.body?.note || '', 600);
    const articleId = sanitizeText(req.body?.articleId || '', 120);

    let article;
    if (articleId) {
      article = await LibraryArticle.findById(articleId);
      if (!article) {
        return res.status(404).json({ ok: false, error: 'Article not found' });
      }

      const isOwner = String(article.authorId) === String(req.user?.id || '');
      if (!isOwner && !isModerator(req)) {
        return res
          .status(403)
          .json({ ok: false, error: 'Only the author can resubmit this article' });
      }
    } else {
      article = new LibraryArticle({
        authorId: req.user.id,
      });
    }

    const beforeStatus = article.status || 'draft';
    article.title = payload.title;
    article.slug = payload.slug;
    article.markdown = payload.markdown;
    article.frontmatter = payload.frontmatter;
    article.quickFacts = payload.frontmatter.quick_facts || {};
    article.status = 'pending';
    article.lastSubmittedAt = new Date();
    article.rejectedReason = '';
    article.moderationNote = '';

    const nextVersion = Math.max(Number(article.version || 1), 1);
    article.version = nextVersion;
    article.versionHistory.push({
      version: nextVersion,
      status: 'pending',
      markdown: payload.markdown,
      frontmatter: payload.frontmatter,
      submittedBy: req.user.id,
      submittedAt: new Date(),
      reviewNote: note,
    });

    await article.save();

    await ModerationLog.create({
      articleId: article._id,
      actorId: req.user.id,
      actorRole: String(req.user?.role || 'user').toLowerCase(),
      action: 'submit',
      beforeStatus,
      afterStatus: 'pending',
      diffSummary: computeDiffSummary('', payload.markdown),
      note,
      metadata: {
        slug: article.slug,
        version: article.version,
      },
    });

    return res.status(201).json({
      ok: true,
      item: {
        id: article._id,
        slug: article.slug,
        title: article.title,
        status: article.status,
        version: article.version,
        submittedAt: article.lastSubmittedAt,
      },
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Failed to submit article' });
  }
});

router.get('/pending', authenticateToken, requireModerator, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 30, 100));

    const items = await LibraryArticle.find({ status: 'pending' })
      .sort({ lastSubmittedAt: -1, updatedAt: -1 })
      .limit(limit)
      .populate('authorId', 'name email role')
      .lean();

    const payload = items.map((item) => {
      const lastPublishedSnapshot = [...(item.versionHistory || [])]
        .reverse()
        .find((snapshot) => snapshot.status === 'published');

      const diffSummary = computeDiffSummary(
        lastPublishedSnapshot?.markdown || '',
        item.markdown || '',
      );

      return {
        _id: item._id,
        title: item.title,
        slug: item.slug,
        status: item.status,
        version: item.version,
        author: item.authorId,
        lastSubmittedAt: item.lastSubmittedAt,
        updatedAt: item.updatedAt,
        diffSummary,
        markdown: item.markdown,
        frontmatter: item.frontmatter,
      };
    });

    return res.json({ ok: true, items: payload });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, error: error.message || 'Failed to load moderation queue' });
  }
});

router.put('/:id/approve', authenticateToken, requireModerator, submitLimiter, async (req, res) => {
  try {
    const article = await LibraryArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ ok: false, error: 'Article not found' });
    if (article.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Only pending articles can be approved' });
    }

    const note = sanitizeText(req.body?.note || '', 600);
    const beforeStatus = article.status;
    const nextVersion = Math.max(Number(article.version || 1), 1);

    const parsed = parseFrontmatter(article.markdown);
    const html = renderArticleHtml({
      title: article.title,
      frontmatter: article.frontmatter || parsed.frontmatter || {},
      body: parsed.body,
    });

    const ipfsPublish = await uploadHtmlToIpfs({
      html,
      slug: article.slug,
      version: nextVersion,
    });

    const gitSync = await writeToGitBranch({
      slug: article.slug,
      markdown: article.markdown,
      version: nextVersion,
      status: 'published',
    });

    article.status = 'published';
    article.version = nextVersion + 1;
    article.moderationNote = note;
    article.rejectedReason = '';
    article.renderedHtml = html;
    article.lastPublishedAt = new Date();
    article.ipfsCid = ipfsPublish.cid || '';
    article.ipfsGatewayUrl = ipfsPublish.gatewayUrl || '';
    article.gitCommitHash = gitSync.gitCommitHash || '';

    article.versionHistory.push({
      version: nextVersion,
      status: 'published',
      markdown: article.markdown,
      frontmatter: article.frontmatter,
      submittedBy: article.authorId,
      reviewedBy: req.user.id,
      submittedAt: article.lastSubmittedAt || new Date(),
      reviewedAt: new Date(),
      reviewNote: note,
      gitCommitHash: article.gitCommitHash,
      ipfsCid: article.ipfsCid,
      renderedHtml: html,
    });

    await article.save();

    const lastPublishedSnapshot = [...article.versionHistory]
      .reverse()
      .find((snapshot) => snapshot.status === 'published' && snapshot.version !== nextVersion);

    await ModerationLog.create({
      articleId: article._id,
      actorId: req.user.id,
      actorRole: String(req.user?.role || 'moderator').toLowerCase(),
      action: 'approve',
      beforeStatus,
      afterStatus: 'published',
      diffSummary: computeDiffSummary(lastPublishedSnapshot?.markdown || '', article.markdown),
      note,
      metadata: {
        slug: article.slug,
        version: nextVersion,
        ipfsCid: article.ipfsCid,
        gitCommitHash: article.gitCommitHash,
        ipfsError: ipfsPublish.error || '',
      },
    });

    return res.json({
      ok: true,
      item: {
        _id: article._id,
        title: article.title,
        slug: article.slug,
        status: article.status,
        version: article.version,
        ipfsCid: article.ipfsCid,
        ipfsGatewayUrl: article.ipfsGatewayUrl,
        gitCommitHash: article.gitCommitHash,
        publishedAt: article.lastPublishedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to approve article' });
  }
});

router.put('/:id/reject', authenticateToken, requireModerator, submitLimiter, async (req, res) => {
  try {
    const article = await LibraryArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ ok: false, error: 'Article not found' });
    if (article.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Only pending articles can be rejected' });
    }

    const reason = sanitizeText(req.body?.reason || req.body?.note || 'Needs revision', 600);
    const beforeStatus = article.status;

    article.status = 'rejected';
    article.rejectedReason = reason;
    article.moderationNote = reason;
    article.versionHistory.push({
      version: Math.max(Number(article.version || 1), 1),
      status: 'rejected',
      markdown: article.markdown,
      frontmatter: article.frontmatter,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNote: reason,
    });

    await article.save();

    await ModerationLog.create({
      articleId: article._id,
      actorId: req.user.id,
      actorRole: String(req.user?.role || 'moderator').toLowerCase(),
      action: 'reject',
      beforeStatus,
      afterStatus: 'rejected',
      diffSummary: computeDiffSummary('', article.markdown || ''),
      note: reason,
      metadata: { slug: article.slug, version: article.version },
    });

    return res.json({
      ok: true,
      item: {
        _id: article._id,
        slug: article.slug,
        title: article.title,
        status: article.status,
        rejectedReason: article.rejectedReason,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to reject article' });
  }
});

function safeName(name) {
  return path.basename(String(name || 'document')).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeDownloadName(doc) {
  const source = doc?.file?.originalName || `${doc?.title || 'document'}`;
  return safeName(source);
}

function buildPublicFilter(req) {
  const filter = {
    status: 'published',
    visibility: 'public',
  };

  if (req.query.category) filter.category = String(req.query.category).trim().toLowerCase();
  if (req.query.domain) filter.domain = String(req.query.domain).trim().toLowerCase();
  if (req.query.q) filter.$text = { $search: String(req.query.q).trim() };
  return filter;
}

async function resolveDocumentReadStream(doc) {
  const primary = doc?.storage?.primary || {};
  const backup = doc?.storage?.backup || {};

  if (primary.provider === 'local' && primary.localFilename) {
    const localPath = path.join(LIBRARY_UPLOAD_DIR, path.basename(primary.localFilename));
    await fsp.stat(localPath);
    return { stream: fs.createReadStream(localPath), source: 'primary-local' };
  }

  if (primary.url && /^https?:\/\//i.test(primary.url)) {
    const response = await axios.get(primary.url, { responseType: 'stream', timeout: 15000 });
    return { stream: response.data, source: 'primary-remote' };
  }

  if (backup.provider === 'local' && backup.localFilename) {
    const backupPath = path.join(LIBRARY_UPLOAD_DIR, path.basename(backup.localFilename));
    await fsp.stat(backupPath);
    return { stream: fs.createReadStream(backupPath), source: 'backup-local' };
  }

  throw new Error('No readable file source found');
}

async function loadCareersSeed() {
  if (careersSeedCache) return careersSeedCache;
  try {
    const raw = await fsp.readFile(CAREERS_SEED_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    careersSeedCache = parsed;
  } catch (_error) {
    // Keep public library route functional even when optional seed file is not bundled.
    careersSeedCache = EMPTY_CAREERS_SEED;
  }
  return careersSeedCache;
}

router.get('/careers', async (req, res) => {
  try {
    const seed = await loadCareersSeed();
    const all = Array.isArray(seed.professions) ? seed.professions : [];
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 24, 100));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase();
    const jobZone = String(req.query.jobZone || '').trim();

    const filtered = all.filter((item) => {
      if (jobZone && String(item.jobZone || '') !== jobZone) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.description,
        item.onetSocCode,
        ...(Array.isArray(item.sampleTitles) ? item.sampleTitles : []),
        ...(Array.isArray(item.topSkills) ? item.topSkills.map((s) => s.name) : []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    const page = filtered.slice(offset, offset + limit);
    return res.json({
      ok: true,
      summary: seed.summary || { occupations: all.length, skillConcepts: 0 },
      total: filtered.length,
      limit,
      offset,
      items: page,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/careers/skills', async (req, res) => {
  try {
    const seed = await loadCareersSeed();
    const all = Array.isArray(seed.skillsCatalog) ? seed.skillsCatalog : [];
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 100, 500));
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase();

    const filtered = q
      ? all.filter((item) =>
          `${String(item.name || '')} ${String(item.description || '')}`.toLowerCase().includes(q),
        )
      : all;

    return res.json({
      ok: true,
      total: filtered.length,
      items: filtered.slice(0, limit),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/careers/export/json', async (_req, res) => {
  try {
    await fsp.access(CAREERS_SEED_PATH, fs.constants.R_OK);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="onet-jobs-professions-skills.json"',
    );
    return fs.createReadStream(CAREERS_SEED_PATH).pipe(res);
  } catch (error) {
    return res.status(404).json({ ok: false, error: 'Careers seed file not found' });
  }
});

router.get('/', async (req, res) => {
  try {
    if (String(req.query.kind || '').toLowerCase() === 'articles') {
      const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 60, 200));
      const articleFilter = { status: 'published' };
      if (req.query.q) {
        const q = sanitizeText(req.query.q, 120);
        articleFilter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { slug: { $regex: q, $options: 'i' } },
        ];
      }

      const articleItems = await LibraryArticle.find(articleFilter)
        .select(
          'title slug status version ipfsCid ipfsGatewayUrl gitCommitHash quickFacts updatedAt createdAt',
        )
        .sort({ updatedAt: -1, _id: -1 })
        .limit(limit)
        .lean();

      return res.json({ ok: true, items: articleItems });
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 60, 200));
    const filter = buildPublicFilter(req);

    const items = await LibraryDocument.find(filter)
      .select('-storage.backup.localFilename')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, items });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const publishedArticle = await resolvePublishedArticle(req.params.id);
    if (publishedArticle) {
      let servedFrom = 'database';
      let resolvedHtml = publishedArticle.renderedHtml || '';

      if (publishedArticle.ipfsCid) {
        try {
          const ipfsBuffer = await ipfsService.getFile(publishedArticle.ipfsCid);
          resolvedHtml = ipfsBuffer.toString('utf8');
          servedFrom = 'ipfs';
        } catch (_ipfsErr) {
          servedFrom = 'database-fallback';
        }
      }

      return res.json({
        ok: true,
        item: {
          _id: publishedArticle._id,
          title: publishedArticle.title,
          slug: publishedArticle.slug,
          status: publishedArticle.status,
          version: publishedArticle.version,
          frontmatter: publishedArticle.frontmatter,
          markdown: publishedArticle.markdown,
          renderedHtml: resolvedHtml,
          ipfsCid: publishedArticle.ipfsCid,
          ipfsGatewayUrl: publishedArticle.ipfsGatewayUrl,
          gitCommitHash: publishedArticle.gitCommitHash,
          lastPublishedAt: publishedArticle.lastPublishedAt,
        },
        source: servedFrom,
      });
    }

    const documentIdentifier = sanitizeText(req.params.id, 200);
    let item = null;

    if (mongoose.Types.ObjectId.isValid(documentIdentifier)) {
      item = await LibraryDocument.findOne({
        _id: documentIdentifier,
        status: 'published',
        visibility: 'public',
      })
        .select('-storage.backup.localFilename')
        .lean();
    }

    if (!item) return res.status(404).json({ ok: false, error: 'Document not found' });
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const doc = await LibraryDocument.findOne({
      _id: req.params.id,
      status: 'published',
      visibility: 'public',
    });

    if (!doc) return res.status(404).json({ ok: false, error: 'Document not found' });

    const { stream } = await resolveDocumentReadStream(doc);
    const downloadName = normalizeDownloadName(doc);

    res.setHeader('Content-Type', doc.file?.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    stream.pipe(res);

    doc.downloadCount = (doc.downloadCount || 0) + 1;
    await doc.save();
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

async function streamZipExport(req, res, filter, archiveName) {
  const docs = await LibraryDocument.find(filter).sort({ createdAt: -1, _id: -1 }).lean();

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName(archiveName)}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => {
    throw error;
  });
  archive.pipe(res);

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalDocuments: docs.length,
    filters: filter,
    items: [],
    missing: [],
  };

  for (const doc of docs) {
    try {
      const name = normalizeDownloadName(doc);
      const categoryFolder = safeName(doc.category || 'general');
      const pathInArchive = `${categoryFolder}/${name}`;
      const { stream, source } = await resolveDocumentReadStream(doc);
      archive.append(stream, { name: pathInArchive });
      manifest.items.push({
        id: String(doc._id),
        title: doc.title,
        category: doc.category,
        domain: doc.domain,
        fileName: name,
        size: doc.file?.size || 0,
        mimeType: doc.file?.mimeType || 'application/octet-stream',
        checksumSha256: doc.file?.checksumSha256 || '',
        source,
      });
    } catch (error) {
      manifest.missing.push({ id: String(doc._id), title: doc.title, error: error.message });
    }
  }

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  await archive.finalize();
}

router.get('/export/full/snapshot.zip', async (req, res) => {
  try {
    await streamZipExport(
      req,
      res,
      { status: 'published', visibility: 'public' },
      `pva-library-full-${new Date().toISOString().slice(0, 10)}.zip`,
    );
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/export/category/:category/archive.zip', async (req, res) => {
  try {
    const category = String(req.params.category || '')
      .trim()
      .toLowerCase();
    if (!category) return res.status(400).json({ ok: false, error: 'Category is required' });
    await streamZipExport(
      req,
      res,
      { status: 'published', visibility: 'public', category },
      `pva-library-${category}-${new Date().toISOString().slice(0, 10)}.zip`,
    );
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
