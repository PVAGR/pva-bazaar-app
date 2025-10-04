const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple in-memory storage for testing
let submissions = {
  assets: [],
  certificates: [],
  provenance: []
};

// Test submission endpoints
app.post('/api/submissions/asset', (req, res) => {
  try {
    const asset = {
      id: Date.now(),
      ...req.body,
      submittedAt: new Date()
    };
    submissions.assets.push(asset);
    console.log('Asset submitted:', asset);
    res.json({ success: true, asset });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/submissions/certificate', (req, res) => {
  try {
    const certificate = {
      id: Date.now(),
      ...req.body,
      submittedAt: new Date()
    };
    submissions.certificates.push(certificate);
    console.log('Certificate submitted:', certificate);
    res.json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/submissions/provenance', (req, res) => {
  try {
    const provenance = {
      id: Date.now(),
      ...req.body,
      submittedAt: new Date()
    };
    submissions.provenance.push(provenance);
    console.log('Provenance submitted:', provenance);
    res.json({ success: true, provenance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get submissions endpoints
app.get('/api/submissions/assets', (req, res) => {
  res.json(submissions.assets);
});

app.get('/api/submissions/certificates', (req, res) => {
  res.json(submissions.certificates);
});

app.get('/api/submissions/provenance', (req, res) => {
  res.json(submissions.provenance);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test submission server running on port ${PORT}`);
  console.log(`📊 Asset submissions: ${submissions.assets.length}`);
  console.log(`📜 Certificate submissions: ${submissions.certificates.length}`);
  console.log(`🔍 Provenance submissions: ${submissions.provenance.length}`);
});