const Analytics = require('../models/Analytics');

// Middleware to track API usage
const trackApiUsage = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Override res.json to capture response data
    const originalJson = res.json;
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Track API call asynchronously to avoid blocking response
      setImmediate(async () => {
        try {
          const analytics = new Analytics({
            type: 'api_call',
            data: {
              method: req.method,
              endpoint: req.path,
              queryParams: req.query,
              responseTime,
              statusCode: res.statusCode,
              success: res.statusCode < 400,
              userAgent: req.get('User-Agent'),
              origin: req.get('Origin'),
              ip: req.ip || req.connection.remoteAddress
            },
            timestamp: new Date()
          });
          
          await analytics.save();
        } catch (error) {
          console.error('API tracking error:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('API tracking middleware error:', error);
    next();
  }
};

// Middleware to track errors
const trackApiErrors = (err, req, res, next) => {
  // Log the error for monitoring
  setImmediate(async () => {
    try {
      const analytics = new Analytics({
        type: 'api_call',
        data: {
          method: req.method,
          endpoint: req.path,
          error: err.message,
          stack: err.stack,
          statusCode: err.status || 500,
          success: false,
          ip: req.ip || req.connection.remoteAddress
        },
        timestamp: new Date()
      });
      
      await analytics.save();
    } catch (trackingError) {
      console.error('Error tracking middleware error:', trackingError);
    }
  });
  
  next(err);
};

module.exports = {
  trackApiUsage,
  trackApiErrors
};