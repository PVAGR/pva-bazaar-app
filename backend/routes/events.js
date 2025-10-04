const express = require('express');
const router = express.Router();

// Store active SSE connections
const sseConnections = new Set();

// SSE endpoint for real-time updates
router.get('/stream', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write('data: {"type": "connected", "message": "Connected to PVA Bazaar real-time updates"}\n\n');

  // Add connection to active connections
  const connectionId = Date.now() + Math.random();
  const connection = { id: connectionId, response: res };
  sseConnections.add(connection);

  // Handle client disconnect
  req.on('close', () => {
    sseConnections.delete(connection);
  });

  req.on('error', () => {
    sseConnections.delete(connection);
  });
});

// Function to broadcast updates to all connected clients
function broadcastUpdate(updateType, data) {
  const message = {
    type: updateType,
    data: data,
    timestamp: new Date().toISOString()
  };

  const messageString = `data: ${JSON.stringify(message)}\n\n`;
  
  // Send to all connected clients
  sseConnections.forEach(connection => {
    try {
      connection.response.write(messageString);
    } catch (error) {
      // Remove dead connections
      sseConnections.delete(connection);
    }
  });
}

// Export the broadcast function for use in other routes
router.broadcast = broadcastUpdate;

module.exports = router;