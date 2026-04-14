// backend/services/searchService.js - Product search and filtering
const ProductType = require('../models/ProductType');

/**
 * Search products with full-text and filters
 */
async function searchProducts(query, filters = {}, options = {}) {
  const {
    page = 1,
    limit = 50,
    sort = '-createdAt',
    type,
    minPrice,
    maxPrice,
    country,
    rating,
  } = { ...filters, ...options };

  const skip = (Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 1000);

  // Build search query
  const searchQuery = {};

  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }

  // Type filter
  if (type) {
    searchQuery.type = type;
  }

  // Price range
  if (minPrice || maxPrice) {
    searchQuery.price = {};
    if (minPrice) searchQuery.price.$gte = parseFloat(minPrice);
    if (maxPrice) searchQuery.price.$lte = parseFloat(maxPrice);
  }

  // Country filter
  if (country) {
    searchQuery['creatorInfo.country'] = country;
  }

  // Rating filter
  if (rating) {
    searchQuery['rating.avg'] = { $gte: parseFloat(rating) };
  }

  // Status
  searchQuery.status = 'active';

  try {
    // Execute search
    const [products, total] = await Promise.all([
      ProductType.find(searchQuery)
        .populate('sellerId', 'name email')
        .populate('shopId', 'shopName slug')
        .sort(sort)
        .skip(skip)
        .limit(Math.min(limit, 1000))
        .lean(),
      ProductType.countDocuments(searchQuery),
    ]);

    return {
      ok: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    console.error('❌ Search failed:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Advanced filtering with aggregation
 */
async function getProductFilters() {
  try {
    // Get price range
    const priceStats = await ProductType.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
    ]);

    // Get types
    const types = await ProductType.distinct('type', { status: 'active' });

    // Get countries
    const countries = await ProductType.distinct('creatorInfo.country', {
      status: 'active',
    });

    // Get rating ranges
    const ratings = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];

    return {
      ok: true,
      filters: {
        price: priceStats[0] || { minPrice: 0, maxPrice: 10000 },
        types,
        countries: countries.sort(),
        ratings,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Trending products
 */
async function getTrendingProducts(limit = 12) {
  try {
    const products = await ProductType.find({ status: 'active' })
      .sort({ 'analytics.views': -1 })
      .limit(limit)
      .populate('sellerId', 'name')
      .populate('shopId', 'shopName')
      .lean();

    return { ok: true, products };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Related products
 */
async function getRelatedProducts(productId, limit = 8) {
  try {
    const product = await ProductType.findById(productId).lean();
    if (!product) return { ok: false, error: 'Product not found' };

    const related = await ProductType.find({
      _id: { $ne: productId },
      $or: [
        { type: product.type },
        { materials: { $in: product.materials } },
        { tags: { $in: product.tags } },
      ],
      status: 'active',
    })
      .limit(limit)
      .populate('sellerId', 'name')
      .populate('shopId', 'shopName')
      .lean();

    return { ok: true, products: related };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Category products
 */
async function getProductsByCategory(category, page = 1, limit = 50) {
  const skip = (Math.max(1, page) - 1) * limit;

  try {
    const [products, total] = await Promise.all([
      ProductType.find({ type: category, status: 'active' })
        .sort({ 'rating.avg': -1 })
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'name')
        .populate('shopId', 'shopName')
        .lean(),
      ProductType.countDocuments({ type: category, status: 'active' }),
    ]);

    return {
      ok: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  searchProducts,
  getProductFilters,
  getTrendingProducts,
  getRelatedProducts,
  getProductsByCategory,
};
