// backend/lib/archiveNormalize.js
// Canonical ArchiveEntry normalization and serialization

function normalizeArchiveInput(body = {}) {
  // Accept legacy and new field names, normalize to canonical
  return {
    title: body.title || 'Untitled',
    category: body.category || 'journal',
    description: body.description || body.excerpt || '',
    content: body.content || body.contentHtml || '',
    wordCount: typeof body.wordCount === 'number' ? body.wordCount : parseInt(body.wordCount || '0', 10),
    tags: Array.isArray(body.tags) ? body.tags : [],
    media: Array.isArray(body.media) ? body.media : [],
    location: body.location || '',
    externalId: body.externalId || body.id || '',
  };
}

function toPublicArchiveEntry(doc) {
  if (!doc) return null;
  // Accepts a Mongoose doc or plain object
  return {
    id: doc._id ? doc._id.toString() : doc.id || '',
    title: doc.title || '',
    category: doc.category || 'journal',
    description: doc.description || doc.excerpt || '',
    content: doc.content || doc.contentHtml || '',
    wordCount: typeof doc.wordCount === 'number' ? doc.wordCount : parseInt(doc.wordCount || '0', 10),
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    media: Array.isArray(doc.media) ? doc.media : [],
    location: doc.location || '',
    externalId: doc.externalId || doc.id || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
  };
}

module.exports = {
  normalizeArchiveInput,
  toPublicArchiveEntry,
};
