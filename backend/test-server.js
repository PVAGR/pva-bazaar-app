const express = require('express');
const cors = require('cors');
const path = require('path');

// Create simple test server without complex dependencies
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static(path.join(__dirname, '../public')));

// Simple test endpoints
app.get('/api/test', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'PVA Bazaar API is running!',
    timestamp: new Date().toISOString()
  });
});

// Test submission endpoint
app.post('/api/submissions/test', (req, res) => {
  console.log('Test submission received:', req.body);
  res.json({
    ok: true,
    message: 'Test submission successful',
    data: {
      id: `test-${Date.now()}`,
      received: req.body,
      timestamp: new Date().toISOString()
    }
  });
});

// SSE endpoint for testing real-time updates
app.get('/api/events/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write('data: {"type": "connected", "message": "Connected to test real-time updates"}\n\n');

  // Send a test update every 10 seconds
  const interval = setInterval(() => {
    const testUpdate = {
      type: 'test_update',
      data: { message: 'Test update', time: new Date().toISOString() },
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(testUpdate)}\n\n`);
  }, 10000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Mock marketplace data endpoint
app.get('/api/submissions/marketplace', (req, res) => {
  const mockItems = [
    {
      id: 'item-1',
      title: 'Handcrafted Silver Ring',
      description: 'Beautiful artisan-made silver ring with intricate designs',
      price: 150,
      images: ['/public/images/placeholder.jpg'],
      seller: { name: 'Maria Rodriguez' },
      category: 'jewelry'
    },
    {
      id: 'item-2', 
      title: 'Traditional Pottery Vase',
      description: 'Authentic pottery vase made using traditional techniques',
      price: 85,
      images: ['/public/images/placeholder.jpg'],
      seller: { name: 'Carlos Mendez' },
      category: 'art'
    }
  ];
  
  res.json(mockItems);
});

// Mock dashboard stats endpoint
app.get('/api/dashboard/stats', (req, res) => {
  const mockStats = {
    totalAssets: 42,
    totalValue: 15750,
    activeCertificates: 38,
    recentActivity: 12
  };
  
  res.json(mockStats);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    ok: false,
    message: 'Internal server error',
    error: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 PVA Bazaar Test Server running on http://localhost:${PORT}`);
  console.log(`📡 Real-time updates available at http://localhost:${PORT}/api/events/stream`);
  console.log(`🧪 Test API at http://localhost:${PORT}/api/test`);
});

module.exports = app;