// backend/lib/itemNormalize.js
const slugify = require('slugify');

function normalizeItemInput(body = {}) {
  // Accept legacy and canonical inputs and map to Artifact schema.
  const name = body.name || body.title || '';
  const title = body.title || body.name || '';
  const category = body.category || '';
  const description = body.description || '';
  const rawMedia = body.imageUrls || body.media || body.images || [];
  const tags = body.tags || body.materials || [];
  const materials = body.materials || body.tags || [];
  const status = body.status || 'published';
  const salePrice = body.salePrice ? Number(body.salePrice) : undefined;
  const price =
    typeof body.price === 'number'
      ? body.price
      : body.price
        ? Number(body.price)
        : body.priceCents
          ? Number(body.priceCents) / 100
          : 0;
  let slug = body.slug || '';
  if (!slug && name) {
    slug = slugify(name, { lower: true, strict: true });
  }
  const imageUrls = Array.isArray(rawMedia) ? rawMedia : [rawMedia];
  const normalized = {
    name,
    title,
    category,
    description,
    imageUrls,
    tags: Array.isArray(tags) ? tags : [tags],
    materials: Array.isArray(materials) ? materials : [materials],
    status,
    price,
    salePrice,
    slug,
    artisan: body.artisan || 'PVA Artisan',
  };
  if (body.creator) {
    normalized.creator = body.creator;
  }
  return normalized;
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
  const stockQty = doc.stockQty != null ? Number(doc.stockQty) : undefined;
  const lore = doc.lore || doc.description || '';
  return {
    id: doc._id ? String(doc._id) : undefined,
    slug,
    name,
    category,
    description,
    lore: typeof lore === 'string' ? lore : '',
    priceCents,
    currency,
    media: Array.isArray(media) ? media : [media],
    tags: Array.isArray(tags) ? tags : [tags],
    status,
    stockQty,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}

module.exports = {
  normalizeItemInput,
  toPublicItem,
};
