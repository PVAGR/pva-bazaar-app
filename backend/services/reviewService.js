// backend/services/reviewService.js - Review management and rating aggregation
const Review = require('../models/Review');
const ProductType = require('../models/ProductType');
const User = require('../models/User');

/**
 * Create a product review
 */
async function createProductReview(reviewerId, productId, reviewData) {
  const product = await ProductType.findById(productId);
  if (!product) throw new Error('Product not found');

  const review = new Review({
    reviewType: 'product',
    productId,
    sellerId: product.createdBy,
    reviewerId,
    rating: reviewData.rating,
    title: reviewData.title,
    comment: reviewData.comment,
    orderId: reviewData.orderId,
    verifiedPurchase: reviewData.verifiedPurchase || false,
    aspects: reviewData.aspects || [],
    photos: reviewData.photos || [],
  });

  await review.save();

  // Update product rating aggregate
  await updateProductRating(productId);

  return review;
}

/**
 * Create a seller review
 */
async function createSellerReview(reviewerId, sellerId, reviewData) {
  const seller = await User.findById(sellerId);
  if (!seller) throw new Error('Seller not found');

  const review = new Review({
    reviewType: 'seller',
    sellerId,
    reviewerId,
    rating: reviewData.rating,
    title: reviewData.title,
    comment: reviewData.comment,
    orderId: reviewData.orderId,
    verifiedPurchase: reviewData.verifiedPurchase || false,
    aspects: reviewData.aspects || [],
  });

  await review.save();

  // Update seller rating aggregate (via SellerProfile or Shop)
  await updateSellerRating(sellerId);

  return review;
}

/**
 * Get reviews for a product with pagination
 */
async function getProductReviews(productId, filters = {}) {
  const query = {
    reviewType: 'product',
    productId,
    published: true,
  };

  if (filters.minRating) {
    query.rating = { $gte: filters.minRating };
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, filters.limit || 10);
  const skip = (page - 1) * limit;

  // Sort by relevance (verified + helpful first)
  let sort = { verifiedPurchase: -1, helpful: -1, createdAt: -1 };
  if (filters.sort === 'recent') {
    sort = { createdAt: -1 };
  } else if (filters.sort === 'rating-high') {
    sort = { rating: -1 };
  } else if (filters.sort === 'rating-low') {
    sort = { rating: 1 };
  }

  const reviews = await Review.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('reviewerId', 'name avatar');

  const total = await Review.countDocuments(query);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get reviews for a seller
 */
async function getSellerReviews(sellerId, filters = {}) {
  const query = {
    reviewType: 'seller',
    sellerId,
    published: true,
  };

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, filters.limit || 10);
  const skip = (page - 1) * limit;

  const reviews = await Review.find(query)
    .sort({ verifiedPurchase: -1, helpful: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('reviewerId', 'name avatar');

  const total = await Review.countDocuments(query);

  return {
    reviews,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Update product rating aggregate
 */
async function updateProductRating(productId) {
  const reviews = await Review.find({
    reviewType: 'product',
    productId,
    published: true,
  });

  if (reviews.length === 0) {
    await ProductType.findByIdAndUpdate(productId, {
      'analytics.rating': 0,
      'analytics.reviewCount': 0,
    });
    return;
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await ProductType.findByIdAndUpdate(productId, {
    'analytics.rating': Math.round(avgRating * 10) / 10,
    'analytics.reviewCount': reviews.length,
  });
}

/**
 * Update seller rating aggregate
 */
async function updateSellerRating(sellerId) {
  const reviews = await Review.find({
    reviewType: 'seller',
    sellerId,
    published: true,
  });

  if (reviews.length === 0) return;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const positiveCount = reviews.filter((r) => r.rating >= 4).length;
  const satisfactionRate = Math.round((positiveCount / reviews.length) * 100);

  // Update SellerProfile
  const SellerProfile = require('../models/SellerProfile');
  await SellerProfile.findOneAndUpdate(
    { userId: sellerId },
    {
      averageRating: Math.round(avgRating * 10) / 10,
    }
  );
}

/**
 * Mark review as helpful
 */
async function markReviewHelpful(reviewId, userId) {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error('Review not found');

  // Check if user already marked
  if (review.helperIds.includes(userId)) {
    return review;
  }

  review.helpful += 1;
  review.helperIds.push(userId);

  await review.save();
  return review;
}

/**
 * Add seller response to review
 */
async function addSellerResponse(reviewId, sellerId, response) {
  const review = await Review.findById(reviewId);
  if (!review) throw new Error('Review not found');

  // Verify seller ownership
  if (review.sellerId.toString() !== sellerId.toString()) {
    throw new Error('Unauthorized');
  }

  review.sellerResponse = {
    comment: response,
    respondedAt: new Date(),
  };

  await review.save();
  return review;
}

/**
 * Get review summary (distribution by stars)
 */
async function getReviewSummary(productId) {
  const reviews = await Review.find({
    reviewType: 'product',
    productId,
    published: true,
  });

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const aspects = {};

  reviews.forEach((review) => {
    distribution[review.rating] += 1;
    review.aspects?.forEach((aspect) => {
      if (!aspects[aspect.aspect]) {
        aspects[aspect.aspect] = [];
      }
      aspects[aspect.aspect].push(aspect.rating);
    });
  });

  // Calculate aspect averages
  const aspectAverages = {};
  for (const [key, ratings] of Object.entries(aspects)) {
    aspectAverages[key] = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  }

  return {
    totalReviews: reviews.length,
    averageRating: reviews.length > 0 ? Math.round((distribution[5] * 5 + distribution[4] * 4 + distribution[3] * 3 + distribution[2] * 2 + distribution[1] * 1) / reviews.length * 10) / 10 : 0,
    distribution,
    aspectAverages,
  };
}

module.exports = {
  createProductReview,
  createSellerReview,
  getProductReviews,
  getSellerReviews,
  updateProductRating,
  updateSellerRating,
  markReviewHelpful,
  addSellerResponse,
  getReviewSummary,
};
