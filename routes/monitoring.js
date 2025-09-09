const express = require('express');
const router = express.Router();
const Artifact = require('../backend/models/Artifact');
const User = require('../backend/models/user');
const Analytics = require('../backend/models/Analytics');

// GET /api/monitoring/blockchain - Get blockchain statistics
router.get('/blockchain', async (req, res) => {
  try {
    const stats = {
      totalArtifacts: await Artifact.countDocuments(),
      artifactsWithBlockchain: await Artifact.countDocuments({
        'blockchainDetails.contractAddress': { $exists: true, $ne: null }
      }),
      totalUsers: await User.countDocuments(),
      recentArtifacts: await Artifact.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('creator', 'name email'),
      
      // Network status
      networkStatus: {
        network: 'base',
        rpcConnected: !!process.env.ETHEREUM_RPC_URL,
        lastChecked: new Date()
      }
    };
    
    // Log blockchain monitoring access
    const analytics = new Analytics({
      type: 'api_call',
      data: {
        endpoint: '/api/monitoring/blockchain',
        stats: {
          totalArtifacts: stats.totalArtifacts,
          artifactsWithBlockchain: stats.artifactsWithBlockchain
        }
      }
    });
    await analytics.save();
    
    res.json({ ok: true, stats });
  } catch (error) {
    console.error('Blockchain monitoring error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get blockchain stats' });
  }
});

// GET /api/monitoring/nfts - Monitor NFT status
router.get('/nfts', async (req, res) => {
  try {
    const nftStats = await Artifact.aggregate([
      {
        $group: {
          _id: null,
          totalNFTs: { $sum: 1 },
          mintedNFTs: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$blockchainDetails.contractAddress', null] },
                  { $ne: ['$blockchainDetails.tokenId', null] }
                ]},
                1,
                0
              ]
            }
          },
          categoryCounts: {
            $push: '$category'
          },
          averagePrice: { $avg: '$price' },
          totalValue: { $sum: '$price' }
        }
      }
    ]);
    
    const categoryBreakdown = await Artifact.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const recentTransactions = await Artifact.find({
      'ownershipHistory.0': { $exists: true }
    })
    .sort({ 'ownershipHistory.date': -1 })
    .limit(10)
    .select('name blockchainDetails ownershipHistory');
    
    const result = {
      nftStats: nftStats[0] || { totalNFTs: 0, mintedNFTs: 0 },
      categoryBreakdown,
      recentTransactions,
      lastUpdated: new Date()
    };
    
    // Track NFT monitoring
    const analytics = new Analytics({
      type: 'blockchain_interaction',
      data: {
        action: 'nft_monitoring',
        stats: result.nftStats
      }
    });
    await analytics.save();
    
    res.json({ ok: true, data: result });
  } catch (error) {
    console.error('NFT monitoring error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get NFT stats' });
  }
});

// GET /api/monitoring/users - Monitor user activity
router.get('/users', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const userStats = {
      totalUsers: await User.countDocuments(),
      newUsersToday: await User.countDocuments({
        createdAt: { $gte: yesterday }
      }),
      newUsersThisWeek: await User.countDocuments({
        createdAt: { $gte: lastWeek }
      }),
      activeCreators: await Artifact.distinct('creator').then(creators => creators.length),
      recentUsers: await User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email createdAt')
    };
    
    const creatorStats = await Artifact.aggregate([
      {
        $group: {
          _id: '$creator',
          artifactCount: { $sum: 1 },
          totalValue: { $sum: '$price' }
        }
      },
      { $sort: { artifactCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userName: { $arrayElemAt: ['$user.name', 0] },
          userEmail: { $arrayElemAt: ['$user.email', 0] },
          artifactCount: 1,
          totalValue: 1
        }
      }
    ]);
    
    res.json({ 
      ok: true, 
      data: {
        userStats,
        topCreators: creatorStats,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('User monitoring error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get user stats' });
  }
});

// GET /api/monitoring/health - Overall system health
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'connected',
        blockchain: !!process.env.ETHEREUM_RPC_URL ? 'connected' : 'disconnected',
        ipfs: !!process.env.PINATA_API_KEY ? 'connected' : 'disconnected'
      },
      metrics: {
        totalArtifacts: await Artifact.countDocuments(),
        totalUsers: await User.countDocuments(),
        totalAnalyticsEvents: await Analytics.countDocuments(),
        uptimeHours: Math.floor(process.uptime() / 3600)
      }
    };
    
    // Check if any service is down
    const servicesDown = Object.values(health.services).filter(status => status === 'disconnected').length;
    if (servicesDown > 0) {
      health.status = servicesDown === Object.keys(health.services).length ? 'unhealthy' : 'degraded';
    }
    
    res.json({ ok: true, health });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      ok: false, 
      health: {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      }
    });
  }
});

module.exports = router;