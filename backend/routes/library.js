const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const axios = require('axios');
const archiver = require('archiver');
const LibraryDocument = require('../models/LibraryDocument');

const LIBRARY_UPLOAD_DIR = path.join(__dirname, '../uploads/library');

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

router.get('/', async (req, res) => {
  try {
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
    const item = await LibraryDocument.findOne({
      _id: req.params.id,
      status: 'published',
      visibility: 'public',
    })
      .select('-storage.backup.localFilename')
      .lean();

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
    const category = String(req.params.category || '').trim().toLowerCase();
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