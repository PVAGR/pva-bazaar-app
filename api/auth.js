const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Create router
const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth routes
  message: {
    ok: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Mock user data for testing (in real app, this would come from database)
const mockUsers = [
  {
    id: '1',
    name: 'Test User',
    email: 'admin@pvabazaar.org',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // 'admin123'
  }
];

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = mockUsers.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: String(mockUsers.length + 1),
      name,
      email,
      password: hashedPassword
    };
    
    mockUsers.push(newUser);
    
    // Generate JWT token
    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET || 'fallback-secret');
    
    res.status(201).json({ 
      ok: true, 
      token, 
      user: { id: newUser.id, name: newUser.name, email: newUser.email } 
    });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'fallback-secret');
    
    res.json({ 
      ok: true, 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Profile endpoint (protected)
router.get('/me', (req, res) => {
  // Simple auth middleware inline for testing
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ ok: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = mockUsers.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ ok: false, message: 'User not found' });
    }
    
    res.json({ 
      ok: true, 
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (_error) {
    res.status(401).json({ ok: false, message: 'Invalid token' });
  }
});

module.exports = router;