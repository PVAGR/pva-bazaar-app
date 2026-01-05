// Serverless archive API endpoint - GET and POST
const mongoose = require('mongoose');

// Connection caching for serverless
let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
    });
    cachedConnection = conn;
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

// Define ArchiveEntry schema inline (for serverless independence)
const ArchiveEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    content: { type: String, required: true },
    wordCount: { type: String, default: '0' },
    priority: { type: Number, default: 5 },
  },
  { timestamps: true }
);

// Ensure model is only created once
const ArchiveEntry = mongoose.models.ArchiveEntry || mongoose.model('ArchiveEntry', ArchiveEntrySchema);

module.exports = async (req, res) => {
  // CORS headers - allow pvabazaar.org
  const allowed = (process.env.ALLOWED_ORIGIN || "https://pvabazaar.org,https://www.pvabazaar.org")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin;

  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Code");
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // Connect to DB
    await connectDB();

    // GET - fetch all entries (public)
    if (req.method === 'GET') {
      const entries = await ArchiveEntry.find()
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return res.status(200).json({
        ok: true,
        items: entries.map(e => ({
          id: e._id.toString(),
          title: e.title,
          category: e.category,
          description: e.description || '',
          content: e.content,
          wordCount: e.wordCount || '0',
          priority: e.priority || 5,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
      });
    }

    // POST - create entry (admin only)
    if (req.method === 'POST') {
      // Check admin code
      const adminCode = req.headers['x-admin-code'];
      const expectedCode = process.env.ADMIN_SECRET_CODE;

      if (!adminCode || !expectedCode || adminCode !== expectedCode) {
        return res.status(401).json({
          ok: false,
          error: 'Unauthorized - Invalid or missing admin code',
        });
      }

      // Parse body
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (err) {
          return res.status(400).json({
            ok: false,
            error: 'Invalid JSON body',
          });
        }
      }

      // Validate required fields
      if (!body.title || !body.category || !body.content) {
        return res.status(400).json({
          ok: false,
          error: 'Missing required fields: title, category, content',
        });
      }

      // Create entry
      const newEntry = new ArchiveEntry({
        title: body.title,
        category: body.category,
        description: body.description || '',
        content: body.content,
        wordCount: body.wordCount || '0',
        priority: body.priority || 5,
      });

      await newEntry.save();

      return res.status(201).json({
        ok: true,
        item: {
          id: newEntry._id.toString(),
          title: newEntry.title,
          category: newEntry.category,
          description: newEntry.description,
          content: newEntry.content,
          wordCount: newEntry.wordCount,
          priority: newEntry.priority,
          createdAt: newEntry.createdAt,
          updatedAt: newEntry.updatedAt,
        },
      });
    }

    // Method not allowed
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });

  } catch (err) {
    console.error('Archive API error:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Internal server error',
    });
  }
};
// trigger deploy
