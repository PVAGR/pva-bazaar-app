const express = require('express');
const axios = require('axios');

const router = express.Router();

/**
 * Pricing Lookup Service
 * Provides market comparables and dynamic pricing suggestions for items
 * Uses public APIs and market data
 */

/**
 * GET /api/pricing-lookup
 * Get pricing suggestions for an item based on category and attributes
 * Query params: { category, itemType, materials, condition, region }
 */
router.get('/', async (req, res) => {
  try {
    const { category, itemType, materials, condition, region } = req.query;

    if (!category || !itemType) {
      return res.status(400).json({ error: 'Category and itemType required' });
    }

    // Collect pricing data from multiple sources
    const estimates = [];

    // 1. Market data from Etsy API (if configured)
    if (process.env.ETSY_API_KEY) {
      try {
        const etsyPrice = await fetchEtsyComparables(category, itemType, materials);
        if (etsyPrice) {
          estimates.push({
            source: 'etsy',
            minPrice: etsyPrice.min,
            avgPrice: etsyPrice.avg,
            maxPrice: etsyPrice.max,
            itemCount: etsyPrice.count,
            link: etsyPrice.link,
          });
        }
      } catch (error) {
        console.error('Etsy lookup error:', error.message);
      }
    }

    // 2. Fair trade market data (if configured)
    if (process.env.FAIRTRADE_API_KEY) {
      try {
        const ftPrice = await fetchFairTradePrices(category, materials);
        if (ftPrice) {
          estimates.push({
            source: 'fair_trade',
            minPrice: ftPrice.min,
            avgPrice: ftPrice.avg,
            maxPrice: ftPrice.max,
          });
        }
      } catch (error) {
        console.error('Fair trade lookup error:', error.message);
      }
    }

    // 3. eBay API (if configured) - auction averages
    if (process.env.EBAY_API_KEY) {
      try {
        const ebayPrice = await fetchEbayComparables(category, itemType);
        if (ebayPrice) {
          estimates.push({
            source: 'ebay',
            minPrice: ebayPrice.min,
            avgPrice: ebayPrice.avg,
            maxPrice: ebayPrice.max,
            itemCount: ebayPrice.count,
          });
        }
      } catch (error) {
        console.error('eBay lookup error:', error.message);
      }
    }

    // 4. Calculate recommendation based on condition
    const recommendedPrice = calculateRecommendedPrice(condition, estimates);

    res.json({
      category,
      itemType,
      condition,
      estimates,
      recommendedPrice,
      priceRange: {
        min: Math.min(...estimates.map((e) => e.minPrice)),
        max: Math.max(...estimates.map((e) => e.maxPrice)),
        suggested: recommendedPrice,
      },
      confidence: estimates.length > 1 ? 'high' : 'medium',
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Pricing lookup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fetch pricing from Etsy API
 */
async function fetchEtsyComparables(category, itemType, materials) {
  console.log(`[INFO] Fetch Etsy prices for ${category} / ${itemType}`);

  // Mock data for MVP
  return {
    min: 50,
    avg: 150,
    max: 400,
    count: 25,
    link: `https://www.etsy.com/search?q=${  encodeURIComponent(itemType)}`,
  };
}

/**
 * Fetch pricing from Fair Trade sources
 */
async function fetchFairTradePrices(category, materials) {
  console.log(`[INFO] Fetch Fair Trade prices for ${category}`);

  return {
    min: 80,
    avg: 200,
    max: 500,
  };
}

/**
 * Fetch pricing from eBay
 */
async function fetchEbayComparables(category, itemType) {
  console.log(`[INFO] Fetch eBay prices for ${category} / ${itemType}`);

  // Mock data for MVP
  return {
    min: 45,
    avg: 140,
    max: 350,
    count: 18,
  };
}

/**
 * Calculate recommended price based on condition and market averages
 */
function calculateRecommendedPrice(condition, estimates) {
  if (!estimates || estimates.length === 0) {
    return null;
  }

  const avgPrices = estimates.map((e) => e.avgPrice);
  const overallAvg = avgPrices.reduce((a, b) => a + b, 0) / avgPrices.length;

  // Adjust for condition
  const conditionMultiplier = {
    mint: 1.2,
    excellent: 1.1,
    good: 1.0,
    fair: 0.8,
    poor: 0.6,
  };

  const multiplier = conditionMultiplier[condition] || 1.0;

  return Math.round(overallAvg * multiplier);
}

/**
 * GET /api/pricing-lookup/categories
 * Get list of supported categories
 */
router.get('/categories', (req, res) => {
  res.json({
    categories: [
      'textiles',
      'jewelry',
      'homeware',
      'ceramics',
      'metalwork',
      'woodcraft',
      'baskets',
      'leather',
      'paintings',
      'sculptures',
      'antiques',
      'collectibles',
      'other',
    ],
  });
});

/**
 * GET /api/pricing-lookup/example
 * Get pricing example for a specific item
 */
router.get('/example', (req, res) => {
  const example = {
    category: 'textiles',
    itemType: 'handwoven_scarf',
    materials: ['cotton', 'natural_dye'],
    condition: 'excellent',
    region: 'Kenya',
    estimates: [
      {
        source: 'etsy',
        minPrice: 45,
        avgPrice: 120,
        maxPrice: 250,
        itemCount: 32,
      },
      {
        source: 'fair_trade',
        minPrice: 60,
        avgPrice: 150,
        maxPrice: 300,
      },
      {
        source: 'ebay',
        minPrice: 35,
        avgPrice: 100,
        maxPrice: 200,
        itemCount: 18,
      },
    ],
    recommendedPrice: 135,
    priceRange: {
      min: 35,
      max: 300,
      suggested: 135,
    },
  };

  res.json(example);
});

module.exports = router;
