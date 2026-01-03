// Standalone serverless function - instant response, no dependencies
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-App-Version', 'f015c16');
  res.status(200).json({
    ok: true,
    source: 'ping.js',
    message: 'Standalone ping - no Express, no DB',
    timestamp: new Date().toISOString(),
  });
};
