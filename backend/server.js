// Vercel serverless entry point that wraps the Express app
const serverless = require('serverless-http');
const { app, connectToDatabase } = require('./api/index');

let handlerPromise = null;

module.exports = async (req, res) => {
  try {
    if (!handlerPromise) {
      handlerPromise = (async () => {
        await connectToDatabase();
        return serverless(app);
      })();
    }
    const handler = await handlerPromise;
    return handler(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
