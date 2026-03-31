const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const LibraryDocument = require('../models/LibraryDocument');
const adminSession = require('../middleware/adminSession');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const LIBRARY_UPLOAD_DIR = path.join(__dirname, '../uploads/library');

function sanitizeFilename(name) {
  return path.basename(String(name || 'file')).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(raw)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

async function ensureUploadsDir() {
  await fs.mkdir(LIBRARY_UPLOAD_DIR, { recursive: true });
}

async function writeLocalFile(buffer, originalName, prefix) {
  await ensureUploadsDir();
  const filename = `${Date.now()}-${prefix}-${sanitizeFilename(originalName)}`;
  const filePath = path.join(LIBRARY_UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return {
    provider: 'local',
    localFilename: filename,
    url: `/api/admin/library/local/${encodeURIComponent(filename)}`,
  };
}

async function uploadPrimary(buffer, originalName, folder) {
  if (!isCloudinaryConfigured()) {
    return writeLocalFile(buffer, originalName, 'primary');
  }

  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
        use_filename: true,
        unique_filename: true,
      },
      (error, data) => {
        if (error) reject(error);
        else resolve(data);
      },
    );
    stream.end(buffer);
  });

  return {
    provider: 'cloudinary',
    url: result.secure_url,
    publicId: result.public_id,
    localFilename: '',
  };
}

async function resolveDocumentReadStream(doc) {
  const primary = doc?.storage?.primary || {};
  const backup = doc?.storage?.backup || {};

  if (primary.provider === 'local' && primary.localFilename) {
    const localPath = path.join(LIBRARY_UPLOAD_DIR, path.basename(primary.localFilename));
    await fs.stat(localPath);
    return fs.createReadStream(localPath);
  }

  if (backup.provider === 'local' && backup.localFilename) {
    const backupPath = path.join(LIBRARY_UPLOAD_DIR, path.basename(backup.localFilename));
    await fs.stat(backupPath);
    return fs.createReadStream(backupPath);
  }

  if (primary.url && /^https?:\/\//i.test(primary.url)) {
    const axios = require('axios');
    const response = await axios.get(primary.url, { responseType: 'stream', timeout: 15000 });
    return response.data;
  }

  throw new Error('No readable file source found');
}

router.get('/', adminSession, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 100, 200));
    const category = req.query.category ? String(req.query.category).trim() : '';
    const domain = req.query.domain ? String(req.query.domain).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';
    const q = req.query.q ? String(req.query.q).trim() : '';

    const filter = {};
    if (category) filter.category = category;
    if (domain) filter.domain = domain;
    if (status) filter.status = status;
    if (q) filter.$text = { $search: q };

    const docs = await LibraryDocument.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, items: docs });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/', adminSession, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const title = String(req.body.title || req.file.originalname).trim();
    if (!title) {
      return res.status(400).json({ ok: false, error: 'Title is required' });
    }

    const checksum = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const category = String(req.body.category || 'general').trim().toLowerCase();
    const domain = String(req.body.domain || 'general').trim().toLowerCase();
    const tags = parseTags(req.body.tags);
    const status = req.body.status === 'published' ? 'published' : 'draft';
    const visibility = req.body.visibility === 'admin-only' ? 'admin-only' : 'public';
    const skillLevel = ['intro', 'intermediate', 'advanced'].includes(req.body.skillLevel)
      ? req.body.skillLevel
      : 'intro';
    const language = String(req.body.language || 'en').trim().toLowerCase();

    const primary = await uploadPrimary(req.file.buffer, req.file.originalname, 'pva-bazaar-library');
    const backup = await writeLocalFile(req.file.buffer, req.file.originalname, 'backup');

    const item = new LibraryDocument({
      title,
      description: String(req.body.description || '').trim(),
      category,
      domain,
      tags,
      status,
      visibility,
      skillLevel,
      language,
      storage: {
        primary,
        backup: {
          provider: 'local',
          url: backup.url,
          localFilename: backup.localFilename,
        },
      },
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype || 'application/octet-stream',
        checksumSha256: checksum,
      },
      createdBy: req.admin?.username || req.admin?.email || 'admin',
    });

    await item.save();

    return res.status(201).json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/:id', adminSession, async (req, res) => {
  try {
    const updates = {};
    const mutableFields = [
      'title',
      'description',
      'category',
      'domain',
      'language',
      'status',
      'visibility',
      'skillLevel',
    ];

    mutableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = String(req.body[field]).trim();
      }
    });

    if (req.body.tags !== undefined) {
      updates.tags = parseTags(req.body.tags);
    }

    if (updates.status && !['draft', 'published'].includes(updates.status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    if (updates.visibility && !['public', 'admin-only'].includes(updates.visibility)) {
      return res.status(400).json({ ok: false, error: 'Invalid visibility' });
    }

    if (updates.skillLevel && !['intro', 'intermediate', 'advanced'].includes(updates.skillLevel)) {
      return res.status(400).json({ ok: false, error: 'Invalid skillLevel' });
    }

    const item = await LibraryDocument.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!item) {
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }

    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', adminSession, async (req, res) => {
  try {
    const item = await LibraryDocument.findByIdAndDelete(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }

    // Best effort cleanup for local backup files.
    const localFiles = [
      item?.storage?.primary?.provider === 'local' ? item?.storage?.primary?.localFilename : null,
      item?.storage?.backup?.provider === 'local' ? item?.storage?.backup?.localFilename : null,
    ].filter(Boolean);

    for (const filename of localFiles) {
      try {
        const filePath = path.join(LIBRARY_UPLOAD_DIR, path.basename(filename));
        await fs.unlink(filePath);
      } catch (_error) {
        // Ignore cleanup errors to keep delete idempotent.
      }
    }

    return res.json({ ok: true, message: 'Document deleted', item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/:id/download', adminSession, async (req, res) => {
  try {
    const doc = await LibraryDocument.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ ok: false, error: 'Document not found' });
    }

    const stream = await resolveDocumentReadStream(doc);
    const safeName = sanitizeFilename(doc?.file?.originalName || `${doc.title}.bin`);

    res.setHeader('Content-Type', doc.file?.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    stream.pipe(res);

    doc.downloadCount = (doc.downloadCount || 0) + 1;
    await doc.save();
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/local/:filename', adminSession, async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(LIBRARY_UPLOAD_DIR, safeFilename);
    await fs.stat(filePath);
    return res.sendFile(filePath);
  } catch (_error) {
    return res.status(404).json({ ok: false, error: 'File not found' });
  }
});

module.exports = router;