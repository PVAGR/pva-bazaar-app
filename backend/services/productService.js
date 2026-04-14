// backend/services/productService.js - Multi-product type management
const ProductType = require('../models/ProductType');
const DigitalProduct = require('../models/DigitalProduct');
const Course = require('../models/Course');
const ExpertService = require('../models/ExpertService');
const Shop = require('../models/Shop');

/**
 * Create a new product of any type
 */
async function createProduct(creatorId, productData) {
  const productType = productData.productType;

  if (!['physical_good', 'digital_download', 'course', 'expertise', 'nft', 'service'].includes(productType)) {
    throw new Error('Invalid product type');
  }

  // Find creator's shop
  const shop = await Shop.findOne({ userId: creatorId });

  const product = new ProductType({
    ...productData,
    createdBy: creatorId,
    shopId: shop?._id,
  });

  await product.save();

  // Create type-specific document
  if (productType === 'digital_download') {
    const digital = new DigitalProduct({
      productId: product._id,
      sellerId: creatorId,
      deliveryMethod: productData.deliveryMethod || 'instant',
      downloadLimit: productData.downloadLimit,
      expiresAt: productData.expiresAt,
    });
    await digital.save();
  } else if (productType === 'course') {
    const course = new Course({
      productId: product._id,
      creatorId,
      title: productData.name,
      description: productData.description,
      skillLevel: productData.skillLevel || 'beginner',
      modules: [],
    });
    await course.save();
  } else if (productType === 'expertise' || productType === 'service') {
    const service = new ExpertService({
      productId: product._id,
      sellerId: creatorId,
      title: productData.name,
      description: productData.description,
      hourlyRate: productData.hourlyRate,
      expertise: productData.expertise || [],
    });
    await service.save();
  }

  return product;
}

/**
 * Get product with type-specific details
 */
async function getProductWithDetails(productId) {
  const product = await ProductType.findById(productId);
  if (!product) return null;

  let typeSpecific = null;

  switch (product.productType) {
    case 'digital_download':
      typeSpecific = await DigitalProduct.findOne({ productId });
      break;
    case 'course':
      typeSpecific = await Course.findOne({ productId });
      break;
    case 'expertise':
    case 'service':
      typeSpecific = await ExpertService.findOne({ productId });
      break;
  }

  return {
    product,
    [product.productType]: typeSpecific,
  };
}

/**
 * Filter products by type
 */
async function filterProductsByType(productType, filters = {}) {
  const query = { productType, status: 'published' };

  if (filters.sellerId) {
    query.createdBy = filters.sellerId;
  }
  if (filters.shopId) {
    query.shopId = filters.shopId;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.tags) {
    query.tags = { $in: filters.tags };
  }
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, filters.limit || 20);
  const skip = (page - 1) * limit;

  const products = await ProductType.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await ProductType.countDocuments(query);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Search products across all types
 */
async function searchProducts(query, limit = 20) {
  const searchQuery = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } },
    ],
    status: 'published',
  };

  const products = await ProductType.find(searchQuery)
    .limit(limit)
    .lean();

  return products;
}

/**
 * Update product (owner only)
 */
async function updateProduct(productId, userId, updates) {
  const product = await ProductType.findById(productId);
  if (!product) throw new Error('Product not found');
  if (product.createdBy.toString() !== userId.toString()) {
    throw new Error('Unauthorized');
  }

  // Don't allow changing product type
  if (updates.productType) {
    throw new Error('Cannot change product type after creation');
  }

  const updated = await ProductType.findByIdAndUpdate(productId, updates, { new: true });
  return updated;
}

/**
 * Get seller's products with pagination
 */
async function getSellerProducts(creatorId, filters = {}) {
  const query = { createdBy: creatorId };

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.productType) {
    query.productType = filters.productType;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, filters.limit || 20);
  const skip = (page - 1) * limit;

  const products = await ProductType.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await ProductType.countDocuments(query);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get trending products (by views and purchases)
 */
async function getTrendingProducts(limit = 10) {
  const products = await ProductType.find({ status: 'published' })
    .sort({ 'analytics.views': -1, 'analytics.purchases': -1 })
    .limit(limit)
    .lean();

  return products;
}

/**
 * Track product view
 */
async function trackProductView(productId) {
  await ProductType.findByIdAndUpdate(productId, {
    $inc: { 'analytics.views': 1 },
  });
}

/**
 * Track product click from listing
 */
async function trackProductClick(productId) {
  await ProductType.findByIdAndUpdate(productId, {
    $inc: { 'analytics.clicks': 1 },
  });
}

/**
 * Add product to cart (track for analytics)
 */
async function trackProductCartAdd(productId) {
  await ProductType.findByIdAndUpdate(productId, {
    $inc: { 'analytics.cartAdds': 1 },
  });
}

/**
 * Record product purchase
 */
async function recordProductPurchase(productId, amount) {
  await ProductType.findByIdAndUpdate(productId, {
    $inc: {
      'analytics.purchases': 1,
      'analytics.revenue': amount,
    },
  });
}

module.exports = {
  createProduct,
  getProductWithDetails,
  filterProductsByType,
  searchProducts,
  updateProduct,
  getSellerProducts,
  getTrendingProducts,
  trackProductView,
  trackProductClick,
  trackProductCartAdd,
  recordProductPurchase,
};
