// backend/scripts/seedDatabase.js - Comprehensive seeding for all phases
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../pva-bazaar-app.env') });

// Import models
const User = require('../models/User');
const Shop = require('../models/Shop');
const ProductType = require('../models/ProductType');
const Course = require('../models/Course');
const ExpertService = require('../models/ExpertService');
const DigitalProduct = require('../models/DigitalProduct');
const Review = require('../models/Review');
const DirectMessage = require('../models/DirectMessage');
const Testimonial = require('../models/Testimonial');
const SellerAnalytics = require('../models/SellerAnalytics');
const ForumThread = require('../models/ForumThread');
const Event = require('../models/Event');
const Article = require('../models/Article');
const PricingHistory = require('../models/PricingHistory');
const MarketData = require('../models/MarketData');
const FulfillmentCenter = require('../models/FulfillmentCenter');
const InventoryLocation = require('../models/InventoryLocation');
const ShipmentTracking = require('../models/ShipmentTracking');
const ShippingRate = require('../models/ShippingRate');
const Order = require('../models/Order');

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar';
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

async function clearDatabase() {
  console.log('\n🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    ProductType.deleteMany({}),
    Course.deleteMany({}),
    ExpertService.deleteMany({}),
    DigitalProduct.deleteMany({}),
    Review.deleteMany({}),
    DirectMessage.deleteMany({}),
    Testimonial.deleteMany({}),
    SellerAnalytics.deleteMany({}),
    ForumThread.deleteMany({}),
    Event.deleteMany({}),
    Article.deleteMany({}),
    PricingHistory.deleteMany({}),
    MarketData.deleteMany({}),
    FulfillmentCenter.deleteMany({}),
    InventoryLocation.deleteMany({}),
    ShipmentTracking.deleteMany({}),
    ShippingRate.deleteMany({}),
  ]);
  console.log('✅ Database cleared');
}

async function seedUsers() {
  console.log('\n👥 Seeding users...');

  const users = [
    {
      name: 'Admin PVA',
      email: 'admin@pvabazaar.org',
      password: 'admin123',
      role: 'admin',
    },
    {
      name: 'Zara Hussein',
      email: 'zara@example.com',
      password: 'password123',
      role: 'seller',
      country: 'Afghanistan',
    },
    {
      name: 'Omar Ali',
      email: 'omar@example.com',
      password: 'password123',
      role: 'seller',
      country: 'Pakistan',
    },
    {
      name: 'Yuki Tanaka',
      email: 'yuki@example.com',
      password: 'password123',
      role: 'seller',
      country: 'Japan',
    },
    {
      name: 'Elena Rodriguez',
      email: 'elena@example.com',
      password: 'password123',
      role: 'buyer',
      country: 'Spain',
    },
    {
      name: 'John Collector',
      email: 'john@example.com',
      password: 'password123',
      role: 'buyer',
      country: 'USA',
    },
  ];

  const createdUsers = await User.insertMany(users);
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
}

async function seedShops(users) {
  console.log('\n🏪 Seeding shops...');

  const sellers = users.filter((u) => u.role === 'seller');

  const shops = [
    {
      userId: sellers[0]._id,
      shopName: "Zara's Artisan Jewelry",
      slug: 'zaras-artisan-jewelry',
      description: 'Handcrafted jewelry featuring Panjshir emeralds and traditional Afghan designs',
      banner: 'https://via.placeholder.com/1200x300/8B4513/FFFFFF?text=Zara+Jewelry',
      logo: 'https://via.placeholder.com/100x100/FFD700/000000?text=ZJ',
      tags: ['jewelry', 'handcrafted', 'afghan', 'emerald'],
      status: 'live',
      analytics: { views: 1200, followers: 45, avgRating: 4.8 },
    },
    {
      userId: sellers[1]._id,
      shopName: 'Omar Trading Co.',
      slug: 'omar-trading-co',
      description: 'Premium Pakistani spices, textiles, and artisanal goods',
      banner: 'https://via.placeholder.com/1200x300/8B6914/FFFFFF?text=Omar+Trading',
      tags: ['spices', 'textiles', 'pakistan', 'organic'],
      status: 'live',
      analytics: { views: 2100, followers: 78, avgRating: 4.6 },
    },
    {
      userId: sellers[2]._id,
      shopName: 'Yuki Crafts Tokyo',
      slug: 'yuki-crafts-tokyo',
      description: 'Traditional Japanese ceramics, woodwork, and textile art',
      banner: 'https://via.placeholder.com/1200x300/2E4053/FFFFFF?text=Yuki+Crafts',
      tags: ['ceramic', 'japanese', 'woodwork', 'art'],
      status: 'live',
      analytics: { views: 3400, followers: 156, avgRating: 4.9 },
    },
  ];

  const createdShops = await Shop.insertMany(shops);
  console.log(`✅ Created ${createdShops.length} shops`);
  return createdShops;
}

async function seedProducts(users, shops) {
  console.log('\n📦 Seeding products...');

  const products = [
    {
      sellerId: users[1]._id,
      shopId: shops[0]._id,
      title: 'Panjshir Emerald Pendant',
      description: 'Natural emerald pendant in 18k gold with certificate of authenticity',
      type: 'physical_good',
      price: 1200,
      stockQty: 5,
      reservedQty: 1,
      status: 'active',
      images: ['https://via.placeholder.com/400x400/228B22/FFFFFF?text=Emerald'],
      materials: ['Panjshir Emerald', '18k Gold'],
      rating: { avg: 4.8, count: 12 },
    },
    {
      sellerId: users[2]._id,
      shopId: shops[1]._id,
      title: 'Organic Cardamom from Kashmir',
      description: '100% pure cardamom pods, hand-harvested and dried',
      type: 'physical_good',
      price: 45,
      stockQty: 200,
      reservedQty: 30,
      status: 'active',
      rating: { avg: 4.6, count: 34 },
    },
    {
      sellerId: users[3]._id,
      shopId: shops[2]._id,
      title: 'Raku Ceramic Bowl',
      description: 'Hand-thrown raku ceramic with traditional Japanese glaze',
      type: 'physical_good',
      price: 350,
      stockQty: 8,
      reservedQty: 2,
      status: 'active',
      images: ['https://via.placeholder.com/400x400/8B4513/FFFFFF?text=Ceramic'],
      rating: { avg: 4.9, count: 28 },
    },
    {
      sellerId: users[1]._id,
      shopId: shops[0]._id,
      title: 'Digital Course: Traditional Afghan Embroidery',
      description: 'Learn traditional Afghan embroidery techniques in 12 video lessons',
      type: 'course',
      price: 89,
      status: 'active',
      moduleCount: 12,
      totalDuration: '4 hours',
      skillLevel: 'beginner',
      rating: { avg: 4.7, count: 23 },
    },
    {
      sellerId: users[2]._id,
      shopId: shops[1]._id,
      title: 'Business Consulting - 1 Hour Session',
      description: 'Expert business consultation for startups and small businesses',
      type: 'expertise',
      price: 150,
      hourlyRate: 150,
      minBookingHours: 1,
      status: 'active',
      rating: { avg: 4.8, count: 18 },
    },
    {
      sellerId: users[3]._id,
      shopId: shops[2]._id,
      title: 'Japanese Pottery Techniques eBook',
      description: 'Complete guide to traditional Japanese pottery with 200+ photos',
      type: 'digital_download',
      price: 29,
      status: 'active',
      fileSize: '85MB',
      rating: { avg: 4.5, count: 42 },
    },
  ];

  const createdProducts = await ProductType.insertMany(products);
  console.log(`✅ Created ${createdProducts.length} products`);
  return createdProducts;
}

async function seedReviews(users, products) {
  console.log('\n⭐ Seeding reviews...');

  const buyers = users.filter((u) => u.role === 'buyer');

  const reviews = [
    {
      productId: products[0]._id,
      sellerId: products[0].sellerId,
      reviewerId: buyers[0]._id,
      rating: 5,
      comment: 'Absolutely beautiful emerald! Perfect quality and arrived safely.',
      verifiedPurchase: true,
      helpful: 12,
      unhelpful: 0,
    },
    {
      productId: products[0]._id,
      sellerId: products[0].sellerId,
      reviewerId: buyers[1]._id,
      rating: 4,
      comment: 'Great piece, very happy with it. Shipping took a bit longer than expected.',
      verifiedPurchase: true,
      helpful: 8,
      unhelpful: 1,
    },
    {
      productId: products[1]._id,
      sellerId: products[1].sellerId,
      reviewerId: buyers[0]._id,
      rating: 5,
      comment: 'Best cardamom I have ever tasted. Highly recommended!',
      verifiedPurchase: true,
      helpful: 25,
      unhelpful: 0,
    },
    {
      productId: products[2]._id,
      sellerId: products[2].sellerId,
      reviewerId: buyers[1]._id,
      rating: 5,
      comment: 'This bowl is exquisite. A true work of art.',
      verifiedPurchase: true,
      helpful: 18,
      unhelpful: 0,
    },
  ];

  const createdReviews = await Review.insertMany(reviews);
  console.log(`✅ Created ${createdReviews.length} reviews`);
  return createdReviews;
}

async function seedFulfillmentCenters() {
  console.log('\n🏭 Seeding fulfillment centers...');

  const centers = [
    {
      name: 'PVA Tokyo Hub',
      code: 'TYO-001',
      type: 'distribution_center',
      address: {
        street: '1-2 Marunouchi, Chiyoda-ku',
        city: 'Tokyo',
        country: 'Japan',
        postalCode: '100-0005',
      },
      coordinates: { type: 'Point', coordinates: [139.7673, 35.6743] },
      capacity: {
        totalSquareFeet: 50000,
        currentUtilization: 45,
        maxSKUs: 10000,
        currentSKUCount: 4200,
      },
      supportedShippingCarriers: ['DHL', 'FedEx', 'UPS', 'Japan Post'],
      shippingMethods: ['standard', 'express', 'overnight'],
      metrics: {
        ordersProcessedThisMonth: 1250,
        orderAccuracy: 99.2,
        returnRate: 1.8,
        customerSatisfaction: 4.6,
      },
      active: true,
    },
    {
      name: 'PVA Istanbul Hub',
      code: 'IST-001',
      type: 'warehouse',
      address: {
        street: 'Mahmutbey Cad. No:1',
        city: 'Istanbul',
        country: 'Turkey',
        postalCode: '34000',
      },
      coordinates: { type: 'Point', coordinates: [28.9784, 41.0054] },
      capacity: {
        totalSquareFeet: 75000,
        currentUtilization: 62,
        maxSKUs: 15000,
        currentSKUCount: 8900,
      },
      supportedShippingCarriers: ['DHL', 'FedEx', 'UPS', 'Aras Kargo'],
      shippingMethods: ['standard', 'express'],
      metrics: {
        ordersProcessedThisMonth: 2100,
        orderAccuracy: 98.8,
        returnRate: 2.1,
        customerSatisfaction: 4.5,
      },
      active: true,
    },
    {
      name: 'PVA New York Hub',
      code: 'NYC-001',
      type: 'distribution_center',
      address: {
        street: '123 Broadway',
        city: 'New York',
        country: 'USA',
        postalCode: '10001',
      },
      coordinates: { type: 'Point', coordinates: [-74.006, 40.7128] },
      capacity: {
        totalSquareFeet: 100000,
        currentUtilization: 58,
        maxSKUs: 20000,
        currentSKUCount: 11600,
      },
      supportedShippingCarriers: ['UPS', 'FedEx', 'USPS', 'DHL'],
      shippingMethods: ['standard', 'express', 'overnight'],
      metrics: {
        ordersProcessedThisMonth: 3200,
        orderAccuracy: 99.1,
        returnRate: 1.5,
        customerSatisfaction: 4.7,
      },
      active: true,
    },
  ];

  const createdCenters = await FulfillmentCenter.insertMany(centers);
  console.log(`✅ Created ${createdCenters.length} fulfillment centers`);
  return createdCenters;
}

async function seedShippingRates(centers) {
  console.log('\n📮 Seeding shipping rates...');

  const rates = [
    {
      originCountry: 'Japan',
      destinationCountry: 'USA',
      carrier: 'dhl',
      shippingMethod: 'standard',
      weightMin: 0,
      weightMax: 2,
      baseCost: 1500,
      perKgCost: 200,
      handlingFee: 300,
      estimatedDaysMin: 7,
      estimatedDaysMax: 10,
      available: true,
    },
    {
      originCountry: 'Japan',
      destinationCountry: 'USA',
      carrier: 'dhl',
      shippingMethod: 'express',
      weightMin: 0,
      weightMax: 2,
      baseCost: 2500,
      perKgCost: 350,
      handlingFee: 500,
      estimatedDaysMin: 3,
      estimatedDaysMax: 5,
      available: true,
    },
    {
      originCountry: 'Turkey',
      destinationCountry: 'Europe',
      carrier: 'fedex',
      shippingMethod: 'standard',
      weightMin: 0,
      weightMax: 5,
      baseCost: 800,
      perKgCost: 120,
      handlingFee: 200,
      estimatedDaysMin: 5,
      estimatedDaysMax: 8,
      available: true,
    },
    {
      originCountry: 'USA',
      destinationCountry: 'USA',
      carrier: 'usps',
      shippingMethod: 'standard',
      weightMin: 0,
      weightMax: 10,
      baseCost: 200,
      perKgCost: 50,
      handlingFee: 100,
      estimatedDaysMin: 3,
      estimatedDaysMax: 5,
      available: true,
    },
  ];

  const createdRates = await ShippingRate.insertMany(rates);
  console.log(`✅ Created ${createdRates.length} shipping rates`);
  return createdRates;
}

async function seedMarketData() {
  console.log('\n📊 Seeding market data...');

  const marketData = [
    {
      category: 'jewelry',
      material: 'emerald',
      origin: 'Afghanistan',
      avgPrice: 950,
      medianPrice: 850,
      minPrice: 500,
      maxPrice: 2500,
      stdDev: 450,
      conversionRate: 8.5,
      daysToSell: 12,
      trend: 'increasing',
      premiumFactor: 1.15,
    },
    {
      category: 'spices',
      material: 'cardamom',
      origin: 'Pakistan',
      avgPrice: 42,
      medianPrice: 40,
      minPrice: 30,
      maxPrice: 60,
      stdDev: 8,
      conversionRate: 12.3,
      daysToSell: 5,
      trend: 'stable',
      premiumFactor: 1.05,
    },
    {
      category: 'ceramics',
      material: 'ceramic',
      origin: 'Japan',
      avgPrice: 320,
      medianPrice: 300,
      minPrice: 150,
      maxPrice: 800,
      stdDev: 180,
      conversionRate: 9.8,
      daysToSell: 15,
      trend: 'stable',
      premiumFactor: 1.2,
    },
  ];

  const createdData = await MarketData.insertMany(marketData);
  console.log(`✅ Created ${createdData.length} market data entries`);
  return createdData;
}

async function seedAnalytics(users) {
  console.log('\n📈 Seeding seller analytics...');

  const sellers = users.filter((u) => u.role === 'seller');

  const analytics = [
    {
      sellerId: sellers[0]._id,
      period: 'month',
      pageViews: 1200,
      productClicks: 340,
      checkoutStarts: 89,
      completedOrders: 45,
      totalRevenue: 54000,
      commission: 5400,
      netEarnings: 48600,
      conversionRate: 3.75,
      avgOrderValue: 1200,
    },
    {
      sellerId: sellers[1]._id,
      period: 'month',
      pageViews: 2100,
      productClicks: 620,
      checkoutStarts: 156,
      completedOrders: 78,
      totalRevenue: 28500,
      commission: 2850,
      netEarnings: 25650,
      conversionRate: 3.71,
      avgOrderValue: 365,
    },
    {
      sellerId: sellers[2]._id,
      period: 'month',
      pageViews: 3400,
      productClicks: 980,
      checkoutStarts: 234,
      completedOrders: 156,
      totalRevenue: 78400,
      commission: 7840,
      netEarnings: 70560,
      conversionRate: 4.59,
      avgOrderValue: 502,
    },
  ];

  const createdAnalytics = await SellerAnalytics.insertMany(analytics);
  console.log(`✅ Created ${createdAnalytics.length} analytics records`);
  return createdAnalytics;
}

async function seedCommunity() {
  console.log('\n💬 Seeding community content...');

  const forums = await ForumThread.insertMany([
    {
      title: 'Best practices for shipping emeralds internationally',
      content:
        'What are the best practices for shipping high-value gemstones? Insurance recommendations?',
      authorId: 'community-user-1',
      categoryId: 'shipping',
      views: 234,
      replies: 12,
      solved: true,
    },
    {
      title: 'How to price handmade ceramics?',
      content: 'I am new to selling ceramics. How do I determine fair pricing?',
      authorId: 'community-user-2',
      categoryId: 'pricing',
      views: 156,
      replies: 8,
      solved: true,
    },
  ]);

  const articles = await Article.insertMany([
    {
      title: 'The Art of Panjshir Emeralds: A Complete Guide',
      description: 'Everything you need to know about Afghan emeralds',
      category: 'guide',
      content: 'Panjshir Valley has been producing fine emeralds for centuries...',
      featured: true,
      readTime: 12,
    },
    {
      title: 'Sustainable Packaging Solutions for Online Sellers',
      description: 'Eco-friendly packaging that reduces waste.',
      category: 'tutorial',
      content: 'Modern sellers face the challenge of balancing...',
      featured: false,
      readTime: 8,
    },
  ]);

  console.log(`✅ Created ${forums.length} forum threads and ${articles.length} articles`);
}

async function seed() {
  try {
    await connectDB();
    await clearDatabase();

    const users = await seedUsers();
    const shops = await seedShops(users);
    const products = await seedProducts(users, shops);
    const reviews = await seedReviews(users, products);
    const centers = await seedFulfillmentCenters();
    await seedShippingRates(centers);
    await seedMarketData();
    await seedAnalytics(users);
    await seedCommunity();

    console.log('\n✅ ✅ ✅ SEEDING COMPLETE ✅ ✅ ✅');
    console.log('\n📊 Summary:');
    console.log(`   • ${users.length} users`);
    console.log(`   • ${shops.length} shops`);
    console.log(`   • ${products.length} products`);
    console.log(`   • ${reviews.length} reviews`);
    console.log(`   • ${centers.length} fulfillment centers`);
    console.log(`   • Market data & analytics initialized`);
    console.log(`   • Community content seeded`);
    console.log('\n🚀 Ready for testing!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
