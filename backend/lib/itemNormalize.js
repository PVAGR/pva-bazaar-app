// backend/lib/itemNormalize.js
const slugify = require('slugify');

function normalizeItemInput(body = {}) {
  // Accept legacy and canonical inputs
  const name = body.name || body.title || '';
  const category = body.category || '';
  const description = body.description || '';
  const media = body.media || body.imageUrls || [];
  const tags = body.tags || body.materials || [];
  const status = body.status || 'published';
  const priceCents = body.priceCents || (body.salePrice ? Math.round(Number(body.salePrice) * 100) : (body.price ? Math.round(Number(body.price) * 100) : 0));
  const currency = body.currency || 'USD';
  let slug = body.slug || '';
  if (!slug && name) {
    slug = slugify(name, { lower: true, strict: true });
  }
  return {
    name,
    category,
    description,
    media: Array.isArray(media) ? media : [media],
    tags: Array.isArray(tags) ? tags : [tags],
    status,
    priceCents,
    currency,
    slug,
  };
}

function toPublicItem(doc) {
  if (!doc) return null;
  // Compute canonical fields from Artifact doc
  const name = doc.name || doc.title || '';
  const category = doc.category || '';
  const description = doc.description || '';
  const media = doc.imageUrls || doc.media || [];
  const tags = doc.tags || doc.materials || [];
  const status = doc.status || 'published';
  const priceCents = doc.priceCents || (doc.salePrice ? Math.round(Number(doc.salePrice) * 100) : (doc.price ? Math.round(Number(doc.price) * 100) : 0));
  const currency = doc.currency || 'USD';
  let slug = doc.slug;
  if (!slug && name) {
    slug = slugify(name, { lower: true, strict: true });
  }
  return {
    id: doc._id ? String(doc._id) : undefined,
    slug,
    name,
    category,
    description,
    priceCents,
    currency,
    media: Array.isArray(media) ? media : [media],
    tags: Array.isArray(tags) ? tags : [tags],
    status,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}

module.exports = {
  normalizeItemInput,
  toPublicItem,
};
