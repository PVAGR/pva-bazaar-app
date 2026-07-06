const Shop = require('../models/Shop');
const SellerProfile = require('../models/SellerProfile');
const ShopFollower = require('../models/ShopFollower');
const Artifact = require('../models/Artifact');

/**
 * Shop Service
 * Business logic for shop management, analytics, product listing
 */

/**
 * Create a new shop for a seller
 */
async function createShop(userId, shopData) {
  // Check if user already has a shop
  const existingShop = await Shop.findOne({ userId });
  if (existingShop) {
    throw new Error('User already has a shop');
  }

  // Generate slug from shop name
  const slug = generateSlug(shopData.shopName);

  const shop = new Shop({
    userId,
    shopName: shopData.shopName,
    slug,
    description: shopData.description || '',
    story: shopData.story || '',
    tags: shopData.tags || [],
    categories: shopData.categories || [],
    contactMessage: shopData.contactMessage || '',
    status: 'draft', // Start as draft until seller completes setup
  });

  await shop.save();

  // Create associated seller profile
  const profile = new SellerProfile({
    userId,
    shopId: shop._id,
    businessType: shopData.businessType || 'individual',
  });

  await profile.save();

  return shop;
}

/**
 * Update shop details
 */
async function updateShop(shopId, updates, userId) {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  if (shop.userId.toString() !== userId.toString()) {
    throw new Error('Unauthorized: not shop owner');
  }

  // Only allow certain fields to be updated
  const allowedFields = [
    'shopName',
    'description',
    'story',
    'bannerUrl',
    'logoUrl',
    'accentColor',
    'theme',
    'tags',
    'categories',
    'socialLinks',
    'shippingPolicy',
    'returnsPolicy',
    'privacyPolicy',
    'termsOfService',
    'faqText',
    'contactMessage',
    'acceptedPaymentMethods',
    'currencyPreference',
    'visibility',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      shop[field] = updates[field];
    }
  }

  shop.updatedAt = new Date();
  await shop.save();

  return shop;
}

/**
 * Publish shop (move from draft to live)
 */
async function publishShop(shopId, userId) {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  if (shop.userId.toString() !== userId.toString()) {
    throw new Error('Unauthorized: not shop owner');
  }

  if (shop.status === 'live') {
    throw new Error('Shop is already live');
  }

  // Validate minimum requirements
  if (!shop.shopName || !shop.slug) {
    throw new Error('Shop name is required');
  }

  shop.status = 'live';
  shop.launchedAt = new Date();
  await shop.save();

  return shop;
}

/**
 * Get shop details with related data
 */
async function getShopDetails(shopId) {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  // Get seller profile
  const profile = await SellerProfile.findOne({ shopId: shop._id });

  // Get follower count
  const followerCount = await ShopFollower.countDocuments({ shopId: shop._id });

  // Get product count
  const productCount = await Artifact.countDocuments({
    createdBy: shop.userId,
    status: 'published',
  });

  return {
    shop: shop.toObject(),
    profile: profile ? profile.toObject() : null,
    stats: {
      followers: followerCount,
      products: productCount,
      views: shop.analytics.totalViews,
      orders: shop.analytics.totalOrders,
      revenue: shop.analytics.totalRevenue,
      rating: shop.analytics.avgRating,
    },
  };
}

/**
 * Get seller's own shop
 */
async function getMyShop(userId) {
  const shop = await Shop.findOne({ userId });

  if (!shop) {
    throw new Error('No shop found for this user');
  }

  return await getShopDetails(shop._id);
}

/**
 * Get products for a shop
 */
async function getShopProducts(shopId, page = 1, limit = 20) {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  const skip = (page - 1) * limit;

  const products = await Artifact.find({
    createdBy: shop.userId,
    status: 'published',
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Artifact.countDocuments({
    createdBy: shop.userId,
    status: 'published',
  });

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
 * Follow a shop
 */
async function followShop(shopId, userId) {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  // Check if already following
  const existing = await ShopFollower.findOne({ shopId, userId });

  if (existing) {
    throw new Error('Already following this shop');
  }

  const follower = new ShopFollower({
    shopId,
    userId,
  });

  await follower.save();

  // Increment shop follower count
  shop.analytics.totalFollowers += 1;
  await shop.save();

  return follower;
}

/**
 * Unfollow a shop
 */
async function unfollowShop(shopId, userId) {
  const shop = await Shop.findById(shopId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  const result = await ShopFollower.deleteOne({ shopId, userId });

  if (result.deletedCount > 0) {
    // Decrement shop follower count
    shop.analytics.totalFollowers = Math.max(0, shop.analytics.totalFollowers - 1);
    await shop.save();
  }

  return { unfollowed: result.deletedCount > 0 };
}

/**
 * Check if user is following a shop
 */
async function isFollowingShop(shopId, userId) {
  const follower = await ShopFollower.findOne({ shopId, userId });
  return Boolean(follower);
}

/**
 * Get shop followers
 */
async function getShopFollowers(shopId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const followers = await ShopFollower.find({ shopId })
    .populate('userId', 'name email')
    .skip(skip)
    .limit(limit);

  const total = await ShopFollower.countDocuments({ shopId });

  return {
    followers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Generate URL-safe slug
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .slice(0, 50); // Limit length
}

/**
 * Track shop view (analytics)
 */
async function trackShopView(shopId) {
  await Shop.updateOne({ _id: shopId }, { $inc: { 'analytics.totalViews': 1 } });
}

/**
 * Search shops by name/tags
 */
async function searchShops(query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const searchFilter = {
    status: 'live',
    $or: [
      { shopName: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ],
  };

  const shops = await Shop.find(searchFilter)
    .sort({ 'analytics.totalViews': -1 })
    .skip(skip)
    .limit(limit);

  const total = await Shop.countDocuments(searchFilter);

  return {
    shops,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get trending/top shops
 */
async function getTrendingShops(limit = 10) {
  return await Shop.find({ status: 'live' }).sort({ 'analytics.totalViews': -1 }).limit(limit);
}

/**
 * Get top-rated shops
 */
async function getTopRatedShops(limit = 10, minReviews = 5) {
  return await Shop.find({
    status: 'live',
    'analytics.reviewCount': { $gte: minReviews },
  })
    .sort({ 'analytics.avgRating': -1 })
    .limit(limit);
}

module.exports = {
  createShop,
  updateShop,
  publishShop,
  getShopDetails,
  getMyShop,
  getShopProducts,
  followShop,
  unfollowShop,
  isFollowingShop,
  getShopFollowers,
  trackShopView,
  searchShops,
  getTrendingShops,
  getTopRatedShops,
};
