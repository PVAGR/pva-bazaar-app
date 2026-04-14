// backend/services/pricingService.js - Fair market pricing algorithm and intelligence
const MarketData = require('../models/MarketData');
const PricingHistory = require('../models/PricingHistory');
const PricingRecommendation = require('../models/PricingRecommendation');
const FraudFlag = require('../models/FraudFlag');
const ProductType = require('../models/ProductType');

/**
 * Calculate fair market price for a product
 */
async function calculateFairPrice(productId, sellerInputs = {}) {
  const product = await ProductType.findById(productId);
  if (!product) throw new Error('Product not found');

  // Get market data for this category
  const marketData = await MarketData.findOne({
    category: sellerInputs.category || product.category,
    productType: product.productType,
  });

  if (!marketData) {
    // Fallback: use product's listed price if no market data
    return {
      recommendedPrice: product.price,
      confidence: 20,
      reason: 'Insufficient market data - using listing price',
    };
  }

  // Start with market average
  const basePrice = marketData.avgPrice;

  // Apply market condition adjustments
  const adjustments = [];

  // 1. Demand adjustment (rising demand = higher price)
  let demandMultiplier = 1.0;
  if (marketData.demandTrend === 'rising') {
    demandMultiplier = 1.0 + marketData.demandChangePercent / 100;
    adjustments.push({
      factor: 'demand_trend',
      multiplier: demandMultiplier,
      impact: marketData.demandChangePercent,
    });
  } else if (marketData.demandTrend === 'falling') {
    demandMultiplier = 1.0 - Math.abs(marketData.demandChangePercent) / 100;
    adjustments.push({
      factor: 'demand_trend',
      multiplier: demandMultiplier,
      impact: -Math.abs(marketData.demandChangePercent),
    });
  }

  // 2. Seasonality
  const seasonalMultiplier = marketData.seasonalMultiplier || 1.0;
  if (seasonalMultiplier !== 1.0) {
    adjustments.push({
      factor: 'seasonality',
      multiplier: seasonalMultiplier,
      season: marketData.season,
    });
  }

  // 3. Urgency modifier
  let urgencyMultiplier = 1.0;
  if (sellerInputs.urgency === 'urgent') {
    urgencyMultiplier = 0.85; // 15% discount for quick sale
  } else if (sellerInputs.urgency === 'clearance') {
    urgencyMultiplier = 0.70; // 30% discount
  } else if (sellerInputs.urgency === 'exclusive') {
    urgencyMultiplier = 1.3; // 30% premium for exclusive
  }
  if (urgencyMultiplier !== 1.0) {
    adjustments.push({
      factor: 'urgency',
      multiplier: urgencyMultiplier,
      urgency: sellerInputs.urgency,
    });
  }

  // 4. Condition adjustment
  let conditionMultiplier = 1.0;
  if (sellerInputs.condition === 'like_new') {
    conditionMultiplier = 1.1;
  } else if (sellerInputs.condition === 'good') {
    conditionMultiplier = 0.95;
  } else if (sellerInputs.condition === 'fair') {
    conditionMultiplier = 0.80;
  } else if (sellerInputs.condition === 'poor') {
    conditionMultiplier = 0.60;
  }
  adjustments.push({
    factor: 'condition',
    multiplier: conditionMultiplier,
    condition: sellerInputs.condition || 'unknown',
  });

  // 5. Premium factors (certified, limited edition, designer)
  let premiumMultiplier = 1.0;
  if (sellerInputs.premiumFactors && sellerInputs.premiumFactors.length > 0) {
    premiumMultiplier = 1.0;
    sellerInputs.premiumFactors.forEach((factor) => {
      const marketFactor = marketData.premiumFactors?.find((f) => f.name === factor);
      if (marketFactor) {
        premiumMultiplier *= marketFactor.priceMultiplier;
      }
    });
    adjustments.push({
      factor: 'premium',
      multiplier: premiumMultiplier,
      premiumFactors: sellerInputs.premiumFactors,
    });
  }

  // 6. Cost basis validation
  let costMultiplier = 1.0;
  if (sellerInputs.costBasis && sellerInputs.desiredMargin) {
    const minPrice = sellerInputs.costBasis * (1 + sellerInputs.desiredMargin / 100);
    if (basePrice < minPrice) {
      costMultiplier = minPrice / basePrice;
      adjustments.push({
        factor: 'cost_basis',
        multiplier: costMultiplier,
        minPriceForMargin: minPrice,
      });
    }
  }

  // Calculate final recommended price
  let recommendedPrice = basePrice * demandMultiplier * seasonalMultiplier * urgencyMultiplier * conditionMultiplier * premiumMultiplier * costMultiplier;

  // Round to nearest cent
  recommendedPrice = Math.round(recommendedPrice);

  // Ensure within market bounds (with 10% buffer)
  const lowerBound = Math.round(marketData.minPrice * 0.9);
  const upperBound = Math.round(marketData.maxPrice * 1.1);

  if (recommendedPrice < lowerBound) {
    recommendedPrice = lowerBound;
    adjustments.push({
      factor: 'market_floor',
      action: 'capped_to_minimum',
    });
  } else if (recommendedPrice > upperBound) {
    recommendedPrice = upperBound;
    adjustments.push({
      factor: 'market_ceiling',
      action: 'capped_to_maximum',
    });
  }

  // Calculate percentile
  let percentile = 50;
  if (recommendedPrice < marketData.p25) {
    percentile = 25;
  } else if (recommendedPrice < marketData.p50) {
    percentile = Math.round(((recommendedPrice - marketData.p25) / (marketData.p50 - marketData.p25)) * 25 + 25);
  } else if (recommendedPrice < marketData.p75) {
    percentile = Math.round(((recommendedPrice - marketData.p50) / (marketData.p75 - marketData.p50)) * 25 + 50);
  } else {
    percentile = Math.round(((recommendedPrice - marketData.p75) / (marketData.p90 - marketData.p75)) * 25 + 75);
  }

  return {
    recommendedPrice,
    minPrice: lowerBound,
    maxPrice: upperBound,
    marketAvgPrice: marketData.avgPrice,
    marketMedianPrice: marketData.medianPrice,
    pricePercentile: percentile,
    confidence: Math.min(100, marketData.dataQuality || 60),
    adjustments,
    expectedDaysToSell: marketData.avgDaysToSell,
    profitMargin: sellerInputs.costBasis
      ? Math.round(((recommendedPrice - sellerInputs.costBasis) / sellerInputs.costBasis) * 100)
      : null,
  };
}

/**
 * Create pricing recommendation for seller
 */
async function createPricingRecommendation(productId, sellerId, inputs) {
  const fairPrice = await calculateFairPrice(productId, inputs);

  const recommendation = new PricingRecommendation({
    productId,
    sellerId,
    initialPrice: inputs.initialPrice,
    costBasis: inputs.costBasis,
    desiredMargin: inputs.desiredMargin,
    category: inputs.category,
    material: inputs.material,
    condition: inputs.condition,
    urgency: inputs.urgency,
    targetMarketSize: inputs.targetMarketSize,
    recommendedPrice: fairPrice.recommendedPrice,
    minPrice: fairPrice.minPrice,
    maxPrice: fairPrice.maxPrice,
    priceRange: determinePriceRange(fairPrice),
    rationale: {
      marketAvg: fairPrice.marketAvgPrice,
      competitorComparison: compareToMarket(fairPrice.recommendedPrice, fairPrice.marketAvgPrice),
      demandLevel: inputs.demandLevel,
      seasonalAdjustment: fairPrice.adjustments.find((a) => a.factor === 'seasonality')?.impact || 0,
      urgencyAdjustment: fairPrice.adjustments.find((a) => a.factor === 'urgency')?.impact || 0,
      profitMarginResult: fairPrice.profitMargin,
    },
    sellerGuidance: generateSellerGuidance(fairPrice, inputs),
    alternatives: generatePriceAlternatives(fairPrice, inputs),
    warnings: generateWarnings(fairPrice, inputs),
    opportunities: generateOpportunities(fairPrice, inputs),
  });

  await recommendation.save();
  return recommendation;
}

/**
 * Detect suspicious pricing anomalies
 */
async function detectPricingAnomalies(productId, newPrice, previousPrice = null) {
  const product = await ProductType.findById(productId);
  if (!product) return null;

  const marketData = await MarketData.findOne({
    category: product.category,
    productType: product.productType,
  });

  if (!marketData) return null;

  const flags = [];

  // Price spike detection
  if (previousPrice && newPrice > previousPrice * 1.5) {
    flags.push({
      type: 'price_spike',
      severity: 'high',
      deviation: ((newPrice - previousPrice) / previousPrice) * 100,
    });
  }

  // Price dump detection
  if (previousPrice && newPrice < previousPrice * 0.5) {
    flags.push({
      type: 'price_dump',
      severity: 'medium',
      deviation: ((previousPrice - newPrice) / previousPrice) * 100,
    });
  }

  // Market outlier detection
  const marketDeviation = Math.abs((newPrice - marketData.avgPrice) / marketData.avgPrice) * 100;
  if (marketDeviation > 300) {
    // 3x market average
    flags.push({
      type: 'market_outlier',
      severity: 'high',
      deviation: marketDeviation,
    });
  }

  return flags.length > 0 ? flags : null;
}

/**
 * Helper functions
 */

function determinePriceRange(fairPrice) {
  const percentile = fairPrice.pricePercentile;
  if (percentile < 25) return 'value';
  if (percentile < 50) return 'competitive';
  if (percentile < 75) return 'premium';
  return 'luxury';
}

function compareToMarket(recommended, market) {
  const diff = ((recommended - market) / market) * 100;
  if (diff < -10) return 'below';
  if (diff > 10) return 'above';
  return 'at';
}

function generateSellerGuidance(fairPrice, inputs) {
  return `
Your recommended price is ${fairPrice.recommendedPrice} (${fairPrice.pricePercentile}th percentile of market).
This is ${fairPrice.adjustments.length} adjustment(s) from the market average of ${fairPrice.marketAvgPrice}.
Expected days to sell: ${fairPrice.expectedDaysToSell} days.
Expected profit margin: ${fairPrice.profitMargin}%.
  `.trim();
}

function generatePriceAlternatives(fairPrice, inputs) {
  return [
    {
      price: fairPrice.minPrice,
      strategy: 'aggressive_sales',
      expectedDaysToSell: Math.max(1, fairPrice.expectedDaysToSell * 0.6),
      expectedProfitMargin: inputs.costBasis ? ((fairPrice.minPrice - inputs.costBasis) / inputs.costBasis) * 100 : 0,
    },
    {
      price: Math.round((fairPrice.minPrice + fairPrice.recommendedPrice) / 2),
      strategy: 'balanced',
      expectedDaysToSell: fairPrice.expectedDaysToSell,
      expectedProfitMargin: inputs.costBasis
        ? (((fairPrice.minPrice + fairPrice.recommendedPrice) / 2 - inputs.costBasis) / inputs.costBasis) * 100
        : 0,
    },
    {
      price: fairPrice.maxPrice,
      strategy: 'premium_positioning',
      expectedDaysToSell: Math.max(1, fairPrice.expectedDaysToSell * 1.5),
      expectedProfitMargin: inputs.costBasis ? ((fairPrice.maxPrice - inputs.costBasis) / inputs.costBasis) * 100 : 0,
    },
  ];
}

function generateWarnings(fairPrice, inputs) {
  const warnings = [];
  if (inputs.initialPrice && inputs.initialPrice > fairPrice.maxPrice) {
    warnings.push(`Your initial price ${inputs.initialPrice} is ${Math.round((inputs.initialPrice / fairPrice.maxPrice - 1) * 100)}% above market average`);
  }
  if (fairPrice.pricePercentile > 80) {
    warnings.push('This price is in the premium tier - expect longer time to sell');
  }
  return warnings;
}

function generateOpportunities(fairPrice, inputs) {
  const opportunities = [];
  if (inputs.material && inputs.material.includes('certified')) {
    opportunities.push('Your certification can justify a premium price - highlight it clearly');
  }
  if (inputs.condition === 'like_new') {
    opportunities.push('Like-new condition is attractive - add high-quality photos to justify price');
  }
  return opportunities;
}

module.exports = {
  calculateFairPrice,
  createPricingRecommendation,
  detectPricingAnomalies,
};
